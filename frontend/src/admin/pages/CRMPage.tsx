import { useState, useEffect, useMemo } from 'react'
import { Search, Users, DollarSign, Filter, CheckCircle2, Clock, Phone, Mail, MapPin, Calendar, FileText, ArrowRight, X, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, Check, ExternalLink, Truck, CreditCard, ShieldCheck, Zap } from 'lucide-react'
import { adminService, type AdminLead, formatDuration } from '../services/adminService'
import { useAdminStore } from '../store/useAdminStore'

const fmtCurrency = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`
const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export const CRM_STATUS_FILTERS = [
  'all',
  'New Lead',
  'Pending Review',
  'Contacted',
  'Proposal Sent',
  'Won & Paid',
  'Not Interested',
  'Invalid',
] as const

export const CRM_STATUS_OPTIONS = [
  'New Lead',
  'Pending Review',
  'Contacted',
  'Proposal Sent',
  'Won & Paid',
  'Not Interested',
  'Invalid',
] as const

const statusBadges: Record<string, { label: string; class: string }> = {
  'New Lead': { label: 'New Lead', class: 'admin-badge-yellow' },
  'Pending Review': { label: 'Pending Review', class: 'admin-badge-yellow' },
  'Contacted': { label: 'Contacted', class: 'admin-badge-accent' },
  'Proposal Sent': { label: 'Proposal Sent', class: 'admin-badge-accent' },
  'Won & Paid': { label: 'Won & Paid', class: 'admin-badge-green' },
  'won': { label: 'Won & Paid', class: 'admin-badge-green' },
  'converted': { label: 'Won & Paid', class: 'admin-badge-green' },
  'paid': { label: 'Won & Paid', class: 'admin-badge-green' },
  'Not Interested': { label: 'Not Interested', class: 'admin-badge-red' },
  'Invalid': { label: 'Invalid (Test)', class: 'admin-badge-gray' },
  'invalid': { label: 'Invalid (Test)', class: 'admin-badge-gray' },
}

export const isLeadWon = (l: { crmStatus?: string; status?: string } | null | undefined): boolean => {
  if (!l) return false
  const crm = String(l.crmStatus || '').trim().toLowerCase()
  const st = String(l.status || '').trim().toLowerCase()
  return (
    crm === 'won & paid' ||
    crm === 'won' ||
    crm === 'converted' ||
    crm === 'paid & confirmed' ||
    st === 'converted' ||
    st === 'won' ||
    st === 'paid' ||
    st === 'paid & confirmed'
  )
}

export function CRMPage() {
  const [leads, setLeads] = useState<AdminLead[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [closerFilter, setCloserFilter] = useState('all')
  const [isAutoAssigning, setIsAutoAssigning] = useState(false)
  const [selectedLead, setSelectedLead] = useState<AdminLead | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [isDeleting, setIsDeleting] = useState(false)
  const { session } = useAdminStore()
  const isAdmin = session.user?.role === 'admin' || session.user?.role === 'super-admin'
  const canAssign = isAdmin || session.user?.role === 'staff'

  const handleCopyPaymentLink = (leadRefOrId: string | number) => {
    const url = `${window.location.origin}/pay/${leadRefOrId}`
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2500)
  }

  const handleSaveNote = async () => {
    if (!selectedLead) return
    setSavingNote(true)
    const success = await adminService.updateLeadNotes(selectedLead.id, noteInput)
    setSavingNote(false)
    if (success) {
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, notes: noteInput } : l))
      setSelectedLead(prev => prev ? { ...prev, notes: noteInput } : null)
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 2500)
    } else {
      alert('Failed to save note. Please try again.')
    }
  }

  const loadLeads = () => {
    setLoading(true)
    Promise.all([
      adminService.getLeads(),
      adminService.getUsers()
    ]).then(([leadList, userList]) => {
      setLeads(leadList || [])
      setUsers(userList || [])
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }

  useEffect(() => {
    loadLeads()
    const interval = setInterval(() => {
      adminService.getLeads().then((list) => {
        if (list) setLeads(list)
      }).catch(() => {})
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, pageSize])

  const handleUpdateStatus = async (id: number | string, newStatus: string) => {
    const success = await adminService.updateCrmStatus(id, newStatus, session.user?.id)
    if (success) {
      const isWon = newStatus === 'Won & Paid'
      const updatedStatus = isWon ? 'converted' : undefined
      if (isWon) {
        adminService.updateLeadStatus(id, 'converted')
      }
      setLeads(prev => prev.map(l => l.id === id ? { ...l, crmStatus: newStatus, ...(updatedStatus ? { status: updatedStatus } : {}) } : l))
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead({ ...selectedLead, crmStatus: newStatus, ...(updatedStatus ? { status: updatedStatus } : {}) })
      }
      // Re-fetch in background to sync calculated response time & close time
      adminService.getLeads().then(updatedList => {
        if (updatedList) {
          setLeads(updatedList)
          if (selectedLead) {
            const reloaded = updatedList.find(l => String(l.id) === String(selectedLead.id))
            if (reloaded) setSelectedLead(reloaded)
          }
        }
      })
    }
  }

  const handleUpdateAssignment = async (id: number | string, assignedTo: string) => {
    const success = await adminService.updateLeadAssignment(id, assignedTo)
    if (success) {
      if (assignedTo === 'auto' || assignedTo === 'round-robin') {
        const updatedList = await adminService.getLeads()
        if (updatedList) {
          setLeads(updatedList)
          if (selectedLead && selectedLead.id === id) {
            const reloaded = updatedList.find(l => String(l.id) === String(id))
            if (reloaded) setSelectedLead(reloaded)
          }
        }
      } else {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, assignedTo } : l))
        if (selectedLead && selectedLead.id === id) {
          setSelectedLead({ ...selectedLead, assignedTo })
        }
      }
    }
  }

  const handleAutoAssignAll = async () => {
    setIsAutoAssigning(true)
    const res = await adminService.autoAssignUnassignedLeads()
    setIsAutoAssigning(false)
    if (res.success) {
      loadLeads()
    }
  }

  const handleDeleteLead = async (id: number | string) => {
    if (!window.confirm('Are you sure you want to delete this lead? This action cannot be undone.')) return
    setIsDeleting(true)
    const success = await adminService.deleteLead(id)
    if (success) {
      setLeads(prev => prev.filter(l => l.id !== id))
      setSelectedLead(null)
    } else {
      alert('Failed to delete lead. Please try again.')
    }
    setIsDeleting(false)
  }

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      // Sales closer can only see assigned leads
      if (session.user?.role === 'sales_closer' && String(l.assignedTo) !== String(session.user.id)) {
        return false
      }

      if (closerFilter !== 'all') {
        if (closerFilter === 'unassigned') {
          if (l.assignedTo && l.assignedTo !== '') return false
        } else if (String(l.assignedTo) !== String(closerFilter)) {
          return false
        }
      }

      const name = String(l?.customerName || '').toLowerCase()
      const email = String(l?.customerEmail || '').toLowerCase()
      const ref = String(l?.leadReference || '').toLowerCase()
      const origin = String(l?.origin || '').toLowerCase()
      const dest = String(l?.destination || '').toLowerCase()
      const term = search.trim().toLowerCase()

      const matchSearch = !term || name.includes(term) || email.includes(term) || ref.includes(term) || origin.includes(term) || dest.includes(term)
      
      if (statusFilter === 'all') return matchSearch

      if (statusFilter === 'Won & Paid') {
        return matchSearch && isLeadWon(l)
      }

      const leadSt = String(l?.crmStatus || l?.status || '').toLowerCase()
      const filtSt = statusFilter.toLowerCase()
      
      return matchSearch && (leadSt === filtSt)
    })
  }, [leads, search, statusFilter, closerFilter, session.user])

  // Pagination calculations
  const totalItems = filteredLeads.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(totalItems, startIndex + pageSize)
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex)

  const validLeads = leads.filter(l => String(l.crmStatus || l.status).toLowerCase() !== 'invalid')
  const totalValue = validLeads.reduce((acc, l) => acc + (Number(l.estimatedInvestmentMax) || Number(l.estimatedInvestmentMin) || 0), 0)
  const wonCount = validLeads.filter(l => isLeadWon(l)).length
  const winRate = validLeads.length > 0 ? Math.round((wonCount / validLeads.length) * 100) : 0
  const invalidCount = leads.filter(l => String(l.crmStatus || l.status).toLowerCase() === 'invalid').length
  const unassignedCount = leads.filter(l => !l.assignedTo || l.assignedTo === '').length

  const contactedLeads = validLeads.filter(l => l.responseTimeSec !== undefined && l.responseTimeSec > 0)
  const avgResponseTimeSec = contactedLeads.length > 0
    ? Math.round(contactedLeads.reduce((acc, l) => acc + (l.responseTimeSec || 0), 0) / contactedLeads.length)
    : 0

  // Generate visible page numbers
  const pageNumbers = useMemo(() => {
    const pages: number[] = []
    const maxVisible = 5
    let start = Math.max(1, safePage - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }, [safePage, totalPages])

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="admin-page-title">CRM & Lead Pipeline</div>
          <div className="admin-page-desc">
            Track customer requests, manage quotes, and convert leads into active bookings.
          </div>
        </div>
        <div className="admin-page-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {canAssign && unassignedCount > 0 && (
            <button
              onClick={handleAutoAssignAll}
              disabled={isAutoAssigning}
              className="admin-btn admin-btn-primary admin-btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              title="Automatically distribute all unassigned leads across active sales closers using round robin"
            >
              <Users size={13} />
              {isAutoAssigning ? 'Assigning…' : `Auto-Assign (${unassignedCount})`}
            </button>
          )}
          <button
            onClick={loadLeads}
            disabled={loading}
            className="admin-btn admin-btn-ghost admin-btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Refreshing…' : 'Refresh Leads'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="admin-stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-stat-card" style={{ borderTop: '2px solid var(--adm-accent)' }}>
          <div className="admin-stat-label">Total Leads Captured</div>
          <div className="admin-stat-value">{leads.length}</div>
          <div className="admin-stat-sub">
            {invalidCount > 0 ? `${invalidCount} marked invalid / test` : 'From journey planner & website'}
          </div>
        </div>

        <div className="admin-stat-card" style={{ borderTop: '2px solid #0284c7' }}>
          <div className="admin-stat-label">Avg Response Time</div>
          <div className="admin-stat-value" style={{ color: avgResponseTimeSec > 0 ? 'var(--adm-success)' : undefined }}>
            {formatDuration(avgResponseTimeSec)}
          </div>
          <div className="admin-stat-sub">
            {contactedLeads.length > 0 ? `${contactedLeads.length} leads reached by closers` : 'Measured on status change'}
          </div>
        </div>

        <div className="admin-stat-card" style={{ borderTop: '2px solid var(--adm-success)' }}>
          <div className="admin-stat-label">Won & Converted</div>
          <div className="admin-stat-value">{wonCount} <span style={{ fontSize: 13, color: 'var(--adm-text-3)', fontWeight: 400 }}>({winRate}%)</span></div>
          <div className="admin-stat-sub">Confirmed & paid ({validLeads.length} valid)</div>
        </div>

        <div className="admin-stat-card" style={{ borderTop: '2px solid var(--adm-accent)' }}>
          <div className="admin-stat-label">Pipeline Opportunity Value</div>
          <div className="admin-stat-value" style={{ fontSize: '1.25rem' }}>{fmtCurrency(totalValue)}</div>
          <div className="admin-stat-sub admin-stat-trend-up">Excludes test / invalid leads</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-toolbar-search">
          <Search size={13} color="var(--adm-text-3)" />
          <input
            placeholder="Search by client name, email, or quote ref…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {CRM_STATUS_FILTERS.map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`admin-btn admin-btn-sm ${statusFilter === st ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
              >
                {st === 'all' ? 'All Leads' : (statusBadges[st]?.label || st)}
              </button>
            ))}
          </div>

          {canAssign && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginLeft: 'auto' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--adm-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Closer:</span>
              <select
                className="admin-select"
                value={closerFilter}
                onChange={e => setCloserFilter(e.target.value)}
                style={{ padding: '0.3rem 0.625rem', fontSize: 12, minWidth: 140, height: 32 }}
              >
                <option value="all">All Closers</option>
                <option value="unassigned">Unassigned ({unassignedCount})</option>
                {users.filter(u => u.role === 'sales_closer').map(u => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Leads Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Client</th>
                <th>Journey / Route</th>
                <th>Value (Est.)</th>
                <th>Date Received</th>
                <th>Assigned To</th>
                <th>Response Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="admin-table-empty">Loading CRM leads…</td>
                </tr>
              ) : paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="admin-table-empty">No leads found matching your search.</td>
                </tr>
              ) : (
                paginatedLeads.map(l => {
                  const currentStatus = isLeadWon(l) ? 'Won & Paid' : String(l.crmStatus || l.status)
                  const badge = statusBadges[currentStatus] || { label: currentStatus, class: 'admin-badge-gray' }
                  const val = l.estimatedInvestmentMax || l.estimatedInvestmentMin || 0
                  const assignedUser = users.find(u => String(u.id) === String(l.assignedTo))
                  return (
                    <tr
                      key={l.id || l.leadReference}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedLead(l)
                        setNoteInput(l.notes || '')
                        setNoteSaved(false)
                      }}
                    >
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--adm-text-2)', fontWeight: 600 }}>
                          {l.leadReference || `LEAD-${l.id}`}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{l.customerName}</div>
                        <div style={{ fontSize: 11, color: 'var(--adm-text-3)' }}>{l.customerEmail}</div>
                        {l.notes && (
                          <div title={l.notes} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--adm-accent)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                            <FileText size={11} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.notes}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <div>
                          <span style={{ fontWeight: 600 }}>{l.payload?.estimatedInvestment?.vehicleName || l.journeyType || 'Standard Charter'}</span>
                          <span style={{ color: 'var(--adm-text-3)', marginLeft: 4 }}>• {l.payload?.journeyInformation?.travelDate ? new Date(l.payload.journeyInformation.travelDate).toLocaleDateString('en-NG', {day:'numeric', month:'short'}) : 'No date'}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--adm-text-3)', marginTop: 2 }}>
                          {l.origin ? (
                            <>
                              <span>{l.origin.split(',')[0]} → {l.destination?.split(',')[0] || ''}</span>
                              {Array.isArray(l.payload?.journeyInformation?.stops) && l.payload.journeyInformation.stops.length > 0 && (
                                <span style={{ marginLeft: 4, color: 'var(--adm-accent)', fontWeight: 600 }}>
                                  (+{l.payload.journeyInformation.stops.length} {l.payload.journeyInformation.stops.length === 1 ? 'stop' : 'stops'})
                                </span>
                              )}
                            </>
                          ) : 'Charter Route'}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--adm-text-1)' }}>
                        {val > 0 ? fmtCurrency(val) : '—'}
                      </td>
                      <td style={{ fontSize: 12 }}>{fmtDate(l.createdAt)}</td>
                      <td style={{ fontSize: 12, color: 'var(--adm-text-2)' }}>{assignedUser ? assignedUser.fullName : (l.assignedTo ? 'Unknown User' : 'Unassigned')}</td>
                      <td style={{ fontSize: 12 }}>
                        {l.responseTimeSec !== undefined && l.responseTimeSec > 0 ? (
                          <span
                            className="admin-badge admin-badge-green"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 600 }}
                            title={`First contacted in ${formatDuration(l.responseTimeSec)}`}
                          >
                            <Zap size={10} /> {formatDuration(l.responseTimeSec)}
                          </span>
                        ) : String(l.crmStatus || l.status).toLowerCase() === 'invalid' ? (
                          <span style={{ color: 'var(--adm-text-3)' }}>—</span>
                        ) : (
                          <span
                            className="admin-badge admin-badge-yellow"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, opacity: 0.85 }}
                            title="Pending outreach from sales closer (will record on status change)"
                          >
                            <Clock size={10} /> Awaiting
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`admin-badge ${badge.class}`}>{badge.label}</span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Controls ── */}
        {totalItems > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '0.75rem 1rem',
            background: '#ffffff',
            border: '1px solid var(--adm-border)',
            borderRadius: 'var(--adm-radius-sm)',
            fontSize: 13,
            color: 'var(--adm-text-2)'
          }}>
            {/* Range Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>
                Showing <strong style={{ color: 'var(--adm-text-1)' }}>{startIndex + 1}</strong>–<strong style={{ color: 'var(--adm-text-1)' }}>{endIndex}</strong> of <strong style={{ color: 'var(--adm-text-1)' }}>{totalItems}</strong> leads
              </span>
            </div>

            {/* Controls & Page size */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Page Size Select */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--adm-radius-sm)',
                    border: '1px solid var(--adm-border)',
                    background: 'var(--adm-surface-2)',
                    color: 'var(--adm-text-1)',
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Page Navigation Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safePage <= 1}
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  style={{ padding: '0.35rem 0.5rem', opacity: safePage <= 1 ? 0.4 : 1 }}
                  title="First page"
                >
                  <ChevronsLeft size={14} />
                </button>

                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  style={{ padding: '0.35rem 0.5rem', opacity: safePage <= 1 ? 0.4 : 1 }}
                  title="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>

                {pageNumbers.map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`admin-btn admin-btn-sm ${safePage === p ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
                    style={{ minWidth: 28, height: 28, padding: 0, justifyContent: 'center', fontSize: 12, fontWeight: safePage === p ? 700 : 500 }}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  style={{ padding: '0.35rem 0.5rem', opacity: safePage >= totalPages ? 0.4 : 1 }}
                  title="Next page"
                >
                  <ChevronRight size={14} />
                </button>

                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safePage >= totalPages}
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  style={{ padding: '0.35rem 0.5rem', opacity: safePage >= totalPages ? 0.4 : 1 }}
                  title="Last page"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Floating Lead Details Modal ── */}
      {selectedLead && (() => {
        const distanceKm = Number(
          selectedLead.payload?.journeyInformation?.distanceKm ||
          selectedLead.payload?.estimatedInvestment?.distanceKm ||
          selectedLead.payload?.distanceKm ||
          0
        )
        const retentionPreference = 
          selectedLead.payload?.journeyInformation?.retentionPreference ||
          selectedLead.payload?.retentionPreference ||
          null
        const retentionDays = Number(
          selectedLead.payload?.estimatedInvestment?.retentionDays ||
          selectedLead.payload?.journeyInformation?.retentionDays ||
          selectedLead.payload?.retentionDays ||
          0
        )
        const retentionFee = Number(
          selectedLead.payload?.estimatedInvestment?.retentionFee ||
          selectedLead.payload?.estimatedInvestment?.additionalRetentionFee ||
          selectedLead.payload?.retentionFee ||
          0
        )
        const retentionRate = Number(
          selectedLead.payload?.estimatedInvestment?.retentionRate ||
          selectedLead.payload?.retentionRate ||
          (retentionDays > 0 && retentionFee > 0 ? Math.round(retentionFee / retentionDays) : 0)
        )
        const vehicleMobility = (
          selectedLead.payload?.journeyInformation?.vehicleMobility ||
          selectedLead.payload?.vehicleMobility ||
          'parked'
        )
        const totalInvestment = Number(
          selectedLead.estimatedInvestmentMax ||
          selectedLead.estimatedInvestmentMin ||
          selectedLead.payload?.estimatedInvestment?.total ||
          0
        )
        const baseFleetCharter = Number(
          selectedLead.payload?.estimatedInvestment?.baseFleetCharter ||
          (retentionFee > 0 && totalInvestment > retentionFee ? totalInvestment - retentionFee : totalInvestment)
        )

        return (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedLead(null)
            }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
        >
          <div
            className="admin-detail-modal"
            style={{
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.4)',
              position: 'relative'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--adm-border)', paddingBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--adm-accent)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.2rem 0.5rem', borderRadius: 4 }}>
                    {selectedLead.leadReference}
                  </span>
                  <span className={`admin-badge ${(statusBadges[isLeadWon(selectedLead) ? 'Won & Paid' : (selectedLead.crmStatus || selectedLead.status)] || { class: 'admin-badge-gray' }).class}`}>
                    {(statusBadges[isLeadWon(selectedLead) ? 'Won & Paid' : (selectedLead.crmStatus || selectedLead.status)] || { label: selectedLead.crmStatus || selectedLead.status }).label}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--adm-text-1)' }}>
                  {selectedLead.customerName}
                </h3>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {isAdmin && (
                  <button
                    className="admin-btn admin-btn-danger admin-btn-sm"
                    onClick={() => handleDeleteLead(selectedLead.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
                <button
                  className="admin-btn admin-btn-icon admin-btn-ghost"
                  onClick={() => setSelectedLead(null)}
                  style={{ borderRadius: '50%', width: 32, height: 32 }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Estimated Value Banner */}
            <div style={{ background: 'var(--adm-surface-2)', padding: '1rem 1.25rem', borderRadius: 'var(--adm-radius-sm)', border: '1px solid var(--adm-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, color: 'var(--adm-text-3)', letterSpacing: '0.05em' }}>
                  Estimated Opportunity Value
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--adm-accent)', marginTop: 2 }}>
                  {fmtCurrency(selectedLead.estimatedInvestmentMax || selectedLead.estimatedInvestmentMin || 0)}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--adm-text-2)', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div><strong>Received:</strong> {fmtDate(selectedLead.createdAt)}</div>
                {selectedLead.responseTimeSec !== undefined && selectedLead.responseTimeSec > 0 ? (
                  <div style={{ color: 'var(--adm-success)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                    <Zap size={11} /> <strong>First Response:</strong> {formatDuration(selectedLead.responseTimeSec)}
                  </div>
                ) : (
                  <div style={{ color: 'var(--adm-warning)', fontSize: 11 }}>
                    ⏳ Awaiting initial closer outreach
                  </div>
                )}
                {selectedLead.closeTimeSec !== undefined && selectedLead.closeTimeSec > 0 && (
                  <div style={{ color: 'var(--adm-accent)', fontWeight: 600 }}>
                    🏆 <strong>Close Velocity:</strong> {formatDuration(selectedLead.closeTimeSec)}
                  </div>
                )}
              </div>
            </div>

            {/* 2-Column Details Grid */}
            <div className="admin-grid-2" style={{ gap: '1.25rem' }}>
              {/* Customer Info Card */}
              <div style={{ background: 'var(--adm-surface-2)', padding: '1rem', borderRadius: 'var(--adm-radius-sm)', border: '1px solid var(--adm-border)', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--adm-text-3)', letterSpacing: '0.05em', marginBottom: 2 }}>
                  Client Profile
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 13 }}>
                  <Users size={14} color="var(--adm-accent)" />
                  <span style={{ fontWeight: 600, color: 'var(--adm-text-1)' }}>{selectedLead.customerName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 12, color: 'var(--adm-text-2)' }}>
                  <Mail size={14} />
                  <a href={`mailto:${selectedLead.customerEmail}`} style={{ color: 'var(--adm-text-2)', textDecoration: 'none' }}>
                    {selectedLead.customerEmail}
                  </a>
                </div>
                {selectedLead.customerPhone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 12, color: 'var(--adm-text-2)' }}>
                    <Phone size={14} />
                    <a href={`tel:${selectedLead.customerPhone}`} style={{ color: 'var(--adm-text-2)', textDecoration: 'none' }}>
                      {selectedLead.customerPhone}
                    </a>
                  </div>
                )}
                {selectedLead.company && (
                  <div style={{ fontSize: 12, color: 'var(--adm-text-2)', marginTop: 2 }}>
                    <strong style={{ color: 'var(--adm-text-3)' }}>Company:</strong> {selectedLead.company}
                  </div>
                )}
                {selectedLead.heardAboutUs && (
                  <div style={{ fontSize: 12, color: 'var(--adm-text-2)' }}>
                    <strong style={{ color: 'var(--adm-text-3)' }}>Source:</strong> {selectedLead.heardAboutUs}
                  </div>
                )}
              </div>

              {/* Journey Details Card */}
              <div style={{ background: 'var(--adm-surface-2)', padding: '1rem', borderRadius: 'var(--adm-radius-sm)', border: '1px solid var(--adm-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--adm-text-3)', letterSpacing: '0.05em' }}>
                    Journey & Fleet Logistics
                  </div>
                  <span className="admin-badge admin-badge-accent" style={{ fontSize: 10 }}>
                    {selectedLead.payload?.journeyInformation?.tripType || selectedLead.payload?.tripType || selectedLead.journeyType || 'Drop-Off'}
                  </span>
                </div>

                {/* Explicit Vehicle Type Section */}
                <div style={{ background: '#ffffff', padding: '0.75rem 0.875rem', borderRadius: '4px', border: '1px solid var(--adm-border)', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--adm-text-3)', letterSpacing: '0.05em' }}>
                    Assigned Vehicle Type(s)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 13, fontWeight: 700, color: 'var(--adm-text-1)' }}>
                    <Truck size={16} color="var(--adm-accent)" style={{ flexShrink: 0 }} />
                    <span>
                      {selectedLead.payload?.estimatedInvestment?.vehicleName ||
                       selectedLead.payload?.vehicleDetails?.vehicleName ||
                       selectedLead.payload?.journeyInformation?.selectedVehicle ||
                       selectedLead.payload?.journeyInformation?.recommendedVehicle ||
                       selectedLead.payload?.journeyInformation?.vehicleCategory ||
                       selectedLead.payload?.vehicleName ||
                       (selectedLead.journeyType && !['One-Way', 'Drop-Off', 'To & Fro', 'Return', 'Multi-Day'].includes(selectedLead.journeyType) ? selectedLead.journeyType : null) ||
                       'Toyota HiAce (14 Seater)'}
                    </span>
                  </div>

                  {Array.isArray(selectedLead.payload?.journeyInformation?.additionalVehicles) && selectedLead.payload.journeyInformation.additionalVehicles.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2, marginLeft: '1.5rem' }}>
                      {selectedLead.payload.journeyInformation.additionalVehicles.map((v: string, idx: number) => (
                        <span key={idx} style={{ background: 'rgba(26, 31, 168, 0.08)', color: 'var(--adm-accent)', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>
                          + {v}
                        </span>
                      ))}
                    </div>
                  )}

                  {(selectedLead.payload?.journeyInformation?.passengerCount || selectedLead.payload?.passengerCount) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--adm-text-2)', marginTop: 2, marginLeft: '1.5rem' }}>
                      <Users size={11} />
                      <span>{selectedLead.payload?.journeyInformation?.passengerCount || selectedLead.payload?.passengerCount} Passengers Group</span>
                    </div>
                  )}
                </div>
                
                {/* Travel Date and Time */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 12 }}>
                    <Calendar size={14} color="var(--adm-accent)" style={{ flexShrink: 0 }} />
                    <div style={{ color: 'var(--adm-text-2)' }}>
                      <strong style={{ color: 'var(--adm-text-1)' }}>Travel Date:</strong>{' '}
                      {selectedLead.payload?.journeyInformation?.travelDate 
                        ? new Date(selectedLead.payload.journeyInformation.travelDate).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) 
                        : (selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Flexible')}
                      {selectedLead.payload?.journeyInformation?.departureTime && (
                        <span style={{ marginLeft: 6, color: 'var(--adm-text-1)', fontWeight: 600 }}>
                          • {selectedLead.payload.journeyInformation.departureTime}
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedLead.payload?.journeyInformation?.returnDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 12, marginLeft: '1.4rem', color: 'var(--adm-text-2)' }}>
                      <Clock size={12} color="var(--adm-accent)" />
                      <span>
                        <strong style={{ color: 'var(--adm-text-1)' }}>Return:</strong>{' '}
                        {new Date(selectedLead.payload.journeyInformation.returnDate).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        {selectedLead.payload?.journeyInformation?.returnTime ? ` at ${selectedLead.payload.journeyInformation.returnTime}` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Route */}
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: 12 }}>
                  <MapPin size={14} color="var(--adm-accent)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ width: '100%' }}>
                    <div style={{ color: 'var(--adm-text-2)' }}>
                      <strong style={{ color: 'var(--adm-text-1)' }}>From:</strong> {selectedLead.origin || 'Lagos'}
                    </div>

                    {Array.isArray(selectedLead.payload?.journeyInformation?.stops) && selectedLead.payload.journeyInformation.stops.length > 0 && (
                      <div style={{ margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {selectedLead.payload.journeyInformation.stops.map((stop: any, idx: number) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--adm-text-2)' }}>
                            <span style={{ background: 'rgba(26, 31, 168, 0.08)', color: 'var(--adm-accent)', padding: '1px 6px', borderRadius: 10, fontWeight: 700, fontSize: 10, flexShrink: 0 }}>
                              Stop {idx + 1}
                            </span>
                            <span style={{ wordBreak: 'break-word' }}>
                              {stop?.displayName || stop?.address || (typeof stop === 'string' ? stop : `Intermediate Stop ${idx + 1}`)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ color: 'var(--adm-text-2)', marginTop: 2 }}>
                      <strong style={{ color: 'var(--adm-text-1)' }}>To:</strong> {selectedLead.destination || 'Lagos'}
                    </div>
                    {distanceKm > 0 && (
                      <div style={{ color: 'var(--adm-text-2)', marginTop: 4 }}>
                        <strong style={{ color: 'var(--adm-text-1)' }}>Distance:</strong> {Math.round(distanceKm)} km
                      </div>
                    )}
                    {retentionDays > 0 && (
                      <div style={{ color: 'var(--adm-accent)', marginTop: 4, fontWeight: 600 }}>
                        Retention: {retentionDays} day(s) retained ({vehicleMobility === 'moving' ? 'Moving' : 'Parked'})
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Retention & Route Cost Breakdown Card */}
            {(retentionDays > 0 || retentionFee > 0 || retentionPreference || distanceKm > 0) && (
              <div
                style={{
                  background: 'var(--adm-surface-2)',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--adm-radius-sm)',
                  border: '1px solid var(--adm-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--adm-border)', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--adm-accent)', letterSpacing: '0.05em' }}>
                    <ShieldCheck size={14} />
                    <span>Cost Breakdown & Vehicle Retention Details</span>
                  </div>
                  {distanceKm > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--adm-text-1)', background: 'rgba(10, 48, 65, 0.08)', padding: '2px 8px', borderRadius: 4 }}>
                      Route Distance: <strong>{Math.round(distanceKm)} km</strong>
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: 12 }}>
                  {/* Base Fleet Charter */}
                  <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--adm-border)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ fontSize: 10.5, color: 'var(--adm-text-3)', textTransform: 'uppercase', fontWeight: 700 }}>Base Fleet Charter</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--adm-text-1)' }}>
                      {fmtCurrency(baseFleetCharter)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--adm-text-2)' }}>
                      Transit, fuel, driver salary, maintenance & toll levies
                    </div>
                  </div>

                  {/* Retention Surcharge */}
                  <div style={{ background: retentionFee > 0 ? 'rgba(239, 68, 68, 0.04)' : '#ffffff', padding: '0.75rem', borderRadius: 4, border: retentionFee > 0 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid var(--adm-border)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ fontSize: 10.5, color: retentionFee > 0 ? 'var(--adm-accent)' : 'var(--adm-text-3)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Vehicle Retention Surcharge
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: retentionFee > 0 ? 'var(--adm-accent)' : 'var(--adm-text-1)' }}>
                      {retentionFee > 0 ? fmtCurrency(retentionFee) : '₦0 (Not Retained)'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--adm-text-2)' }}>
                      {retentionDays > 0 ? (
                        <span>
                          <strong>{retentionDays} day(s)</strong> retained &bull; {vehicleMobility === 'moving' ? 'Moving / Logistics' : 'Parked on Site'}
                          {retentionRate > 0 && ` (@ ${fmtCurrency(retentionRate)}/day)`}
                        </span>
                      ) : retentionPreference === 'return' ? (
                        <span>Vehicle released after drop-off (Return Option)</span>
                      ) : (
                        <span>Standard drop-off / direct transit</span>
                      )}
                    </div>
                  </div>

                  {/* Total Opportunity Value */}
                  <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--adm-border)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ fontSize: 10.5, color: 'var(--adm-text-3)', textTransform: 'uppercase', fontWeight: 700 }}>Total Quotation Settlement</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--adm-text-1)' }}>
                      {fmtCurrency(totalInvestment)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--adm-success)', fontWeight: 600 }}>
                      Base Charter + Retention Surcharge
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sharable Payment Link Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(26, 31, 168, 0.04) 0%, rgba(13, 16, 96, 0.08) 100%)',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--adm-radius-sm)',
                border: '1px solid rgba(26, 31, 168, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.625rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--adm-accent)', letterSpacing: '0.05em' }}>
                  <CreditCard size={14} />
                  <span>Sharable Client Payment Link</span>
                </div>
                {linkCopied && <span style={{ fontSize: 11, color: 'var(--adm-success)', fontWeight: 600 }}>✓ Link Copied to Clipboard</span>}
              </div>

              <div className="admin-payment-link-row">
                <input
                  type="text"
                  readOnly
                  className="admin-input"
                  value={`${window.location.origin}/pay/${selectedLead.leadReference || selectedLead.id}`}
                  style={{ background: '#ffffff', fontSize: 12, fontFamily: 'monospace', color: 'var(--adm-text-1)' }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  onClick={() => handleCopyPaymentLink(selectedLead.leadReference || selectedLead.id)}
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {linkCopied ? <Check size={13} color="var(--adm-success)" /> : <Copy size={13} />}
                  <span>{linkCopied ? 'Copied' : 'Copy Link'}</span>
                </button>
                <a
                  href={`/pay/${selectedLead.leadReference || selectedLead.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}
                  title="Open client payment checkout in new tab"
                >
                  <ExternalLink size={13} />
                  <span>Open</span>
                </a>
              </div>
            </div>

            {/* Sales Closer Notes & Follow-up Section */}
            <div
              style={{
                background: 'var(--adm-surface-2)',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--adm-radius-sm)',
                border: '1px solid var(--adm-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.625rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--adm-text-3)',
                  letterSpacing: '0.05em',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <FileText size={13} color="var(--adm-accent)" />
                  <span>Sales Closer Notes & Follow-up Remarks</span>
                </div>
                {noteSaved && <span style={{ color: 'var(--adm-success)', textTransform: 'none', fontWeight: 600 }}>✓ Note saved successfully</span>}
              </div>
              <textarea
                className="admin-textarea"
                rows={3}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add sales notes, call summaries, customer budget, objection handling, or follow-up schedule..."
                style={{ background: '#ffffff', fontSize: 13, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary admin-btn-sm"
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  style={{ fontSize: 12 }}
                >
                  {savingNote ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>

            {/* Pipeline Stage Updater */}
            <div style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="admin-label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Change Status:</span>
                <select
                  className="admin-select"
                  value={isLeadWon(selectedLead) ? 'Won & Paid' : (selectedLead.crmStatus || selectedLead.status)}
                  onChange={e => handleUpdateStatus(selectedLead.id, e.target.value)}
                  style={{ minWidth: 170 }}
                >
                  {CRM_STATUS_OPTIONS.map(val => (
                    <option key={val} value={val}>{statusBadges[val]?.label || val}</option>
                  ))}
                </select>
              </div>

              {canAssign && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="admin-label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Assign To:</span>
                  <select
                    className="admin-select"
                    value={selectedLead.assignedTo || ''}
                    onChange={e => handleUpdateAssignment(selectedLead.id, e.target.value)}
                    style={{ minWidth: 170 }}
                  >
                    <option value="">Unassigned</option>
                    <option value="auto">✨ Auto Assign (Round Robin)</option>
                    {users.filter(u => u.role === 'sales_closer').map(u => (
                      <option key={u.id} value={u.id}>{u.fullName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a
                  href={`mailto:${selectedLead.customerEmail}?subject=NETS Logistics Quote Reference ${selectedLead.leadReference}&body=Hello ${selectedLead.customerName},%0D%0A%0D%0AYour official quote (${selectedLead.leadReference}) is ready.%0D%0A%0D%0APlease review your journey details and complete payment securely via the link below:%0D%0A${window.location.origin}/pay/${selectedLead.leadReference || selectedLead.id}%0D%0A%0D%0ABest regards,%0D%0ANETS Dispatch Team`}
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                >
                  <Mail size={13} /> Email Client
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="admin-btn admin-btn-primary admin-btn-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    })()}
    </>
  )
}
