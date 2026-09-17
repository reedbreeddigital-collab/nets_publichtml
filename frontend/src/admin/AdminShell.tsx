// ============================================================================
// NETS Admin — Master Shell (Layout + Auth Guard)
// ============================================================================
import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import './admin.css'
import { AdminSidebar } from './components/layout/AdminSidebar'
import { AdminTopbar } from './components/layout/AdminTopbar'
import { GlobalSearch } from './components/layout/GlobalSearch'
import { LeadAssignmentNotifier } from './components/notifications/LeadAssignmentNotifier'
import { useAdminStore } from './store/useAdminStore'

export function AdminShell() {
  const { session, fetchSettings } = useAdminStore()
  const location = useLocation()

  useEffect(() => {
    fetchSettings()
  }, [])

  if (!session.isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  if (session.user?.role === 'sales_closer' && location.pathname === '/admin') {
    return <Navigate to="/admin/crm" replace />
  }

  return (
    <div className="admin-shell">
      <div className="admin-layout">
        <AdminSidebar />
        <AdminTopbar />
        <GlobalSearch />
        <LeadAssignmentNotifier />
        <main className="admin-main">
          <div className="admin-page">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
