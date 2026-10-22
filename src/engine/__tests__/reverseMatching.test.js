// ReRoute AI 2.0 - Reverse Matching Engine Unit Tests
import { describe, it, expect } from 'vitest';
import { rankTrucksForShipment } from '../reverseMatching.js';
import { INITIAL_TRUCKS, INITIAL_SHIPMENTS } from '../../data/mockData.js';

describe('Reverse Matching Engine (src/engine/reverseMatching.js)', () => {
  const sampleShipment = {
    id: 'S1',
    name: 'Auto Components Tender',
    origin: 'Mumbai',
    destination: 'Nashik',
    pickupCoords: [19.076, 72.8777],
    dropCoords: [19.9975, 73.7898],
    weightTons: 8,
    cargoWeight: 8000,
    freightOfferInr: 28000,
    pickupWindowStart: '14:30',
    pickupWindowEnd: '17:00',
  };

  it('ranks available trucks with descending match scores and assigned ranks', () => {
    const results = rankTrucksForShipment(sampleShipment, INITIAL_TRUCKS);

    expect(results.length).toBe(INITIAL_TRUCKS.length);
    expect(results[0].rank).toBe(1);
    expect(results[0].matchScore).toBeGreaterThanOrEqual(results[1].matchScore);
    expect(results[0].isFeasible).toBe(true);
    expect(results[0].reasons.length).toBeGreaterThan(0);
  });

  it('calculates backhaul quote and positive shipper savings vs fresh trip pricing', () => {
    const results = rankTrucksForShipment(sampleShipment, INITIAL_TRUCKS);
    const topMatch = results[0];

    expect(topMatch.freshTripInr).toBeGreaterThan(0);
    expect(topMatch.backhaulQuoteInr).toBeGreaterThan(0);
    expect(topMatch.savingsInr).toBeGreaterThanOrEqual(0);
    expect(topMatch.savingsPct).toBeGreaterThanOrEqual(0);
    expect(topMatch.reasons.some((r) => r.includes('savings'))).toBe(true);
  });

  it('disqualifies trucks whose capacity cannot accommodate shipment payload', () => {
    const heavyShipment = {
      ...sampleShipment,
      id: 'S-HEAVY',
      weightTons: 16, // Exceeds standard 10t truck
    };

    const results = rankTrucksForShipment(heavyShipment, INITIAL_TRUCKS);

    // Any truck with capacity < 16t must have isFeasible === false
    const smallTrucks = results.filter((r) => r.capacityTons < 16);
    expect(smallTrucks.length).toBeGreaterThan(0);
    for (const r of smallTrucks) {
      expect(r.isFeasible).toBe(false);
      expect(r.matchScore).toBeLessThanOrEqual(35);
      expect(r.reasons.some((reason) => reason.includes('Overweight'))).toBe(true);
    }
  });

  it('penalizes and flags trucks arriving after dock cutoff window', () => {
    const tightShipment = {
      ...sampleShipment,
      pickupWindowStart: '08:00',
      pickupWindowEnd: '08:30', // Far in the past compared to afternoon truck positions
    };

    const results = rankTrucksForShipment(tightShipment, INITIAL_TRUCKS);
    for (const r of results) {
      if (r.etaBufferMinutes < -15) {
        expect(r.isFeasible).toBe(false);
      }
    }
  });

  it('gracefully returns empty array on empty inputs', () => {
    expect(rankTrucksForShipment(null, INITIAL_TRUCKS)).toEqual([]);
    expect(rankTrucksForShipment(sampleShipment, [])).toEqual([]);
    expect(rankTrucksForShipment(sampleShipment, null)).toEqual([]);
  });
});
