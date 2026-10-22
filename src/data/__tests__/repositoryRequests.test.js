// ReRoute AI 2.0 - Repository Truck Requests Unit Tests
import { describe, it, expect, beforeEach } from 'vitest';
import {
  LocalDemoAdapter,
  rowToTruckRequest,
  truckRequestToRow,
} from '../repository.js';

describe('Repository Truck Requests & Marketplace Reservations', () => {
  let adapter;

  beforeEach(() => {
    adapter = new LocalDemoAdapter();
  });

  it('initializes with empty truck requests list', async () => {
    const requests = await adapter.getTruckRequests();
    expect(Array.isArray(requests)).toBe(true);
  });

  it('creates a truck request with 10-minute hold lock and soft-reserves truck', async () => {
    const trucks = await adapter.getTrucks();
    const targetTruck = trucks[0];

    const req = await adapter.createTruckRequest({
      truckId: targetTruck.id,
      shipmentId: 'S1',
      offeredRateInr: 28000,
      quoteInr: 22400,
      savingsInr: 5600,
      detourKm: 8,
      etaBufferMinutes: 25,
    });

    expect(req.id).toBeDefined();
    expect(req.status).toBe('requested');
    expect(req.expiresAt).toBeDefined();

    // Verify target truck holds lock
    const updatedTrucks = await adapter.getTrucks();
    const heldTruck = updatedTrucks.find((t) => t.id === targetTruck.id);
    expect(heldTruck.requestStatus).toBe('requested');
    expect(heldTruck.holdExpiresAt).toBe(req.expiresAt);
  });

  it('accepts request, generates assignment, and marks truck Assigned', async () => {
    const req = await adapter.createTruckRequest({
      truckId: 'T101',
      shipmentId: 'S2',
      offeredRateInr: 25000,
      quoteInr: 21000,
      savingsInr: 4000,
      detourKm: 5,
    });

    const accepted = await adapter.updateTruckRequestStatus(req.id, 'accepted');
    expect(accepted.status).toBe('accepted');

    // Verify assignment created
    const assignments = await adapter.getAssignments();
    const matchingAssignment = assignments.find(
      (a) => a.truckId === 'T101' && a.shipmentId === 'S2'
    );
    expect(matchingAssignment).toBeDefined();
    expect(matchingAssignment.status).toBe('Active');

    // Verify truck marked Assigned
    const trucks = await adapter.getTrucks();
    const truck = trucks.find((t) => t.id === 'T101');
    expect(truck.status).toBe('Assigned');
    expect(truck.requestStatus).toBeNull();
  });

  it('declines/rejects request and releases hold on truck', async () => {
    const req = await adapter.createTruckRequest({
      truckId: 'T102',
      shipmentId: 'S3',
      offeredRateInr: 20000,
    });

    const rejected = await adapter.updateTruckRequestStatus(req.id, 'rejected');
    expect(rejected.status).toBe('rejected');

    const trucks = await adapter.getTrucks();
    const truck = trucks.find((t) => t.id === 'T102');
    expect(truck.requestStatus).toBeNull();
    expect(truck.holdExpiresAt).toBeNull();
  });

  it('serializes and deserializes truck request rows accurately', () => {
    const domainRequest = {
      id: 'REQ-101',
      orgId: 'demo-org',
      truckId: 'T101',
      shipmentId: 'S1',
      shipperId: 'user-123',
      status: 'requested',
      offeredRateInr: 28000,
      quoteInr: 22400,
      savingsInr: 5600,
      detourKm: 8,
      etaBufferMinutes: 20,
      expiresAt: '2026-10-23T12:00:00.000Z',
    };

    const row = truckRequestToRow(domainRequest, 'demo-org');
    expect(row.truck_id).toBe('T101');
    expect(row.offered_rate_inr).toBe(28000);
    expect(row.savings_inr).toBe(5600);

    const remapped = rowToTruckRequest(row);
    expect(remapped.truckId).toBe('T101');
    expect(remapped.offeredRateInr).toBe(28000);
    expect(remapped.savingsInr).toBe(5600);
  });
});
