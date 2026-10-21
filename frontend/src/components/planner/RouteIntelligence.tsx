import { useEffect, useState } from 'react'
import { useJourneyStore } from '../../store/useJourneyStore'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import { calculateFullRoute } from '../../services/routeService'

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
    if (!pickup?.address || !destination?.address || !routesLibrary || !directionsRenderer) {
      return
    }

    let isCancelled = false

    const runCalculation = async () => {
      try {
        const result = await calculateFullRoute(pickup, destination, stops, routesLibrary)
        if (isCancelled) return

        if (result.directionsResult) {
          if (map) {
            directionsRenderer.setMap(map)
          }
          if (typeof result.selectedRouteIndex === 'number') {
            directionsRenderer.setRouteIndex(result.selectedRouteIndex)
          }
          directionsRenderer.setDirections(result.directionsResult)
        } else {
          try {
            directionsRenderer.setMap(null)
          } catch (_) {}
        }

        setRouteCalculations(result)
      } catch (err) {
        if (isCancelled) return
        console.warn('Route calculation error:', err)
        try {
          directionsRenderer.setMap(null)
        } catch (_) {}
      }
    }

    runCalculation()

    return () => {
      isCancelled = true
    }
  }, [map, pickup, destination, stops, setRouteCalculations, routesLibrary, directionsRenderer])

  return null
}
