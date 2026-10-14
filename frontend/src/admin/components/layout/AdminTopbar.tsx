// ============================================================================
// NETS Admin — Top Bar
// ============================================================================
import { Bell, Search, User } from 'lucide-react'
import { useAdminStore } from '../../store/useAdminStore'
import { useLocation, useNavigate } from 'react-router-dom'

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/crm': 'CRM & Lead Pipeline',
  '/admin/quotes': 'Quote Management',
  '/admin/bookings': 'Booking Management',
  '/admin/customers': 'Customer Management',
  '/admin/fleet': 'Fleet Management',
  '/admin/pricing': 'Pricing Administration',
  '/admin/media': 'Fleet Media',
  '/admin/promotions': 'Promotions',
  '/admin/cms/blog': 'Blog CMS & Content Management',
  '/admin/cms/blog/create': 'Blog Editor & Publisher',
  '/admin/analytics': 'Analytics',
  '/admin/users': 'User Management',
  '/admin/activity': 'Activity Log',
  '/admin/settings': 'System Settings',
  '/admin/profile': 'My Profile & Security',
}

export function AdminTopbar() {
  const { session, setSearchOpen, quotes } = useAdminStore()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const title = pageTitles[pathname] ?? 'Control Center'
  const initials = session.user?.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) ?? 'AD'
  const newQuotes = quotes.filter(q => q.status === 'new').length

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <div className="admin-topbar-mobile-brand" onClick={() => navigate('/admin')} title="NETS Admin Dashboard">
          <img src="/favicon.svg" alt="NETS" style={{ height: 26, width: 26, objectFit: 'contain' }} />
        </div>
        <span className="admin-topbar-title">{title}</span>
      </div>

      <button className="admin-topbar-search" onClick={() => setSearchOpen(true)}>
        <Search size={13} color="var(--adm-text-3)" />
        <span className="admin-topbar-search-text">Search everything…</span>
        <span className="admin-topbar-search-kbd">⌘K</span>
      </button>

      <div className="admin-topbar-right">
        <div style={{ position: 'relative' }}>
          <button className="admin-btn admin-btn-icon admin-btn-ghost" title="Notifications">
            <Bell size={15} />
          </button>
          {newQuotes > 0 && (
            <span style={{
              position: 'absolute', top: -3, right: -3,
              width: 14, height: 14, borderRadius: '50%',
              background: 'var(--adm-accent)', color: '#fff',
              fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{newQuotes}</span>
          )}
        </div>
        <div
          className="admin-avatar"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/admin/profile')}
          title="My Profile & Security"
        >
          {initials}
        </div>
      </div>
    </header>
  )
}
