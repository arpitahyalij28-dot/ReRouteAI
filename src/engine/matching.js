// ReRoute AI 2.0 - Backhaul Matching Engine (ES Module)
// Evaluates candidate shipments against a truck using Weighted Multi-Criteria Scoring

import { calculateRouteEstimate } from './distance.js';
import { calculateETA } from './eta.js';
import { calculateSustainability } from './sustainability.js';

export const DEFAULT_WEIGHTS = {
  route: 25,
  time: 20,
  capacity: 20,
  detour: 15,
  cost: 10,
  disruption: 10
};

export const DEFAULT_WEATHER_PENALTIES = {
  low: 0,
  medium: 15,
  high: 35,
};

/**
 * Normalizes weight keys to sum to 100
 */
export function normalizeWeights(rawWeights = {}) {
  // Support both 'risk' and 'disruption' as aliases
  const merged = {
    route: Number(rawWeights.route ?? DEFAULT_WEIGHTS.route),
    time: Number(rawWeights.time ?? DEFAULT_WEIGHTS.time),
    capacity: Number(rawWeights.capacity ?? DEFAULT_WEIGHTS.capacity),
    detour: Number(rawWeights.detour ?? DEFAULT_WEIGHTS.detour),
    cost: Number(rawWeights.cost ?? DEFAULT_WEIGHTS.cost),
    disruption: Number(rawWeights.disruption ?? rawWeights.risk ?? DEFAULT_WEIGHTS.disruption),
  };

  const total = Object.values(merged).reduce((sum, v) => sum + (isNaN(v) || v < 0 ? 0 : v), 0);
  if (total <= 0) return { ...DEFAULT_WEIGHTS };

  const factor = 100 / total;
  return {
    route: Math.round(merged.route * factor * 10) / 10,
    time: Math.round(merged.time * factor * 10) / 10,
    capacity: Math.round(merged.capacity * factor * 10) / 10,
    detour: Math.round(merged.detour * factor * 10) / 10,
    cost: Math.round(merged.cost * factor * 10) / 10,
    disruption: Math.round(merged.disruption * factor * 10) / 10,
  };
}

/**
 * Evaluates all candidate shipments against a selected truck
 *
 * @param {Object} truck - Selected truck
 * @param {Array} shipments - Candidate shipments
 * @param {Object} settings - Model settings (weights, speed, thresholds)
 * @returns {Array} Evaluated & ranked shipments with scores, explainability, and feasibility
 */
