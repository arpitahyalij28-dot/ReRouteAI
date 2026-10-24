// Logistics Twin - Global Fleet Optimization Engine
// Solves 1-to-1 optimal assignment across N trucks and M candidate shipments
// using Hungarian (Kuhn-Munkres) combinatorial optimization with conflict resolution.

import {
  evaluateShipments,
  solveHungarian,
  calculateSustainability,
  calculateRouteEstimate,
} from '../engine/index.js';
import { DEFAULT_FACTOR_WEIGHTS } from './scoring.js';

/**
 * Optimizes backhaul assignments for an entire fleet of vehicles.
 *
 * Constraints respected:
 * 1. Mutual exclusivity: Each shipment is assigned to at most ONE truck.
 * 2. Capacity constraint: Cargo weight cannot exceed available vehicle capacity.
 * 3. Time feasibility: Predicted ETA must not exceed tender pickup window.
 * 4. Conflict explanation: If trucks compete for the same shipment, explains why
 *    the winner received it and tags the loser with explicit 'Why Not' reasons.
 *
 * @param {Array} trucks - All active fleet trucks
 * @param {Array} shipments - All available candidate loads
 * @param {Object} settings - Optimizer settings (weights, cost parameters)
 * @returns {Object} Global optimization plan with per-truck rankings, conflict logs, and fleet aggregates
 */
