// ============================================================================
// NETS Admin — Distance Calculator Interactive Route Map
// ============================================================================
import { useEffect, useState, useRef } from 'react'
import { Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import type { AdminLocationValue } from './AdminLocationInput'

interface DistanceCalculatorMapProps {
  origin: AdminLocationValue | null
  destination: AdminLocationValue | null
  stops?: AdminLocationValue[]
  directionsResult?: google.maps.DirectionsResult | null
  height?: string
  borderRadius?: string
}

function DirectionsMapController({
  directionsResult,
  origin,
  destination,
  stops = [],
}: {
  directionsResult?: google.maps.DirectionsResult | null
  origin: AdminLocationValue | null
  destination: AdminLocationValue | null
  stops: AdminLocationValue[]
}) {
  const map = useMap()
  const routesLibrary = useMapsLibrary('routes')
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null)

  // Initialize DirectionsRenderer once
  useEffect(() => {
    if (!map || !routesLibrary) return
    if (!rendererRef.current) {
      rendererRef.current = new routesLibrary.DirectionsRenderer({
        map,
        suppressMarkers: true,
        preserveViewport: false,
        polylineOptions: {
          strokeColor: '#C40000',
          strokeWeight: 5,
          strokeOpacity: 0.85,
        },
      })
    }
    return () => {
      if (rendererRef.current) {
        try {
          rendererRef.current.setMap(null)
        } catch (_) {}
        rendererRef.current = null
      }
    }
  }, [map, routesLibrary])

  // Update directions or fit bounds
  useEffect(() => {
    if (!map) return

    if (directionsResult && rendererRef.current) {
      rendererRef.current.setMap(map)
      rendererRef.current.setDirections(directionsResult)
      return
    }

    if (rendererRef.current) {
      try {
        rendererRef.current.setMap(null)
      } catch (_) {}
    }

    // Manual bounds fitting if no DirectionsResult yet
    const pts = [origin, ...stops, destination].filter(
      (p): p is AdminLocationValue => !!p && !!p.lat && !!p.lng && (p.lat !== 0 || p.lng !== 0)
    )

    if (pts.length >= 2 && (window as any).google?.maps) {
      const bounds = new google.maps.LatLngBounds()
      pts.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }))
      map.fitBounds(bounds, 40)
    } else if (pts.length === 1) {
      map.setCenter({ lat: pts[0].lat, lng: pts[0].lng })
      map.setZoom(12)
    }
  }, [map, directionsResult, origin, destination, stops])

  return null
}

export function DistanceCalculatorMap({
  origin,
  destination,
  stops = [],
  directionsResult,
  height = '320px',
  borderRadius = 'var(--adm-radius-sm)',
}: DistanceCalculatorMapProps) {
  const [mapReady, setMapReady] = useState(false)

  // Default center: Lagos, Nigeria
  const defaultCenter = { lat: 6.5244, lng: 3.3792 }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius,
        overflow: 'hidden',
        border: '1px solid var(--adm-border)',
        background: '#0B1E28',
      }}
    >
      <Map
        defaultZoom={7}
        defaultCenter={defaultCenter}
        disableDefaultUI={false}
        zoomControl={true}
        streetViewControl={false}
        mapTypeControl={false}
        fullscreenControl={true}
        onIdle={() => setMapReady(true)}
      >
        <DirectionsMapController
          directionsResult={directionsResult}
          origin={origin}
          destination={destination}
          stops={stops}
        />

        {/* Origin Marker (Green Pin) */}
        {origin && origin.lat && origin.lng && (origin.lat !== 0 || origin.lng !== 0) && (
          <AdvancedMarker position={{ lat: origin.lat, lng: origin.lng }} title={`Pickup: ${origin.address}`}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#16A34A',
                border: '3px solid #ffffff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              A
            </div>
          </AdvancedMarker>
        )}

        {/* Intermediate Stops Markers (Blue Pins) */}
        {stops.map((stop, i) => {
          if (!stop.lat || !stop.lng || (stop.lat === 0 && stop.lng === 0)) return null
          return (
            <AdvancedMarker
              key={`stop-${i}-${stop.lat}-${stop.lng}`}
              position={{ lat: stop.lat, lng: stop.lng }}
              title={`Stop ${i + 1}: ${stop.address}`}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#0284c7',
                  border: '2px solid #ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                {i + 1}
              </div>
            </AdvancedMarker>
          )
        })}

        {/* Destination Marker (Red Pin) */}
        {destination && destination.lat && destination.lng && (destination.lat !== 0 || destination.lng !== 0) && (
          <AdvancedMarker position={{ lat: destination.lat, lng: destination.lng }} title={`Destination: ${destination.address}`}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#C40000',
                border: '3px solid #ffffff',
                boxShadow: '0 3px 10px rgba(196,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              B
            </div>
          </AdvancedMarker>
        )}
      </Map>

      {!origin && !destination && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(11, 30, 40, 0.75)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            padding: '1rem',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>Interactive Route Preview</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            Enter origin and destination above to trace route and examine road corridors
          </div>
        </div>
      )}
    </div>
  )
}
