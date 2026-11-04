// ============================================================================
// NETS Admin — Distance & Route Intelligence Calculator Widget
// ============================================================================
// Robust distance lookup engine with Google Directions API, Geocoding fallback,
// Nigerian road tortuosity intelligence, depot repositioning, fuel consumption,
// and real-time fleet quotation estimates.
// ============================================================================
import { useState, useEffect, useRef } from 'react'
import {
  MapPin, ArrowLeftRight, Plus, Trash2, Calculator, Copy, Check,
  RotateCcw, Clock, Compass, Fuel, DollarSign, Layers, ExternalLink,
  ChevronDown, ChevronUp, AlertCircle, ShieldAlert, Sparkles, Navigation
} from 'lucide-react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { AdminLocationInput, type AdminLocationValue } from './AdminLocationInput'
import { DistanceCalculatorMap } from './DistanceCalculatorMap'
import { calculateFullRoute, getFallbackDistanceKm, type RouteCalculationResult } from '../../services/routeService'
import { fetchPricingConfig, type PricingConfig, DEFAULT_DEPOT_ADDRESS } from '../../pricing/adminPricingConfig'
import { calculatePricingFromConfig } from '../../pricing/estimateGenerator'
import { formatCurrency } from '../../pricing/pricingFormatter'

export interface DistanceCalculatorWidgetProps {
  initialOrigin?: string
  initialDestination?: string
  initialStops?: string[]
  compact?: boolean
  showMapDefault?: boolean
  onClose?: () => void
  onApplyDistance?: (distanceKm: number, durationText: string, result: RouteCalculationResult) => void
  title?: string
  subtitle?: string
}

interface IntermediateStop {
  id: string
  address: string
  location: AdminLocationValue | null
}

const NIGERIAN_ROUTE_PRESETS = [
  {
    name: 'Lagos Airport (LOS) → Victoria Island',
    origin: { label: 'LOS Airport', address: 'Murtala Muhammed International Airport, Ikeja, Lagos', lat: 6.5774, lng: 3.3212 },
    dest: { label: 'Victoria Island', address: 'Victoria Island, Lagos, Nigeria', lat: 6.4281, lng: 3.4219 },
  },
  {
    name: 'Ikeja → Lekki Phase 1',
    origin: { label: 'Ikeja', address: 'Ikeja, Lagos State, Nigeria', lat: 6.6018, lng: 3.3515 },
    dest: { label: 'Lekki Phase 1', address: 'Lekki Phase 1, Lekki, Lagos State', lat: 6.4474, lng: 3.4723 },
  },
  {
    name: 'Lagos (Ikeja) → Ibadan (Bodija)',
    origin: { label: 'Lagos (Ikeja)', address: 'Ikeja, Lagos State, Nigeria', lat: 6.6018, lng: 3.3515 },
    dest: { label: 'Ibadan (Bodija)', address: 'Bodija, Ibadan, Oyo State, Nigeria', lat: 7.4343, lng: 3.9048 },
  },
  {
    name: 'Abuja Airport (ABV) → Central Business District',
    origin: { label: 'ABV Airport', address: 'Nnamdi Azikiwe International Airport, Abuja', lat: 9.0065, lng: 7.2631 },
    dest: { label: 'Abuja CBD', address: 'Central Business District, Abuja, Nigeria', lat: 9.0765, lng: 7.4875 },
  },
  {
    name: 'Lagos (VI) → Abeokuta (Oke-Mosan)',
    origin: { label: 'Victoria Island', address: 'Victoria Island, Lagos, Nigeria', lat: 6.4281, lng: 3.4219 },
    dest: { label: 'Abeokuta', address: 'Oke-Mosan, Abeokuta, Ogun State, Nigeria', lat: 7.1475, lng: 3.3619 },
  },
  {
    name: 'Lagos (Ikeja) → Benin City (Ring Road)',
    origin: { label: 'Lagos', address: 'Ikeja, Lagos State, Nigeria', lat: 6.6018, lng: 3.3515 },
    dest: { label: 'Benin City', address: 'Benin City, Edo State, Nigeria', lat: 6.3350, lng: 5.6037 },
  },
  {
    name: 'Abuja (CBD) → Kaduna Central',
    origin: { label: 'Abuja CBD', address: 'Central Business District, Abuja, Nigeria', lat: 9.0765, lng: 7.4875 },
    dest: { label: 'Kaduna', address: 'Kaduna Central, Kaduna State, Nigeria', lat: 10.5105, lng: 7.4165 },
  },
  {
    name: 'Port Harcourt Airport → Owerri (City Center)',
    origin: { label: 'PH Airport', address: 'Port Harcourt International Airport, Omagwa, Rivers', lat: 4.8156, lng: 7.0498 },
    dest: { label: 'Owerri', address: 'Owerri, Imo State, Nigeria', lat: 5.4891, lng: 7.0176 },
  },
  {
    name: 'Lagos (VI) → Dangote Refinery / Epe',
    origin: { label: 'Victoria Island', address: 'Victoria Island, Lagos, Nigeria', lat: 6.4281, lng: 3.4219 },
    dest: { label: 'Dangote Refinery', address: 'Lekki Free Trade Zone, Ibeju-Lekki, Lagos', lat: 6.4350, lng: 4.0430 },
  },
  {
    name: 'Enugu Airport → Awka (Government House)',
    origin: { label: 'Enugu Airport', address: 'Akanu Ibiam International Airport, Enugu, Enugu State', lat: 6.4584, lng: 7.5464 },
    dest: { label: 'Awka', address: 'Awka, Anambra State, Nigeria', lat: 6.2209, lng: 7.0713 },
  },
]

