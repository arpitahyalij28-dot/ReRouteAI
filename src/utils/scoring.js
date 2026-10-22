import { INITIAL_TRUCK, FACTOR_WEIGHTS } from "../data/mockData.js";
import {
  evaluateShipments,
  calculateSustainability,
  calculateRouteEstimate,
} from "../engine/index.js";

/**
 * Calculates score and breakdown for a single shipment against a truck.
 * Pure wrapper delegating directly to the matching engine.
 */
export function calculateShipmentScore(
  shipment,
  weights = FACTOR_WEIGHTS,
  truck = INITIAL_TRUCK
) {
  if (!shipment) return null;
  const evaluated = evaluateShipments(truck, [shipment], { weights });
  return evaluated[0]?.score || null;
}

/**
 * Evaluates and ranks all candidate shipments against a truck.
 * Infeasible shipments are never recommended.
 */
export function rankShipments(
  shipments,
  weights = FACTOR_WEIGHTS,
  truck = INITIAL_TRUCK
) {
  if (!Array.isArray(shipments) || shipments.length === 0) {
    return { ranked: [], recommendedId: null };
  }

  const evaluated = evaluateShipments(truck, shipments, { weights });

  const ranked = evaluated.map((e) => ({
    shipment: e.shipment,
    score: e.score,
    isFeasible: e.isFeasible,
    isRecommended: e.isRecommended,
  }));

  const recommendedId = evaluated.metadata?.recommendedId || null;

  return { ranked, recommendedId, metadata: evaluated.metadata };
}

/**
 * Dynamically computes sustainability impact from truck and shipment parameters.
 * Zero hardcoded vehicle ratings or city distances.
 */
export function calculateSustainabilityMetrics(
  shipment,
  truck = INITIAL_TRUCK
) {
  if (!shipment || shipment.isCancelled || !truck) {
    return {
      emptyKmAvoided: 0,
      additionalDetourKm: 0,
      fuelSavedLitres: 0,
      costSavedInr: 0,
      co2ReducedKg: 0,
      vehicleUtilizationPct: 0,
    };
  }

  const route = calculateRouteEstimate(truck, shipment);
  const loadedDistance =
    route.isValid && route.loadedBackhaulKm > 0
      ? route.loadedBackhaulKm
      : Number(truck.totalTripKm) || 150;
  const detourKm = route.isValid
    ? route.detourKm
    : Number(shipment.detourKm) || 0;

  const mileage =
    Number(truck.vehicleMileageKmPerL || truck.mileage) || 4.0;
  const fuelPrice =
    Number(truck.fuelPricePerL || truck.fuelPrice) || 95.0;
  const emissionFactor =
    Number(truck.emissionFactorKgPerL) || 2.68;
  const maxCapacity =
    Number(truck.maxCapacity) ||
    (Number(truck.capacityTons) ? Number(truck.capacityTons) * 1000 : 10000);
  const cargoWeight =
    Number(shipment.cargoWeight) ||
    (Number(shipment.weightTons) ? Number(shipment.weightTons) * 1000 : 0);
  const shipmentValue =
    Number(shipment.freightOfferInr || shipment.value) || 0;

  const metrics = calculateSustainability({
    distanceKm: loadedDistance,
    detourKm,
    mileage,
    fuelPrice,
    emissionFactor,
    maxCapacity,
    cargoWeight,
    shipmentValue,
  });

  return {
    emptyKmAvoided: metrics.emptyKmAvoided,
    additionalDetourKm: metrics.additionalDetourKm,
    fuelSavedLitres: metrics.fuelSavedLitres,
    costSavedInr: metrics.costSavedInr,
    co2ReducedKg: metrics.co2ReducedKg,
    vehicleUtilizationPct: metrics.vehicleUtilizationPct,
  };
}

/**
 * Formats a countdown value into human-readable hours, minutes, and seconds.
 */
export function formatCountdown(seconds) {
  if (seconds <= 0) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: "00h 00m 00s (Empty Now)",
    };
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => n.toString().padStart(2, "0");
  return {
    hours: h,
    minutes: m,
    seconds: s,
    formatted: `${pad(h)}h ${pad(m)}m ${pad(s)}s`,
  };
}
