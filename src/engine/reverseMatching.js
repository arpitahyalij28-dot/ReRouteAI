// ReRoute AI 2.0 - Reverse Matching Engine (ES Module)
// Uber-style Shipper-to-Truck Reverse Matching & Backhaul Quote Optimization.
// Ranks available returning trucks for a given shipment tender, calculating detour,
// arrival ETA buffer, payload capacity fit, and dynamic backhaul savings.

import { calculateRouteEstimate } from './distance.js';
import { calculateETA } from './eta.js';
import { normalizeWeights } from './matching.js';

export const DEFAULT_WEATHER_PENALTIES = {
  low: 0,
  medium: 15,
  high: 35,
};

export const DEFAULT_MARKET_RATES = {
  freshTripPerKmInr: 48, // Standard outbound spot hiring rate
  backhaulBasePerKmInr: 32, // Discounted backhaul rate
  detourSurchargePerKmInr: 28, // Incremental detour compensation
};

/**
 * Ranks all available or returning trucks for a shipper's shipment tender.
 *
 * @param {Object} shipment - The demand-side freight shipment
 * @param {Array} trucks - Candidate fleet trucks
 * @param {Object} [settings] - Engine settings (weights, weather, speed)
 * @returns {Array} Sorted array of ranked truck candidates with match scores and backhaul quotes
 */
