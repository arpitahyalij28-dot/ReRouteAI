// ReRoute AI 2.0 - Weather Intelligence Endpoint
// GET /api/weather?lat=19.64&lng=73.48
// Queries Open-Meteo (no API key required) and converts atmospheric conditions
// (rain, wind, visibility) into a quantitative disruption risk delta.

import { setCorsHeaders, jsonResponse, errorResponse, checkRateLimit } from './_utils.js';

const weatherCache = new Map();
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return;

  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'Method not allowed. Use GET.');
  }

  const rateCheck = checkRateLimit(req);
  if (!rateCheck.allowed) {
    return errorResponse(res, 429, 'Rate limit exceeded.');
  }

  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return errorResponse(res, 400, 'Invalid coordinates. Example: ?lat=19.645&lng=73.485');
  }

  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < WEATHER_CACHE_TTL_MS) {
    return jsonResponse(res, 200, { ...cached.data, cached: true });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) {
      throw new Error(`Open-Meteo returned status ${resp.status}`);
    }

    const json = await resp.json();
    const cw = json.current_weather || {};

    const temperature = cw.temperature ?? 28;
    const windspeed = cw.windspeed ?? 12;
    const weathercode = cw.weathercode ?? 0;

    // Interpret WMO weather codes:
    // 0: Clear sky, 1-3: Partly cloudy, 51-55: Drizzle, 61-65: Rain, 80-82: Showers, 95-99: Thunderstorm
    let weatherDescription = 'Clear sky';
    let disruptionRiskDelta = 0;
    let riskLevel = 'low';

    if (weathercode === 0) {
      weatherDescription = 'Clear sky / Optimal transit conditions';
      disruptionRiskDelta = 0;
    } else if (weathercode >= 1 && weathercode <= 3) {
      weatherDescription = 'Partly cloudy / Normal visibility';
      disruptionRiskDelta = 2;
    } else if (weathercode >= 51 && weathercode <= 55) {
      weatherDescription = 'Light drizzle / Wet road surface';
      disruptionRiskDelta = 8;
      riskLevel = 'medium';
    } else if (weathercode >= 61 && weathercode <= 65) {
      weatherDescription = 'Moderate to heavy rain / Reduced braking friction';
      disruptionRiskDelta = 18;
      riskLevel = 'medium';
    } else if (weathercode >= 80 && weathercode <= 82) {
      weatherDescription = 'Violent rain showers / Ghat section slowdown';
      disruptionRiskDelta = 26;
      riskLevel = 'high';
    } else if (weathercode >= 95) {
      weatherDescription = 'Severe thunderstorm & lightning / Elevated accident hazard';
      disruptionRiskDelta = 35;
      riskLevel = 'high';
    }

    // High wind penalty (> 40 km/h)
    if (windspeed > 40) {
      disruptionRiskDelta += 10;
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    const result = {
      location: { lat, lng },
      currentWeather: {
        temperatureC: temperature,
        windspeedKmH: windspeed,
        wmoCode: weathercode,
        condition: weatherDescription,
      },
      disruptionImpact: {
        riskLevel,
        disruptionRiskDelta,
        operationalGuidance:
          disruptionRiskDelta > 20
            ? 'Severe weather hazard: recommend increasing pickup window safety margins by +45 mins.'
            : disruptionRiskDelta > 10
            ? 'Caution advised: minor transit slowdown on highway ghat links.'
            : 'Favorable atmospheric conditions: standard schedule applies.',
      },
      timestamp: new Date().toISOString(),
    };

    weatherCache.set(cacheKey, { timestamp: now, data: result });

    return jsonResponse(res, 200, { ...result, cached: false });
  } catch (err) {
    // Graceful fallback weather
    const fallback = {
      location: { lat, lng },
      currentWeather: {
        temperatureC: 28,
        windspeedKmH: 14,
        wmoCode: 1,
        condition: 'Clear to partly cloudy (Historical average)',
      },
      disruptionImpact: {
        riskLevel: 'low',
        disruptionRiskDelta: 0,
        operationalGuidance: 'Clear corridor: standard operating limits apply.',
      },
      fallback: true,
      error: err.name === 'AbortError' ? 'Weather service timeout' : err.message,
      timestamp: new Date().toISOString(),
    };

    return jsonResponse(res, 200, fallback);
  }
}
