import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Navigation } from './components/layout/Navigation'
import { Footer } from './components/layout/Footer'
import { HomePage } from './pages/HomePage'
import { FleetPage } from './pages/FleetPage'
import { VehicleDetailPage } from './pages/VehicleDetailPage'
import { JourneyPlannerPage } from './pages/JourneyPlannerPage'

// Shuttle Floor Pages
import { ShuttleRoutesPage } from './pages/shuttles/ShuttleRoutesPage'
import { SelectStopsPage } from './pages/shuttles/SelectStopsPage'
import { AvailableTripsPage } from './pages/shuttles/AvailableTripsPage'
import { TripDetailsPage } from './pages/shuttles/TripDetailsPage'
import { PaymentPage } from './pages/shuttles/PaymentPage'
import { BookingConfirmationPage } from './pages/shuttles/BookingConfirmationPage'
import { LiveTripPage } from './pages/shuttles/LiveTripPage'
import { TripCompletePage } from './pages/shuttles/TripCompletePage'
import { ShuttleAccountPage } from './pages/shuttles/ShuttleAccountPage'
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPage'
import { TermsOfServicePage } from './pages/legal/TermsOfServicePage'
import { CookiePolicyPage } from './pages/legal/CookiePolicyPage'
import { QuotePaymentPage } from './pages/QuotePaymentPage'
import { BlogListPage } from './pages/blog/BlogListPage'
import { BlogPostPage } from './pages/blog/BlogPostPage'

import { LeadCaptureModal } from './components/sections/LeadCaptureModal'
import { InternationalModal } from './components/sections/InternationalModal'
import { CookieConsentBanner } from './components/layout/CookieConsentBanner'
import { AdminRouter } from './admin/AdminRouter'
import { APIProvider } from '@vis.gl/react-google-maps'
import { GOOGLE_MAPS_API_KEY, subscribeBackendServiceConfig } from './config/api'

function ScrollToTopAndHash() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const timer = setTimeout(() => {
        const id = hash.replace('#', '')
        const elem = document.getElementById(id)
        if (elem) {
          const navHeight = 80
          const elementPosition = elem.getBoundingClientRect().top + window.pageYOffset
          window.scrollTo({
            top: Math.max(0, elementPosition - navHeight),
            behavior: 'smooth'
          })
        }
      }, 100)
      return () => clearTimeout(timer)
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash])
  return null
}

function AppContent() {
  const { pathname } = useLocation()
  const isPlanner = pathname.startsWith('/plan')
  const isAdmin = pathname.startsWith('/admin')

  // Admin routes render in complete isolation — no public shell
  if (isAdmin) {
    return (
      <>
        <ScrollToTopAndHash />
        <AdminRouter />
      </>
    )
  }

  return (
    <>
      <ScrollToTopAndHash />
      <a
        href="#main-content"
        style={{
          position: 'absolute',
          top: '-100%',
          left: '1rem',
          zIndex: 999,
          background: 'var(--color-nets-navy)',
          color: 'white',
          padding: '0.75rem 1.5rem',
          borderRadius: '2px',
          fontSize: 'var(--font-size-body-sm)',
          fontWeight: 600,
          transition: 'top 0.15s',
          textDecoration: 'none',
        }}
        onFocus={(e) => (e.currentTarget.style.top = '1rem')}
        onBlur={(e) => (e.currentTarget.style.top = '-100%')}
      >
        Skip to main content
      </a>

      {!isPlanner && <Navigation />}

      <main id="main-content" style={isPlanner ? { display: 'flex', flexDirection: 'column', minHeight: '100vh' } : {}}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/fleet" element={<FleetPage />} />
          <Route path="/fleet/:vehicleSlug" element={<VehicleDetailPage />} />
          <Route path="/plan" element={<JourneyPlannerPage />} />

          {/* Shuttle Booking Floor Routes */}
          <Route path="/shuttles" element={<ShuttleRoutesPage />} />
          <Route path="/shuttles/stops" element={<SelectStopsPage />} />
          <Route path="/shuttles/trips" element={<AvailableTripsPage />} />
          <Route path="/shuttles/details" element={<TripDetailsPage />} />
          <Route path="/shuttles/payment" element={<PaymentPage />} />
          <Route path="/shuttles/confirmation/:bookingId" element={<BookingConfirmationPage />} />
          <Route path="/shuttles/live/:bookingId" element={<LiveTripPage />} />
          <Route path="/shuttles/complete/:bookingId" element={<TripCompletePage />} />
          <Route path="/shuttles/account" element={<ShuttleAccountPage />} />

          {/* Legal Pages */}
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="/cookies" element={<CookiePolicyPage />} />
          <Route path="/cookie-policy" element={<CookiePolicyPage />} />

          {/* Sharable Quote Checkout & Payment */}
          <Route path="/pay/:quoteRef" element={<QuotePaymentPage />} />
          <Route path="/quotes/pay/:quoteRef" element={<QuotePaymentPage />} />
          <Route path="/quote/:quoteRef/pay" element={<QuotePaymentPage />} />

          {/* Public Blog & Insights */}
          <Route path="/blog" element={<BlogListPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
        </Routes>
      </main>

      {!isPlanner && <Footer />}
      <LeadCaptureModal />
      <InternationalModal />
      <CookieConsentBanner />
    </>
  )
}

function App() {
  const [mapsKey, setMapsKey] = useState(GOOGLE_MAPS_API_KEY)

  useEffect(() => {
    return subscribeBackendServiceConfig(cfg => {
      if (cfg.googleMapsApiKey) {
        setMapsKey(cfg.googleMapsApiKey)
      }
    })
  }, [])

  return (
    <APIProvider apiKey={mapsKey}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </APIProvider>
  )
}

export default App
