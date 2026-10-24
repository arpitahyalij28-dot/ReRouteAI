// Logistics Twin - Control Tower Calculation Engine (Pure ES Module)
// Track 3-05: Executive Supply Chain Control Tower & Risk Intelligence
// 100% Deterministic, Zero React, Zero Network Calls, Zero External Dependencies.

import {
  ROUTE_STATUS,
  BUYER_PRIORITY,
  getNetworkSummary,
  findPaths,
  getEffectiveTravelTime,
} from './network.js';
import { solveRecoveryPlan, solveDisruptedBasicPlan } from './planner.js';
import { calculateResilienceScore } from './resilience.js';
import { findBackupRoutes } from './analytics.js';
import { calculateSustainability } from './sustainability.js';

/**
 * Computes the complete 5-section Control Tower dataset from live network state.
 *
 * @param {Object} params
 * @param {Object} params.network - Regional supply network twin
 * @param {Array} [params.trucks] - Fleet trucks
 * @param {Array} [params.shipments] - Return loads / freight pool
 * @param {Array} [params.assignments] - Active truck assignments
 * @returns {Object|null} Control tower metrics, or null if network is empty/invalid
 */
export function computeControlTowerMetrics(input) {
  if (!input || typeof input !== 'object') return null;

  // Support both computeControlTowerMetrics({ network, trucks, ... }) and computeControlTowerMetrics(network)
  const isWrapper = input.network && typeof input.network === 'object';
  const network = isWrapper ? input.network : input;
  const trucks = isWrapper ? (input.trucks || []) : [];
  const shipments = isWrapper ? (input.shipments || []) : [];
  const assignments = isWrapper ? (input.assignments || []) : [];

  // Validate network has minimum required entities
  if (
    !network ||
    !Array.isArray(network.warehouses) ||
    network.warehouses.length === 0 ||
    !Array.isArray(network.buyers) ||
    network.buyers.length === 0
  ) {
    return null;
  }

  const warehouses = network.warehouses || [];
  const buyers = network.buyers || [];
  const routes = network.routes || [];
  const vehicles = network.vehicles || [];

  // 1. Run Core Solvers
  const recoveryPlan = solveRecoveryPlan(network, { mode: 'resilient' });
  const naivePlan = solveDisruptedBasicPlan(network);
  const resilience = calculateResilienceScore(recoveryPlan, null, network);
  const summary = getNetworkSummary(network);
  const backupRoutes = findBackupRoutes(network);

  const resilienceScore = Math.max(0, Math.min(100, Math.round(resilience.score || 0)));

  // =========================================================================
  // SECTION 1: OVERALL HEALTH (Hero Verdict & Core KPIs)
  // =========================================================================
  const totals = recoveryPlan?.totals || {
    cost: 0,
    avgDeliveryTime: 0,
    onTimePct: 100,
    latePct: 0,
    pendingPct: 0,
    totalDelivered: 0,
    totalOnTime: 0,
    totalLate: 0,
    totalPending: 0,
    totalDemand: 0,
  };

  const perBuyer = recoveryPlan?.perBuyerResults || {};

  // Check conditions
  const highPriorityBuyers = buyers.filter((b) => b.priority === BUYER_PRIORITY.HIGH);
  const highPriorityShort = highPriorityBuyers.some(
    (b) => (perBuyer[b.id]?.pendingQty || 0) > 0
  );
  const highPriorityLate = highPriorityBuyers.some(
    (b) => (perBuyer[b.id]?.lateQty || 0) > 0
  );
  const highPriorityExposedCount = highPriorityBuyers.filter(
    (b) => (perBuyer[b.id]?.pendingQty || 0) > 0 || (perBuyer[b.id]?.lateQty || 0) > 0
  ).length;

  const totalBuyersAtRisk = buyers.filter(
    (b) => (perBuyer[b.id]?.pendingQty || 0) > 0 || (perBuyer[b.id]?.lateQty || 0) > 0
  ).length;

  const unmetPct = totals.totalDemand > 0
    ? Math.round((totals.totalPending / totals.totalDemand) * 100)
    : 0;

  const demandFulfilledPct = totals.totalDemand > 0
    ? Math.round((totals.totalDelivered / totals.totalDemand) * 100)
    : 100;

  // Verdict Determination Rules
  // CRITICAL if: any high-priority buyer is short, or unmet demand >= 25%, or resilience < 50
  // AT RISK if: any unmet demand, on-time < 90%, high-priority order exposed, or resilience < 75
  // Otherwise: HEALTHY
  let verdictStatus = 'HEALTHY';
  let verdictReason = 'All regional delivery corridors are optimal with 100% on-time fulfillment.';

  if (highPriorityShort || unmetPct >= 25 || resilienceScore < 50) {
    verdictStatus = 'CRITICAL';
    if (highPriorityShort) {
      verdictReason = 'Critical deficit: High-priority medical / perishables delivery short of essential demand.';
    } else if (unmetPct >= 25) {
      verdictReason = `Critical shortage: ${unmetPct}% of regional network demand cannot be fulfilled under current disruptions.`;
    } else {
      verdictReason = `Critical resilience failure: Network resilience score dropped to ${resilienceScore}/100.`;
    }
  } else if (totals.totalPending > 0 || totals.onTimePct < 90 || highPriorityLate || resilienceScore < 75) {
    verdictStatus = 'AT RISK';
    if (totals.totalPending > 0) {
      verdictReason = `Elevated risk: ${totals.totalPending} units pending delivery due to corridor bottlenecks.`;
    } else if (highPriorityLate) {
      verdictReason = 'Elevated risk: High-priority consignment delayed beyond strict arrival deadline.';
    } else if (totals.onTimePct < 90) {
      verdictReason = `Fulfillment latency: On-time delivery degraded to ${totals.onTimePct}%.`;
    } else {
      verdictReason = `Moderate risk: Network resilience score is ${resilienceScore}/100 with corridor stress.`;
    }
  }

  // Active shipments / allocations count
  const activeShipmentsCount = recoveryPlan?.allocations?.length || 0;
  const delayedShipmentsCount = recoveryPlan?.allocations?.filter((a) => !a.isOnTime).length || 0;

  const section1Health = {
    verdict: {
      status: verdictStatus, // 'HEALTHY' | 'AT RISK' | 'CRITICAL'
      reason: verdictReason,
      resilienceScore,
      rating: resilience.rating || 'Standard',
    },
    kpis: {
      activeShipments: activeShipmentsCount,
      onTimeDeliveryPct: totals.onTimePct,
      delayedShipments: delayedShipmentsCount,
      ordersAtRisk: {
        text: `${totalBuyersAtRisk} / ${buyers.length}`,
        highPriorityCount: highPriorityExposedCount,
        label: `${totalBuyersAtRisk} / ${buyers.length} (${highPriorityExposedCount} High-Priority)`,
      },
      demandFulfilledPct,
    },
    corridorStatus: {
      open: summary?.openRoutes || 0,
      slow: summary?.slowRoutes || 0,
      closed: summary?.closedRoutes || 0,
      total: summary?.routesCount || 0,
    },
  };

  // =========================================================================
  // SECTION 2: CRITICAL ALERTS & RISKS
  // =========================================================================
  const alerts = [];

  // 1. Closed corridors
  routes.forEach((r) => {
    if (r.status === ROUTE_STATUS.CLOSED) {
      alerts.push({
        id: `alert-closed-${r.id}`,
        severity: 'Critical',
        category: 'Corridor',
        title: `Closed Corridor: ${r.name}`,
        reason: `Route between ${r.from} and ${r.to} (${r.distanceKm} km) is impassable due to physical hazards.`,
        action: 'Reroute dispatches through secondary bypass corridors or activate alternate warehouse nodes.',
        link: '/disruptions',
      });
    }
  });

  // 2. Slow traffic corridors (base vs effective hours)
  routes.forEach((r) => {
    if (r.status === ROUTE_STATUS.SLOW) {
      const effTime = Math.round(getEffectiveTravelTime(r) * 10) / 10;
      const delayH = Math.round((effTime - r.baseTravelTimeH) * 10) / 10;
      alerts.push({
        id: `alert-slow-${r.id}`,
        severity: 'Warning',
        category: 'Traffic',
        title: `Severe Congestion: ${r.name}`,
        reason: `Travel time expanded from ${r.baseTravelTimeH}h to ${effTime}h (+${delayH}h delay factor).`,
        action: 'Divert scheduled freight via bypass expressway or adjust delivery ETA windows.',
        link: '/disruptions',
      });
    }
  });

  // 3. High-risk corridors (riskScore >= 0.4 and not closed)
  routes.forEach((r) => {
    if (r.status !== ROUTE_STATUS.CLOSED && (r.riskScore || 0) >= 0.4) {
      alerts.push({
        id: `alert-risk-${r.id}`,
        severity: (r.riskScore || 0) >= 0.6 ? 'Warning' : 'Watch',
        category: 'Corridor',
        title: `High Hazard Corridor: ${r.name}`,
        reason: `Corridor vulnerability score is ${(r.riskScore * 100).toFixed(0)}% (monsoon/ghat terrain risk).`,
        action: 'Enforce vehicle weight restrictions and instruct drivers on wet-weather safety protocol.',
        link: '/analytics',
      });
    }
  });

  // 4. Late deliveries (ETA vs deadline)
  buyers.forEach((b) => {
    const res = perBuyer[b.id];
    if (res && res.lateQty > 0) {
      const isHigh = b.priority === BUYER_PRIORITY.HIGH;
      alerts.push({
        id: `alert-late-${b.id}`,
        severity: isHigh ? 'Critical' : 'Warning',
        category: 'Delivery',
        title: `Delivery Latency: ${b.name}`,
        reason: `${res.lateQty} units arriving late (deadline ${b.deadline}h compromised by traffic/hops).`,
        action: 'Reassign to faster express commercial vehicle or pre-stage inventory closer.',
        link: '/assignments',
      });
    }
  });

  // 5. Buyer stock shortages (unmet demand - stock-limited vs trip-limited)
  buyers.forEach((b) => {
    const res = perBuyer[b.id];
    if (res && res.pendingQty > 0) {
      const isHigh = b.priority === BUYER_PRIORITY.HIGH;
      // Determine if stock-limited or trip-limited
      const reachableWarehouses = warehouses.filter((w) => {
        const paths = findPaths(network, w.id, b.id, 2);
        return paths.some((p) => !p.isClosed);
      });
      const reachableStock = reachableWarehouses.reduce((sum, w) => sum + (w.stock || 0), 0);
      const isStockLimited = reachableStock < b.demandQty;

      alerts.push({
        id: `alert-short-${b.id}`,
        severity: isHigh ? 'Critical' : 'Warning',
        category: 'Delivery',
        title: `Unmet Demand Deficit: ${b.name}`,
        reason: `${res.pendingQty} units short (${isStockLimited ? 'Stock-Limited: upstream depot exhausted' : 'Trip-Limited: vehicle capacity & corridor constraints'}).`,
        action: isStockLimited
          ? 'Initiate inter-depot stock transfer from surplus warehouses.'
          : 'Mobilize additional commercial vehicle trips along open alternate corridors.',
        link: '/assignments',
      });
    }
  });

  // 6. Low-stock & Overstocked depots
  warehouses.forEach((w) => {
    const storageLimit = Math.max(1, w.storageLimit || 1000);
    const stockRatio = (w.stock || 0) / storageLimit;

    if (w.stock <= 0) {
      alerts.push({
        id: `alert-depot-empty-${w.id}`,
        severity: 'Critical',
        category: 'Inventory',
        title: `Depot Depleted: ${w.name}`,
        reason: `Stock is 0 / ${storageLimit} units. Outbound deliveries cannot be fulfilled from this node.`,
        action: 'Replenish stock immediately from supplier or transfer surplus from secondary hubs.',
        link: '/assignments',
      });
    } else if (stockRatio < 0.25) {
      alerts.push({
        id: `alert-depot-low-${w.id}`,
        severity: 'Warning',
        category: 'Inventory',
        title: `Low Safety Buffer: ${w.name}`,
        reason: `Available stock is only ${w.stock} / ${storageLimit} units (${Math.round(stockRatio * 100)}% capacity).`,
        action: 'Trigger inter-depot stock transfer to maintain minimum 2-day contingency reserve.',
        link: '/assignments',
      });
    } else if (stockRatio > 0.85) {
      alerts.push({
        id: `alert-depot-high-${w.id}`,
        severity: 'Watch',
        category: 'Inventory',
        title: `Depot Capacity Congestion: ${w.name}`,
        reason: `Storage is at ${Math.round(stockRatio * 100)}% capacity (${w.stock} / ${storageLimit} units).`,
        action: 'Prioritize dispatching from this hub to relieve physical warehouse footprint.',
        link: '/assignments',
      });
    }
  });

  // Sort alerts by severity: Critical (0), Warning (1), Watch (2)
  const severityOrder = { Critical: 0, Warning: 1, Watch: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const section2Alerts = {
    alerts,
    totalCount: alerts.length,
    criticalCount: alerts.filter((a) => a.severity === 'Critical').length,
    warningCount: alerts.filter((a) => a.severity === 'Warning').length,
    watchCount: alerts.filter((a) => a.severity === 'Watch').length,
  };

  // =========================================================================
  // SECTION 3: INVENTORY & DEMAND
  // =========================================================================
  const totalStock = warehouses.reduce((sum, w) => sum + (w.stock || 0), 0);
  const totalStorageLimit = warehouses.reduce((sum, w) => sum + (w.storageLimit || 0), 0);
  const totalDemand = totals.totalDemand || 1;
  const coveragePct = Math.round((totalStock / totalDemand) * 100);

  let stockoutRisk = 'Low';
  if (coveragePct < 100 || warehouses.some((w) => w.stock <= 0)) {
    stockoutRisk = 'High';
  } else if (coveragePct < 130 || warehouses.some((w) => (w.stock / (w.storageLimit || 1)) < 0.25)) {
    stockoutRisk = 'Medium';
  }

  const lowStockDepotsCount = warehouses.filter(
    (w) => (w.stock / (w.storageLimit || 1)) < 0.25
  ).length;

  const overstockedDepotsCount = warehouses.filter(
    (w) => (w.stock / (w.storageLimit || 1)) > 0.85
  ).length;

  // Chart data: Per-depot stock now vs left after planned dispatch
  const remainingStockMap = recoveryPlan?.remainingStock || {};
  const depotStockChart = warehouses.map((w) => {
    const stockNow = w.stock || 0;
    const stockAfter = Math.max(0, remainingStockMap[w.id] ?? stockNow);
    const storageLimit = w.storageLimit || 1000;
    const ratioAfter = stockAfter / storageLimit;

    let stateTag = 'BALANCED';
    if (ratioAfter < 0.25) stateTag = 'LOW';
    else if (ratioAfter > 0.8) stateTag = 'OVERSTOCKED';

    return {
      depotId: w.id,
      depotName: w.name,
      stockNow,
      stockAfter,
      dispatched: stockNow - stockAfter,
      storageLimit,
      stateTag,
    };
  });

  // Chart data: Per-buyer stacked bar (on-time / late / short)
  const buyerFulfillmentChart = buyers.map((b) => {
    const res = perBuyer[b.id] || {
      onTimeQty: 0,
      lateQty: 0,
      pendingQty: b.demandQty,
    };
    return {
      buyerId: b.id,
      buyerName: b.name,
      priority: b.priority || 'medium',
      demandQty: b.demandQty,
      onTimeQty: res.onTimeQty || 0,
      lateQty: res.lateQty || 0,
      shortQty: res.pendingQty || 0,
    };
  });

  // Recommended stock transfers:
  // Move N units from surplus depot A to deficit depot B ONLY along open routes
  const recommendedTransfers = [];
  const surplusDepots = warehouses.filter((w) => {
    const after = remainingStockMap[w.id] ?? w.stock;
    return after > 200 && after / (w.storageLimit || 1) >= 0.4;
  });

  const deficitDepots = warehouses.filter((w) => {
    const after = remainingStockMap[w.id] ?? w.stock;
    return after / (w.storageLimit || 1) < 0.35;
  });

  for (const fromWh of surplusDepots) {
    for (const toWh of deficitDepots) {
      if (fromWh.id === toWh.id) continue;
      // Check if open route or open multi-hop path exists between fromWh and toWh
      const paths = findPaths(network, fromWh.id, toWh.id, 2);
      const openPath = paths.find((p) => !p.isClosed);

      if (openPath) {
        const fromAfter = remainingStockMap[fromWh.id] ?? fromWh.stock;
        const toAfter = remainingStockMap[toWh.id] ?? toWh.stock;
        const units = Math.min(150, Math.max(40, Math.round((fromAfter - toAfter) / 3)));
        const distKm = openPath.totalDistanceKm;
        const hours = Math.round(openPath.totalTravelTimeH * 10) / 10;
        const estCost = Math.round(distKm * 28); // 8T truck baseline @ Rs 28/km

        recommendedTransfers.push({
          fromDepotId: fromWh.id,
          fromDepotName: fromWh.name,
          toDepotId: toWh.id,
          toDepotName: toWh.name,
          units,
          distanceKm: distKm,
          travelTimeH: hours,
          estimatedCost: estCost,
          reason: `Relieve buffer deficit at ${toWh.name} using surplus from ${fromWh.name} via open corridor.`,
        });
        if (recommendedTransfers.length >= 3) break;
      }
    }
    if (recommendedTransfers.length >= 3) break;
  }

  const section3Inventory = {
    kpis: {
      stockVsDemand: `${totalStock.toLocaleString('en-IN')} / ${totalDemand.toLocaleString('en-IN')}`,
      coveragePct,
      stockoutRisk,
      lowStockDepotsCount,
      overstockedDepotsCount,
    },
    depotStockChart,
    buyerFulfillmentChart,
    recommendedTransfers,
  };

  // =========================================================================
  // SECTION 4: FLEET & EMPTY-MILE OPTIMISATION
  // =========================================================================
  // Determine vehicle status
  const allocatedVehicleIds = new Set(
    (recoveryPlan?.allocations || []).map((a) => a.vehicleId).filter(Boolean)
  );
  // Also consider active assignments if passed
  (assignments || []).forEach((a) => {
    if (a.truckId) allocatedVehicleIds.add(a.truckId);
  });

  const totalVehiclesCount = vehicles.length || trucks.length || 8;
  const busyVehiclesCount = Math.min(totalVehiclesCount, allocatedVehicleIds.size);
  const freeVehiclesCount = Math.max(0, totalVehiclesCount - busyVehiclesCount);

  // Capacity utilisation
  let totalCapUtilSum = 0;
  let allocCount = 0;
  (recoveryPlan?.allocations || []).forEach((a) => {
    const v = vehicles.find((veh) => veh.id === a.vehicleId);
    const cap = v?.capacity || 150;
    if (cap > 0) {
      totalCapUtilSum += Math.min(100, Math.round((a.quantity / (cap * (a.trips || 1))) * 100));
      allocCount++;
    }
  });
  const avgCapacityUtilisationPct = allocCount > 0 ? Math.round(totalCapUtilSum / allocCount) : 78;

  // Trucks with empty-return risk
  const trucksList = trucks.length > 0 ? trucks : (network.trucks || []);
  const highEmptyReturnTrucks = trucksList.filter((t) => (t.emptyReturnProbability || 0) >= 70).length;

  // Open return loads
  const openReturnLoads = (shipments || []).filter(
    (s) => s.status === 'Available' || !s.assignedTruckId
  ).length;

  // Chart: Vehicles by depot (busy vs free)
  const vehiclesByDepotChart = warehouses.map((w) => {
    const depotVehicles = vehicles.filter((v) => v.availableFrom === w.id);
    const total = depotVehicles.length;
    const busy = depotVehicles.filter((v) => allocatedVehicleIds.has(v.id)).length;
    const free = Math.max(0, total - busy);
    return {
      depotId: w.id,
      depotName: w.name,
      total,
      busy,
      free,
    };
  });

  // Table: Best Return Load for each in-transit truck
  // Requirements:
  // - In-transit trucks only
  // - Skip trucks that already have an active assignment
  // - One load per truck, one truck per load
  const assignedTruckIds = new Set(
    (assignments || []).map((a) => a.truckId).filter(Boolean)
  );

  const candidateTrucks = trucksList.filter(
    (t) => t.status === 'In-Transit' && !assignedTruckIds.has(t.id)
  );

  const availableLoads = (shipments || []).filter(
    (s) => s.status === 'Available' && !s.assignedTruckId
  );

  const matchedTruckLoads = [];
  const usedLoadIds = new Set();
  let totalAvoidableEmptyKm = 0;
  let totalDetourKm = 0;
  let totalFuelSaved = 0;
  let totalCo2Avoided = 0;
  let totalNetGain = 0;

  candidateTrucks.forEach((truck) => {
    // Find best compatible load
    let bestLoad = null;
    let bestGain = -Infinity;
    let bestSust = null;

    availableLoads.forEach((load) => {
      if (usedLoadIds.has(load.id)) return;

      const detour = Number(load.detourKm) || 10;
      const sust = calculateSustainability({
        distanceKm: truck.totalTripKm || 160,
        detourKm: detour,
        mileage: truck.vehicleMileageKmPerL || 4.2,
        fuelPrice: truck.fuelPricePerL || 94.5,
        maxCapacity: (truck.capacityTons || 10) * 1000,
        cargoWeight: (load.weightTons || 8) * 1000,
        shipmentValue: Number(load.value || load.freightOfferInr) || 24000,
      });

      if (sust.netEconomicGain > bestGain) {
        bestGain = sust.netEconomicGain;
        bestLoad = load;
        bestSust = sust;
      }
    });

    if (bestLoad && bestSust) {
      usedLoadIds.add(bestLoad.id);
      totalAvoidableEmptyKm += bestSust.emptyKmAvoided;
      totalDetourKm += bestSust.additionalDetourKm;
      totalFuelSaved += bestSust.fuelSavedLitres;
      totalCo2Avoided += bestSust.co2AvoidedKg;
      totalNetGain += bestSust.netEconomicGain;

      const fillPct = Math.min(
        100,
        Math.round(((bestLoad.weightTons || 8) / (truck.capacityTons || 10)) * 100)
      );

      matchedTruckLoads.push({
        truckId: truck.id,
        regNumber: truck.regNumber || truck.id,
        truckDestination: truck.destination || 'Hub Depot',
        suggestedLoadId: bestLoad.id,
        suggestedLoadName: bestLoad.name || bestLoad.cargoType || 'Industrial Freight',
        fillPct,
        detourKm: bestSust.additionalDetourKm,
        netGainInr: bestSust.netEconomicGain,
        fuelSavedL: bestSust.fuelSavedLitres,
        co2AvoidedKg: bestSust.co2AvoidedKg,
      });
    }
  });

  const section4Fleet = {
    kpis: {
      vehiclesFreeVsBusy: `${freeVehiclesCount} Free / ${busyVehiclesCount} Busy`,
      freeVehiclesCount,
      busyVehiclesCount,
      capacityUtilisationPct: avgCapacityUtilisationPct,
      emptyReturnRiskCount: highEmptyReturnTrucks,
      openReturnLoadsCount: openReturnLoads,
      avoidableEmptyKm: Math.round(totalAvoidableEmptyKm),
      extraDetourKm: Math.round(totalDetourKm),
    },
    vehiclesByDepotChart,
    matchedReturnLoads: matchedTruckLoads,
  };

  // =========================================================================
  // SECTION 5: COST, ETA & PERFORMANCE
  // =========================================================================
  const totalPlanCost = totals.cost || 0;
  const costPerShipment = activeShipmentsCount > 0 ? Math.round(totalPlanCost / activeShipmentsCount) : 0;
  const costPerUnit = totals.totalDelivered > 0 ? (totalPlanCost / totals.totalDelivered).toFixed(1) : '0.0';

  const avgEtaHours = totals.avgDeliveryTime || 0;

  // Detour fuel cost estimate
  const detourFuelPrice = 94.5;
  const detourFuelCost = Math.round((totalDetourKm / 4.2) * detourFuelPrice);

  // Buyer planned ETA vs deadline
  const etaVsDeadlineChart = buyers.map((b) => {
    // Find allocations for this buyer
    const buyerAllocations = (recoveryPlan?.allocations || []).filter((a) => a.buyerId === b.id);
    const hasTrip = buyerAllocations.length > 0;
    const maxTripEta = hasTrip
      ? Math.max(...buyerAllocations.map((a) => a.etaH || a.travelTimeH || 0))
      : null;

    let isLate = false;
    if (hasTrip && maxTripEta > b.deadline) {
      isLate = true;
    }

    return {
      buyerId: b.id,
      buyerName: b.name,
      priority: b.priority,
      plannedEtaH: maxTripEta !== null ? Math.round(maxTripEta * 10) / 10 : null,
      deadlineH: b.deadline,
      isLate,
      isScheduled: hasTrip,
    };
  });

  // Comparison: Optimised plan vs nearest-depot baseline
  const comparison = {
    optimised: {
      onTimePct: totals.onTimePct,
      unmetUnits: totals.totalPending,
      cost: totalPlanCost,
      deliveredUnits: totals.totalDelivered,
    },
    baseline: {
      onTimePct: naivePlan?.totals?.onTimePct ?? 0,
      unmetUnits: naivePlan?.totals?.totalPending ?? totals.totalDemand,
      cost: naivePlan?.totals?.cost ?? 0,
      deliveredUnits: naivePlan?.totals?.totalDelivered ?? 0,
      note: 'Baseline represents nearest-depot single-corridor dispatch with zero detour rerouting.',
    },
  };

  const section5CostPerformance = {
    kpis: {
      averageEtaH: avgEtaHours,
      costPerShipment,
      costPerUnit,
      extraDetourKm: Math.round(totalDetourKm),
      detourFuelCost,
      fuelSavedL: Math.round(totalFuelSaved),
      co2SavedKg: Math.round(totalCo2Avoided),
      netBenefitInr: totalNetGain,
      label: 'Model-based estimates',
    },
    etaVsDeadlineChart,
    comparison,
  };

  return {
    health: section1Health,
    alerts: section2Alerts,
    inventory: section3Inventory,
    fleet: section4Fleet,
    performance: section5CostPerformance,
    timestamp: new Date().toISOString(),
  };
}
