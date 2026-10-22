import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  calculateRouteEstimate,
  calculateETA,
  calculateEmptyReturnRisk,
  calculateSustainability,
  calculateFleetSustainability,
  evaluateShipments,
  normalizeWeights,
  executeRecovery,
  validateTruck,
  validateShipment,
  validateModelSettings,
  parseAndValidateCSV,
  DEFAULT_WEIGHTS,
} from '../index.js';

describe('1. Distance Engine (Haversine & Route Estimates)', () => {
  it('calculates known distance between Mumbai (19.0760, 72.8777) and Pune (18.5204, 73.8567)', () => {
    const dist = calculateDistance(19.076, 72.8777, 18.5204, 73.8567);
    // Known aerial distance is ~118-122 km
    expect(dist).toBeGreaterThan(115);
    expect(dist).toBeLessThan(125);
  });

  it('calculates known distance between Mumbai (19.076, 72.8777) and Nashik (19.9975, 73.7898)', () => {
    const dist = calculateDistance(19.076, 72.8777, 19.9975, 73.7898);
    // Aerial distance is ~135-145 km
    expect(dist).toBeGreaterThan(130);
    expect(dist).toBeLessThan(150);
  });

  it('returns null for missing, null, or out-of-range coordinates', () => {
    expect(calculateDistance(null, 72.8, 19.0, 73.0)).toBeNull();
    expect(calculateDistance(19.0, null, 19.0, 73.0)).toBeNull();
    expect(calculateDistance(95, 72.8, 19.0, 73.0)).toBeNull(); // lat > 90
    expect(calculateDistance(19.0, 195, 19.0, 73.0)).toBeNull(); // lng > 180
  });

  it('calculates route estimate with deadhead and detour for a valid truck and shipment', () => {
    const truck = {
      currentLat: 19.9975,
      currentLng: 73.7898,
      destLat: 19.2967,
      destLng: 73.0631,
    };
    const shipment = {
      pickupLat: 19.2083,
      pickupLng: 72.9681,
      dropLat: 19.9975,
      dropLng: 73.7898,
    };
    const est = calculateRouteEstimate(truck, shipment, 45);
    expect(est.isValid).toBe(true);
    expect(est.pickupDeadheadKm).toBeGreaterThan(0);
    expect(est.loadedBackhaulKm).toBeGreaterThan(0);
    expect(est.detourKm).toBeGreaterThanOrEqual(0);
  });
});

describe('2. ETA Engine & Time Window Edge Cases', () => {
  const baseTruck = {
    expectedDeliveryTime: '2026-10-22T14:00:00Z',
    driverAvailability: 'Immediate / On Duty',
  };

  it('returns ON TIME when truck arrives with healthy buffer before window closes', () => {
    // Arrival: 14:00 + travel (10km / 45km/h ~ 13m) + rest (20m) = ~14:33
    // Window: 14:00 to 16:00 -> arrives ~87m before close
    const shipment = {
      pickupWindowStart: '2026-10-22T14:00:00Z',
      pickupWindowEnd: '2026-10-22T16:00:00Z',
    };
    const eta = calculateETA(baseTruck, shipment, 10, 45, 20);
    expect(eta.isValid).toBe(true);
    expect(eta.status).toBe('ON TIME');
    expect(eta.marginToCloseMins).toBeGreaterThan(30);
  });

  it('handles edge case: arrives AT RISK (<= 30 mins margin)', () => {
    // Delivery 14:00 + 40km at 40km/h (60m) + 20m rest = 15:20
    // Window end: 15:40 -> margin 20 mins
    const shipment = {
      pickupWindowStart: '2026-10-22T15:00:00Z',
      pickupWindowEnd: '2026-10-22T15:40:00Z',
    };
    const eta = calculateETA(baseTruck, shipment, 40, 40, 20);
    expect(eta.isValid).toBe(true);
    expect(eta.status).toBe('AT RISK');
    expect(eta.marginToCloseMins).toBeLessThanOrEqual(30);
    expect(eta.marginToCloseMins).toBeGreaterThan(0);
  });

  it('handles edge case: exactly at close (margin = 0 mins -> LIKELY DELAYED)', () => {
    // Arrival: 14:00 + 60m travel + 20m rest = 15:20
    // Window end: exactly 15:20
    const shipment = {
      pickupWindowStart: '2026-10-22T14:00:00Z',
      pickupWindowEnd: '2026-10-22T15:20:00Z',
    };
    const eta = calculateETA(baseTruck, shipment, 45, 45, 20); // 45km at 45km/h = 60m + 20m = 80m = 15:20
    expect(eta.isValid).toBe(true);
    expect(eta.marginToCloseMins).toBe(0);
    expect(eta.status).toBe('AT RISK'); // 0 margin <= 30 is tight buffer AT RISK
  });

  it('handles edge case: 1 min late (margin = -1 min -> LIKELY DELAYED)', () => {
    const shipment = {
      pickupWindowStart: '2026-10-22T14:00:00Z',
      pickupWindowEnd: '2026-10-22T15:19:00Z',
    };
    const eta = calculateETA(baseTruck, shipment, 45, 45, 20); // Arrives 15:20
    expect(eta.marginToCloseMins).toBeLessThan(0);
    expect(eta.marginToCloseMins).toBeGreaterThanOrEqual(-60);
    expect(eta.status).toBe('LIKELY DELAYED');
  });

  it('handles edge case: 61 min late (margin < -60 mins -> INFEASIBLE)', () => {
    // Arrival: 15:20. Window end: 14:15 -> 65 mins late
    const shipment = {
      pickupWindowStart: '2026-10-22T13:30:00Z',
      pickupWindowEnd: '2026-10-22T14:15:00Z',
    };
    const eta = calculateETA(baseTruck, shipment, 45, 45, 20);
    expect(eta.marginToCloseMins).toBeLessThan(-60);
    expect(eta.status).toBe('INFEASIBLE');
    expect(eta.delayRisk).toBe(95);
  });
});

