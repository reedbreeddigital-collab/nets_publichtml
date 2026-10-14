// ============================================================================
// NETS Admin — Global Search Overlay
// ============================================================================
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, FileText, CalendarCheck, Users, Truck, Newspaper, Edit3 } from 'lucide-react'
import { useAdminStore } from '../../store/useAdminStore'

export function GlobalSearch() {
  const { searchQuery, searchOpen, setSearchQuery, setSearchOpen, quotes, bookings, customers, vehicles } = useAdminStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const q = searchQuery.toLowerCase()

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50)
  }, [searchOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) }
      if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setSearchOpen, setSearchQuery])

  if (!searchOpen) return null

  const matchedQuotes = q.length > 1 ? quotes.filter(x =>
    x.reference.toLowerCase().includes(q) || x.customerName.toLowerCase().includes(q) ||
    x.pickup.toLowerCase().includes(q) || x.destination.toLowerCase().includes(q)
  ).slice(0, 4) : []

  const matchedBookings = q.length > 1 ? bookings.filter(x =>
    x.reference.toLowerCase().includes(q) || x.customerName.toLowerCase().includes(q) ||
    x.pickup.toLowerCase().includes(q) || x.destination.toLowerCase().includes(q)
  ).slice(0, 4) : []

  const matchedCustomers = q.length > 1 ? customers.filter(x =>
    x.fullName.toLowerCase().includes(q) || x.email.toLowerCase().includes(q) ||
    x.company?.toLowerCase().includes(q)
  ).slice(0, 4) : []

  const matchedVehicles = q.length > 1 ? vehicles.filter(x =>
    x.name.toLowerCase().includes(q) || x.registrationNumber.toLowerCase().includes(q)
  ).slice(0, 3) : []

  const matchedEditorial = q.length > 1 && ('blog cms editor article post publish write content'.includes(q) || 'blog'.includes(q)) ? [
    { title: 'Blog CMS & Posts', sub: 'Manage articles, categories, comments', path: '/admin/cms/blog', icon: Newspaper },
    { title: 'Blog Editor', sub: 'Write and publish new blog article', path: '/admin/cms/blog/create', icon: Edit3 },
  ] : []

  const hasResults = matchedQuotes.length + matchedBookings.length + matchedCustomers.length + matchedVehicles.length + matchedEditorial.length > 0

  const go = (path: string) => {
    navigate(path); setSearchOpen(false); setSearchQuery('')
  }

  const fmt = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`

  return (
    <div className="admin-search-overlay" onClick={() => { setSearchOpen(false); setSearchQuery('') }}>
      <div className="admin-search-box" onClick={e => e.stopPropagation()}>
        <div className="admin-search-input-wrap">
          <Search size={16} color="var(--adm-text-3)" />
          <input ref={inputRef} className="admin-search-input"
            placeholder="Search quotes, bookings, blog, customers..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <button className="admin-btn admin-btn-icon admin-btn-ghost" onClick={() => { setSearchOpen(false); setSearchQuery('') }}>
            <X size={14} />
          </button>
        </div>

        <div className="admin-search-results">
          {q.length <= 1 && (
            <div className="admin-search-empty">Start typing to search across all records</div>
          )}
          {q.length > 1 && !hasResults && (
            <div className="admin-search-empty">No results found for "{searchQuery}"</div>
          )}

          {matchedEditorial.length > 0 && (
            <div className="admin-search-group">
              <div className="admin-search-group-label">Editorial & Content</div>
              {matchedEditorial.map(ed => {
                const Icon = ed.icon
                return (
                  <div key={ed.path} className="admin-search-result" onClick={() => go(ed.path)}>
                    <div className="admin-search-result-icon"><Icon size={14} color="var(--adm-text-2)" /></div>
                    <div>
                      <div className="admin-search-result-title">{ed.title}</div>
                      <div className="admin-search-result-sub">{ed.sub}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {matchedQuotes.length > 0 && (
            <div className="admin-search-group">
              <div className="admin-search-group-label">Quotes</div>
              {matchedQuotes.map(q => (
                <div key={q.id} className="admin-search-result" onClick={() => go('/admin/quotes')}>
                  <div className="admin-search-result-icon"><FileText size={14} color="var(--adm-text-2)" /></div>
                  <div>
                    <div className="admin-search-result-title">{q.reference}</div>
                    <div className="admin-search-result-sub">{q.customerName} · {fmt(q.estimatedInvestment)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {matchedBookings.length > 0 && (
            <div className="admin-search-group">
              <div className="admin-search-group-label">Bookings</div>
              {matchedBookings.map(b => (
                <div key={b.id} className="admin-search-result" onClick={() => go('/admin/bookings')}>
                  <div className="admin-search-result-icon"><CalendarCheck size={14} color="var(--adm-text-2)" /></div>
                  <div>
                    <div className="admin-search-result-title">{b.reference}</div>
                    <div className="admin-search-result-sub">{b.customerName} · {b.pickup} → {b.destination}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {matchedCustomers.length > 0 && (
            <div className="admin-search-group">
              <div className="admin-search-group-label">Customers</div>
              {matchedCustomers.map(c => (
                <div key={c.id} className="admin-search-result" onClick={() => go('/admin/customers')}>
                  <div className="admin-search-result-icon"><Users size={14} color="var(--adm-text-2)" /></div>
                  <div>
                    <div className="admin-search-result-title">{c.fullName}</div>
                    <div className="admin-search-result-sub">{c.company ?? 'Individual'} · {c.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {matchedVehicles.length > 0 && (
            <div className="admin-search-group">
              <div className="admin-search-group-label">Vehicles</div>
              {matchedVehicles.map(v => (
                <div key={v.id} className="admin-search-result" onClick={() => go('/admin/fleet')}>
                  <div className="admin-search-result-icon"><Truck size={14} color="var(--adm-text-2)" /></div>
                  <div>
                    <div className="admin-search-result-title">{v.name}</div>
                    <div className="admin-search-result-sub">{v.registrationNumber} · {v.category}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
