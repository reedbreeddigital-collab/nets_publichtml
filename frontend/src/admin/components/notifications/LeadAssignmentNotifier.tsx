import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, MapPin, DollarSign, ArrowRight, X, User, Phone, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../../store/useAdminStore'
import { adminService, type AdminLead } from '../../services/adminService'

// Web Audio API chime synthesizer for lead drop alerts
function playLeadAlertSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    // Chime note 1: D5
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime)
    gain1.gain.setValueAtTime(0.2, ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.35)

    // Chime note 2: A5
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15)
    gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.15)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(ctx.currentTime + 0.15)
    osc2.stop(ctx.currentTime + 0.6)
  } catch (err) {
    // AudioContext autoplay restrictions or error
  }
}

export function LeadAssignmentNotifier() {
  const { session } = useAdminStore()
  const navigate = useNavigate()
  const [activeAlertLead, setActiveAlertLead] = useState<AdminLead | null>(null)
  const knownLeadIdsRef = useRef<Set<string | number>>(new Set())
  const isInitializedRef = useRef(false)

  // Request browser Notification permission on mount if supported
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!session.isAuthenticated || !session.user) return

    const currentUser = session.user
    const isCloser = currentUser.role === 'sales_closer'
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super-admin'

    const checkNewLeads = async () => {
      try {
        const leadList = await adminService.getLeads()
        if (!leadList || !Array.isArray(leadList)) return

        if (!isInitializedRef.current) {
          // Initialize known leads on first fetch
          leadList.forEach((l) => knownLeadIdsRef.current.add(l.id))
          isInitializedRef.current = true
          return
        }

        // Look for any newly dropped leads not in known list
        for (const lead of leadList) {
          if (!knownLeadIdsRef.current.has(lead.id)) {
            knownLeadIdsRef.current.add(lead.id)

            // Check if this lead is assigned to this closer
            const assigned = String(lead.assignedTo || '').trim().toLowerCase()
            const myId = String(currentUser.id || '').trim().toLowerCase()
            const myEmail = String(currentUser.email || '').trim().toLowerCase()
            const myName = String(currentUser.fullName || '').trim().toLowerCase()

            const isAssignedToMe =
              assigned !== '' &&
              (assigned === myId || assigned === myEmail || assigned === myName)

            // Alert if assigned to this closer, or if admin
            if (isAssignedToMe || (isAdmin && isCloser === false)) {
              playLeadAlertSound()
              setActiveAlertLead(lead)

              // Native browser desktop notification
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification('🚨 New Lead Assigned!', {
                    body: `${lead.customerName} — ${lead.origin || 'Origin'} to ${lead.destination || 'Destination'}`,
                    icon: '/favicon.svg',
                  })
                } catch (e) {}
              }
              break
            }
          }
        }
      } catch (err) {
        // Polling failure, silent retry
      }
    }

    // Initial check
    checkNewLeads()

    // Poll every 10 seconds
    const interval = setInterval(checkNewLeads, 10000)
    return () => clearInterval(interval)
  }, [session.isAuthenticated, session.user])

  if (!activeAlertLead) return null

  const estAmount = activeAlertLead.estimatedInvestmentMax || activeAlertLead.estimatedInvestmentMin || 0
  const refCode = activeAlertLead.leadReference || `LEAD-${activeAlertLead.id}`

  const handleOpenLeadInCRM = () => {
    setActiveAlertLead(null)
    navigate(`/admin/crm?search=${encodeURIComponent(refCode)}`)
  }

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        top: '1.25rem',
        right: '1.25rem',
        zIndex: 999999,
        maxWidth: '420px',
        width: 'calc(100% - 2.5rem)',
        pointerEvents: 'none',
      }}>
        <motion.div
          initial={{ opacity: 0, y: -25, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.92 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{
            background: '#ffffff',
            border: '2px solid var(--color-nets-red, #c0272d)',
            borderRadius: '8px',
            boxShadow: '0 20px 50px rgba(13, 16, 96, 0.35)',
            overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >
          {/* Top Banner Alert */}
          <div style={{
            background: 'linear-gradient(135deg, #c0272d 0%, #991b1b 100%)',
            color: '#ffffff',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#4ade80',
                boxShadow: '0 0 0 2px rgba(74, 222, 128, 0.4)',
                animation: 'pulse 1.5s infinite',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 700, fontSize: '0.8125rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                <Bell size={14} /> New Lead Assigned!
              </div>
            </div>
            <button
              onClick={() => setActiveAlertLead(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                opacity: 0.85,
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>

          {/* Lead Details Body */}
          <div style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {refCode}
                </span>
                <h4 style={{ margin: '0.15rem 0 0 0', fontSize: '1rem', fontWeight: 700, color: '#0d1060' }}>
                  {activeAlertLead.customerName}
                </h4>
              </div>
              {estAmount > 0 && (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#15803d',
                  padding: '0.25rem 0.625rem',
                  borderRadius: '4px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}>
                  ₦{Math.round(estAmount).toLocaleString('en-NG')}
                </div>
              )}
            </div>

            {/* Route */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '0.625rem 0.75rem',
              margin: '0.75rem 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              fontSize: '0.8125rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
                <MapPin size={13} color="#16a34a" style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <strong>From:</strong> {activeAlertLead.origin || 'Pickup'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
                <MapPin size={13} color="#c0272d" style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <strong>To:</strong> {activeAlertLead.destination || 'Destination'}
                </span>
              </div>
            </div>

            {activeAlertLead.customerPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#475569', marginBottom: '0.75rem' }}>
                <Phone size={13} color="#64748b" />
                <span>{activeAlertLead.customerPhone}</span>
                {activeAlertLead.customerEmail && <span>• {activeAlertLead.customerEmail}</span>}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem' }}>
              <button
                onClick={() => setActiveAlertLead(null)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Dismiss
              </button>
              <button
                onClick={handleOpenLeadInCRM}
                style={{
                  flex: 2,
                  padding: '0.5rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  border: 'none',
                  background: '#0d1060',
                  color: '#ffffff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                }}
              >
                <span>View in CRM</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
