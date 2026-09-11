// ============================================================================
// NETS Admin — Quote Management
// ============================================================================
import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Filter,
  Check,
  X,
  RefreshCw,
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Copy,
  ExternalLink,
  CreditCard,
  Truck,
} from 'lucide-react'
import { useAdminStore, type AdminQuote } from '../store/useAdminStore'
import { adminService, type AdminLead } from '../services/adminService'
import { pdfService } from '../../services/pdfService'
import { emailService } from '../../services/emailService'

const fmtCurrency = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

const fmtDateShort = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

// ── Note Persistence Helpers ──────────────────────────────────────────
const NOTES_STORAGE_KEY = 'nets_quote_notes'

const getPersistedNotes = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const getPersistedNote = (refOrId?: string): string => {
  if (!refOrId) return ''
  const notes = getPersistedNotes()
  return notes[refOrId.toLowerCase()] || notes[refOrId] || ''
}

const saveLocalNote = (refOrId: string, text: string) => {
  if (!refOrId) return
  try {
    const notes = getPersistedNotes()
    notes[refOrId] = text
    notes[refOrId.toLowerCase()] = text
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
  } catch (err) {
    console.warn('Could not save note to localStorage', err)
  }
}

export const FLEET_OPTIONS = [
  { value: 'Toyota HiAce', label: 'Toyota HiAce (14 Seater)' },
  { value: 'Toyota Coaster', label: 'Toyota Coaster (30 Seater)' },
  { value: 'Executive SUV', label: 'Executive SUV (7 Seater)' },
  { value: 'Executive Sedan', label: 'Executive Sedan (3 Seater)' },
  { value: 'Toyota Sienna', label: 'Toyota Sienna (7 Seater)' },
]

const statusBadges: Record<string, { label: string; class: string }> = {
  new: { label: 'New Quote', class: 'admin-badge-accent' },
  reviewed: { label: 'Reviewed', class: 'admin-badge-yellow' },
  approved: { label: 'Approved', class: 'admin-badge-green' },
  rejected: { label: 'Rejected', class: 'admin-badge-red' },
  converted: { label: 'Converted to Booking', class: 'admin-badge-green' },
}

