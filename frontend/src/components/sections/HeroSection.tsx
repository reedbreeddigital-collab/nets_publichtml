import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Check, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { staggerContainer, staggerItem, slideInRight } from '@/lib/motion'
import { useJourneyStore, type LocationData } from '@/store/useJourneyStore'
import { GooglePlacesAutocomplete } from '@/components/planner/GooglePlacesAutocomplete'
import { LeadCaptureModal } from './LeadCaptureModal'

const vehicleOptions = [
  { id: '', name: 'Any Vehicle' },
  { id: 'hiace', name: 'Toyota HiAce (14 Seats)' },
  { id: 'coaster', name: 'Toyota Coaster (30 Seats)' },
  { id: 'suv', name: 'Executive SUV (4 Seats)' },
  { id: 'sedan', name: 'Executive Sedan (3 Seats)' }
]

export function HeroSection() {
  const navigate = useNavigate()
  const { 
    pickup, setPickup, destination, setDestination, 
    tripType, setTripType, travelDate, setTravelDate, 
    passengers, setPassengers, setRecommendedVehicleId, 
    recommendedVehicleId, generateReference, setStep,
    setLeadModalOpen, setLeadModalNextAction,
    returnDate, setReturnDate,
    stops, addStop, updateStop, removeStop, reorderStops
  } = useJourneyStore()

  const [errors, setErrors] = useState<string[]>([])

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setTravelDate(new Date(e.target.value))
    }
  }

  const handleReturnDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setReturnDate(new Date(e.target.value))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: string[] = []
    
    if (!pickup) newErrors.push('pickup')
    if (!destination) newErrors.push('destination')
    if (!travelDate) newErrors.push('travelDate')
    if ((tripType === 'To & Fro' || tripType === 'Return' || tripType === 'Multi-Day') && !returnDate) newErrors.push('returnDate')
    if (!passengers || passengers === 'Select Passengers') newErrors.push('passengers')

    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    // Filter out completely empty stops before submitting
    const validStops = stops.filter(s => s && s.address && s.address.trim())
    if (validStops.length !== stops.length) {
      useJourneyStore.setState({ stops: validStops })
    }

    // Generate CRM Reference
    generateReference()
    
    // Open modal to get details and show quote
    setLeadModalNextAction('quote')
    setLeadModalOpen(true)
  }

  const handlePlanJourneyClick = (e: React.MouseEvent) => {
    e.preventDefault()
    navigate('/plan')
  }

  return (
    <section
      id="hero"
      aria-label="Hero — New Era Transport Services"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--color-nets-navy-dark)',
      }}
    >
      {/* ── Full-bleed background photo ── */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <img
          src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1920&q=90"
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }}
          loading="eager"
          fetchPriority="high"
        />
        {/* Multi-layer cinematic overlay - Darker on left for text, completely transparent on right for vehicle prominence */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(105deg, rgba(13,16,96,0.95) 0%, rgba(13,16,96,0.7) 45%, rgba(13,16,96,0) 100%)',
        }} />
        {/* Bottom vignette */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,16,96,0.6) 0%, transparent 40%)' }} />
        {/* Red accent — thin left rule */}
        <div aria-hidden style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
          background: 'var(--color-nets-red)',
          zIndex: 10,
        }} />
      </div>

      {/* ── Content ── */}
      <div
        className="container-nets"
        style={{
          position: 'relative', zIndex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '2rem',
          alignItems: 'center',
          paddingTop: '10rem',
          paddingBottom: '4rem',
          flex: 1
        }}
      >
        {/* ── Left — Editorial headline ── */}
        <motion.div
          style={{ gridColumn: 'span 12' }}
          className="lg:col-span-7"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Overline */}
          <motion.div variants={staggerItem} style={{ marginBottom: '1.5rem' }}>
            <span className="overline-dark">
              Nigeria's Premier Transport Partner
            </span>
          </motion.div>

          {/* Headline — editorial split (Reduced size and line height) */}
          <motion.h1 variants={staggerItem} className="fw-300" style={{ 
            color: '#fff', 
            marginBottom: '1rem', 
            fontSize: 'clamp(2.75rem, 4vw, 3.75rem)', 
            lineHeight: '1.1',
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap'
          }}>
            Premium Transport
            <br />
            <em style={{ fontStyle: 'normal', fontWeight: 700, color: '#fff' }}>Solutions</em>
            <br />
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>for Every Journey.</span>
          </motion.h1>

          {/* Body (Concise, moved up) */}
          <motion.p variants={staggerItem} style={{ 
            maxWidth: '460px', 
            marginBottom: '2rem', 
            fontSize: '1.125rem', 
            color: 'rgba(255,255,255,0.7)',
            lineHeight: '1.5'
          }}>
            Professional transport solutions for businesses, organisations and private travellers across Nigeria.
          </motion.p>

          {/* CTAs (Moved higher) */}
          <motion.div variants={staggerItem} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem', alignItems: 'center' }}>
            <button onClick={() => document.getElementById('quote')?.scrollIntoView({ behavior: 'smooth' })} className="btn btn-red btn-lg">
              Get Instant Quote
            </button>
            <Link to="/shuttles" className="btn btn-outline-white btn-lg">
              Book a Shuttle
            </Link>
            <button onClick={handlePlanJourneyClick} className="btn btn-outline-white btn-lg">
              Plan Your Journey
            </button>
          </motion.div>

          {/* Trust badges & checkmark features with reduced stroke */}
          <motion.div variants={staggerItem} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)' }}>
              <Check size={15} strokeWidth={1.25} color="#4ade80" />
              <span>100% Guaranteed Departures</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)' }}>
              <Check size={15} strokeWidth={1.25} color="#4ade80" />
              <span>Verified Captain Drivers</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)' }}>
              <Check size={15} strokeWidth={1.25} color="#4ade80" />
              <span>Air-Conditioned Comfort</span>
            </div>
          </motion.div>
        </motion.div>

        {/* ── Right — Quote card ── */}
        <motion.div
          style={{ gridColumn: 'span 12', display: 'flex' }}
          className="lg:col-span-5 lg:col-start-8 lg:justify-end justify-center"
          variants={slideInRight}
          initial="hidden"
          animate="visible"
        >
          <div
            id="quote"
            style={{
              width: '100%',
              maxWidth: '420px',
              background: 'rgba(13,16,96,0.85)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '4px',
              padding: '1.5rem',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
              marginTop: '1.5rem'
            }}
          >
            {/* Card header */}
            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.25rem' }}>
              <div className="overline-dark" style={{ marginBottom: '0.5rem' }}>Instant Quote</div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>
                Plan your journey
              </h2>
            </div>

            <form aria-label="Instant quote request" onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

              <div style={{ position: 'relative', zIndex: 50 }}>
                <label htmlFor="hero-pickup" className="field-label-dark">Pickup Location</label>
                <GooglePlacesAutocomplete 
                  id="hero-pickup"
                  value={pickup?.address || null} 
                  onChange={() => {}} 
                  onLocationSelect={setPickup} 
                  placeholder="e.g. Victoria Island, Lagos" 
                  className={`input-dark ${errors.includes('pickup') ? 'error-border' : ''}`}
                  style={{ padding: '0.625rem 1rem' }} 
                />
                {errors.includes('pickup') && <span style={{ color: 'var(--color-nets-red)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>Please enter a pickup location</span>}
              </div>

              {/* Intermediate Stops */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', position: 'relative', zIndex: 40 }}>
                <AnimatePresence initial={false}>
                  {stops.map((stop, index) => (
                    <motion.div
                      key={`hero-stop-${index}`}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      style={{ position: 'relative', zIndex: 35 - index }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-nets-gold, #f59e0b)' }} />
                          Intermediate Stop {index + 1}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => reorderStops(index, index - 1)}
                              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                              title="Move Stop Up"
                            >
                              <ChevronUp size={13} />
                            </button>
                          )}
                          {index < stops.length - 1 && (
                            <button
                              type="button"
                              onClick={() => reorderStops(index, index + 1)}
                              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                              title="Move Stop Down"
                            >
                              <ChevronDown size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeStop(index)}
                            style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', marginLeft: '0.25rem' }}
                            title="Remove Stop"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <GooglePlacesAutocomplete
                        id={`hero-stop-${index}`}
                        value={stop?.address || null}
                        onChange={(val) => {
                          updateStop(index, { ...(stop || { lat: 0, lng: 0 }), address: val })
                        }}
                        onLocationSelect={(loc) => updateStop(index, loc)}
                        placeholder={`e.g. Stop ${index + 1} landmark or address`}
                        className="input-dark"
                        style={{ padding: '0.5rem 0.75rem', height: '40px', fontSize: '0.875rem' }}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {stops.length < 5 && (
                  <button
                    type="button"
                    onClick={() => addStop({ lat: 0, lng: 0, address: '' })}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.375rem',
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: '1px dashed rgba(255,255,255,0.25)',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.85)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      width: '100%'
                    }}
                  >
                    <Plus size={13} color="var(--color-nets-red, #dc2626)" />
                    <span>Add Stop along Route {stops.length > 0 ? `(${stops.length}/5)` : ''}</span>
                  </button>
                )}
              </div>

              <div style={{ position: 'relative', zIndex: 20 }}>
                <label htmlFor="hero-dest" className="field-label-dark">Destination</label>
                <GooglePlacesAutocomplete 
                  id="hero-dest"
                  value={destination?.address || null} 
                  onChange={() => {}} 
                  onLocationSelect={setDestination} 
                  placeholder="e.g. Abuja, FCT" 
                  className={`input-dark ${errors.includes('destination') ? 'error-border' : ''}`}
                  style={{ padding: '0.625rem 1rem' }} 
                />
                {errors.includes('destination') && <span style={{ color: 'var(--color-nets-red)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>Please enter a destination</span>}
              </div>

              {/* Trip type */}
              <div>
                <label className="field-label-dark" id="hero-trip-lbl">Trip Type</label>
                <div role="radiogroup" aria-labelledby="hero-trip-lbl"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: '2px' }}>
                  {['Drop-Off', 'To & Fro', 'Multi-Day'].map((t, i) => (
                    <label key={t} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0.5rem 0', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                      borderRight: i < 2 ? '1px solid rgba(255,255,255,0.12)' : 'none',
                      color: tripType === t ? '#fff' : 'rgba(255,255,255,0.5)',
                      background: tripType === t ? 'rgba(192,39,45,0.3)' : 'transparent',
                    }}>
                      <input type="radio" name="hero-trip" value={t} checked={tripType === t} onChange={(e) => setTripType(e.target.value as any)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                      {t}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label htmlFor="hero-date" className="field-label-dark">
                    {tripType === 'To & Fro' || tripType === 'Return' ? 'Departure Date' : (tripType === 'Multi-Day' ? 'Start Date' : 'Travel Date')}
                  </label>
                  <input 
                    id="hero-date" 
                    type="date" 
                    className={`input-dark ${errors.includes('travelDate') ? 'error-border' : ''}`}
                    style={{ padding: '0.625rem 1rem', width: '100%' }} 
                    value={travelDate ? travelDate.toISOString().split('T')[0] : ''}
                    onChange={handleDateChange}
                  />
                  {errors.includes('travelDate') && <span style={{ color: 'var(--color-nets-red)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>Required</span>}
                </div>

                {(tripType === 'To & Fro' || tripType === 'Return' || tripType === 'Multi-Day') ? (
                  <div>
                    <label htmlFor="hero-return-date" className="field-label-dark">
                      {tripType === 'Multi-Day' ? 'End Date' : 'Return Date'}
                    </label>
                    <input 
                      id="hero-return-date" 
                      type="date" 
                      className={`input-dark ${errors.includes('returnDate') ? 'error-border' : ''}`}
                      style={{ padding: '0.625rem 1rem', width: '100%' }} 
                      value={returnDate ? returnDate.toISOString().split('T')[0] : ''}
                      onChange={handleReturnDateChange}
                    />
                    {errors.includes('returnDate') && <span style={{ color: 'var(--color-nets-red)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>Required</span>}
                  </div>
                ) : (
                  <div>
                    <label htmlFor="hero-pax" className="field-label-dark">Passengers</label>
                    <select 
                      id="hero-pax" 
                      className={`input-dark ${errors.includes('passengers') ? 'error-border' : ''}`}
                      style={{ padding: '0.625rem 1rem', width: '100%' }}
                      value={passengers || 'Select Passengers'}
                      onChange={(e) => setPassengers(e.target.value)}
                    >
                      <option disabled>Select Passengers</option>
                      {['1–3','4–7','8–14','19–30'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    {errors.includes('passengers') && <span style={{ color: 'var(--color-nets-red)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>Required</span>}
                  </div>
                )}
              </div>

              {(tripType === 'To & Fro' || tripType === 'Return' || tripType === 'Multi-Day') ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label htmlFor="hero-pax-2" className="field-label-dark">Passengers</label>
                    <select 
                      id="hero-pax-2" 
                      className={`input-dark ${errors.includes('passengers') ? 'error-border' : ''}`}
                      style={{ padding: '0.625rem 1rem', width: '100%' }}
                      value={passengers || 'Select Passengers'}
                      onChange={(e) => setPassengers(e.target.value)}
                    >
                      <option disabled>Select Passengers</option>
                      {['1–3','4–7','8–14','19–30'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    {errors.includes('passengers') && <span style={{ color: 'var(--color-nets-red)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>Required</span>}
                  </div>
                  <div>
                    <label htmlFor="hero-veh-2" className="field-label-dark">Preferred Vehicle</label>
                    <select 
                      id="hero-veh-2" 
                      className="input-dark" 
                      style={{ padding: '0.625rem 1rem', width: '100%' }} 
                      value={recommendedVehicleId || ''} 
                      onChange={(e) => setRecommendedVehicleId(e.target.value === '' ? null : e.target.value)}
                    >
                      {vehicleOptions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="hero-veh" className="field-label-dark">Preferred Vehicle</label>
                  <select 
                    id="hero-veh" 
                    className="input-dark" 
                    style={{ padding: '0.625rem 1rem', width: '100%' }} 
                    value={recommendedVehicleId || ''} 
                    onChange={(e) => setRecommendedVehicleId(e.target.value === '' ? null : e.target.value)}
                  >
                    {vehicleOptions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              )}
              
              <div style={{ marginTop: '0.25rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" style={{ marginTop: '2px', flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                  <strong>Pricing Notice:</strong> For the most accurate quote, please enter specific street addresses. Moving farther than the mapped location may incur additional charges on the final bill.
                </div>
              </div>

              <button type="submit" className="btn btn-red btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem', padding: '0.75rem 1.5rem', border: 'none', cursor: 'pointer' }}>
                Get Instant Quote
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </form>
          </div>
        </motion.div>
      </div>

    </section>
  )
}
