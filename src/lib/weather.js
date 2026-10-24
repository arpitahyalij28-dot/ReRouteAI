// Logistics Twin - Weather Intelligence Client Wrapper
// Client-side cache (10-min TTL) and in-flight request deduplication.
// Pure pure pure: Engine remains isolated without fetch.

import { apiFetch } from './api.js';

const weatherCache = new Map();
const inFlightRequests = new Map();
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const SIMULATED_HEAVY_RAIN = {
  location: { lat: 19.645, lng: 73.485, name: 'Kasara Ghat Section' },
  currentWeather: {
    temperatureC: 21,
    windspeedKmH: 46,
    wmoCode: 95,
    condition: 'Violent rain showers & Ghat fog / Torrential Monsoon',
  },
  disruptionImpact: {
    riskLevel: 'high',
    disruptionRiskDelta: 35,
    operationalGuidance: 'Severe weather hazard: Ghat section slowdown. -25% transit speed applied.',
  },
  isSimulated: true,
  isFallback: false,
  timestamp: new Date().toISOString(),
};

/**
 * Normalizes coordinates to 2 decimal places for cache key
 */
export function getCoordKey(lat, lng) {
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (isNaN(nLat) || isNaN(nLng)) return null;
  return `${nLat.toFixed(2)},${nLng.toFixed(2)}`;
}

/**
 * Clears the weather cache (useful for testing)
 */
export function clearWeatherCache() {
  weatherCache.clear();
  inFlightRequests.clear();
}

/**
 * Inspects cache stats
 */
export function getWeatherCacheStats() {
  return {
    cachedEntries: weatherCache.size,
    inFlightCount: inFlightRequests.size,
  };
}

/**
 * Fetches weather for a coordinate pair with caching & deduplication.
 * Returns null or fallback object gracefully on network errors.
 */
export async function fetchWeatherForCoords(lat, lng) {
  const key = getCoordKey(lat, lng);
  if (!key) return null;

  const now = Date.now();
  const cached = weatherCache.get(key);
  if (cached && now - cached.timestamp < WEATHER_CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  // Deduplicate in-flight requests for the same coordinates
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const fetchPromise = (async () => {
    try {
      const res = await apiFetch(`/api/weather?lat=${Number(lat).toFixed(4)}&lng=${Number(lng).toFixed(4)}`);

      if (res && res.disruptionImpact) {
        const payload = {
          location: res.location || { lat: Number(lat), lng: Number(lng) },
          currentWeather: res.currentWeather || {
            temperatureC: 28,
            windspeedKmH: 14,
            wmoCode: 0,
            condition: 'Clear conditions',
          },
          disruptionImpact: res.disruptionImpact,
          isFallback: Boolean(res.fallback),
          isSimulated: false,
          isUnavailable: false,
          timestamp: res.timestamp || new Date().toISOString(),
        };
        weatherCache.set(key, { timestamp: Date.now(), data: payload });
        return { ...payload, cached: false };
      }

      // API unreachable or returned null
      const unavailableResult = {
        location: { lat: Number(lat), lng: Number(lng) },
        currentWeather: {
          temperatureC: 28,
          windspeedKmH: 12,
          wmoCode: 1,
          condition: 'Weather unavailable (using normal conditions)',
        },
        disruptionImpact: {
          riskLevel: 'low',
          disruptionRiskDelta: 0,
          operationalGuidance: 'Normal conditions applied (service unreachable).',
        },
        isFallback: true,
        isUnavailable: true,
        isSimulated: false,
        timestamp: new Date().toISOString(),
      };
      return unavailableResult;
    } catch {
      return {
        location: { lat: Number(lat), lng: Number(lng) },
        currentWeather: {
          temperatureC: 28,
          windspeedKmH: 12,
          wmoCode: 1,
          condition: 'Weather unavailable (using normal conditions)',
        },
        disruptionImpact: {
          riskLevel: 'low',
          disruptionRiskDelta: 0,
          operationalGuidance: 'Normal conditions applied.',
        },
        isFallback: true,
        isUnavailable: true,
        isSimulated: false,
        timestamp: new Date().toISOString(),
      };
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, fetchPromise);
  return fetchPromise;
}

/**
 * High-level helper to resolve corridor weather for a truck
 */
export async function getCorridorWeather(truck, options = {}) {
  if (options.simulateHeavyRain) {
    return { ...SIMULATED_HEAVY_RAIN };
  }

  const lat = truck?.currentLat ?? truck?.currentCoords?.[0] ?? 19.645;
  const lng = truck?.currentLng ?? truck?.currentCoords?.[1] ?? 73.485;

  return fetchWeatherForCoords(lat, lng);
}
