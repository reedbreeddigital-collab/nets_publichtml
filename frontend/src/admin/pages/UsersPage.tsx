// ============================================================================
// NETS Admin — User Management
// ============================================================================
import { useState, useEffect } from 'react'
import { Plus, X, Save, Edit2, Trash2 } from 'lucide-react'
import { useAdminStore, type AdminUser } from '../store/useAdminStore'
import { adminService, AdminUserDB } from '../services/adminService'

const roleLabels: Record<string, string> = {
  'admin': 'Admin', 'super-admin': 'Admin',
  'staff': 'Staff', 'ops-manager': 'Staff', 'sales-manager': 'Staff',
  'sales-exec': 'Staff', 'finance': 'Staff', 'support': 'Staff', 'marketing': 'Staff',
  'sales_closer': 'Sales Closer',
}
const roleBadge: Record<string, string> = {
  'admin': 'admin-badge-accent', 'super-admin': 'admin-badge-accent',
  'staff': 'admin-badge-green', 'ops-manager': 'admin-badge-green',
  'sales-manager': 'admin-badge-green', 'sales-exec': 'admin-badge-green',
  'finance': 'admin-badge-green', 'support': 'admin-badge-green', 'marketing': 'admin-badge-green',
  'sales_closer': 'admin-badge-yellow',
}

const permissionMatrix: { module: string; admin: boolean; staff: boolean; sales_closer: boolean }[] = [
  { module: 'Dashboard', admin: true, staff: true, sales_closer: false },
  { module: 'Quotes', admin: true, staff: true, sales_closer: false },
  { module: 'Bookings', admin: true, staff: true, sales_closer: false },
  { module: 'Customers', admin: true, staff: true, sales_closer: false },
  { module: 'Blog CMS & Editor', admin: true, staff: true, sales_closer: false },
  { module: 'Fleet', admin: true, staff: false, sales_closer: false },
  { module: 'Pricing', admin: true, staff: false, sales_closer: false },
  { module: 'Media', admin: true, staff: false, sales_closer: false },
  { module: 'Promotions', admin: true, staff: false, sales_closer: false },
  { module: 'Analytics', admin: true, staff: false, sales_closer: false },
  { module: 'User Management', admin: true, staff: false, sales_closer: false },
  { module: 'Activity Log', admin: true, staff: false, sales_closer: false },
  { module: 'Settings', admin: true, staff: false, sales_closer: false },
  { module: 'CRM Leads', admin: true, staff: true, sales_closer: true },
]

