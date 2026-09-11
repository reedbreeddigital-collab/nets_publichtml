// ============================================================================
// NETS Admin — Booking Management
// ============================================================================
import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Plus,
  X,
  RefreshCw,
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  Car,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Save,
  CheckCircle2,
  Clock,
  CreditCard,
  UserCheck,
  Trash2,
  Edit2,
} from 'lucide-react'
import { useAdminStore, type AdminBooking } from '../store/useAdminStore'
import { adminService, type AdminBookingDB } from '../services/adminService'
import { emailService } from '../../services/emailService'
import { pdfService } from '../../services/pdfService'

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

const opsBadges: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pending Dispatch', class: 'admin-badge-yellow' },
  confirmed: { label: 'Confirmed', class: 'admin-badge-green' },
  dispatched: { label: 'Dispatched', class: 'admin-badge-accent' },
  completed: { label: 'Completed', class: 'admin-badge-gray' },
  cancelled: { label: 'Cancelled', class: 'admin-badge-red' },
}

const payBadges: Record<string, { label: string; class: string }> = {
  pending: { label: 'Payment Pending', class: 'admin-badge-yellow' },
  partial: { label: 'Partially Paid', class: 'admin-badge-yellow' },
  paid: { label: 'Paid & Confirmed', class: 'admin-badge-green' },
  invoiced: { label: 'Invoiced', class: 'admin-badge-accent' },
  overdue: { label: 'Overdue', class: 'admin-badge-red' },
}

