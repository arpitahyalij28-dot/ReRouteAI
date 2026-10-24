// Logistics Twin - Weather Client Library Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchWeatherForCoords,
  clearWeatherCache,
  getWeatherCacheStats,
  getCorridorWeather,
  SIMULATED_HEAVY_RAIN,
} from '../weather.js';

describe('Weather Client Library (src/lib/weather.js)', () => {
  beforeEach(() => {
    clearWeatherCache();
    vi.restoreAllMocks();
  });

  it('fetches live weather and caches subsequent queries for 10 minutes', async () => {
    const mockWeatherResponse = {
      location: { lat: 19.65, lng: 73.49 },
      currentWeather: {
        temperatureC: 24,
        windspeedKmH: 18,
        wmoCode: 61,
        condition: 'Moderate rain',
      },
      disruptionImpact: {
        riskLevel: 'medium',
        disruptionRiskDelta: 18,
        operationalGuidance: 'Caution advised.',
      },
      cached: false,
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockWeatherResponse,
    });

    const first = await fetchWeatherForCoords(19.651, 73.491);
    expect(first.cached).toBe(false);
    expect(first.disruptionImpact.riskLevel).toBe('medium');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second call within 10 minutes should hit in-memory cache
    const second = await fetchWeatherForCoords(19.652, 73.492); // Rounds to same 19.65, 73.49
    expect(second.cached).toBe(true);
    expect(second.disruptionImpact.riskLevel).toBe('medium');
    expect(fetchSpy).toHaveBeenCalledTimes(1); // No new network call

    const stats = getWeatherCacheStats();
    expect(stats.cachedEntries).toBe(1);
  });

  it('deduplicates concurrent in-flight requests for identical coordinates', async () => {
    let resolveNetwork;
    const pendingPromise = new Promise((resolve) => {
      resolveNetwork = resolve;
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      pendingPromise.then(() => ({
        ok: true,
        json: async () => ({
          location: { lat: 19.99, lng: 73.78 },
          currentWeather: { temperatureC: 29, windspeedKmH: 10, condition: 'Clear' },
          disruptionImpact: { riskLevel: 'low', disruptionRiskDelta: 0 },
        }),
      }))
    );

    // Fire 3 simultaneous in-flight requests
    const call1 = fetchWeatherForCoords(19.99, 73.78);
    const call2 = fetchWeatherForCoords(19.99, 73.78);
    const call3 = fetchWeatherForCoords(19.99, 73.78);

    resolveNetwork();
    const [res1, res2, res3] = await Promise.all([call1, call2, call3]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(res1.disruptionImpact.riskLevel).toBe('low');
    expect(res2.disruptionImpact.riskLevel).toBe('low');
    expect(res3.disruptionImpact.riskLevel).toBe('low');
  });

  it('gracefully returns fallback object without throwing on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network offline'));

    const res = await fetchWeatherForCoords(19.29, 73.06);

    expect(res).toBeDefined();
    expect(res.isFallback).toBe(true);
    expect(res.isUnavailable).toBe(true);
    expect(res.disruptionImpact.riskLevel).toBe('low');
    expect(res.currentWeather.condition).toContain('Weather unavailable');
  });

  it('returns simulated heavy rain state when simulateHeavyRain option is active', async () => {
    const res = await getCorridorWeather({ currentLat: 19.64, currentLng: 73.48 }, { simulateHeavyRain: true });

    expect(res.isSimulated).toBe(true);
    expect(res.disruptionImpact.riskLevel).toBe('high');
    expect(res.disruptionImpact.disruptionRiskDelta).toBe(35);
    expect(res.currentWeather.condition).toContain('Monsoon');
  });
});
