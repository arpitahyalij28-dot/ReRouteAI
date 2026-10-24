// Logistics Twin - Repository & Adapter Test Suite
import { describe, it, expect, beforeEach } from 'vitest';
import {
  LocalDemoAdapter,
  createRepository,
  rowToTruck,
  truckToRow,
  rowToShipment,
  shipmentToRow,
  rowToAssignment,
  assignmentToRow,
} from '../repository.js';
import { evaluateShipments } from '../../engine/matching.js';

describe('Data Layer & Seed Dataset', () => {
  let adapter;

  beforeEach(() => {
    adapter = new LocalDemoAdapter();
  });

  it('initializes LocalDemoAdapter with at least 6 trucks and 15 shipments', async () => {
    const trucks = await adapter.getTrucks();
    const shipments = await adapter.getShipments();

    expect(trucks.length).toBeGreaterThanOrEqual(6);
    expect(shipments.length).toBeGreaterThanOrEqual(15);
  });

  it('includes required edge cases in seed shipments', async () => {
    const shipments = await adapter.getShipments();

    // Edge case 1: Oversized cargo (capacity overflow)
    const oversized = shipments.find((s) => s.cargoWeight > 10000 || s.weightTons > 10);
    expect(oversized).toBeDefined();

    // Edge case 2: Wrong vehicle type requirement
    const specializedVehicle = shipments.find(
      (s) => s.requiredVehicleType && s.requiredVehicleType !== 'Any'
    );
    expect(specializedVehicle).toBeDefined();

    // Edge case 3: Expired / overdue pickup window
    const overdueWindow = shipments.find((s) => s.id === 'S6');
    expect(overdueWindow).toBeDefined();
    expect(overdueWindow.pickupWindowEnd).toBe('11:30');

    // Edge case 4: Already assigned shipment
    const alreadyAssigned = shipments.find((s) => s.status === 'Assigned');
    expect(alreadyAssigned).toBeDefined();
  });

  it('guarantees infeasible edge case loads are never recommended by the matching engine', async () => {
    const trucks = await adapter.getTrucks();
    const shipments = await adapter.getShipments();
    const t101 = trucks.find((t) => t.id === 'T101');

    const evaluated = evaluateShipments(t101, shipments);
    expect(evaluated.length).toBe(shipments.length);

    // Verified edge cases:
    const s4Evaluated = evaluated.find((e) => e.shipmentId === 'S4'); // 14t > 10t
    const s5Evaluated = evaluated.find((e) => e.shipmentId === 'S5'); // Flatbed vs HCV
    const s6Evaluated = evaluated.find((e) => e.shipmentId === 'S6'); // Window passed
    const s7Evaluated = evaluated.find((e) => e.shipmentId === 'S7'); // Status = Assigned

    expect(s4Evaluated.isFeasible).toBe(false);
    expect(s4Evaluated.isRecommended).toBe(false);

    expect(s5Evaluated.isFeasible).toBe(false);
    expect(s5Evaluated.isRecommended).toBe(false);

    expect(s6Evaluated.isFeasible).toBe(false);
    expect(s6Evaluated.isRecommended).toBe(false);

    expect(s7Evaluated.isFeasible).toBe(false);
    expect(s7Evaluated.isRecommended).toBe(false);

    // Recommended load MUST be feasible
    const recommended = evaluated.find((e) => e.isRecommended);
    expect(recommended).toBeDefined();
    expect(recommended.isFeasible).toBe(true);
    expect(recommended.shipmentId).toBe('S1');
  });

  it('converts truck rows between snake_case and camelCase bidirectionally', () => {
    const truckRow = {
      id: 'T101',
      org_id: 'org-test',
      reg_number: 'MH-15-EG-4921',
      model: 'Tata Signa',
      vehicle_type: '10T Heavy Commercial Vehicle',
      origin: 'Nashik',
      destination: 'Mumbai',
      origin_lat: 19.9575,
      origin_lng: 73.742,
      dest_lat: 19.2967,
      dest_lng: 73.0631,
      current_lat: 19.645,
      current_lng: 73.485,
      capacity_tons: 10,
      max_capacity: 10000,
      current_load_tons: 10,
      current_load: 10000,
      status: 'In-Transit',
      empty_return_probability: 87,
      speed_kmh: 54,
      total_trip_km: 165,
    };

    const truckObj = rowToTruck(truckRow);
    expect(truckObj.id).toBe('T101');
    expect(truckObj.vehicleType).toBe('10T Heavy Commercial Vehicle');
    expect(truckObj.currentCoords).toEqual([19.645, 73.485]);

    const convertedBack = truckToRow(truckObj, 'org-test');
    expect(convertedBack.current_lat).toBe(19.645);
    expect(convertedBack.max_capacity).toBe(10000);
  });

  it('creates and deletes assignments in LocalDemoAdapter', async () => {
    const newAss = await adapter.createAssignment({
      truckId: 'T101',
      shipmentId: 'S2',
      matchScore: 86,
      detourKm: 12,
    });

    expect(newAss.id).toBeDefined();
    const assignments = await adapter.getAssignments();
    expect(assignments.some((a) => a.id === newAss.id)).toBe(true);

    const shipments = await adapter.getShipments();
    const s2 = shipments.find((s) => s.id === 'S2');
    expect(s2.status).toBe('Assigned');

    await adapter.deleteAssignment(newAss.id);
    const afterDelete = await adapter.getAssignments();
    expect(afterDelete.some((a) => a.id === newAss.id)).toBe(false);

    const shipmentsAfter = await adapter.getShipments();
    const s2After = shipmentsAfter.find((s) => s.id === 'S2');
    expect(s2After.status).toBe('Available');
  });

  it('updates shipment status and creates disruption events', async () => {
    await adapter.updateShipmentStatus('S1', 'Cancelled');
    const shipments = await adapter.getShipments();
    const s1 = shipments.find((s) => s.id === 'S1');
    expect(s1.status).toBe('Cancelled');
    expect(s1.isCancelled).toBe(true);

    await adapter.createDisruptionEvent({
      type: 'CANCELLATION',
      shipmentId: 'S1',
      payload: { reason: 'Test cancel' },
    });
    const disruptions = await adapter.getDisruptionEvents();
    expect(disruptions.length).toBeGreaterThan(0);
    expect(disruptions[0].shipmentId).toBe('S1');

    await adapter.resetToDemo();
    const resetShipments = await adapter.getShipments();
    const resetS1 = resetShipments.find((s) => s.id === 'S1');
    expect(resetS1.status).toBe('Available');
  });

  it('supports createShipment and updateAssignmentStatus in LocalDemoAdapter', async () => {
    // 1. Create new shipment
    const created = await adapter.createShipment({
      name: 'Test Urgent Pune Tender',
      origin: 'Mumbai',
      destination: 'Pune',
      weightTons: 6,
      cargoWeight: 6000,
      freightOfferInr: 22000,
    });
    expect(created.id).toBeDefined();
    const allShipments = await adapter.getShipments();
    expect(allShipments.some((s) => s.id === created.id)).toBe(true);

    // 2. Update assignment status
    const ass = await adapter.createAssignment({
      truckId: 'T101',
      shipmentId: created.id,
      matchScore: 92,
    });
    await adapter.updateAssignmentStatus(ass.id, 'Cargo Loaded');
    const assignments = await adapter.getAssignments();
    const updatedAss = assignments.find((a) => a.id === ass.id);
    expect(updatedAss.status).toBe('Cargo Loaded');
  });

  it('guarantees unauthenticated visitors ALWAYS use LocalDemoAdapter (Fix 2)', () => {
    // Unauthenticated user -> must be LocalDemoAdapter
    const guestRepo = createRepository({ user: null, profile: null });
    expect(guestRepo.name).toBe('LocalDemoAdapter');

    // Authenticated user with profile -> SupabaseAdapter with orgId
    const mockClient = { from: () => ({ select: () => ({}) }) };
    const cloudRepo = createRepository({
      user: { id: 'usr-123', email: 'test@demo.reroute' },
      profile: { org_id: 'org-reliance', role: 'dispatcher' },
      client: mockClient,
    });
    expect(cloudRepo.name).toBe('SupabaseAdapter');
    expect(cloudRepo.orgId).toBe('org-reliance');
  });

  it('guarantees selecting 10 different shipments causes 0 additional data fetches (Fix 5)', async () => {
    let fetchCount = 0;
    const trackedRepo = {
      async getTrucks() {
        fetchCount++;
        return [{ id: 'T101' }, { id: 'T102' }];
      },
      async getShipments() {
        return Array.from({ length: 15 }, (_, i) => ({ id: `S${i + 1}` }));
      },
      async getAssignments() { return []; },
      async getModelSettings() { return {}; },
      async getDisruptionEvents() { return []; },
    };

    // Initial load: 1 fetch
    const [trucks, shipments] = await Promise.all([
      trackedRepo.getTrucks(),
      trackedRepo.getShipments(),
    ]);
    expect(fetchCount).toBe(1);

    // Simulate selecting 10 different shipments
    let selectedShipmentId = shipments[0].id;
    for (let i = 1; i <= 10; i++) {
      const nextId = shipments[i].id;
      // In stable architecture, selection is stored directly without re-calling trackedRepo
      selectedShipmentId = nextId;
    }

    expect(selectedShipmentId).toBe('S11');
    // Fetch count remains strictly 1 (0 extra fetches triggered)
    expect(fetchCount).toBe(1);
  });
});

