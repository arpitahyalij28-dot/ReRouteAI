// ReRoute AI 2.0 - Distance Engine
// Implements Haversine distance calculations and detour estimates
// Label: "Prototype Route Estimate"

(function() {
  const EARTH_RADIUS_KM = 6371.0;

  function toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  function isValidCoordinate(lat, lng) {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (isNaN(nLat) || isNaN(nLng)) return false;
    return nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180;
  }

  /**
   * Calculates Haversine distance in kilometers between two geo-coordinates
   * Returns null if coordinates are missing or invalid
   */
  function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
      return null;
    }

    const dLat = toRad(Number(lat2) - Number(lat1));
    const dLon = toRad(Number(lon2) - Number(lon1));
    const rLat1 = toRad(Number(lat1));
    const rLat2 = toRad(Number(lat2));

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = EARTH_RADIUS_KM * c;

    return Math.round(distance * 10) / 10;
  }

  /**
   * Calculates detailed route metrics for a truck and backhaul shipment
   * Truck is currently completing (or completed) trip to truck.dest.
   * Backhaul involves:
   * 1. Deadhead: Truck Dest -> Shipment Pickup
   * 2. Loaded Backhaul: Shipment Pickup -> Shipment Drop
   * 3. Return to Truck Origin/Base (if specified): Drop -> Truck Origin
   * 4. Original Direct Return: Truck Dest -> Truck Origin (or original direct route)
   */
  function calculateRouteEstimate(truck, shipment, speedKmH = 45) {
    if (!truck || !shipment) {
      return {
        isValid: false,
        error: "Missing truck or shipment data for route estimation.",
        label: "Prototype Route Estimate"
      };
    }

    const tCurrentLat = truck.currentLat;
    const tCurrentLng = truck.currentLng;
    const tDestLat = truck.destLat;
    const tDestLng = truck.destLng;

    const sPickLat = shipment.pickupLat;
    const sPickLng = shipment.pickupLng;
    const sDropLat = shipment.dropLat;
    const sDropLng = shipment.dropLng;

    // Validate coordinates
    if (!isValidCoordinate(tDestLat, tDestLng) ||
        !isValidCoordinate(sPickLat, sPickLng) ||
        !isValidCoordinate(sDropLat, sDropLng)) {
      return {
        isValid: false,
        error: "Coordinates missing or invalid for distance calculation.",
        label: "Prototype Route Estimate"
      };
    }

    // 1. Truck original inbound leg (Current -> Dest)
    const originalLegKm = calculateDistance(tCurrentLat, tCurrentLng, tDestLat, tDestLng) || 0;

    // 2. Deadhead leg from Truck destination to Shipment pickup
    const pickupDeadheadKm = calculateDistance(tDestLat, tDestLng, sPickLat, sPickLng);

    // 3. Loaded backhaul leg from Shipment pickup to Shipment drop
    const loadedBackhaulKm = calculateDistance(sPickLat, sPickLng, sDropLat, sDropLng);

    // 4. Return to truck origin/home terminal from shipment drop
    const dropToOriginKm = calculateDistance(sDropLat, sDropLng, tCurrentLat, tCurrentLng) || 0;

    // 5. Direct return from truck destination back to origin/current
    const directReturnKm = calculateDistance(tDestLat, tDestLng, tCurrentLat, tCurrentLng) || originalLegKm;

    // 6. Additional detour calculation
    // Total distance if backhaul is taken = pickupDeadheadKm + loadedBackhaulKm + dropToOriginKm
    // If truck just drove straight back empty = directReturnKm
    // Detour = Additional km above direct return (or pickup deadhead + offset)
    const totalBackhaulTripKm = Math.round((pickupDeadheadKm + loadedBackhaulKm + dropToOriginKm) * 10) / 10;
    const rawDetour = totalBackhaulTripKm - directReturnKm;
    const detourKm = Math.max(0, Math.round(rawDetour * 10) / 10);

    // Estimated travel time for deadhead to pickup
    const speed = Math.max(10, Number(speedKmH) || 45);
    const deadheadTravelHours = pickupDeadheadKm / speed;
    const loadedTravelHours = loadedBackhaulKm / speed;
    const totalTravelHours = totalBackhaulTripKm / speed;

    return {
      isValid: true,
      label: "Prototype Route Estimate",
      originalLegKm,
      pickupDeadheadKm,
      loadedBackhaulKm,
      directReturnKm,
      totalBackhaulTripKm,
      detourKm,
      travelTimeMinutes: Math.round(deadheadTravelHours * 60),
      loadedTimeMinutes: Math.round(loadedTravelHours * 60),
      totalTimeMinutes: Math.round(totalTravelHours * 60)
    };
  }

  const DistanceEngine = {
    calculateDistance,
    calculateRouteEstimate,
    isValidCoordinate
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DistanceEngine;
  }
  if (typeof window !== 'undefined') {
    window.ReRoute = window.ReRoute || {};
    window.ReRoute.DistanceEngine = DistanceEngine;
  }
})();
