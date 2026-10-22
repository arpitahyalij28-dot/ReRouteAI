import { describe, it, expect } from 'vitest';
import { LocalDemoAdapter } from '../src/data/repository.js';
import { evaluateShipments } from '../src/engine/matching.js';
import { executeRecovery } from '../src/engine/recovery.js';
import { calculateSustainability } from '../src/engine/sustainability.js';

describe('7-Stage Live Demo Flow Verification', () => {
  it('runs complete 2-minute demo lifecycle with 100% computed fidelity', async () => {
    const adapter = new LocalDemoAdapter();
    await adapter.resetToDemo();

    // -------------------------------------------------------------
    // Stage 1: Initial Truck Inbound State (T101)
    // -------------------------------------------------------------
    const trucks = await adapter.getTrucks();
    const t101 = trucks.find((t) => t.id === 'T101');
    expect(t101).toBeDefined();
    expect(t101.origin).toContain('Nashik');
    expect(t101.destination).toContain('Mumbai');
    expect(t101.emptyReturnProbability).toBe(87);

    const initialShipments = await adapter.getShipments();
    expect(initialShipments.length).toBeGreaterThanOrEqual(15);

    // -------------------------------------------------------------
    // Stage 2: Dynamic Multi-Criteria Evaluation (S1 Top Match)
    // -------------------------------------------------------------
    const initialEvaluations = evaluateShipments(t101, initialShipments);
    const topMatch = initialEvaluations.find((e) => e.isRecommended);

    expect(topMatch).toBeDefined();
    expect(topMatch.shipmentId).toBe('S1');
    expect(topMatch.isFeasible).toBe(true);
    expect(topMatch.detourKm).toBeGreaterThan(0);
    expect(topMatch.factors.detour.rawScore).toBeGreaterThan(0);
    expect(topMatch.factors.time.rawScore).toBeGreaterThan(0);

    // -------------------------------------------------------------
    // Stage 3: Disruption Injected (Shipper Cancels S1 Tender)
    // -------------------------------------------------------------
    await adapter.updateShipmentStatus('S1', 'Cancelled', {
      whyWhyNot: {
        recommendedSummary: 'Cancelled: Spot load tender revoked by Bhiwandi shipper.',
        reasons: [{ type: 'cross', title: 'Tender Cancelled', description: 'Cancelled by shipper.' }],
      },
    });
    await adapter.createDisruptionEvent({
      type: 'CANCELLATION',
      shipmentId: 'S1',
      payload: { reason: 'Bay congestion / tender revoked' },
    });

    const disruptedShipments = await adapter.getShipments();
    const s1Disrupted = disruptedShipments.find((s) => s.id === 'S1');
    expect(s1Disrupted.isCancelled).toBe(true);
    expect(s1Disrupted.status).toBe('Cancelled');

    // -------------------------------------------------------------
    // Stage 4: Autonomous Proactive Recovery Engine Re-ranks S2
    // -------------------------------------------------------------
    const recoveryResult = await executeRecovery(t101, 'S1', disruptedShipments);
    expect(recoveryResult.success).toBe(true);
    expect(recoveryResult.newRecommendation?.shipmentId).toBe('S2');

    // S2 is now top recommended
    const s2Rec = recoveryResult.newRecommendation;
    expect(s2Rec).toBeDefined();
    expect(s2Rec.isFeasible).toBe(true);
    expect(s2Rec.isRecommended).toBe(true);
    expect(s2Rec.matchScore).toBeGreaterThanOrEqual(80);

    // Remaining evaluations exclude cancelled S1
    expect(recoveryResult.newEvaluations.some((e) => e.shipmentId === 'S1')).toBe(false);

    // -------------------------------------------------------------
    // Stage 5: Dispatcher Commits Assignment (T101 -> S2)
    // -------------------------------------------------------------
    const newAssignment = await adapter.createAssignment({
      truckId: t101.id,
      shipmentId: 'S2',
      matchScore: s2Rec.matchScore,
      detourKm: s2Rec.detourKm,
      loadedKm: s2Rec.loadedKm,
      costGain: s2Rec.sustainability?.costSavedInr || 24000,
    });

    expect(newAssignment.id).toBeDefined();
    expect(newAssignment.truckId).toBe('T101');
    expect(newAssignment.shipmentId).toBe('S2');

    // -------------------------------------------------------------
    // Stage 6: Verify S2 Marked Assigned & Empty Haul Risk Mitigated
    // -------------------------------------------------------------
    const postAssignShipments = await adapter.getShipments();
    const s2Assigned = postAssignShipments.find((s) => s.id === 'S2');
    expect(s2Assigned.status).toBe('Assigned');

    // Compute sustainability metrics
    const impact = calculateSustainability({
      distanceKm: 140,
      detourKm: s2Rec.detourKm,
      mileage: t101.vehicleMileageKmPerL || 4.0,
      fuelPrice: t101.fuelPricePerL || 95,
      shipmentValue: s2Assigned.freightOfferInr || 28000,
    });

    expect(impact.fuelSavedLitres).toBeGreaterThan(0);
    expect(impact.co2AvoidedKg).toBeGreaterThan(0);
    expect(impact.costSavedInr).toBeGreaterThan(0);
    expect(impact.netEconomicGain).toBeGreaterThan(0);

    // -------------------------------------------------------------
    // Stage 7: Explainability Justification
    // -------------------------------------------------------------
    expect(s2Rec.whyWhyNot).toBeDefined();
    expect(s2Rec.whyWhyNot.reasons.length).toBeGreaterThan(0);
    expect(s2Rec.whyWhyNot.recommendedSummary).toBeTruthy();
  });

  it('runs successfully when T101 and S1 are completely absent (purely dynamic)', async () => {
    const adapter = new LocalDemoAdapter();
    await adapter.resetToDemo();

    const allTrucks = await adapter.getTrucks();
    const allShipments = await adapter.getShipments();

    // Explicitly filter out T101 and S1
    const customTrucks = allTrucks.filter((t) => t.id !== 'T101');
    const customShipments = allShipments.filter((s) => s.id !== 'S1');

    expect(customTrucks.length).toBeGreaterThan(0);
    expect(customShipments.length).toBeGreaterThan(0);

    const testTruck = customTrucks[0];
    expect(testTruck.id).not.toBe('T101');

    // Multi-criteria evaluation works dynamically on any truck/shipments
    const evaluations = evaluateShipments(testTruck, customShipments);
    expect(evaluations.length).toBe(customShipments.length);

    const feasible = evaluations.filter((e) => e.isFeasible);
    expect(feasible.length).toBeGreaterThan(0);

    const topPick = evaluations.find((e) => e.isRecommended);
    expect(topPick).toBeDefined();
    expect(topPick.shipmentId).not.toBe('S1');

    // Simulate cancellation of this dynamic top pick
    const recovery = await executeRecovery(testTruck, topPick.shipmentId, customShipments);
    expect(recovery.success).toBe(true);
    expect(recovery.newRecommendation).toBeDefined();
    expect(recovery.newRecommendation.shipmentId).not.toBe(topPick.shipmentId);
  });
});
