// ReRoute AI 2.0 - ETA Engine
// Dynamically predicts arrival at pickup, buffer margins, and delay risk
// Label: "Prototype Route Estimate"

(function() {
  /**
   * Calculates predicted arrival at shipment pickup and feasibility vs pickup window
   *
   * @param {Object} truck - Truck record
   * @param {Object} shipment - Shipment candidate
   * @param {number} pickupDeadheadKm - Distance from truck dest to shipment pickup
   * @param {number} speedKmH - Average operating speed
   * @param {number} driverBufferMins - Mandatory buffer / rest in minutes
   */
  function calculateETA(truck, shipment, pickupDeadheadKm, speedKmH = 45, driverBufferMins = 20) {
    if (!truck || !shipment || pickupDeadheadKm === null || pickupDeadheadKm === undefined) {
      return {
        isValid: false,
        status: "INFEASIBLE",
        delayRisk: 100,
        explanation: "Incomplete route or time data."
      };
    }

    const now = Date.now();
    let truckAvailMs = now;

    if (truck.expectedDeliveryTime) {
      const parsed = new Date(truck.expectedDeliveryTime).getTime();
      if (!isNaN(parsed)) truckAvailMs = parsed;
    }

    // Driver availability buffer
    let restMins = driverBufferMins;
    if (truck.driverAvailability && truck.driverAvailability.toLowerCase().includes('rest')) {
      restMins = Math.max(restMins, 90); // 1.5h rest if rest required
    }

    // Travel time to pickup
    const speed = Math.max(15, Number(speedKmH) || 45);
    const travelTimeHours = pickupDeadheadKm / speed;
    const travelTimeMins = Math.round(travelTimeHours * 60);

    // Predicted arrival timestamp
    const predictedArrivalMs = truckAvailMs + ((travelTimeMins + restMins) * 60 * 1000);
    const predictedArrivalDate = new Date(predictedArrivalMs);

    // Pickup window times
    let windowStartMs = null;
    let windowEndMs = null;
    let deadlineMs = null;

    if (shipment.pickupWindowStart) {
      const ps = new Date(shipment.pickupWindowStart).getTime();
      if (!isNaN(ps)) windowStartMs = ps;
    }
    if (shipment.pickupWindowEnd) {
      const pe = new Date(shipment.pickupWindowEnd).getTime();
      if (!isNaN(pe)) windowEndMs = pe;
    }
    if (shipment.deliveryDeadline) {
      const dl = new Date(shipment.deliveryDeadline).getTime();
      if (!isNaN(dl)) deadlineMs = dl;
    }

    // If windowEnd is missing, default to 4 hours after windowStart or 6 hours after avail
    if (!windowEndMs) {
      windowEndMs = (windowStartMs || truckAvailMs) + (6 * 3600 * 1000);
    }
    if (!windowStartMs) {
      windowStartMs = truckAvailMs;
    }

    // Minutes before (+) or after (-) pickup window closes
    const marginToCloseMins = Math.round((windowEndMs - predictedArrivalMs) / (60 * 1000));
    // Minutes after (+) or before (-) pickup window opens
    const marginToOpenMins = Math.round((predictedArrivalMs - windowStartMs) / (60 * 1000));

    // Determine status & delay risk dynamically
    let status = "ON TIME";
    let delayRisk = 15;
    let explanation = "";

    if (marginToCloseMins < -60) {
      // Arrives more than 60 mins after window closes
      status = "INFEASIBLE";
      delayRisk = 95;
      explanation = `Pickup window closes ${Math.abs(marginToCloseMins)} mins before vehicle can arrive.`;
    } else if (marginToCloseMins < 0) {
      // Arrives between 0 and 60 mins late
      status = "LIKELY DELAYED";
      delayRisk = 75;
      explanation = `Vehicle predicted to arrive ${Math.abs(marginToCloseMins)} mins after pickup window closes.`;
    } else if (marginToCloseMins <= 30) {
      // Tight margin: arrives within 30 mins of window closing
      status = "AT RISK";
      delayRisk = 50;
      explanation = `Tight window margin: Only ${marginToCloseMins} mins buffer before pickup closes.`;
    } else {
      // Arrives on time with healthy buffer
      status = "ON TIME";
      delayRisk = Math.max(5, Math.min(25, Math.round(30 - (marginToCloseMins / 10))));
      explanation = `Healthy buffer: Arrives ${marginToCloseMins} mins before window closes.`;
    }

    // Check delivery deadline feasibility if loaded travel is accounted for
    const formatTime = (date) => {
      if (!date || isNaN(date.getTime())) return "—";
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
        ' (' + date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')';
    };

    return {
      isValid: true,
      predictedArrivalMs,
      predictedArrivalFormatted: formatTime(predictedArrivalDate),
      windowStartFormatted: formatTime(new Date(windowStartMs)),
      windowEndFormatted: formatTime(new Date(windowEndMs)),
      marginToCloseMins,
      marginToOpenMins,
      travelTimeMins,
      restBufferMins: restMins,
      status,
      delayRisk, // 0 - 100 score
      explanation
    };
  }

  const ETAEngine = {
    calculateETA
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ETAEngine;
  }
  if (typeof window !== 'undefined') {
    window.ReRoute = window.ReRoute || {};
    window.ReRoute.ETAEngine = ETAEngine;
  }
})();
