// ============================================================================
// NETS Pricing Engine — Type Definitions
// ============================================================================
// Every interface maps directly to the Excel workbook's data model.
// Do NOT add fields that don't exist in the official pricing methodology.
// ============================================================================

/**
 * Identifies which calculation engine to use for a vehicle.
 * - 'standard' — Hiace, SUV, Executive Bus, Executive Sedan, and all future vehicles.
 * - 'coaster'  — Toyota Coaster only. Shares Standard daily/monthly logic but adds an independent 3-Day Trip Rate.
 */
export type PricingEngineType = 'standard' | 'coaster'

/**
 * The 12-field data model from the Excel workbook.
 * Every vehicle category gets its own copy of these configurable fields.
 * Values are stored in Nigerian Naira (₦) unless noted.
 *
 * IMPORTANT: Vehicle Documents is stored but deliberately EXCLUDED from all
 * totals — it is a record-keeping field only.
 */
export interface VehiclePricingConfig {
  /** Unique vehicle identifier, matches vehicles.ts */
  vehicleId: string
  /** Human-readable name */
  vehicleName: string
  /** Which engine to use */
  engineType: PricingEngineType

  // ── Fuel parameters ──
  /** Reference route distance in km (workbook fixed value) */
  referenceDistanceKm: number
  /** Number of trips per day (workbook fixed value, typically 2) */
  trips: number
  /** Fuel consumption rate in litres per km */
  fuelEfficiencyRatio: number
  /** Cost of fuel in ₦ per litre */
  fuelCostPerLitre: number

  // ── Daily operational costs (₦/day) ──
  /** Driver salary per bus per day */
  driverSalaryPerDay: number
  /** Vehicle maintenance cost per day */
  vehicleMaintenancePerDay: number
  /** Security fees including parking per day */
  securityFeesPerDay: number
  /** Government levies per day */
  governmentLeviesPerDay: number
  /** Driver outstation allowance per day */
  driverOutstationAllowancePerDay: number
  /** Depreciation cost per day */
  depreciationCostPerDay: number
  /** Vehicle documents per day — RECORD ONLY, excluded from totals */
  vehicleDocumentsPerDay: number

  // ── Margin ──
  /** Mark-up percentage as a decimal (e.g. 0.10 for 10%, 0.24 for 24%) */
  markupPercentage: number
}

/**
 * Result of the fuel sub-calculation.
 * Daily Fuel Litres = Distance (km) × Trips × Fuel Efficiency Ratio
 * Fuel Usage (₦/day) = Daily Fuel Litres × Fuel Cost per Litre
 */
export interface FuelCalculation {
  dailyFuelLitres: number
  fuelUsagePerDay: number
}

/**
 * Line-by-line daily rate breakdown, matching the Excel workbook rows exactly.
 * No intermediate rounding — all values are raw numbers.
 */
export interface DailyRateBreakdown {
  fuelUsage: number
  driverSalary: number
  vehicleMaintenance: number
  securityFees: number
  governmentLevies: number
  driverOutstationAllowance: number
  depreciationCost: number
  /** Sum of the 7 line items above */
  runningTotal: number
  /** Running Total × Mark-Up Percentage */
  markup: number
  /** Running Total + Mark-Up */
  totalDaily: number
}

/**
 * Monthly rate — each line item × 31, matching the workbook.
 */
export interface MonthlyRateBreakdown {
  fuelUsage: number
  driverSalary: number
  vehicleMaintenance: number
  securityFees: number
  governmentLevies: number
  driverOutstationAllowance: number
  depreciationCost: number
  runningTotal: number
  markup: number
  totalMonthly: number
}

/**
 * Coaster-only 3-Day Trip Rate.
 * Fuel is charged ONCE (not per day). All other line items × 3.
 */
export interface ThreeDayTripBreakdown {
  /** Fuel Usage (daily) — NOT multiplied */
  fuelUsage: number
  /** Daily value × 3 */
  driverSalary: number
  /** Daily value × 3 */
  vehicleMaintenance: number
  /** Daily value × 3 */
  securityFees: number
  /** Daily value × 3 */
  governmentLevies: number
  /** Daily value × 3 */
  driverOutstationAllowance: number
  /** Daily value × 3 */
  depreciationCost: number
  /** Sum of the 7 lines */
  runningTotal: number
  /** Running Total × Mark-Up Percentage */
  markup: number
  /** Running Total + Mark-Up */
  totalThreeDayTrip: number
}

