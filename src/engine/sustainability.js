// Logistics Twin - Sustainability Engine (ES Module)
// Dynamically calculates environmental & financial impact
// Label: "Model-based estimates"

/**
 * Calculates dynamic sustainability metrics for a given distance, truck, and shipment.
 */
export function calculateSustainability(params = {}) {
  const distanceKm = Math.max(0, Number(params.distanceKm) || 0);
  const detourKm = Math.max(0, Number(params.detourKm) || 0);
  const mileage = Math.max(0.5, Number(params.mileage) || 4.2);
  const fuelPrice = Math.max(1, Number(params.fuelPrice) || 94.50);
  const emissionFactor = Math.max(0.1, Number(params.emissionFactor) || 2.68);
  const maxCapacity = Math.max(1, Number(params.maxCapacity) || 10000);
  const cargoWeight = Math.max(0, Number(params.cargoWeight) || 0);
  const shipmentValue = Math.max(0, Number(params.shipmentValue) || 0);

  // 1. Empty KM Avoided:
  // When a backhaul is performed, the deadhead return trip is converted to a productive loaded haul.
  const emptyKmAvoided = Math.round(distanceKm * 10) / 10;

  // 2. Fuel Saved from eliminating an equivalent empty haul
  const fuelSavedLitres = Math.round((emptyKmAvoided / mileage) * 10) / 10;

  // 3. Fuel Cost Impact / Savings in INR
  const fuelCostImpact = Math.round(fuelSavedLitres * fuelPrice);

  // 4. CO2 Avoided in kg
  const co2AvoidedKg = Math.round(fuelSavedLitres * emissionFactor * 10) / 10;

  // 5. Fuel Consumed for the additional detour
  const detourFuelLitres = Math.round((detourKm / mileage) * 10) / 10;
  const detourFuelCost = Math.round(detourFuelLitres * fuelPrice);
  const detourCo2Kg = Math.round(detourFuelLitres * emissionFactor * 10) / 10;

  // 6. Net Profit / Economic gain from taking this backhaul
  const netEconomicGain = Math.round(shipmentValue - detourFuelCost);

  // 7. Vehicle Capacity Utilization %
  const vehicleUtilizationPercent = Math.min(100, Math.round((cargoWeight / maxCapacity) * 100));

  return {
    label: "Model-based estimates",
    emptyKmAvoided,
    additionalDetourKm: detourKm,
    detourKm,
    fuelSavedLitres,
    fuelCostImpact,
    costSavedInr: fuelCostImpact,
    co2AvoidedKg,
    co2ReducedKg: co2AvoidedKg,
    detourFuelLitres,
    detourFuelCost,
    detourCo2Kg,
    netEconomicGain,
    vehicleUtilizationPercent,
    vehicleUtilizationPct: vehicleUtilizationPercent,
    assumptions: {
      mileage,
      fuelPrice,
      emissionFactor
    }
  };
}

/**
 * Aggregates fleet-wide sustainability metrics across all active assignments
 */
export function calculateFleetSustainability(assignments = [], defaultSettings = {}) {
  let totalEmptyKmAvoided = 0;
  let totalFuelSavedLitres = 0;
  let totalCostImpact = 0;
  let totalCo2AvoidedKg = 0;

  assignments.forEach(a => {
    if (a.sustainability) {
      totalEmptyKmAvoided += (a.sustainability.emptyKmAvoided || 0);
      totalFuelSavedLitres += (a.sustainability.fuelSavedLitres || 0);
      totalCostImpact += (a.sustainability.fuelCostImpact || a.sustainability.costSavedInr || 0);
      totalCo2AvoidedKg += (a.sustainability.co2AvoidedKg || a.sustainability.co2ReducedKg || 0);
    }
  });

  return {
    label: "Model-based estimates",
    hasData: assignments.length > 0,
    totalAssignments: assignments.length,
    totalEmptyKmAvoided: Math.round(totalEmptyKmAvoided * 10) / 10,
    totalFuelSavedLitres: Math.round(totalFuelSavedLitres * 10) / 10,
    totalCostImpact: Math.round(totalCostImpact),
    totalCo2AvoidedKg: Math.round(totalCo2AvoidedKg * 10) / 10
  };
}
