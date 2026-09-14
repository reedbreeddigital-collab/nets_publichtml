// ============================================================================
// NETS Admin — Dashboard Home
// ============================================================================
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, CalendarCheck, Truck, AlertTriangle, Plus, DollarSign, Clock, TrendingUp, Zap, Award } from 'lucide-react'
import { useAdminStore } from '../store/useAdminStore'
import { adminService, AdminStats, AdminLead, AdminBookingDB, CloserStat, formatDuration } from '../services/adminService'

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
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    adminService.getStats().then(setLiveStats)
    adminService.getLeads().then(setLiveLeads)
    adminService.getBookings().then(setLiveBookings)
    adminService.getUsers().then(setUsers)
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

  const closerList: CloserStat[] = useMemo(() => {
    if (liveStats?.closerStats && liveStats.closerStats.length > 0) {
      return liveStats.closerStats
    }
    const closers = users.filter(u => u.role === 'sales_closer' || validLeads.some(l => String(l.assignedTo) === String(u.id)))
    return closers.map(c => {
      const assigned = validLeads.filter(l => String(l.assignedTo) === String(c.id))
      const won = assigned.filter(l => {
        const crm = String(l.crmStatus || '').toLowerCase()
        const st = String(l.status || '').toLowerCase()
        return (crm === 'won & paid' || crm === 'won' || crm === 'converted' || st === 'converted' || st === 'won' || st === 'paid')
      })
      const respTimed = assigned.filter(l => l.responseTimeSec !== undefined && l.responseTimeSec > 0)
      const cAvgResp = respTimed.length > 0 ? Math.round(respTimed.reduce((a, l) => a + (l.responseTimeSec || 0), 0) / respTimed.length) : 0

      const closeTimed = won.filter(l => l.closeTimeSec !== undefined && l.closeTimeSec > 0)
      const cAvgClose = closeTimed.length > 0 ? Math.round(closeTimed.reduce((a, l) => a + (l.closeTimeSec || 0), 0) / closeTimed.length) : 0

      const revenue = won.reduce((a, l) => a + (l.estimatedInvestmentMax || l.estimatedInvestmentMin || 0), 0)
      const winRate = assigned.length > 0 ? Math.round((won.length / assigned.length) * 100) : 0

      return {
        userId: c.id,
        fullName: c.fullName,
        email: c.email,
        role: c.role,
        totalAssigned: assigned.length,
        totalWon: won.length,
        winRate,
        avgResponseTimeSec: cAvgResp,
        avgCloseTimeSec: cAvgClose,
        totalRevenue: revenue,
      }
    })
  }, [liveStats, users, validLeads])

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

      {/* Sales Closer Performance & Average Close Times Section */}
      <div className="admin-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--adm-text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={16} color="var(--adm-accent)" /> Sales Closer Performance & Average Close Times
            </div>
            <div style={{ fontSize: 12, color: 'var(--adm-text-3)', marginTop: 2 }}>
              Speed-to-lead response times, deal close velocity, and conversion performance per closer
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {liveStats?.avgResponseTimeSec && liveStats.avgResponseTimeSec > 0 ? (
              <span className="admin-badge admin-badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Zap size={11} /> Team Avg Response: {formatDuration(liveStats.avgResponseTimeSec)}
              </span>
            ) : null}
            <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => navigate('/admin/crm')}>
              Manage CRM Pipeline
            </button>
          </div>
        </div>

        {closerList.length === 0 ? (
          <div className="admin-table-empty" style={{ padding: '2rem 1rem' }}>
            No sales closers active or assigned to leads yet. As leads are assigned and updated in the CRM tab, closer response times and average close metrics will appear here.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {closerList.map(c => (
              <div
                key={c.userId}
                style={{
                  background: 'var(--adm-surface-2)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: 'var(--adm-radius-sm)',
                  padding: '1.125rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.875rem',
                  position: 'relative',
                }}
              >
                {/* Closer Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'rgba(26, 31, 168, 0.1)',
                        color: 'var(--adm-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {c.fullName ? c.fullName.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--adm-text-1)' }}>{c.fullName}</div>
                      <div style={{ fontSize: 11, color: 'var(--adm-text-3)' }}>{c.email}</div>
                    </div>
                  </div>
                  <span className="admin-badge admin-badge-accent" style={{ fontSize: 10 }}>
                    {c.role === 'sales_closer' ? 'Sales Closer' : c.role}
                  </span>
                </div>

                {/* Primary Metric: Average Close Time Card */}
                <div style={{ background: '#ffffff', padding: '0.875rem', borderRadius: 4, border: '1px solid var(--adm-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 10.5, textTransform: 'uppercase', fontWeight: 700, color: 'var(--adm-text-3)', letterSpacing: '0.04em' }}>
                      Average Time to Close
                    </div>
                    {c.totalWon > 0 && <Award size={13} color="var(--adm-accent)" />}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: c.avgCloseTimeSec > 0 ? 'var(--adm-accent)' : 'var(--adm-text-3)', marginTop: 2 }}>
                    {c.avgCloseTimeSec > 0 ? formatDuration(c.avgCloseTimeSec) : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--adm-text-2)', marginTop: 2 }}>
                    {c.totalWon > 0 ? `${c.totalWon} won deal(s) converted` : 'Awaiting first closed deal'}
                  </div>
                </div>

                {/* Secondary Metrics: Avg Response + Win Rate */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: 11.5 }}>
                  <div style={{ background: '#ffffff', padding: '0.625rem', borderRadius: 4, border: '1px solid var(--adm-border)' }}>
                    <div style={{ color: 'var(--adm-text-3)', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>
                      Avg Response
                    </div>
                    <div style={{ fontWeight: 700, color: c.avgResponseTimeSec > 0 ? 'var(--adm-success)' : 'var(--adm-text-3)', fontSize: 14, marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                      {c.avgResponseTimeSec > 0 && <Zap size={11} />}
                      {c.avgResponseTimeSec > 0 ? formatDuration(c.avgResponseTimeSec) : '—'}
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '0.625rem', borderRadius: 4, border: '1px solid var(--adm-border)' }}>
                    <div style={{ color: 'var(--adm-text-3)', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>
                      Win Rate
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--adm-text-1)', fontSize: 14, marginTop: 2 }}>
                      {c.winRate}% <span style={{ fontSize: 10, color: 'var(--adm-text-3)', fontWeight: 400 }}>({c.totalWon}/{c.totalAssigned})</span>
                    </div>
                  </div>
                </div>

                {/* Closed Value Footer */}
                {c.totalRevenue > 0 && (
                  <div style={{ fontSize: 11.5, color: 'var(--adm-text-2)', borderTop: '1px solid var(--adm-border)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Won Pipeline Revenue:</span>
                    <strong style={{ color: 'var(--adm-text-1)', fontSize: 12.5 }}>{fmt(c.totalRevenue)}</strong>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
