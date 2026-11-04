// ============================================================================
// NETS Admin — Location Autocomplete & Geocoding Input
// ============================================================================
import { useState, useEffect, useRef } from 'react'
import { MapPin, X, Loader2, Navigation, ChevronDown } from 'lucide-react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { geocodeAddress } from '../../config/api'

export interface AdminLocationValue {
  address: string
  lat: number
  lng: number
  placeId?: string
  country?: string
}

interface AdminLocationInputProps {
  label?: string
  placeholder?: string
  value: string
  onChange: (address: string) => void
  onLocationSelect: (loc: AdminLocationValue) => void
  onClear?: () => void
  disabled?: boolean
  required?: boolean
  presetOptions?: { label: string; address: string; lat: number; lng: number }[]
  accentColor?: string
}

export const POPULAR_NIGERIAN_LOCATIONS: { label: string; address: string; lat: number; lng: number }[] = [
  { label: 'Lagos — Murtala Muhammed Intl Airport (LOS)', address: 'Murtala Muhammed International Airport, Ikeja, Lagos', lat: 6.5774, lng: 3.3212 },
  { label: 'Lagos — Ikeja (Allen / Government Secretariat)', address: 'Ikeja, Lagos State, Nigeria', lat: 6.6018, lng: 3.3515 },
  { label: 'Lagos — Victoria Island (Eko Hotel / Adeola Odeku)', address: 'Victoria Island, Lagos, Nigeria', lat: 6.4281, lng: 3.4219 },
  { label: 'Lagos — Lekki Phase 1 (Admiralty Way)', address: 'Lekki Phase 1, Lekki, Lagos State', lat: 6.4474, lng: 3.4723 },
  { label: 'Lagos — Lekki Free Trade Zone / Dangote Refinery', address: 'Lekki Free Trade Zone, Ibeju-Lekki, Lagos', lat: 6.4350, lng: 4.0430 },
  { label: 'Lagos — Festac Town (NETS Central Depot)', address: 'Skillup Academy, House 32 2nd Ave, Festac Town, Lagos', lat: 6.4625, lng: 3.2809 },
  { label: 'Ibadan — Bodija / Secretariat, Oyo State', address: 'Bodija, Ibadan, Oyo State, Nigeria', lat: 7.4343, lng: 3.9048 },
  { label: 'Abuja — Nnamdi Azikiwe Intl Airport (ABV)', address: 'Nnamdi Azikiwe International Airport, Abuja', lat: 9.0065, lng: 7.2631 },
  { label: 'Abuja — Central Business District (CBD / Maitama)', address: 'Central Business District, Abuja, Nigeria', lat: 9.0765, lng: 7.4875 },
  { label: 'Abeokuta — Oke-Mosan, Ogun State', address: 'Oke-Mosan, Abeokuta, Ogun State, Nigeria', lat: 7.1475, lng: 3.3619 },
  { label: 'Benin City — Ring Road / Airport, Edo State', address: 'Benin City, Edo State, Nigeria', lat: 6.3350, lng: 5.6037 },
  { label: 'Port Harcourt — Intl Airport / GRA Phase 2, Rivers', address: 'Port Harcourt International Airport, Omagwa, Rivers', lat: 4.8156, lng: 7.0498 },
  { label: 'Enugu — Akanu Ibiam Intl Airport / City Center', address: 'Akanu Ibiam International Airport, Enugu, Enugu State', lat: 6.4584, lng: 7.5464 },
  { label: 'Owerri — Sam Mbakwe Airport / City Center, Imo', address: 'Owerri, Imo State, Nigeria', lat: 5.4891, lng: 7.0176 },
  { label: 'Asaba — Asaba Intl Airport, Delta State', address: 'Asaba International Airport, Asaba, Delta State', lat: 6.2059, lng: 6.6664 },
  { label: 'Warri — Airport / Refinery, Delta State', address: 'Warri, Delta State, Nigeria', lat: 5.5544, lng: 5.7932 },
  { label: 'Kaduna — Kaduna Central / Airport, Kaduna', address: 'Kaduna Central, Kaduna State, Nigeria', lat: 10.5105, lng: 7.4165 },
  { label: 'Kano — Mallam Aminu Kano Intl Airport, Kano', address: 'Mallam Aminu Kano International Airport, Kano State', lat: 12.0022, lng: 8.5920 },
  { label: 'Akure — Alagbaka / Airport, Ondo State', address: 'Akure, Ondo State, Nigeria', lat: 7.2571, lng: 5.2058 },
  { label: 'Calabar — Margaret Ekpo Airport, Cross River', address: 'Calabar, Cross River State, Nigeria', lat: 4.9757, lng: 8.3417 },
  { label: 'Uyo — Victor Attah Intl Airport, Akwa Ibom', address: 'Victor Attah International Airport, Uyo, Akwa Ibom', lat: 5.0377, lng: 7.9128 },
]

