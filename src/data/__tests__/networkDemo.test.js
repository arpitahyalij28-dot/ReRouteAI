import { describe, it, expect } from 'vitest';
import { getDemoNetwork, DEMO_METADATA } from '../networkDemo.js';
import { validateNetwork, findPaths, BUYER_PRIORITY } from '../../engine/network.js';

describe('Regional Supply Network Demo Dataset (src/data/networkDemo.js)', () => {
  it('loads valid demo network with DEMO DATA metadata', () => {
    const net = getDemoNetwork();
    expect(net.metadata.label).toBe('DEMO DATA');
    expect(net.metadata.isDemo).toBe(true);

    const validation = validateNetwork(net);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('contains expected counts: ~3 suppliers, 3 warehouses, 6 buyers, 9 vehicles, 22 routes', () => {
    const net = getDemoNetwork();
    expect(net.suppliers).toHaveLength(3);
    expect(net.warehouses).toHaveLength(3);
    expect(net.buyers).toHaveLength(6);
    expect(net.vehicles.length).toBeGreaterThanOrEqual(8);
    expect(net.routes.length).toBeGreaterThanOrEqual(20);
  });

  it('ensures every critical buyer has at least one alternate path for resilience', () => {
    const net = getDemoNetwork();
    const criticalBuyers = net.buyers.filter((b) => b.priority === BUYER_PRIORITY.HIGH);

    expect(criticalBuyers.length).toBeGreaterThanOrEqual(2);

    criticalBuyers.forEach((buyer) => {
      // Check paths from all warehouses
      const allPaths = net.warehouses.flatMap((wh) => findPaths(net, wh.id, buyer.id, 3));
      expect(
        allPaths.length,
        `Critical buyer ${buyer.name} (${buyer.id}) must have at least 2 distinct routes`
      ).toBeGreaterThanOrEqual(2);
    });
  });

  it('ensures each warehouse has stationed vehicles', () => {
    const net = getDemoNetwork();
    net.warehouses.forEach((wh) => {
      const stationed = net.vehicles.filter((v) => v.availableFrom === wh.id);
      expect(
        stationed.length,
        `Warehouse ${wh.name} (${wh.id}) must have stationed vehicles`
      ).toBeGreaterThan(0);
    });
  });
});
