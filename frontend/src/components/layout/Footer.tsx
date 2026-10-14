import { Link } from 'react-router-dom'

const footerSections = [
  {
    title: 'Services',
    links: [
      { label: 'Bus Rental',                href: '#' },
      { label: 'Corporate Transport',        href: '#' },
      { label: 'Car Rental',                 href: '#' },
      { label: 'Fleet Management',           href: '#' },
      { label: 'Parcel Delivery',            href: '#' },
    ],
  },
  {
    title: 'Fleet',
    links: [
      { label: 'View All Fleet',             href: '/fleet', isRoute: true },
      { label: 'Toyota HiAce',               href: '/fleet/toyota-hiace', isRoute: true },
      { label: 'Toyota Coaster',             href: '/fleet/toyota-coaster', isRoute: true },
      { label: 'Executive SUV',              href: '/fleet/executive-suv', isRoute: true },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About NETS',                 href: '#' },
      { label: 'Blog & Insights',            href: '/blog', isRoute: true },
      { label: 'Industries We Serve',        href: '#' },
      { label: 'Careers',                    href: '#' },
      { label: 'Contact Sales',              href: '#' },
      { label: 'Plan Your Journey',          href: '/plan', isRoute: true },
    ],
  },
]

export function Footer() {
  return (
    <footer id="contact" role="contentinfo" style={{ background: 'var(--color-nets-navy-dark)' }}>
      {/* Top accent */}
      <div style={{ height: '3px', background: 'var(--color-nets-navy)' }} />

      <div className="container-nets" style={{ paddingTop: '5rem', paddingBottom: '4rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>

          {/* Brand */}
          <div style={{ gridColumn: 'span 12' }} className="lg:col-span-4">
            <Link to="/" style={{ display: 'inline-block', marginBottom: '1.5rem', transition: 'opacity 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              <img src="/logo-white-final.png" alt="New Era Transport Services Logo" style={{ height: '56px', width: 'auto', objectFit: 'contain' }} />
            </Link>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Nigeria's trusted transportation partner delivering premium bus rental, executive travel, airport transfers and mobility solutions.
            </p>

            {/* Contact quick */}
            {[
              { label: 'Phone',    value: '+234 916 791 9439  |  +234 803 300 6805' },
              { label: 'Email',    value: 'info@neweratransports.com' },
              { label: 'Location', value: 'No. 2 Raji Rasaki, before linked bridge, Amuwo-Odofin, Lagos, Nigeria' },
            ].map(c => (
              <div key={c.label} style={{ display: 'flex', gap: '1rem', marginBottom: '0.625rem', alignItems: 'flex-start' }}>
                <span style={{
                  fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em',
                  color: 'var(--color-nets-red)', textTransform: 'uppercase',
                  width: '52px', flexShrink: 0, paddingTop: '1px',
                }}>{c.label}</span>
                <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>{c.value}</span>
              </div>
            ))}
          </div>

          {/* Nav columns */}
          <div
            style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}
            className="lg:col-span-7 lg:col-start-6"
          >
            {footerSections.map(sec => (
              <div key={sec.title}>
                <h3 style={{
                  fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.15em',
                  textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
                  marginBottom: '1.5rem',
                }}>
                  {sec.title}
                </h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {sec.links.map(lk => {
                    const style = { fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', transition: 'color 0.15s ease' }
                    const onEnter = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.color = '#fff')
                    const onLeave = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')
                    
                    return (
                      <li key={lk.label}>
                        {(lk as any).isRoute ? (
                          <Link to={lk.href} style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}>
                            {lk.label}
                          </Link>
                        ) : (
                          <a href={lk.href} style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}>
                            {lk.label}
                          </a>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container-nets" style={{
          paddingTop: '1.5rem', paddingBottom: '1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '1rem',
        }}>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.25)' }}>
            © {new Date().getFullYear()} New Era Transport Services Ltd · RC 0000000 · All rights reserved
          </p>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {[
              { label: 'Privacy Policy',   href: '/privacy' },
              { label: 'Terms of Service', href: '/terms' },
              { label: 'Cookie Policy',    href: '/cookies' },
            ].map((l, i) => (
              <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {i > 0 && <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.75rem' }}>·</span>}
                <Link to={l.href} style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
                  {l.label}
                </Link>
              </span>
            ))}
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.75rem' }}>·</span>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('nets_open_cookie_preferences'))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  fontSize: '0.8125rem',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              >
                Cookie Settings
              </button>
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="https://www.instagram.com/nets_logistics/" target="_blank" rel="noopener noreferrer" aria-label="NETS on Instagram"
              style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.3)', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
              Instagram
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