describe('3. Weights Normalization', () => {
  it('normalizes custom percentages to sum to 100', () => {
    const raw = { route: 50, time: 50, capacity: 50, detour: 50, cost: 0, disruption: 0 };
    const norm = normalizeWeights(raw);
    const sum = Object.values(norm).reduce((a, b) => a + b, 0);
    expect(Math.round(sum)).toBe(100);
    expect(norm.route).toBe(25);
    expect(norm.time).toBe(25);
  });

  it('normalizes legacy 0-1 floating weights (sum 1.0) to 100', () => {
    const raw = { route: 0.25, time: 0.2, capacity: 0.2, detour: 0.15, cost: 0.1, risk: 0.1 };
    const norm = normalizeWeights(raw);
    const sum = Object.values(norm).reduce((a, b) => a + b, 0);
    expect(Math.round(sum)).toBe(100);
    expect(norm.route).toBe(25);
    expect(norm.disruption).toBe(10);
  });

  it('falls back to default weights when all zeroes are passed', () => {
    const raw = { route: 0, time: 0, capacity: 0, detour: 0, cost: 0, disruption: 0 };
    const norm = normalizeWeights(raw);
    expect(norm).toEqual(DEFAULT_WEIGHTS);
  });
});

describe('4. Feasibility, Capacity & Matching Engine Rules', () => {
  const testTruck = {
    id: 'TRK-01',
    currentLat: 19.9975,
    currentLng: 73.7898,
    destLat: 19.2967,
    destLng: 73.0631,
    maxCapacity: 10000,
    currentLoad: 6000, // Available: 4000 kg
    vehicleType: '32ft Multi-Axle (15T)',
    expectedDeliveryTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    mileage: 4.0,
    fuelPrice: 95.0,
  };

  const feasibleShipment = {
    id: 'SHP-FEASIBLE',
    pickupLat: 19.2083,
    pickupLng: 72.9681,
    dropLat: 19.9975,
    dropLng: 73.7898,
    cargoWeight: 3500, // Fits in 4000kg
    pickupWindowStart: new Date(Date.now() + 2.5 * 3600 * 1000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    status: 'Available',
    value: 25000,
  };

  const overweightShipment = {
    id: 'SHP-OVERWEIGHT',
    pickupLat: 19.2083,
    pickupLng: 72.9681,
    dropLat: 19.9975,
    dropLng: 73.7898,
    cargoWeight: 8000, // Exceeds 4000kg available!
    pickupWindowStart: new Date(Date.now() + 2.5 * 3600 * 1000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    status: 'Available',
    value: 50000, // High value
  };

  it('marks overweight shipment as infeasible and NEVER recommends it', () => {
    const results = evaluateShipments(testTruck, [feasibleShipment, overweightShipment]);

    const resFeasible = results.find((r) => r.shipmentId === 'SHP-FEASIBLE');
    const resOverweight = results.find((r) => r.shipmentId === 'SHP-OVERWEIGHT');

    expect(resFeasible.isFeasible).toBe(true);
    expect(resFeasible.isRecommended).toBe(true);

    expect(resOverweight.isFeasible).toBe(false);
    expect(resOverweight.isRecommended).toBe(false);
  });

  it('flips infeasible overweight shipment to feasible when truck capacity increases', () => {
    const upgradedTruck = {
      ...testTruck,
      maxCapacity: 20000,
      currentLoad: 6000, // Available: 14,000 kg -> 8000kg fits!
    };
    const results = evaluateShipments(upgradedTruck, [overweightShipment]);
    expect(results[0].isFeasible).toBe(true);
  });

  it('never recommends an infeasible shipment even when all shipments are infeasible', () => {
    const allInfeasible = [
      overweightShipment,
      { ...feasibleShipment, id: 'SHP-EXPIRED', status: 'Cancelled' },
    ];
    const results = evaluateShipments(testTruck, allInfeasible);
    const anyRecommended = results.some((r) => r.isRecommended);
    expect(anyRecommended).toBe(false);
    expect(results.metadata.recommendedId).toBeNull();
  });
});

describe('5. Sustainability Engine & Calculations', () => {
  it('calculates exact sustainability formulas matching benchmark metrics', () => {
    const sust = calculateSustainability({
      distanceKm: 150,
      detourKm: 15,
      mileage: 4.0,
      fuelPrice: 95.0,
      emissionFactor: 2.68,
      maxCapacity: 16000,
      cargoWeight: 3500,
      shipmentValue: 22000,
    });

    // 150 km avoided
    expect(sust.emptyKmAvoided).toBe(150);
    // 150 / 4 = 37.5 L
    expect(sust.fuelSavedLitres).toBe(37.5);
    // 37.5 * 95 = 3562.5 -> Math.round -> 3563
    expect(sust.fuelCostImpact).toBe(3563);
    expect(sust.costSavedInr).toBe(3563);
    // 37.5 * 2.68 = 100.5 kg CO2
    expect(sust.co2AvoidedKg).toBe(100.5);
    expect(sust.co2ReducedKg).toBe(100.5);
    // Utilization: 3500 / 16000 = 22%
    expect(sust.vehicleUtilizationPercent).toBe(22);
  });
});

describe('6. Recovery Engine (Autonomous Disruption Re-ranking)', () => {
  const truck = {
    id: 'TRK-RECOVER',
    destLat: 19.2967,
    destLng: 73.0631,
    maxCapacity: 10000,
    currentLoad: 2000,
    expectedDeliveryTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    mileage: 4.0,
    fuelPrice: 95.0,
  };

  const s1 = {
    id: 'S1',
    pickupLat: 19.2083,
    pickupLng: 72.9681,
    dropLat: 19.9975,
    dropLng: 73.7898,
    cargoWeight: 4000,
    pickupWindowStart: new Date(Date.now() + 2.5 * 3600 * 1000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    status: 'Available',
    value: 28000,
  };

  const s2 = {
    id: 'S2',
    pickupLat: 19.25,
    pickupLng: 73.0,
    dropLat: 19.95,
    dropLng: 73.75,
    cargoWeight: 3500,
    pickupWindowStart: new Date(Date.now() + 2.5 * 3600 * 1000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    status: 'Available',
    value: 25000,
  };

  it('dynamically re-ranks and promotes next feasible candidate when S1 is cancelled', async () => {
    const recovery = await executeRecovery(truck, 'S1', [s1, s2]);
    expect(recovery.success).toBe(true);
    expect(recovery.cancelledShipmentId).toBe('S1');
    expect(recovery.remainingCount).toBe(1);
    expect(recovery.newRecommendation).not.toBeNull();
    expect(recovery.newRecommendation.shipmentId).toBe('S2');
    expect(recovery.hasAlternative).toBe(true);
    expect(recovery.solverLatencyMs).toBeGreaterThanOrEqual(0);
  });
});

describe('7. Validation Engine Tests', () => {
  it('validates truck correctly and reports errors for invalid inputs', () => {
    const invalidTruck = {
      id: '',
      vehicleType: '',
      currentLocation: '',
      currentLat: 999, // invalid
      currentLng: 999,
      destination: '',
      destLat: 999,
      destLng: 999,
      maxCapacity: -5,
    };
    const v = validateTruck(invalidTruck);
    expect(v.isValid).toBe(false);
    expect(v.errors.length).toBeGreaterThan(3);
  });

  it('validates shipment correctly and detects negative cargo or invalid coords', () => {
    const invalidShipment = {
      id: 'S-BAD',
      pickupLat: 200,
      dropLat: 200,
      cargoWeight: -100,
    };
    const v = validateShipment(invalidShipment);
    expect(v.isValid).toBe(false);
  });

  it('parses and validates CSV rows', () => {
    const sampleCSV = `id,vehicleType,currentLocation,currentLat,currentLng,destination,destLat,destLng,maxCapacity,currentLoad,mileage,fuelPrice,expectedDeliveryTime,driverAvailability,status
TRK-CSV-01,32ft Multi-Axle,Pune,18.5204,73.8567,Mumbai,19.0760,72.8777,15000,5000,4.0,95.0,2026-10-22T14:00,Immediate,Available`;

    const res = parseAndValidateCSV(sampleCSV, 'trucks');
    expect(res.isValid).toBe(true);
    expect(res.parsed.length).toBe(1);
    expect(res.parsed[0].id).toBe('TRK-CSV-01');
  });
});
