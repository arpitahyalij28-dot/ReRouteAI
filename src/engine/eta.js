// ReRoute AI 2.0 - ETA Engine (ES Module)
// Dynamically predicts arrival at pickup, buffer margins, and delay risk

function parseTimeString(timeStr, baseDateMs = Date.now()) {
  if (!timeStr) return null;
  if (typeof timeStr === 'number') return timeStr;

  // Try standard Date parse first
  const parsed = new Date(timeStr).getTime();
  if (!isNaN(parsed)) return parsed;

  // Handle "HH:MM" format
  if (typeof timeStr === 'string' && /^\d{1,2}:\d{2}/.test(timeStr)) {
    const parts = timeStr.split(':');
    const d = new Date(baseDateMs);
    d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
    return d.getTime();
  }

  return null;
}

/**
 * Calculates predicted arrival at shipment pickup and feasibility vs pickup window
 *
 * @param {Object} truck - Truck record
 * @param {Object} shipment - Shipment candidate
 * @param {number} pickupDeadheadKm - Distance from truck dest to shipment pickup
 * @param {number} speedKmH - Average operating speed
 * @param {number} driverBufferMins - Mandatory buffer / rest in minutes
 */
export function calculateETA(truck, shipment, pickupDeadheadKm, speedKmH = 45, driverBufferMins = 20) {
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
    const parsed = parseTimeString(truck.expectedDeliveryTime, now);
    if (parsed) truckAvailMs = parsed;
  }

  // Driver availability buffer
  let restMins = driverBufferMins;
  if (truck.driverAvailability && String(truck.driverAvailability).toLowerCase().includes('rest')) {
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
  let windowStartMs = parseTimeString(shipment.pickupWindowStart, truckAvailMs);
  let windowEndMs = parseTimeString(shipment.pickupWindowEnd, truckAvailMs);
  let deadlineMs = parseTimeString(shipment.deliveryDeadline, truckAvailMs);

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

  const formatTime = (date) => {
    if (!date || isNaN(date.getTime())) return "—";
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
