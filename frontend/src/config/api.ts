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

const getGoogleMapsApiKey = (): string => {
  return import.meta.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCPSko-yh7VsQtpPyKzRmbXJWQOdcCJ8BE'
}

export const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey()

export const PAYSTACK_PUBLIC_KEY = 
  import.meta.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 
  import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 
  'pk_live_744369c487505db8ecdde2f521781cfce2993ca2'

export const EMAIL_PROXY_URL = 
  import.meta.env.VITE_EMAIL_PROXY_URL || 
  'https://mail.neweratransports.com/email_proxy/api/send-email.php'

export const EMAIL_PROXY_KEY = 
  import.meta.env.VITE_EMAIL_PROXY_KEY || 
  'ep_live_6f3b92d8a4c1e7f50b4a1d9c2e8f7a3b'

export const CLOUDINARY_CLOUD_NAME = 
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 
  'wnmabxiy'

export const CLOUDINARY_API_KEY = 
  import.meta.env.VITE_CLOUDINARY_API_KEY || 
  '768523141117821'

export const CLOUDINARY_API_SECRET = 
  import.meta.env.VITE_CLOUDINARY_API_SECRET || 
  'KeVQI7I7tuGlCxUIdWC9M6RdWjg'

export const CLOUDINARY_URL = 
  import.meta.env.VITE_CLOUDINARY_URL || 
  'cloudinary://768523141117821:KeVQI7I7tuGlCxUIdWC9M6RdWjg@wnmabxiy'

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number, country?: string } | null> {
  try {
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
