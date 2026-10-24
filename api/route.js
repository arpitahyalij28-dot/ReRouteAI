// Logistics Twin - Road Routing Proxy Endpoint
// GET /api/route?from=lat,lng&to=lat,lng
// Fetches real road polylines, distance, and duration from OSRM (or OpenRouteService).
// Caches responses in memory; falls back to Haversine straight-line if provider fails.

import { setCorsHeaders, jsonResponse, errorResponse, checkRateLimit } from './_utils.js';
import { calculateDistance } from '../src/engine/index.js';

const routeCache = new Map();
const MAX_CACHE_ENTRIES = 500;

function parseLatLng(str) {
  if (!str) return null;
  const parts = str.split(',').map((p) => parseFloat(p.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { lat: parts[0], lng: parts[1] };
  }
  return null;
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return;

  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'Method not allowed. Use GET.');
  }

  const rateCheck = checkRateLimit(req);
  if (!rateCheck.allowed) {
    return errorResponse(res, 429, 'Rate limit exceeded.');
  }

  const fromStr = req.query.from;
  const toStr = req.query.to;

  const from = parseLatLng(fromStr);
  const to = parseLatLng(toStr);

  if (!from || !to) {
    return errorResponse(
      res,
      400,
      'Invalid coordinates. Expected format: ?from=lat,lng&to=lat,lng (e.g. ?from=19.95,73.74&to=19.29,73.06)'
    );
  }

  const cacheKey = `${from.lat.toFixed(4)},${from.lng.toFixed(4)}->${to.lat.toFixed(4)},${to.lng.toFixed(4)}`;
  if (routeCache.has(cacheKey)) {
    return jsonResponse(res, 200, {
      ...routeCache.get(cacheKey),
      cached: true,
      timestamp: new Date().toISOString(),
    });
  }

  const orsKey = process.env.OPENROUTESERVICE_API_KEY;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    let routeData = null;

    if (orsKey) {
      // Use OpenRouteService if API key is provided
      const orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsKey}&start=${from.lng},${from.lat}&end=${to.lng},${to.lat}`;
      const resp = await fetch(orsUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (resp.ok) {
        const json = await resp.json();
        const feature = json.features?.[0];
        if (feature) {
          const coords = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          const summary = feature.properties.summary;
          routeData = {
            provider: 'OpenRouteService',
            distanceKm: Math.round((summary.distance / 1000) * 10) / 10,
            durationMinutes: Math.round(summary.duration / 60),
            coordinates: coords,
            isApproximate: false,
          };
        }
      }
    }

    if (!routeData) {
      // Use OSRM public router
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
      const resp = await fetch(osrmUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (resp.ok) {
        const json = await resp.json();
        const route = json.routes?.[0];
        if (route) {
          const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          routeData = {
            provider: 'OSRM (Open Source Routing Machine)',
            distanceKm: Math.round((route.distance / 1000) * 10) / 10,
            durationMinutes: Math.round(route.duration / 60),
            coordinates: coords,
            isApproximate: false,
          };
        }
      }
    }

    if (!routeData) {
      throw new Error('Routing service returned empty route');
    }

    if (routeCache.size >= MAX_CACHE_ENTRIES) {
      const firstKey = routeCache.keys().next().value;
      routeCache.delete(firstKey);
    }
    routeCache.set(cacheKey, routeData);

    return jsonResponse(res, 200, {
      ...routeData,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // Fallback: Haversine straight line calculation
    const directKm = calculateDistance(from.lat, from.lng, to.lat, to.lng);
    const estDurationMins = Math.round((directKm / 45) * 60);

    const fallbackResult = {
      provider: 'Haversine Direct Line (Fallback)',
      distanceKm: Math.round(directKm * 10) / 10,
      durationMinutes: estDurationMins,
      coordinates: [
        [from.lat, from.lng],
        [to.lat, to.lng],
      ],
      isApproximate: true,
      fallbackReason: err.name === 'AbortError' ? 'Provider timeout' : err.message,
      timestamp: new Date().toISOString(),
    };

    return jsonResponse(res, 200, fallbackResult);
  }
}
