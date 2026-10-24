// Logistics Twin - Hungarian Algorithm / Min-Cost Bipartite Assignment Solver
// Solves 1-to-1 optimal conflict-free assignment between N trucks and M candidate shipments.
// Computes exact combinatorial optimum with measured performance.now() latency.

import { evaluateShipments } from './matching.js';
import { calculateSustainability } from './sustainability.js';

/**
 * Classical Hungarian (Kuhn-Munkres) algorithm implementation
 * Finds minimum cost assignment in an N x N cost matrix.
 *
 * @param {Array<Array<number>>} costMatrix - Square N x N cost matrix
 * @returns {Array<number>} Array where index is row (worker) and value is assigned column (job)
 */
export function solveHungarian(costMatrix) {
  const n = costMatrix.length;
  if (n === 0) return [];
  const m = costMatrix[0].length;
  if (n !== m) {
    throw new Error('Hungarian algorithm requires a square cost matrix');
  }

  const u = new Array(n + 1).fill(0);
  const v = new Array(n + 1).fill(0);
  const p = new Array(n + 1).fill(0);
  const way = new Array(n + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(n + 1).fill(Infinity);
    const used = new Array(n + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;

      for (let j = 1; j <= n; j++) {
        if (!used[j]) {
          const cur = costMatrix[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }

      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const result = new Array(n).fill(-1);
  for (let j = 1; j <= n; j++) {
    if (p[j] > 0) {
      result[p[j] - 1] = j - 1;
    }
  }
  return result;
}

/**
 * Optimizes fleet-wide assignment across multiple trucks and candidate shipments
 * Ensures no truck or shipment is assigned more than once (conflict-free).
 *
 * @param {Array} trucks - Array of available fleet vehicles
 * @param {Array} shipments - Array of candidate backhaul loads
 * @param {Object} settings - Operational settings (weights, speed, fuel price, etc.)
 * @returns {Object} Fleet assignment results with pairings, unassigned entities, totals, and measured latency
 */
export function optimizeFleet(trucks = [], shipments = [], settings = {}) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const validTrucks = Array.isArray(trucks) ? trucks.filter(Boolean) : [];
  const validShipments = Array.isArray(shipments) ? shipments.filter((s) => !s.isCancelled && s.status !== 'Assigned') : [];

  if (validTrucks.length === 0 || validShipments.length === 0) {
    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
      solver: 'Hungarian Optimal Assignment (Kuhn-Munkres)',
      assignments: [],
      unassignedTrucks: validTrucks.map((t) => t.id),
      unassignedShipments: validShipments.map((s) => s.id),
      totalMatches: 0,
      totalYieldInr: 0,
      totalEmptyKmAvoided: 0,
      totalCo2ReducedKg: 0,
      latencyMs: Number((endTime - startTime).toFixed(2)),
    };
  }

  const nTrucks = validTrucks.length;
  const nShipments = validShipments.length;
  const dim = Math.max(nTrucks, nShipments);

  // Evaluate all truck-shipment pairs
  const evaluationsMatrix = [];
  const scoreMatrix = [];

  for (let i = 0; i < nTrucks; i++) {
    const t = validTrucks[i];
    const evaluatedList = evaluateShipments(t, validShipments, settings);
    const evalMap = new Map();
    evaluatedList.forEach((e) => evalMap.set(e.shipmentId, e));

    evaluationsMatrix[i] = [];
    scoreMatrix[i] = [];

    for (let j = 0; j < nShipments; j++) {
      const s = validShipments[j];
      const evaluation = evalMap.get(s.id);
      evaluationsMatrix[i][j] = evaluation;
      // Infeasible pairings receive score = 0, feasible receive matchScore
      scoreMatrix[i][j] = evaluation && evaluation.isFeasible ? Math.max(1, evaluation.matchScore) : 0;
    }
  }

  // Find max score for minimization transformation
  let maxScore = 100;
  for (let i = 0; i < nTrucks; i++) {
    for (let j = 0; j < nShipments; j++) {
      if (scoreMatrix[i][j] > maxScore) maxScore = scoreMatrix[i][j];
    }
  }

  // Create square cost matrix: cost = (maxScore + 10) - score
  // Dummy slots have cost = (maxScore + 10)
  const penalty = maxScore + 10;
  const costMatrix = Array.from({ length: dim }, () => new Array(dim).fill(penalty));

  for (let i = 0; i < nTrucks; i++) {
    for (let j = 0; j < nShipments; j++) {
      if (scoreMatrix[i][j] > 0) {
        costMatrix[i][j] = penalty - scoreMatrix[i][j];
      }
    }
  }

  // Run Hungarian solver
  const assignmentResult = solveHungarian(costMatrix);

  // Extract valid pairings
  const assignments = [];
  const assignedTruckIds = new Set();
  const assignedShipmentIds = new Set();
  let totalYieldInr = 0;
  let totalEmptyKmAvoided = 0;
  let totalCo2ReducedKg = 0;

  for (let i = 0; i < nTrucks; i++) {
    const j = assignmentResult[i];
    if (j != null && j >= 0 && j < nShipments) {
      const score = scoreMatrix[i][j];
      const evaluation = evaluationsMatrix[i][j];

      // Only assign if feasible and score > 0
      if (score > 0 && evaluation && evaluation.isFeasible) {
        const truck = validTrucks[i];
        const shipment = validShipments[j];

        const sustainability = evaluation.sustainability || calculateSustainability({
          distanceKm: evaluation.loadedKm || 150,
          detourKm: evaluation.detourKm || 10,
          mileage: truck.vehicleMileageKmPerL || 4.0,
          fuelPrice: truck.fuelPricePerL || 95.0,
          maxCapacity: truck.maxCapacity || 10000,
          cargoWeight: shipment.cargoWeight || 8000,
          shipmentValue: shipment.freightOfferInr || 25000,
        });

        assignments.push({
          id: `ASG-${truck.id}-${shipment.id}`,
          truckId: truck.id,
          truckRegNumber: truck.regNumber,
          shipmentId: shipment.id,
          shipmentName: shipment.name,
          matchScore: score,
          detourKm: evaluation.detourKm,
          loadedKm: evaluation.loadedKm,
          etaArrival: evaluation.eta?.arrivalFormatted || truck.expectedDeliveryTime,
          sustainability,
          grossRevenueInr: shipment.freightOfferInr || shipment.value || 0,
          costGainInr: sustainability.netEconomicGain || sustainability.costSavedInr || 0,
          assignedAt: new Date().toISOString(),
        });

        assignedTruckIds.add(truck.id);
        assignedShipmentIds.add(shipment.id);

        totalYieldInr += (shipment.freightOfferInr || shipment.value || 0);
        totalEmptyKmAvoided += (sustainability.emptyKmAvoided || 0);
        totalCo2ReducedKg += (sustainability.co2ReducedKg || 0);
      }
    }
  }

  const unassignedTrucks = validTrucks.filter((t) => !assignedTruckIds.has(t.id)).map((t) => t.id);
  const unassignedShipments = validShipments.filter((s) => !assignedShipmentIds.has(s.id)).map((s) => s.id);

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const latencyMs = Number((endTime - startTime).toFixed(2));

  return {
    solver: 'Hungarian Optimal Assignment (Kuhn-Munkres)',
    assignments,
    unassignedTrucks,
    unassignedShipments,
    totalMatches: assignments.length,
    totalYieldInr,
    totalEmptyKmAvoided: Math.round(totalEmptyKmAvoided * 10) / 10,
    totalCo2ReducedKg: Math.round(totalCo2ReducedKg * 10) / 10,
    latencyMs,
  };
}
