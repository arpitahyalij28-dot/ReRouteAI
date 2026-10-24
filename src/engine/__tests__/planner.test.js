import { describe, it, expect } from 'vitest';
import { getDemoNetwork } from '../../data/networkDemo.js';
import {
  solveRecoveryPlan,
  solveDisruptedBasicPlan,
  generatePlanComparison,
} from '../planner.js';
import { ROUTE_STATUS } from '../network.js';

describe('Resilient Recovery Solver (src/engine/planner.js)', () => {
  it('solves baseline normal plan with high fulfillment and zero constraint violations', () => {
    const net = getDemoNetwork();
    const plan = solveRecoveryPlan(net, { planType: 'normal' });

    expect(plan).toBeDefined();
    expect(plan.allocations.length).toBeGreaterThan(0);
    expect(plan.totals.onTimePct).toBeGreaterThanOrEqual(80);
    expect(plan.totals.totalDelivered).toBeGreaterThan(0);

    // Hard Constraint Check 1: Warehouse stock bounds
    const shippedPerWh = {};
    plan.allocations.forEach((a) => {
      shippedPerWh[a.warehouseId] = (shippedPerWh[a.warehouseId] || 0) + a.quantity;
    });

    net.warehouses.forEach((wh) => {
      const shipped = shippedPerWh[wh.id] || 0;
      expect(
        shipped,
        `Warehouse ${wh.id} outflow cannot exceed available stock`
      ).toBeLessThanOrEqual(wh.stock);
    });

    // Hard Constraint Check 2: Buyer demand upper bound
    const receivedPerBuyer = {};
    plan.allocations.forEach((a) => {
      receivedPerBuyer[a.buyerId] = (receivedPerBuyer[a.buyerId] || 0) + a.quantity;
    });

    net.buyers.forEach((b) => {
      const received = receivedPerBuyer[b.id] || 0;
      expect(received, `Buyer ${b.id} cannot receive more than demanded`).toBeLessThanOrEqual(
        b.demandQty
      );
    });

    // Hard Constraint Check 3: Discrete integer trips
    plan.allocations.forEach((a) => {
      expect(Number.isInteger(a.trips)).toBe(true);
      expect(a.trips).toBeGreaterThanOrEqual(1);
    });
  });

  it('demonstrates that Recovery Plan outperforms naive Disruption Basic plan during Kasara Ghat closure', () => {
    const base = getDemoNetwork();
    const disruptionConfig = {
      roadClosed: {
        enabled: true,
        routeId: 'r-igatpuri-bhiwandi',
        status: ROUTE_STATUS.CLOSED,
      },
      warehouseStockLow: {
        enabled: true,
        warehouseId: 'wh-bhiwandi',
        reductionPct: 70,
      },
    };

    const comparison = generatePlanComparison(base, disruptionConfig);
    const { normal, disruptionBasic, recovery } = comparison.plans;

    // Normal plan: High fulfillment
    expect(normal.totals.totalDelivered).toBeGreaterThan(1200);

    // Disrupted Basic: Severely damaged due to road closures and stock drops
    expect(disruptionBasic.totals.totalPending).toBeGreaterThan(0);

    // Recovery Plan: Recovers by rerouting and re-allocating
    expect(recovery.totals.totalDelivered).toBeGreaterThan(disruptionBasic.totals.totalDelivered);
    expect(recovery.totals.onTimePct).toBeGreaterThanOrEqual(disruptionBasic.totals.onTimePct);

    // Verifies that recovery allocations reroute through open bypasses
    const usedClosedRoutes = recovery.allocations.filter((a) =>
      a.path.includes('r-igatpuri-bhiwandi')
    );
    expect(usedClosedRoutes.length, 'Recovery plan must never use closed routes').toBe(0);
  });

  it('provides explicit pending reasons when delivery is constrained', () => {
    const net = getDemoNetwork();

    // Artificially deplete all warehouse stock
    net.warehouses.forEach((w) => {
      w.stock = 0;
    });

    const plan = solveRecoveryPlan(net);
    expect(plan.allocations.length).toBe(0);
    expect(plan.totals.pendingPct).toBe(100);

    // Check diagnosis
    const buyerResult = Object.values(plan.perBuyerResults)[0];
    expect(buyerResult.pendingQty).toBe(buyerResult.demandQty);
    expect(buyerResult.reasons.length).toBeGreaterThan(0);
    expect(buyerResult.reasons[0]).toContain('stock insufficient');
  });

  it('respects different optimization modes (cheapest vs fastest vs resilient)', () => {
    const net = getDemoNetwork();

    const planCheapest = solveRecoveryPlan(net, { mode: 'cheapest' });
    const planFastest = solveRecoveryPlan(net, { mode: 'fastest' });

    expect(planCheapest).toBeDefined();
    expect(planFastest).toBeDefined();
    expect(planCheapest.mode).toBe('cheapest');
    expect(planFastest.mode).toBe('fastest');
  });
});
