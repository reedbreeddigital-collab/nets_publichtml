import { geocodeAddress } from '../config/api'
import { fetchPricingConfig, DEFAULT_DEPOT_LAT, DEFAULT_DEPOT_LNG } from '../pricing/adminPricingConfig'
import type { LocationData } from '../store/useJourneyStore'

export const NIGERIAN_ROAD_FACTOR = 1.35

export function getFallbackDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export function getFallbackRoadDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const straightKm = getFallbackDistanceKm(lat1, lon1, lat2, lon2)
  return Math.round(straightKm * NIGERIAN_ROAD_FACTOR * 10) / 10
}

export interface RouteCalculationResult {
  distanceKm: number
  distanceMeters: number
  depotDistanceKm: number
  billableDistanceKm: number
  durationMins: number
  durationSeconds: number
  durationText: string
  routePolyline: any | null
  journeyBounds: [[number, number], [number, number]] | null
  journeyInsights: string[]
  directionsResult?: google.maps.DirectionsResult | null
  selectedRouteIndex?: number
  isFallback?: boolean
}

/**
 * Select the most consistent/stable route from Directions API alternatives.
 * Avoids traffic-spike detours that wildly fluctuate distance throughout the day.
 */
export function selectBestStableRoute(routes: google.maps.DirectionsRoute[]): {
  route: google.maps.DirectionsRoute
  index: number
  distanceMeters: number
  durationSeconds: number
} {
  if (!routes || routes.length === 0) {
    throw new Error('No routes returned from Directions Service')
  }

  const scoredRoutes = routes.map((r, index) => {
    let distanceMeters = 0
    let durationSeconds = 0
    r.legs.forEach((leg) => {
      distanceMeters += leg.distance?.value || 0
      durationSeconds += leg.duration?.value || 0
    })
    return { route: r, index, distanceMeters, durationSeconds }
  })

  if (scoredRoutes.length === 1) {
    return scoredRoutes[0]
  }

  // Find the fastest duration among alternatives
  const minDuration = Math.min(...scoredRoutes.map((s) => s.durationSeconds))

  // Viable routes: duration is within 20% or 15 minutes of fastest route
  const viableRoutes = scoredRoutes.filter(
    (s) => s.durationSeconds <= minDuration * 1.2 || s.durationSeconds <= minDuration + 900
  )

  // Pick the shortest distance among viable routes to give consistent pricing
  viableRoutes.sort((a, b) => a.distanceMeters - b.distanceMeters)
  return viableRoutes[0] || scoredRoutes[0]
}

/**
 * Calculate repositioning distance from company depot to customer pickup.
 */
export async function calculateDepotDistance(
  pickupLat: number,
  pickupLng: number,
  directionsService?: google.maps.DirectionsService | null
): Promise<number> {
  try {
    const pricingConf = await fetchPricingConfig().catch(() => null)
    const isEnabled = pricingConf?.includeRepositioningDistance !== false
    if (!isEnabled) {
      return 0
    }

    const depotLat = pricingConf?.depotLat ?? DEFAULT_DEPOT_LAT
    const depotLng = pricingConf?.depotLng ?? DEFAULT_DEPOT_LNG

    if (directionsService) {
      const depotRequest: google.maps.DirectionsRequest = {
        origin: { lat: depotLat, lng: depotLng },
        destination: { lat: pickupLat, lng: pickupLng },
        travelMode: google.maps.TravelMode.DRIVING,
      }
      const depotResult = await directionsService.route(depotRequest).catch(() => null)
      if (depotResult?.routes?.[0]?.legs?.[0]?.distance?.value) {
        return Math.round((depotResult.routes[0].legs[0].distance.value / 1000) * 10) / 10
      }
    }

    const straightKm = getFallbackDistanceKm(depotLat, depotLng, pickupLat, pickupLng)
    return Math.round(straightKm * NIGERIAN_ROAD_FACTOR * 10) / 10
  } catch (e) {
    console.warn('Depot distance calculation fallback:', e)
    const straightKm = getFallbackDistanceKm(DEFAULT_DEPOT_LAT, DEFAULT_DEPOT_LNG, pickupLat, pickupLng)
    return Math.round(straightKm * NIGERIAN_ROAD_FACTOR * 10) / 10
  }
}

/**
 * High-level unified route & distance calculation engine.
 * Used identically across interactive planner map, lead modal, and summary cards.
 */
