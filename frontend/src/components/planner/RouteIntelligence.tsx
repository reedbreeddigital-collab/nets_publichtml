import { useEffect, useState } from 'react'
import { useJourneyStore, LocationData } from '../../store/useJourneyStore'
import { GOOGLE_MAPS_API_KEY, geocodeAddress } from '../../config/api'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'

function getFallbackDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180) 
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2)
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
}

export function RouteIntelligence() {
  const { pickup, destination, stops, setRouteCalculations } = useJourneyStore()
  const map = useMap()
  const routesLibrary = useMapsLibrary('routes')
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null)

  useEffect(() => {
    if (!map || !routesLibrary) return
    if (!directionsRenderer) {
      setDirectionsRenderer(new routesLibrary.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#C0272D',
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      }))
    }
  }, [map, routesLibrary, directionsRenderer])

  useEffect(() => {
    if (!pickup || !destination || !routesLibrary || !directionsRenderer) {
      return
    }

    const calculateRoute = async () => {
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

        if (!pLat || !pLng || !dLat || !dLng) {
          throw new Error('Coordinates missing and could not be geocoded')
        }

        // Resolve coordinates for any intermediate stops that have addresses
        const validWaypoints: { lat: number; lng: number }[] = []
        if (Array.isArray(stops)) {
          for (let i = 0; i < stops.length; i++) {
            const s = stops[i]
            if (!s || !s.address || !s.address.trim()) continue
            let sLat = s.lat
            let sLng = s.lng
            if ((!sLat || !sLng || (sLat === 0 && sLng === 0)) && s.address.trim().length > 2) {
              const coords = await geocodeAddress(s.address)
              if (coords) {
                sLat = coords.lat
                sLng = coords.lng
              }
            }
            if (sLat && sLng && (sLat !== 0 || sLng !== 0)) {
              validWaypoints.push({ lat: sLat, lng: sLng })
            }
          }
        }

        const directionsService = new routesLibrary.DirectionsService()
        const request: google.maps.DirectionsRequest = {
          origin: { lat: pLat, lng: pLng },
          destination: { lat: dLat, lng: dLng },
          waypoints: validWaypoints.map((w) => ({
            location: { lat: w.lat, lng: w.lng },
            stopover: true
          })),
          travelMode: google.maps.TravelMode.DRIVING,
        }

        const result = await directionsService.route(request)
        if (map) {
          directionsRenderer.setMap(map)
        }
        directionsRenderer.setDirections(result)

        const route = result.routes?.[0]
        if (!route) {
          throw new Error('No route found in directions result')
        }

        let totalDistanceMeters = 0
        let totalDurationSeconds = 0

        route.legs.forEach((leg: google.maps.DirectionsLeg) => {
          totalDistanceMeters += leg.distance?.value || 0
          totalDurationSeconds += leg.duration?.value || 0
        })

        const distanceKm = Math.round((totalDistanceMeters / 1000) * 10) / 10
        const durationMins = Math.round(totalDurationSeconds / 60)

        const insights: string[] = []
        if (distanceKm > 100) insights.push('Long Distance Journey')
        if (distanceKm > 300) insights.push('Interstate Journey')
        if (distanceKm <= 50) insights.push('Urban Journey')

        if (destination.country && destination.country !== 'Nigeria') {
          insights.push('International Border Crossing - Special Request')
        }

        const bounds = route.bounds
        let journeyBounds: [[number, number], [number, number]] | null = null
        if (bounds && typeof bounds.getSouthWest === 'function' && typeof bounds.getNorthEast === 'function') {
          const sw = bounds.getSouthWest()
          const ne = bounds.getNorthEast()
          journeyBounds = [[sw.lng(), sw.lat()], [ne.lng(), ne.lat()]]
        }

        setRouteCalculations({
          distanceKm,
          distanceMeters: totalDistanceMeters,
          durationMins,
          durationSeconds: totalDurationSeconds,
          durationText: `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`,
          routePolyline: route.overview_polyline,
          journeyBounds,
          journeyInsights: insights
        })

      } catch (err) {
        console.warn('Google Directions failed, using Haversine fallback', err)
        try {
          directionsRenderer.setMap(null)
        } catch (_) {}

        // Fallback calculation
        let totalKm = 0
        const points = [
          pickup && pickup.lat && pickup.lng ? { lat: pickup.lat, lng: pickup.lng } : null,
          ...(Array.isArray(stops) ? stops.filter(s => s && s.lat && s.lng && (s.lat !== 0 || s.lng !== 0)) : []),
          destination && destination.lat && destination.lng ? { lat: destination.lat, lng: destination.lng } : null
        ].filter(Boolean) as { lat: number; lng: number }[]

        for (let i = 0; i < points.length - 1; i++) {
          totalKm += getFallbackDistanceKm(points[i].lat, points[i].lng, points[i+1].lat, points[i+1].lng)
        }
        totalKm = Math.max(1.5, Math.round(totalKm * 10) / 10)
        const totalMins = Math.round(totalKm * 2.5)

        const insights: string[] = []
        if (totalKm > 100) insights.push('Long Distance Journey')
        if (totalKm <= 50) insights.push('Urban Journey')

        setRouteCalculations({
          distanceKm: totalKm,
          distanceMeters: totalKm * 1000,
          durationMins: totalMins,
          durationSeconds: totalMins * 60,
          durationText: `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`,
          routePolyline: null,
          journeyBounds: null,
          journeyInsights: insights
        })
      }
    }

    calculateRoute()
  }, [map, pickup, destination, stops, setRouteCalculations, routesLibrary, directionsRenderer])

  return null
}
