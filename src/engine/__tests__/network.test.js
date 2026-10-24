import { describe, it, expect } from 'vitest';
import {
  createSupplier,
  createWarehouse,
  createBuyer,
  createRoute,
  createVehicle,
  createScenarioSettings,
  validateNetwork,
  cloneNetwork,
  findPaths,
  getEffectiveTravelTime,
  canVehicleTraverse,
  getNetworkSummary,
  ROUTE_STATUS,
  BUYER_PRIORITY,
} from '../network.js';

describe('Network Engine Module (src/engine/network.js)', () => {
  it('creates valid suppliers with normalized locations', () => {
    const s = createSupplier({
      id: 'sup-1',
      name: 'Agro Supplier',
      location: [20.0, 73.7],
      supplyLimit: 1000,
      product: 'Grapes',
    });
    expect(s.id).toBe('sup-1');
    expect(s.location.lat).toBe(20.0);
    expect(s.location.lng).toBe(73.7);
    expect(s.supplyLimit).toBe(1000);
  });

  it('creates valid warehouse and clamps stock to storageLimit', () => {
    const w = createWarehouse({
      id: 'wh-1',
      name: 'Central Depot',
      location: { name: 'Satpur', lat: 20.0, lng: 73.7 },
      stock: 1200,
      storageLimit: 1000,
    });
    expect(w.stock).toBe(1000); // Clamped to storageLimit
    expect(w.storageLimit).toBe(1000);
  });

  it('creates buyer with correct priority and default deadline', () => {
    const b = createBuyer({
      id: 'buy-1',
      name: 'Hospital',
      location: { lat: 19.2, lng: 72.9 },
      demandQty: 300,
      deadline: 6,
      priority: 'high',
    });
    expect(b.priority).toBe(BUYER_PRIORITY.HIGH);
    expect(b.deadline).toBe(6);
  });

  it('creates route and computes effective travel times for open, slow, closed', () => {
    const rOpen = createRoute({
      id: 'r1',
      from: 'wh-1',
      to: 'buy-1',
      distanceKm: 100,
      baseTravelTimeH: 2.0,
      status: ROUTE_STATUS.OPEN,
      speedFactor: 1.0,
    });
    expect(getEffectiveTravelTime(rOpen)).toBe(2.0);

    const rSlow = createRoute({
      id: 'r2',
      from: 'wh-1',
      to: 'buy-1',
      distanceKm: 100,
      baseTravelTimeH: 2.0,
      status: ROUTE_STATUS.SLOW,
      speedFactor: 1.0,
    });
    expect(getEffectiveTravelTime(rSlow)).toBe(4.0); // 2 / (1 * 0.5)

    const rClosed = createRoute({
      id: 'r3',
      from: 'wh-1',
      to: 'buy-1',
      distanceKm: 100,
      baseTravelTimeH: 2.0,
      status: ROUTE_STATUS.CLOSED,
    });
    expect(getEffectiveTravelTime(rClosed)).toBe(Infinity);
  });

  it('checks vehicle weight and banned type restrictions on routes', () => {
    const heavyRoute = createRoute({
      id: 'r-bridge',
      from: 'wh-1',
      to: 'wh-2',
      restrictions: { maxVehicleWeightTons: 10, bannedVehicleTypes: ['Trailer (20T)'] },
    });

    const lightVeh = createVehicle({ id: 'v1', weightTons: 6, type: 'Medium Truck' });
    const heavyVeh = createVehicle({ id: 'v2', weightTons: 16, type: 'Trailer (20T)' });

    expect(canVehicleTraverse(heavyRoute, lightVeh)).toBe(true);
    expect(canVehicleTraverse(heavyRoute, heavyVeh)).toBe(false);
  });

  it('finds paths with backup/alternate paths between nodes', () => {
    const network = {
      suppliers: [createSupplier({ id: 's1', location: [20, 73] })],
      warehouses: [
        createWarehouse({ id: 'w1', location: [20, 73] }),
        createWarehouse({ id: 'w2', location: [19.5, 73] }),
      ],
      buyers: [createBuyer({ id: 'b1', location: [19, 72.8] })],
      routes: [
        createRoute({ id: 'r1', from: 'w1', to: 'b1', distanceKm: 120, baseTravelTimeH: 3.0 }),
        createRoute({ id: 'r2', from: 'w1', to: 'w2', distanceKm: 50, baseTravelTimeH: 1.0 }),
        createRoute({ id: 'r3', from: 'w2', to: 'b1', distanceKm: 60, baseTravelTimeH: 1.2 }),
      ],
      vehicles: [createVehicle({ id: 'v1', availableFrom: 'w1' })],
    };

    const paths = findPaths(network, 'w1', 'b1', 3);
    expect(paths.length).toBe(2);
    // Direct path: r1 (3h)
    // Alternate 2-hop path: r2 -> r3 (2.2h)
    expect(paths[0].hops).toBe(2); // 2.2h is faster than 3h
    expect(paths[1].hops).toBe(1);
  });

  it('validates a network correctly and catches disconnected or duplicate ids', () => {
    const invalidNet = {
      suppliers: [{ id: 'dup' }],
      warehouses: [{ id: 'dup' }],
      buyers: [],
      routes: [{ id: 'r1', from: 'missing-a', to: 'missing-b' }],
      vehicles: [],
    };
    const res = validateNetwork(invalidNet);
    expect(res.isValid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('clones a network deeply without reference leaks', () => {
    const original = {
      warehouses: [{ id: 'w1', stock: 500 }],
      routes: [{ id: 'r1', status: 'open' }],
    };
    const copy = cloneNetwork(original);
    copy.warehouses[0].stock = 0;
    copy.routes[0].status = 'closed';

    expect(original.warehouses[0].stock).toBe(500);
    expect(original.routes[0].status).toBe('open');
  });

  it('computes network summary metrics correctly', () => {
    const net = {
      suppliers: [createSupplier({ id: 's1', supplyLimit: 500 })],
      warehouses: [createWarehouse({ id: 'w1', stock: 300, storageLimit: 600 })],
      buyers: [createBuyer({ id: 'b1', demandQty: 150 })],
      routes: [
        createRoute({ id: 'r1', from: 's1', to: 'w1', status: ROUTE_STATUS.OPEN }),
        createRoute({ id: 'r2', from: 'w1', to: 'b1', status: ROUTE_STATUS.SLOW }),
      ],
      vehicles: [createVehicle({ id: 'v1', capacity: 100, availability: 2 })],
      settings: createScenarioSettings({ demandMultiplier: 1.0 }),
    };

    const summary = getNetworkSummary(net);
    expect(summary.suppliersCount).toBe(1);
    expect(summary.totalStock).toBe(300);
    expect(summary.totalDemand).toBe(150);
    expect(summary.totalFleetCapacity).toBe(200);
    expect(summary.openRoutes).toBe(1);
    expect(summary.slowRoutes).toBe(1);
  });
});