export function BookingsPage() {
  const {
    session,
    vehicles,
    customers,
    drivers,
    bookings: storeBookings,
    deleteBooking,
    updateBooking,
    updateBookingStatus,
    updatePaymentStatus,
    addBookingNote,
    assignBookingDriver,
  } = useAdminStore()

  const isAdmin = session.user?.role === 'admin' || session.user?.role === 'super-admin'
  const [dbBookings, setDbBookings] = useState<AdminBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [opsFilter, setOpsFilter] = useState('all')
  const [payFilter, setPayFilter] = useState('all')
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null)
  const [editingBooking, setEditingBooking] = useState<AdminBooking | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadBookings = () => {
    setLoading(true)
    adminService
      .getBookings()
      .then((list) => {
        setDbBookings((list || []) as AdminBooking[])
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadBookings()
  }, [])

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, opsFilter, payFilter, pageSize])

  const userId = session.user?.id ?? 'usr-001'
  const userName = session.user?.fullName ?? 'Admin'

  // Combine DB bookings with store bookings without duplicates
  const allBookings: AdminBooking[] = useMemo(() => {
    const dbRefs = new Set(dbBookings.map((b) => b.reference.toLowerCase()))
    const uniqueStoreBookings = storeBookings.filter((b) => !dbRefs.has(b.reference.toLowerCase()))
    return [...dbBookings, ...uniqueStoreBookings]
  }, [dbBookings, storeBookings])

  const filteredBookings = useMemo(() => {
    return allBookings.filter((b) => {
      const name = String(b.customerName || '').toLowerCase()
      const ref = String(b.reference || '').toLowerCase()
      const quoteRef = String(b.quoteReference || '').toLowerCase()
      const vehicle = String(b.vehicleName || '').toLowerCase()
      const driver = String(b.driverName || '').toLowerCase()
      const pickup = String(b.pickup || '').toLowerCase()
      const dest = String(b.destination || '').toLowerCase()
      const term = search.trim().toLowerCase()

      const matchSearch =
        !term ||
        name.includes(term) ||
        ref.includes(term) ||
        quoteRef.includes(term) ||
        vehicle.includes(term) ||
        driver.includes(term) ||
        pickup.includes(term) ||
        dest.includes(term)

      const matchOps = opsFilter === 'all' || b.operationalStatus === opsFilter
      const matchPay = payFilter === 'all' || b.paymentStatus === payFilter

      return matchSearch && matchOps && matchPay
    })
  }, [allBookings, search, opsFilter, payFilter])

  // Pagination calculations
  const totalItems = filteredBookings.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(totalItems, startIndex + pageSize)
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex)

  // KPI Metrics
  const totalRevenue = allBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0)
  const confirmedCount = allBookings.filter(
    (b) => b.operationalStatus === 'confirmed' || b.operationalStatus === 'dispatched'
  ).length
  const completedCount = allBookings.filter((b) => b.operationalStatus === 'completed').length
  const paidCount = allBookings.filter((b) => b.paymentStatus === 'paid').length

  // Generate page numbers
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

  const handleUpdateOpsStatus = async (id: string, operationalStatus: AdminBooking['operationalStatus']) => {
    updateBookingStatus(id, operationalStatus, userId, userName)
    await adminService.updateBooking(id, { operationalStatus })
    loadBookings()
    if (selectedBooking && selectedBooking.id === id) {
      setSelectedBooking((prev) => (prev ? { ...prev, operationalStatus } : null))
    }
  }

  const handleUpdatePayStatus = async (id: string, paymentStatus: AdminBooking['paymentStatus']) => {
    updatePaymentStatus(id, paymentStatus)
    await adminService.updateBooking(id, { paymentStatus })
    loadBookings()
    if (selectedBooking && selectedBooking.id === id) {
      setSelectedBooking((prev) => (prev ? { ...prev, paymentStatus } : null))
    }
  }

  const handleAssignDriver = async (id: string, driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId)
    const driverName = driver ? driver.name : null
    assignBookingDriver(id, driverId || null, driverName)
    await adminService.updateBooking(id, { driverId: driverId || undefined, driverName: driverName || undefined })
    loadBookings()
    if (selectedBooking && selectedBooking.id === id) {
      setSelectedBooking((prev) => (prev ? { ...prev, driverId: driverId || null, driverName } : null))
    }
  }

  const handleDeleteBooking = async (idOrRef: string) => {
    if (!window.confirm('Are you sure you want to delete this booking? This action cannot be undone.')) return
    setIsDeleting(true)
    try {
      const success = await adminService.deleteBooking(idOrRef)
      if (success) {
        deleteBooking(idOrRef)
        setDbBookings((prev) => prev.filter((b) => b.id !== idOrRef && b.reference !== idOrRef))
        if (selectedBooking && (selectedBooking.id === idOrRef || selectedBooking.reference === idOrRef)) {
          setSelectedBooking(null)
        }
      } else {
        alert('Failed to delete booking. Please try again.')
      }
    } catch (err) {
      console.error('⚠️ [ADMIN] Error deleting booking:', err)
      alert('Failed to delete booking. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSaveNote = () => {
    if (!selectedBooking) return
    addBookingNote(selectedBooking.id, noteInput)
    setSelectedBooking((prev) => (prev ? { ...prev, notes: noteInput } : null))
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2500)
  }

  const handleRowClick = (b: AdminBooking) => {
    setSelectedBooking(b)
    setNoteInput(b.notes || '')
    setNoteSaved(false)
  }

  // Lookup matched customer for extra profile details
  const matchedCustomer = useMemo(() => {
    if (!selectedBooking) return null
    return (
      customers.find(
        (c) =>
          c.id === selectedBooking.customerId ||
          c.fullName.toLowerCase() === selectedBooking.customerName.toLowerCase()
      ) || null
    )
  }, [selectedBooking, customers])

  return (
    <>
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <div className="admin-page-title">Booking Management</div>
          <div className="admin-page-desc">
            Track active charters, vehicle dispatches, customer profiles, driver allocations, and payment settlements.
          </div>
        </div>
        <div className="admin-page-actions" style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={loadBookings}
            disabled={loading}
            className="admin-btn admin-btn-ghost admin-btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            className="admin-btn admin-btn-primary"
            onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Plus size={14} /> Create Booking
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="admin-stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-stat-card" style={{ borderTop: '2px solid var(--adm-accent)' }}>
          <div className="admin-stat-label">Total Bookings</div>
          <div className="admin-stat-value">{allBookings.length}</div>
          <div className="admin-stat-sub">Confirmed & scheduled journeys</div>
        </div>

        <div className="admin-stat-card" style={{ borderTop: '2px solid var(--adm-warning)' }}>
          <div className="admin-stat-label">Confirmed & Dispatched</div>
          <div className="admin-stat-value">{confirmedCount}</div>
          <div className="admin-stat-sub">Active fleet in operation</div>
        </div>

        <div className="admin-stat-card" style={{ borderTop: '2px solid var(--adm-success)' }}>
          <div className="admin-stat-label">Fully Settled & Paid</div>
          <div className="admin-stat-value">
            {paidCount}{' '}
            <span style={{ fontSize: 13, color: 'var(--adm-text-3)', fontWeight: 400 }}>
              ({allBookings.length > 0 ? Math.round((paidCount / allBookings.length) * 100) : 0}%)
            </span>
          </div>
          <div className="admin-stat-sub">Completed transactions</div>
        </div>

        <div className="admin-stat-card" style={{ borderTop: '2px solid var(--adm-accent)' }}>
          <div className="admin-stat-label">Total Bookings Value</div>
          <div className="admin-stat-value" style={{ fontSize: '1.25rem' }}>
            {fmtCurrency(totalRevenue)}
          </div>
          <div className="admin-stat-sub admin-stat-trend-up">Cumulative charter booking value</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="admin-toolbar" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="admin-toolbar-search" style={{ minWidth: 260 }}>
          <Search size={13} color="var(--adm-text-3)" />
          <input
            placeholder="Search by reference, customer, vehicle, driver…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Operational Filter Pills */}
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {['all', 'pending', 'confirmed', 'dispatched', 'completed', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => setOpsFilter(s)}
              className={`admin-btn admin-btn-sm ${opsFilter === s ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
            >
              {s === 'all' ? 'All Ops' : (opsBadges[s]?.label || s.charAt(0).toUpperCase() + s.slice(1))}
            </button>
          ))}
        </div>

        {/* Payment Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginLeft: 'auto' }}>
          <span style={{ fontSize: 12, color: 'var(--adm-text-3)', fontWeight: 500 }}>Payment:</span>
          <select
            className="admin-select"
            value={payFilter}
            onChange={(e) => setPayFilter(e.target.value)}
            style={{ padding: '0.25rem 0.5rem', fontSize: 12, height: 32 }}
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="invoiced">Invoiced</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Vehicle & Driver</th>
                <th>Route</th>
                <th>Travel Date</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Operational</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="admin-table-empty">
                    Loading bookings…
                  </td>
                </tr>
              ) : paginatedBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="admin-table-empty">
                    No bookings found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((b) => {
                  const ops = opsBadges[b.operationalStatus] || { label: b.operationalStatus, class: 'admin-badge-gray' }
                  const pay = payBadges[b.paymentStatus] || { label: b.paymentStatus, class: 'admin-badge-gray' }
                  return (
                    <tr
                      key={b.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleRowClick(b)}
                    >
                      <td>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--adm-text-2)', fontWeight: 600 }}>
                          {b.reference}
                        </div>
                        {b.quoteReference && (
                          <div style={{ fontSize: 10, color: 'var(--adm-text-3)' }}>
                            Quote: {b.quoteReference.slice(-8)}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{b.customerName}</div>
                        <div style={{ fontSize: 11, color: 'var(--adm-text-3)' }}>
                          {b.tripType || 'Charter Booking'}
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <div style={{ fontWeight: 500, color: 'var(--adm-text-1)' }}>{b.vehicleName}</div>
                        <div style={{ fontSize: 11, color: b.driverName ? 'var(--adm-text-2)' : 'var(--adm-warning)' }}>
                          {b.driverName ? `Driver: ${b.driverName}` : 'Driver Unassigned'}
                        </div>
                      </td>
                      <td style={{ fontSize: 12, maxWidth: 180 }}>
                        <div style={{ color: 'var(--adm-text-1)' }}>{b.pickup.split(',')[0]}</div>
                        <div style={{ fontSize: 11, color: 'var(--adm-text-3)' }}>
                          → {b.destination.split(',')[0]}
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>{fmtDateShort(b.travelDate)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--adm-text-1)' }}>
                        {b.totalAmount > 0 ? (
                          fmtCurrency(b.totalAmount)
                        ) : (
                          <span
                            style={{
                              color: 'var(--adm-warning)',
                              background: 'rgba(234, 179, 8, 0.1)',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            No Price
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`admin-badge ${pay.class}`}>{pay.label}</span>
                      </td>
                      <td>
                        <span className={`admin-badge ${ops.class}`}>{ops.label}</span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          {isAdmin && (!b.totalAmount || b.totalAmount <= 0) && (
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm"
                              title="Set price for this booking"
                              onClick={() => setEditingBooking(b)}
                              style={{
                                fontSize: 11,
                                padding: '0.25rem 0.5rem',
                                color: 'var(--adm-accent)',
                                borderColor: 'var(--adm-accent)',
                                background: 'rgba(239, 68, 68, 0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <Edit2 size={11} /> Edit Price
                            </button>
                          )}
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-ghost"
                            onClick={() => handleRowClick(b)}
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
                <strong style={{ color: 'var(--adm-text-1)' }}>{totalItems}</strong> bookings
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

      {/* ── Floating Booking Details Modal (Matching Customer / Lead Detail Modal) ── */}
      {selectedBooking && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedBooking(null)
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
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
                    {selectedBooking.reference}
                  </span>
                  {selectedBooking.quoteReference && (
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 11,
                        color: 'var(--adm-text-3)',
                        background: 'var(--adm-surface-2)',
                        padding: '0.2rem 0.4rem',
                        borderRadius: 4,
                        border: '1px solid var(--adm-border)',
                      }}
                    >
                      Quote: {selectedBooking.quoteReference}
                    </span>
                  )}
                  <span className={`admin-badge ${(opsBadges[selectedBooking.operationalStatus] || { class: 'admin-badge-gray' }).class}`}>
                    {(opsBadges[selectedBooking.operationalStatus] || { label: selectedBooking.operationalStatus }).label}
                  </span>
                  <span className={`admin-badge ${(payBadges[selectedBooking.paymentStatus] || { class: 'admin-badge-gray' }).class}`}>
                    {(payBadges[selectedBooking.paymentStatus] || { label: selectedBooking.paymentStatus }).label}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--adm-text-1)' }}>
                  {selectedBooking.customerName}
                </h3>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {isAdmin && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost admin-btn-sm"
                    onClick={() => setEditingBooking(selectedBooking)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Edit2 size={13} /> {(!selectedBooking.totalAmount || selectedBooking.totalAmount <= 0) ? 'Set Amount' : 'Edit'}
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger admin-btn-sm"
                    onClick={() => handleDeleteBooking(selectedBooking.id || selectedBooking.reference)}
                    disabled={isDeleting}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Trash2 size={13} />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
                <button
                  className="admin-btn admin-btn-icon admin-btn-ghost"
                  onClick={() => setSelectedBooking(null)}
                  style={{ borderRadius: '50%', width: 32, height: 32 }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Financial Amount Banner */}
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
                  Total Charter Booking Amount
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--adm-accent)', marginTop: 2, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {selectedBooking.totalAmount > 0 ? (
                    fmtCurrency(selectedBooking.totalAmount)
                  ) : (
                    <span style={{ color: 'var(--adm-warning)', fontSize: 18 }}>No Amount Set</span>
                  )}
                  {isAdmin && (!selectedBooking.totalAmount || selectedBooking.totalAmount <= 0) && (
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary admin-btn-sm"
                      onClick={() => setEditingBooking(selectedBooking)}
                      style={{ fontSize: 12, padding: '0.2rem 0.6rem', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Edit2 size={12} /> Set Amount Now
                    </button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--adm-text-2)', textAlign: 'right' }}>
                <div>
                  <strong style={{ color: 'var(--adm-text-1)' }}>Travel Date:</strong>{' '}
                  {fmtDateShort(selectedBooking.travelDate)}
                </div>
                <div style={{ marginTop: 2 }}>
                  <strong style={{ color: 'var(--adm-text-1)' }}>Booked On:</strong>{' '}
                  {fmtDateShort(selectedBooking.createdAt)}
                </div>
              </div>
            </div>

            {/* 2-Column Details Grid */}
            <div className="admin-grid-2" style={{ gap: '1.25rem' }}>
              {/* Customer Profile Card */}
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
                  <span style={{ fontWeight: 600, color: 'var(--adm-text-1)' }}>{selectedBooking.customerName}</span>
                </div>
                {matchedCustomer?.email && (
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
                      href={`mailto:${matchedCustomer.email}`}
                      style={{ color: 'var(--adm-text-2)', textDecoration: 'none' }}
                    >
                      {matchedCustomer.email}
                    </a>
                  </div>
                )}
                {matchedCustomer?.phone && (
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
                      href={`tel:${matchedCustomer.phone}`}
                      style={{ color: 'var(--adm-text-2)', textDecoration: 'none' }}
                    >
                      {matchedCustomer.phone}
                    </a>
                  </div>
                )}
                {matchedCustomer?.company && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 12, color: 'var(--adm-text-2)' }}>
                    <Building size={14} />
                    <span>{matchedCustomer.company}</span>
                  </div>
                )}
                {matchedCustomer?.type && (
                  <div style={{ fontSize: 11, color: 'var(--adm-text-3)', marginTop: 2 }}>
                    Account Type: <span style={{ fontWeight: 600, textTransform: 'capitalize', color: 'var(--adm-text-2)' }}>{matchedCustomer.type}</span>
                  </div>
                )}
              </div>

              {/* Journey & Vehicle Card */}
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
                  {selectedBooking.vehicleName}
                  {selectedBooking.tripType && (
                    <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--adm-text-3)', marginLeft: 6 }}>
                      • {selectedBooking.tripType}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: 12 }}>
                  <MapPin size={14} color="var(--adm-accent)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ color: 'var(--adm-text-2)' }}>
                      <strong style={{ color: 'var(--adm-text-1)' }}>Pickup:</strong> {selectedBooking.pickup || 'Lagos'}
                    </div>
                    <div style={{ color: 'var(--adm-text-2)', marginTop: 4 }}>
                      <strong style={{ color: 'var(--adm-text-1)' }}>Destination:</strong>{' '}
                      {selectedBooking.destination || 'Lagos'}
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
                  {selectedBooking.passengerCount > 0 && (
                    <span>
                      <strong style={{ color: 'var(--adm-text-2)' }}>{selectedBooking.passengerCount}</strong> Passengers
                    </span>
                  )}
                  {selectedBooking.distanceKm > 0 && (
                    <span>
                      • <strong style={{ color: 'var(--adm-text-2)' }}>{selectedBooking.distanceKm}</strong> km
                    </span>
                  )}
                  {selectedBooking.durationMins > 0 && (
                    <span>
                      • <strong style={{ color: 'var(--adm-text-2)' }}>{selectedBooking.durationMins}</strong> mins
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Driver Allocation Section */}
            <div
              style={{
                background: 'var(--adm-surface-2)',
                padding: '1rem',
                borderRadius: 'var(--adm-radius-sm)',
                border: '1px solid var(--adm-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <Car size={16} color="var(--adm-accent)" />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--adm-text-3)', letterSpacing: '0.05em' }}>
                    Assigned Driver
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--adm-text-1)', marginTop: 1 }}>
                    {selectedBooking.driverName || 'No Driver Assigned'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: 12, color: 'var(--adm-text-3)' }}>Assign:</span>
                <select
                  className="admin-select"
                  value={selectedBooking.driverId || ''}
                  onChange={(e) => handleAssignDriver(selectedBooking.id, e.target.value)}
                  style={{ minWidth: 160, padding: '0.3rem 0.5rem', fontSize: 12 }}
                >
                  <option value="">Select driver…</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.phone})
                    </option>
                  ))}
                </select>
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
                placeholder="Add internal operational notes, driver dispatch notes, flight arrival details…"
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

            {/* Operational & Payment Status Updaters + Action Footer */}
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
              {/* Status Selectors */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="admin-label" style={{ marginBottom: 0, fontSize: 12, whiteSpace: 'nowrap' }}>
                    Ops:
                  </span>
                  <select
                    className="admin-select"
                    value={selectedBooking.operationalStatus}
                    onChange={(e) => handleUpdateOpsStatus(selectedBooking.id, e.target.value as any)}
                    style={{ minWidth: 140, fontSize: 12 }}
                  >
                    {Object.entries(opsBadges).map(([val, info]) => (
                      <option key={val} value={val}>
                        {info.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="admin-label" style={{ marginBottom: 0, fontSize: 12, whiteSpace: 'nowrap' }}>
                    Pay:
                  </span>
                  <select
                    className="admin-select"
                    value={selectedBooking.paymentStatus}
                    onChange={(e) => handleUpdatePayStatus(selectedBooking.id, e.target.value as any)}
                    style={{ minWidth: 140, fontSize: 12 }}
                  >
                    {Object.entries(payBadges).map(([val, info]) => (
                      <option key={val} value={val}>
                        {info.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {matchedCustomer?.email && (
                  <a
                    href={`mailto:${matchedCustomer.email}?subject=Booking Update: ${selectedBooking.reference}`}
                    className="admin-btn admin-btn-ghost admin-btn-sm"
                  >
                    <Mail size={13} /> Email Client
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="admin-btn admin-btn-primary admin-btn-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Booking Modal */}
      {showCreate && (
        <CreateBookingModal onClose={() => setShowCreate(false)} vehicles={vehicles} customers={customers} />
      )}

      {/* Edit Booking & Pricing Modal */}
      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          vehicles={vehicles}
          drivers={drivers}
          onClose={() => setEditingBooking(null)}
          onSaved={(updates) => {
            updateBooking(editingBooking.id, updates)
            setDbBookings((prev) =>
              prev.map((b) =>
                b.id === editingBooking.id || b.reference === editingBooking.reference
                  ? { ...b, ...updates, totalAmount: Number(updates.totalAmount) || b.totalAmount }
                  : b
              )
            )
            if (selectedBooking && (selectedBooking.id === editingBooking.id || selectedBooking.reference === editingBooking.reference)) {
              setSelectedBooking((prev) =>
                prev ? { ...prev, ...updates, totalAmount: Number(updates.totalAmount) || prev.totalAmount } : null
              )
            }
          }}
        />
      )}
    </>
  )
}

function CreateBookingModal({ onClose, vehicles, customers }: any) {
  const { createBooking } = useAdminStore()
  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    vehicleId: '',
    vehicleName: '',
    pickup: '',
    destination: '',
    distanceKm: 0,
    durationMins: 0,
    tripType: 'Drop-Off',
    passengerCount: 1,
    travelDate: '',
    totalAmount: 0,
    paymentStatus: 'pending',
    operationalStatus: 'pending',
    driverId: null,
    driverName: null,
    quoteReference: null,
    notes: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.customerId || !form.vehicleId || !form.pickup || !form.travelDate) return
    setIsSubmitting(true)
    await createBooking(form as any)

    // Send formal booking confirmation receipt directly to customer's email
    const customerObj = customers.find((c: any) => c.id === form.customerId)
    const clientEmail = customerObj?.email || customerObj?.contactEmail
    const bookingRef = `NETS-BK-${Date.now().toString().slice(-6)}`

    if (clientEmail) {
      await emailService.sendClientBookingConfirmationEmail({
        ...form,
        customerName: form.customerName || customerObj?.fullName,
        customerEmail: clientEmail,
        reference: bookingRef,
      })
    }

    // Also send internal alert
    emailService.sendNewBookingNotification({
      ...form,
      customerName: form.customerName || customerObj?.fullName,
      customerEmail: clientEmail || 'N/A',
      reference: bookingRef,
    })

    setIsSubmitting(false)
    alert(`Booking created successfully and confirmation email sent to ${clientEmail || 'customer'}!`)
    onClose()
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <span className="admin-modal-title">Create New Booking</span>
          <button className="admin-btn admin-btn-icon admin-btn-ghost" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            <div className="admin-grid-2">
              <div className="admin-form-group">
                <label className="admin-label admin-label-req">Customer</label>
                <select
                  className="admin-select"
                  value={form.customerId}
                  onChange={(e) => {
                    const c = customers.find((x: any) => x.id === e.target.value)
                    setForm((f) => ({ ...f, customerId: e.target.value, customerName: c?.fullName ?? '' }))
                  }}
                >
                  <option value="">Select customer…</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-label admin-label-req">Vehicle</label>
                <select
                  className="admin-select"
                  value={form.vehicleId}
                  onChange={(e) => {
                    const v = vehicles.find((x: any) => x.id === e.target.value)
                    setForm((f) => ({ ...f, vehicleId: e.target.value, vehicleName: v?.name ?? '' }))
                  }}
                >
                  <option value="">Select vehicle…</option>
                  {vehicles
                    .filter((v: any) => v.available)
                    .map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="admin-form-group">
              <label className="admin-label admin-label-req">Pickup Location</label>
              <input
                className="admin-input"
                value={form.pickup}
                onChange={(e) => setForm((f) => ({ ...f, pickup: e.target.value }))}
                placeholder="Pickup address"
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label admin-label-req">Destination</label>
              <input
                className="admin-input"
                value={form.destination}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                placeholder="Destination address"
              />
            </div>
            <div className="admin-grid-2">
              <div className="admin-form-group">
                <label className="admin-label admin-label-req">Travel Date</label>
                <input
                  className="admin-input"
                  type="datetime-local"
                  value={form.travelDate}
                  onChange={(e) => setForm((f) => ({ ...f, travelDate: e.target.value }))}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Trip Type</label>
                <select
                  className="admin-select"
                  value={form.tripType}
                  onChange={(e) => setForm((f) => ({ ...f, tripType: e.target.value }))}
                >
                  {['One Way', 'Return', 'Airport Transfer', 'Corporate Shuttle', 'Wedding', 'Multi-Day', 'Recurring'].map(
                    (t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
            <div className="admin-grid-2">
              <div className="admin-form-group">
                <label className="admin-label">Total Amount (₦)</label>
                <input
                  className="admin-input"
                  type="number"
                  value={form.totalAmount}
                  onChange={(e) => setForm((f) => ({ ...f, totalAmount: +e.target.value }))}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Passengers</label>
                <input
                  className="admin-input"
                  type="number"
                  min={1}
                  value={form.passengerCount}
                  onChange={(e) => setForm((f) => ({ ...f, passengerCount: +e.target.value }))}
                />
              </div>
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Notes</label>
              <textarea
                className="admin-textarea"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="admin-modal-footer">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className={`admin-btn admin-btn-primary ${isSubmitting ? 'is-loading' : ''}`}
              disabled={isSubmitting}
            >
              <Save size={13} /> Create Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditBookingModal({
  booking,
  vehicles,
  drivers,
  onClose,
  onSaved,
}: {
  booking: AdminBooking
  vehicles: any[]
  drivers: any[]
  onClose: () => void
  onSaved: (updated: Partial<AdminBooking>) => void
}) {
  const [form, setForm] = useState({
    totalAmount: booking.totalAmount || 0,
    vehicleId: booking.vehicleId || '',
    vehicleName: booking.vehicleName || '',
    driverId: booking.driverId || '',
    driverName: booking.driverName || '',
    pickup: booking.pickup || '',
    destination: booking.destination || '',
    travelDate: booking.travelDate || '',
    passengerCount: booking.passengerCount || 1,
    customerName: booking.customerName || '',
    tripType: booking.tripType || 'Charter Booking',
    notes: booking.notes || '',
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    const amount = Number(form.totalAmount) || 0
    try {
      const ok = await adminService.updateBooking(booking.id, {
        totalAmount: amount,
        vehicleId: form.vehicleId,
        vehicleName: form.vehicleName,
        driverId: form.driverId || undefined,
        driverName: form.driverName || undefined,
        pickup: form.pickup,
        destination: form.destination,
        passengerCount: form.passengerCount,
        customerName: form.customerName,
        tripType: form.tripType,
        travelDate: form.travelDate ? (new Date(form.travelDate).toISOString() as any) : undefined,
        notes: form.notes,
      })
      if (ok) {
        onSaved({
          totalAmount: amount,
          vehicleId: form.vehicleId,
          vehicleName: form.vehicleName,
          driverId: form.driverId || null,
          driverName: form.driverName || null,
          pickup: form.pickup,
          destination: form.destination,
          passengerCount: form.passengerCount,
          customerName: form.customerName,
          tripType: form.tripType,
          travelDate: form.travelDate,
          notes: form.notes,
        })
        onClose()
      } else {
        alert('Failed to save booking updates. Please try again.')
      }
    } catch (err) {
      console.error('Error saving booking updates:', err)
      alert('Failed to save booking updates.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="admin-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="admin-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 620,
          background: '#ffffff',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          className="admin-modal-header"
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--adm-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--adm-text-1)' }}>
              Edit Booking & Pricing
            </div>
            <div style={{ fontSize: 12, color: 'var(--adm-text-3)', fontFamily: 'monospace' }}>
              Reference: {booking.reference}
            </div>
          </div>
          <button className="admin-btn admin-btn-icon admin-btn-ghost" onClick={onClose} style={{ borderRadius: '50%', width: 32, height: 32 }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Pricing Highlight Box */}
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 6,
              padding: '1rem',
            }}
          >
            <label className="admin-label admin-label-req" style={{ color: 'var(--adm-accent)', fontWeight: 700 }}>
              Total Charter Booking Amount (₦)
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="number"
                min={0}
                step={1000}
                required
                className="admin-input"
                style={{ fontSize: 16, fontWeight: 700, color: 'var(--adm-accent)' }}
                placeholder="e.g. 200000"
                value={form.totalAmount || ''}
                onChange={(e) => setForm({ ...form, totalAmount: Number(e.target.value) })}
              />
              <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--adm-text-2)' }}>
                {fmtCurrency(Number(form.totalAmount) || 0)}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--adm-text-3)', marginTop: 4 }}>
              Setting the total amount updates the charter billing price for this booking.
            </div>
          </div>

          <div className="admin-grid-2" style={{ gap: '0.75rem' }}>
            <div className="admin-form-group">
              <label className="admin-label">Customer Name</label>
              <input
                className="admin-input"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Trip Type</label>
              <input
                className="admin-input"
                value={form.tripType}
                onChange={(e) => setForm({ ...form, tripType: e.target.value })}
              />
            </div>
          </div>

          {/* Vehicle & Driver */}
          <div className="admin-grid-2" style={{ gap: '0.75rem' }}>
            <div className="admin-form-group">
              <label className="admin-label">Vehicle</label>
              <select
                className="admin-select"
                value={form.vehicleId}
                onChange={(e) => {
                  const v = vehicles.find((x: any) => x.id === e.target.value)
                  setForm({ ...form, vehicleId: e.target.value, vehicleName: v?.name || form.vehicleName })
                }}
              >
                <option value="">Select vehicle…</option>
                {vehicles.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Driver</label>
              <select
                className="admin-select"
                value={form.driverId}
                onChange={(e) => {
                  const d = drivers.find((x: any) => x.id === e.target.value)
                  setForm({ ...form, driverId: e.target.value, driverName: d?.name || '' })
                }}
              >
                <option value="">Unassigned</option>
                {drivers.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.phone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Route */}
          <div className="admin-grid-2" style={{ gap: '0.75rem' }}>
            <div className="admin-form-group">
              <label className="admin-label">Pickup Location</label>
              <input
                className="admin-input"
                value={form.pickup}
                onChange={(e) => setForm({ ...form, pickup: e.target.value })}
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Destination</label>
              <input
                className="admin-input"
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
              />
            </div>
          </div>

          <div className="admin-grid-2" style={{ gap: '0.75rem' }}>
            <div className="admin-form-group">
              <label className="admin-label">Travel Date</label>
              <input
                type="date"
                className="admin-input"
                value={form.travelDate ? form.travelDate.slice(0, 10) : ''}
                onChange={(e) => setForm({ ...form, travelDate: e.target.value })}
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Passenger Count</label>
              <input
                type="number"
                min={1}
                className="admin-input"
                value={form.passengerCount}
                onChange={(e) => setForm({ ...form, passengerCount: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="admin-form-group">
            <label className="admin-label">Internal Notes / Remarks</label>
            <textarea
              className="admin-textarea"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--adm-border)',
            }}
          >
            <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

