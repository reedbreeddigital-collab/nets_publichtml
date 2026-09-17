import { useState, useEffect } from 'react'
import { APIProvider, Map, Marker, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { useJourneyStore } from '../../store/useJourneyStore'
import { RouteIntelligence } from './RouteIntelligence'
import { GOOGLE_MAPS_API_KEY } from '../../config/api'

function MapBoundsController() {
  const map = useMap()
  const { pickup, destination, stops, journeyBounds } = useJourneyStore()
  
  useEffect(() => {
    if (!map) return

    if (journeyBounds && journeyBounds.length === 2 && journeyBounds[0] && journeyBounds[1]) {
      const bounds = new google.maps.LatLngBounds()
      bounds.extend(new google.maps.LatLng(journeyBounds[0][1], journeyBounds[0][0]))
      bounds.extend(new google.maps.LatLng(journeyBounds[1][1], journeyBounds[1][0]))
      map.fitBounds(bounds, 50)
      return
    }

    // Fallback bounds calculation
    const points = [pickup, ...(Array.isArray(stops) ? stops : []), destination].filter(p => p && p.lat && p.lng && (p.lat !== 0 || p.lng !== 0))
    
    if (points.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      points.forEach(p => {
        if (!p || !p.lat || !p.lng) return
        bounds.extend(new google.maps.LatLng(p.lat, p.lng))
      })
      map.fitBounds(bounds, 50)
    }
  }, [map, pickup, destination, stops, journeyBounds])

  return null
}

export function InteractiveMap() {
  const { pickup, destination, stops, routePolyline } = useJourneyStore()

  // Google map style representing a professional minimal aesthetic
  const mapId = "NETS_LIGHT_MAP_ID" // Requires a Map ID configured in Google Cloud Console

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, background: 'var(--color-nets-navy-dark)' }}>
      <Map
        defaultZoom={11}
        defaultCenter={{ lat: 6.5244, lng: 3.3792 }}
        mapId={mapId}
        disableDefaultUI={true}
      >
        <MapBoundsController />
        <RouteIntelligence />

        {/* Pickup Marker */}
        {pickup && pickup.lat && pickup.lng && (pickup.lat !== 0 || pickup.lng !== 0) && (
          <AdvancedMarker position={{ lat: pickup.lat, lng: pickup.lng }}>
            <div style={{ width: '18px', height: '18px', background: '#10b981', border: '3px solid #fff', borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }} />
          </AdvancedMarker>
        )}

        {/* Stops Markers */}
        {Array.isArray(stops) && stops.map((stop, i) => {
          if (!stop || !stop.lat || !stop.lng || (stop.lat === 0 && stop.lng === 0)) return null
          return (
            <AdvancedMarker key={`stop-${i}-${stop.lat}-${stop.lng}`} position={{ lat: stop.lat, lng: stop.lng }}>
              <div style={{ width: '22px', height: '22px', background: 'var(--color-nets-navy)', border: '2px solid #fff', borderRadius: '50%', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.6875rem', fontWeight: 700 }}>
                {i + 1}
              </div>
            </AdvancedMarker>
          )
        })}

        {/* Destination Marker */}
        {destination && destination.lat && destination.lng && (destination.lat !== 0 || destination.lng !== 0) && (
          <AdvancedMarker position={{ lat: destination.lat, lng: destination.lng }}>
            <div style={{ width: '20px', height: '20px', background: 'var(--color-nets-red)', border: '3px solid #fff', borderRadius: '50%', boxShadow: '0 4px 12px rgba(192,39,45,0.4)' }} />
          </AdvancedMarker>
        )}

      </Map>

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at center, transparent 0%, rgba(13,16,96,0.1) 100%)' }} />
    </div>
  )

}
