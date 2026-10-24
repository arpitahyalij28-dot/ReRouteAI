import { describe, it, expect } from 'vitest';
import { LocalDemoAdapter } from '../src/data/repository.js';
import {
  createSupplier,
  createWarehouse,
  createBuyer,
  createRoute,
  createVehicle,
  getNetworkSummary,
  findPaths,
  ROUTE_STATUS,
  BUYER_PRIORITY,
} from '../src/engine/network.js';

describe('Phase 2: Supply Network Engine & Repository Integration', () => {
  it('retrieves full supply network from LocalDemoAdapter with DEMO DATA', async () => {
    const adapter = new LocalDemoAdapter();
    const net = await adapter.getNetwork();

    expect(net).toBeDefined();
    expect(net.metadata.label).toBe('DEMO DATA');
    expect(net.suppliers.length).toBe(3);
    expect(net.warehouses.length).toBe(3);
    expect(net.buyers.length).toBe(6);
    expect(net.vehicles.length).toBeGreaterThanOrEqual(8);
    expect(net.routes.length).toBeGreaterThanOrEqual(20);

    const summary = getNetworkSummary(net);
    expect(summary.totalStock).toBeGreaterThan(0);
    expect(summary.totalDemand).toBeGreaterThan(0);
    expect(summary.openRoutes).toBeGreaterThan(15);
  });

  it('allows dynamic addition, modification and deletion of supply network entities', async () => {
    const adapter = new LocalDemoAdapter();
    const net = await adapter.getNetwork();

    // 1. Add a new buyer
    const newBuyer = createBuyer({
      id: 'buy-test-clinic',
      name: 'Nashik Suburban Rural Clinic',
      location: { name: 'Dindori Phata', lat: 20.08, lng: 73.81 },
      demandQty: 180,
      deadline: 6,
      priority: BUYER_PRIORITY.HIGH,
    });
    net.buyers.push(newBuyer);

    // 2. Add route to this buyer from Satpur
    const newRoute = createRoute({
      id: 'r-satpur-test-clinic',
      from: 'wh-satpur',
      to: 'buy-test-clinic',
      name: 'Satpur to Suburban Clinic Direct Line',
      distanceKm: 18,
      baseTravelTimeH: 0.6,
      status: ROUTE_STATUS.OPEN,
    });
    net.routes.push(newRoute);

    // 3. Save modified network
    const saved = await adapter.saveNetwork(net);
    expect(saved.buyers.find((b) => b.id === 'buy-test-clinic')).toBeDefined();

    // 4. Verify pathfinding to new buyer
    const paths = findPaths(saved, 'wh-satpur', 'buy-test-clinic', 2);
    expect(paths.length).toBe(1);
    expect(paths[0].totalDistanceKm).toBe(18);

    // 5. Update route status to SLOW and verify
    const route = saved.routes.find((r) => r.id === 'r-satpur-test-clinic');
    route.status = ROUTE_STATUS.SLOW;
    await adapter.saveNetwork(saved);

    const reloaded = await adapter.getNetwork();
    const updatedRoute = reloaded.routes.find((r) => r.id === 'r-satpur-test-clinic');
    expect(updatedRoute.status).toBe(ROUTE_STATUS.SLOW);

    // 6. Delete entity
    reloaded.buyers = reloaded.buyers.filter((b) => b.id !== 'buy-test-clinic');
    reloaded.routes = reloaded.routes.filter((r) => r.id !== 'r-satpur-test-clinic');
    await adapter.saveNetwork(reloaded);

    const cleanNet = await adapter.getNetwork();
    expect(cleanNet.buyers.find((b) => b.id === 'buy-test-clinic')).toBeUndefined();
  });

  it('resets cleanly to baseline demo network on resetToDemo()', async () => {
    const adapter = new LocalDemoAdapter();
    const net = await adapter.getNetwork();

    // Mutate
    net.warehouses[0].stock = 0;
    await adapter.saveNetwork(net);

    const mutated = await adapter.getNetwork();
    expect(mutated.warehouses[0].stock).toBe(0);

    // Reset
    await adapter.resetToDemo();
    const restored = await adapter.getNetwork();
    expect(restored.warehouses[0].stock).toBeGreaterThan(0);
  });
});
