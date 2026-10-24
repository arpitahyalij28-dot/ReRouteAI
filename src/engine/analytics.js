// Disruption-Aware Logistics Twin - Advanced Resilience Analytics & Stress Testing Engine
// Track 3-05: Monte Carlo Disruption Simulation, SPOF Bottleneck Ranker, and Backup Plan B Corridors
// Pure ES module (zero React, zero network calls, 100% client-side deterministic).

import { cloneNetwork, findPaths } from './network.js';
import { applyDisruptionScenario } from './disruptions.js';
import { solveRecoveryPlan } from './planner.js';
import { calculateResilienceScore } from './resilience.js';

/**
 * Seeded Pseudo-Random Number Generator (Mulberry32)
 * Ensures 100% deterministic results across all client browsers and tests.
 */
function createSeededRNG(seed = 42) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Runs Monte Carlo Stress Test across N randomized disruption scenarios.
 * Computes on-time compliance rates, demand fulfillment probability, and distribution.
 *
 * @param {Object} network Regional supply network
 * @param {number} runs Number of scenarios to simulate (default 50)
 * @param {number} seed Deterministic RNG seed (default 12345)
 */
export function runMonteCarloStressTest(network, runs = 50, seed = 12345) {
  if (!network || !Array.isArray(network.routes) || network.routes.length === 0) {
    return {
      totalRuns: 0,
      complianceRate80: 0,
      complianceRate100: 0,
      avgResilienceScore: 0,
      distribution: { critical: 0, degraded: 0, moderate: 0, high: 0, excellent: 0 },
      worstScenario: null,
      bestScenario: null,
      scenarios: [],
    };
  }

  const rng = createSeededRNG(seed);
  const normalPlan = solveRecoveryPlan(network);
  const routeIds = network.routes.map((r) => r.id);
  const warehouseIds = network.warehouses?.map((w) => w.id) || [];

  const results = [];
  let totalScore = 0;
  let countMeeting80 = 0;
  let countMeeting100 = 0;

  const distribution = {
    critical: 0, // < 30
    degraded: 0, // 30 - 49
    moderate: 0, // 50 - 69
    high: 0, // 70 - 84
    excellent: 0, // >= 85
  };

  for (let i = 0; i < runs; i++) {
    // Generate randomized disruption scenario
    // 1. Route closures: 0 to 2 random routes
    const closedCount = Math.floor(rng() * 2.5);
    const closedRoutes = [];
    for (let c = 0; c < closedCount; c++) {
      const idx = Math.floor(rng() * routeIds.length);
      const rId = routeIds[idx];
      if (!closedRoutes.includes(rId)) closedRoutes.push(rId);
    }

    // 2. Rainfall: 10 to 110 mm
    const rainfallMm = Math.round(10 + rng() * 100);

    // 3. Fuel price: 95 to 135 INR
    const fuelPrice = Math.round((95 + rng() * 40) * 10) / 10;

    // 4. Warehouse stock depletion: 0 to 30% reduction
    const stockReductionPct = Math.round(rng() * 30);
    const stockDepletions = {};
    if (warehouseIds.length > 0 && stockReductionPct > 10) {
      const targetWh = warehouseIds[Math.floor(rng() * warehouseIds.length)];
      stockDepletions[targetWh] = stockReductionPct;
    }

    const disruptionConfig = {
      closedRoutes,
      rainfallMm,
      fuelPrice,
      stockDepletions,
    };

    const report = applyDisruptionScenario(network, disruptionConfig);
    const plan = solveRecoveryPlan(report.disruptedNetwork);
    const resilience = calculateResilienceScore(plan, normalPlan, report.disruptedNetwork);

    const onTimePct = Number(plan?.totals?.onTimePct) || 0;
    const fulfillmentPct = Math.max(0, 100 - (Number(plan?.totals?.pendingPct) || 0));

    if (onTimePct >= 80) countMeeting80++;
    if (fulfillmentPct >= 99) countMeeting100++;

    totalScore += resilience.score;

    if (resilience.score >= 85) distribution.excellent++;
    else if (resilience.score >= 70) distribution.high++;
    else if (resilience.score >= 50) distribution.moderate++;
    else if (resilience.score >= 30) distribution.degraded++;
    else distribution.critical++;

    results.push({
      scenarioIndex: i + 1,
      disruptionConfig,
      resilienceScore: resilience.score,
      rating: resilience.rating,
      onTimePct,
      fulfillmentPct,
      cost: plan?.totals?.cost || 0,
    });
  }

  // Sort to find worst and best scenario
  const sorted = [...results].sort((a, b) => a.resilienceScore - b.resilienceScore);
  const worstScenario = sorted[0];
  const bestScenario = sorted[sorted.length - 1];

  return {
    totalRuns: runs,
    complianceRate80: Math.round((countMeeting80 / runs) * 100),
    complianceRate100: Math.round((countMeeting100 / runs) * 100),
    avgResilienceScore: Math.round((totalScore / runs) * 10) / 10,
    distribution,
    worstScenario,
    bestScenario,
    scenarios: results.slice(0, 15), // Top 15 representative runs for UI display
  };
}

/**
 * Single Point of Failure (SPOF) Analysis
 * Evaluates network vulnerability by simulating total severance of each corridor route and warehouse depot.
 * Ranks entities by Failure Impact Index.
 */