const VEHICLE_OPTIONS = [
  { id: 'hiace', name: 'Toyota HiAce (14-Passenger Minibus)', fuelRatio: 0.16, category: 'Executive Minibus' },
  { id: 'coaster', name: 'Toyota Coaster (30-Passenger Luxury Bus)', fuelRatio: 0.28, category: 'Luxury Coach' },
  { id: 'sedan', name: 'Executive Sedan / Saloon (Camry/Corolla)', fuelRatio: 0.10, category: 'Chauffeured Saloon' },
  { id: 'suv', name: 'Executive SUV (Prado / Fortuner / Sienna)', fuelRatio: 0.16, category: 'Executive SUV' },
]

export function DistanceCalculatorWidget({
  initialOrigin = '',
  initialDestination = '',
  initialStops = [],
  compact = false,
  showMapDefault = true,
  onClose,
  onApplyDistance,
  title,
  subtitle,
}: DistanceCalculatorWidgetProps) {
  // Input states
  const [originAddress, setOriginAddress] = useState(initialOrigin)
  const [originLocation, setOriginLocation] = useState<AdminLocationValue | null>(
    initialOrigin ? { address: initialOrigin, lat: 0, lng: 0 } : null
  )

  const [destAddress, setDestAddress] = useState(initialDestination)
  const [destLocation, setDestLocation] = useState<AdminLocationValue | null>(
    initialDestination ? { address: initialDestination, lat: 0, lng: 0 } : null
  )

  const [stops, setStops] = useState<IntermediateStop[]>(() =>
    initialStops.map((s, idx) => ({
      id: `stop-${idx}-${Date.now()}`,
      address: s,
      location: s ? { address: s, lat: 0, lng: 0 } : null,
    }))
  )

  // Options
  const [isRoundTrip, setIsRoundTrip] = useState(false)
  const [includeDepot, setIncludeDepot] = useState(true)
  const [selectedVehicleId, setSelectedVehicleId] = useState('hiace')
  const [showMap, setShowMap] = useState(showMapDefault)
  const [showPresets, setShowPresets] = useState(!compact && !initialOrigin)

  // Results
  const [calculation, setCalculation] = useState<RouteCalculationResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [calcError, setCalcError] = useState<string | null>(null)
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null)
  const [copied, setCopied] = useState(false)

  const routesLibrary = useMapsLibrary('routes')
  const hasAutoRunRef = useRef(false)

  // Load pricing configuration for live fuel & charter pricing formulas
  useEffect(() => {
    fetchPricingConfig().then(setPricingConfig).catch(() => null)
  }, [])

  // Auto calculate if initial origin & destination are provided
  useEffect(() => {
    if (initialOrigin && initialDestination && !hasAutoRunRef.current) {
      hasAutoRunRef.current = true
      handleCalculate()
    }
  }, [initialOrigin, initialDestination])

  const handleAddStop = () => {
    if (stops.length >= 5) return
    setStops((prev) => [
      ...prev,
      { id: `stop-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, address: '', location: null },
    ])
  }

  const handleRemoveStop = (id: string) => {
    setStops((prev) => prev.filter((s) => s.id !== id))
  }

  const handleStopChange = (id: string, address: string) => {
    setStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, address, location: s.location ? { ...s.location, address } : null } : s))
    )
  }

  const handleStopSelect = (id: string, loc: AdminLocationValue) => {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, address: loc.address, location: loc } : s)))
  }

  const handleSwap = () => {
    const tempAddr = originAddress
    const tempLoc = originLocation
    setOriginAddress(destAddress)
    setOriginLocation(destLocation)
    setDestAddress(tempAddr)
    setDestLocation(tempLoc)
  }

  const handleReset = () => {
    setOriginAddress('')
    setOriginLocation(null)
    setDestAddress('')
    setDestLocation(null)
    setStops([])
    setCalculation(null)
    setCalcError(null)
  }

  const handleApplyPreset = (preset: (typeof NIGERIAN_ROUTE_PRESETS)[0]) => {
    setOriginAddress(preset.origin.address)
    setOriginLocation(preset.origin)
    setDestAddress(preset.dest.address)
    setDestLocation(preset.dest)
    setStops([])
    setCalcError(null)

    // Run distance lookup with fresh preset coordinates immediately
    runRouteCalculation(preset.origin, preset.dest, [])
  }

  const runRouteCalculation = async (
    origin: AdminLocationValue | null,
    dest: AdminLocationValue | null,
    activeStops: IntermediateStop[]
  ) => {
    if (!origin?.address?.trim() || !dest?.address?.trim()) {
      setCalcError('Please enter both origin and destination locations.')
      return
    }

    setCalculating(true)
    setCalcError(null)

    try {
      const stopLocations = activeStops
        .filter((s) => s.address?.trim())
        .map((s) => s.location || { address: s.address, lat: 0, lng: 0 })

      const result = await calculateFullRoute(
        origin,
        dest,
        stopLocations,
        routesLibrary
      )

      setCalculation(result)
    } catch (err: any) {
      console.error('Route calculation error:', err)
      setCalcError(err?.message || 'Unable to calculate distance between specified locations. Check connectivity or spelling.')
    } finally {
      setCalculating(false)
    }
  }

  const handleCalculate = () => {
    const oLoc = originLocation || (originAddress ? { address: originAddress, lat: 0, lng: 0 } : null)
    const dLoc = destLocation || (destAddress ? { address: destAddress, lat: 0, lng: 0 } : null)
    runRouteCalculation(oLoc, dLoc, stops)
  }

  // Derived metrics with round-trip and depot toggles
  const baseOneWayKm = calculation?.distanceKm ?? 0
  const effectiveDistanceKm = isRoundTrip ? Math.round(baseOneWayKm * 2 * 10) / 10 : baseOneWayKm
  const depotKm = includeDepot ? (calculation?.depotDistanceKm ?? 0) : 0
  const totalBillableKm = Math.round((effectiveDistanceKm + depotKm) * 10) / 10

  // Straight line vs road factor calculation
  let straightLineKm = 0
  if (originLocation?.lat && originLocation?.lng && destLocation?.lat && destLocation?.lng) {
    straightLineKm = Math.round(
      getFallbackDistanceKm(originLocation.lat, originLocation.lng, destLocation.lat, destLocation.lng) * 10
    ) / 10
  }
  const roadFactor = straightLineKm > 0 && baseOneWayKm > 0 ? (baseOneWayKm / straightLineKm).toFixed(2) : '1.35'

  // Fuel calculation
  const currentVehicle = VEHICLE_OPTIONS.find((v) => v.id === selectedVehicleId) || VEHICLE_OPTIONS[0]
  const fuelRatio =
    selectedVehicleId === 'coaster'
      ? pricingConfig?.coasterFuelRatio ?? 0.28
      : selectedVehicleId === 'sedan'
      ? pricingConfig?.saloonFuelRatio ?? 0.10
      : pricingConfig?.hiaceFuelRatio ?? 0.16
  const fuelPricePerLitre = pricingConfig?.fuelPricePerLitre ?? 1150 // Current Nigerian diesel/PMS benchmark
  const estimatedFuelLitres = Math.round(totalBillableKm * fuelRatio * 10) / 10
  const estimatedFuelCost = Math.round(estimatedFuelLitres * fuelPricePerLitre)

  // Pricing estimate using NETS config
  let estimatedPriceRange: { min: number; max: number } | null = null
  if (pricingConfig && totalBillableKm > 0) {
    try {
      const inv = calculatePricingFromConfig(
        {
          vehicleId: selectedVehicleId,
          distanceKm: totalBillableKm,
          routeDistanceKm: effectiveDistanceKm,
          depotDistanceKm: depotKm,
          numberOfDays: 1,
          tripType: isRoundTrip ? 'To & Fro' : 'Drop-Off',
        },
        pricingConfig
      )
      const baseVal = inv.estimatedInvestment
      estimatedPriceRange = {
        min: Math.round(baseVal * 0.95),
        max: Math.round(baseVal * 1.1),
      }
    } catch (_) {}
  }

  // Route corridor name extracted from Google Directions legs if present
  const chosenRoute = calculation?.directionsResult?.routes?.[calculation?.selectedRouteIndex || 0]
  const corridorSummary = chosenRoute?.summary || ''
  const legs = chosenRoute?.legs || []

  // Copy structured report to clipboard for sales closers / operations
  const handleCopySummary = () => {
    if (!calculation) return
    const text = [
      `📍 NETS ROUTE DISTANCE & LOGISTICS SPECIFICATION`,
      `=========================================`,
      `• Origin: ${originAddress}`,
      stops.length > 0
        ? `• Stops: ${stops.filter((s) => s.address).map((s, i) => `${i + 1}. ${s.address}`).join(' ➔ ')}`
        : null,
      `• Destination: ${destAddress}`,
      `• Trip Type: ${isRoundTrip ? 'Round-Trip (Return)' : 'One-Way Direct'}`,
      `• Driving Road Distance: ${effectiveDistanceKm} km`,
      `• Est. Travel Duration: ${calculation.durationText}`,
      includeDepot ? `• Depot Repositioning: ${depotKm} km (Festac Central Depot)` : null,
      `• Total Billable Distance: ${totalBillableKm} km`,
      corridorSummary ? `• Highway Corridor: via ${corridorSummary}` : null,
      `• Selected Fleet: ${currentVehicle.name}`,
      `• Est. Fuel Requirement: ~${estimatedFuelLitres} Litres (₦${estimatedFuelCost.toLocaleString('en-NG')})`,
      estimatedPriceRange
        ? `• Indicative Charter Range: ${formatCurrency(estimatedPriceRange.min)} – ${formatCurrency(estimatedPriceRange.max)}`
        : null,
      `=========================================`,
      `Generated via NETS Control Center Distance Engine`,
    ]
      .filter(Boolean)
      .join('\n')

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div
      className="admin-card"
      style={{
        padding: compact ? '1.25rem' : '1.5rem',
        background: 'var(--adm-surface)',
        border: '1px solid var(--adm-border)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          paddingBottom: '0.875rem',
          borderBottom: '1px solid var(--adm-border)',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--adm-radius-sm)',
              background: 'rgba(196, 0, 0, 0.1)',
              color: 'var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Calculator size={18} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--adm-text-1)', letterSpacing: '-0.01em' }}>
              {title || 'Route Distance & Travel Intelligence Calculator'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--adm-text-3)', marginTop: 2 }}>
              {subtitle || 'Instant Nigerian highway mileage, transit duration, depot positioning, and charter estimates'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {calculation && (
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              onClick={handleCopySummary}
              title="Copy structured distance & pricing summary to clipboard"
            >
              {copied ? <Check size={13} color="var(--adm-success)" /> : <Copy size={13} />}
              {copied ? 'Copied Summary!' : 'Copy Summary'}
            </button>
          )}

          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm"
            onClick={handleReset}
            title="Reset calculator inputs"
          >
            <RotateCcw size={13} /> Clear
          </button>

          {onClose && (
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              onClick={onClose}
              style={{ padding: '0.3rem 0.5rem' }}
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Preset Hubs Strip */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Popular Nigerian Routes (1-Click Lookup)
          </span>
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            style={{ background: 'transparent', border: 'none', color: 'var(--adm-accent)', fontSize: 11, cursor: 'pointer', padding: 0 }}
          >
            {showPresets ? 'Hide presets' : 'Show all presets'}
          </button>
        </div>

        {showPresets && (
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              paddingBottom: '0.375rem',
              scrollbarWidth: 'thin',
            }}
          >
            {NIGERIAN_ROUTE_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                style={{
                  background: 'var(--adm-surface-2)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '20px',
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  color: 'var(--adm-text-2)',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.12s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(196, 0, 0, 0.08)'
                  e.currentTarget.style.borderColor = 'var(--adm-accent)'
                  e.currentTarget.style.color = 'var(--adm-accent)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--adm-surface-2)'
                  e.currentTarget.style.borderColor = 'var(--adm-border)'
                  e.currentTarget.style.color = 'var(--adm-text-2)'
                }}
              >
                <Sparkles size={11} color="var(--adm-accent)" />
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Form Inputs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr auto 1fr', gap: '0.75rem', alignItems: 'flex-end' }}>
          {/* Origin Input */}
          <AdminLocationInput
            label="Origin / Pickup Location"
            placeholder="e.g. Murtala Muhammed Airport, Ikeja, Lagos"
            value={originAddress}
            onChange={(val) => {
              setOriginAddress(val)
              setOriginLocation(null)
            }}
            onLocationSelect={(loc) => {
              setOriginAddress(loc.address)
              setOriginLocation(loc)
            }}
            onClear={() => {
              setOriginAddress('')
              setOriginLocation(null)
            }}
            accentColor="#16A34A"
            required
          />

          {/* Swap Button */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '0.25rem' }}>
            <button
              type="button"
              onClick={handleSwap}
              className="admin-btn admin-btn-ghost admin-btn-icon"
              title="Swap Origin and Destination"
              style={{ height: '38px', width: '38px', borderRadius: '50%' }}
            >
              <ArrowLeftRight size={15} />
            </button>
          </div>

          {/* Destination Input */}
          <AdminLocationInput
            label="Destination / Drop-off Location"
            placeholder="e.g. Bodija, Ibadan, Oyo State or Maitama, Abuja"
            value={destAddress}
            onChange={(val) => {
              setDestAddress(val)
              setDestLocation(null)
            }}
            onLocationSelect={(loc) => {
              setDestAddress(loc.address)
              setDestLocation(loc)
            }}
            onClear={() => {
              setDestAddress('')
              setDestLocation(null)
            }}
            accentColor="#C40000"
            required
          />
        </div>

        {/* Intermediate Stops */}
        {stops.length > 0 && (
          <div
            style={{
              background: 'var(--adm-surface-2)',
              border: '1px dashed var(--adm-border)',
              borderRadius: 'var(--adm-radius-sm)',
              padding: '0.875rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.625rem',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-text-3)', textTransform: 'uppercase' }}>
              Intermediate Waypoints ({stops.length}/5)
            </div>
            {stops.map((stop, idx) => (
              <div key={stop.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span
                  style={{
                    background: '#0284c7',
                    color: '#fff',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <AdminLocationInput
                    placeholder={`Stop ${idx + 1} address, landmark, or junction…`}
                    value={stop.address}
                    onChange={(val) => handleStopChange(stop.id, val)}
                    onLocationSelect={(loc) => handleStopSelect(stop.id, loc)}
                    accentColor="#0284c7"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveStop(stop.id)}
                  className="admin-btn admin-btn-danger admin-btn-sm"
                  title="Remove Stop"
                  style={{ padding: '0.4rem', height: '36px' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Options Row & Action Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            paddingTop: '0.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {stops.length < 5 && (
              <button
                type="button"
                onClick={handleAddStop}
                className="admin-btn admin-btn-ghost admin-btn-sm"
                style={{ fontSize: 12 }}
              >
                <Plus size={13} /> Add Stop
              </button>
            )}

            {/* Round Trip Toggle */}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={isRoundTrip}
                onChange={(e) => setIsRoundTrip(e.target.checked)}
                style={{ accentColor: 'var(--adm-accent)', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: isRoundTrip ? 600 : 400, color: 'var(--adm-text-1)' }}>
                Round-Trip (2× Return)
              </span>
            </label>

            {/* Include Depot Repositioning Toggle */}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={includeDepot}
                onChange={(e) => setIncludeDepot(e.target.checked)}
                style={{ accentColor: 'var(--adm-accent)', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: includeDepot ? 600 : 400, color: 'var(--adm-text-1)' }}>
                Include Depot Repositioning
              </span>
            </label>

            {/* Vehicle Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--adm-text-3)' }}>Fleet:</span>
              <select
                className="admin-select"
                style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: 12 }}
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
              >
                {VEHICLE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleCalculate}
            disabled={calculating || !originAddress.trim() || !destAddress.trim()}
            style={{
              padding: '0.5rem 1.25rem',
              fontWeight: 600,
              fontSize: '13.5px',
              boxShadow: '0 2px 8px rgba(196, 0, 0, 0.2)',
            }}
          >
            <Navigation size={14} style={{ transform: 'rotate(45deg)' }} />
            {calculating ? 'Calculating Distance…' : 'Calculate Distance'}
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {calcError && (
        <div
          style={{
            background: 'var(--adm-danger-subtle)',
            color: 'var(--adm-danger)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--adm-radius-sm)',
            fontSize: '12.5px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{calcError}</span>
        </div>
      )}

      {/* Calculation Results Card */}
      {calculation && (
        <div
          style={{
            background: 'var(--adm-surface-2)',
            border: '1px solid var(--adm-border)',
            borderRadius: 'var(--adm-radius-sm)',
            padding: '1.25rem',
            marginTop: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Main Numbers Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
            }}
          >
            {/* Driving Road Distance */}
            <div
              style={{
                background: '#ffffff',
                padding: '1rem',
                borderRadius: 'var(--adm-radius-sm)',
                border: '1px solid var(--adm-border)',
                borderTop: '3px solid #16A34A',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-text-3)', textTransform: 'uppercase' }}>
                Driving Distance ({isRoundTrip ? 'Round-Trip' : 'One-Way'})
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16A34A', marginTop: 4, lineHeight: 1.1 }}>
                {effectiveDistanceKm} <span style={{ fontSize: 14, fontWeight: 600 }}>km</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--adm-text-2)', marginTop: 4 }}>
                {isRoundTrip ? `(2 × ${baseOneWayKm} km base direct)` : 'Direct highway road transit'}
              </div>
            </div>

            {/* Estimated Travel Time */}
            <div
              style={{
                background: '#ffffff',
                padding: '1rem',
                borderRadius: 'var(--adm-radius-sm)',
                border: '1px solid var(--adm-border)',
                borderTop: '3px solid var(--adm-accent)',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-text-3)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} color="var(--adm-accent)" /> Estimated Transit Time
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--adm-text-1)', marginTop: 4, lineHeight: 1.1 }}>
                {isRoundTrip
                  ? `${Math.floor((calculation.durationMins * 2) / 60)}h ${(calculation.durationMins * 2) % 60}m`
                  : calculation.durationText}
              </div>
              <div style={{ fontSize: 11, color: 'var(--adm-text-2)', marginTop: 4 }}>
                {calculation.isFallback ? 'Road network velocity estimate' : 'Real-time driving duration'}
              </div>
            </div>

            {/* Total Billable Distance */}
            <div
              style={{
                background: '#ffffff',
                padding: '1rem',
                borderRadius: 'var(--adm-radius-sm)',
                border: '1px solid var(--adm-border)',
                borderTop: '3px solid #0284c7',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-text-3)', textTransform: 'uppercase' }}>
                Total Billable Distance
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0284c7', marginTop: 4, lineHeight: 1.1 }}>
                {totalBillableKm} <span style={{ fontSize: 14, fontWeight: 600 }}>km</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--adm-text-2)', marginTop: 4 }}>
                {includeDepot && depotKm > 0
                  ? `Incl. ${depotKm} km Festac depot reposition`
                  : 'Excludes depot repositioning'}
              </div>
            </div>

            {/* Fleet & Fuel Intelligence */}
            <div
              style={{
                background: '#ffffff',
                padding: '1rem',
                borderRadius: 'var(--adm-radius-sm)',
                border: '1px solid var(--adm-border)',
                borderTop: '3px solid var(--adm-warning)',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-text-3)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Fuel size={12} color="var(--adm-warning)" /> Est. Fuel Requirement
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--adm-text-1)', marginTop: 4, lineHeight: 1.1 }}>
                ~{estimatedFuelLitres} <span style={{ fontSize: 14, fontWeight: 600 }}>Litres</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--adm-text-2)', marginTop: 4 }}>
                ≈ ₦{estimatedFuelCost.toLocaleString('en-NG')} ({currentVehicle.category})
              </div>
            </div>
          </div>

          {/* Route Insights & Corridor Bar */}
          <div
            style={{
              background: '#ffffff',
              padding: '0.875rem 1.125rem',
              borderRadius: 'var(--adm-radius-sm)',
              border: '1px solid var(--adm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {corridorSummary && (
                <span className="admin-badge admin-badge-accent" style={{ fontSize: 11, padding: '3px 9px' }}>
                  Corridor: {corridorSummary}
                </span>
              )}
              {calculation.journeyInsights.map((insight, idx) => (
                <span key={idx} className="admin-badge admin-badge-gray" style={{ fontSize: 11 }}>
                  {insight}
                </span>
              ))}
              {straightLineKm > 0 && (
                <span style={{ fontSize: 11.5, color: 'var(--adm-text-2)' }}>
                  Crow-flies: <strong>{straightLineKm} km</strong> (Tortuosity Factor: <strong>{roadFactor}×</strong>)
                </span>
              )}
            </div>

            {estimatedPriceRange && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: 11.5, color: 'var(--adm-text-3)' }}>Indicative Charter:</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--adm-accent)' }}>
                  {formatCurrency(estimatedPriceRange.min)} – {formatCurrency(estimatedPriceRange.max)}
                </span>
              </div>
            )}
          </div>

          {/* Legs breakdown if intermediate stops */}
          {legs.length > 1 && (
            <div style={{ background: '#ffffff', padding: '0.875rem', borderRadius: 'var(--adm-radius-sm)', border: '1px solid var(--adm-border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-text-3)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Multi-Leg Journey Breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {legs.map((leg, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      padding: '4px 8px',
                      background: 'var(--adm-surface-2)',
                      borderRadius: 4,
                    }}
                  >
                    <span>
                      <strong style={{ color: 'var(--adm-accent)' }}>Leg {i + 1}:</strong>{' '}
                      {leg.start_address.split(',')[0]} ➔ {leg.end_address.split(',')[0]}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--adm-text-1)' }}>
                      {leg.distance?.text} · {leg.duration?.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Map Preview Section */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
              }}
            >
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-2)',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <Compass size={13} color="var(--adm-accent)" />
                {showMap ? 'Hide Route Map' : 'Show Route Map Preview'}
                {showMap ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {onApplyDistance && (
                <button
                  type="button"
                  className="admin-btn admin-btn-primary admin-btn-sm"
                  onClick={() => onApplyDistance(totalBillableKm, calculation.durationText, calculation)}
                >
                  <Check size={13} /> Apply Distance to Record ({totalBillableKm} km)
                </button>
              )}
            </div>

            {showMap && (
              <DistanceCalculatorMap
                origin={originLocation}
                destination={destLocation}
                stops={stops.map((s) => s.location).filter((l): l is AdminLocationValue => !!l)}
                directionsResult={calculation.directionsResult}
                height={compact ? '260px' : '340px'}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
