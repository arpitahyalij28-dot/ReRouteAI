import { describe, it, expect } from 'vitest';
import { computeControlTowerMetrics } from '../controlTower.js';
import { cloneNetwork, ROUTE_STATUS } from '../network.js';
import { getDemoNetwork } from '../../data/networkDemo.js';
import { INITIAL_TRUCKS, INITIAL_SHIPMENTS } from '../../data/mockData.js';

describe('Logistics Twin - Control Tower Calculation Engine', () => {
  it('1. returns null gracefully when network is empty or cleared', () => {
    expect(computeControlTowerMetrics(null)).toBeNull();
    expect(computeControlTowerMetrics({})).toBeNull();
    expect(computeControlTowerMetrics({ network: { warehouses: [], buyers: [] } })).toBeNull();
  });

  it('2. produces all five complete sections for demo network without NaN or crashes', () => {
    const metrics = computeControlTowerMetrics({
      network: getDemoNetwork(),
      trucks: INITIAL_TRUCKS,
      shipments: INITIAL_SHIPMENTS,
      assignments: [],
    });

    expect(metrics).toBeDefined();
    expect(metrics).not.toBeNull();

    // Section 1: Health
    expect(metrics.health).toBeDefined();
    expect(['HEALTHY', 'AT RISK', 'CRITICAL']).toContain(metrics.health.verdict.status);
    expect(typeof metrics.health.verdict.reason).toBe('string');
    expect(metrics.health.verdict.resilienceScore).toBeGreaterThanOrEqual(0);
    expect(metrics.health.kpis.activeShipments).toBeGreaterThan(0);
    expect(metrics.health.kpis.onTimeDeliveryPct).toBeGreaterThanOrEqual(0);
    expect(metrics.health.corridorStatus.total).toBeGreaterThan(0);

    // Section 2: Alerts
    expect(metrics.alerts).toBeDefined();
    expect(Array.isArray(metrics.alerts.alerts)).toBe(true);

    // Section 3: Inventory
    expect(metrics.inventory).toBeDefined();
    expect(metrics.inventory.kpis.coveragePct).toBeGreaterThan(0);
    expect(Array.isArray(metrics.inventory.depotStockChart)).toBe(true);
    expect(Array.isArray(metrics.inventory.buyerFulfillmentChart)).toBe(true);
    expect(Array.isArray(metrics.inventory.recommendedTransfers)).toBe(true);

    // Section 4: Fleet & Empty-Mile
    expect(metrics.fleet).toBeDefined();
    expect(metrics.fleet.kpis.capacityUtilisationPct).toBeGreaterThan(0);
    expect(Array.isArray(metrics.fleet.vehiclesByDepotChart)).toBe(true);
    expect(Array.isArray(metrics.fleet.matchedReturnLoads)).toBe(true);

    // Section 5: Cost & Performance
    expect(metrics.performance).toBeDefined();
    expect(metrics.performance.kpis.label).toBe('Model-based estimates');
    expect(Array.isArray(metrics.performance.etaVsDeadlineChart)).toBe(true);
    expect(metrics.performance.comparison.optimised).toBeDefined();
    expect(metrics.performance.comparison.baseline).toBeDefined();
  });

  it('3. turns status CRITICAL with reason and recommended action when corridor is closed and depot drained', () => {
    const disruptedNet = cloneNetwork(getDemoNetwork());

    // Close primary Kasara corridor
    const kasaraRoute = disruptedNet.routes.find((r) => r.id === 'r-kasara-descent');
    if (kasaraRoute) kasaraRoute.status = ROUTE_STATUS.CLOSED;

    // Drain Bhiwandi depot to 0
    const bhiwandi = disruptedNet.warehouses.find((w) => w.id === 'wh-bhiwandi');
    if (bhiwandi) bhiwandi.stock = 0;

    const metrics = computeControlTowerMetrics({
      network: disruptedNet,
      trucks: INITIAL_TRUCKS,
      shipments: INITIAL_SHIPMENTS,
      assignments: [],
    });

    expect(metrics.health.verdict.status).toBe('CRITICAL');
    expect(metrics.health.verdict.reason).toContain('Critical');

    // Verify alerts contain reason ("Why:") and action ("Do:")
    expect(metrics.alerts.alerts.length).toBeGreaterThan(0);
    const criticalAlert = metrics.alerts.alerts.find((a) => a.severity === 'Critical');
    expect(criticalAlert).toBeDefined();
    expect(criticalAlert.reason).toBeTruthy();
    expect(criticalAlert.action).toBeTruthy();
    expect(criticalAlert.link).toBeTruthy();
  });

  it('4. ensures no truck or load is suggested twice in Section 4 return load matching', () => {
    const metrics = computeControlTowerMetrics({
      network: getDemoNetwork(),
      trucks: INITIAL_TRUCKS,
      shipments: INITIAL_SHIPMENTS,
      assignments: [],
    });

    const matches = metrics.fleet.matchedReturnLoads;
    expect(matches.length).toBeGreaterThan(0);

    const truckIds = matches.map((m) => m.truckId);
    const loadIds = matches.map((m) => m.suggestedLoadId);

    // Check uniqueness
    expect(new Set(truckIds).size).toBe(truckIds.length);
    expect(new Set(loadIds).size).toBe(loadIds.length);
  });

  it('5. skips trucks that already have an active assignment', () => {
    // Assign T101 and T105
    const mockAssignments = [
      { id: 'A1', truckId: 'T101', shipmentId: 'S1' },
      { id: 'A2', truckId: 'T105', shipmentId: 'S2' },
    ];

    const metrics = computeControlTowerMetrics({
      network: getDemoNetwork(),
      trucks: INITIAL_TRUCKS,
      shipments: INITIAL_SHIPMENTS,
      assignments: mockAssignments,
    });

    const matches = metrics.fleet.matchedReturnLoads;
    const matchedTruckIds = matches.map((m) => m.truckId);

    expect(matchedTruckIds).not.toContain('T101');
    expect(matchedTruckIds).not.toContain('T105');
  });
});
