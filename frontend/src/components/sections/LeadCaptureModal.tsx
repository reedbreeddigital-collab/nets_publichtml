import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useJourneyStore, LocationData } from '@/store/useJourneyStore'
import { useNavigate, useLocation } from 'react-router-dom'
import { geocodeAddress } from '@/config/api'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { crmService } from '@/services/crmService'
import { emailService } from '@/services/emailService'

// Simple fallback distance calculation if Mapbox/Google fails
function getFallbackDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180) 
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2)
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
}

export function LeadCaptureModal() {
  const navigate = useNavigate()
  const location = useLocation()
  const routesLibrary = useMapsLibrary('routes')
  const { 
    isLeadModalOpen, 
    setLeadModalOpen, 
    leadModalNextAction,
    customerDetails, 
    setCustomerDetails,
    setStep,
    pickup,
    destination,
    stops,
    setRouteCalculations,
    calculatePricing,
    estimatedInvestment,
    customerPricingView,
    getCRMLeadPayload,
    referenceNumber,
    generateReference
  } = useJourneyStore()

  const [isLoading, setIsLoading] = useState(false)
  const [showQuote, setShowQuote] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  if (!isLeadModalOpen) return null

  const calculateRouteAndPrice = async () => {
    if (!pickup || !destination) return false
    
    setIsLoading(true)
    try {
      let pLat = pickup.lat
      let pLng = pickup.lng
      if (!pLat || !pLng) {
        const coords = await geocodeAddress(pickup.address)
        if (coords) { pLat = coords.lat; pLng = coords.lng }
      }

      let dLat = destination.lat
      let dLng = destination.lng
      if (!dLat || !dLng) {
        const coords = await geocodeAddress(destination.address)
        if (coords) { dLat = coords.lat; dLng = coords.lng }
      }

      if (!pLat || !pLng || !dLat || !dLng) throw new Error('Missing coordinates')

      let totalDistanceMeters = 0
      let totalDurationSeconds = 0
      let routePolyline: any = null

      // Geocode any intermediate stops missing coordinates and update store
      const resolvedWaypoints: { lat: number; lng: number }[] = []
      const updatedStops = [...stops]
      for (let i = 0; i < updatedStops.length; i++) {
        const s = updatedStops[i]
        if (!s || !s.address?.trim()) continue
        let sLat = s.lat
        let sLng = s.lng
        if (!sLat || !sLng) {
          const coords = await geocodeAddress(s.address)
          if (coords) {
            sLat = coords.lat
            sLng = coords.lng
            updatedStops[i] = { ...s, lat: sLat, lng: sLng }
          }
        }
        if (sLat && sLng) {
          resolvedWaypoints.push({ lat: sLat, lng: sLng })
        }
      }
      useJourneyStore.setState({ stops: updatedStops })

      if (routesLibrary) {
        const directionsService = new routesLibrary.DirectionsService()
        
        const request: google.maps.DirectionsRequest = {
          origin: { lat: pLat, lng: pLng },
          destination: { lat: dLat, lng: dLng },
          waypoints: resolvedWaypoints.map((pt) => ({ location: pt, stopover: true })),
          travelMode: google.maps.TravelMode.DRIVING,
        }

        const result = await directionsService.route(request)
        if (result.routes && result.routes.length > 0) {
          const route = result.routes[0]
          route.legs.forEach((leg: google.maps.DirectionsLeg) => {
            totalDistanceMeters += leg.distance?.value || 0
            totalDurationSeconds += leg.duration?.value || 0
          })
          routePolyline = route.overview_polyline
        } else {
          throw new Error('No route found')
        }
      } else {
        throw new Error('Routes library not loaded')
      }

      const distanceKm = Math.max(1.5, Math.round((totalDistanceMeters / 1000) * 10) / 10)
      const durationMins = Math.round(totalDurationSeconds / 60)

      setRouteCalculations({
        distanceKm,
        distanceMeters: totalDistanceMeters,
        durationMins,
        durationSeconds: totalDurationSeconds,
        durationText: `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`,
        routePolyline: routePolyline,
        journeyBounds: null,
        journeyInsights: []
      })
    } catch (err) {
      console.warn('Google Maps fallback', err)
      let dist = 0
      let curLat = pickup?.lat || 0
      let curLng = pickup?.lng || 0
      const validStops = stops.filter((s: LocationData) => s && s.lat && s.lng)
      for (const s of validStops) {
        if (curLat && curLng && s.lat && s.lng) {
          dist += getFallbackDistanceKm(curLat, curLng, s.lat, s.lng)
        }
        curLat = s.lat || 0
        curLng = s.lng || 0
      }
      if (curLat && curLng && destination?.lat && destination?.lng) {
        dist += getFallbackDistanceKm(curLat, curLng, destination.lat, destination.lng)
      } else if (pickup?.lat && pickup?.lng && destination?.lat && destination?.lng) {
        dist = getFallbackDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng)
      }

      const totalKm = Math.max(1.5, Math.round(dist * 10) / 10)
      const totalMins = Math.round(totalKm * 2.5)

      setRouteCalculations({
        distanceKm: totalKm,
        distanceMeters: totalKm * 1000,
        durationMins: totalMins,
        durationSeconds: totalMins * 60,
        durationText: `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`,
        routePolyline: null,
        journeyBounds: null,
        journeyInsights: []
      })
    }
    
    // Now trigger calculate pricing and wait for completion
    await calculatePricing()
    setIsLoading(false)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors = []
    if (!customerDetails.fullName?.trim()) newErrors.push('name')
    if (!customerDetails.email?.trim()) newErrors.push('email')
    if (!customerDetails.phone?.trim()) newErrors.push('phone')
    if (!customerDetails.heardAboutUs?.trim()) newErrors.push('heardAboutUs')
    
    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    if (!referenceNumber) {
      generateReference()
    }

    const pCountry = pickup?.country?.toLowerCase()
    const dCountry = destination?.country?.toLowerCase()
    if ((pCountry && pCountry !== 'nigeria') || (dCountry && dCountry !== 'nigeria')) {
      useJourneyStore.getState().setInternationalModalOpen(true)
      setLeadModalOpen(false)
      return
    }

    if (leadModalNextAction === 'quote') {
      // Calculate and show quote FIRST so it gets included in the CRM lead
      const routeSuccess = await calculateRouteAndPrice()
      setShowQuote(true)
      
      if (routeSuccess) {
        const payload = getCRMLeadPayload()
        crmService.submitLead(payload).catch(err => console.warn('CRM lead submission error:', err))
        emailService.sendInternalNotification(payload).catch(err => console.warn('Email alert error:', err))
      }
    } else {
      // Just submit what we have and go to planner
      const payload = getCRMLeadPayload()
      crmService.submitLead(payload).catch(err => console.warn('CRM lead submission error:', err))
      emailService.sendInternalNotification(payload).catch(err => console.warn('Email alert error:', err))
      
      // Navigate to planner
      setLeadModalOpen(false)
      setStep(1)
      navigate('/plan')
    }
  }

  const handleCheckout = () => {
    // Re-submit with calculated estimate
    const payload = getCRMLeadPayload()
    crmService.submitLead(payload).catch(() => {})

    setLeadModalOpen(false)
    setStep(3)
    navigate('/plan')
  }

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(13,16,96,0.85)',
        backdropFilter: 'blur(8px)'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          style={{
            background: '#fff',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '480px',
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            position: 'relative'
          }}
        >
          {/* Close Button - Only show if not on the planner page to prevent bypassing */}
          {location.pathname !== '/plan' && (
            <button 
              onClick={() => { setLeadModalOpen(false); setShowQuote(false); }}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1, color: 'var(--color-nets-text-2)' }}
            >
              &times;
            </button>
          )}

          {!showQuote ? (
            <div style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)', marginBottom: '0.5rem' }}>
                {leadModalNextAction === 'quote' ? 'Get Your Instant Quote' : 'Let\'s Plan Your Journey'}
              </h2>
              <p style={{ color: 'var(--color-nets-text-2)', marginBottom: '2rem', fontSize: '0.9375rem' }}>
                Please enter your details to receive your customized estimate.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-nets-navy-dark)' }}>Full Name *</label>
                  <input 
                    type="text" 
                    placeholder="Enter your full name"
                    style={{ width: '100%', padding: '0.75rem', border: `1px solid ${errors.includes('name') ? 'var(--color-nets-red)' : 'var(--color-nets-border)'}`, borderRadius: '4px' }}
                    value={customerDetails.fullName}
                    onChange={(e) => {
                      setCustomerDetails({ fullName: e.target.value })
                      if (errors.includes('name')) setErrors(errors.filter(err => err !== 'name'))
                    }}
                  />
                  {errors.includes('name') && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-nets-red)', marginTop: '0.25rem', display: 'block' }}>Please enter your name</span>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-nets-navy-dark)' }}>Email Address *</label>
                  <input 
                    type="email" 
                    placeholder="you@company.com"
                    style={{ width: '100%', padding: '0.75rem', border: `1px solid ${errors.includes('email') ? 'var(--color-nets-red)' : 'var(--color-nets-border)'}`, borderRadius: '4px' }}
                    value={customerDetails.email}
                    onChange={(e) => {
                      setCustomerDetails({ email: e.target.value })
                      if (errors.includes('email')) setErrors(errors.filter(err => err !== 'email'))
                    }}
                  />
                  {errors.includes('email') && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-nets-red)', marginTop: '0.25rem', display: 'block' }}>Please enter a valid email</span>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-nets-navy-dark)' }}>Phone Number *</label>
                  <input 
                    type="tel" 
                    placeholder="+234..."
                    style={{ width: '100%', padding: '0.75rem', border: `1px solid ${errors.includes('phone') ? 'var(--color-nets-red)' : 'var(--color-nets-border)'}`, borderRadius: '4px' }}
                    value={customerDetails.phone}
                    onChange={(e) => {
                      setCustomerDetails({ phone: e.target.value })
                      if (errors.includes('phone')) setErrors(errors.filter(err => err !== 'phone'))
                    }}
                  />
                  {errors.includes('phone') && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-nets-red)', marginTop: '0.25rem', display: 'block' }}>Please enter your phone number</span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-nets-navy-dark)' }}>Company (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="Company Name"
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-nets-border)', borderRadius: '4px' }}
                      value={customerDetails.company}
                      onChange={(e) => setCustomerDetails({ company: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-nets-navy-dark)' }}>Where did you hear about us? *</label>
                    <select 
                      required
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        border: `1px solid ${errors.includes('heardAboutUs') ? 'var(--color-nets-red)' : 'var(--color-nets-border)'}`, 
                        borderRadius: '4px', 
                        backgroundColor: '#fff' 
                      }}
                      value={customerDetails.heardAboutUs}
                      onChange={(e) => {
                        setCustomerDetails({ heardAboutUs: e.target.value })
                        if (errors.includes('heardAboutUs')) setErrors(errors.filter(err => err !== 'heardAboutUs'))
                      }}
                    >
                      <option value="" disabled>Select an option</option>
                      <option value="Google Search">Google Search</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Friend/Colleague">Friend or Colleague</option>
                      <option value="Advertisement">Advertisement</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.includes('heardAboutUs') && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-nets-red)', marginTop: '0.25rem', display: 'block' }}>Please select an option</span>
                    )}
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className={`btn btn-red btn-lg ${isLoading ? 'is-loading' : ''}`} 
                  style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', border: 'none' }}
                >
                  {isLoading ? 'Calculating...' : (leadModalNextAction === 'quote' ? 'Reveal Quote' : 'Continue to Planner')}
                </button>
              </form>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(192,39,45,0.1)', color: 'var(--color-nets-red)', marginBottom: '1.5rem' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)', marginBottom: '0.5rem' }}>
                Your Instant Quote
              </h2>
              <p style={{ color: 'var(--color-nets-text-2)', marginBottom: '2rem', fontSize: '0.9375rem' }}>
                Based on your inputs, here is your estimated quote.
              </p>

              <div style={{ background: 'var(--color-nets-light)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-nets-navy-dark)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                  {customerPricingView?.estimatedInvestment || '₦---,---'}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-nets-text-2)' }}>
                  Vehicle: {estimatedInvestment?.vehicleName || 'Standard Vehicle'}
                </div>
                {stops && stops.filter((s: LocationData) => s?.address?.trim()).length > 0 && (
                  <div style={{ 
                    fontSize: '0.8125rem', 
                    color: 'var(--color-nets-navy-dark)', 
                    marginTop: '0.875rem', 
                    paddingTop: '0.75rem', 
                    borderTop: '1px dashed rgba(0,0,0,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    textAlign: 'left'
                  }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-nets-text-2)', letterSpacing: '0.05em' }}>Route Itinerary</span>
                    <div style={{ wordBreak: 'break-word', lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600 }}>{pickup?.address?.split(',')[0]}</span>
                      {stops.filter((s: LocationData) => s?.address?.trim()).map((s: LocationData, idx: number) => (
                        <span key={idx}> &rarr; <span style={{ color: 'var(--color-nets-red)', fontWeight: 600 }}>[Stop {idx + 1}]</span> {s.address?.split(',')[0]}</span>
                      ))}
                      <span> &rarr; <span style={{ fontWeight: 600 }}>{destination?.address?.split(',')[0]}</span></span>
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={handleCheckout}
                className="btn btn-red btn-lg" 
                style={{ width: '100%', justifyContent: 'center', border: 'none' }}
              >
                Proceed to Checkout
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
