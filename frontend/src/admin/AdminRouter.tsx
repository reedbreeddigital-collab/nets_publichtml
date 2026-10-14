// ============================================================================
// NETS Admin — Router (all /admin/* routes)
// ============================================================================
import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminShell } from './AdminShell'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { DashboardHome } from './pages/DashboardHome'
import { CRMPage } from './pages/CRMPage'
import { QuotesPage } from './pages/QuotesPage'
import { BookingsPage } from './pages/BookingsPage'
import { CustomersPage } from './pages/CustomersPage'
import { FleetManagementPage } from './pages/FleetManagementPage'
import { PricingAdminPage } from './pages/PricingAdminPage'
import { MediaPage } from './pages/MediaPage'
import { PromotionsPage } from './pages/PromotionsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { UsersPage } from './pages/UsersPage'
import { ActivityLogPage } from './pages/ActivityLogPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProfilePage } from './pages/ProfilePage'
import { AdminBlogCMSPage } from './pages/blog/AdminBlogCMSPage'
import { AdminBlogCreatePage } from './pages/blog/AdminBlogCreatePage'

export function AdminRouter() {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminShell />}>
        <Route index element={<DashboardHome />} />
        <Route path="crm" element={<CRMPage />} />
        <Route path="quotes" element={<QuotesPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="fleet" element={<FleetManagementPage />} />
        <Route path="pricing" element={<PricingAdminPage />} />
        <Route path="media" element={<MediaPage />} />
        <Route path="promotions" element={<PromotionsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="cms/blog" element={<AdminBlogCMSPage />} />
        <Route path="cms/blog/create" element={<AdminBlogCreatePage />} />
        <Route path="blog" element={<Navigate to="/admin/cms/blog" replace />} />
        <Route path="blog/create" element={<Navigate to="/admin/cms/blog/create" replace />} />
        <Route path="blog/editor" element={<Navigate to="/admin/cms/blog/create" replace />} />
        <Route path="editor" element={<Navigate to="/admin/cms/blog/create" replace />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="activity" element={<ActivityLogPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  )
}
