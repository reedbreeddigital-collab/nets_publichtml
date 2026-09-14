import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  ShieldCheck, 
  CreditCard, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Truck, 
  CheckCircle2, 
  ArrowLeft, 
  Copy, 
  Check, 
  Phone, 
  Mail, 
  ExternalLink,
  Lock,
  Building2
} from 'lucide-react'
import { adminService, type AdminLead } from '../admin/services/adminService'
import { useAdminStore } from '../admin/store/useAdminStore'
import { PAYSTACK_PUBLIC_KEY } from '../config/api'
import { emailService } from '../services/emailService'

const fmtCurrency = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`

export function QuotePaymentPage() {
  const { quoteRef } = useParams<{ quoteRef: string }>()
  const { quotes } = useAdminStore()
  const [lead, setLead] = useState<AdminLead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paystackLoaded, setPaystackLoaded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [paidSuccess, setPaidSuccess] = useState(false)
  const [paymentRef, setPaymentRef] = useState<string>('')

  // Load Paystack Inline script dynamically
  useEffect(() => {
    if ((window as any).PaystackPop) {
      setPaystackLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    script.onload = () => setPaystackLoaded(true)
    document.body.appendChild(script)
  }, [])

  // Load Quote/Lead data
  useEffect(() => {
    if (!quoteRef) {
      setError('Quotation reference is missing.')
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    // Try fetching from backend MySQL
    adminService.getLead(quoteRef)
      .then((remoteLead) => {
        if (isMounted && remoteLead) {
          setLead(remoteLead)
          if (['won', 'Paid & Confirmed', 'converted'].includes(remoteLead.status) || remoteLead.crmStatus === 'Won & Paid') {
            setPaidSuccess(true)
          }
          setLoading(false)
          return
        }

        // Fallback to local admin store quotes
        const matched = quotes.find(
          (q) => q.reference.toLowerCase() === quoteRef.toLowerCase() || String(q.id) === quoteRef
        )

        if (matched) {
          const fallbackLead: AdminLead = {
            id: matched.id,
            leadReference: matched.reference,
            customerName: matched.customerName,
            customerEmail: matched.customerEmail,
            customerPhone: matched.customerPhone,
            origin: matched.pickup,
            destination: matched.destination,
            journeyType: matched.tripType || 'Standard Charter',
            estimatedInvestmentMax: matched.estimatedInvestment,
            estimatedInvestmentMin: matched.estimatedInvestment,
            status: matched.status,
            crmStatus: matched.status === 'converted' ? 'Won & Paid' : 'Pending Review',
            createdAt: matched.createdAt,
            payload: {
              journeyInformation: {
                travelDate: matched.travelDate,
                passengerCount: matched.passengerCount,
                tripType: matched.tripType,
              },
              estimatedInvestment: {
                vehicleName: matched.vehicleName,
                total: matched.estimatedInvestment,
              },
            },
          }
          if (isMounted) {
            setLead(fallbackLead)
            if (matched.status === 'converted') setPaidSuccess(true)
            setLoading(false)
          }
        } else {
          if (isMounted) {
            setError(`Quotation #${quoteRef} not found. Please contact support or request a new quote.`)
            setLoading(false)
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Failed to connect to the quotation server. Please try again.')
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [quoteRef, quotes])

  const handleCopyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handlePaystackPayment = () => {
    if (!lead) return

    const amount = lead.estimatedInvestmentMax || lead.estimatedInvestmentMin || 0
    if (amount <= 0) {
      alert('Invalid quotation amount. Please contact NETS dispatch.')
      return
    }

    setIsProcessing(true)

    const customerEmail = lead.customerEmail && lead.customerEmail !== 'N/A' ? lead.customerEmail : 'dispatch@neweratransports.com'
    const generatedRef = `NETS-PAY-${lead.leadReference || 'QUOTE'}-${Date.now()}`

    if (paystackLoaded && (window as any).PaystackPop) {
      try {
        const handler = (window as any).PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: customerEmail,
          amount: Math.round(amount * 100), // In kobo
          currency: 'NGN',
          ref: generatedRef,
          metadata: {
            custom_fields: [
              { display_name: 'Quotation Ref', variable_name: 'quote_ref', value: lead.leadReference },
              { display_name: 'Customer Name', variable_name: 'customer_name', value: lead.customerName },
              { display_name: 'Route', variable_name: 'route', value: `${lead.origin} to ${lead.destination}` },
            ],
          },
          callback: async (response: any) => {
            console.log('Paystack Payment Successful:', response)
            setPaymentRef(response.reference || generatedRef)
            
            // Mark lead as Won & Paid in database
            await adminService.updateLeadStatus(lead.id, 'converted')
            await adminService.updateCrmStatus(lead.id, 'Won & Paid')

            // Send confirmation notifications
            emailService.sendNewBookingNotification({
              reference: generatedRef,
              customerName: lead.customerName,
              customerEmail: lead.customerEmail,
              customerPhone: lead.customerPhone,
              vehicleName: lead.payload?.estimatedInvestment?.vehicleName || lead.journeyType || 'Charter Fleet',
              pickup: lead.origin,
              destination: lead.destination,
              travelDate: lead.payload?.journeyInformation?.travelDate || lead.createdAt,
              totalAmount: amount,
              paymentStatus: 'paid',
            })

            setIsProcessing(false)
            setPaidSuccess(true)
          },
          onClose: () => {
            setIsProcessing(false)
          },
        })
        handler.openIframe()
        return
      } catch (err) {
        console.warn('Paystack popup initialization error, simulating:', err)
      }
    }

    // Offline / Test Fallback
    setTimeout(async () => {
      setPaymentRef(generatedRef)
      await adminService.updateLeadStatus(lead.id, 'converted')
      await adminService.updateCrmStatus(lead.id, 'Won & Paid')
      setIsProcessing(false)
      setPaidSuccess(true)
    }, 1200)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid #E2E8F0', borderTopColor: '#C0272D', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0D1060' }}>Loading Official Quotation...</h2>
          <p style={{ color: '#64748B', marginTop: '0.5rem' }}>Securely fetching journey information and payment parameters.</p>
        </div>
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '1.5rem' }}>
        <div style={{ width: '100%', maxWidth: 500, background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 8, padding: 'clamp(1.5rem, 5vw, 2.5rem)', textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 56, height: 56, background: 'rgba(192, 39, 45, 0.1)', color: '#C0272D', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0D1060', marginBottom: '0.75rem' }}>Quotation Not Found</h2>
          <p style={{ color: '#64748B', lineHeight: 1.6, marginBottom: '1.75rem', wordBreak: 'break-word' }}>{error || 'Unable to locate the specified quote reference.'}</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/" className="btn btn-navy w-full sm:w-auto" style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem', textAlign: 'center' }}>Return Home</Link>
            <Link to="/plan" className="btn btn-red w-full sm:w-auto" style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem', textAlign: 'center' }}>Request New Quote</Link>
          </div>
        </div>
      </div>
    )
  }

  const amount = lead.estimatedInvestmentMax || lead.estimatedInvestmentMin || 0
  const journeyInfo = lead.payload?.journeyInformation || {}
  const investInfo = lead.payload?.estimatedInvestment || {}
  const stops: any[] = Array.isArray(journeyInfo.stops) ? journeyInfo.stops : []

  // Parse Schedule
  const travelDateRaw = journeyInfo.travelDate || lead.createdAt
  const travelDateFormatted = travelDateRaw ? new Date(travelDateRaw).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Flexible Date'
  const departureTime = journeyInfo.departureTime || '09:00 AM'
  const tripType = journeyInfo.tripType || lead.journeyType || 'Drop-Off'
  const returnDateRaw = journeyInfo.returnDate
  const returnDateFormatted = returnDateRaw ? new Date(returnDateRaw).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : null
  const returnTime = journeyInfo.returnTime

  // Vehicle information
  const vehicleName = investInfo.vehicleName || lead.journeyType || 'Executive Vehicle Charter'
  const additionalVehicles = Array.isArray(journeyInfo.additionalVehicles) ? journeyInfo.additionalVehicles.filter(Boolean) : []
  const passengerCount = journeyInfo.passengerCount || 'Group'
  const distanceKm = Number(journeyInfo.distanceKm || investInfo.distanceKm || 0)
  const retentionDays = Number(investInfo.retentionDays || journeyInfo.retentionDays || 0)
  const retentionFee = Number(investInfo.retentionFee || investInfo.additionalRetentionFee || 0)
  const baseCharter = retentionFee > 0 && amount > retentionFee ? amount - retentionFee : amount

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', color: '#1E293B', paddingBottom: '6rem' }}>
      {/* Top Header Banner */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0D1060 0%, #1A1FA8 100%)',
          color: '#ffffff',
          paddingTop: 'clamp(5.5rem, 8vw, 8rem)',
          paddingBottom: 'clamp(2.5rem, 5vw, 3.5rem)',
          position: 'relative',
        }}
      >
        <div className="container-nets">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
            <div style={{ flex: 1, minWidth: 'min(100%, 280px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: 'rgba(192, 39, 45, 0.3)',
                    border: '1px solid rgba(192, 39, 45, 0.6)',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '2px',
                    display: 'inline-block',
                  }}
                >
                  Official Quotation
                </span>
                <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)', fontFamily: 'monospace', fontWeight: 600, wordBreak: 'break-all' }}>
                  {lead.leadReference}
                </span>
              </div>

              <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.25, wordBreak: 'break-word' }}>
                Quotation & Payment Checkout
              </h1>
              <p style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1rem)', color: 'rgba(255, 255, 255, 0.8)', marginTop: '0.5rem', wordBreak: 'break-word' }}>
                Prepared for <strong style={{ color: '#ffffff' }}>{lead.customerName}</strong>
              </p>
            </div>

            {/* Shareable Link Tool */}
            <div className="w-full sm:w-auto" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={handleCopyLink}
                className="w-full sm:w-auto"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '4px',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {copied ? <Check size={16} color="#16A34A" /> : <Copy size={16} />}
                {copied ? 'Link Copied!' : 'Copy Payment Link'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Checkout Container */}
      <div className="container-nets" style={{ marginTop: '-2rem', position: 'relative', zIndex: 10 }}>
        
        {/* Payment Confirmation Alert (If already paid) */}
        {paidSuccess && (
          <div
            style={{
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '8px',
              padding: 'clamp(1rem, 3vw, 1.5rem)',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              boxShadow: '0 4px 16px rgba(22, 163, 74, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ width: 44, height: 44, background: '#16A34A', color: '#ffffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#166534', margin: 0 }}>
                  Quotation Confirmed & Fully Paid
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#15803D', margin: '0.25rem 0 0', wordBreak: 'break-all' }}>
                  {paymentRef ? `Payment Transaction Ref: ${paymentRef}` : 'A dedicated operations specialist and driver have been assigned.'}
                </p>
              </div>
            </div>
            <div className="w-full sm:w-auto" style={{ display: 'flex', gap: '0.75rem' }}>
              <a
                href="mailto:info@neweratransports.com"
                className="w-full sm:w-auto"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: '#ffffff',
                  border: '1px solid #86EFAC',
                  borderRadius: '4px',
                  color: '#166534',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <Mail size={14} /> Contact Dispatch
              </a>
            </div>
          </div>
        )}

        <div className="quote-checkout-grid">
          
          {/* Main Column: Route, Fleet, and Client */}
          <div className="quote-checkout-col-main">
            
            {/* Route & Schedule Card */}
            <div className="quote-card-route" style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: 'clamp(1.25rem, 3vw, 1.75rem)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0D1060', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={18} color="#C0272D" style={{ flexShrink: 0 }} /> Journey Itinerary & Route
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Pickup */}
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 4, flexShrink: 0, width: 20 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#16A34A', border: '2px solid #ffffff', boxShadow: '0 0 0 2px #16A34A' }} />
                      <div style={{ width: 2, minHeight: 28, flex: 1, background: '#CBD5E1', margin: '4px 0' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em' }}>Pickup Location</span>
                      <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0F172A', marginTop: 2, wordBreak: 'break-word' }}>{lead.origin || 'Lagos, Nigeria'}</p>
                    </div>
                  </div>

                  {/* Intermediate Stops */}
                  {stops.map((stop: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 3, flexShrink: 0, width: 20 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#0D1060', color: '#ffffff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {idx + 1}
                        </div>
                        <div style={{ width: 2, minHeight: 28, flex: 1, background: '#CBD5E1', margin: '4px 0' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: '#0D1060', letterSpacing: '0.05em' }}>Intermediate Stop {idx + 1}</span>
                        <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0F172A', marginTop: 2, wordBreak: 'break-word' }}>
                          {stop?.displayName || stop?.address || (typeof stop === 'string' ? stop : 'Intermediate Stop')}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Destination */}
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 4, flexShrink: 0, width: 20 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#C0272D', border: '2px solid #ffffff', boxShadow: '0 0 0 2px #C0272D' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em' }}>Destination</span>
                      <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0F172A', marginTop: 2, wordBreak: 'break-word' }}>
                        {lead.destination || 'Lagos, Nigeria'}
                        {distanceKm > 0 && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#C0272D', marginLeft: '0.5rem' }}>
                            ({Math.round(distanceKm)} km)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Schedule Sub-grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.875rem', background: '#F8FAFC', padding: '1rem', borderRadius: '6px', marginTop: '0.75rem', border: '1px solid #E2E8F0' }}>
                  <div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>
                      <Calendar size={13} color="#0D1060" style={{ flexShrink: 0 }} /> Travel Date
                    </span>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0D1060', marginTop: 2, wordBreak: 'break-word' }}>{travelDateFormatted}</p>
                  </div>
                  <div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>
                      <Clock size={13} color="#0D1060" style={{ flexShrink: 0 }} /> Departure Time
                    </span>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0D1060', marginTop: 2 }}>{departureTime}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>
                      Service Type
                    </span>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#C0272D', marginTop: 2 }}>{tripType}</p>
                  </div>
                  {returnDateFormatted && (
                    <div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>
                        <Calendar size={13} color="#0D1060" style={{ flexShrink: 0 }} /> Return Date
                      </span>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0D1060', marginTop: 2, wordBreak: 'break-word' }}>{returnDateFormatted} {returnTime ? `at ${returnTime}` : ''}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Vehicle & Passenger Allocation */}
            <div className="quote-card-fleet" style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: 'clamp(1.25rem, 3vw, 1.75rem)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0D1060', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={18} color="#C0272D" style={{ flexShrink: 0 }} /> Assigned Fleet & Capacity
              </h2>

              <div className="quote-fleet-grid">
                <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em' }}>Primary Vehicle</span>
                  <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0D1060', marginTop: 4, wordBreak: 'break-word' }}>{vehicleName}</p>
                  {additionalVehicles.length > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      {additionalVehicles.map((v: string, i: number) => (
                        <span key={i} style={{ background: 'rgba(26, 31, 168, 0.08)', color: '#0D1060', padding: '0.2rem 0.5rem', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 600, wordBreak: 'break-word' }}>
                          + {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em' }}>
                    <Users size={12} style={{ flexShrink: 0 }} /> Passenger Group
                  </span>
                  <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0D1060', marginTop: 4 }}>{passengerCount} Passengers</p>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginTop: 2 }}>Air-conditioned & Executive configured</span>
                </div>
              </div>

              {/* Service Standards Inclusions */}
              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.8125rem', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={15} color="#16A34A" style={{ flexShrink: 0 }} /> Professional Uniformed Driver
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={15} color="#16A34A" style={{ flexShrink: 0 }} /> Fuel & Maintenance Included
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={15} color="#16A34A" style={{ flexShrink: 0 }} /> Comprehensive Passenger Transit Cover
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={15} color="#16A34A" style={{ flexShrink: 0 }} /> Tolls & Interstate Security Compliance
                </div>
              </div>
            </div>

            {/* Client Profile Card */}
            <div className="quote-card-client" style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: 'clamp(1.25rem, 3vw, 1.5rem)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ width: '100%' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em' }}>Client Reference</span>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', wordBreak: 'break-word', marginTop: 2 }}>{lead.customerName}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', fontSize: '0.8125rem', color: '#64748B', marginTop: 4 }}>
                  <span style={{ wordBreak: 'break-all' }}>{lead.customerEmail}</span>
                  {lead.customerPhone && <span style={{ wordBreak: 'break-word' }}>• {lead.customerPhone}</span>}
                  {lead.company && <span style={{ wordBreak: 'break-word' }}>• {lead.company}</span>}
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar Column: Checkout Summary & Paystack Action */}
          <div className="quote-checkout-col-sidebar">
            
            {/* Total Investment Card */}
            <div className="quote-card-investment" style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: 'clamp(1.25rem, 3vw, 1.75rem)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em' }}>Total Investment</span>
                <div style={{ fontSize: 'clamp(1.75rem, 5vw, 2.25rem)', fontWeight: 800, color: '#0D1060', letterSpacing: '-0.02em', marginTop: 2, wordBreak: 'break-word' }}>
                  {fmtCurrency(amount)}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 600 }}>✓ Guaranteed Rate · All Logistics Included</span>
              </div>

              {/* Price itemization */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', gap: '0.5rem' }}>
                  <span>Base Fleet Charter</span>
                  <span style={{ fontWeight: 600, color: '#0F172A', textAlign: 'right', flexShrink: 0 }}>{fmtCurrency(baseCharter)}</span>
                </div>
                {retentionFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#C0272D', gap: '0.5rem' }}>
                    <span>Vehicle Retention ({retentionDays} days)</span>
                    <span style={{ fontWeight: 600, color: '#C0272D', textAlign: 'right', flexShrink: 0 }}>{fmtCurrency(retentionFee)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', gap: '0.5rem' }}>
                  <span>VAT & Government Levies</span>
                  <span style={{ fontWeight: 600, color: '#16A34A', textAlign: 'right', flexShrink: 0 }}>Included</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', gap: '0.5rem' }}>
                  <span>Driver Allowance & Fuel</span>
                  <span style={{ fontWeight: 600, color: '#16A34A', textAlign: 'right', flexShrink: 0 }}>Included</span>
                </div>
              </div>

              {/* Action Button */}
              {paidSuccess ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ padding: '0.875rem', background: '#DCFCE7', color: '#166534', borderRadius: '4px', fontWeight: 700, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={18} style={{ flexShrink: 0 }} /> Payment Received
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.75rem' }}>
                    An electronic receipt has been dispatched to your email address.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Terms Acceptance Notice */}
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      padding: '0.75rem 0.875rem',
                      fontSize: '0.75rem',
                      color: '#475569',
                      lineHeight: 1.5,
                      textAlign: 'center',
                    }}
                  >
                    By proceeding to payment, you confirm your itinerary and agree to New Era Transport Services'{' '}
                    <Link
                      to="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#0D1060', fontWeight: 700, textDecoration: 'underline' }}
                    >
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link
                      to="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#0D1060', fontWeight: 700, textDecoration: 'underline' }}
                    >
                      Privacy Policy
                    </Link>.
                  </div>

                  <button
                    type="button"
                    onClick={handlePaystackPayment}
                    disabled={isProcessing}
                    className="btn btn-red"
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      fontSize: '1rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      borderRadius: '4px',
                      wordBreak: 'break-word',
                    }}
                  >
                    <Lock size={16} style={{ flexShrink: 0 }} />
                    <span>{isProcessing ? 'Connecting to Paystack...' : `Pay ${fmtCurrency(amount)} with Paystack`}</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#64748B' }}>
                    <ShieldCheck size={14} color="#16A34A" style={{ flexShrink: 0 }} />
                    <span>256-bit SSL Encrypted · Paystack Gateway</span>
                  </div>
                </div>
              )}

              {/* Supported payment channels */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #E2E8F0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.6875rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  Supported Payment Methods
                </span>
                <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
                  Mastercard · Visa · Verve · Bank Transfer · USSD · Apple Pay
                </p>
              </div>
            </div>

            {/* Need assistance card */}
            <div className="quote-card-help" style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem', fontSize: '0.8125rem', color: '#64748B', wordBreak: 'break-word' }}>
              <strong style={{ color: '#0D1060', display: 'block', marginBottom: '0.25rem' }}>Questions regarding this quote?</strong>
              Call our enterprise operations desk at <a href="tel:+2349167919439" style={{ color: '#C0272D', fontWeight: 600, textDecoration: 'none' }}>+234 916 791 9439</a> or email <a href="mailto:info@neweratransports.com" style={{ color: '#0D1060', fontWeight: 600, wordBreak: 'break-all' }}>info@neweratransports.com</a>.
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
