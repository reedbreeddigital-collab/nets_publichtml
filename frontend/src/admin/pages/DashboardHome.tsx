// ============================================================================
// NETS Admin — Dashboard Home
// ============================================================================
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, CalendarCheck, Truck, AlertTriangle, Plus, DollarSign, Clock, TrendingUp } from 'lucide-react'
import { useAdminStore } from '../store/useAdminStore'
import { adminService, AdminStats, AdminLead, AdminBookingDB } from '../services/adminService'

const fmt = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtTime = (iso: string) => {
  if (!iso) return 'Just now'
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    new: 'admin-badge-accent', approved: 'admin-badge-green', rejected: 'admin-badge-red',
    converted: 'admin-badge-gray', reviewed: 'admin-badge-yellow',
    confirmed: 'admin-badge-green', completed: 'admin-badge-gray',
    pending: 'admin-badge-yellow', cancelled: 'admin-badge-red', dispatched: 'admin-badge-accent',
  }
  return `admin-badge ${map[status] ?? 'admin-badge-gray'}`
}

export function DashboardHome() {
  const { vehicles, activityLog } = useAdminStore()
  const navigate = useNavigate()
  const [liveStats, setLiveStats] = useState<AdminStats | null>(null)
  const [liveLeads, setLiveLeads] = useState<AdminLead[]>([])
  const [liveBookings, setLiveBookings] = useState<AdminBookingDB[]>([])

  useEffect(() => {
    adminService.getStats().then(setLiveStats)
    adminService.getLeads().then(setLiveLeads)
    adminService.getBookings().then(setLiveBookings)
  }, [])

  // KPIs derived directly from live database leads & bookings
  const validLeads = liveLeads.filter(q => String(q.crmStatus || q.status).toLowerCase() !== 'invalid')
  const pendingQuotes = validLeads.filter(q => {
    const isWon =
      String(q.crmStatus).toLowerCase() === 'won & paid' ||
      String(q.crmStatus).toLowerCase() === 'won' ||
      String(q.crmStatus).toLowerCase() === 'converted' ||
      ['converted', 'won', 'paid'].includes(String(q.status).toLowerCase())
    return !isWon && (q.status === 'pending' || q.status === 'new')
  }).length
  const confirmedBookings = liveBookings.filter(b => b.operationalStatus === 'confirmed' || b.operationalStatus === 'dispatched' || b.paymentStatus === 'paid').length
  const fleetActive = vehicles.filter(v => v.available).length

  const bookingRevenue = liveBookings.reduce((s, b) => s + (b.totalAmount || 0), 0)
  const leadRevenue = validLeads.reduce((s, l) => s + (l.estimatedInvestmentMax || l.estimatedInvestmentMin || 0), 0)
  const revenueTotal = bookingRevenue > 0 ? bookingRevenue : leadRevenue

  const upcoming = liveBookings
    .filter(b => b.operationalStatus !== 'cancelled')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  // Generate live activity entries directly from MySQL leads & bookings
  const leadActivities = liveLeads.map(l => ({
    id: `act-lead-${l.id}`,
    description: `Quote request ${l.leadReference} submitted by ${l.customerName}`,
    userName: l.customerName || 'Customer',
    timestamp: l.createdAt,
    action: l.status === 'pending' ? 'Lead Created' : `Status ${l.status}`,
  }))

  const bookingActivities = liveBookings.map(b => ({
    id: `act-bk-${b.id}`,
    description: `Booking ${b.reference} for ${b.customerName} (${b.vehicleName})`,
    userName: b.customerName || 'Operations',
    timestamp: b.createdAt,
    action: b.operationalStatus,
  }))

  const combinedActivities = [...leadActivities, ...bookingActivities]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8)

  const displayActivities = combinedActivities.length > 0 ? combinedActivities : activityLog

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <div className="admin-page-title">Executive Dashboard</div>
          <div className="admin-page-desc">Real-time overview of NETS transport operations and customer demand</div>
        </div>
        <div className="admin-page-actions">
          <button className="admin-btn admin-btn-primary" onClick={() => navigate('/admin/crm')}>
            <Plus size={14} /> View CRM Leads
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="admin-stat-grid">
        <div className="admin-stat-card" style={{ borderTop: '2px solid var(--adm-accent)' }}>
          <div className="admin-stat-label">Pending Quotes</div>
          <div className="admin-stat-value" style={{ color: pendingQuotes > 0 ? 'var(--adm-warning)' : undefined }}>{pendingQuotes}</div>
          <div className="admin-stat-sub">Awaiting pricing review</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Confirmed Trips</div>
          <div className="admin-stat-value">{confirmedBookings}</div>
          <div className="admin-stat-sub">Scheduled for dispatch</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Active Fleet</div>
          <div className="admin-stat-value">{fleetActive}<span style={{ fontSize: 14, color: 'var(--adm-text-3)', fontWeight: 400 }}>/{vehicles.length}</span></div>
          <div className="admin-stat-sub">Available in fleet catalog</div>
        </div>

        <div className="admin-stat-card" style={{ borderTop: '2px solid var(--adm-success)' }}>
          <div className="admin-stat-label">Pipeline Revenue</div>
          <div className="admin-stat-value" style={{ fontSize: '1.25rem' }}>{fmt(revenueTotal)}</div>
          <div className="admin-stat-sub admin-stat-trend-up">Estimated quote value</div>
        </div>
      </div>

      <div className="admin-grid-2" style={{ gap: '1.5rem' }}>
        {/* Upcoming Trips */}
        <div className="admin-card" style={{ padding: 0 }}>
          <div className="admin-card-title" style={{ padding: '1rem 1.25rem', marginBottom: 0, borderBottom: '1px solid var(--adm-border)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} /> Upcoming Trips</span>
            <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => navigate('/admin/bookings')}>View All</button>
          </div>
          {upcoming.length === 0 ? (
            <div className="admin-table-empty">No upcoming trips scheduled in database</div>
          ) : (
            <table className="admin-table">
              <thead><tr><th>Booking</th><th>Customer</th><th>Vehicle</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {upcoming.map(b => (
                  <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/bookings')}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--adm-text-2)' }}>{b.reference}</span></td>
                    <td>{b.customerName ? b.customerName.split(' ').slice(-1)[0] : 'Customer'}</td>
                    <td style={{ color: 'var(--adm-text-2)', fontSize: 12 }}>{b.vehicleName}</td>
                    <td style={{ fontSize: 12, color: 'var(--adm-text-2)' }}>{fmtDate(b.travelDate || b.createdAt)}</td>
                    <td><span className={statusBadge(b.operationalStatus)}>{b.operationalStatus}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Activity */}
        <div className="admin-card" style={{ padding: 0 }}>
          <div className="admin-card-title" style={{ padding: '1rem 1.25rem', marginBottom: 0, borderBottom: '1px solid var(--adm-border)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={14} /> Recent Activity</span>
            <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => navigate('/admin/quotes')}>View Log</button>
          </div>
          <div style={{ padding: '0 1.25rem' }}>
            {displayActivities.length === 0 ? (
              <div className="admin-table-empty">No activity recorded yet</div>
            ) : (
              displayActivities.map(entry => (
                <div key={entry.id} className="admin-activity-item">
                  <div className={`admin-activity-dot ${entry.action.includes('Approved') || entry.action.includes('Created') || entry.action.includes('confirmed') ? 'admin-activity-dot-accent' : ''}`} />
                  <div>
                    <div className="admin-activity-title">{entry.description}</div>
                    <div className="admin-activity-meta">{entry.userName} · {fmtTime(entry.timestamp)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Quotes */}
      <div className="admin-card" style={{ marginTop: '1.5rem', padding: 0 }}>
        <div className="admin-card-title" style={{ padding: '1rem 1.25rem', marginBottom: 0, borderBottom: '1px solid var(--adm-border)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> Recent CRM Leads</span>
          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => navigate('/admin/quotes')}>View All Quotes</button>
        </div>
        {liveLeads.length === 0 ? (
          <div className="admin-table-empty">No quote requests recorded in database</div>
        ) : (
          <table className="admin-table">
            <thead><tr><th>Reference</th><th>Customer</th><th>Vehicle</th><th>Route</th><th>Estimate</th><th>Status</th></tr></thead>
            <tbody>
              {liveLeads.slice(0, 5).map(q => (
                <tr key={q.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/quotes')}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--adm-accent)', fontWeight: 600 }}>{q.leadReference}</span></td>
                  <td>{q.customerName}</td>
                  <td style={{ color: 'var(--adm-text-2)', fontSize: 12 }}>{q.journeyType || 'Standard'}</td>
                  <td style={{ color: 'var(--adm-text-2)', fontSize: 12 }}>{q.origin || 'N/A'} → {q.destination || 'N/A'}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(q.estimatedInvestmentMax || q.estimatedInvestmentMin || 0)}</td>
                  <td><span className={statusBadge(q.status)}>{q.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
