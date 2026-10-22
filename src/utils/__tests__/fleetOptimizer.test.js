// ReRoute AI 2.0 - Multi-Truck Fleet Optimizer Unit & Acceptance Test Suite
import { describe, it, expect } from 'vitest';
import { optimizeFleetGlobal } from '../fleetOptimizer';
import { DEMO_DATA, INITIAL_TRUCKS, INITIAL_SHIPMENTS } from '../../data/mockData';

describe('Global Fleet Optimization Engine (Hungarian Bipartite Solver)', () => {
  it('handles empty state gracefully with zero trucks or shipments without crashing', () => {
    const emptyResult1 = optimizeFleetGlobal([], []);
    expect(emptyResult1.assignments).toEqual([]);
    expect(emptyResult1.fleetSustainability.totalEmptyKmAvoided).toBe(0);
    expect(emptyResult1.fleetSustainability.totalCostSavedInr).toBe(0);
    expect(emptyResult1.fleetSustainability.perTruckBreakdown).toEqual([]);

    const emptyResult2 = optimizeFleetGlobal(INITIAL_TRUCKS, []);
    expect(emptyResult2.assignments).toEqual([]);
    expect(emptyResult2.unassignedTrucks.length).toBe(INITIAL_TRUCKS.length);
  });

  it('Checklist Item 1: With 6+ trucks and 8+ shipments loaded, NO shipment is recommended as primary to two trucks', () => {
    expect(DEMO_DATA.trucks.length).toBeGreaterThanOrEqual(6);
    expect(DEMO_DATA.shipments.length).toBeGreaterThanOrEqual(8);

    const result = optimizeFleetGlobal(DEMO_DATA.trucks, DEMO_DATA.shipments, DEMO_DATA.settings);

    expect(result.assignments.length).toBeGreaterThan(0);

    // Track assigned shipments
    const seenShipments = new Set();
    const primaryRecommendations = [];

    for (const asg of result.assignments) {
      expect(seenShipments.has(asg.shipmentId)).toBe(false);
      seenShipments.add(asg.shipmentId);
    }

    // Verify across all truckRankings that each recommendedId is unique
    for (const [truckId, plan] of Object.entries(result.truckRankings)) {
      if (plan.recommendedId) {
        expect(primaryRecommendations).not.toContain(plan.recommendedId);
        primaryRecommendations.push(plan.recommendedId);
      }
    }
  });

  it('Checklist Item 1 & Conflict Resolution: T101 and T107 contention for S1', () => {
    const t101 = DEMO_DATA.trucks.find((t) => t.id === 'T101');
    const t107 = DEMO_DATA.trucks.find((t) => t.id === 'T107');
    expect(t101).toBeDefined();
    expect(t107).toBeDefined();

    const result = optimizeFleetGlobal([t101, t107], DEMO_DATA.shipments, DEMO_DATA.settings);

    // One of them gets S1, the other gets another shipment or backup
    const asgT101 = result.assignmentsByTruckId['T101'];
    const asgT107 = result.assignmentsByTruckId['T107'];

    expect(asgT101).toBeDefined();
    expect(asgT107).toBeDefined();
    // They must NOT have the same shipment
    expect(asgT101.shipmentId).not.toEqual(asgT107.shipmentId);

    // Conflict map should record the contention
    if (result.conflictMap['T107']) {
      expect(result.conflictMap['T107'].winnerTruckId).toBe('T101');
      expect(result.conflictMap['T107'].reason).toBeTruthy();
    }
  });

  it('Checklist Item 4: Cancelling a load triggers a visible fleet-wide reassignment', () => {
    // Initial optimal run
    const baseline = optimizeFleetGlobal(DEMO_DATA.trucks, DEMO_DATA.shipments, DEMO_DATA.settings);
    const assignedBefore = baseline.assignmentsByTruckId['T101'];
    expect(assignedBefore).toBeDefined();
    const targetShipmentId = assignedBefore.shipmentId; // S1

    // Simulate cancellation of S1
    const disruptedShipments = DEMO_DATA.shipments.map((s) =>
      s.id === targetShipmentId ? { ...s, isCancelled: true, status: 'Cancelled' } : s
    );

    const reallocated = optimizeFleetGlobal(DEMO_DATA.trucks, disruptedShipments, DEMO_DATA.settings);

    // T101 must be reallocated to an alternative load (e.g. S2)
    const assignedAfter = reallocated.assignmentsByTruckId['T101'];
    expect(assignedAfter).toBeDefined();
    expect(assignedAfter.shipmentId).not.toBe(targetShipmentId);
    expect(reallocated.latencyMs).toBeLessThan(450); // Well under 450ms target
  });

  it('Checklist Item 5: Fleet-level sustainability numbers strictly equal the sum of per-truck numbers', () => {
    const result = optimizeFleetGlobal(DEMO_DATA.trucks, DEMO_DATA.shipments, DEMO_DATA.settings);

    const breakdown = result.fleetSustainability.perTruckBreakdown;
    expect(breakdown.length).toBe(DEMO_DATA.trucks.length);

    let sumEmptyKm = 0;
    let sumFuelSaved = 0;
    let sumCostSaved = 0;
    let sumCo2 = 0;

    for (const row of breakdown) {
      sumEmptyKm += row.emptyKmAvoided;
      sumFuelSaved += row.fuelSavedLitres;
      sumCostSaved += row.costSavedInr;
      sumCo2 += row.co2ReducedKg;
    }

    sumEmptyKm = Math.round(sumEmptyKm * 10) / 10;
    sumFuelSaved = Math.round(sumFuelSaved * 10) / 10;
    sumCostSaved = Math.round(sumCostSaved);
    sumCo2 = Math.round(sumCo2 * 10) / 10;

    expect(result.fleetSustainability.totalEmptyKmAvoided).toBe(sumEmptyKm);
    expect(result.fleetSustainability.totalFuelSavedLitres).toBe(sumFuelSaved);
    expect(result.fleetSustainability.totalCostSavedInr).toBe(sumCostSaved);
    expect(result.fleetSustainability.totalCo2ReducedKg).toBe(sumCo2);
  });

  it('Checklist Item 6: A single-truck setup still works exactly like before', () => {
    const singleTruck = DEMO_DATA.trucks.find((t) => t.id === 'T101');
    const result = optimizeFleetGlobal([singleTruck], DEMO_DATA.shipments, DEMO_DATA.settings);

    expect(result.assignments.length).toBe(1);
    expect(result.assignments[0].truckId).toBe('T101');
    expect(result.assignments[0].shipmentId).toBe('S1');

    const t101Plan = result.truckRankings['T101'];
    expect(t101Plan).toBeDefined();
    expect(t101Plan.recommendedId).toBe('S1');
    expect(t101Plan.ranked.find((r) => r.shipmentId === 'S1')?.isRecommended).toBe(true);
    expect(t101Plan.ranked.find((r) => r.shipmentId === 'S2')?.isRecommended).toBe(false);
  });
});