export function UsersPage() {
  const [users, setUsers] = useState<AdminUserDB[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUserDB | null>(null)
  const [showMatrix, setShowMatrix] = useState(false)

  const loadUsers = () => {
    setLoading(true)
    adminService.getUsers().then(list => {
      setUsers(list || [])
      setLoading(false)
    })
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active'
    await adminService.updateUserStatus(id, nextStatus)
    loadUsers()
  }

  const handleAddUser = async (userForm: Partial<AdminUserDB>) => {
    await adminService.saveUser(userForm)
    loadUsers()
  }

  const handleEditUser = async (userForm: Partial<AdminUserDB>) => {
    if (editingUser) {
      await adminService.updateUser(editingUser.id, userForm)
      loadUsers()
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await adminService.deleteUser(id)
      loadUsers()
    }
  }

  const fmtDate = (iso?: string) => {
    if (!iso) return 'Never'
    try {
      return new Date(iso).toLocaleDateString('en-NG', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    } catch {
      return iso
    }
  }

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="admin-page-title">User Management</div>
          <div className="admin-page-desc">{users.filter(u => u.status === 'active').length} active users across 2 user types (Admin & Staff)</div>
        </div>
        <div className="admin-page-actions">
          <button className="admin-btn admin-btn-ghost" onClick={() => setShowMatrix(true)}>Permission Matrix</button>
          <button className="admin-btn admin-btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Add User</button>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last Login</th><th></th></tr></thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={5} className="admin-table-empty">No admin users found in database</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="admin-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                        {u.fullName ? u.fullName.split(' ').map(n => n[0]).join('').slice(0,2) : 'US'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{u.fullName}</div>
                        <div style={{ fontSize: 11, color: 'var(--adm-text-3)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`admin-badge ${roleBadge[u.role] ?? 'admin-badge-gray'}`}>{roleLabels[u.role] ?? u.role}</span></td>
                  <td><span className={`admin-badge ${u.status === 'active' ? 'admin-badge-green' : 'admin-badge-gray'}`}>{u.status}</span></td>
                  <td style={{ fontSize: 13, color: 'var(--adm-text-2)' }}>{fmtDate(u.lastLogin)}</td>
                  <td style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button className="admin-btn admin-btn-ghost admin-btn-sm"
                      onClick={() => handleToggleStatus(u.id, u.status)}>
                      {u.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button className="admin-btn admin-btn-icon admin-btn-ghost admin-btn-sm" title="Edit" onClick={() => setEditingUser(u)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="admin-btn admin-btn-icon admin-btn-ghost admin-btn-sm" style={{ color: 'var(--adm-red)' }} title="Delete" onClick={() => handleDeleteUser(u.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Permission Matrix */}
      {showMatrix && (
        <div className="admin-modal-backdrop" onClick={() => setShowMatrix(false)}>
          <div className="admin-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <span className="admin-modal-title">Permission Matrix</span>
              <button className="admin-btn admin-btn-icon admin-btn-ghost" onClick={() => setShowMatrix(false)}><X size={14} /></button>
            </div>
            <div style={{ padding: '1.25rem', overflowX: 'auto' }}>
              <table className="admin-table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Module</th>
                    <th style={{ textAlign: 'center' }}>Admin</th>
                    <th style={{ textAlign: 'center' }}>Staff</th>
                    <th style={{ textAlign: 'center' }}>Sales Closer</th>
                  </tr>
                </thead>
                <tbody>
                  {permissionMatrix.map(row => (
                    <tr key={row.module}>
                      <td style={{ fontWeight: 500 }}>{row.module}</td>
                      <td style={{ textAlign: 'center', color: row.admin ? 'var(--adm-success)' : 'var(--adm-border)' }}>{row.admin ? '✓' : '✗'}</td>
                      <td style={{ textAlign: 'center', color: row.staff ? 'var(--adm-success)' : 'var(--adm-border)' }}>{row.staff ? '✓' : '✗'}</td>
                      <td style={{ textAlign: 'center', color: row.sales_closer ? 'var(--adm-success)' : 'var(--adm-border)' }}>{row.sales_closer ? '✓' : '✗'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onSave={handleAddUser} />}

      {/* Edit User Modal */}
      {editingUser && <AddUserModal initialData={editingUser} onClose={() => setEditingUser(null)} onSave={handleEditUser} isEdit />}
    </>
  )
}

function AddUserModal({ onClose, onSave, initialData, isEdit }: any) {
  const [form, setForm] = useState({ 
    fullName: initialData?.fullName || '', 
    email: initialData?.email || '', 
    role: initialData?.role || 'staff', 
    status: initialData?.status || 'active' 
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    await onSave(form)
    setIsSubmitting(false)
    onClose()
  }
  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <span className="admin-modal-title">{isEdit ? 'Edit User' : 'Add New User'}</span>
          <button className="admin-btn admin-btn-icon admin-btn-ghost" onClick={onClose}><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            <div className="admin-form-group">
              <label className="admin-label admin-label-req">Full Name</label>
              <input className="admin-input" required value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div className="admin-form-group">
              <label className="admin-label admin-label-req">Email Address</label>
              <input className="admin-input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Role</label>
              <select className="admin-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="sales_closer">Sales Closer</option>
              </select>
            </div>
          </div>
          <div className="admin-modal-footer">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className={`admin-btn admin-btn-primary ${isSubmitting ? 'is-loading' : ''}`} disabled={isSubmitting}>
              <Save size={13} /> {isEdit ? 'Save Changes' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
