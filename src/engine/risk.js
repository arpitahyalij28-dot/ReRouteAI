// ReRoute AI 2.0 - Empty Return Risk Engine (ES Module)
// Calculates Empty Return Risk for a truck dynamically based on real data

import { calculateDistance, extractCoords } from './distance.js';

/**
 * Evaluates the risk of an unladen / empty return for a specific truck.
 *
 * @param {Object} truck - The truck object being evaluated
 * @param {Array} availableShipments - Array of available shipments in the system
 * @param {Object} settings - Model settings (average speed, thresholds)
 * @returns {Object} Risk assessment metrics, score, level, and factor breakdown
 */
export function calculateEmptyReturnRisk(truck, availableShipments = [], settings = {}) {
  if (!truck) {
    return {
      label: "Prototype Risk Model",
      probability: 0,
      riskLevel: "LOW",
      expectedAvailability: "Unknown",
      factors: [],
      summary: "No truck selected."
    };
  }

  const now = Date.now();

  // 1. Delivery completion urgency (0 - 30 points)
  let deliveryTimeMs = now;
  if (truck.expectedDeliveryTime) {
    const parsed = new Date(truck.expectedDeliveryTime).getTime();
    if (!isNaN(parsed)) deliveryTimeMs = parsed;
  } else if (truck.countdownSeconds) {
    deliveryTimeMs = now + truck.countdownSeconds * 1000;
  }

  const hoursUntilEmpty = Math.max(0, (deliveryTimeMs - now) / (1000 * 3600));
  let urgencyScore = 0;
  let urgencyDesc = "";

  if (hoursUntilEmpty <= 1) {
    urgencyScore = 30;
    urgencyDesc = "Critical urgency: Delivery completes in < 1h; immediate empty return risk.";
  } else if (hoursUntilEmpty <= 3) {
    urgencyScore = 24;
    urgencyDesc = `High urgency: Delivery completion expected in ${hoursUntilEmpty.toFixed(1)}h.`;
  } else if (hoursUntilEmpty <= 6) {
    urgencyScore = 15;
    urgencyDesc = `Moderate urgency: Delivery completion expected in ${hoursUntilEmpty.toFixed(1)}h.`;
  } else {
    urgencyScore = 8;
    urgencyDesc = `Low urgency: Delivery is ${hoursUntilEmpty.toFixed(1)}h away.`;
  }

  // 2. Load availability & proximity near destination (0 - 35 points)
  let loadsNearby = 0;
  let closestPickupKm = 9999;

  const activeShipments = availableShipments.filter(s => (s.status || 'Available') === 'Available' && !s.isCancelled);

  const tDest = extractCoords(truck, ['destinationCoords', 'destCoords']) || { lat: truck.destLat, lng: truck.destLng };

  activeShipments.forEach(s => {
    const sPick = extractCoords(s, ['originCoords', 'pickupCoords']) || { lat: s.pickupLat, lng: s.pickupLng };
    if (tDest && sPick) {
      const d = calculateDistance(tDest.lat, tDest.lng, sPick.lat, sPick.lng);
      if (d !== null) {
        if (d <= 120) loadsNearby++;
        if (d < closestPickupKm) closestPickupKm = d;
      }
    }
  });

  let densityScore = 0;
  let densityDesc = "";

  if (loadsNearby === 0) {
    densityScore = 35;
    densityDesc = `Severe load deficit: 0 available loads within 120 km of ${truck.destination || 'destination'}.`;
  } else if (loadsNearby === 1) {
    densityScore = 22;
    densityDesc = `Sparse availability: Only 1 load nearby (${closestPickupKm.toFixed(0)} km away).`;
  } else if (loadsNearby <= 3) {
    densityScore = 12;
    densityDesc = `Moderate corridor demand: ${loadsNearby} loads located within 120 km.`;
  } else {
    densityScore = 5;
    densityDesc = `High corridor demand: ${loadsNearby} competing loads available nearby.`;
  }

  // 3. Truck Capacity Exposure (0 - 20 points)
  // Support both capacityTons and maxCapacity in kg
  let maxCap = Number(truck.maxCapacity);
  if (isNaN(maxCap) || maxCap <= 0) {
    maxCap = (Number(truck.capacityTons) || 10) * 1000;
  }

  let capacityScore = 0;
  let capacityDesc = "";

  if (maxCap >= 20000) {
    capacityScore = 20;
    capacityDesc = `Heavy vehicle (${(maxCap/1000).toFixed(0)}T): Highest empty-mile fuel & financial burn rate.`;
  } else if (maxCap >= 10000) {
    capacityScore = 15;
    capacityDesc = `Medium-heavy vehicle (${(maxCap/1000).toFixed(0)}T): Significant deadhead cost exposure.`;
  } else if (maxCap >= 5000) {
    capacityScore = 10;
    capacityDesc = `Medium freight vehicle (${(maxCap/1000).toFixed(0)}T): Moderate empty-return penalty.`;
  } else {
    capacityScore = 5;
    capacityDesc = `Light commercial vehicle (${(maxCap/1000).toFixed(0)}T): Lower deadhead fuel penalty.`;
  }

  // 4. Time-Window Compatibility of candidate loads (0 - 15 points)
  let compatibleWindowCount = 0;
  activeShipments.forEach(s => {
    if (s.pickupWindowEnd) {
      const sEnd = new Date(s.pickupWindowEnd).getTime();
      if (!isNaN(sEnd) && sEnd >= deliveryTimeMs) {
        compatibleWindowCount++;
      }
    }
  });

  let windowScore = 0;
  let windowDesc = "";

  if (activeShipments.length > 0 && compatibleWindowCount === 0) {
    windowScore = 15;
    windowDesc = "Time-window mismatch: Available shipment windows close before truck reaches destination.";
  } else if (compatibleWindowCount === 1) {
    windowScore = 8;
    windowDesc = "Tight scheduling: Only 1 shipment has an open window matching truck availability.";
  } else if (compatibleWindowCount > 1) {
    windowScore = 3;
    windowDesc = `Favorable scheduling: ${compatibleWindowCount} shipments with compatible pickup windows.`;
  } else {
    windowScore = 10;
    windowDesc = "No shipments to evaluate for time compatibility.";
  }

  // Total probability calculation
  const totalScore = Math.min(100, Math.max(5, urgencyScore + densityScore + capacityScore + windowScore));

  let riskLevel = "LOW";
  if (totalScore >= 70) {
    riskLevel = "HIGH";
  } else if (totalScore >= 40) {
    riskLevel = "MEDIUM";
  }

  const availDate = new Date(deliveryTimeMs);
  const expectedAvailabilityStr = !isNaN(availDate.getTime()) 
    ? availDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : "Upon arrival";

  return {
    label: "Prototype Risk Model",
    probability: totalScore,
    riskLevel,
    expectedAvailability: expectedAvailabilityStr,
    deliveryTimeMs,
    hoursUntilEmpty: Math.round(hoursUntilEmpty * 10) / 10,
    loadsNearby,
    factors: [
      {
        name: "Delivery Completion Urgency",
        score: urgencyScore,
        maxScore: 30,
        description: urgencyDesc
      },
      {
        name: "Destination Load Density",
        score: densityScore,
        maxScore: 35,
        description: densityDesc
      },
      {
        name: "Capacity Cost Exposure",
        score: capacityScore,
        maxScore: 20,
        description: capacityDesc
      },
      {
        name: "Time-Window Compatibility",
        score: windowScore,
        maxScore: 15,
        description: windowDesc
      }
    ]
  };
}
