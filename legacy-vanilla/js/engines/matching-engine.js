// ReRoute AI 2.0 - Backhaul Matching Engine
// Evaluates shipments against selected truck using dynamic multi-attribute decision weighting
// Label: "Prototype Matching Engine"
// Weights are fully configurable from Model Settings

(function() {
  function getEngine(name) {
    if (typeof window !== 'undefined' && window.ReRoute && window.ReRoute[name]) {
      return window.ReRoute[name];
    }
    if (typeof require !== 'undefined') {
      if (name === 'DistanceEngine') return require('./distance-engine.js');
      if (name === 'ETAEngine') return require('./eta-engine.js');
      if (name === 'SustainabilityEngine') return require('./sustainability-engine.js');
    }
    return null;
  }

  const DEFAULT_WEIGHTS = {
    route: 25,
    time: 20,
    capacity: 20,
    detour: 15,
    cost: 10,
    disruption: 10
  };

  /**
   * Evaluates all candidate shipments against a selected truck
   *
   * @param {Object} truck - Selected truck
   * @param {Array} shipments - Candidate shipments
   * @param {Object} settings - Model settings (weights, speed, thresholds)
   * @returns {Array} Evaluated & ranked shipments with scores, explainability, and feasibility
   */
  function evaluateShipments(truck, shipments = [], settings = {}) {
    if (!truck || !Array.isArray(shipments) || shipments.length === 0) {
      return [];
    }

    const distEngine = getEngine('DistanceEngine');
    const etaEngine = getEngine('ETAEngine');
    const sustEngine = getEngine('SustainabilityEngine');

    const weights = Object.assign({}, DEFAULT_WEIGHTS, settings.weights || {});
    const speed = Number(settings.speedKmH) || 45;
    const maxDetourThreshold = Number(settings.maxDetourKm) || 80;
    const fuelPrice = Number(truck.fuelPrice || settings.fuelPrice) || 94.50;
    const mileage = Number(truck.mileage) || 4.2;
    const emissionFactor = Number(settings.co2Factor) || 2.68;

    const truckMaxCap = Number(truck.maxCapacity) || 10000;
    const truckCurrentLoad = Number(truck.currentLoad) || 0;
    // Available capacity for backhaul
    const availableCapacity = Math.max(0, truckMaxCap - truckCurrentLoad);

    const evaluated = shipments.map(shipment => {
      // 1. Route calculations
      let route = null;
      if (distEngine) {
        route = distEngine.calculateRouteEstimate(truck, shipment, speed);
      } else {
        route = { isValid: false, detourKm: 0, pickupDeadheadKm: 0, loadedBackhaulKm: 0 };
      }

      const deadheadKm = route.isValid ? route.pickupDeadheadKm : 0;
      const loadedKm = route.isValid ? route.loadedBackhaulKm : 0;
      const detourKm = route.isValid ? route.detourKm : 0;

      // 2. ETA calculations
      let eta = null;
      if (etaEngine) {
        eta = etaEngine.calculateETA(truck, shipment, deadheadKm, speed, 20);
      } else {
        eta = { status: "ON TIME", delayRisk: 20, marginToCloseMins: 60 };
      }

      // 3. Feasibility Analysis
      const cargoWeight = Number(shipment.cargoWeight) || 0;
      const infeasibleReasons = [];
      const whyNotReasons = [];

      // Feasibility rule 1: Status must be Available
      if (shipment.status !== 'Available') {
        infeasibleReasons.push(`Shipment status is '${shipment.status}' (not available)`);
        whyNotReasons.push(`Shipment is currently ${shipment.status.toLowerCase()}`);
      }

      // Feasibility rule 2: Capacity fit
      if (cargoWeight > availableCapacity) {
        infeasibleReasons.push(`Cargo weight (${cargoWeight.toLocaleString()} kg) exceeds available vehicle capacity (${availableCapacity.toLocaleString()} kg)`);
        whyNotReasons.push(`Capacity insufficient: Cargo weight (${cargoWeight.toLocaleString()} kg) > available capacity (${availableCapacity.toLocaleString()} kg)`);
      }

      // Feasibility rule 3: Vehicle Type compatibility
      if (shipment.requiredVehicleType && 
          shipment.requiredVehicleType !== 'Any' && 
          shipment.requiredVehicleType.toLowerCase() !== (truck.vehicleType || '').toLowerCase()) {
        infeasibleReasons.push(`Vehicle type mismatch: Requires '${shipment.requiredVehicleType}', truck is '${truck.vehicleType}'`);
        whyNotReasons.push(`Vehicle type mismatch: Requires '${shipment.requiredVehicleType}'`);
      }

      // Feasibility rule 4: ETA status
      if (eta.status === 'INFEASIBLE') {
        infeasibleReasons.push(`ETA infeasible: ${eta.explanation}`);
        whyNotReasons.push(`Pickup window mismatch: ${eta.explanation}`);
      }

      // Detour excess check (warn in why-not)
      if (detourKm > maxDetourThreshold) {
        whyNotReasons.push(`High detour distance: ${detourKm} km exceeds operational limit of ${maxDetourThreshold} km`);
      }

      const isFeasible = infeasibleReasons.length === 0;

      // 4. Score Component 1: Route Compatibility (0 - 100)
      // High score if pickup is very close to truck dest (< 40km) and drop returns towards truck base
      let routeCompScore = 50;
      if (route.isValid) {
        // Deadhead penalty: 0km deadhead = 100pts, 150km deadhead = 0pts
        const deadheadScore = Math.max(0, 100 - (deadheadKm / 1.5));
        // Drop return alignment: does drop get closer to truck start?
        const returnScore = route.directReturnKm > 0 
          ? Math.min(100, Math.max(20, 100 - ((detourKm / Math.max(1, route.directReturnKm)) * 60)))
          : 70;
        routeCompScore = Math.round((deadheadScore * 0.6) + (returnScore * 0.4));
      }

      // Score Component 2: Time Compatibility (0 - 100)
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
      }

      // Score Component 3: Capacity Fit (0 - 100)
      // Optimal fit uses as close to 100% of available capacity without exceeding
      let capacityFitScore = 0;
      if (availableCapacity > 0) {
        if (cargoWeight <= availableCapacity) {
          const loadRatio = cargoWeight / availableCapacity;
          capacityFitScore = Math.round(loadRatio * 100);
        } else {
          capacityFitScore = 0;
        }
      }

      // Score Component 4: Detour Efficiency (0 - 100)
      // 0 detour = 100pts, maxDetourThreshold = 20pts
      let detourEfficiencyScore = 0;
      if (route.isValid) {
        detourEfficiencyScore = Math.round(Math.max(0, 100 - (detourKm / maxDetourThreshold) * 80));
      }

      // Score Component 5: Cost Efficiency (0 - 100)
      // Value generated vs detour fuel cost
      const shipmentValue = Number(shipment.value) || 10000;
      const detourFuelCost = (detourKm / mileage) * fuelPrice;
      const netGain = shipmentValue - detourFuelCost;
      let costEfficiencyScore = Math.min(100, Math.max(10, Math.round((netGain / Math.max(1, shipmentValue)) * 100)));

      // Score Component 6: Disruption Risk (0 - 100)
      // Higher score = LOWER risk
      let disruptionRiskScore = Math.max(5, 100 - (eta.delayRisk || 20));

      // Weighted total match score
      const totalWeight = weights.route + weights.time + weights.capacity + 
                          weights.detour + weights.cost + weights.disruption || 100;

      const rawScore = (
        (routeCompScore * weights.route) +
        (timeCompScore * weights.time) +
        (capacityFitScore * weights.capacity) +
        (detourEfficiencyScore * weights.detour) +
        (costEfficiencyScore * weights.cost) +
        (disruptionRiskScore * weights.disruption)
      ) / totalWeight;

      const matchScore = isFeasible 
        ? Math.round(rawScore) 
        : Math.min(45, Math.round(rawScore * 0.45)); // Infeasible capped and penalized

      // 5. Sustainability calculations
      let sustainability = null;
      if (sustEngine) {
        sustainability = sustEngine.calculateSustainability({
          distanceKm: loadedKm,
          detourKm,
          mileage,
          fuelPrice,
          emissionFactor,
          maxCapacity: truckMaxCap,
          cargoWeight,
          shipmentValue
        });
      }

      // 6. Dynamic "Why this shipment?" positives
      const whyReasons = [];
      if (isFeasible) {
        if (capacityFitScore >= 75) {
          whyReasons.push(`High capacity utilization: Consumes ${cargoWeight.toLocaleString()} kg of ${availableCapacity.toLocaleString()} kg available (${Math.round((cargoWeight/availableCapacity)*100)}% fit).`);
        } else {
          whyReasons.push(`Capacity compatible: Consumes ${cargoWeight.toLocaleString()} kg (${availableCapacity.toLocaleString()} kg available).`);
        }

        if (eta.status === 'ON TIME') {
          whyReasons.push(`Pickup window compatible: Predicted arrival ${eta.marginToCloseMins} mins before window closes.`);
        } else if (eta.status === 'AT RISK') {
          whyReasons.push(`Feasible schedule with tight margin (${eta.marginToCloseMins} mins before close).`);
        }

        if (detourKm <= 25) {
          whyReasons.push(`Minimal detour: Only ${detourKm} km added to original route.`);
        } else if (detourKm <= maxDetourThreshold) {
          whyReasons.push(`Acceptable detour: ${detourKm} km within operational threshold (${maxDetourThreshold} km).`);
        }

        if (routeCompScore >= 75) {
          whyReasons.push(`Strong route compatibility: Pickup is ${deadheadKm} km from delivery destination.`);
        }

        if (sustainability && sustainability.netEconomicGain > 0) {
          whyReasons.push(`Profitable backhaul: Estimated net revenue ₹${sustainability.netEconomicGain.toLocaleString()} after fuel costs.`);
        }
      }

      return {
        shipment,
        shipmentId: shipment.id,
        isFeasible,
        infeasibleReasons,
        whyReasons,
        whyNotReasons,
        matchScore,
        isRecommended: false, // Set below after sorting
        route,
        deadheadKm,
        loadedKm,
        detourKm,
        eta,
        sustainability,
        estimatedCost: sustainability ? sustainability.detourFuelCost : Math.round((detourKm / mileage) * fuelPrice),
        estimatedCo2: sustainability ? sustainability.co2AvoidedKg : 0,
        components: {
          route: { score: routeCompScore, weight: weights.route, contribution: Math.round((routeCompScore * weights.route / totalWeight) * 10) / 10 },
          time: { score: timeCompScore, weight: weights.time, contribution: Math.round((timeCompScore * weights.time / totalWeight) * 10) / 10 },
          capacity: { score: capacityFitScore, weight: weights.capacity, contribution: Math.round((capacityFitScore * weights.capacity / totalWeight) * 10) / 10 },
          detour: { score: detourEfficiencyScore, weight: weights.detour, contribution: Math.round((detourEfficiencyScore * weights.detour / totalWeight) * 10) / 10 },
          cost: { score: costEfficiencyScore, weight: weights.cost, contribution: Math.round((costEfficiencyScore * weights.cost / totalWeight) * 10) / 10 },
          disruption: { score: disruptionRiskScore, weight: weights.disruption, contribution: Math.round((disruptionRiskScore * weights.disruption / totalWeight) * 10) / 10 }
        }
      };
    });

    // Sort: Feasible shipments first by matchScore descending; then infeasible shipments
    evaluated.sort((a, b) => {
      if (a.isFeasible && !b.isFeasible) return -1;
      if (!a.isFeasible && b.isFeasible) return 1;
      return b.matchScore - a.matchScore;
    });

    // Highlight the highest-scoring FEASIBLE shipment as AI RECOMMENDED
    // IMPORTANT: Never recommend an infeasible shipment even if its score is high!
    const topFeasible = evaluated.find(item => item.isFeasible);
    if (topFeasible) {
      topFeasible.isRecommended = true;
    }

    return evaluated;
  }

  const MatchingEngine = {
    evaluateShipments,
    DEFAULT_WEIGHTS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MatchingEngine;
  }
  if (typeof window !== 'undefined') {
    window.ReRoute = window.ReRoute || {};
    window.ReRoute.MatchingEngine = MatchingEngine;
  }
})();
