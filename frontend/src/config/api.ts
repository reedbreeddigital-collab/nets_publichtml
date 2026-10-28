/**
 * Centralized Environment & API Configuration
 */

export const BACKEND_URL = 
  (import.meta.env.NEXT_PUBLIC_API_URL || 
   import.meta.env.VITE_API_URL || 
   'https://nets-publichtml.onrender.com')
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/, '')

export const API_URL = `${BACKEND_URL}/api/v1`

export let GOOGLE_MAPS_API_KEY = ''

export let PAYSTACK_PUBLIC_KEY = ''

export const EMAIL_PROXY_URL = 
  import.meta.env.VITE_EMAIL_PROXY_URL || 
  'https://mail.neweratransports.com/email_proxy/api/send-email.php'

export const EMAIL_PROXY_KEY = 
  import.meta.env.VITE_EMAIL_PROXY_KEY || 
  'ep_live_6f3b92d8a4c1e7f50b4a1d9c2e8f7a3b'

export interface BackendServiceConfig {
  databaseDriver: string
  databaseStatus: string
  databaseUrl: string
  cloudinaryCloud: string
  googleMapsApiKey: string
  paystackPublicKey: string
  environment: string
}

let cachedServiceConfig: BackendServiceConfig | null = null
const configListeners = new Set<(cfg: BackendServiceConfig) => void>()

export function subscribeBackendServiceConfig(listener: (cfg: BackendServiceConfig) => void): () => void {
  if (cachedServiceConfig) {
    listener(cachedServiceConfig)
  }
  configListeners.add(listener)
  return () => {
    configListeners.delete(listener)
  }
}

/**
 * Fetch active database, Cloudinary, Google Maps & Paystack configuration directly from the backend service
 * without hardcoding credentials in the frontend.
 */
export async function fetchBackendServiceConfig(): Promise<BackendServiceConfig | null> {
  if (cachedServiceConfig) {
    return cachedServiceConfig
  }
  try {
    const res = await fetch(`${API_URL}/health`)
    if (res.ok) {
      const json = await res.json()
      const data = json.data || json
      if (data.googleMapsApiKey) {
        GOOGLE_MAPS_API_KEY = data.googleMapsApiKey
      }
      if (data.paystackPublicKey) {
        PAYSTACK_PUBLIC_KEY = data.paystackPublicKey
      }
      cachedServiceConfig = {
        databaseDriver: data.databaseDriver || 'postgres',
        databaseStatus: data.databaseStatus || 'connected',
        databaseUrl: data.databaseUrl || '',
        cloudinaryCloud: data.cloudinaryCloud || '',
        googleMapsApiKey: data.googleMapsApiKey || '',
        paystackPublicKey: data.paystackPublicKey || '',
        environment: data.environment || 'production',
      }
      configListeners.forEach(fn => fn(cachedServiceConfig!))
      return cachedServiceConfig
    }
  } catch (err) {
    console.warn('Could not fetch service configuration from backend:', err)
  }
  return null
}

// Kick off initial background fetch of backend service configuration on load
fetchBackendServiceConfig()

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number, country?: string } | null> {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      await fetchBackendServiceConfig()
    }
    const query = encodeURIComponent(address)
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${GOOGLE_MAPS_API_KEY}&components=country:NG|country:BJ|country:NE|country:TD|country:CM`
    const res = await fetch(url)
    const data = await res.json()
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location
      let country = 'Nigeria'
      data.results[0].address_components?.forEach((c: any) => {
        if (c.types.includes('country')) {
          country = c.long_name
        }
      })
      return { lng: location.lng, lat: location.lat, country }
    }
  } catch (err) {
    console.error('Geocoding error:', err)
  }
  return null
}
