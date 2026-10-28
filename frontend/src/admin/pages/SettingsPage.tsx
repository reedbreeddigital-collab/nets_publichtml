// ============================================================================
// NETS Admin — System Settings
// ============================================================================
import { useState, useEffect } from 'react'
import { Save, Eye, EyeOff } from 'lucide-react'
import { useAdminStore } from '../store/useAdminStore'
import { fetchBackendServiceConfig, type BackendServiceConfig } from '../../config/api'

export function SettingsPage() {
  const { settings, updateSettings, fetchSettings } = useAdminStore()
  const [form, setForm] = useState({ ...settings })
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [backendConfig, setBackendConfig] = useState<BackendServiceConfig | null>(null)

  useEffect(() => {
    fetchSettings().then(() => {
      setForm(useAdminStore.getState().settings)
    })
    fetchBackendServiceConfig().then(cfg => {
      if (cfg) setBackendConfig(cfg)
    })
  }, [])

  const handleSave = () => {
    updateSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="admin-card" style={{ marginBottom: '1.25rem' }}>
      <div className="admin-pricing-section-title">{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>{children}</div>
    </div>
  )

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="admin-page-title">System Settings</div>
          <div className="admin-page-desc">Platform configuration, contact information, and integration settings.</div>
        </div>
        <div className="admin-page-actions">
          <button className="admin-btn admin-btn-primary" onClick={handleSave}><Save size={13} /> {saved ? 'Saved ✓' : 'Save Settings'}</button>
        </div>
      </div>

      {saved && <div className="admin-alert admin-alert-success" style={{ marginBottom: '1.25rem' }}>✓ Settings saved successfully.</div>}

      <div className="admin-grid-2" style={{ gap: '1.5rem', alignItems: 'start' }}>
        <div>
          <Section title="Business Information">
            <div className="admin-form-group">
              <label className="admin-label">Business Name</label>
              <input className="admin-input" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Business Address</label>
              <input className="admin-input" value={form.businessAddress} onChange={e => setForm(f => ({ ...f, businessAddress: e.target.value }))} />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Email Address</label>
              <input className="admin-input" type="email" value={form.businessEmail} onChange={e => setForm(f => ({ ...f, businessEmail: e.target.value }))} />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Phone Number</label>
              <input className="admin-input" value={form.businessPhone} onChange={e => setForm(f => ({ ...f, businessPhone: e.target.value }))} />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">WhatsApp Number</label>
              <input className="admin-input" value={form.businessWhatsApp} onChange={e => setForm(f => ({ ...f, businessWhatsApp: e.target.value }))} />
            </div>
          </Section>

          <Section title="Operations">
            <div className="admin-form-group">
              <label className="admin-label">Operating Hours</label>
              <input className="admin-input" value={form.operatingHours} onChange={e => setForm(f => ({ ...f, operatingHours: e.target.value }))} />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Service Areas (comma separated)</label>
              <input className="admin-input"
                value={form.serviceAreas.join(', ')}
                onChange={e => setForm(f => ({ ...f, serviceAreas: e.target.value.split(',').map(s => s.trim()) }))} />
            </div>
          </Section>
        </div>

        <div>
          <Section title="API & Integrations">
            <div className="admin-form-group">
              <label className="admin-label">Google Maps API Key</label>
              <div style={{ position: 'relative' }}>
                <input className="admin-input" type={showKey ? 'text' : 'password'}
                  value={form.googleMapsApiKey} onChange={e => setForm(f => ({ ...f, googleMapsApiKey: e.target.value }))}
                  style={{ paddingRight: '2.5rem' }} />
                <button type="button"
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-3)' }}
                  onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Meta (Facebook) Pixel ID</label>
              <input className="admin-input" placeholder="e.g. 1234567890" value={form.metaPixelId || ''} onChange={e => setForm(f => ({ ...f, metaPixelId: e.target.value }))} />
              <div style={{ color: 'var(--adm-text-3)', fontSize: 12, marginTop: 4 }}>Used for tracking PageViews and Purchases on the Planner.</div>
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Pricing Engine Version</label>
              <input className="admin-input" value={form.pricingEngineVersion} disabled style={{ opacity: 0.5 }} />
            </div>
          </Section>

          <Section title="Email Notifications">
            <div className="admin-form-group">
              <label className="admin-label">Admin Notification Emails</label>
              <input className="admin-input" placeholder="e.g. admin@neweratransports.com, sales@neweratransports.com" value={form.adminNotificationEmails || ''} onChange={e => setForm(f => ({ ...f, adminNotificationEmails: e.target.value }))} />
              <div style={{ color: 'var(--adm-text-3)', fontSize: 12, marginTop: 4 }}>Comma-separated list of emails to receive system alerts.</div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: 13, color: 'var(--adm-text-1)' }}>
                <input type="checkbox" checked={form.notificationNewBooking !== false} onChange={e => setForm(f => ({ ...f, notificationNewBooking: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--adm-accent)' }} />
                Notify Admin on New Booking
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: 13, color: 'var(--adm-text-1)' }}>
                <input type="checkbox" checked={form.notificationLeadAssigned !== false} onChange={e => setForm(f => ({ ...f, notificationLeadAssigned: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--adm-accent)' }} />
                Automatically Notify Sales Closer on Lead Assignment
              </label>
            </div>
          </Section>

          <Section title="Email Templates">
            <div style={{ padding: '0.75rem', background: 'var(--adm-surface-2)', borderRadius: 'var(--adm-radius-sm)', fontSize: 13 }}>
              <div style={{ fontWeight: 500, color: 'var(--adm-text-1)', marginBottom: '0.375rem' }}>Customer Confirmation Email</div>
              <div style={{ color: 'var(--adm-text-3)', fontSize: 12 }}>Sent automatically when a quote is submitted via the Journey Planner.</div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--adm-surface-2)', borderRadius: 'var(--adm-radius-sm)', fontSize: 13 }}>
              <div style={{ fontWeight: 500, color: 'var(--adm-text-1)', marginBottom: '0.375rem' }}>Internal Notification Email</div>
              <div style={{ color: 'var(--adm-text-3)', fontSize: 12 }}>Sent to the ops team when a new quote is received.</div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--adm-surface-2)', borderRadius: 'var(--adm-radius-sm)', fontSize: 13 }}>
              <div style={{ fontWeight: 500, color: 'var(--adm-text-1)', marginBottom: '0.375rem' }}>Booking Confirmation Email</div>
              <div style={{ color: 'var(--adm-text-3)', fontSize: 12 }}>Sent when a booking is confirmed and assigned a driver.</div>
            </div>
            <div style={{ fontSize: 12, padding: '0.5rem', borderRadius: 'var(--adm-radius-sm)', background: 'var(--adm-warning-subtle)', color: 'var(--adm-warning)' }}>
              Full email template editor available in Phase 9 (requires backend CMS integration).
            </div>
          </Section>

          <div className="admin-card">
            <div className="admin-card-title">Platform & Database Information</div>
            {[
              ['Version', 'Phase 8 — Enterprise Operations Control Center'],
              ['Build', '2026-07.08.0'],
              ['Pricing Engine', `v${form.pricingEngineVersion}`],
              ['Environment', backendConfig?.environment || 'Production'],
              ['Database Engine', backendConfig ? `${backendConfig.databaseDriver.toUpperCase()} (${backendConfig.databaseStatus})` : 'PostgreSQL (Neon)'],
              ['Database URL (from Backend)', backendConfig?.databaseUrl || 'Connected via Backend .env'],
              ['Cloudinary Cloud (from Backend)', backendConfig?.cloudinaryCloud || 'Configured in Backend .env'],
            ].map(([l, v]) => (
              <div key={l as string} className="admin-detail-row">
                <span className="admin-detail-label">{l}</span>
                <span className="admin-detail-value" style={{ fontSize: 12, wordBreak: 'break-all' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
