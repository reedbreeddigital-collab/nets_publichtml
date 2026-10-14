// ============================================================================
// NETS Admin — Sidebar Navigation
// ============================================================================
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useRef, useEffect } from 'react'
import {
  LayoutDashboard, FileText, CalendarCheck, Users, Truck,
  DollarSign, Megaphone, Image, BarChart3, UserCog,
  Activity, Settings, LogOut, Newspaper,
} from 'lucide-react'
import { useAdminStore, type AdminQuote } from '../../store/useAdminStore'

interface SidebarNavItem {
  to: string
  label: string
  shortLabel: string
  icon: any
  end?: boolean
  badge?: string
}

const navItems: SidebarNavItem[] = [
  { to: '/admin', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard, end: true },
]

const operationsItems: SidebarNavItem[] = [
  { to: '/admin/crm', label: 'CRM Leads', shortLabel: 'CRM', icon: Users, badge: 'new' },
  { to: '/admin/quotes', label: 'Quotes', shortLabel: 'Quotes', icon: FileText },
  { to: '/admin/bookings', label: 'Bookings', shortLabel: 'Bookings', icon: CalendarCheck },
  { to: '/admin/customers', label: 'Customers', shortLabel: 'Clients', icon: Users },
]

const fleetItems: SidebarNavItem[] = [
  { to: '/admin/fleet', label: 'Fleet', shortLabel: 'Fleet', icon: Truck },
  { to: '/admin/pricing', label: 'Pricing', shortLabel: 'Pricing', icon: DollarSign },
  { to: '/admin/media', label: 'Media', shortLabel: 'Media', icon: Image },
]

const growthItems: SidebarNavItem[] = [
  { to: '/admin/promotions', label: 'Promotions', shortLabel: 'Promos', icon: Megaphone },
  { to: '/admin/cms/blog', label: 'Blog CMS', shortLabel: 'Blog', icon: Newspaper },
  { to: '/admin/analytics', label: 'Analytics', shortLabel: 'Analytics', icon: BarChart3 },
]

const adminItems: SidebarNavItem[] = [
  { to: '/admin/users', label: 'Users', shortLabel: 'Users', icon: UserCog },
  { to: '/admin/activity', label: 'Activity Log', shortLabel: 'Activity', icon: Activity },
  { to: '/admin/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
]

export function AdminSidebar() {
  const { session, logout, quotes } = useAdminStore()
  const navigate = useNavigate()
  const location = useLocation()
  const navContainerRef = useRef<HTMLDivElement>(null)
  const newQuotes = quotes.filter((q: AdminQuote) => q.status === 'new').length

  // Automatically center active tab in horizontal bottom nav bar on mobile
  useEffect(() => {
    if (navContainerRef.current) {
      const activeEl = navContainerRef.current.querySelector('.admin-nav-item.active') as HTMLElement | null
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [location.pathname])

  // Allow horizontal scrolling via mouse wheel (especially useful in desktop responsive emulator)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (navContainerRef.current && e.deltaY !== 0) {
      navContainerRef.current.scrollLeft += e.deltaY
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const userRole = (session.user?.role ?? 'admin').toLowerCase()
  const isAdmin = userRole === 'admin' || userRole === 'super-admin'
  const roleDisplay = isAdmin ? 'Admin' : userRole === 'sales_closer' ? 'Sales' : 'Staff'

  const initials = session.user?.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2) ?? 'AD'

  const renderNavItem = ({ to, label, shortLabel, icon: Icon, end, badge }: SidebarNavItem) => (
    <NavLink
      key={to}
      to={to}
      end={!!end}
      className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}
    >
      <div className="admin-nav-item-icon-wrap">
        <Icon size={16} />
        {badge === 'new' && newQuotes > 0 && (
          <span className="admin-nav-badge">{newQuotes}</span>
        )}
      </div>
      <span className="admin-nav-label-desktop">{label}</span>
      <span className="admin-nav-label-mobile">{shortLabel || label}</span>
      {badge === 'new' && newQuotes > 0 && (
        <span className="admin-nav-badge-desktop">{newQuotes}</span>
      )}
    </NavLink>
  )

  return (
    <nav className="admin-sidebar" aria-label="Admin Navigation">
      <div className="admin-sidebar-logo" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.625rem', borderBottom: '1px solid var(--adm-border)', background: 'var(--adm-surface)' }}>
        <img src="/favicon.svg" alt="NETS Logo" style={{ height: '32px', width: '32px', objectFit: 'contain' }} />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--adm-text-1)', letterSpacing: '-0.02em' }}>NETS</span>
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--adm-accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {isAdmin ? 'Admin' : userRole === 'sales_closer' ? 'Sales' : 'Staff'} Portal
          </span>
        </div>
      </div>

      <div className="admin-nav" ref={navContainerRef} onWheel={handleWheel}>
        {userRole !== 'sales_closer' && (
          <div className="admin-nav-section">
            {navItems.map(renderNavItem)}
          </div>
        )}

        <div className="admin-nav-section">
          <div className="admin-nav-label">Operations</div>
          {operationsItems.map((item) => {
            if (userRole === 'sales_closer' && item.to !== '/admin/crm') return null
            return renderNavItem(item)
          })}
        </div>

        {isAdmin && (
          <>
            <div className="admin-nav-section">
              <div className="admin-nav-label">Fleet & Pricing</div>
              {fleetItems.map(renderNavItem)}
            </div>

            <div className="admin-nav-section">
              <div className="admin-nav-label">Growth</div>
              {growthItems.map(renderNavItem)}
            </div>

            <div className="admin-nav-section">
              <div className="admin-nav-label">Administration</div>
              {adminItems.map(renderNavItem)}
            </div>
          </>
        )}

        <div className="admin-nav-section">
          <div className="admin-nav-label">Account</div>
          <NavLink
            to="/admin/profile"
            className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}
          >
            <div className="admin-nav-item-icon-wrap">
              <UserCog size={16} />
            </div>
            <span className="admin-nav-label-desktop">My Profile & Security</span>
            <span className="admin-nav-label-mobile">Profile</span>
          </NavLink>
          <button
            onClick={handleLogout}
            className="admin-nav-item admin-nav-item-mobile-logout"
            title="Sign out"
          >
            <div className="admin-nav-item-icon-wrap">
              <LogOut size={16} />
            </div>
            <span className="admin-nav-label-mobile">Logout</span>
          </button>
        </div>
      </div>

      <div className="admin-sidebar-user" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/profile')} title="View My Profile">
        <div className="admin-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initials}</div>
        <div className="admin-sidebar-user-info">
          <div className="admin-sidebar-user-name">{session.user?.fullName ?? 'User'}</div>
          <div className="admin-sidebar-user-role">{roleDisplay} · Profile</div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); handleLogout() }}
          className="admin-btn admin-btn-icon admin-btn-ghost"
          title="Sign out"
        >
          <LogOut size={14} />
        </button>
      </div>
    </nav>
  )
}
