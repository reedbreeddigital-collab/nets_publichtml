import { create } from 'zustand'
import type { EstimatedInvestment, CustomerPricingView } from '../pricing/pricing.types'
import { generateEstimate } from '../pricing/estimateGenerator'
import { formatEstimateForCustomer } from '../pricing/pricingFormatter'
import { getPricingErrorMessage } from '../pricing/pricingErrors'

export type JourneyIntent =
  | 'General Transport'
  | 'Corporate Staff'
  | 'Airport Transfer'
  | 'Weddings & Events'
  | 'School Transport'
  | 'Religious Groups'
  | 'Conferences'
  | 'Tourism'
  | 'Private Group'
  | 'Recurring Shuttle'
  | null

export type TripType = 'Drop-Off' | 'To & Fro' | 'Multi-Day' | 'Recurring' | 'Staff Pickup' | 'One Way' | 'Return'

export interface LocationData {
  address: string
  lat: number
  lng: number
  placeId?: string
  displayName?: string
  administrativeArea?: string
  country?: string
}

export interface CustomerDetails {
  fullName: string
  email: string
  phone: string
  whatsappNumber: string
  company: string
  specialInstructions: string
  consentGiven: boolean
  heardAboutUs: string
}

interface JourneyState {
  currentStep: number
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void

  isLeadModalOpen: boolean
  setLeadModalOpen: (open: boolean) => void
  isQuoteModalOpen: boolean
  setQuoteModalOpen: (open: boolean) => void
  isInternationalModalOpen: boolean
  setInternationalModalOpen: (open: boolean) => void
  leadModalNextAction: 'quote' | 'planner' | null
  setLeadModalNextAction: (action: 'quote' | 'planner' | null) => void

  // Old Step 1 (Intent) is not used in UI but kept in state for CRM payload compatibility if needed

  intent: JourneyIntent
  setIntent: (intent: JourneyIntent) => void

  // Step 2 & 3
  pickup: LocationData | null
  setPickup: (pickup: LocationData | null) => void
  destination: LocationData | null
  setDestination: (destination: LocationData | null) => void
  
  // Routing Intelligence (Phase 4 -> 5)
  distanceKm: number
  distanceMeters: number
  durationMins: number
  durationSeconds: number
  durationText: string
  routePolyline: any | null
  journeyBounds: any | null
  journeyInsights: string[]
  setRouteCalculations: (calc: { distanceKm: number, distanceMeters: number, durationMins: number, durationSeconds: number, durationText: string, routePolyline: any | null, journeyBounds: any | null, journeyInsights: string[] }) => void

  // Step 4
  passengers: string | null
  setPassengers: (p: string) => void
  
  // Step 5
  travelDate: Date | null
  setTravelDate: (d: Date) => void
  departureTime: string
  setDepartureTime: (t: string) => void
  tripType: TripType
  setTripType: (type: TripType) => void
  returnDate: Date | null
  setReturnDate: (d: Date | null) => void
  returnTime: string
  setReturnTime: (t: string) => void
  multiDayItinerary: { date: Date | null; time: string }[]
  setMultiDayItinerary: (itinerary: { date: Date | null; time: string }[]) => void

  staffPickupDays: Date[]
  setStaffPickupDays: (days: Date[]) => void
  staffPickupTime: string
  setStaffPickupTime: (time: string) => void
  staffDropOffTime: string
  setStaffDropOffTime: (time: string) => void
  staffRoutes: { pickup: LocationData | null, destination: LocationData | null }[]
  addStaffRoute: () => void
  removeStaffRoute: (index: number) => void
  updateStaffRoute: (index: number, field: 'pickup' | 'destination', loc: LocationData | null) => void

  retentionPreference: 'keep' | 'return' | null
  setRetentionPreference: (pref: 'keep' | 'return' | null) => void
  vehicleMobility: 'parked' | 'moving' | null
  setVehicleMobility: (mob: 'parked' | 'moving' | null) => void