export async function calculateFullRoute(
  pickup: LocationData | null,
  destination: LocationData | null,
  stops: LocationData[] = [],
  routesLibrary?: any | null
): Promise<RouteCalculationResult> {
  if (!pickup || !destination) {
    throw new Error('Pickup and destination are required')
  }

  // 1. Resolve Pickup coordinates
  let pLat = pickup.lat
  let pLng = pickup.lng
  if ((!pLat || !pLng || (pLat === 0 && pLng === 0)) && pickup.address?.trim()) {
    const coords = await geocodeAddress(pickup.address)
    if (coords) {
      pLat = coords.lat
      pLng = coords.lng
    }
  }

  // 2. Resolve Destination coordinates
  let dLat = destination.lat
  let dLng = destination.lng
  if ((!dLat || !dLng || (dLat === 0 && dLng === 0)) && destination.address?.trim()) {
    const coords = await geocodeAddress(destination.address)
    if (coords) {
      dLat = coords.lat
      dLng = coords.lng
    }
  }

  if (!pLat || !pLng || !dLat || !dLng) {
    throw new Error('Coordinates missing and could not be geocoded')
  }

  // 3. Resolve intermediate waypoints
  const validWaypoints: { lat: number; lng: number }[] = []
  if (Array.isArray(stops)) {
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i]
      if (!s || !s.address?.trim()) continue
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

  // 4. Try Google Directions Service
  const DirectionsServiceClass =
    routesLibrary?.DirectionsService ||
    (typeof window !== 'undefined' && (window as any).google?.maps?.DirectionsService)

  if (DirectionsServiceClass) {
    try {
      const directionsService = new DirectionsServiceClass()
      const request: google.maps.DirectionsRequest = {
        origin: { lat: pLat, lng: pLng },
        destination: { lat: dLat, lng: dLng },
        waypoints: validWaypoints.map((w) => ({
          location: { lat: w.lat, lng: w.lng },
          stopover: true,
        })),
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
      }

      const result = await directionsService.route(request)
      if (result.routes && result.routes.length > 0) {
        const bestRouteData = selectBestStableRoute(result.routes)
        const chosenRoute = bestRouteData.route
        const totalDistanceMeters = bestRouteData.distanceMeters
        const totalDurationSeconds = bestRouteData.durationSeconds

        const distanceKm = Math.max(1.5, Math.round((totalDistanceMeters / 1000) * 10) / 10)
        const durationMins = Math.round(totalDurationSeconds / 60)

        // Calculate depot distance identically
        const depotDistanceKm = await calculateDepotDistance(pLat, pLng, directionsService)
        const billableDistanceKm = Math.round((distanceKm + depotDistanceKm) * 10) / 10

        const insights: string[] = []
        if (distanceKm > 100) insights.push('Long Distance Journey')
        if (distanceKm > 300) insights.push('Interstate Journey')
        if (distanceKm <= 50) insights.push('Urban Journey')
        if (destination.country && destination.country.toLowerCase() !== 'nigeria') {
          insights.push('International Border Crossing - Special Request')
        }

        const bounds = chosenRoute.bounds
        let journeyBounds: [[number, number], [number, number]] | null = null
        if (bounds && typeof bounds.getSouthWest === 'function' && typeof bounds.getNorthEast === 'function') {
          const sw = bounds.getSouthWest()
          const ne = bounds.getNorthEast()
          journeyBounds = [[sw.lng(), sw.lat()], [ne.lng(), ne.lat()]]
        }

        return {
          distanceKm,
          distanceMeters: totalDistanceMeters,
          depotDistanceKm,
          billableDistanceKm,
          durationMins,
          durationSeconds: totalDurationSeconds,
          durationText: `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`,
          routePolyline: chosenRoute.overview_polyline,
          journeyBounds,
          journeyInsights: insights,
          directionsResult: result,
          selectedRouteIndex: bestRouteData.index,
          isFallback: false,
        }
      }
    } catch (apiErr) {
      console.warn('Google DirectionsService failed, falling back to road network estimate:', apiErr)
    }
  }

  // 5. Fallback calculation using Haversine with Nigerian road tortuosity factor
  let straightDistanceKm = 0
  const points = [
    { lat: pLat, lng: pLng },
    ...validWaypoints,
    { lat: dLat, lng: dLng },
  ]

  for (let i = 0; i < points.length - 1; i++) {
    straightDistanceKm += getFallbackDistanceKm(
      points[i].lat,
      points[i].lng,
      points[i + 1].lat,
      points[i + 1].lng
    )
  }

  // Apply road network factor (1.35x) to straight line
  const totalKm = Math.max(1.5, Math.round(straightDistanceKm * NIGERIAN_ROAD_FACTOR * 10) / 10)
  const totalMins = Math.round(totalKm * 2.2)

  const fallbackDepotDistanceKm = await calculateDepotDistance(pLat, pLng, null)
  const fallbackBillableDistanceKm = Math.round((totalKm + fallbackDepotDistanceKm) * 10) / 10

  const insights: string[] = []
  if (totalKm > 100) insights.push('Long Distance Journey')
  if (totalKm <= 50) insights.push('Urban Journey')
  if (destination.country && destination.country.toLowerCase() !== 'nigeria') {
    insights.push('International Border Crossing - Special Request')
  }

  return {
    distanceKm: totalKm,
    distanceMeters: totalKm * 1000,
    depotDistanceKm: fallbackDepotDistanceKm,
    billableDistanceKm: fallbackBillableDistanceKm,
    durationMins: totalMins,
    durationSeconds: totalMins * 60,
    durationText: `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`,
    routePolyline: null,
    journeyBounds: null,
    journeyInsights: insights,
    directionsResult: null,
    selectedRouteIndex: 0,
    isFallback: true,
  }
}
