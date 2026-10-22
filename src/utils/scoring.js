// ReRoute AI 2.0 - Scoring & Risk Predictive Algorithms
// Uses weighted multi-criteria scoring (25% Route, 20% Time, 20% Capacity, 15% Detour, 10% Cost, 10% Disruption)
// and predictive deadhead risk calculations based on real freight demand deficit.

import {
  evaluateShipments,
  calculateSustainability,
  calculateRouteEstimate,
} from "../engine/index.js";

export const DEFAULT_FACTOR_WEIGHTS = {
  route: 25,
  time: 20,
  capacity: 20,
  detour: 15,
  cost: 10,
  disruption: 10,
  risk: 10,
};

/**
 * Predicts empty-return (deadhead) risk percentage (0 to 100) for a commercial truck.
 *
 * Predictive inputs:
 * 1. Destination freight demand deficit: Compares demand vs supply at destination city.
 * 2. Return corridor load scarcity: Available unassigned loads heading toward truck origin/home.
 * 3. Time urgency until ETA: Shorter remaining time reduces dispatcher negotiation buffer.
 * 4. Payload utilization on outbound leg: Outbound underloading elevates empty-run risk.
 *
 * @param {Object} truck - Vehicle parameters
 * @param {Array} loads - Available consignment candidate pool
 * @returns {number} Calculated predictive risk percentage (0 - 100)
 */
export function calculateDeadheadRisk(truck, loads = []) {
  if (!truck) return 0;
  if (truck.status === 'Returning Empty') return 95;

  const destCity = (truck.destination || '').toLowerCase().trim();
  const originCity = (truck.origin || '').toLowerCase().trim();

  // 1. Destination freight demand deficit:
  // How many active unassigned loads originate in or around the destination city?
  const localOriginatingLoads = (loads || []).filter((l) => {
    if (l.isCancelled || l.status === 'Assigned') return false;
    const lOrigin = (l.origin || l.pickupCity || '').toLowerCase();
    return lOrigin.includes(destCity) || destCity.includes(lOrigin.split(' ')[0]);
  });

  let demandDeficitScore = 36;
  if (localOriginatingLoads.length === 0) {
    demandDeficitScore = 40; // High deficit: no loads ready at destination
  } else if (localOriginatingLoads.length === 1) {
    demandDeficitScore = 26;
  } else if (localOriginatingLoads.length === 2) {
    demandDeficitScore = 16;
  } else {
    demandDeficitScore = 8; // Abundant local freight demand
  }

  // 2. Return corridor load availability:
  // Available loads heading back toward truck origin
  const returnCorridorLoads = (loads || []).filter((l) => {
    if (l.isCancelled || l.status === 'Assigned') return false;
    const lDest = (l.destination || l.dropCity || '').toLowerCase();
    return lDest.includes(originCity) || originCity.includes(lDest.split(' ')[0]);
  });

  let corridorScarcityScore = 30;
  if (returnCorridorLoads.length === 0) {
    corridorScarcityScore = 34; // No return load in direction of home
  } else if (returnCorridorLoads.length === 1) {
    corridorScarcityScore = 20;
  } else if (returnCorridorLoads.length === 2) {
    corridorScarcityScore = 12;
  } else {
    corridorScarcityScore = 6;
  }

  // 3. Time urgency until ETA:
  // Less time before arrival = higher pressure to avoid deadhead
  const countdownSec = Number(truck.countdownSeconds) || 7200;
  let timeUrgencyScore = 14;
  if (countdownSec <= 3600) {
    timeUrgencyScore = 20; // <1 hour remaining
  } else if (countdownSec <= 7200) {
    timeUrgencyScore = 14; // 1-2 hours
  } else {
    timeUrgencyScore = 7; // >2 hours
  }

  // 4. Payload utilization on outbound leg:
  const cap = Number(truck.capacityTons || (truck.maxCapacity ? truck.maxCapacity / 1000 : 10));
  const currentLoad = Number(truck.currentLoadTons ?? (truck.currentLoad ? truck.currentLoad / 1000 : cap));
  const outboundUtil = cap > 0 ? currentLoad / cap : 1;

  let utilizationPenalty = 0;
  if (outboundUtil < 0.5) {
    utilizationPenalty = 10;
  } else if (outboundUtil < 0.8) {
    utilizationPenalty = 4;
  }

  const rawRisk = demandDeficitScore + corridorScarcityScore + timeUrgencyScore + utilizationPenalty;
  return Math.min(98, Math.max(5, Math.round(rawRisk)));
}

/**
 * Calculates Final Allocation Score distinct from raw Match Score.
 * Takes into account detour friction and corridor alignment yield.
 *
 * @param {number} rawMatchScore - 0 to 100
 * @param {Object} truck
 * @param {Object} shipment
 * @returns {number} Distinct Final Allocation Score
 */
export function calculateFinalAllocationScore(rawMatchScore, truck = null, shipment = null) {
  if (!rawMatchScore) return 0;
  const detourKm = Number(shipment?.detourKm) || 0;
  // Detour friction factor
  const friction = detourKm > 20 ? 8 : detourKm > 10 ? 5 : 2;
  const allocationScore = Math.max(10, Math.min(100, Math.round(rawMatchScore * 0.94 - friction)));
  return allocationScore;
}

/**
 * Calculates score and breakdown for a single shipment against a truck.
 * Returns null if either shipment or truck is missing.
 */
export function calculateShipmentScore(
  shipment,
  weights = DEFAULT_FACTOR_WEIGHTS,
  truck = null
) {
  if (!shipment || !truck) return null;
  const evaluated = evaluateShipments(truck, [shipment], { weights });
  const baseScore = evaluated[0]?.score || null;
  if (baseScore) {
    baseScore.finalAllocationScore = calculateFinalAllocationScore(baseScore.totalScore, truck, shipment);
  }
  return baseScore;
}

/**
 * Evaluates and ranks all candidate shipments against a truck using weighted multi-criteria scoring.
 * Infeasible shipments are never recommended.
 * Returns empty ranked list if truck or shipments are missing.
 */
export function rankShipments(
  shipments,
  weights = DEFAULT_FACTOR_WEIGHTS,
  truck = null
) {
  if (!truck || !Array.isArray(shipments) || shipments.length === 0) {
    return { ranked: [], recommendedId: null, metadata: { latencyMs: 0 } };
  }

  const evaluated = evaluateShipments(truck, shipments, { weights });

  const ranked = evaluated.map((e) => {
    const finalScore = calculateFinalAllocationScore(e.score?.totalScore || e.matchScore, truck, e.shipment);
    return {
      shipment: e.shipment,
      score: {
        ...e.score,
        finalAllocationScore: finalScore,
      },
      matchScore: e.matchScore,
      finalAllocationScore: finalScore,
      isFeasible: e.isFeasible,
      isRecommended: e.isRecommended,
    };
  });

  const recommendedId = evaluated.metadata?.recommendedId || null;

  return { ranked, recommendedId, metadata: evaluated.metadata };
}

/**
 * Dynamically computes sustainability impact from truck and shipment parameters.
 * Zero hardcoded fallback vehicles.
 */
export function calculateSustainabilityMetrics(
  shipment,
  truck = null
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
  if (!seconds || seconds <= 0) {
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
