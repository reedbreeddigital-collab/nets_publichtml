import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { useJourneyStore } from '../../store/useJourneyStore'

const desktopNavLinks = [
  { label: 'Book Shuttle', href: '/shuttles',  isHash: false },
  { label: 'Services',     href: '/#services', isHash: true },
  { label: 'Fleet',        href: '/fleet',     isHash: false },
  { label: 'Blog',         href: '/blog',      isHash: false },
  { label: 'About',        href: '/#about',    isHash: true },
  { label: 'Contact',      href: '/#contact',  isHash: true },
]

const mobileNavLinks = [
  { label: 'Book Shuttle',      href: '/shuttles',  isHash: false },
  { label: 'Services',          href: '/#services', isHash: true },
  { label: 'Fleet',             href: '/fleet',     isHash: false },
  { label: 'Blog',              href: '/blog',      isHash: false },
  { label: 'About Us',          href: '/#about',    isHash: true },
  { label: 'Contact',           href: '/#contact',  isHash: true },
  { label: 'Plan Your Journey', href: '/plan',      isHash: false },
  { label: 'Contact Sales',     href: 'https://wa.me/2349167919439', isHash: false },
]

export function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { setLeadModalOpen, setLeadModalNextAction } = useJourneyStore()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const isActive = (href: string, isHash: boolean) => {
    if (isHash) return location.hash === href.replace('/', '')
    return location.pathname === href
  }

  const handlePlanJourney = (e: React.MouseEvent) => {
    e.preventDefault()
    setMobileOpen(false)
    setLeadModalNextAction('planner')
    setLeadModalOpen(true)
  }

  return (
    <>
      <header
        role="banner"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          height: '72px',
          display: 'flex', alignItems: 'center',
          background: scrolled ? 'var(--color-nets-navy-dark)' : 'transparent',
          boxShadow: scrolled ? '0 1px 0 rgba(255,255,255,0.06)' : 'none',
          transition: 'background 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        <div className="container-nets" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>

          {/* Logo */}
          <Link to="/" aria-label="New Era Transport Services" style={{ display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'opacity 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <img src="/logo-white-final.png" alt="New Era Transport Services Logo" style={{ height: 'clamp(40px, 5vw, 48px)', width: 'auto', objectFit: 'contain' }} />
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Primary Desktop" style={{ gap: '2.5rem', alignItems: 'center' }} className="nav-desktop">
            {desktopNavLinks.map(l => (
              l.isHash ? 
                <a key={l.label} href={l.href} className="nav-link">{l.label}</a> :
                <Link key={l.label} to={l.href} className="nav-link">{l.label}</Link>
            ))}
            <button onClick={handlePlanJourney} className="btn btn-red" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}>
              Plan Your Journey
            </button>
          </nav>

          {/* Desktop actions */}
          <div style={{ alignItems: 'center', gap: '1.25rem' }} className="nav-desktop-actions">
            <a href="tel:+2349167919439" style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
              +234 916 791 9439
            </a>
            <a href="https://wa.me/2349167919439" target="_blank" rel="noopener noreferrer" className="btn btn-red btn-sm">Contact Sales</a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="nav-mobile-toggle"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            style={{ background: 'none', border: 'none', padding: '0.5rem', flexDirection: 'column', gap: '5px', flexShrink: 0 }}
          >
            {[0,1,2].map(i => (
              <span key={i} style={{ display: 'block', width: '24px', height: '2px', background: '#fff', borderRadius: '1px' }} />
            ))}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div key="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} />

            <motion.div key="dr" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              role="dialog" aria-modal aria-label="Navigation"
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '400px',
                zIndex: 300, background: 'var(--color-nets-navy-dark)',
                display: 'flex', flexDirection: 'column', padding: '2rem',
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexShrink: 0 }}>
                <img src="/logo-white-final.png" alt="New Era Transport Services Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
                <button onClick={() => setMobileOpen(false)} aria-label="Close menu"
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '1.5rem', padding: '0.5rem' }}>✕</button>
              </div>

              <nav aria-label="Mobile Navigation" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {mobileNavLinks.map((l, i) => {
                  const active = isActive(l.href, l.isHash)
                  const content = (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + (i * 0.05), duration: 0.3, ease: 'easeOut' }}
                      style={{ 
                        padding: '1rem', 
                        fontSize: '1.25rem', 
                        fontWeight: active ? 600 : 500, 
                        color: active ? 'var(--color-nets-red)' : '#fff', 
                        borderLeft: active ? '3px solid var(--color-nets-red)' : '3px solid transparent',
                        background: active ? 'rgba(192, 39, 45, 0.05)' : 'transparent',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {l.label}
                    </motion.div>
                  )
                  const isExternal = l.href.startsWith('http')
                  
                  if (isExternal) {
                    return (<a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)} style={{ display: 'block', textDecoration: 'none' }}>{content}</a>)
                  }
                  
                  return l.isHash ? 
                    (<a key={l.label} href={l.href} onClick={() => setMobileOpen(false)} style={{ display: 'block', textDecoration: 'none' }}>{content}</a>) :
                    (<Link key={l.label} to={l.href} onClick={() => setMobileOpen(false)} style={{ display: 'block', textDecoration: 'none' }}>{content}</Link>)
                })}
              </nav>

              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.3 }}
                style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}
              >
                <button onClick={handlePlanJourney} className="btn btn-red" style={{ width: '100%', justifyContent: 'center', padding: '1rem', border: 'none', cursor: 'pointer' }}>
                  Plan Your Journey
                </button>

                {/* Contact Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <a href="tel:+2349167919439" style={{ fontSize: '0.875rem', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Phone</span> +234 916 791 9439 / +234 803 300 6805
                  </a>
                  <a href="mailto:info@neweratransports.com" style={{ fontSize: '0.875rem', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Email</span> info@neweratransports.com
                  </a>
                  <div style={{ fontSize: '0.875rem', color: '#fff', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Office</span> 
                    <span>No. 2 Raji Rasaki, before linked bridge, Amuwo-Odofin, Lagos, Nigeria</span>
                  </div>
                </div>

                {/* Socials */}
                <div style={{ display: 'flex', gap: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <a href="https://www.instagram.com/nets_logistics/" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Instagram</a>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