  // Step 6
  extras: string[]
  toggleExtra: (extra: string) => void
  customRequest: string
  setCustomRequest: (r: string) => void
  stops: LocationData[]
  addStop: (stop: LocationData) => void
  removeStop: (index: number) => void
  updateStop: (index: number, stop: LocationData) => void
  reorderStops: (startIndex: number, endIndex: number) => void

  // Step 7 - Smart vehicle recommendation derived from passenger count
  recommendedVehicleId: string | null
  setRecommendedVehicleId: (id: string | null) => void
  selectedVehicleId: string | null
  setSelectedVehicleId: (id: string | null) => void
  additionalVehicleIds: string[]
  setAdditionalVehicleIds: (ids: string[]) => void

  // Customer Details
  customerDetails: CustomerDetails
  referenceNumber: string | null
  setCustomerDetails: (details: Partial<CustomerDetails>) => void
  
  // CRM Integration
  generateReference: () => void
  getCRMLeadPayload: () => any

  // Pricing Engine (Phase 5)
  estimatedInvestment: EstimatedInvestment | null
  customerPricingView: CustomerPricingView | null
  pricingError: string | null
  isPricingCalculating: boolean
  calculatePricing: () => Promise<void>

  // Reset State
  resetJourney: () => void
}

export const useJourneyStore = create<JourneyState>((set, get) => ({
  currentStep: 1,
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => {
    set((state) => {
      const next = Math.min(3, state.currentStep + 1)
      if (next === 3) {
        setTimeout(() => get().calculatePricing(), 0)
      }
      return { currentStep: next }
    })
  },
  prevStep: () => set((state) => ({ currentStep: Math.max(1, state.currentStep - 1) })),

  isLeadModalOpen: false,
  setLeadModalOpen: (open) => set({ isLeadModalOpen: open }),
  isQuoteModalOpen: false,
  setQuoteModalOpen: (open) => set({ isQuoteModalOpen: open }),
  isInternationalModalOpen: false,
  setInternationalModalOpen: (open) => set({ isInternationalModalOpen: open }),
  leadModalNextAction: null,
  setLeadModalNextAction: (action) => set({ leadModalNextAction: action }),


  intent: null,
  setIntent: (intent) => set({ intent }),

  pickup: null,
  setPickup: (pickup) => set({ pickup }),
  destination: null,
  setDestination: (destination) => set({ destination }),

  distanceKm: 0,
  distanceMeters: 0,
  durationMins: 0,
  durationSeconds: 0,
  durationText: '',
  routePolyline: null,
  journeyBounds: null,
  journeyInsights: [],
  setRouteCalculations: (calc) => set({ ...calc }),

  passengers: null,
  setPassengers: (passengers) => set({ passengers }),

  travelDate: null,
  setTravelDate: (travelDate) => set({ travelDate }),
  departureTime: '09:00',
  setDepartureTime: (departureTime) => set({ departureTime }),
  tripType: 'Drop-Off',
  setTripType: (tripType) => set({ tripType }),
  returnDate: null,
  setReturnDate: (returnDate) => set({ returnDate }),
  returnTime: '09:00',
  setReturnTime: (returnTime) => set({ returnTime }),
  multiDayItinerary: [],
  setMultiDayItinerary: (multiDayItinerary) => set({ multiDayItinerary }),

  staffPickupDays: [],
  setStaffPickupDays: (staffPickupDays) => set({ staffPickupDays }),
  staffPickupTime: '07:00',
  setStaffPickupTime: (staffPickupTime) => set({ staffPickupTime }),
  staffDropOffTime: '17:00',
  setStaffDropOffTime: (staffDropOffTime) => set({ staffDropOffTime }),
  staffRoutes: [],
  addStaffRoute: () => set((state) => ({ staffRoutes: [...state.staffRoutes, { pickup: null, destination: null }] })),
  removeStaffRoute: (index) => set((state) => ({ staffRoutes: state.staffRoutes.filter((_, i) => i !== index) })),
  updateStaffRoute: (index, field, loc) => set((state) => {
    const newRoutes = [...state.staffRoutes]
    newRoutes[index] = { ...newRoutes[index], [field]: loc }
    return { staffRoutes: newRoutes }
  }),

  retentionPreference: null,
  setRetentionPreference: (retentionPreference) => set({ retentionPreference }),
  vehicleMobility: null,
  setVehicleMobility: (vehicleMobility) => set({ vehicleMobility }),

  extras: [],
  toggleExtra: (extra) => set((state) => ({
    extras: state.extras.includes(extra) 
      ? state.extras.filter(e => e !== extra)
      : [...state.extras, extra]
  })),
  customRequest: '',
  setCustomRequest: (customRequest) => set({ customRequest }),
  stops: [],
  addStop: (stop) => set((state) => ({ stops: [...state.stops, stop] })),
  removeStop: (index) => set((state) => ({ stops: state.stops.filter((_, i) => i !== index) })),
  updateStop: (index, stop) => set((state) => {
    const newStops = [...state.stops]
    newStops[index] = stop
    return { stops: newStops }
  }),
  reorderStops: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.stops)
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)
    return { stops: result }
  }),

  recommendedVehicleId: null,
  setRecommendedVehicleId: (recommendedVehicleId) => set({ recommendedVehicleId }),

  selectedVehicleId: null,
  setSelectedVehicleId: (selectedVehicleId) => {
    set({ selectedVehicleId })
    // Recalculate pricing if they change vehicle
    if (get().currentStep >= 2) {
      get().calculatePricing()
    }
  },
  additionalVehicleIds: [],
  setAdditionalVehicleIds: (additionalVehicleIds) => {
    set({ additionalVehicleIds })
    if (get().currentStep >= 2) {
      get().calculatePricing()
    }
  },

  customerDetails: {
    fullName: '',
    email: '',
    phone: '',
    whatsappNumber: '',
    company: '',
    specialInstructions: '',
    consentGiven: false,
    heardAboutUs: '',
  },
  referenceNumber: null,
  setCustomerDetails: (details) => set((state) => ({
    customerDetails: { ...state.customerDetails, ...details }
  })),

  generateReference: () => {
    const today = new Date()
    const dateStr = today.toISOString().slice(0,10).replace(/-/g,'')
    const rand = Math.floor(Math.random() * 9000 + 1000)
    set({ referenceNumber: `NETS-${dateStr}-${rand}` })
  },
  getCRMLeadPayload: () => {
    const state = get();
    return {
      customerInformation: {
        name: state.customerDetails.fullName,
        email: state.customerDetails.email,
        phone: state.customerDetails.phone,
        whatsappNumber: state.customerDetails.whatsappNumber || null,
        company: state.customerDetails.company || null,
        heardAboutUs: state.customerDetails.heardAboutUs || null,
        specialInstructions: state.customerDetails.specialInstructions || null,
        consentGiven: state.customerDetails.consentGiven
      },
      journeyInformation: {
        journeyType: state.intent,
        pickup: state.pickup,
        destination: state.destination,
        stops: state.stops,
        distanceKm: state.distanceKm,
        distanceMeters: state.distanceMeters,
        estimatedDurationMins: state.durationMins,
        durationSeconds: state.durationSeconds,
        durationText: state.durationText,
        routePolyline: state.routePolyline,
        journeyInsights: state.journeyInsights,
        passengerCount: state.passengers,
        recommendedVehicle: state.recommendedVehicleId,
        selectedVehicle: state.selectedVehicleId,
        additionalVehicles: state.additionalVehicleIds,
        travelDate: state.travelDate?.toISOString(),
        tripType: state.tripType,
        returnDate: state.returnDate?.toISOString(),
        returnTime: state.returnTime,
        retentionPreference: state.retentionPreference,
        vehicleMobility: state.vehicleMobility,
        multiDayItinerary: state.multiDayItinerary.map(d => ({ date: d.date?.toISOString(), time: d.time })),
        staffRoutes: state.staffRoutes,
        staffPickupDays: state.staffPickupDays.map(d => d.toISOString()),
        staffPickupTime: state.staffPickupTime,
        staffDropOffTime: state.staffDropOffTime
      },
      estimatedInvestment: state.estimatedInvestment ? {
        total: state.estimatedInvestment.estimatedInvestment,
        minimumEstimate: state.estimatedInvestment.estimatedInvestment,
        maximumEstimate: state.estimatedInvestment.estimatedInvestment,
        estimatedInvestment: state.estimatedInvestment.estimatedInvestment,
        baseFleetCharter: state.estimatedInvestment.baseFleetCharter ?? state.estimatedInvestment.estimatedInvestment,
        retentionFee: state.estimatedInvestment.retentionFee ?? state.estimatedInvestment.additionalRetentionFee ?? 0,
        retentionDays: state.estimatedInvestment.retentionDays ?? 0,
        retentionRate: state.estimatedInvestment.retentionRate ?? 0,
        distanceKm: state.estimatedInvestment.distanceKm ?? state.distanceKm,
        rateTier: state.estimatedInvestment.rateTier,
        vehicleName: state.estimatedInvestment.vehicleName,
        pricingVersion: state.estimatedInvestment.pricingVersion,
      } : null,
      leadMetadata: {
        leadSource: 'Website Journey Planner',
        status: 'New Lead',
        assignedPipeline: 'Journey Quotes',
        submissionTimestamp: new Date().toISOString(),
        quoteReferenceNumber: state.referenceNumber
      }
    };
  },

  // Pricing Engine (Phase 5)
  estimatedInvestment: null,
  customerPricingView: null,
  pricingError: null,
  isPricingCalculating: false,
  calculatePricing: async () => {
    const state = get()
    
    // Require distance
    if (state.distanceKm <= 0) {
      set({ estimatedInvestment: null, customerPricingView: null, pricingError: null })
      return
    }

    const pCountry = state.pickup?.country?.toLowerCase()
    const dCountry = state.destination?.country?.toLowerCase()
    if ((pCountry && pCountry !== 'nigeria') || (dCountry && dCountry !== 'nigeria')) {
      set({ estimatedInvestment: null, customerPricingView: null, pricingError: 'International journeys require a custom quote.' })
      state.setInternationalModalOpen(true)
      return
    }

    set({ isPricingCalculating: true, pricingError: null })

    try {
      const passengerCount = state.passengers ? parseInt(state.passengers.split('–')[0] || '1', 10) : 1
      
      // Calculate number of days for multi-day/recurring trips
      let numberOfDays = 1
      if (state.tripType === 'Staff Pickup') {
        numberOfDays = Math.max(1, state.staffPickupDays.length)
      } else if (state.tripType === 'Recurring') {
        numberOfDays = 1 + state.multiDayItinerary.length
      } else if ((state.tripType === 'Multi-Day' || state.tripType === 'To & Fro' || state.tripType === 'Return') && state.travelDate && state.returnDate) {
        // Strip time to accurately calculate whole days difference
        const start = new Date(state.travelDate.getFullYear(), state.travelDate.getMonth(), state.travelDate.getDate())
        const end = new Date(state.returnDate.getFullYear(), state.returnDate.getMonth(), state.returnDate.getDate())
        const diff = end.getTime() - start.getTime()
        const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24))
        numberOfDays = Math.max(1, diffDays + 1)
      }

      const deriveVehicle = (pax: string | null) => {
        if (!pax) return 'hiace';
        if (pax === '1–3') return 'sedan';
        if (pax === '4–7') return 'suv';
        if (pax === '8–14') return 'hiace';
        if (pax === '19–30') return 'coaster';
        return 'hiace';
      }

      const vehicleId = state.selectedVehicleId || state.recommendedVehicleId || deriveVehicle(state.passengers)

      const estimate = await generateEstimate({
        vehicleId,
        distanceKm: state.distanceKm,
        distanceMeters: state.distanceMeters,
        durationMinutes: state.durationMins,
        durationSeconds: state.durationSeconds,
        tripType: state.tripType as any,
        passengerCount,
        travelDate: state.travelDate,
        returnDate: state.returnDate,
        numberOfDays,
        stops: state.stops.length,
        journeyInsights: state.journeyInsights,
        selectedExtras: state.extras,
        customRequest: state.customRequest,
        retentionPreference: state.retentionPreference,
        vehicleMobility: state.vehicleMobility,
        useReferenceDistance: true, // Default: use workbook reference distance
      })

      // If there are additional vehicles, calculate their cost and sum it up
      for (const addVehId of state.additionalVehicleIds) {
        if (addVehId) {
          const addEstimate = await generateEstimate({
            vehicleId: addVehId,
            distanceKm: state.distanceKm,
            distanceMeters: state.distanceMeters,
            durationMinutes: state.durationMins,
            durationSeconds: state.durationSeconds,
            tripType: state.tripType as any,
            passengerCount: 1, // Base rate without scaling passengers
            travelDate: state.travelDate,
            returnDate: state.returnDate,
            numberOfDays,
            stops: state.stops.length,
            journeyInsights: state.journeyInsights,
            selectedExtras: state.extras,
            customRequest: state.customRequest,
            retentionPreference: state.retentionPreference,
            vehicleMobility: state.vehicleMobility,
            useReferenceDistance: true,
          })
          estimate.estimatedInvestment += addEstimate.estimatedInvestment
          estimate.baseFleetCharter = (estimate.baseFleetCharter ?? 0) + (addEstimate.baseFleetCharter ?? addEstimate.estimatedInvestment)
          estimate.vehicleName += ` + ${addEstimate.vehicleName}`
        }
      }

      const customerView = formatEstimateForCustomer(estimate)

      set({
        estimatedInvestment: estimate,
        customerPricingView: customerView,
        isPricingCalculating: false,
        pricingError: null,
      })
    } catch (err: any) {
      console.error('Pricing calculation failed:', err)
      
      // If it's a database connection/configuration error, show it explicitly
      let errorMessage = getPricingErrorMessage()
      if (err.message && (err.message.includes('HTTP') || err.message.includes('database') || err.message.includes('Network'))) {
        errorMessage = `Database Connection Error: ${err.message}`
      }
      
      set({
        estimatedInvestment: null,
        customerPricingView: null,
        isPricingCalculating: false,
        pricingError: errorMessage,
      })
    }
  },

  resetJourney: () => {
    set({
      currentStep: 1,
      intent: null,
      pickup: null,
      destination: null,
      distanceKm: 0,
      distanceMeters: 0,
      durationMins: 0,
      durationSeconds: 0,
      durationText: '',
      routePolyline: null,
      journeyBounds: null,
      journeyInsights: [],
      passengers: null,
      travelDate: null,
      departureTime: '09:00',
      tripType: 'Drop-Off',
      returnDate: null,
      returnTime: '09:00',
      multiDayItinerary: [],
      staffPickupDays: [],
      staffPickupTime: '07:00',
      staffDropOffTime: '17:00',
      staffRoutes: [],
      retentionPreference: null,
      vehicleMobility: null,
      extras: [],
      customRequest: '',
      stops: [],
      recommendedVehicleId: null,
      additionalVehicleIds: [],
      referenceNumber: null,
      estimatedInvestment: null,
      customerPricingView: null,
      pricingError: null,
      isLeadModalOpen: false,
      isQuoteModalOpen: false,
      leadModalNextAction: null,
      // intentionally keeping customer details (name/email/etc) populated 
      // in case they want to plan another journey without re-typing their info
    })
  }
}))