export function QuotesPage() {
  const { quotes, updateQuoteStatus, addQuoteNote, session } = useAdminStore()
  const [liveLeads, setLiveLeads] = useState<AdminLead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedQuote, setSelectedQuote] = useState<AdminQuote | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    vehicle: 'Toyota HiAce',
    additionalVehicles: [] as string[],
    passengerCount: 1,
    origin: '',
    destination: '',
    travelDate: '',
    tripType: 'Drop-Off',
    investment: 0,
    notes: '',
  })

  const handleAddAdditionalVehicle = () => {
    setCreateForm((prev) => ({
      ...prev,
      additionalVehicles: [...prev.additionalVehicles, 'Toyota HiAce'],
    }))
  }

  const handleUpdateAdditionalVehicle = (index: number, vehicle: string) => {
    setCreateForm((prev) => {
      const updated = [...prev.additionalVehicles]
      updated[index] = vehicle
      return { ...prev, additionalVehicles: updated }
    })
  }

  const handleRemoveAdditionalVehicle = (index: number) => {
    setCreateForm((prev) => ({
      ...prev,
      additionalVehicles: prev.additionalVehicles.filter((_, i) => i !== index),
    }))
  }

  const handleCopyPaymentLink = (reference: string) => {
    const url = `${window.location.origin}/pay/${reference}`
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2500)
  }

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [isDeleting, setIsDeleting] = useState(false)
  const isAdmin = session.user?.role === 'admin' || session.user?.role === 'super-admin'

  const loadQuotesAndLeads = () => {
    setLoading(true)
    adminService
      .getLeads()
      .then((list) => {
        setLiveLeads(list || [])
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadQuotesAndLeads()
  }, [])

  // Reset to page 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, pageSize])

  const userId = session.user?.id ?? 'usr-001'
  const userName = session.user?.fullName ?? 'Admin'

  // Combine live MySQL leads with store quotes without duplicating references
  const allQuotes: AdminQuote[] = useMemo(() => {
    const liveItems: AdminQuote[] = liveLeads.map((l) => {
      const journey = l.payload?.journeyInformation || {}
      const invest = l.payload?.estimatedInvestment || {}
      const additionalVehicles = Array.isArray(journey.additionalVehicles)
        ? journey.additionalVehicles.filter(Boolean)
        : []
      const passengerCount =
        Number(journey.passengerCount) || Number((l as any).passengerCount) || 1
      const vehicleName = invest.vehicleName || l.journeyType || 'Standard Vehicle'
      const persistedNote =
        l.notes ||
        getPersistedNote(l.leadReference) ||
        getPersistedNote(String(l.id)) ||
        ''

      return {
        id: String(l.id),
        reference: l.leadReference || `NETS-${l.id}`,
        customerName: l.customerName || 'Valued Customer',
        customerEmail: l.customerEmail || 'N/A',
        customerPhone: l.customerPhone || 'N/A',
        customerId: 'cust-gen',
        vehicleId: 'veh-gen',
        vehicleName,
        additionalVehicles,
        tripType: (journey.tripType || l.journeyType || 'Drop-Off') as any,
        pickup: l.origin || journey.pickupLocation || 'N/A',
        destination: l.destination || journey.destinationLocation || 'N/A',
        distanceKm: Number(journey.distanceKm || invest.distanceKm || 0),
        durationMins: Number(journey.durationMins || 0),
        travelDate: journey.travelDate || l.createdAt,
        passengerCount,
        estimatedInvestment: l.estimatedInvestmentMax || l.estimatedInvestmentMin || 0,
        status: (() => {
          const isWon =
            String(l.crmStatus).toLowerCase() === 'won & paid' ||
            String(l.crmStatus).toLowerCase() === 'won' ||
            String(l.crmStatus).toLowerCase() === 'converted' ||
            ['won', 'converted', 'paid', 'paid & confirmed'].includes(String(l.status).toLowerCase())
          if (isWon) return 'converted'
          if (l.status === 'pending') return 'new'
          return l.status
        })() as any,
        createdAt: l.createdAt,
        notes: persistedNote,
      }
    })

    const liveRefs = new Set(liveItems.map((item) => item.reference.toLowerCase()))
    const uniqueStoreQuotes = quotes
      .filter((q) => !liveRefs.has(q.reference.toLowerCase()))
      .map((q) => ({
        ...q,
        notes: q.notes || getPersistedNote(q.reference) || getPersistedNote(q.id) || '',
      }))
    return [...liveItems, ...uniqueStoreQuotes]
  }, [liveLeads, quotes])

  const filteredQuotes = useMemo(() => {
    return allQuotes.filter((q) => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false
      if (search.trim()) {
        const q_ = search.toLowerCase()
        return (
          q.customerName.toLowerCase().includes(q_) ||
          q.customerEmail.toLowerCase().includes(q_) ||
          q.reference.toLowerCase().includes(q_) ||
          q.vehicleName.toLowerCase().includes(q_) ||
          q.pickup.toLowerCase().includes(q_) ||
          q.destination.toLowerCase().includes(q_)
        )
      }
      return true
    })
  }, [allQuotes, statusFilter, search])

  // Pagination calculations
  const totalItems = filteredQuotes.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)
  const paginatedQuotes = useMemo(() => {
    return filteredQuotes.slice(startIndex, endIndex)
  }, [filteredQuotes, startIndex, endIndex])

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

  // KPI Metrics
  const totalValue = allQuotes.reduce((acc, q) => acc + (Number(q.estimatedInvestment) || 0), 0)
  const wonCount = allQuotes.filter((q) => {
    const st = String(q.status).toLowerCase()
    return st === 'converted' || st === 'won' || st === 'approved' || st.includes('paid')
  }).length
  const winRate = allQuotes.length > 0 ? Math.round((wonCount / allQuotes.length) * 100) : 0
  const pendingCount = allQuotes.filter((q) => {
    const st = String(q.status).toLowerCase()
    return st === 'new' || st === 'pending' || st === 'reviewed'
  }).length

  const handleUpdateStatus = (id: string, newStatus: string) => {
    updateQuoteStatus(id, newStatus as any, userId, userName)
    adminService.updateLeadStatus(id, newStatus)
    const isWon = newStatus === 'converted' || newStatus === 'won' || newStatus === 'approved'
    if (isWon) {
      adminService.updateCrmStatus(id, 'Won & Paid')
    }
    setSelectedQuote((prev) => (prev && prev.id === id ? { ...prev, status: newStatus as any } : prev))
    setLiveLeads((prev) =>
      prev.map((l) =>
        String(l.id) === id
          ? {
              ...l,
              status: newStatus,
              ...(isWon ? { crmStatus: 'Won & Paid' } : {}),
            }
          : l
      )
    )
  }

  const handleDeleteQuote = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this quote? This action cannot be undone.')) return
    setIsDeleting(true)
    const success = await adminService.deleteLead(id)
    if (success) {
      setLiveLeads((prev) => prev.filter((l) => String(l.id) !== id && l.leadReference !== id))
      setSelectedQuote(null)
    } else {
      alert('Failed to delete quote. Please try again.')
    }
    setIsDeleting(false)
  }

  const handleSaveNote = async () => {
    if (!selectedQuote) return
    const text = noteInput.trim()

    // 1. Save to localStorage immediately (guaranteed local persistence across refreshes)
    saveLocalNote(selectedQuote.id, text)
    if (selectedQuote.reference) {
      saveLocalNote(selectedQuote.reference, text)
    }

    // 2. Update liveLeads state so allQuotes and table update immediately
    setLiveLeads((prev) =>
      prev.map((l) =>
        String(l.id) === selectedQuote.id ||
        (l.leadReference && selectedQuote.reference && l.leadReference.toLowerCase() === selectedQuote.reference.toLowerCase())
          ? { ...l, notes: text }
          : l
      )
    )

    // 3. Update selectedQuote in modal/drawer
    setSelectedQuote((prev) => (prev ? { ...prev, notes: text } : null))

    // 4. Update Zustand store
    addQuoteNote(selectedQuote.id, text)
    if (selectedQuote.reference) {
      addQuoteNote(selectedQuote.reference, text)
    }

    setNoteSaved(true)

    // 5. Sync with backend API
    try {
      const ok = await adminService.updateLeadNotes(selectedQuote.id, text)
      if (!ok && selectedQuote.reference && selectedQuote.reference !== selectedQuote.id) {
        await adminService.updateLeadNotes(selectedQuote.reference, text)
      }
    } catch (err) {
      console.warn('Backend note save warning:', err)
    }

    setTimeout(() => setNoteSaved(false), 2500)
  }

  const handleExportPDF = (q: AdminQuote) => {
    pdfService.generateQuotationPDF({
      leadMetadata: { quoteReferenceNumber: q.reference },
      customerInformation: { name: q.customerName, email: q.customerEmail, phone: q.customerPhone },
      journeyInformation: {
        journeyType: q.tripType || q.vehicleName,
        distanceKm: q.distanceKm,
        passengerCount: q.passengerCount,
        origin: q.pickup,
        destination: q.destination,
      },
      estimatedInvestment: {
        vehicleName: q.vehicleName,
        minimumEstimate: q.estimatedInvestment,
        maximumEstimate: q.estimatedInvestment,
        total: q.estimatedInvestment,
      },
    })
  }

  const handleEmailCustomer = async (q: AdminQuote) => {
    const ok = await emailService.sendConfirmationEmail({
      leadMetadata: { quoteReferenceNumber: q.reference },
      customerInformation: { name: q.customerName, email: q.customerEmail, phone: q.customerPhone },
      journeyInformation: { 
        journeyType: q.tripType || q.vehicleName,
        pickup: q.pickup,
        destination: q.destination,
        travelDate: q.travelDate,
        tripType: q.tripType || 'Drop-Off',
      },
      estimatedInvestment: { 
        total: q.estimatedInvestment,
        vehicleName: q.vehicleName,
      },
    })
    if (ok) {
      alert(`Quotation and payment link successfully sent to ${q.customerEmail}`)
    } else {
      alert(`Quotation email triggered for ${q.customerEmail}`)
    }
  }

  const handleRowClick = (q: AdminQuote) => {
    setSelectedQuote(q)
    const existing = q.notes || getPersistedNote(q.reference) || getPersistedNote(q.id) || ''
    setNoteInput(existing)
    setNoteSaved(false)
  }

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const quoteRef = `NETS-${Date.now().toString().slice(-6)}`
    const initialNote = createForm.notes.trim()

    const quotePayload = {
      leadReference: quoteRef,
      customerName: createForm.name,
      customerEmail: createForm.email,
      customerPhone: createForm.phone,
      notes: initialNote,
      customerInformation: {
        name: createForm.name,
        email: createForm.email,
        phone: createForm.phone,
      },
      journeyInformation: {
        journeyType: 'Standard Charter',
        tripType: createForm.tripType || 'Drop-Off',
        pickupLocation: createForm.origin,
        pickup: createForm.origin,
        destinationLocation: createForm.destination,
        destination: createForm.destination,
        travelDate: createForm.travelDate || new Date().toISOString(),
        passengerCount: Number(createForm.passengerCount) || 1,
        additionalVehicles: createForm.additionalVehicles,
      },
      estimatedInvestment: {
        vehicleName: createForm.vehicle || 'Toyota HiAce',
        minimumEstimate: createForm.investment,
        maximumEstimate: createForm.investment,
        total: createForm.investment,
      },
      leadMetadata: {
        quoteReferenceNumber: quoteRef,
      },
    }

    if (initialNote) {
      saveLocalNote(quoteRef, initialNote)
    }

    const ok = await adminService.createLead(quotePayload)

    // Automatically send quotation email with sharable payment link to client
    if (createForm.email) {
      await emailService.sendConfirmationEmail(quotePayload)
    }

    if (ok) {
      setShowCreateModal(false)
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        vehicle: 'Toyota HiAce',
        additionalVehicles: [],
        passengerCount: 1,
        origin: '',
        destination: '',
        travelDate: '',
        tripType: 'Drop-Off',
        investment: 0,
        notes: '',
      })
      loadQuotesAndLeads()
      alert(`Quote ${quoteRef} created and sent to ${createForm.email} with payment link!`)
    } else {
      setLoading(false)
      alert("Failed to create quote. Please try again.")
    }
  }

  return (
    <>
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <div className="admin-page-title">Quote Management</div>
          <div className="admin-page-desc">
            Track customer quote requests, review pricing estimates, generate PDFs, and convert quotes to bookings.
          </div>
        </div>
        <div className="admin-page-actions">
          <button
            onClick={loadQuotesAndLeads}
            disabled={loading}
            className="admin-btn admin-btn-ghost admin-btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Refreshing…' : 'Refresh Quotes'}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="admin-btn admin-btn-primary admin-btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Plus size={13} />
            Create Quote
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="admin-stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-stat-card" style={{ borderTop: '2px solid var(--adm-accent)' }}>
          <div className="admin-stat-label">Total Quotes Captured</div>
          <div className="admin-stat-value">{allQuotes.length}</div>
          <div className="admin-stat-sub">From journey planner & direct inquiries</div>
        </div>

        <div className="admin-stat-card" style={{ borderTop: '2px solid var(--adm-warning)' }}>
          <div className="admin-stat-label">Awaiting Review</div>
          <div className="admin-stat-value">{pendingCount}</div>
          <div className="admin-stat-sub">New & pending submissions</div>
        </div>

        <div className="admin-stat-card" style={{ borderTop: '2px solid var(--adm-success)' }}>
          <div className="admin-stat-label">Approved & Converted</div>
          <div className="admin-stat-value">
            {wonCount}{' '}
            <span style={{ fontSize: 13, color: 'var(--adm-text-3)', fontWeight: 400 }}>({winRate}%)</span>
          </div>
          <div className="admin-stat-sub">Confirmed & active bookings</div>
        </div>

        <div className="admin-stat-card" style={{ borderTop: '2px solid var(--adm-accent)' }}>
          <div className="admin-stat-label">Pipeline Quote Value</div>
          <div className="admin-stat-value" style={{ fontSize: '1.25rem' }}>
            {fmtCurrency(totalValue)}
          </div>
          <div className="admin-stat-sub admin-stat-trend-up">Estimated total opportunity</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-toolbar-search">
          <Search size={13} color="var(--adm-text-3)" />
          <input
            placeholder="Search by reference, customer, vehicle, route…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {['all', 'new', 'reviewed', 'approved', 'converted', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`admin-btn admin-btn-sm ${statusFilter === st ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
            >
              {st === 'all' ? 'All Quotes' : (statusBadges[st]?.label || st.charAt(0).toUpperCase() + st.slice(1))}
            </button>
          ))}
        </div>
      </div>

      {/* Quotes Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Vehicle / Service</th>
                <th>Route</th>
                <th>Estimated Investment</th>
                <th>Date Received</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="admin-table-empty">
                    Loading quotes…
                  </td>
                </tr>
              ) : paginatedQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="admin-table-empty">
                    No quotes found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedQuotes.map((q) => {
                  const badge = statusBadges[q.status] || { label: q.status, class: 'admin-badge-gray' }
                  return (
                    <tr
                      key={q.id || q.reference}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleRowClick(q)}
                    >
                      <td>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 11,
                            color: 'var(--adm-text-2)',
                            fontWeight: 600,
                          }}
                        >
                          {q.reference}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{q.customerName}</div>
                        <div style={{ fontSize: 11, color: 'var(--adm-text-3)' }}>{q.customerEmail}</div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--adm-text-2)' }}>
                        <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                          <span>{q.vehicleName}</span>
                          {q.additionalVehicles && q.additionalVehicles.length > 0 && (
                            <span
                              style={{
                                background: 'rgba(26, 31, 168, 0.08)',
                                color: 'var(--adm-accent)',
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: 3,
                                whiteSpace: 'nowrap',
                              }}
                              title={`Additional Fleet: ${q.additionalVehicles.join(', ')}`}
                            >
                              +{q.additionalVehicles.length} fleet
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--adm-text-3)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <span>{q.tripType}</span>
                          {q.passengerCount > 0 && (
                            <span>• {q.passengerCount} pax</span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: 12, maxWidth: 180 }}>
                        <div style={{ color: 'var(--adm-text-1)' }}>{q.pickup.split(',')[0]}</div>
                        <div style={{ fontSize: 11, color: 'var(--adm-text-3)' }}>
                          → {q.destination.split(',')[0]}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--adm-text-1)' }}>
                        {q.estimatedInvestment > 0 ? fmtCurrency(q.estimatedInvestment) : '₦---,---'}
                      </td>
                      <td style={{ fontSize: 12 }}>{fmtDateShort(q.createdAt || q.travelDate)}</td>
                      <td>
                        <span className={`admin-badge ${badge.class}`}>{badge.label}</span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          {q.status === 'new' && (
                            <>
                              <button
                                className="admin-btn admin-btn-sm admin-btn-ghost"
                                title="Approve Quote"
                                onClick={() => handleUpdateStatus(q.id, 'approved')}
                              >
                                <Check size={12} />
                              </button>
                              <button
                                className="admin-btn admin-btn-sm admin-btn-danger"
                                title="Reject Quote"
                                onClick={() => handleUpdateStatus(q.id, 'rejected')}
                              >
                                <X size={12} />
                              </button>
                            </>
                          )}
                          {q.status === 'approved' && (
                            <button
                              className="admin-btn admin-btn-sm admin-btn-primary"
                              title="Convert to Active Booking"
                              onClick={() => handleUpdateStatus(q.id, 'converted')}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '0.25rem 0.5rem' }}
                            >
                              <RefreshCw size={11} /> Convert
                            </button>
                          )}
                          <button
                            className="admin-btn admin-btn-sm admin-btn-secondary"
                            title="Copy Client Payment Link"
                            onClick={() => handleCopyPaymentLink(q.reference || q.id)}
                            style={{ fontSize: 11, padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: 3 }}
                          >
                            <CreditCard size={11} /> Pay Link
                          </button>
                          <button
                            className="admin-btn admin-btn-sm admin-btn-ghost"
                            title="View Quote Details"
                            onClick={() => handleRowClick(q)}
                            style={{ fontSize: 11, padding: '0.25rem 0.5rem' }}
                          >
                            Details
                          </button>
                        </div>
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
          <div
            style={{
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
              color: 'var(--adm-text-2)',
            }}
          >
            {/* Range Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>
                Showing <strong style={{ color: 'var(--adm-text-1)' }}>{startIndex + 1}</strong>–
                <strong style={{ color: 'var(--adm-text-1)' }}>{endIndex}</strong> of{' '}
                <strong style={{ color: 'var(--adm-text-1)' }}>{totalItems}</strong> quotes
              </span>
            </div>

            {/* Controls & Page size */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Page Size Select */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--adm-radius-sm)',
                    border: '1px solid var(--adm-border)',
                    background: 'var(--adm-surface-2)',
                    color: 'var(--adm-text-1)',
                    fontSize: 12,
                    cursor: 'pointer',
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
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  style={{ padding: '0.35rem 0.5rem', opacity: safePage <= 1 ? 0.4 : 1 }}
                  title="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>

                {pageNumbers.map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`admin-btn admin-btn-sm ${safePage === p ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
                    style={{
                      minWidth: 28,
                      height: 28,
                      padding: 0,
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: safePage === p ? 700 : 500,
                    }}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      {/* ── Floating Quote Details Modal (Identical in style to Lead Detail Modal) ── */}
      {selectedQuote && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedQuote(null)
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
              position: 'relative',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid var(--adm-border)',
                paddingBottom: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--adm-accent)',
                      background: 'rgba(239, 68, 68, 0.1)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 4,
                    }}
                  >
                    {selectedQuote.reference}
                  </span>
                  <span
                    className={`admin-badge ${(statusBadges[selectedQuote.status] || { class: 'admin-badge-gray' }).class}`}
                  >
                    {(statusBadges[selectedQuote.status] || { label: selectedQuote.status }).label}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--adm-text-1)' }}>
                  {selectedQuote.customerName}
                </h3>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {isAdmin && (
                  <button
                    className="admin-btn admin-btn-danger admin-btn-sm"
                    onClick={() => handleDeleteQuote(selectedQuote.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
                <button
                  className="admin-btn admin-btn-icon admin-btn-ghost"
                  onClick={() => setSelectedQuote(null)}
                  style={{ borderRadius: '50%', width: 32, height: 32 }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Estimated Quote Value Banner */}
            <div
              style={{
                background: 'var(--adm-surface-2)',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--adm-radius-sm)',
                border: '1px solid var(--adm-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    color: 'var(--adm-text-3)',
                    letterSpacing: '0.05em',
                  }}
                >
                  Estimated Investment / Quote Value
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--adm-accent)', marginTop: 2 }}>
                  {fmtCurrency(selectedQuote.estimatedInvestment)}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--adm-text-2)', textAlign: 'right' }}>
                <div>
                  <strong style={{ color: 'var(--adm-text-1)' }}>Date Received:</strong>{' '}
                  {fmtDateShort(selectedQuote.createdAt || selectedQuote.travelDate)}
                </div>
                {selectedQuote.travelDate && selectedQuote.travelDate !== selectedQuote.createdAt && (
                  <div style={{ marginTop: 2 }}>
                    <strong style={{ color: 'var(--adm-text-1)' }}>Travel Date:</strong>{' '}
                    {fmtDateShort(selectedQuote.travelDate)}
                  </div>
                )}
              </div>
            </div>

            {/* 2-Column Details Grid */}
            <div className="admin-grid-2" style={{ gap: '1.25rem' }}>
              {/* Customer Info Card */}
              <div
                style={{
                  background: 'var(--adm-surface-2)',
                  padding: '1rem',
                  borderRadius: 'var(--adm-radius-sm)',
                  border: '1px solid var(--adm-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.625rem',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--adm-text-3)',
                    letterSpacing: '0.05em',
                    marginBottom: 2,
                  }}
                >
                  Client Profile
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 13 }}>
                  <Users size={14} color="var(--adm-accent)" />
                  <span style={{ fontWeight: 600, color: 'var(--adm-text-1)' }}>{selectedQuote.customerName}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: 12,
                    color: 'var(--adm-text-2)',
                  }}
                >
                  <Mail size={14} />
                  <a
                    href={`mailto:${selectedQuote.customerEmail}`}
                    style={{ color: 'var(--adm-text-2)', textDecoration: 'none' }}
                  >
                    {selectedQuote.customerEmail}
                  </a>
                </div>
                {selectedQuote.customerPhone && selectedQuote.customerPhone !== 'N/A' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: 12,
                      color: 'var(--adm-text-2)',
                    }}
                  >
                    <Phone size={14} />
                    <a
                      href={`tel:${selectedQuote.customerPhone}`}
                      style={{ color: 'var(--adm-text-2)', textDecoration: 'none' }}
                    >
                      {selectedQuote.customerPhone}
                    </a>
                  </div>
                )}
                {selectedQuote.customerId && (
                  <div style={{ fontSize: 12, color: 'var(--adm-text-2)', marginTop: 2 }}>
                    <strong style={{ color: 'var(--adm-text-3)' }}>Account Ref:</strong> {selectedQuote.customerId}
                  </div>
                )}
              </div>

              {/* Journey Details Card */}
              <div
                style={{
                  background: 'var(--adm-surface-2)',
                  padding: '1rem',
                  borderRadius: 'var(--adm-radius-sm)',
                  border: '1px solid var(--adm-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.625rem',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--adm-text-3)',
                    letterSpacing: '0.05em',
                    marginBottom: 2,
                  }}
                >
                  Journey & Vehicle
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--adm-text-1)' }}>
                  {selectedQuote.vehicleName}
                  {selectedQuote.tripType && selectedQuote.tripType !== selectedQuote.vehicleName && (
                    <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--adm-text-3)', marginLeft: 6 }}>
                      • {selectedQuote.tripType}
                    </span>
                  )}
                </div>

                {selectedQuote.additionalVehicles && selectedQuote.additionalVehicles.length > 0 && (
                  <div style={{ marginTop: 2, display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--adm-text-3)', fontWeight: 600 }}>Additional Fleet:</span>
                    {selectedQuote.additionalVehicles.map((v, i) => (
                      <span key={i} style={{ background: 'rgba(26, 31, 168, 0.08)', color: 'var(--adm-accent)', padding: '1px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>
                        + {v}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', fontSize: 12 }}>
                  <Calendar size={14} color="var(--adm-accent)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ color: 'var(--adm-text-2)' }}>
                    <strong style={{ color: 'var(--adm-text-1)' }}>Travel Date & Time:</strong>{' '}
                    {selectedQuote.travelDate ? fmtDate(selectedQuote.travelDate) : 'Flexible'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', fontSize: 12 }}>
                  <MapPin size={14} color="var(--adm-accent)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ color: 'var(--adm-text-2)' }}>
                      <strong style={{ color: 'var(--adm-text-1)' }}>From:</strong> {selectedQuote.pickup || 'Lagos'}
                    </div>
                    <div style={{ color: 'var(--adm-text-2)', marginTop: 4 }}>
                      <strong style={{ color: 'var(--adm-text-1)' }}>To:</strong>{' '}
                      {selectedQuote.destination || 'Lagos'}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: 11,
                    color: 'var(--adm-text-3)',
                    marginTop: 4,
                    flexWrap: 'wrap',
                  }}
                >
                  {selectedQuote.passengerCount > 0 && (
                    <span>
                      <strong style={{ color: 'var(--adm-text-2)' }}>{selectedQuote.passengerCount}</strong> Passengers
                    </span>
                  )}
                  {selectedQuote.distanceKm > 0 && (
                    <span>
                      • <strong style={{ color: 'var(--adm-text-2)' }}>{selectedQuote.distanceKm}</strong> km
                    </span>
                  )}
                  {selectedQuote.durationMins > 0 && (
                    <span>
                      • <strong style={{ color: 'var(--adm-text-2)' }}>{selectedQuote.durationMins}</strong> mins
                    </span>
                  )}
                </div>
              </div>
            </div>

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
                  value={`${window.location.origin}/pay/${selectedQuote.reference || selectedQuote.id}`}
                  style={{ background: '#ffffff', fontSize: 12, fontFamily: 'monospace', color: 'var(--adm-text-1)' }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  onClick={() => handleCopyPaymentLink(selectedQuote.reference || selectedQuote.id)}
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {linkCopied ? <Check size={13} color="var(--adm-success)" /> : <Copy size={13} />}
                  <span>{linkCopied ? 'Copied' : 'Copy Link'}</span>
                </button>
                <a
                  href={`/pay/${selectedQuote.reference || selectedQuote.id}`}
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

            {/* Internal Notes Section */}
            <div
              style={{
                background: 'var(--adm-surface-2)',
                padding: '1rem',
                borderRadius: 'var(--adm-radius-sm)',
                border: '1px solid var(--adm-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
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
                <span>Internal Notes & Remarks</span>
                {noteSaved && <span style={{ color: 'var(--adm-success)', textTransform: 'none' }}>✓ Saved</span>}
              </div>
              <textarea
                className="admin-textarea"
                rows={2}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add internal notes for dispatch, special instructions, pricing considerations…"
                style={{ background: '#ffffff' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  onClick={handleSaveNote}
                  style={{ fontSize: 12 }}
                >
                  Save Note
                </button>
              </div>
            </div>

            {/* Pipeline Stage Updater & Action Footer */}
            <div
              style={{
                borderTop: '1px solid var(--adm-border)',
                paddingTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="admin-label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>
                  Change Status:
                </span>
                <select
                  className="admin-select"
                  value={selectedQuote.status}
                  onChange={(e) => handleUpdateStatus(selectedQuote.id, e.target.value)}
                  style={{ minWidth: 170 }}
                >
                  {Object.entries(statusBadges).map(([val, info]) => (
                    <option key={val} value={val}>
                      {info.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selectedQuote.status === 'new' && (
                  <>
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary admin-btn-sm"
                      onClick={() => handleUpdateStatus(selectedQuote.id, 'approved')}
                    >
                      <Check size={13} /> Approve
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger admin-btn-sm"
                      onClick={() => handleUpdateStatus(selectedQuote.id, 'rejected')}
                    >
                      <X size={13} /> Reject
                    </button>
                  </>
                )}

                {selectedQuote.status === 'approved' && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary admin-btn-sm"
                    onClick={() => handleUpdateStatus(selectedQuote.id, 'converted')}
                  >
                    <RefreshCw size={13} /> Convert to Booking
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleExportPDF(selectedQuote)}
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  title="Export official quote PDF"
                >
                  <FileText size={13} /> Export PDF
                </button>

                <button
                  type="button"
                  onClick={() => handleEmailCustomer(selectedQuote)}
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  title="Send quotation email to client"
                >
                  <Mail size={13} /> Email Client
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedQuote(null)}
                  className="admin-btn admin-btn-primary admin-btn-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Quote Modal ── */}
      {showCreateModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false)
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
            style={{
              background: '#ffffff',
              border: '1px solid var(--adm-border)',
              borderRadius: 'var(--adm-radius)',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.4)',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--adm-text-1)' }}>Create Quote</h3>
              <button className="admin-btn admin-btn-icon admin-btn-ghost" onClick={() => setShowCreateModal(false)} style={{ width: 32, height: 32, borderRadius: '50%' }}>
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleCreateQuote} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="admin-grid-2">
                <div className="admin-form-group">
                  <label className="admin-label">Customer Name</label>
                  <input required className="admin-input" value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Email Address</label>
                  <input required type="email" className="admin-input" value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})} />
                </div>
              </div>
              
              <div className="admin-grid-2">
                <div className="admin-form-group">
                  <label className="admin-label">Phone Number</label>
                  <input className="admin-input" value={createForm.phone} onChange={e => setCreateForm({...createForm, phone: e.target.value})} />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Estimated Price (₦)</label>
                  <input required type="number" className="admin-input" value={createForm.investment || ''} onChange={e => setCreateForm({...createForm, investment: Number(e.target.value)})} />
                </div>
              </div>

              <div className="admin-grid-2">
                <div className="admin-form-group">
                  <label className="admin-label">Pickup Location</label>
                  <input required className="admin-input" value={createForm.origin} onChange={e => setCreateForm({...createForm, origin: e.target.value})} />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Destination</label>
                  <input required className="admin-input" value={createForm.destination} onChange={e => setCreateForm({...createForm, destination: e.target.value})} />
                </div>
              </div>

              <div className="admin-grid-2">
                <div className="admin-form-group">
                  <label className="admin-label">Primary Vehicle</label>
                  <select
                    className="admin-select"
                    value={createForm.vehicle}
                    onChange={e => setCreateForm({...createForm, vehicle: e.target.value})}
                  >
                    {FLEET_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Trip Type</label>
                  <select
                    className="admin-select"
                    value={createForm.tripType}
                    onChange={e => setCreateForm({...createForm, tripType: e.target.value})}
                  >
                    <option value="Drop-Off">Drop-Off</option>
                    <option value="To & Fro">To & Fro</option>
                    <option value="Multi-Day">Multi-Day</option>
                  </select>
                </div>
              </div>

              <div className="admin-grid-2">
                <div className="admin-form-group">
                  <label className="admin-label">Passenger Count</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    required
                    className="admin-input"
                    value={createForm.passengerCount || ''}
                    onChange={e => setCreateForm({ ...createForm, passengerCount: Math.max(1, parseInt(e.target.value) || 1) })}
                    placeholder="e.g. 14"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Travel Date & Time</label>
                  <input
                    type="datetime-local"
                    className="admin-input"
                    value={createForm.travelDate}
                    onChange={e => setCreateForm({...createForm, travelDate: e.target.value})}
                  />
                </div>
              </div>

              {/* Additional Fleet Support */}
              <div className="admin-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                  <label className="admin-label" style={{ marginBottom: 0 }}>
                    Additional Fleet Support (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddAdditionalVehicle}
                    className="admin-btn admin-btn-ghost admin-btn-xs"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--adm-accent)', fontSize: 11, fontWeight: 600 }}
                  >
                    <Plus size={12} /> Add Vehicle
                  </button>
                </div>

                {createForm.additionalVehicles.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--adm-text-3)', fontStyle: 'italic', background: 'var(--adm-surface-2)', padding: '0.5rem 0.75rem', borderRadius: 'var(--adm-radius-sm)', border: '1px dashed var(--adm-border)' }}>
                    No additional vehicles attached. Click "+ Add Vehicle" for convoys, escorts, or multi-vehicle bookings.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {createForm.additionalVehicles.map((v, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                          className="admin-select"
                          style={{ flex: 1 }}
                          value={v}
                          onChange={(e) => handleUpdateAdditionalVehicle(idx, e.target.value)}
                        >
                          {FLEET_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="admin-btn admin-btn-ghost admin-btn-xs"
                          onClick={() => handleRemoveAdditionalVehicle(idx)}
                          style={{ color: 'var(--adm-danger)', padding: '0.375rem', borderRadius: '4px' }}
                          title="Remove vehicle"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Initial Internal Notes */}
              <div className="admin-form-group">
                <label className="admin-label">Internal Notes / Remarks (Optional)</label>
                <textarea
                  className="admin-textarea"
                  rows={2}
                  value={createForm.notes}
                  onChange={e => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Add internal notes for dispatch, special instructions, pricing considerations…"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--adm-border)' }}>
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" disabled={loading} className="admin-btn admin-btn-primary">{loading ? 'Creating...' : 'Create Quote'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
