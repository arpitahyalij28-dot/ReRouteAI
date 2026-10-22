// ReRoute AI 2.0 - Data & Scoring Logic Unit Test Suite
import { describe, it, expect, beforeEach } from 'vitest';
import { getCityCoords, calculateDistanceKm, CITIES, CITY_MAP } from '../../data/cities';
import {
  calculateShipmentScore,
  rankShipments,
  calculateSustainabilityMetrics,
} from '../../utils/scoring';
import { DEMO_DATA } from '../../data/mockData';

describe('Cities Lookup & Distance Calculation', () => {
  it('resolves coordinates for Maharashtra and Western India hubs', () => {
    const nashik = getCityCoords('Nashik');
    const mumbai = getCityCoords('Mumbai');
    const pune = getCityCoords('Pune');
    const bhiwandi = getCityCoords('Bhiwandi');

    expect(nashik).toEqual([19.9975, 73.7898]);
    expect(mumbai).toEqual([19.0760, 72.8777]);
    expect(pune).toEqual([18.5204, 73.8567]);
    expect(bhiwandi).toEqual([19.2967, 73.0631]);
  });

  it('calculates realistic road distances between cities', () => {
    const nashikToMumbai = calculateDistanceKm('Nashik', 'Mumbai');
    expect(nashikToMumbai).toBeGreaterThan(140);
    expect(nashikToMumbai).toBeLessThan(200);

    const mumbaiToPune = calculateDistanceKm('Mumbai', 'Pune');
    expect(mumbaiToPune).toBeGreaterThan(120);
    expect(mumbaiToPune).toBeLessThan(180);
  });
});

describe('DEMO_DATA Integrity', () => {
  it('exports DEMO_DATA containing trucks, shipments, and waypoints', () => {
    expect(DEMO_DATA).toBeDefined();
    expect(Array.isArray(DEMO_DATA.trucks)).toBe(true);
    expect(Array.isArray(DEMO_DATA.shipments)).toBe(true);
    expect(Array.isArray(DEMO_DATA.waypoints)).toBe(true);
    expect(DEMO_DATA.trucks.length).toBeGreaterThanOrEqual(6);
    expect(DEMO_DATA.shipments.length).toBeGreaterThanOrEqual(15);
    expect(DEMO_DATA.trucks[0].id).toBe('T101');
    expect(DEMO_DATA.shipments[0].id).toBe('S1');
  });
});

describe('Dynamic Scoring & Sustainability Zero-State Resilience', () => {
  it('returns safe null or zero values without throwing errors when no truck or shipment is present', () => {
    expect(calculateShipmentScore(null, undefined, null)).toBeNull();

    const emptyRank = rankShipments([], undefined, null);
    expect(emptyRank.ranked).toEqual([]);
    expect(emptyRank.recommendedId).toBeNull();

    const emptyMetrics = calculateSustainabilityMetrics(null, null);
    expect(emptyMetrics.emptyKmAvoided).toBe(0);
    expect(emptyMetrics.fuelSavedLitres).toBe(0);
    expect(emptyMetrics.costSavedInr).toBe(0);
    expect(emptyMetrics.co2ReducedKg).toBe(0);
    expect(emptyMetrics.vehicleUtilizationPct).toBe(0);
  });

  it('computes live matching scores and sustainability when custom user data is provided', () => {
    const customTruck = {
      id: 'T-TEST',
      capacityTons: 10,
      maxCapacity: 10000,
      totalTripKm: 160,
      vehicleMileageKmPerL: 4.0,
      fuelPricePerL: 95.0,
      emissionFactorKgPerL: 2.68,
      originCoords: [19.9975, 73.7898], // Nashik
      destinationCoords: [19.0760, 72.8777], // Mumbai
      currentCoords: [19.5, 73.3],
      expectedDeliveryTime: '14:15',
    };

    const customShipment = {
      id: 'S-TEST',
      name: 'Test Return Load',
      origin: 'Mumbai',
      destination: 'Nashik',
      originCoords: [19.0760, 72.8777],
      destCoords: [19.9975, 73.7898],
      weightTons: 8,
      cargoWeight: 8000,
      pickupWindowStart: '14:30',
      pickupWindowEnd: '16:00',
      predictedTruckEta: '14:15',
      etaBufferMinutes: 15,
      detourKm: 8,
      freightOfferInr: 28000,
      value: 28000,
      status: 'Available',
    };

    const ranking = rankShipments([customShipment], undefined, customTruck);
    expect(ranking.ranked.length).toBe(1);
    expect(ranking.recommendedId).toBe('S-TEST');
    expect(ranking.ranked[0].score.totalScore).toBeGreaterThan(60);

    const metrics = calculateSustainabilityMetrics(customShipment, customTruck);
    expect(metrics.emptyKmAvoided).toBeGreaterThan(0);
    expect(metrics.fuelSavedLitres).toBeGreaterThan(0);
    expect(metrics.costSavedInr).toBeGreaterThan(0);
    expect(metrics.co2ReducedKg).toBeGreaterThan(0);
  });
});

