import { motion } from 'framer-motion'
import { MapPin, Users, Calendar, Phone, CheckCircle, ShieldCheck } from 'lucide-react'
import { useJourneyStore } from '../../store/useJourneyStore'
import { vehicles } from '../../data/vehicles'

export function JourneySummary() {
  const state = useJourneyStore()
  
  const formattedDate = state.travelDate ? state.travelDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending Date'
  const vehicle = vehicles.find(v => v.id === (state.selectedVehicleId || state.recommendedVehicleId))
  
  // Dummy logic for estimate range based on distance/vehicle
  const baseRate = vehicle ? vehicle.capacity * 10000 : 150000
  const estLow = Math.round((baseRate + (state.distanceKm * 250)) / 1000) * 1000
  const estHigh = Math.round(estLow * 1.3 / 1000) * 1000
  const formattedEstimate = state.distanceKm > 0 ? `₦${estLow.toLocaleString()} – ₦${estHigh.toLocaleString()}` : 'Pending'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Journey Timeline */}
      <div>
        <h3 style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-nets-navy)', marginBottom: '1rem' }}>
          Live Operational Status
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingLeft: '24px', borderLeft: '2px solid var(--color-nets-border)', marginLeft: '6px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '-31px', width: '12px', height: '12px', borderRadius: '50%', background: state.pickup ? 'var(--color-nets-success)' : '#fff', border: '2px solid var(--color-nets-border)' }} />
            <span style={{ paddingLeft: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: state.pickup ? 'var(--color-nets-navy-dark)' : 'var(--color-nets-text-3)' }}>
              Journey Locations {state.stops && state.stops.length > 0 ? `(${state.stops.length} ${state.stops.length === 1 ? 'Stop' : 'Stops'})` : ''}
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '-31px', width: '12px', height: '12px', borderRadius: '50%', background: state.currentStep >= 2 ? 'var(--color-nets-success)' : '#fff', border: '2px solid var(--color-nets-border)' }} />
            <span style={{ paddingLeft: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: state.currentStep >= 2 ? 'var(--color-nets-navy-dark)' : 'var(--color-nets-text-3)' }}>Vehicle & Schedule</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '-31px', width: '12px', height: '12px', borderRadius: '50%', background: state.currentStep >= 3 ? 'var(--color-nets-success)' : '#fff', border: '2px solid var(--color-nets-border)' }} />
            <span style={{ paddingLeft: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: state.currentStep >= 3 ? 'var(--color-nets-navy-dark)' : 'var(--color-nets-text-3)' }}>Review & Pay</span>
          </div>

        </div>
      </div>

      {/* Quick Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ background: 'var(--color-nets-light)', padding: '1rem', borderRadius: '4px' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-nets-text-3)' }}>Distance</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--color-nets-navy-dark)', marginTop: '0.25rem' }}>{state.distanceKm > 0 ? `${state.distanceKm} km` : '--'}</div>
        </div>
        <div style={{ background: 'var(--color-nets-light)', padding: '1rem', borderRadius: '4px' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-nets-text-3)' }}>Est. Duration</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--color-nets-navy-dark)', marginTop: '0.25rem' }}>{state.durationText || '--'}</div>
        </div>
      </div>

      {/* Summary Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--color-nets-border)', paddingTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-nets-text-2)' }}>Trip Type</span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)' }}>{state.tripType || 'Pending'}</span>
        </div>
        {state.stops && state.stops.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-nets-text-2)' }}>En-Route Stops</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)' }}>
              {state.stops.length} {state.stops.length === 1 ? 'stop' : 'stops'}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-nets-text-2)' }}>Travel Date</span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)' }}>{formattedDate}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-nets-text-2)' }}>Passengers</span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)' }}>{state.passengers || 'Pending'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-nets-text-2)' }}>Vehicle</span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)' }}>{vehicle?.name || 'Pending'}</span>
        </div>
      </div>


      {/* Need Help CTA */}
      <div style={{ borderTop: '1px solid var(--color-nets-border)', paddingTop: '1.5rem', textAlign: 'left' }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)', marginBottom: '0.5rem' }}>Need Help?</div>
        <a href="tel:+2348000000000" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-nets-red)', textDecoration: 'none' }}>
          <Phone size={14} /> Contact a Specialist
        </a>
      </div>

    </div>
  )
}
