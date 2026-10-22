// ReRoute AI 2.0 - Geocoding Proxy Endpoint
// Resolves city names into geographic coordinates with caching and regional fallbacks.

import { setCorsHeaders, checkRateLimit, jsonResponse } from './_utils.js';

const geocodeCache = new Map();

// Built-in regional corridor landmarks for instant offline-safe geocoding
const CORRIDOR_CITIES = {
  nashik: { name: 'Nashik', lat: 19.9975, lng: 73.7898 },
  bhiwandi: { name: 'Bhiwandi', lat: 19.2967, lng: 73.0631 },
  mumbai: { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  thane: { name: 'Thane', lat: 19.2183, lng: 72.9781 },
  kalyan: { name: 'Kalyan', lat: 19.2437, lng: 73.1355 },
  igatpuri: { name: 'Igatpuri', lat: 19.6974, lng: 73.5639 },
  shahapur: { name: 'Shahapur', lat: 19.4534, lng: 73.3283 },
  pune: { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  'navi mumbai': { name: 'Navi Mumbai', lat: 19.033, lng: 73.0297 },
  panvel: { name: 'Panvel', lat: 18.9894, lng: 73.1175 },
};

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return;

  const rateCheck = checkRateLimit(req);
  if (!rateCheck.allowed) {
    return jsonResponse(res, 429, { error: 'Rate limit exceeded' });
  }

  const query = (req.query?.query || req.query?.q || '').trim();
  if (!query) {
    return jsonResponse(res, 400, { error: 'Query parameter is required' });
  }

  const lowerQuery = query.toLowerCase();

  // 1. Check instant corridor city table
  for (const [key, city] of Object.entries(CORRIDOR_CITIES)) {
    if (lowerQuery.includes(key) || key.includes(lowerQuery)) {
      return jsonResponse(res, 200, {
        source: 'regional_cache',
        name: city.name,
        lat: city.lat,
        lng: city.lng,
      });
    }
  }

  // 2. Check in-memory cache
  if (geocodeCache.has(lowerQuery)) {
    return jsonResponse(res, 200, {
      source: 'memory_cache',
      ...geocodeCache.get(lowerQuery),
    });
  }

  // 3. Query Open-Meteo free geocoding API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (geoRes.ok) {
      const data = await geoRes.json();
      if (data?.results && data.results.length > 0) {
        const top = data.results[0];
        const result = {
          name: `${top.name}${top.admin1 ? ', ' + top.admin1 : ''}`,
          lat: top.latitude,
          lng: top.longitude,
          country: top.country,
        };
        geocodeCache.set(lowerQuery, result);
        return jsonResponse(res, 200, { source: 'open_meteo', ...result });
      }
    }
  } catch (err) {
    console.warn(`[Geocode API] Open-Meteo query failed for ${query}:`, err.message);
  }

  // Fallback to corridor center if completely unknown
  const fallback = {
    name: query,
    lat: 19.5,
    lng: 73.3,
    source: 'corridor_default_fallback',
  };
  return jsonResponse(res, 200, fallback);
}
