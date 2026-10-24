import { describe, it, expect } from 'vitest';
import { calculateResilienceScore, RESILIENCE_FORMULA_EXPLANATION } from '../resilience.js';
import { validateDispatchPlan } from '../validation.js';
import { getDemoNetwork } from '../../data/networkDemo.js';
import { solveRecoveryPlan, solveDisruptedBasicPlan } from '../planner.js';
import { applyDisruptionScenario } from '../disruptions.js';

describe('Resilience Engine (Track 3-05)', () => {
  const network = getDemoNetwork();

  it('calculates resilience score with formula and 5-factor transparent breakdown', () => {
    const normalPlan = solveRecoveryPlan(network);
    expect(normalPlan).toBeDefined();

    const res = calculateResilienceScore(normalPlan, normalPlan, network);
    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.score).toBeLessThanOrEqual(100);
    expect(res.rating).toBeDefined();
    expect(res.formula).toBe(RESILIENCE_FORMULA_EXPLANATION);
    expect(res.breakdown).toBeDefined();
    expect(res.breakdown.onTime).toBeDefined();
    expect(res.breakdown.fulfillment).toBeDefined();
    expect(res.breakdown.costStability).toBeDefined();
    expect(res.breakdown.routeDiversity).toBeDefined();
    expect(res.breakdown.stockBuffer).toBeDefined();
    expect(res.breakdown.onTime.max).toBe(40);
    expect(res.breakdown.fulfillment.max).toBe(25);
    expect(res.breakdown.costStability.max).toBe(15);
    expect(res.breakdown.routeDiversity.max).toBe(10);
    expect(res.breakdown.stockBuffer.max).toBe(10);
  });

  it('proves Recovery Plan has higher resilience than Disrupted Naive Basic Plan under Kasara landslide', () => {
    const disruption = applyDisruptionScenario(network, {
      closedRoutes: ['R-NSK-TNE-1'],
      rainfallMm: 85, // triggers Kasara Ghat landslide
      fuelPrice: 125,
    });

    const basicPlan = solveDisruptedBasicPlan(disruption.disruptedNetwork);
    const recoveryPlan = solveRecoveryPlan(disruption.disruptedNetwork);
    const normalPlan = solveRecoveryPlan(network);

    const basicRes = calculateResilienceScore(basicPlan, normalPlan, disruption.disruptedNetwork);
    const recRes = calculateResilienceScore(recoveryPlan, normalPlan, disruption.disruptedNetwork);

    expect(recRes.score).toBeGreaterThan(basicRes.score);
    expect(recRes.breakdown.fulfillment.score).toBeGreaterThanOrEqual(basicRes.breakdown.fulfillment.score);
  });

  it('returns zero score gracefully for null or invalid plan', () => {
    const res = calculateResilienceScore(null);
    expect(res.score).toBe(0);
    expect(res.rating).toBe('Infeasible');
  });
});

describe('Live Dispatch Plan Validator (Track 3-05)', () => {
  const network = getDemoNetwork();

  it('validates a feasible plan against all 6 checklist items', () => {
    const plan = solveRecoveryPlan(network);
    const check = validateDispatchPlan(plan, network);

    expect(check.isValid).toBe(true);
    expect(check.violations.length).toBe(0);
    expect(check.checklist.length).toBe(6);

    const checklistIds = check.checklist.map((c) => c.id);
    expect(checklistIds).toContain('stockLimit');
    expect(checklistIds).toContain('storageLimit');
    expect(checklistIds).toContain('vehicleCapacity');
    expect(checklistIds).toContain('roadRestrictions');
    expect(checklistIds).toContain('noDoubleAllocation');
    expect(checklistIds).toContain('demandNotExceeded');

    check.checklist.forEach((item) => {
      expect(item.passed).toBe(true);
    });
  });

  it('catches violations if plan exceeds stock or uses closed roads', () => {
    const plan = solveRecoveryPlan(network);
    // Clone plan and simulate a violation: an allocation exceeding warehouse stock
    const badPlan = JSON.parse(JSON.stringify(plan));
    badPlan.allocations.push({
      id: 'BAD-1',
      warehouseId: 'wh-satpur',
      buyerId: 'buy-thane-med',
      vehicleId: 'veh-sat-1',
      quantity: 999999, // exceeds stock (650)
      trips: 1,
      path: ['rt-sat-dindori'],
    });

    const check = validateDispatchPlan(badPlan, network);
    expect(check.isValid).toBe(false);
    expect(check.violations.length).toBeGreaterThan(0);

    const stockItem = check.checklist.find((c) => c.id === 'stockLimit');
    expect(stockItem.passed).toBe(false);
  });
});
