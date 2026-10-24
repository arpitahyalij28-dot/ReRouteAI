// Disruption-Aware Logistics Twin - Resilience Score Engine (Pure ES Module)
// Computes multi-dimensional resilience score (0-100) quantifying network adaptability.

import { findPaths } from './network.js';

export const RESILIENCE_FORMULA_EXPLANATION =
  'Resilience Score (0-100) = 40% On-Time Fulfillment + 25% Demand Fulfilled + 15% Cost Stability vs Normal + 10% Corridor Redundancy/Backups + 10% Stock Buffer Retention';

/**
 * Calculates the comprehensive resilience score for a dispatch plan.
 * Returns score, rating, and transparent component breakdown.
 */
export function calculateResilienceScore(plan, normalPlan = null, network = null) {
  if (!plan || !plan.totals) {
    return {
      score: 0,
      rating: 'Infeasible',
      breakdown: null,
      formula: RESILIENCE_FORMULA_EXPLANATION,
    };
  }

  const totals = plan.totals;

  // 1. On-Time Delivery Component (0 - 40 points)
  const onTimePct = Math.max(0, Math.min(100, Number(totals.onTimePct) || 0));
  const onTimePts = (onTimePct / 100) * 40;

  // 2. Fulfillment / Unmet Demand Component (0 - 25 points)
  const pendingPct = Math.max(0, Math.min(100, Number(totals.pendingPct) || 0));
  const fulfillmentPct = Math.max(0, 100 - pendingPct);
  const fulfillmentPts = (fulfillmentPct / 100) * 25;

  // 3. Cost Stability vs Baseline Normal Plan (0 - 15 points)
  let costStabilityPts = 15;
  let costDeltaPct = 0;

  if (normalPlan?.totals?.cost && normalPlan.totals.cost > 0) {
    const normalCost = normalPlan.totals.cost;
    const planCost = totals.cost || 0;
    const ratio = planCost / normalCost;
    costDeltaPct = Math.round((ratio - 1.0) * 100);

    if (ratio <= 1.05) {
      costStabilityPts = 15;
    } else if (ratio <= 1.4) {
      costStabilityPts = Math.max(0, 15 - ((ratio - 1.05) / 0.35) * 10);
    } else {
      costStabilityPts = Math.max(0, 5 - ((ratio - 1.4) / 0.6) * 5);
    }
  }

  // 4. Route Diversity / Backup Corridor Redundancy (0 - 10 points)
  let routeDiversityPts = 8;
  if (network && Array.isArray(network.buyers) && Array.isArray(network.warehouses)) {
    let buyersWithBackups = 0;
    network.buyers.forEach((b) => {
      const paths = network.warehouses.flatMap((w) => findPaths(network, w.id, b.id, 3));
      const openPaths = paths.filter((p) => !p.isClosed);
      if (openPaths.length >= 2) buyersWithBackups++;
    });
    const redundancyRatio = network.buyers.length > 0 ? buyersWithBackups / network.buyers.length : 1;
    routeDiversityPts = Math.round(redundancyRatio * 10 * 10) / 10;
  }

  // 5. Stock Buffer Retention (0 - 10 points)
  let stockBufferPts = 7;
  if (plan.remainingStock && network?.warehouses) {
    const totalRemaining = Object.values(plan.remainingStock).reduce((sum, s) => sum + s, 0);
    const totalStorage = network.warehouses.reduce((sum, w) => sum + (w.storageLimit || 1000), 0);
    const bufferRatio = totalStorage > 0 ? totalRemaining / totalStorage : 0.5;
    stockBufferPts = Math.min(10, Math.max(0, Math.round(bufferRatio * 20 * 10) / 10));
  }

  const rawScore = onTimePts + fulfillmentPts + costStabilityPts + routeDiversityPts + stockBufferPts;
  const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  let rating = 'Robust';
  if (finalScore >= 85) rating = 'Excellent Resilience';
  else if (finalScore >= 70) rating = 'High Resilience';
  else if (finalScore >= 50) rating = 'Moderate Resilience';
  else if (finalScore >= 30) rating = 'Degraded Resilience';
  else rating = 'Critical Vulnerability';

  return {
    score: finalScore,
    rating,
    formula: RESILIENCE_FORMULA_EXPLANATION,
    breakdown: {
      onTime: {
        score: Math.round(onTimePts * 10) / 10,
        max: 40,
        weight: '40%',
        pct: onTimePct,
      },
      fulfillment: {
        score: Math.round(fulfillmentPts * 10) / 10,
        max: 25,
        weight: '25%',
        pct: fulfillmentPct,
      },
      costStability: {
        score: Math.round(costStabilityPts * 10) / 10,
        max: 15,
        weight: '15%',
        costDeltaPct,
      },
      routeDiversity: {
        score: Math.round(routeDiversityPts * 10) / 10,
        max: 10,
        weight: '10%',
      },
      stockBuffer: {
        score: Math.round(stockBufferPts * 10) / 10,
        max: 10,
        weight: '10%',
      },
    },
  };
}