export function rankTrucksForShipment(shipment, trucks = [], settings = {}) {
  if (!shipment || !Array.isArray(trucks) || trucks.length === 0) {
    return [];
  }

  const weights = normalizeWeights(settings.weights || {});
  const weather = settings.weather || null;
  const weatherRisk = (weather?.disruptionImpact?.riskLevel || weather?.riskLevel || 'low').toLowerCase();
  const weatherPenalty = (settings.weatherPenalties || DEFAULT_WEATHER_PENALTIES)[weatherRisk] ?? 0;

  const shipmentWeightTons = Number(
    shipment.weightTons ?? (shipment.cargoWeight ? shipment.cargoWeight / 1000 : 8)
  );

  const results = trucks.map((truck) => {
    const truckCapacityTons = Number(
      truck.capacityTons ?? (truck.maxCapacity ? truck.maxCapacity / 1000 : 10)
    );
    const speedKmH = Number(settings.speedKmH || truck.speedKmH || 45);

    // 1. Physical Capacity Feasibility
    const capacityFit = truckCapacityTons >= shipmentWeightTons;
    const capacityUtilizationPct = Math.min(
      100,
      Math.round((shipmentWeightTons / Math.max(0.1, truckCapacityTons)) * 100)
    );

    // 2. Route Detour & Geometry
    const routeEstimate = calculateRouteEstimate(truck, shipment, speedKmH);
    const detourKm =
      routeEstimate.isValid && !isNaN(routeEstimate.detourKm) ? routeEstimate.detourKm : 15;
    const loadedKm =
      routeEstimate.isValid && !isNaN(routeEstimate.loadedBackhaulKm)
        ? routeEstimate.loadedBackhaulKm
        : 120;
    const pickupDistanceKm =
      routeEstimate.isValid && !isNaN(routeEstimate.pickupDeadheadKm)
        ? routeEstimate.pickupDeadheadKm
        : 20;

    // 3. ETA & Time Window
    const etaEstimate = calculateETA(truck, shipment, speedKmH, weather);
    const etaBufferMinutes = etaEstimate.etaBufferMinutes ?? 15;
    const isTimeFeasible = etaBufferMinutes >= -15;

    // 4. Dynamic Backhaul Pricing & Shipper Savings
    const freshTripInr = Math.max(
      Number(shipment.freightOfferInr || shipment.value || 0),
      Math.round(loadedKm * DEFAULT_MARKET_RATES.freshTripPerKmInr)
    );
    const backhaulQuoteInr = Math.max(
      8000,
      Math.round(
        loadedKm * DEFAULT_MARKET_RATES.backhaulBasePerKmInr +
          detourKm * DEFAULT_MARKET_RATES.detourSurchargePerKmInr
      )
    );
    const savingsInr = Math.max(0, freshTripInr - backhaulQuoteInr);
    const savingsPct = freshTripInr > 0 ? Math.round((savingsInr / freshTripInr) * 100) : 0;

    // 5. Component Scoring (0 - 100)
    // Detour Score: 0km detour = 100, 30km detour = 10
    const detourScore = Math.max(10, Math.min(100, Math.round(100 - detourKm * 3.0)));

    // Time Score: Buffer > 30m = 95, tight = 75, negative = 25
    let timeScore = 80;
    if (etaBufferMinutes >= 45) timeScore = 98;
    else if (etaBufferMinutes >= 20) timeScore = 90;
    else if (etaBufferMinutes >= 0) timeScore = 75;
    else if (etaBufferMinutes >= -20) timeScore = 45;
    else timeScore = 20;

    // Capacity Score: 70-95% utilization is optimal sweet spot
    let capacityScore = 70;
    if (capacityUtilizationPct >= 70 && capacityUtilizationPct <= 95) capacityScore = 96;
    else if (capacityUtilizationPct > 95 && capacityUtilizationPct <= 100) capacityScore = 88;
    else if (capacityUtilizationPct >= 40 && capacityUtilizationPct < 70) capacityScore = 78;
    else if (!capacityFit) capacityScore = 15;

    // Cost / Savings Score
    const costScore = Math.min(100, Math.max(20, Math.round(50 + savingsPct * 1.5)));

    // Disruption Score
    const baseDisruption = Math.max(10, 100 - (truck.emptyReturnProbability ? 100 - truck.emptyReturnProbability : 20));
    const disruptionScore = Math.max(5, Math.min(100, baseDisruption - weatherPenalty));

    // Route Alignment Score
    const routeScore = Math.max(20, Math.min(100, Math.round(100 - pickupDistanceKm * 1.2)));

    // Composite Weighted Score
    let compositeScore =
      (routeScore * weights.route +
        timeScore * weights.time +
        capacityScore * weights.capacity +
        detourScore * weights.detour +
        costScore * weights.cost +
        disruptionScore * weights.disruption) /
      100;

    compositeScore = Math.round(Math.min(100, Math.max(10, compositeScore)));

    const isFeasible = capacityFit && isTimeFeasible;
    if (!isFeasible) {
      compositeScore = Math.min(compositeScore, 35);
    }

    // Explainability Reasons
    const reasons = [];
    if (detourKm <= 10) {
      reasons.push(`Minimal corridor deviation (+${detourKm} km from direct return vector)`);
    } else {
      reasons.push(`Requires +${detourKm} km detour from primary return corridor`);
    }

    if (etaBufferMinutes >= 15) {
      reasons.push(`Comfortable pickup dock arrival (+${etaBufferMinutes}m buffer before window cutoff)`);
    } else if (etaBufferMinutes >= 0) {
      reasons.push(`Tight pickup window arrival (+${etaBufferMinutes}m dock buffer)`);
    } else {
      reasons.push(`Schedule risk: Truck arrives ${Math.abs(etaBufferMinutes)}m after dock cutoff`);
    }

    if (savingsPct >= 15) {
      reasons.push(
        `Dynamic backhaul savings: Save ₹${savingsInr.toLocaleString('en-IN')} (${savingsPct}%) vs fresh spot hiring`
      );
    }

    if (capacityFit) {
      reasons.push(
        `Optimal payload fit: ${shipmentWeightTons}t matches ${capacityUtilizationPct}% of vehicle's ${truckCapacityTons}t capacity`
      );
    } else {
      reasons.push(
        `Overweight: Shipment (${shipmentWeightTons}t) exceeds truck capacity (${truckCapacityTons}t)`
      );
    }

    if (weatherPenalty > 0) {
      reasons.push(`Weather alert applied: ${weatherRisk.toUpperCase()} corridor hazard (-${weatherPenalty} pts)`);
    }

    // Soft-reservation status check
    const isReserved =
      truck.requestStatus === 'requested' ||
      (truck.holdExpiresAt && new Date(truck.holdExpiresAt).getTime() > Date.now());

    return {
      truck,
      truckId: truck.id,
      regNumber: truck.regNumber || truck.id,
      driverName: truck.driverName || 'Driver',
      vehicleType: truck.vehicleType || truck.model || 'Heavy Commercial Vehicle',
      currentLocationName: truck.currentLocationName || 'Corridor Transit',
      capacityTons: truckCapacityTons,
      shipmentWeightTons,
      capacityUtilizationPct,
      matchScore: compositeScore,
      isFeasible,
      detourKm,
      pickupDistanceKm,
      loadedKm,
      etaMinutes: etaEstimate.etaMinutes || 45,
      etaArrival: etaEstimate.etaArrival || '15:30',
      etaBufferMinutes,
      freshTripInr,
      backhaulQuoteInr,
      savingsInr,
      savingsPct,
      reasons,
      isReserved,
      holdExpiresAt: truck.holdExpiresAt || null,
      factors: {
        route: routeScore,
        time: timeScore,
        capacity: capacityScore,
        detour: detourScore,
        cost: costScore,
        disruption: disruptionScore,
      },
    };
  });

  // Sort feasible first, then by matchScore descending
  results.sort((a, b) => {
    if (a.isFeasible !== b.isFeasible) {
      return a.isFeasible ? -1 : 1;
    }
    return b.matchScore - a.matchScore;
  });

  // Assign ranks
  return results.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}
