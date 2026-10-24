import { describe, it, expect } from 'vitest';
import { getDemoNetwork } from '../../data/networkDemo.js';
import {
  applyDisruptionScenario,
  DEFAULT_DISRUPTIONS,
  DISRUPTION_TYPES,
} from '../disruptions.js';
import { ROUTE_STATUS } from '../network.js';

describe('Problem Simulator Engine (src/engine/disruptions.js)', () => {
  it('never mutates the base network when applying disruptions', () => {
    const base = getDemoNetwork();
    const originalStock = base.warehouses[0].stock;
    const originalRouteStatus = base.routes[0].status;

    const result = applyDisruptionScenario(base, {
      roadClosed: { enabled: true, routeId: base.routes[0].id, status: ROUTE_STATUS.CLOSED },
      warehouseStockLow: {
        enabled: true,
        warehouseId: base.warehouses[0].id,
        reductionPct: 80,
      },
    });

    // Base network MUST remain untouched
    expect(base.warehouses[0].stock).toBe(originalStock);
    expect(base.routes[0].status).toBe(originalRouteStatus);

    // Disrupted copy reflects changes
    expect(result.disruptedNetwork.warehouses[0].stock).toBeLessThan(originalStock);
    expect(result.disruptedNetwork.routes[0].status).toBe(ROUTE_STATUS.CLOSED);
  });

  it('applies road closure disruption correctly', () => {
    const base = getDemoNetwork();
    const result = applyDisruptionScenario(base, {
      roadClosed: {
        enabled: true,
        routeId: 'r-igatpuri-bhiwandi',
        status: ROUTE_STATUS.CLOSED,
      },
    });

    expect(result.isDisrupted).toBe(true);
    expect(result.affectedRoutes.length).toBe(1);
    expect(result.affectedRoutes[0].id).toBe('r-igatpuri-bhiwandi');
    expect(result.affectedRoutes[0].newStatus).toBe(ROUTE_STATUS.CLOSED);
  });

  it('applies warehouse stock reduction by percentage', () => {
    const base = getDemoNetwork();
    const wh = base.warehouses.find((w) => w.id === 'wh-bhiwandi');
    const initialStock = wh.stock;

    const result = applyDisruptionScenario(base, {
      warehouseStockLow: {
        enabled: true,
        warehouseId: 'wh-bhiwandi',
        reductionPct: 60,
      },
    });

    const disruptedWh = result.disruptedNetwork.warehouses.find((w) => w.id === 'wh-bhiwandi');
    expect(disruptedWh.stock).toBe(Math.round(initialStock * 0.4));
    expect(result.affectedWarehouses[0].reductionPct).toBe(60);
  });

  it('applies demand spike to buyer', () => {
    const base = getDemoNetwork();
    const buyer = base.buyers.find((b) => b.id === 'buy-thane-med');
    const initialDemand = buyer.demandQty;

    const result = applyDisruptionScenario(base, {
      demandSpike: {
        enabled: true,
        buyerId: 'buy-thane-med',
        spikePct: 50,
      },
    });

    const disruptedBuyer = result.disruptedNetwork.buyers.find((b) => b.id === 'buy-thane-med');
    expect(disruptedBuyer.demandQty).toBe(Math.round(initialDemand * 1.5));
    expect(result.affectedBuyers[0].spikePct).toBe(50);
  });

  it('applies fuel price increase and updates vehicle operating costs', () => {
    const base = getDemoNetwork();
    const initialPrice = base.settings.fuelPricePerLitre;
    const initialCostPerKm = base.vehicles[0].costPerKm;

    const result = applyDisruptionScenario(base, {
      fuelPriceUp: {
        enabled: true,
        increasePct: 30,
      },
    });

    expect(result.fuelImpact.increasePct).toBe(30);
    expect(result.disruptedNetwork.settings.fuelPricePerLitre).toBeGreaterThan(initialPrice);
    expect(result.disruptedNetwork.vehicles[0].costPerKm).toBeGreaterThan(initialCostPerKm);
  });

  it('applies heavy rain with severity threshold closing high-risk Ghat routes', () => {
    const base = getDemoNetwork();

    // High severity rain (>= 80%) should close Ghat corridors
    const resultHigh = applyDisruptionScenario(base, {
      heavyRain: {
        enabled: true,
        severityPct: 90,
      },
    });

    const closedGhat = resultHigh.affectedRoutes.find(
      (r) => r.id === 'r-igatpuri-bhiwandi' && r.newStatus === ROUTE_STATUS.CLOSED
    );
    expect(closedGhat).toBeDefined();

    // Mild severity rain (< 80%) should slow routes
    const resultMild = applyDisruptionScenario(base, {
      heavyRain: {
        enabled: true,
        severityPct: 50,
      },
    });

    const slowedGhat = resultMild.affectedRoutes.find(
      (r) => r.id === 'r-igatpuri-bhiwandi' && r.newStatus === ROUTE_STATUS.SLOW
    );
    expect(slowedGhat).toBeDefined();
  });

  it('combines multiple simultaneous disruptions (multi-disruption)', () => {
    const base = getDemoNetwork();
    const result = applyDisruptionScenario(base, {
      roadClosed: { enabled: true, routeId: 'r-bhiwandi-thane', status: ROUTE_STATUS.CLOSED },
      warehouseStockLow: { enabled: true, warehouseId: 'wh-satpur', reductionPct: 50 },
      fuelPriceUp: { enabled: true, increasePct: 20 },
      heavyRain: { enabled: true, severityPct: 85 },
    });

    expect(result.isDisrupted).toBe(true);
    expect(result.affectedRoutes.length).toBeGreaterThan(1);
    expect(result.affectedWarehouses.length).toBe(1);
    expect(result.fuelImpact).not.toBeNull();
    expect(result.affectedDeliveries.length).toBeGreaterThan(0);
  });
});
