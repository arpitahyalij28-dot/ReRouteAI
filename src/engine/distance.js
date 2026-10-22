// ReRoute AI 2.0 - Distance Engine (ES Module)
// Implements Haversine distance calculations and detour estimates

export const EARTH_RADIUS_KM = 6371.0;

export function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

export function isValidCoordinate(lat, lng) {
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
export function calculateDistance(lat1, lon1, lat2, lon2) {
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

// Coordinate extractor supporting both flat and array coordinates
export function extractCoords(obj, keys) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) {
      if (Array.isArray(obj[k]) && obj[k].length >= 2) {
        return { lat: Number(obj[k][0]), lng: Number(obj[k][1]) };
      }
    }
  }
  return null;
}

/**
 * Calculates detailed route metrics for a truck and backhaul shipment
 */
export function calculateRouteEstimate(truck, shipment, speedKmH = 45) {
  if (!truck || !shipment) {
    return {
      isValid: false,
      error: "Missing truck or shipment data for route estimation.",
      label: "Prototype Route Estimate"
    };
  }

  // Extract truck current coords
  const tCurr = extractCoords(truck, ['currentCoords']) || { lat: truck.currentLat, lng: truck.currentLng };
  // Extract truck origin coords (home terminal/base)
  const tOrig = extractCoords(truck, ['originCoords', 'homeCoords']) || { lat: truck.originLat, lng: truck.originLng };
  // Extract truck destination coords
  const tDest = extractCoords(truck, ['destinationCoords', 'destCoords']) || { lat: truck.destLat, lng: truck.destLng };

  // Extract shipment pickup coords
  const sPick = extractCoords(shipment, ['originCoords', 'pickupCoords']) || { lat: shipment.pickupLat, lng: shipment.pickupLng };
  // Extract shipment drop coords
  const sDrop = extractCoords(shipment, ['destCoords', 'destinationCoords', 'dropCoords']) || { lat: shipment.dropLat, lng: shipment.dropLng };

  if (!isValidCoordinate(tDest.lat, tDest.lng) ||
      !isValidCoordinate(sPick.lat, sPick.lng) ||
      !isValidCoordinate(sDrop.lat, sDrop.lng)) {
    return {
      isValid: false,
      error: "Coordinates missing or invalid for distance calculation.",
      label: "Prototype Route Estimate"
    };
  }

  const originalLegKm = isValidCoordinate(tCurr.lat, tCurr.lng)
    ? calculateDistance(tCurr.lat, tCurr.lng, tDest.lat, tDest.lng) || 0
    : 0;

  const homeBase = isValidCoordinate(tOrig.lat, tOrig.lng) ? tOrig : (isValidCoordinate(tCurr.lat, tCurr.lng) ? tCurr : tDest);

  const pickupDeadheadKm = calculateDistance(tDest.lat, tDest.lng, sPick.lat, sPick.lng);
  const loadedBackhaulKm = calculateDistance(sPick.lat, sPick.lng, sDrop.lat, sDrop.lng);
  const dropToOriginKm = isValidCoordinate(homeBase.lat, homeBase.lng)
    ? calculateDistance(sDrop.lat, sDrop.lng, homeBase.lat, homeBase.lng) || 0
    : 0;
  const directReturnKm = isValidCoordinate(homeBase.lat, homeBase.lng)
    ? calculateDistance(tDest.lat, tDest.lng, homeBase.lat, homeBase.lng) || originalLegKm
    : originalLegKm;

  const totalBackhaulTripKm = Math.round((pickupDeadheadKm + loadedBackhaulKm + dropToOriginKm) * 10) / 10;
  const rawDetour = totalBackhaulTripKm - directReturnKm;
  const detourKm = Number(shipment.detourKm) != null && !isNaN(Number(shipment.detourKm)) && Number(shipment.detourKm) > 0
    ? Number(shipment.detourKm)
    : Math.max(0, Math.round(rawDetour * 10) / 10);

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
