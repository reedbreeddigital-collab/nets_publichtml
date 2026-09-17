import { useState, useEffect, useRef } from 'react'
import { MapPin } from 'lucide-react'
import { LocationData, useJourneyStore } from '../../store/useJourneyStore'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { geocodeAddress } from '../../config/api'

interface GooglePlacesAutocompleteProps {
  value: string | null
  onChange: (value: string) => void
  onLocationSelect: (location: LocationData) => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
  id?: string
}

export function GooglePlacesAutocomplete({ value, onChange, onLocationSelect, placeholder, className, style, id }: GooglePlacesAutocompleteProps) {
  const [query, setQuery] = useState(value || '')
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  
  const placesLibrary = useMapsLibrary('places')
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null)
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null)

  useEffect(() => {
    if (!placesLibrary) return
    setAutocompleteService(new placesLibrary.AutocompleteService())
    
    const dummyDiv = document.createElement('div')
    setPlacesService(new placesLibrary.PlacesService(dummyDiv))
  }, [placesLibrary])

  const isTypingRef = useRef(false)
  const selectedPlaceRef = useRef<string | null>(value || null)

  useEffect(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false
      return
    }
    setQuery(value || '')
    selectedPlaceRef.current = value || null
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchPlaces = async () => {
      const trimmed = (query || '').trim()
      if (!trimmed || trimmed.length < 3 || !autocompleteService) {
        setSuggestions([])
        return
      }

      if (trimmed === selectedPlaceRef.current) {
        setSuggestions([])
        return
      }

      autocompleteService.getPlacePredictions({
        input: trimmed,
        componentRestrictions: { country: ['ng', 'bj', 'ne', 'td', 'cm'] }
      }, (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
          setSuggestions(predictions)
          setIsOpen(true)
        } else {
          setSuggestions([])
        }
      })
    }
    const timeoutId = setTimeout(fetchPlaces, 300)
    return () => clearTimeout(timeoutId)
  }, [query, autocompleteService])

  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    const placeName = prediction.description
    isTypingRef.current = false
    selectedPlaceRef.current = placeName
    setQuery(placeName)
    setIsOpen(false)
    setSuggestions([])
    onChange(placeName)

    // Immediately commit the full location address text
    onLocationSelect({
      address: placeName,
      lat: 0,
      lng: 0,
      country: 'Nigeria'
    })

    const applyLocation = (lat: number, lng: number, country: string) => {
      if (country.toLowerCase() !== 'nigeria') {
        useJourneyStore.getState().setInternationalModalOpen(true)
        setQuery('')
        selectedPlaceRef.current = null
        onLocationSelect({ address: '', lat: 0, lng: 0 })
        return
      }

      onLocationSelect({
        address: placeName,
        lat,
        lng,
        country
      })
    }

    if (placesService) {
      placesService.getDetails({ placeId: prediction.place_id }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          let country = 'Nigeria'
          place.address_components?.forEach(component => {
            if (component.types.includes('country')) {
              country = component.long_name
            }
          })

          applyLocation(place.geometry.location.lat(), place.geometry.location.lng(), country)
        } else {
          // Fallback if placesService failed
          geocodeAddress(placeName).then(coords => {
            if (coords) {
              applyLocation(coords.lat, coords.lng, coords.country || 'Nigeria')
            }
          })
        }
      })
    } else {
      // Fallback if placesService is not ready
      geocodeAddress(placeName).then(coords => {
        if (coords) {
          applyLocation(coords.lat, coords.lng, coords.country || 'Nigeria')
        }
      })
    }
  }

  const handleBlur = () => {
    // Delay slightly to let click on suggestion fire first
    setTimeout(() => {
      if (query.trim().length >= 3 && query.trim() !== selectedPlaceRef.current) {
        geocodeAddress(query.trim()).then(coords => {
          if (coords) {
            if ((coords.country || 'Nigeria').toLowerCase() !== 'nigeria') {
              useJourneyStore.getState().setInternationalModalOpen(true)
              setQuery('')
              selectedPlaceRef.current = null
              return
            }
            selectedPlaceRef.current = query.trim()
            onLocationSelect({
              address: query.trim(),
              lat: coords.lat,
              lng: coords.lng,
              country: coords.country || 'Nigeria'
            })
          }
        })
      }
    }, 250)
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', zIndex: isOpen ? 60 : 'auto' }}>
      <input
        id={id}
        type="text"
        value={query}
        onChange={(e) => {
          isTypingRef.current = true
          selectedPlaceRef.current = null
          setQuery(e.target.value)
          onChange(e.target.value)
        }}
        onBlur={handleBlur}
        onFocus={() => { if (suggestions.length > 0) setIsOpen(true) }}
        placeholder={placeholder}
        className={className}
        style={style}
      />
      {isOpen && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'var(--color-nets-navy-dark, #0d1060)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '4px',
          marginTop: '4px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          maxHeight: '240px',
          overflowY: 'auto'
        }}>
          {suggestions.map((s) => {
            const mainText = s.structured_formatting?.main_text || s.description || ''
            const secondaryText = s.structured_formatting?.secondary_text || ''
            return (
              <div
                key={s.place_id || s.description}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(s)
                }}
                onClick={() => handleSelect(s)}
                style={{
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '0.875rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ color: 'var(--color-nets-text-3)', display: 'flex', alignItems: 'center' }}>
                  <MapPin size={16} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mainText}</div>
                  {secondaryText && (
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {secondaryText}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