/**
 * Configurable optional service surcharge.
 * All default to ₦0 / disabled until New Era Transport supplies values.
 */
export interface OptionalServiceConfig {
  id: string
  name: string
  enabled: boolean
  /** Fixed charge in ₦ (0 if disabled) */
  fixedCharge: number
  /** Per-km charge in ₦ (0 if disabled) */
  perKmCharge: number
  /** Per-hour charge in ₦ (0 if disabled) */
  perHourCharge: number
}

/**
 * Result of applying optional services to a journey.
 */
export interface OptionalServicesResult {
  appliedServices: Array<{
    serviceId: string
    serviceName: string
    charge: number
  }>
  totalOptionalCharges: number
}

/**
 * The minimum charge threshold. Disabled by default.
 */
export interface MinimumChargeConfig {
  enabled: boolean
  minimumAmount: number
}

// ── Journey Input ──

/** Trip types supported by the platform */
export type TripType = 'Drop-Off' | 'To & Fro' | 'One Way' | 'One-Way' | 'Return' | 'Round Trip' | 'Multi-Day' | 'Recurring' | 'Staff Pickup'
  | 'Airport Transfer' | 'Corporate Shuttle' | 'Wedding' | 'Tourism'
  | 'Conference' | 'School Transport'

/**
 * The input contract for the pricing engine.
 * Maps from useJourneyStore state + RouteIntelligence data.
 */
export interface JourneyPricingInput {
  vehicleId: string
  distanceKm: number
  distanceMeters: number
  durationMinutes: number
  durationSeconds: number
  tripType: TripType
  passengerCount: number
  travelDate: Date | null
  returnDate: Date | null
  numberOfDays: number
  stops: number
  journeyInsights: string[]
  selectedExtras: string[]
  customRequest: string
  retentionPreference?: 'keep' | 'return' | null
  vehicleMobility?: 'parked' | 'moving' | null
  /** Whether to use the live Google Maps distance or the workbook's reference distance */
  useReferenceDistance: boolean
}

// ── Output ──

/**
 * The complete pricing result — contains both customer-safe and internal data.
 */
export interface EstimatedInvestment {
  /** The single customer-visible Estimated Investment */
  estimatedInvestment: number
  /** Base charter portion of the cost (excluding retention) */
  baseFleetCharter?: number
  /** Additional vehicle retention fee */
  additionalRetentionFee?: number
  retentionFee?: number
  retentionDays?: number
  retentionRate?: number
  distanceKm?: number
  chargeableDays?: number
  /** Which rate tier was used */
  rateTier: 'daily' | 'three-day' | 'monthly'
  /** Vehicle information */
  vehicleId: string
  vehicleName: string
  /** Whether minimum charge was applied */
  minimumChargeApplied: boolean
  /** Calculation breakdown details */
  dailyFuelCost?: number
  dailyFixedOps?: number
  dailyBaseCost?: number
  markupPercent?: number
  tripsPerDay?: number
  /** Pricing engine version */
  pricingVersion: string
  /** Calculation timestamp */
  calculatedAt: string
}

/**
 * Customer-safe view — this is ALL the customer ever sees.
 */
export interface CustomerPricingView {
  /** Formatted single estimate — the only figure the customer ever sees */
  estimatedInvestment: string
  pricingIncludes: string[]
  disclaimer: string
}

/**
 * CRM quotation payload — sent to backend for lead management.
 */
export interface CRMQuotationPayload {
  journeyReference: string
  journeyDetails: {
    pickup: string
    destination: string
    distanceKm: number
    durationMinutes: number
    tripType: string
    passengerCount: number
    travelDate: string | null
    stops: number
    journeyInsights: string[]
  }
  customerDetails: {
    fullName: string
    email: string
    phone: string
    company: string | null
    specialInstructions: string | null
    consentGiven: boolean
  }
  vehicleDetails: {
    vehicleId: string
    vehicleName: string
    engineType: PricingEngineType
  }
  estimatedInvestment: {
    /** Single calculated total — matches what is shown to the customer */
    total: number
    rateTier: string
    minimumChargeApplied: boolean
  }
  metadata: {
    pricingVersion: string
    calculationTimestamp: string
    leadSource: string
    status: string
    pipeline: string
  }
}