export function AdminLocationInput({
  label,
  placeholder = 'Enter city, airport, landmark or address…',
  value,
  onChange,
  onLocationSelect,
  onClear,
  disabled = false,
  required = false,
  presetOptions = POPULAR_NIGERIAN_LOCATIONS,
  accentColor = 'var(--adm-accent)',
}: AdminLocationInputProps) {
  const [query, setQuery] = useState(value || '')
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const placesLibrary = useMapsLibrary('places')
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null)
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null)

  useEffect(() => {
    if (!placesLibrary) return
    try {
      setAutocompleteService(new placesLibrary.AutocompleteService())
      const dummy = document.createElement('div')
      setPlacesService(new placesLibrary.PlacesService(dummy))
    } catch (e) {
      console.warn('Could not instantiate Google Places service:', e)
    }
  }, [placesLibrary])

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setShowPresets(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Google Places autocomplete prediction query
  useEffect(() => {
    const trimmed = (query || '').trim()
    if (!trimmed || trimmed.length < 2 || !autocompleteService) {
      setSuggestions([])
      return
    }

    let isCurrent = true
    const timer = setTimeout(() => {
      setLoading(true)
      autocompleteService.getPlacePredictions(
        {
          input: trimmed,
          componentRestrictions: { country: ['ng', 'bj', 'ne', 'td', 'cm'] },
        },
        (predictions, status) => {
          if (!isCurrent) return
          setLoading(false)
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
            setSuggestions(predictions)
            setIsOpen(true)
          } else {
            setSuggestions([])
          }
        }
      )
    }, 250)

    return () => {
      isCurrent = false
      clearTimeout(timer)
    }
  }, [query, autocompleteService])

  const handleSelectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    const address = prediction.description
    setQuery(address)
    onChange(address)
    setIsOpen(false)
    setSuggestions([])
    setLoading(true)

    if (placesService) {
      placesService.getDetails({ placeId: prediction.place_id }, (place, status) => {
        setLoading(false)
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          let country = 'Nigeria'
          place.address_components?.forEach((c) => {
            if (c.types.includes('country')) country = c.long_name
          })
          onLocationSelect({ address, lat, lng, placeId: prediction.place_id, country })
        } else {
          // Geocode fallback
          geocodeAddress(address).then((coords) => {
            if (coords) {
              onLocationSelect({ address, lat: coords.lat, lng: coords.lng, country: coords.country || 'Nigeria' })
            }
          })
        }
      })
    } else {
      geocodeAddress(address).then((coords) => {
        setLoading(false)
        if (coords) {
          onLocationSelect({ address, lat: coords.lat, lng: coords.lng, country: coords.country || 'Nigeria' })
        }
      })
    }
  }

  const handleSelectPreset = (p: { label: string; address: string; lat: number; lng: number }) => {
    setQuery(p.address)
    onChange(p.address)
    setShowPresets(false)
    setIsOpen(false)
    onLocationSelect({ address: p.address, lat: p.lat, lng: p.lng, country: 'Nigeria' })
  }

  const handleManualBlurOrEnter = async () => {
    const trimmed = (query || '').trim()
    if (!trimmed) return
    // Check if matches a known preset
    const matched = presetOptions.find(
      (p) => p.address.toLowerCase() === trimmed.toLowerCase() || p.label.toLowerCase().includes(trimmed.toLowerCase())
    )
    if (matched) {
      onLocationSelect({ address: matched.address, lat: matched.lat, lng: matched.lng, country: 'Nigeria' })
      return
    }

    setLoading(true)
    const coords = await geocodeAddress(trimmed)
    setLoading(false)
    if (coords) {
      onLocationSelect({ address: trimmed, lat: coords.lat, lng: coords.lng, country: coords.country || 'Nigeria' })
    }
  }

  const handleClear = () => {
    setQuery('')
    onChange('')
    setSuggestions([])
    setIsOpen(false)
    setShowPresets(false)
    if (onClear) onClear()
  }

  return (
    <div className="admin-form-group" style={{ position: 'relative' }} ref={wrapperRef}>
      {label && (
        <label className={`admin-label ${required ? 'admin-label-req' : ''}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{label}</span>
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-accent)',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              padding: 0,
            }}
          >
            Popular Hubs <ChevronDown size={11} style={{ transform: showPresets ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: '10px', color: accentColor, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
          <MapPin size={16} />
        </div>

        <input
          type="text"
          className="admin-input"
          style={{
            paddingLeft: '32px',
            paddingRight: (query ? '56px' : '30px'),
            fontWeight: 500,
            fontSize: '13px',
          }}
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value)
            onChange(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              setIsOpen(false)
              handleManualBlurOrEnter()
            }
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true)
          }}
        />

        <div style={{ position: 'absolute', right: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--adm-text-3)' }} />}
          {query && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--adm-text-3)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Clear"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Predictions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--adm-surface)',
            border: '1px solid var(--adm-border)',
            borderRadius: 'var(--adm-radius-sm)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 150,
            maxHeight: '260px',
            overflowY: 'auto',
          }}
        >
          {suggestions.map((s) => (
            <button
              key={s.place_id}
              type="button"
              onClick={() => handleSelectPrediction(s)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                width: '100%',
                padding: '8px 12px',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--adm-border-subtle)',
                cursor: 'pointer',
                fontSize: '12.5px',
                color: 'var(--adm-text-1)',
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--adm-surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Navigation size={13} style={{ color: 'var(--adm-text-3)', flexShrink: 0, marginTop: 3 }} />
              <div>
                <div style={{ fontWeight: 600 }}>{s.structured_formatting?.main_text || s.description}</div>
                {s.structured_formatting?.secondary_text && (
                  <div style={{ fontSize: '11px', color: 'var(--adm-text-3)' }}>
                    {s.structured_formatting.secondary_text}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Quick Presets Picker Menu */}
      {showPresets && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--adm-surface)',
            border: '1px solid var(--adm-border)',
            borderRadius: 'var(--adm-radius-sm)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
            zIndex: 160,
            maxHeight: '260px',
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: '6px 10px', fontSize: '10.5px', fontWeight: 700, color: 'var(--adm-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--adm-border)' }}>
            Select Nigerian Transportation Hub
          </div>
          {presetOptions.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectPreset(p)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '8px 12px',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--adm-border-subtle)',
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--adm-text-1)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--adm-surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <MapPin size={12} color="var(--adm-accent)" style={{ flexShrink: 0 }} />
              <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <span style={{ fontWeight: 600 }}>{p.label}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
