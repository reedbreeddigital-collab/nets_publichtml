import { motion } from 'framer-motion'
import { useJourneyStore, type TripType } from '@/store/useJourneyStore'
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns'
import { useState } from 'react'
import { GooglePlacesAutocomplete } from '../GooglePlacesAutocomplete'

const vehicleOptions = [
  { id: 'hiace', name: 'Toyota HiAce (14 Seats)', capacity: 14 },
  { id: 'coaster', name: 'Toyota Coaster (30 Seats)', capacity: 30 },
  { id: 'suv', name: 'Executive SUV (4 Seats)', capacity: 4 },
  { id: 'sedan', name: 'Executive Sedan (3 Seats)', capacity: 3 }
]

export function Step2Details() {
  const { 
    passengers, setPassengers,
    travelDate, setTravelDate,
    departureTime, setDepartureTime,
    tripType, setTripType,
    returnDate, setReturnDate,
    returnTime, setReturnTime,
    retentionPreference, setRetentionPreference,
    vehicleMobility, setVehicleMobility,
    multiDayItinerary, setMultiDayItinerary,
    staffPickupDays, setStaffPickupDays,
    staffPickupTime, setStaffPickupTime,
    staffDropOffTime, setStaffDropOffTime,
    staffRoutes, addStaffRoute,
    removeStaffRoute, updateStaffRoute,
    selectedVehicleId, setSelectedVehicleId,
    additionalVehicleIds, setAdditionalVehicleIds,
    nextStep, prevStep
  } = useJourneyStore()

  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0)
  
  const currentDate = addMonths(new Date(), calendarMonthOffset)
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDayOfWeek = getDay(monthStart) // 0 = Sunday, 1 = Monday...

  const handleToggleDay = (day: Date) => {
    const exists = staffPickupDays.find(d => isSameDay(d, day))
    if (exists) {
      setStaffPickupDays(staffPickupDays.filter(d => !isSameDay(d, day)))
    } else {
      setStaffPickupDays([...staffPickupDays, day])
    }
  }

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

  const handleAddVehicle = () => {
    setAdditionalVehicleIds([...additionalVehicleIds, ''])
  }

  const handleRemoveVehicle = (idx: number) => {
    const updated = [...additionalVehicleIds]
    updated.splice(idx, 1)
    setAdditionalVehicleIds(updated)
  }

  const handleAdditionalVehicleChange = (idx: number, val: string) => {
    const updated = [...additionalVehicleIds]
    updated[idx] = val
    setAdditionalVehicleIds(updated)
  }

  // Parse max passengers requested
  const getRequestedPax = () => {
    if (!passengers) return 0
    if (passengers.includes('+')) return 50
    const parts = passengers.split('–')
    if (parts.length === 2) return parseInt(parts[1], 10)
    return parseInt(parts[0], 10)
  }

  const requestedPax = getRequestedPax()
  const selectedVehicleCapacity = selectedVehicleId 
    ? vehicleOptions.find(v => v.id === selectedVehicleId)?.capacity || 0
    : 0

  const showCapacityWarning = selectedVehicleCapacity > 0 && requestedPax > selectedVehicleCapacity

  const handleAddItineraryDay = () => {
    setMultiDayItinerary([...multiDayItinerary, { date: null, time: '09:00' }])
  }

  const handleRemoveItineraryDay = (idx: number) => {
    const updated = [...multiDayItinerary]
    updated.splice(idx, 1)
    setMultiDayItinerary(updated)
  }

  const handleItineraryChange = (idx: number, field: 'date' | 'time', value: any) => {
    const updated = [...multiDayItinerary]
    if (field === 'date') updated[idx].date = new Date(value)
    if (field === 'time') updated[idx].time = value
    setMultiDayItinerary(updated)
  }

  const getNumberOfDays = () => {
    if ((tripType === 'Multi-Day' || tripType === 'To & Fro' || tripType === 'Return') && travelDate && returnDate) {
      const start = new Date(travelDate.getFullYear(), travelDate.getMonth(), travelDate.getDate())
      const end = new Date(returnDate.getFullYear(), returnDate.getMonth(), returnDate.getDate())
      const diff = end.getTime() - start.getTime()
      const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24))
      return Math.max(1, diffDays + 1)
    }
    return 1
  }

  let isComplete = !!(passengers && travelDate && departureTime && selectedVehicleId && additionalVehicleIds.every(id => id !== ''))
  
  if (tripType === 'Staff Pickup') {
    isComplete = !!(passengers && selectedVehicleId && additionalVehicleIds.every(id => id !== ''))
    isComplete = isComplete && staffPickupDays.length > 0 && !!staffPickupTime && !!staffDropOffTime
  } else if (tripType === 'Recurring') {
    isComplete = isComplete && multiDayItinerary.every(d => d.date)
  }
  
  if (tripType === 'To & Fro' || tripType === 'Return' || tripType === 'Multi-Day') {
    isComplete = isComplete && !!returnDate
    const days = getNumberOfDays()
    if (days >= 3) {
      isComplete = isComplete && !!retentionPreference
      if (retentionPreference === 'keep') {
        isComplete = isComplete && !!vehicleMobility
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Journey Details
        </h1>
        <p style={{ color: 'var(--color-nets-text-2)' }}>
          Tell us about your passengers, schedule, and preferred vehicle.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Row 1: Vehicle & Passengers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-nets-navy-dark)' }}>
              Preferred Vehicle
            </label>
            <select 
              className="input" 
              style={{ width: '100%', padding: '0.75rem' }}
              value={selectedVehicleId || ''}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
            >
              <option value="" disabled>Select Vehicle</option>
              {vehicleOptions.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-nets-navy-dark)' }}>
              Passengers
            </label>
            <select 
              className="input" 
              style={{ width: '100%', padding: '0.75rem' }}
              value={passengers || ''}
              onChange={(e) => setPassengers(e.target.value)}
            >
              <option value="" disabled>Select Passengers</option>
              {['1–3','4–7','8–14','19–30'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        {/* Capacity Warning & Additional Vehicles */}
        <div style={{ background: 'var(--color-nets-bg-2)', padding: '1rem', borderRadius: '4px', border: '1px dashed var(--color-nets-border)' }}>
          {showCapacityWarning && (
            <div style={{ color: 'var(--color-nets-red)', fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              The selected vehicle may not comfortably fit {passengers} passengers. Consider adding an additional vehicle.
            </div>
          )}
          
          {additionalVehicleIds.map((vehId, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-nets-navy-dark)' }}>
                  Additional Vehicle {idx + 1}
                </label>
                <select 
                  className="input" 
                  style={{ width: '100%', padding: '0.6rem' }}
                  value={vehId}
                  onChange={(e) => handleAdditionalVehicleChange(idx, e.target.value)}
                >
                  <option value="" disabled>Select Vehicle</option>
                  {vehicleOptions.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => handleRemoveVehicle(idx)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-nets-red)', cursor: 'pointer', padding: '0.6rem 0', fontSize: '0.875rem', fontWeight: 600 }}
              >
                Remove
              </button>
            </div>
          ))}

          <button 
            onClick={handleAddVehicle}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-nets-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Additional Vehicle
          </button>
        </div>

        {/* Trip Type */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-nets-navy-dark)' }}>
            Trip Type
          </label>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {['Drop-Off', 'To & Fro', 'Multi-Day', 'Recurring', 'Staff Pickup'].map((t) => (
              <label 
                key={t}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0.75rem 1.5rem', border: '1px solid',
                  borderColor: tripType === t ? 'var(--color-nets-red)' : 'var(--color-nets-border)',
                  borderRadius: '4px', cursor: 'pointer',
                  background: tripType === t ? 'rgba(192,39,45,0.05)' : '#fff',
                  color: tripType === t ? 'var(--color-nets-red)' : 'var(--color-nets-text-1)',
                  fontWeight: 500, fontSize: '0.875rem'
                }}
              >
                <input type="radio" name="tripType" value={t} checked={tripType === t} onChange={(e) => setTripType(e.target.value as TripType)} style={{ display: 'none' }} />
                {t}
              </label>
            ))}
          </div>
        </div>

        {/* Outbound Schedule */}
        {tripType !== 'Staff Pickup' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-nets-navy-dark)' }}>
                {tripType === 'Recurring' ? 'Day 1 Travel Date' : (tripType === 'To & Fro' || tripType === 'Return' ? 'Departure Date' : (tripType === 'Multi-Day' ? 'Start Date' : 'Travel Date'))}
              </label>
              <input 
                type="date"
                className="input"
                style={{ width: '100%', padding: '0.75rem' }}
                value={travelDate ? travelDate.toISOString().split('T')[0] : ''}
                onChange={handleDateChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-nets-navy-dark)' }}>
                {tripType === 'Recurring' ? 'Day 1 Pickup Time' : (tripType === 'To & Fro' || tripType === 'Return' ? 'Departure Time' : 'Pickup Time')}
              </label>
              <input 
                type="time"
                className="input"
                style={{ width: '100%', padding: '0.75rem' }}
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Return Schedule */}
        {(tripType === 'To & Fro' || tripType === 'Return' || tripType === 'Multi-Day') && (
          <div style={{ display: 'grid', gridTemplateColumns: (tripType === 'To & Fro' || tripType === 'Return') ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-nets-navy-dark)' }}>
                {tripType === 'Multi-Day' ? 'End Date' : 'Return Date'}
              </label>
              <input 
                type="date"
                className="input"
                style={{ width: '100%', padding: '0.75rem' }}
                value={returnDate ? returnDate.toISOString().split('T')[0] : ''}
                onChange={handleReturnDateChange}
              />
            </div>
            {(tripType === 'To & Fro' || tripType === 'Return') && (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-nets-navy-dark)' }}>
                  Return Pickup Time
                </label>
                <input 
                  type="time"
                  className="input"
                  style={{ width: '100%', padding: '0.75rem' }}
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {/* 3+ Days Retention Logic */}
        {(() => {
          let numberOfDays = 1
          if ((tripType === 'Multi-Day' || tripType === 'To & Fro' || tripType === 'Return') && travelDate && returnDate) {
            const start = new Date(travelDate.getFullYear(), travelDate.getMonth(), travelDate.getDate())
            const end = new Date(returnDate.getFullYear(), returnDate.getMonth(), returnDate.getDate())
            const diff = end.getTime() - start.getTime()
            const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24))
            numberOfDays = Math.max(1, diffDays + 1)
          }
          if ((tripType === 'To & Fro' || tripType === 'Return' || tripType === 'Multi-Day') && numberOfDays >= 3) {
            return (
              <div style={{ background: 'var(--color-nets-bg-2)', padding: '1rem', borderRadius: '4px', border: '1px dashed var(--color-nets-border)', textAlign: 'right' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-nets-navy-dark)' }}>
                  Vehicle Retention (3+ Days Trip)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem', marginBottom: retentionPreference === 'keep' ? '1.25rem' : '0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    Keep Vehicle with Us
                    <input type="radio" name="retentionPref" value="keep" checked={retentionPreference === 'keep'} onChange={() => setRetentionPreference('keep')} />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    Return to Base (Pick us up later)
                    <input type="radio" name="retentionPref" value="return" checked={retentionPreference === 'return'} onChange={() => { setRetentionPreference('return'); setVehicleMobility(null); }} />
                  </label>
                </div>

                {retentionPreference === 'keep' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-nets-navy-dark)' }}>
                      Vehicle Usage During Stay
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                        Vehicle will be Parked
                        <input type="radio" name="vehMobility" value="parked" checked={vehicleMobility === 'parked'} onChange={() => setVehicleMobility('parked')} />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                        Vehicle will be Moving (e.g., local runs)
                        <input type="radio" name="vehMobility" value="moving" checked={vehicleMobility === 'moving'} onChange={() => setVehicleMobility('moving')} />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )
          }
          return null
        })()}

        {/* Staff Pickup Settings */}
        {tripType === 'Staff Pickup' && (
          <div style={{ background: 'var(--color-nets-bg-2)', padding: '1.5rem', borderRadius: '8px', border: '1px dashed var(--color-nets-border)' }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)', marginBottom: '1.5rem' }}>Staff Pickup Schedule</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-nets-navy-dark)' }}>
                  Pickup Time
                </label>
                <input 
                  type="time"
                  className="input"
                  style={{ width: '100%', padding: '0.75rem' }}
                  value={staffPickupTime}
                  onChange={(e) => setStaffPickupTime(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-nets-navy-dark)' }}>
                  Drop Off Time
                </label>
                <input 
                  type="time"
                  className="input"
                  style={{ width: '100%', padding: '0.75rem' }}
                  value={staffDropOffTime}
                  onChange={(e) => setStaffDropOffTime(e.target.value)}
                />
              </div>
            </div>

            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--color-nets-border)', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)', marginBottom: '1rem' }}>Additional Routes</div>
              {staffRoutes.map((route, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-nets-navy-dark)' }}>
                      Pickup
                    </label>
                    <GooglePlacesAutocomplete
                      value={route.pickup?.address || null}
                      onChange={() => {}}
                      onLocationSelect={(loc) => updateStaffRoute(idx, 'pickup', loc)}
                      placeholder="e.g. Origin"
                      className="input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-nets-navy-dark)' }}>
                      Destination
                    </label>
                    <GooglePlacesAutocomplete
                      value={route.destination?.address || null}
                      onChange={() => {}}
                      onLocationSelect={(loc) => updateStaffRoute(idx, 'destination', loc)}
                      placeholder="e.g. Destination"
                      className="input"
                    />
                  </div>
                  <button 
                    onClick={() => removeStaffRoute(idx)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-nets-red)', cursor: 'pointer', padding: '0.6rem 0', fontSize: '0.875rem', fontWeight: 600 }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button 
                onClick={addStaffRoute}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-nets-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Add Route
              </button>
            </div>

            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--color-nets-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <button 
                  onClick={() => setCalendarMonthOffset(o => o - 1)}
                  style={{ background: 'transparent', border: '1px solid var(--color-nets-border)', borderRadius: '4px', padding: '0.5rem', cursor: 'pointer' }}
                >
                  &larr; Prev
                </button>
                <div style={{ fontWeight: 600, color: 'var(--color-nets-navy-dark)' }}>
                  {format(currentDate, 'MMMM yyyy')}
                </div>
                <button 
                  onClick={() => setCalendarMonthOffset(o => o + 1)}
                  style={{ background: 'transparent', border: '1px solid var(--color-nets-border)', borderRadius: '4px', padding: '0.5rem', cursor: 'pointer' }}
                >
                  Next &rarr;
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '0.5rem' }}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-nets-text-2)' }}>{day}</div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {daysInMonth.map(day => {
                  const isSelected = staffPickupDays.some(d => isSameDay(d, day))
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleToggleDay(day)}
                      style={{
                        padding: '0.5rem',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--color-nets-red)' : 'var(--color-nets-bg-2)',
                        color: isSelected ? '#fff' : 'var(--color-nets-navy-dark)',
                        fontWeight: 500,
                        fontSize: '0.875rem'
                      }}
                    >
                      {format(day, 'd')}
                    </button>
                  )
                })}
              </div>
              <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--color-nets-text-2)', textAlign: 'right' }}>
                Selected Days: {staffPickupDays.length}
              </div>
            </div>
          </div>
        )}

        {/* Recurring Itinerary Builder */}
        {tripType === 'Recurring' && (
          <div style={{ background: 'var(--color-nets-bg-2)', padding: '1rem', borderRadius: '4px', border: '1px dashed var(--color-nets-border)' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-nets-navy-dark)', marginBottom: '1rem' }}>Recurring Schedule</div>
            {multiDayItinerary.map((day, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-nets-navy-dark)' }}>
                    Day {idx + 2} Date
                  </label>
                  <input 
                    type="date"
                    className="input"
                    style={{ width: '100%', padding: '0.6rem' }}
                    value={day.date ? day.date.toISOString().split('T')[0] : ''}
                    onChange={(e) => handleItineraryChange(idx, 'date', e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-nets-navy-dark)' }}>
                    Day {idx + 2} Pickup Time
                  </label>
                  <input 
                    type="time"
                    className="input"
                    style={{ width: '100%', padding: '0.6rem' }}
                    value={day.time}
                    onChange={(e) => handleItineraryChange(idx, 'time', e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => handleRemoveItineraryDay(idx)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-nets-red)', cursor: 'pointer', padding: '0.6rem 0', fontSize: '0.875rem', fontWeight: 600 }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button 
              onClick={handleAddItineraryDay}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-nets-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add Additional Day
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
