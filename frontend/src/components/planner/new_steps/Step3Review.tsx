import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useJourneyStore } from '@/store/useJourneyStore'

export function Step3Review() {
  const { 
    pickup, destination, stops, travelDate, departureTime,
    passengers, selectedVehicleId, tripType,
    customerPricingView, estimatedInvestment, calculatePricing,
    customerDetails
  } = useJourneyStore()

  // Ensure pricing is up-to-date
  useEffect(() => {
    calculatePricing()
  }, [calculatePricing])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Review & Pay
        </h1>
        <p style={{ color: 'var(--color-nets-text-2)' }}>
          Review your journey details and proceed to payment to confirm your booking.
        </p>
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid var(--color-nets-border)', borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Route Details */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-nets-text-3)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Itinerary Route {stops && stops.length > 0 ? `(${stops.length} Intermediate ${stops.length === 1 ? 'Stop' : 'Stops'})` : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Pickup */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: '#10b981', color: '#fff', fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                A
              </span>
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-nets-text-3)', textTransform: 'uppercase' }}>Pickup Location</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-nets-navy-dark)', fontWeight: 500 }}>{pickup?.displayName || pickup?.address}</div>
              </div>
            </div>

            {/* Intermediate Stops */}
            {Array.isArray(stops) && stops.filter(s => s && s.address && s.address.trim()).map((stop, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', marginLeft: '1px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--color-nets-navy-dark)', color: '#fff', fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>
                  {idx + 1}
                </span>
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-nets-text-3)', textTransform: 'uppercase' }}>Intermediate Stop {idx + 1}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-nets-navy-dark)', fontWeight: 500 }}>{stop?.displayName || stop?.address}</div>
                </div>
              </div>
            ))}

            {/* Destination */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: 'var(--color-nets-red)', color: '#fff', fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                B
              </span>
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-nets-text-3)', textTransform: 'uppercase' }}>Drop-off Destination</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-nets-navy-dark)', fontWeight: 500 }}>{destination?.displayName || destination?.address}</div>
              </div>
            </div>
          </div>
        </div>

        <hr style={{ borderTop: '1px solid var(--color-nets-border)', margin: '0.5rem 0' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-nets-text-3)', textTransform: 'uppercase' }}>Date & Time</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-nets-navy-dark)', fontWeight: 500 }}>
              {travelDate ? new Date(travelDate).toLocaleDateString() : 'Flexible'} at {departureTime}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-nets-text-3)', textTransform: 'uppercase' }}>Trip Type</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-nets-navy-dark)', fontWeight: 500 }}>{tripType}</div>
          </div>
        </div>

        <hr style={{ borderTop: '1px solid var(--color-nets-border)', margin: '0.5rem 0' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-nets-text-3)', textTransform: 'uppercase' }}>Passengers</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-nets-navy-dark)', fontWeight: 500 }}>{passengers}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-nets-text-3)', textTransform: 'uppercase' }}>Vehicle</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-nets-navy-dark)', fontWeight: 500 }}>{estimatedInvestment?.vehicleName || selectedVehicleId}</div>
          </div>
        </div>

        {customerDetails?.fullName && (
          <>
            <hr style={{ borderTop: '1px solid var(--color-nets-border)', margin: '0.5rem 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-nets-text-3)', textTransform: 'uppercase' }}>Customer</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-nets-navy-dark)', fontWeight: 500 }}>{customerDetails.fullName}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-nets-text-3)', textTransform: 'uppercase' }}>Contact</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-nets-navy-dark)', fontWeight: 500 }}>{customerDetails.email} · {customerDetails.phone}</div>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ background: 'var(--color-nets-light)', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-nets-text-3)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Amount</div>
        <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--color-nets-red)', letterSpacing: '-0.02em' }}>
          {customerPricingView?.estimatedInvestment || 'Calculating...'}
        </div>
      </div>
    </div>
  )
}