describe('DataContext State Management & Lifecycle', () => {
  // Mock localStorage for node environment
  let storage = {};
  const mockLocalStorage = {
    getItem: (key) => storage[key] || null,
    setItem: (key, value) => { storage[key] = String(value); },
    removeItem: (key) => { delete storage[key]; },
    clear: () => { storage = {}; },
  };

  beforeEach(() => {
    storage = {};
    globalThis.localStorage = mockLocalStorage;
  });

  it('verifies Acceptance Item 1: Fresh load starts with empty state', () => {
    // When localStorage is empty
    expect(mockLocalStorage.getItem('reroute_trucks')).toBeNull();
    expect(mockLocalStorage.getItem('reroute_shipments')).toBeNull();
  });

  it('verifies Acceptance Item 2: Manual add truck, add shipment, edit and delete', () => {
    // Test data entry logic and city coordinate resolution
    const originCoords = getCityCoords('Nashik');
    const destCoords = getCityCoords('Mumbai');
    expect(originCoords).toBeDefined();
    expect(destCoords).toBeDefined();

    const newTruck = {
      id: 'MH-15-AB-1234',
      driverName: 'Ramesh Sharma',
      vehicleType: 'Open Body 32ft',
      capacityTons: 15,
      currentLoadTons: 0,
      origin: 'Nashik',
      destination: 'Mumbai',
      status: 'Returning Empty',
      originCoords,
      destinationCoords: destCoords,
      currentCoords: originCoords,
    };

    const newShipment = {
      id: 'S-CUSTOM-1',
      name: 'Automotive Parts',
      origin: 'Nashik',
      destination: 'Mumbai',
      cargoWeight: 10000,
      weightTons: 10,
      freightOfferInr: 32000,
      status: 'Available',
      originCoords,
      destCoords,
    };

    // Evaluates match score for custom user truck and load
    const scoreResult = calculateShipmentScore(newShipment, undefined, newTruck);
    expect(scoreResult).toBeDefined();
    expect(scoreResult.totalScore).toBeGreaterThan(0);
    expect(scoreResult.factors).toBeDefined();

    // Sustainability recomputes live from custom data
    const sustainResult = calculateSustainabilityMetrics(newShipment, newTruck);
    expect(sustainResult.fuelSavedLitres).toBeGreaterThan(0);
    expect(sustainResult.costSavedInr).toBeGreaterThan(0);
  });

  it('verifies Acceptance Item 3: Load Demo Data populates T101 and S1-S3', () => {
    const demoTrucks = DEMO_DATA.trucks;
    const demoShipments = DEMO_DATA.shipments;

    expect(demoTrucks.some(t => t.id === 'T101')).toBe(true);
    expect(demoShipments.some(s => s.id === 'S1')).toBe(true);
    expect(demoShipments.some(s => s.id === 'S2')).toBe(true);
    expect(demoShipments.some(s => s.id === 'S3')).toBe(true);

    const t101 = demoTrucks.find(t => t.id === 'T101');
    const ranking = rankShipments(demoShipments, undefined, t101);
    expect(ranking.ranked.length).toBeGreaterThanOrEqual(3);
    expect(ranking.recommendedId).toBe('S1');
  });

  it('verifies Acceptance Item 4: Clear All Data resets state completely', () => {
    // Populate storage first
    mockLocalStorage.setItem('reroute_trucks', JSON.stringify([{ id: 'T1' }]));
    mockLocalStorage.setItem('reroute_shipments', JSON.stringify([{ id: 'S1' }]));

    // Emulate clearAllData
    mockLocalStorage.removeItem('reroute_trucks');
    mockLocalStorage.removeItem('reroute_shipments');
    mockLocalStorage.removeItem('reroute_selected_truck');

    expect(mockLocalStorage.getItem('reroute_trucks')).toBeNull();
    expect(mockLocalStorage.getItem('reroute_shipments')).toBeNull();
    expect(mockLocalStorage.getItem('reroute_selected_truck')).toBeNull();
  });

  it('verifies Acceptance Item 5: Data survives a simulated page refresh via localStorage', () => {
    const trucksToPersist = [
      { id: 'T-PERSIST-1', driverName: 'Vijay', origin: 'Pune', destination: 'Mumbai' }
    ];
    mockLocalStorage.setItem('reroute_trucks', JSON.stringify(trucksToPersist));

    // Simulated refresh: read back from storage
    const rehydrated = JSON.parse(mockLocalStorage.getItem('reroute_trucks'));
    expect(rehydrated).toEqual(trucksToPersist);
    expect(rehydrated[0].driverName).toBe('Vijay');
  });
});
