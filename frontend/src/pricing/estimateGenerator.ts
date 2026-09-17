import type {
  JourneyPricingInput,
  EstimatedInvestment,
} from './pricing.types'
import { fetchPricingConfig, type PricingConfig } from './adminPricingConfig'
import { getVehiclePricingConfig } from './vehiclePricingConfig'
import { PricingError, validatePricingInputs } from './pricingErrors'
import { PRICING_ENGINE_VERSION } from './crmPayloadBuilder'

export function calculatePricingFromConfig(
  input: Partial<JourneyPricingInput> & { vehicleId: string; distanceKm: number },
  adminConfig: PricingConfig
): EstimatedInvestment {
  const vehicleConfig = getVehiclePricingConfig(input.vehicleId)

  const isCoaster = input.vehicleId === 'coaster'
  const isSaloon = input.vehicleId === 'sedan'

  let fuelRatio = adminConfig.hiaceFuelRatio
  let driverSalary = adminConfig.hiaceDriverSalary
  let maintenance = adminConfig.hiaceMaintenance
  let security = adminConfig.hiaceSecurity
  let levies = adminConfig.hiaceLevies
  let outstation = adminConfig.hiaceOutstationAllowance
  let depreciation = adminConfig.hiaceDepreciation
  let markupPercent = adminConfig.hiaceMarkupPercent

  let retentionParked = adminConfig.hiaceRetentionParked
  let retentionMoving = adminConfig.hiaceRetentionMoving

  if (isCoaster) {
    fuelRatio = adminConfig.coasterFuelRatio
    driverSalary = adminConfig.coasterDriverSalary
    maintenance = adminConfig.coasterMaintenance
    security = adminConfig.coasterSecurity
    levies = adminConfig.coasterLevies
    outstation = adminConfig.coasterOutstationAllowance
    depreciation = adminConfig.coasterDepreciation
    markupPercent = adminConfig.coasterMarkupPercent
    retentionParked = adminConfig.coasterRetentionParked
    retentionMoving = adminConfig.coasterRetentionMoving
  } else if (isSaloon) {
    fuelRatio = adminConfig.saloonFuelRatio
    driverSalary = adminConfig.saloonDriverSalary
    maintenance = adminConfig.saloonMaintenance
    security = adminConfig.saloonSecurity
    levies = adminConfig.saloonLevies
    outstation = adminConfig.saloonOutstationAllowance
    depreciation = adminConfig.saloonDepreciation
    markupPercent = adminConfig.saloonMarkupPercent
    retentionParked = adminConfig.saloonRetentionParked
    retentionMoving = adminConfig.saloonRetentionMoving
  }

  let tripsPerDay = 1
  if ((input.tripType === 'To & Fro' || input.tripType === 'Return') && (input.numberOfDays === 1 || !input.numberOfDays)) {
    tripsPerDay = 2
  } else if ((input.tripType === 'Drop-Off' || input.tripType === 'One-Way' || input.tripType === 'One Way') && adminConfig.billOneWayAsReturn) {
    tripsPerDay = 2
  }
  const dailyFuelCost = input.distanceKm * tripsPerDay * fuelRatio * adminConfig.fuelPricePerLitre
  
  const isOutstation = input.tripType === 'Multi-Day' || input.tripType === 'Recurring' || (input.numberOfDays !== undefined && input.numberOfDays > 1)
  const dailyOutstation = isOutstation ? outstation : 0

  const dailyFixedOps = driverSalary + maintenance + security + levies + dailyOutstation + depreciation
  const dailyBaseCost = dailyFuelCost + dailyFixedOps
  
  const markedUpDailyPrice = dailyBaseCost * (1 + markupPercent / 100)

  let chargeableDays = input.numberOfDays || 1
  let additionalRetentionFee = 0
  let retentionDays = 0
  let feePerDay = 0

  if (input.numberOfDays && input.numberOfDays >= 3 && (input.tripType === 'To & Fro' || input.tripType === 'Return' || input.tripType === 'Multi-Day') && input.retentionPreference) {
    if (input.retentionPreference === 'return') {
      chargeableDays = 2
    } else if (input.retentionPreference === 'keep') {
      const middleDays = input.numberOfDays - 2
      chargeableDays = 2
      feePerDay = input.vehicleMobility === 'parked' ? retentionParked : retentionMoving
      additionalRetentionFee = middleDays * feePerDay
      retentionDays = middleDays
    }
  }

  const baseFleetCharter = markedUpDailyPrice * chargeableDays
  const finalTotal = baseFleetCharter + additionalRetentionFee

  return {
    estimatedInvestment: finalTotal,
    baseFleetCharter,
    additionalRetentionFee,
    retentionFee: additionalRetentionFee,
    retentionDays,
    retentionRate: feePerDay,
    distanceKm: input.distanceKm,
    chargeableDays,
    rateTier: (input.tripType === 'Recurring' || input.tripType === 'Staff Pickup') ? 'monthly' : input.tripType === 'Multi-Day' ? 'three-day' : 'daily',
    vehicleId: input.vehicleId,
    vehicleName: vehicleConfig.vehicleName,
    minimumChargeApplied: false,
    dailyFuelCost,
    dailyFixedOps,
    dailyBaseCost,
    markupPercent,
    tripsPerDay,
    pricingVersion: PRICING_ENGINE_VERSION,
    calculatedAt: new Date().toISOString(),
  }
}

export async function generateEstimate(input: JourneyPricingInput): Promise<EstimatedInvestment> {
  const validationErrors = validatePricingInputs({
    vehicleId: input.vehicleId,
    distanceKm: input.distanceKm,
  })

  if (validationErrors.length > 0) {
    throw new PricingError(
      `Pricing validation failed: ${validationErrors.join(', ')}`,
      'VALIDATION_ERROR'
    )
  }

  // Fetch real-time config directly from backend (no local store)
  const adminConfig = await fetchPricingConfig()
  return calculatePricingFromConfig(input, adminConfig)
}
