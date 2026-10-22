// ReRoute AI 2.0 - Recovery Engine
// Autonomous recovery simulation when a backhaul shipment is cancelled / fails
// Re-evaluates remaining available shipments dynamically and identifies the next best feasible match

(function() {
  function getEngine(name) {
    if (typeof window !== 'undefined' && window.ReRoute && window.ReRoute[name]) {
      return window.ReRoute[name];
    }
    if (typeof require !== 'undefined') {
      if (name === 'MatchingEngine') return require('./matching-engine.js');
      if (name === 'RiskEngine') return require('./risk-engine.js');
    }
    return null;
  }

  /**
   * Executes recovery sequence when an assigned shipment fails or is cancelled
   *
   * @param {Object} truck - Current truck
   * @param {string} cancelledShipmentId - ID of shipment that was cancelled
   * @param {Array} allShipments - Full list of shipments in store
   * @param {Object} settings - Model settings
   * @param {Function} onStageChange - Callback for animating stages: (stageIndex, stageName) => void
   * @returns {Promise<Object>} Recovery result with new recommendation and recalculated rankings
   */
  async function executeRecovery(truck, cancelledShipmentId, allShipments = [], settings = {}, onStageChange = null) {
    const STAGES = [
      { id: 1, title: "PLAN INTERRUPTED", desc: `Shipment ${cancelledShipmentId} flagged as cancelled/failed.` },
      { id: 2, title: "RE-EVALUATING", desc: "Removing invalid assignment and clearing route reservation." },
      { id: 3, title: "CHECKING AVAILABLE SHIPMENTS", desc: "Filtering remaining active shipments in logistics corridor." },
      { id: 4, title: "RECALCULATING", desc: "Recomputing route compatibility, ETA, capacity, and sustainability." },
      { id: 5, title: "NEW MATCH FOUND", desc: "Optimal backup backhaul identified from remaining fleet demand." }
    ];

    const matchingEngine = getEngine('MatchingEngine');
    const riskEngine = getEngine('RiskEngine');

    // Filter out the cancelled shipment and only take Available shipments
    const remainingAvailable = allShipments.filter(s => s.id !== cancelledShipmentId && s.status === 'Available');

    // Run animation steps if running in browser with UI callback
    if (typeof onStageChange === 'function') {
      for (let i = 0; i < STAGES.length; i++) {
        onStageChange(i, STAGES[i]);
        await new Promise(r => setTimeout(r, 450));
      }
    }

    // Recalculate matches
    const newEvaluations = matchingEngine 
      ? matchingEngine.evaluateShipments(truck, remainingAvailable, settings)
      : [];

    // Recalculate truck risk
    const newRisk = riskEngine 
      ? riskEngine.calculateEmptyReturnRisk(truck, remainingAvailable, settings)
      : null;

    // Pick top feasible recommendation
    const newRecommendation = newEvaluations.find(item => item.isFeasible) || null;

    return {
      success: true,
      cancelledShipmentId,
      stages: STAGES,
      remainingCount: remainingAvailable.length,
      newEvaluations,
      newRecommendation,
      newRisk,
      hasAlternative: !!newRecommendation
    };
  }

  const RecoveryEngine = {
    executeRecovery
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecoveryEngine;
  }
  if (typeof window !== 'undefined') {
    window.ReRoute = window.ReRoute || {};
    window.ReRoute.RecoveryEngine = RecoveryEngine;
  }
})();