export function optimizeFleetGlobal(trucks = [], shipments = [], settings = {}) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const validTrucks = Array.isArray(trucks) ? trucks.filter(Boolean) : [];
  // Exclude cancelled shipments
  const activeShipments = Array.isArray(shipments)
    ? shipments.filter((s) => !s.isCancelled && s.status !== 'Assigned')
    : [];

  const weights = settings?.weights || DEFAULT_FACTOR_WEIGHTS;

  // Empty state handling
  if (validTrucks.length === 0 || activeShipments.length === 0) {
    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
      assignments: [],
      assignmentsByTruckId: {},
      assignmentsByShipmentId: {},
      conflictMap: {},
      truckRankings: {},
      unassignedTrucks: validTrucks.map((t) => t.id),
      unassignedShipments: activeShipments.map((s) => s.id),
      fleetSustainability: {
        totalEmptyKmAvoided: 0,
        totalFuelSavedLitres: 0,
        totalCostSavedInr: 0,
        totalCo2ReducedKg: 0,
        perTruckBreakdown: [],
      },
      consolidatedLoads: [],
      latencyMs: Number((endTime - startTime).toFixed(2)),
    };
  }

  const nTrucks = validTrucks.length;
  const nShipments = activeShipments.length;
  const dim = Math.max(nTrucks, nShipments);

  // 1. Evaluate every (truck, shipment) pairing
  // evaluationsMatrix[i][j] holds the detailed multi-criteria evaluation
  const evaluationsMatrix = [];
  const scoreMatrix = [];
  const truckRawRankings = {};

  for (let i = 0; i < nTrucks; i++) {
    const truck = validTrucks[i];
    const evaluatedList = evaluateShipments(truck, activeShipments, { weights });
    truckRawRankings[truck.id] = evaluatedList;

    const evalMap = new Map();
    evaluatedList.forEach((e) => evalMap.set(e.shipmentId, e));

    evaluationsMatrix[i] = [];
    scoreMatrix[i] = [];

    for (let j = 0; j < nShipments; j++) {
      const shipment = activeShipments[j];
      const evaluation = evalMap.get(shipment.id);
      evaluationsMatrix[i][j] = evaluation;

      // Only feasible pairings receive a positive matching score
      if (evaluation && evaluation.isFeasible && evaluation.matchScore > 0) {
        scoreMatrix[i][j] = evaluation.matchScore;
      } else {
        scoreMatrix[i][j] = 0;
      }
    }
  }

  // 2. Build square cost matrix for Hungarian Algorithm
  // Transform score maximization into cost minimization:
  // cost = penalty - score
  let maxScore = 100;
  for (let i = 0; i < nTrucks; i++) {
    for (let j = 0; j < nShipments; j++) {
      if (scoreMatrix[i][j] > maxScore) maxScore = scoreMatrix[i][j];
    }
  }

  const penalty = maxScore + 50;
  const costMatrix = Array.from({ length: dim }, () => new Array(dim).fill(penalty));

  for (let i = 0; i < nTrucks; i++) {
    for (let j = 0; j < nShipments; j++) {
      if (scoreMatrix[i][j] > 0) {
        costMatrix[i][j] = penalty - scoreMatrix[i][j];
      }
    }
  }

  // 3. Solve Kuhn-Munkres Min-Cost Bipartite Assignment
  const assignmentResult = solveHungarian(costMatrix);

  // 4. Collect Primary Assignments
  const assignments = [];
  const assignmentsByTruckId = {};
  const assignmentsByShipmentId = {};
  const assignedTruckIds = new Set();
  const assignedShipmentIds = new Set();

  for (let i = 0; i < nTrucks; i++) {
    const j = assignmentResult[i];
    if (j != null && j >= 0 && j < nShipments) {
      const score = scoreMatrix[i][j];
      const evaluation = evaluationsMatrix[i][j];

      if (score > 0 && evaluation && evaluation.isFeasible) {
        const truck = validTrucks[i];
        const shipment = activeShipments[j];

        const sustainability = evaluation.sustainability || calculateSustainability({
          distanceKm: evaluation.loadedKm || truck.totalTripKm || 150,
          detourKm: evaluation.detourKm || 8,
          mileage: truck.vehicleMileageKmPerL || 4.0,
          fuelPrice: truck.fuelPricePerL || 95.0,
          maxCapacity: truck.maxCapacity || (truck.capacityTons ? truck.capacityTons * 1000 : 10000),
          cargoWeight: shipment.cargoWeight || (shipment.weightTons ? shipment.weightTons * 1000 : 8000),
          shipmentValue: shipment.freightOfferInr || shipment.value || 25000,
        });

        const assignment = {
          id: `ASG-${truck.id}-${shipment.id}`,
          truckId: truck.id,
          truckRegNumber: truck.regNumber || truck.id,
          truckOrigin: truck.origin,
          truckDestination: truck.destination,
          shipmentId: shipment.id,
          shipmentName: shipment.name,
          matchScore: score,
          detourKm: evaluation.detourKm || 0,
          loadedKm: evaluation.loadedKm || truck.totalTripKm || 150,
          etaArrival: evaluation.eta?.arrivalFormatted || truck.expectedDeliveryTime || '14:30',
          sustainability,
          grossRevenueInr: shipment.freightOfferInr || shipment.value || 0,
          costGainInr: sustainability.netEconomicGain || sustainability.costSavedInr || 0,
          assignedAt: new Date().toISOString(),
        };

        assignments.push(assignment);
        assignmentsByTruckId[truck.id] = assignment;
        assignmentsByShipmentId[shipment.id] = assignment;
        assignedTruckIds.add(truck.id);
        assignedShipmentIds.add(shipment.id);
      }
    }
  }

  // 5. Detect and Document Inter-Truck Competition & Conflicts
  // If a truck's top feasible choice was assigned to someone else, document why the winner won
  const conflictMap = {};

  for (let i = 0; i < nTrucks; i++) {
    const truck = validTrucks[i];
    const rawList = truckRawRankings[truck.id] || [];
    const topFeasible = rawList.find((e) => e.isFeasible);

    if (topFeasible) {
      const topShipmentId = topFeasible.shipmentId;
      const winnerAssignment = assignmentsByShipmentId[topShipmentId];

      if (winnerAssignment && winnerAssignment.truckId !== truck.id) {
        // Truck i wanted topShipmentId, but it went to winnerAssignment.truckId
        const winnerTruck = validTrucks.find((t) => t.id === winnerAssignment.truckId);
        const winnerEval = evaluationsMatrix[validTrucks.indexOf(winnerTruck)][
          activeShipments.findIndex((s) => s.id === topShipmentId)
        ];

        const scoreDiff = (winnerAssignment.matchScore - topFeasible.matchScore).toFixed(1);
        const reason =
          Number(scoreDiff) > 0
            ? `Allocated to ${winnerAssignment.truckId} due to higher score (${winnerAssignment.matchScore}% vs ${topFeasible.matchScore}%, +${scoreDiff}% delta) and tighter return vector alignment.`
            : `Allocated to ${winnerAssignment.truckId} via global combinatorial optimization to maximize overall fleet deadhead reduction.`;

        conflictMap[truck.id] = {
          competingShipmentId: topShipmentId,
          shipmentName: winnerAssignment.shipmentName,
          winnerTruckId: winnerAssignment.truckId,
          winnerTruckReg: winnerTruck?.regNumber || winnerAssignment.truckId,
          winnerScore: winnerAssignment.matchScore,
          myScore: topFeasible.matchScore,
          reason,
        };
      }
    }
  }

  // 6. Build Final Per-Truck Rankings (marking globally assigned shipment as Recommended)
  const truckRankings = {};

  for (let i = 0; i < nTrucks; i++) {
    const truck = validTrucks[i];
    const rawList = truckRawRankings[truck.id] || [];
    const assigned = assignmentsByTruckId[truck.id];

    // Map each candidate shipment
    const finalRanked = rawList.map((item) => {
      const isAssignedToThisTruck = assigned && assigned.shipmentId === item.shipmentId;
      const isAssignedToOtherTruck =
        !isAssignedToThisTruck && assignmentsByShipmentId[item.shipmentId] != null;

      // Enrich Why/Why Not reasons if this shipment went to a competitor
      let enhancedWhyWhyNot = item.whyWhyNot;
      if (isAssignedToOtherTruck) {
        const otherWinner = assignmentsByShipmentId[item.shipmentId];
        enhancedWhyWhyNot = {
          ...item.whyWhyNot,
          reasons: [
            {
              type: 'cross',
              title: `Assigned to Competitor ${otherWinner.truckId}`,
              description: `Globally allocated to ${otherWinner.truckId} (Score: ${otherWinner.matchScore}%) for optimal fleet efficiency.`,
            },
            ...(item.whyWhyNot?.reasons || []),
          ],
        };
      }

      return {
        ...item,
        isRecommended: Boolean(isAssignedToThisTruck),
        isBackup: !isAssignedToThisTruck && item.isFeasible,
        isAssignedToOtherTruck,
        assignedToTruckId: isAssignedToOtherTruck
          ? assignmentsByShipmentId[item.shipmentId].truckId
          : null,
        whyWhyNot: enhancedWhyWhyNot,
      };
    });

    truckRankings[truck.id] = {
      ranked: finalRanked,
      recommendedId: assigned?.shipmentId || null,
      primaryAssignment: assigned || null,
      conflict: conflictMap[truck.id] || null,
    };
  }

  // 7. Multi-Load Consolidation (Optional Secondary Load)
  // If an assigned truck has >40% remaining payload capacity, check if any unassigned load fits
  const consolidatedLoads = [];
  const assignedShipmentIdsSet = new Set(assignedShipmentIds);

  for (const asg of assignments) {
    const truck = validTrucks.find((t) => t.id === asg.truckId);
    const primaryShipment = activeShipments.find((s) => s.id === asg.shipmentId);
    if (!truck || !primaryShipment) continue;

    const truckCapacity = Number(truck.maxCapacity) || (Number(truck.capacityTons) ? Number(truck.capacityTons) * 1000 : 10000);
    const primaryWeight = Number(primaryShipment.cargoWeight) || (Number(primaryShipment.weightTons) ? Number(primaryShipment.weightTons) * 1000 : 0);
    const remainingCapacity = truckCapacity - primaryWeight;

    // Check if remaining capacity can carry another unassigned shipment
    if (remainingCapacity >= 2000) {
      const secondaryCandidates = activeShipments.filter((s) => {
        if (assignedShipmentIdsSet.has(s.id)) return false;
        const sWeight = Number(s.cargoWeight) || (Number(s.weightTons) ? Number(s.weightTons) * 1000 : 0);
        return sWeight <= remainingCapacity;
      });

      if (secondaryCandidates.length > 0) {
        // Evaluate candidates for consolidation
        const secondaryEval = evaluateShipments(truck, secondaryCandidates, { weights });
        const bestSecondary = secondaryEval.find((e) => e.isFeasible && e.matchScore >= 50);

        if (bestSecondary) {
          consolidatedLoads.push({
            truckId: truck.id,
            primaryShipmentId: asg.shipmentId,
            secondaryShipmentId: bestSecondary.shipmentId,
            remainingCapacityKg: remainingCapacity,
            secondaryWeightKg: bestSecondary.shipment.cargoWeight,
            combinedPayloadUtilizationPct: Math.round(
              ((primaryWeight + (bestSecondary.shipment.cargoWeight || 0)) / truckCapacity) * 100
            ),
          });
        }
      }
    }
  }

  // 8. Fleet-Level Sustainability Aggregation
  // Enforces: Fleet Total strictly equals the exact sum of the per-truck breakdown
  const perTruckBreakdown = [];
  let totalEmptyKmAvoided = 0;
  let totalFuelSavedLitres = 0;
  let totalCostSavedInr = 0;
  let totalCo2ReducedKg = 0;

  for (const truck of validTrucks) {
    const asg = assignmentsByTruckId[truck.id];
    if (asg && asg.sustainability) {
      const s = asg.sustainability;
      const emptyKmAvoided = Number(s.emptyKmAvoided) || 0;
      const fuelSavedLitres = Number(s.fuelSavedLitres) || 0;
      const costSavedInr = Number(s.costSavedInr) || 0;
      const co2ReducedKg = Number(s.co2ReducedKg) || 0;

      totalEmptyKmAvoided += emptyKmAvoided;
      totalFuelSavedLitres += fuelSavedLitres;
      totalCostSavedInr += costSavedInr;
      totalCo2ReducedKg += co2ReducedKg;

      perTruckBreakdown.push({
        truckId: truck.id,
        truckReg: truck.regNumber || truck.id,
        driverName: truck.driverName || 'Driver',
        route: `${truck.origin?.split(' ')[0]} → ${truck.destination?.split(' ')[0]}`,
        assignedShipmentId: asg.shipmentId,
        shipmentName: asg.shipmentName,
        emptyKmAvoided: Math.round(emptyKmAvoided * 10) / 10,
        fuelSavedLitres: Math.round(fuelSavedLitres * 10) / 10,
        costSavedInr: Math.round(costSavedInr),
        co2ReducedKg: Math.round(co2ReducedKg * 10) / 10,
      });
    } else {
      perTruckBreakdown.push({
        truckId: truck.id,
        truckReg: truck.regNumber || truck.id,
        driverName: truck.driverName || 'Driver',
        route: `${truck.origin?.split(' ')[0]} → ${truck.destination?.split(' ')[0]}`,
        assignedShipmentId: null,
        shipmentName: 'Unassigned',
        emptyKmAvoided: 0,
        fuelSavedLitres: 0,
        costSavedInr: 0,
        co2ReducedKg: 0,
      });
    }
  }

  const unassignedTrucks = validTrucks.filter((t) => !assignedTruckIds.has(t.id)).map((t) => t.id);
  const unassignedShipments = activeShipments.filter((s) => !assignedShipmentIds.has(s.id)).map((s) => s.id);

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const latencyMs = Number((endTime - startTime).toFixed(2));

  return {
    assignments,
    assignmentsByTruckId,
    assignmentsByShipmentId,
    conflictMap,
    truckRankings,
    unassignedTrucks,
    unassignedShipments,
    consolidatedLoads,
    fleetSustainability: {
      totalEmptyKmAvoided: Math.round(totalEmptyKmAvoided * 10) / 10,
      totalFuelSavedLitres: Math.round(totalFuelSavedLitres * 10) / 10,
      totalCostSavedInr: Math.round(totalCostSavedInr),
      totalCo2ReducedKg: Math.round(totalCo2ReducedKg * 10) / 10,
      perTruckBreakdown,
    },
    latencyMs,
  };
}