export function evaluateShipments(truck, shipments = [], settings = {}) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  if (!truck || !Array.isArray(shipments) || shipments.length === 0) {
    return [];
  }

  const weights = normalizeWeights(settings.weights || {});
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 100;
  const speed = Number(settings.speedKmH || truck.speedKmH) || 45;
  const maxDetourThreshold = Number(settings.maxDetourKm) || 80;
  const fuelPrice = Number(truck.fuelPrice || settings.fuelPrice) || 95.0;
  const mileage = Number(truck.mileage || truck.vehicleMileageKmPerL) || 4.0;
  const emissionFactor = Number(settings.co2Factor || truck.emissionFactorKgPerL) || 2.68;

  // Weather configuration (optional, defaults to no weather impact)
  const weather = settings.weather;
  const weatherEnabled = settings.weatherEnabled !== false && weather?.enabled !== false;
  const weatherPenalties = settings.weatherPenalties || DEFAULT_WEATHER_PENALTIES;
  const weatherRisk = (weather && weatherEnabled)
    ? (weather.disruptionImpact?.riskLevel || weather.riskLevel || 'low')
    : 'low';
  const weatherPenalty = (weatherEnabled && weatherPenalties[weatherRisk] != null)
    ? Number(weatherPenalties[weatherRisk])
    : 0;

  // Normalize truck capacity in kg
  let truckMaxCap = Number(truck.maxCapacity);
  if (isNaN(truckMaxCap) || truckMaxCap <= 0) {
    truckMaxCap = (Number(truck.capacityTons) || 10) * 1000;
  }
  let truckCurrentLoad = Number(truck.currentLoad);
  if (isNaN(truckCurrentLoad) || truckCurrentLoad < 0) {
    truckCurrentLoad = (Number(truck.currentLoadTons) || 0) * 1000;
  }
  // For backhaul planning, in-transit trucks will be empty upon unloading at the destination hub.
  let availableCapacity = truckMaxCap - truckCurrentLoad;
  if (availableCapacity <= 0 || truck.status === 'In-Transit') {
    availableCapacity = truckMaxCap;
  }

  const evaluated = shipments.map((shipment) => {
    // 1. Route calculations
    const route = calculateRouteEstimate(truck, shipment, speed);
    const deadheadKm = route.isValid ? route.pickupDeadheadKm : 0;
    const loadedKm = route.isValid ? route.loadedBackhaulKm : 0;
    const detourKm = route.isValid ? route.detourKm : (Number(shipment.detourKm) || 0);

    // 2. ETA calculations (with weather slowdown when weather data exists)
    const eta = calculateETA(truck, shipment, deadheadKm, speed, 20, weatherEnabled ? weather : null);

    // 3. Feasibility Analysis
    let cargoWeight = Number(shipment.cargoWeight);
    if (isNaN(cargoWeight) || cargoWeight <= 0) {
      cargoWeight = (Number(shipment.weightTons) || 0) * 1000;
    }

    const infeasibleReasons = [];
    const whyNotReasons = [];

    // Rule 1: Status must be Available (or unassigned/new)
    const status = shipment.status || 'Available';
    const isCancelled = shipment.isCancelled || status === 'Cancelled';
    if (status !== 'Available' || isCancelled) {
      infeasibleReasons.push(`Shipment status is '${status}' (not available for backhaul).`);
      whyNotReasons.push(`Shipment is currently ${status.toLowerCase()}.`);
    }

    // Rule 2: Capacity fit
    if (cargoWeight > availableCapacity) {
      const cargoTonsStr = (cargoWeight / 1000).toFixed(1);
      const availTonsStr = (availableCapacity / 1000).toFixed(1);
      infeasibleReasons.push(
        `Cargo weight (${cargoTonsStr}t) exceeds available vehicle capacity (${availTonsStr}t).`
      );
      whyNotReasons.push(
        `Capacity overflow: ${cargoTonsStr}t exceeds remaining truck capacity (${availTonsStr}t).`
      );
    }

    // Rule 3: Vehicle Type compatibility
    if (
      shipment.requiredVehicleType &&
      shipment.requiredVehicleType !== 'Any' &&
      truck.vehicleType &&
      shipment.requiredVehicleType.toLowerCase() !== truck.vehicleType.toLowerCase()
    ) {
      infeasibleReasons.push(
        `Vehicle type mismatch: Requires '${shipment.requiredVehicleType}', truck is '${truck.vehicleType}'.`
      );
      whyNotReasons.push(`Vehicle type mismatch: Requires '${shipment.requiredVehicleType}'.`);
    }

    // Rule 4: ETA status
    if (eta.status === 'INFEASIBLE') {
      infeasibleReasons.push(`Pickup window breached: ${eta.explanation}`);
      whyNotReasons.push(`Pickup timing clash: ${eta.explanation}`);
    }

    if (detourKm > maxDetourThreshold) {
      whyNotReasons.push(
        `Detour penalty: ${detourKm} km exceeds maximum corridor threshold of ${maxDetourThreshold} km.`
      );
    }

    const isFeasible = infeasibleReasons.length === 0 && !isCancelled;

    // 4. Multi-Criteria Components (0 - 100 each)
    // Component 1: Route Compatibility
    let routeCompScore = 50;
    if (route.isValid) {
      const deadheadScore = Math.max(0, 100 - (deadheadKm / 1.5));
      const returnScore = route.directReturnKm > 0
        ? Math.min(100, Math.max(20, 100 - ((detourKm / Math.max(1, route.directReturnKm)) * 60)))
        : 70;
      routeCompScore = Math.round((deadheadScore * 0.6) + (returnScore * 0.4));
    } else if (shipment.rawFactors?.route) {
      routeCompScore = shipment.rawFactors.route;
    }

    // Component 2: Time Compatibility
    let timeCompScore = 50;
    if (eta.isValid) {
      if (eta.status === 'ON TIME') {
        timeCompScore = Math.min(100, Math.max(75, 100 - (Math.abs(eta.marginToCloseMins - 60) / 4)));
      } else if (eta.status === 'AT RISK') {
        timeCompScore = Math.min(70, Math.max(45, 40 + eta.marginToCloseMins));
      } else if (eta.status === 'LIKELY DELAYED') {
        timeCompScore = 25;
      } else {
        timeCompScore = 5;
      }
    } else if (shipment.rawFactors?.time) {
      timeCompScore = shipment.rawFactors.time;
    }

    // Component 3: Capacity Fit
    let capacityFitScore = 0;
    if (availableCapacity > 0) {
      if (cargoWeight <= availableCapacity) {
        const loadRatio = cargoWeight / availableCapacity;
        capacityFitScore = Math.round(loadRatio * 100);
      } else {
        capacityFitScore = 0;
      }
    } else if (shipment.rawFactors?.capacity) {
      capacityFitScore = shipment.rawFactors.capacity;
    }

    // Component 4: Detour Efficiency
    let detourEfficiencyScore = 0;
    if (route.isValid) {
      detourEfficiencyScore = Math.round(Math.max(0, 100 - (detourKm / maxDetourThreshold) * 80));
    } else if (shipment.rawFactors?.detour) {
      detourEfficiencyScore = shipment.rawFactors.detour;
    }

    // Component 5: Cost Efficiency
    const shipmentValue = Number(shipment.value || shipment.freightOfferInr) || 20000;
    const detourFuelCost = (detourKm / mileage) * fuelPrice;
    const netGain = shipmentValue - detourFuelCost;
    let costEfficiencyScore = Math.min(
      100,
      Math.max(10, Math.round((netGain / Math.max(1, shipmentValue)) * 100))
    );
    if (shipment.rawFactors?.cost) {
      costEfficiencyScore = shipment.rawFactors.cost;
    }

    // Component 6: Disruption Risk (higher = lower risk)
    let disruptionRiskScore = Math.max(5, 100 - (eta.delayRisk || 20));
    if (shipment.rawFactors?.risk || shipment.rawFactors?.disruption) {
      disruptionRiskScore = shipment.rawFactors.disruption || shipment.rawFactors.risk;
    }

    // Weather-aware disruption penalty (clamped 5..100)
    if (weatherPenalty > 0) {
      disruptionRiskScore = Math.max(5, Math.min(100, disruptionRiskScore - weatherPenalty));
    }

    const rawScore =
      (routeCompScore * weights.route +
        timeCompScore * weights.time +
        capacityFitScore * weights.capacity +
        detourEfficiencyScore * weights.detour +
        costEfficiencyScore * weights.cost +
        disruptionRiskScore * weights.disruption) /
      totalWeight;

    const matchScore = isFeasible
      ? Math.round(rawScore)
      : Math.min(45, Math.round(rawScore * 0.45));

    // 5. Sustainability calculations
    const sustainability = calculateSustainability({
      distanceKm: loadedKm || 150,
      detourKm,
      mileage,
      fuelPrice,
      emissionFactor,
      maxCapacity: truckMaxCap,
      cargoWeight,
      shipmentValue,
    });

    // 6. Dynamic explainability checklist
    const whyReasons = [];
    if (isFeasible) {
      const cargoTons = (cargoWeight / 1000).toFixed(1);
      const availTons = (availableCapacity / 1000).toFixed(1);

      if (capacityFitScore >= 75) {
        whyReasons.push({
          type: 'check',
          title: 'High payload capacity utilization',
          description: `${cargoTons}t cargo utilizes ${Math.round((cargoWeight / availableCapacity) * 100)}% of ${availTons}t available rating.`,
        });
      } else {
        whyReasons.push({
          type: 'check',
          title: 'Payload capacity compatible',
          description: `${cargoTons}t cargo fits safely within ${availTons}t truck rating.`,
        });
      }

      if (eta.status === 'ON TIME') {
        whyReasons.push({
          type: 'check',
          title: 'Pickup timing fully compatible',
          description: `Vehicle predicted to arrive with ${eta.marginToCloseMins}m buffer before window closes.`,
        });
      } else if (eta.status === 'AT RISK') {
        whyReasons.push({
          type: 'warning',
          title: 'Tight pickup schedule',
          description: `Tight schedule: ${eta.marginToCloseMins}m safety buffer before cutoff.`,
        });
      }

      if (detourKm <= 20) {
        whyReasons.push({
          type: 'check',
          title: 'Low detour overhead',
          description: `Only ${detourKm} km incremental transit from primary destination.`,
        });
      } else {
        whyReasons.push({
          type: 'warning',
          title: 'Moderate detour required',
          description: `Adds +${detourKm} km detour from nominal return corridor.`,
        });
      }

      if (routeCompScore >= 80) {
        whyReasons.push({
          type: 'check',
          title: 'Strong return vector alignment',
          description: `Route aligns closely with the return leg to home terminal.`,
        });
      }

      if (sustainability.netEconomicGain > 0) {
        whyReasons.push({
          type: 'check',
          title: 'Positive backhaul freight yield',
          description: `Yields ₹${sustainability.netEconomicGain.toLocaleString('en-IN')} net margin above detour fuel cost.`,
        });
      }

    } else {
      infeasibleReasons.forEach((reason) => {
        whyReasons.push({
          type: 'cross',
          title: 'Feasibility constraint breached',
          description: reason,
        });
      });
    }

    if (weatherPenalty > 0) {
      const weatherCondition = weather?.currentWeather?.condition || weather?.condition || 'Adverse corridor weather';
      const locationName = weather?.location?.name || truck.currentLocationName || 'Corridor transit route';
      const delayMins = eta.weatherSlowdownMins || 0;
      const etaText = delayMins > 0 ? `, ETA +${delayMins} min` : '';

      whyReasons.push({
        type: weatherRisk === 'high' ? 'warning' : 'info',
        title: weatherRisk === 'high' ? 'Adverse weather hazard' : 'Weather slowdown advisory',
        description: `${weatherCondition} near ${locationName}: disruption score reduced (-${weatherPenalty} pts)${etaText}.`,
      });
    }

    const whyWhyNot = {
      recommendedSummary: isCancelled
        ? 'Cancelled: Tender cancelled or retracted by shipper.'
        : isFeasible
        ? `Feasible candidate: ${matchScore}% alignment with available capacity and corridor timing.`
        : `Infeasible candidate: Cannot be dispatched due to ${infeasibleReasons[0] || 'operational constraint'}.`,
      reasons: whyReasons,
    };

    const factorDetailMap = {
      route: {
        rawScore: routeCompScore,
        weight: weights.route / 100,
        weightedScore: Number(((routeCompScore * weights.route) / totalWeight).toFixed(1)),
        label: 'Route Compatibility',
        weightPctLabel: `${Math.round(weights.route)}%`,
        detail: `${routeCompScore}/100 alignment with corridor transit vector`,
      },
      time: {
        rawScore: timeCompScore,
        weight: weights.time / 100,
        weightedScore: Number(((timeCompScore * weights.time) / totalWeight).toFixed(1)),
        label: 'Time Compatibility',
        weightPctLabel: `${Math.round(weights.time)}%`,
        detail: eta.explanation || `${timeCompScore}/100 time window compatibility`,
      },
      capacity: {
        rawScore: capacityFitScore,
        weight: weights.capacity / 100,
        weightedScore: Number(((capacityFitScore * weights.capacity) / totalWeight).toFixed(1)),
        label: 'Capacity Fit',
        weightPctLabel: `${Math.round(weights.capacity)}%`,
        detail: `${(cargoWeight / 1000).toFixed(1)}t cargo on ${(truckMaxCap / 1000).toFixed(1)}t rating`,
      },
      detour: {
        rawScore: detourEfficiencyScore,
        weight: weights.detour / 100,
        weightedScore: Number(((detourEfficiencyScore * weights.detour) / totalWeight).toFixed(1)),
        label: 'Detour Efficiency',
        weightPctLabel: `${Math.round(weights.detour)}%`,
        detail: `+${detourKm} km incremental diversion`,
      },
      cost: {
        rawScore: costEfficiencyScore,
        weight: weights.cost / 100,
        weightedScore: Number(((costEfficiencyScore * weights.cost) / totalWeight).toFixed(1)),
        label: 'Cost Efficiency',
        weightPctLabel: `${Math.round(weights.cost)}%`,
        detail: `Gross yield: ₹${shipmentValue.toLocaleString('en-IN')}`,
      },
      disruption: {
        rawScore: disruptionRiskScore,
        weight: weights.disruption / 100,
        weightedScore: Number(((disruptionRiskScore * weights.disruption) / totalWeight).toFixed(1)),
        label: 'Low Disruption Risk',
        weightPctLabel: `${Math.round(weights.disruption)}%`,
        detail: weatherPenalty > 0
          ? `${disruptionRiskScore}/100 stability score (-${weatherPenalty} weather penalty: ${weatherRisk})`
          : `${disruptionRiskScore}/100 stability score`,
      },
    };

    // Alias 'risk' to 'disruption' for UI compatibility
    factorDetailMap.risk = factorDetailMap.disruption;

    return {
      shipment: {
        ...shipment,
        detourKm,
        isCancelled,
        whyWhyNot: shipment.whyWhyNot || whyWhyNot,
        rawFactors: {
          route: routeCompScore,
          time: timeCompScore,
          capacity: capacityFitScore,
          detour: detourEfficiencyScore,
          cost: costEfficiencyScore,
          risk: disruptionRiskScore,
          disruption: disruptionRiskScore,
        },
      },
      shipmentId: shipment.id,
      isFeasible,
      isRecommended: false,
      matchScore,
      totalScore: matchScore,
      score: {
        shipmentId: shipment.id,
        totalScore: matchScore,
        factors: factorDetailMap,
      },
      factors: factorDetailMap,
      components: {
        route: { score: routeCompScore, weight: weights.route },
        time: { score: timeCompScore, weight: weights.time },
        capacity: { score: capacityFitScore, weight: weights.capacity },
        detour: { score: detourEfficiencyScore, weight: weights.detour },
        cost: { score: costEfficiencyScore, weight: weights.cost },
        disruption: { score: disruptionRiskScore, weight: weights.disruption },
      },
      whyWhyNot: shipment.whyWhyNot || whyWhyNot,
      route,
      deadheadKm,
      loadedKm,
      detourKm,
      eta,
      sustainability,
      weatherImpact: weatherPenalty > 0 ? {
        riskLevel: weatherRisk,
        penalty: weatherPenalty,
        condition: weather?.currentWeather?.condition || weather?.condition || 'Adverse weather',
        slowdownMins: eta.weatherSlowdownMins || 0,
        isSimulated: Boolean(weather?.isSimulated),
      } : null,
    };
  });

  // Sort: Feasible first by matchScore desc; then infeasible
  evaluated.sort((a, b) => {
    if (a.isFeasible && !b.isFeasible) return -1;
    if (!a.isFeasible && b.isFeasible) return 1;
    return b.matchScore - a.matchScore;
  });

  // CRITICAL RULE: Infeasible shipment is NEVER recommended
  const topFeasible = evaluated.find((item) => item.isFeasible);
  if (topFeasible) {
    topFeasible.isRecommended = true;
  }

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const latencyMs = Number((endTime - startTime).toFixed(2));

  // Attach metadata
  evaluated.metadata = {
    solverType: 'Weighted Multi-Criteria Scoring',
    latencyMs,
    truckId: truck.id,
    evaluatedCount: shipments.length,
    feasibleCount: evaluated.filter((e) => e.isFeasible).length,
    recommendedId: topFeasible ? topFeasible.shipmentId : null,
  };

  return evaluated;
}
