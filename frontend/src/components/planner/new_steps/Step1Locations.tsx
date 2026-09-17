import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ChevronUp, ChevronDown, MapPin } from 'lucide-react'
import { useJourneyStore, LocationData } from '@/store/useJourneyStore'
import { GooglePlacesAutocomplete } from '../GooglePlacesAutocomplete'

export function Step1Locations() {
  const { 
    pickup, setPickup, 
    destination, setDestination, 
    stops, addStop, updateStop, removeStop, reorderStops,
    intent, setIntent 
  } = useJourneyStore()

  const maxStops = 5

  const handleAddStop = () => {
    if (stops.length < maxStops) {
      addStop({ address: '', lat: 0, lng: 0 })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Where are you heading?
        </h1>
        <p style={{ color: 'var(--color-nets-text-2)' }}>
          Enter your pickup, intermediate stops (if any), and drop-off locations to get started.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-nets-navy-dark)' }}>
            Purpose
          </label>
          <select 
            value={intent || ''}
            onChange={(e) => setIntent(e.target.value as any)}
            className="input"
            style={{ width: '100%', padding: '0.75rem 1rem', cursor: 'pointer', appearance: 'none', background: '#fff url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23000%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E") no-repeat right 1rem center / 10px 10px' }}
          >
            <option value="" disabled>Select Purpose</option>
            <option value="General Transport">General Transport</option>
            <option value="Corporate Staff">Corporate Staff</option>
            <option value="Airport Transfer">Airport Transfer</option>
            <option value="Weddings & Events">Weddings & Events</option>
            <option value="School Transport">School Transport</option>
            <option value="Religious Groups">Religious Groups</option>
            <option value="Conferences">Conferences</option>
            <option value="Tourism">Tourism</option>
            <option value="Private Group">Private Group</option>
            <option value="Recurring Shuttle">Recurring Shuttle</option>
          </select>
        </div>

        {/* Pickup Location */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              Pickup Location
            </label>
          </div>
          <GooglePlacesAutocomplete
            value={pickup?.address || null}
            onChange={() => {}}
            onLocationSelect={setPickup}
            placeholder="e.g. Murtala Muhammed Airport, Lagos"
            className="input"
          />
        </div>

        {/* Intermediate Stops Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <AnimatePresence>
            {stops.map((stop, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  background: 'var(--color-nets-light)',
                  border: '1px solid var(--color-nets-border)',
                  borderRadius: '6px',
                  padding: '0.875rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-nets-navy-dark)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--color-nets-navy-dark)', color: '#fff', fontSize: '0.6875rem', fontWeight: 700 }}>
                      {index + 1}
                    </span>
                    Intermediate Stop {index + 1}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => reorderStops(index, index - 1)}
                        className="btn btn-ghost"
                        style={{ padding: '0.25rem', height: 'auto', color: 'var(--color-nets-text-2)' }}
                        title="Move Stop Up"
                      >
                        <ChevronUp size={14} />
                      </button>
                    )}
                    {index < stops.length - 1 && (
                      <button
                        type="button"
                        onClick={() => reorderStops(index, index + 1)}
                        className="btn btn-ghost"
                        style={{ padding: '0.25rem', height: 'auto', color: 'var(--color-nets-text-2)' }}
                        title="Move Stop Down"
                      >
                        <ChevronDown size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeStop(index)}
                      className="btn btn-ghost"
                      style={{ padding: '0.25rem', height: 'auto', color: 'var(--color-nets-red)', marginLeft: '0.25rem' }}
                      title="Remove this stop"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <GooglePlacesAutocomplete
                  value={stop?.address || ''}
                  onChange={(val) => {
                    updateStop(index, { ...(stop || { lat: 0, lng: 0 }), address: val })
                  }}
                  onLocationSelect={(loc) => updateStop(index, loc)}
                  placeholder={`Enter Stop ${index + 1} address or landmark`}
                  className="input"
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add Stop Button */}
          {stops.length < maxStops && (
            <button
              type="button"
              onClick={handleAddStop}
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1.5px dashed var(--color-nets-border)',
                background: '#ffffff',
                color: 'var(--color-nets-navy-dark)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Plus size={14} color="var(--color-nets-red)" />
              <span>Add Stop along Route {stops.length > 0 ? `(${stops.length}/${maxStops})` : ''}</span>
            </button>
          )}
        </div>

        {/* Drop-off Destination */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-nets-red)' }} />
              Final Destination (Drop-off)
            </label>
          </div>
          <GooglePlacesAutocomplete
            value={destination?.address || null}
            onChange={() => {}}
            onLocationSelect={setDestination}
            placeholder="e.g. Transcorp Hilton, Abuja"
            className="input"
          />
        </div>

        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'rgba(192,39,45,0.05)', padding: '0.75rem', borderRadius: '4px', border: '1px solid rgba(192,39,45,0.1)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-nets-red)" strokeWidth="2" style={{ marginTop: '2px', flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-nets-navy-dark)', lineHeight: 1.4 }}>
            <strong>Pricing Notice:</strong> For the most accurate quote, please enter specific street addresses or landmarks. Our pricing engine calculates cost based on precise map distances. Moving farther than the initially chosen map location may incur additional charges on the final bill.
          </div>
        </div>
      </div>

    </div>
  )
}
