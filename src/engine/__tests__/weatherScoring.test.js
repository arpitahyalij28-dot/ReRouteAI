// Logistics Twin - Weather-Aware Scoring Engine Vitest Suite
import { describe, it, expect } from 'vitest';
import { evaluateShipments, DEFAULT_WEATHER_PENALTIES } from '../matching.js';
import { calculateETA } from '../eta.js';

describe('Weather-Aware Scoring Engine', () => {
  const sampleTruck = {
    id: 'T101',
    regNumber: 'MH-15-EG-4921',
    model: '10T Heavy Commercial Vehicle',
    currentLocationName: 'Igatpuri Approaching',
    currentLat: 19.645,
    currentLng: 73.485,
    destination: 'Bhiwandi Central Depot',
    destLat: 19.2967,
    destLng: 73.0631,
    capacityTons: 10,
    maxCapacity: 10000,
    currentLoad: 0,
    status: 'In-Transit',
    speedKmH: 50,
    expectedDeliveryTime: new Date(Date.now() + 3600 * 1000).toISOString(),
  };

  const sampleShipment = {
    id: 'S1',
    name: 'Bhiwandi to Nashik Tier-1 Auto Consignment',
    origin: 'Bhiwandi',
    pickupLat: 19.2967,
    pickupLng: 73.0631,
    destination: 'Nashik',
    dropLat: 19.9975,
    dropLng: 73.7898,
    cargoWeight: 8000,
    pickupWindowStart: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    status: 'Available',
    value: 28000,
  };

  it('maintains 100% score parity when weather data is absent', () => {
    const withoutWeather = evaluateShipments(sampleTruck, [sampleShipment], {});
    const withEmptyWeather = evaluateShipments(sampleTruck, [sampleShipment], { weather: null });

    expect(withoutWeather[0].matchScore).toBe(withEmptyWeather[0].matchScore);
    expect(withoutWeather[0].factors.disruption.rawScore).toBe(
      withEmptyWeather[0].factors.disruption.rawScore
    );
  });

  it('maintains 100% score parity when weather scoring is disabled in settings', () => {
    const baseline = evaluateShipments(sampleTruck, [sampleShipment], {});
    const disabledWeather = evaluateShipments(sampleTruck, [sampleShipment], {
      weather: { riskLevel: 'high', disruptionRiskDelta: 35 },
      weatherEnabled: false,
    });

    expect(disabledWeather[0].matchScore).toBe(baseline[0].matchScore);
    expect(disabledWeather[0].factors.disruption.rawScore).toBe(
      baseline[0].factors.disruption.rawScore
    );
  });

  it('drops disruption score and overall matchScore under high weather risk', () => {
    const baseline = evaluateShipments(sampleTruck, [sampleShipment], {});
    const highWeather = evaluateShipments(sampleTruck, [sampleShipment], {
      weather: {
        riskLevel: 'high',
        condition: 'Severe monsoon downpour',
        location: { name: 'Kasara Ghat' },
      },
    });

    const baselineDisruption = baseline[0].factors.disruption.rawScore;
    const highDisruption = highWeather[0].factors.disruption.rawScore;

    // Disruption score drops by DEFAULT_WEATHER_PENALTIES.high (35 pts)
    expect(highDisruption).toBe(baselineDisruption - DEFAULT_WEATHER_PENALTIES.high);
    expect(highWeather[0].matchScore).toBeLessThan(baseline[0].matchScore);
    expect(highWeather[0].weatherImpact).toBeDefined();
    expect(highWeather[0].weatherImpact.riskLevel).toBe('high');
    expect(highWeather[0].weatherImpact.penalty).toBe(35);
  });

  it('drops disruption score under medium weather risk by tunable penalty', () => {
    const baseline = evaluateShipments(sampleTruck, [sampleShipment], {});
    const medWeather = evaluateShipments(sampleTruck, [sampleShipment], {
      weather: { riskLevel: 'medium' },
      weatherPenalties: { low: 0, medium: 20, high: 40 },
    });

    const baselineDisruption = baseline[0].factors.disruption.rawScore;
    const medDisruption = medWeather[0].factors.disruption.rawScore;

    expect(medDisruption).toBe(baselineDisruption - 20);
  });

  it('clamps disruption score between 5 and 100 even with extreme penalty', () => {
    const extremeWeather = evaluateShipments(sampleTruck, [sampleShipment], {
      weather: { riskLevel: 'high' },
      weatherPenalties: { high: 150 },
    });

    expect(extremeWeather[0].factors.disruption.rawScore).toBe(5);
  });

  it('reflects speed slowdown in calculateETA when weather data exists', () => {
    const deadheadKm = 40;
    const nominalETA = calculateETA(sampleTruck, sampleShipment, deadheadKm, 50, 20);

    const highWeatherETA = calculateETA(
      sampleTruck,
      sampleShipment,
      deadheadKm,
      50,
      20,
      { riskLevel: 'high', condition: 'Torrential Ghat Rain' }
    );

    // High weather slows from 50 km/h to 37.5 km/h (-25%)
    expect(highWeatherETA.effectiveSpeed).toBe(37.5);
    expect(highWeatherETA.weatherSlowdownMins).toBeGreaterThan(0);
    expect(highWeatherETA.travelTimeMins).toBeGreaterThan(nominalETA.travelTimeMins);
    expect(highWeatherETA.explanation).toContain('Weather slowdown: -25% speed');
  });

  it('includes readable weather explanation in why-not / why checklist', () => {
    const evaluated = evaluateShipments(sampleTruck, [sampleShipment], {
      weather: {
        riskLevel: 'high',
        condition: 'Violent cloudburst',
        location: { name: 'Kasara Ghat' },
      },
    });

    const weatherReason = evaluated[0].whyWhyNot.reasons.find((r) =>
      r.title.toLowerCase().includes('weather')
    );
    expect(weatherReason).toBeDefined();
    expect(weatherReason.description).toContain('Violent cloudburst');
    expect(weatherReason.description).toContain('disruption score reduced (-35 pts)');
  });
});