export function runSPOFAnalysis(network) {
  if (!network || !Array.isArray(network.routes)) {
    return { rankedRoutes: [], rankedWarehouses: [], overallNetworkVulnerability: 'Low' };
  }

  const baselinePlan = solveRecoveryPlan(network);
  const baselineCost = baselinePlan?.totals?.cost || 1;
  const baselineOnTime = baselinePlan?.totals?.onTimePct || 100;

  // 1. Analyze Route Failures
  const rankedRoutes = network.routes.map((route) => {
    const netCopy = cloneNetwork(network);
    const targetRoute = netCopy.routes.find((r) => r.id === route.id);
    if (targetRoute) {
      targetRoute.status = 'closed';
    }

    const plan = solveRecoveryPlan(netCopy);
    const costDeltaPct = Math.round((((plan?.totals?.cost || 0) - baselineCost) / baselineCost) * 100);
    const onTimeDropPct = Math.max(0, baselineOnTime - (plan?.totals?.onTimePct || 0));
    const unmetQty = plan?.totals?.totalPending || 0;

    // Impact Score (0 - 100)
    const impactScore = Math.min(
      100,
      Math.round(unmetQty * 0.15 + costDeltaPct * 0.4 + onTimeDropPct * 0.45)
    );

    let riskLevel = 'Low';
    if (impactScore >= 50) riskLevel = 'Critical Bottleneck';
    else if (impactScore >= 25) riskLevel = 'Moderate Risk';

    return {
      id: route.id,
      name: route.name,
      from: route.from,
      to: route.to,
      distanceKm: route.distanceKm,
      costDeltaPct,
      onTimeDropPct,
      unmetQty,
      impactScore,
      riskLevel,
    };
  });

  // Sort routes by highest impact
  rankedRoutes.sort((a, b) => b.impactScore - a.impactScore);

  // 2. Analyze Warehouse Depot Failures
  const rankedWarehouses = (network.warehouses || []).map((wh) => {
    const netCopy = cloneNetwork(network);
    const targetWh = netCopy.warehouses.find((w) => w.id === wh.id);
    if (targetWh) {
      targetWh.stock = 0; // Total outage
    }

    const plan = solveRecoveryPlan(netCopy);
    const costDeltaPct = Math.round((((plan?.totals?.cost || 0) - baselineCost) / baselineCost) * 100);
    const onTimeDropPct = Math.max(0, baselineOnTime - (plan?.totals?.onTimePct || 0));
    const unmetQty = plan?.totals?.totalPending || 0;

    const impactScore = Math.min(
      100,
      Math.round(unmetQty * 0.2 + costDeltaPct * 0.35 + onTimeDropPct * 0.45)
    );

    let riskLevel = 'Low';
    if (impactScore >= 50) riskLevel = 'Systemic Vulnerability';
    else if (impactScore >= 25) riskLevel = 'Substantial Node';

    return {
      id: wh.id,
      name: wh.name,
      stock: wh.stock,
      costDeltaPct,
      onTimeDropPct,
      unmetQty,
      impactScore,
      riskLevel,
    };
  });

  rankedWarehouses.sort((a, b) => b.impactScore - a.impactScore);

  const highestImpact = Math.max(
    rankedRoutes[0]?.impactScore || 0,
    rankedWarehouses[0]?.impactScore || 0
  );

  let overallNetworkVulnerability = 'Low';
  if (highestImpact >= 50) overallNetworkVulnerability = 'High (Critical Bottlenecks Present)';
  else if (highestImpact >= 25) overallNetworkVulnerability = 'Moderate';

  return {
    rankedRoutes,
    rankedWarehouses,
    overallNetworkVulnerability,
  };
}

/**
 * Plan B Backup Routes Finder
 * Discovers and formats primary and alternate contingency corridors for each buyer.
 */
export function findBackupRoutes(network) {
  if (!network || !Array.isArray(network.buyers) || !Array.isArray(network.warehouses)) {
    return [];
  }

  const routesMap = new Map((network.routes || []).map((r) => [r.id, r]));

  return network.buyers.map((buyer) => {
    const allCandidatePaths = [];

    network.warehouses.forEach((wh) => {
      const paths = findPaths(network, wh.id, buyer.id, 3);
      paths.forEach((p) => {
        allCandidatePaths.push({
          warehouseId: wh.id,
          warehouseName: wh.name,
          path: p.path,
          distanceKm: p.totalDistanceKm,
          travelTimeH: Math.round(p.totalTravelTimeH * 10) / 10,
          isClosed: p.isClosed,
          routeNames: p.path.map((rid) => routesMap.get(rid)?.name || rid),
        });
      });
    });

    // Sort by travel time
    allCandidatePaths.sort((a, b) => a.travelTimeH - b.travelTimeH);

    const primaryRoute = allCandidatePaths[0] || null;
    const backupRoute = allCandidatePaths[1] || null;
    const tertiaryRoute = allCandidatePaths[2] || null;

    const deltaKm = backupRoute && primaryRoute ? backupRoute.distanceKm - primaryRoute.distanceKm : 0;
    const deltaTimeH =
      backupRoute && primaryRoute
        ? Math.round((backupRoute.travelTimeH - primaryRoute.travelTimeH) * 10) / 10
        : 0;

    return {
      buyerId: buyer.id,
      buyerName: buyer.name,
      priority: buyer.priority,
      demandQty: buyer.demandQty,
      deadline: buyer.deadline,
      hasBackup: Boolean(backupRoute),
      primaryRoute,
      backupRoute,
      tertiaryRoute,
      deltaKm,
      deltaTimeH,
    };
  });
}
