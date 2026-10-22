// ReRoute AI 2.0 - Recovery Engine (ES Module)
// Autonomous recovery simulation when a backhaul shipment is cancelled or disrupted

import { evaluateShipments } from './matching.js';
import { calculateEmptyReturnRisk } from './risk.js';

export const RECOVERY_STAGES = [
  { id: 1, title: "PLAN INTERRUPTED", desc: "Shipment flagged as cancelled/failed." },
  { id: 2, title: "RE-EVALUATING", desc: "Removing invalid assignment and clearing route reservation." },
  { id: 3, title: "CHECKING AVAILABLE SHIPMENTS", desc: "Filtering remaining active shipments in logistics corridor." },
  { id: 4, title: "RECALCULATING", desc: "Recomputing route compatibility, ETA, capacity, and sustainability." },
  { id: 5, title: "NEW MATCH FOUND", desc: "Optimal backup backhaul identified from remaining fleet demand." }
];

/**
 * Executes recovery sequence when an assigned shipment fails or is cancelled
 */
export async function executeRecovery(
  truck,
  cancelledShipmentId,
  allShipments = [],
  settings = {},
  onStageChange = null
) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const stages = RECOVERY_STAGES.map((s, idx) => ({
    ...s,
    desc: idx === 0 ? `Shipment ${cancelledShipmentId} flagged as cancelled/failed.` : s.desc
  }));

  // Filter out the cancelled shipment and only take Available shipments
  const remainingAvailable = allShipments.filter(
    (s) => s.id !== cancelledShipmentId && (s.status || 'Available') === 'Available' && !s.isCancelled
  );

  // If UI callback provided, run step animations
  if (typeof onStageChange === 'function') {
    for (let i = 0; i < stages.length; i++) {
      onStageChange(i, stages[i]);
      await new Promise((r) => setTimeout(r, 80));
    }
  }

  // Recalculate matches
  const newEvaluations = evaluateShipments(truck, remainingAvailable, settings);

  // Recalculate truck risk
  const newRisk = calculateEmptyReturnRisk(truck, remainingAvailable, settings);

  // Pick top feasible recommendation
  const newRecommendation = newEvaluations.find((item) => item.isFeasible) || null;

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const solverLatencyMs = Number((endTime - startTime).toFixed(2));

  return {
    success: true,
    cancelledShipmentId,
    stages,
    remainingCount: remainingAvailable.length,
    newEvaluations,
    newRecommendation,
    newRisk,
    hasAlternative: !!newRecommendation,
    solverLatencyMs,
  };
}
