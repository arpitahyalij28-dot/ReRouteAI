// ReRoute AI 2.0 - Data Repository & Adapters
// Supports dual modes:
// 1. LocalDemoAdapter (Offline in-memory & localStorage fallback, zero env vars)
// 2. SupabaseAdapter (Cloud Postgres with Row-Level Security and Realtime sync)

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import {
  INITIAL_TRUCKS,
  INITIAL_SHIPMENTS,
  DEFAULT_SETTINGS,
} from './mockData.js';

// --- Snake_case <-> camelCase Mappers ---

export function rowToTruck(r) {
  if (!r) return null;
  const currentCoords = [
    Number(r.current_lat ?? r.currentCoords?.[0] ?? 19.645),
    Number(r.current_lng ?? r.currentCoords?.[1] ?? 73.485),
  ];
  const originCoords = [
    Number(r.origin_lat ?? r.originCoords?.[0] ?? 19.9575),
    Number(r.origin_lng ?? r.originCoords?.[1] ?? 73.742),
  ];
  const destinationCoords = [
    Number(r.dest_lat ?? r.destinationCoords?.[0] ?? 19.2967),
    Number(r.dest_lng ?? r.destinationCoords?.[1] ?? 73.0631),
  ];

  return {
    id: r.id,
    orgId: r.org_id,
    regNumber: r.reg_number || r.regNumber || r.id,
    model: r.model || r.vehicle_type || 'Commercial Vehicle',
    vehicleType: r.vehicle_type || r.vehicleType || '10T Heavy Commercial Vehicle',
    origin: r.origin || 'Nashik',
    destination: r.destination || 'Mumbai',
    originCoords,
    destinationCoords,
    currentCoords,
    originLat: originCoords[0],
    originLng: originCoords[1],
    destLat: destinationCoords[0],
    destLng: destinationCoords[1],
    currentLat: currentCoords[0],
    currentLng: currentCoords[1],
    currentLocationName: r.current_location_name || r.current_location || 'Corridor Transit',
    capacityTons: Number(r.capacity_tons ?? r.capacityTons ?? ((r.max_capacity ?? 10000) / 1000)),
    maxCapacity: Number(r.max_capacity ?? r.maxCapacity ?? 10000),
    currentLoadTons: Number(r.current_load_tons ?? r.currentLoadTons ?? ((r.current_load ?? 0) / 1000)),
    currentLoad: Number(r.current_load ?? r.currentLoad ?? 0),
    status: r.status || 'In-Transit',
    emptyReturnProbability: Number(r.empty_return_probability ?? r.emptyReturnProbability ?? 85),
    countdownSeconds: Number(r.countdown_seconds ?? r.countdownSeconds ?? 8100),
    expectedDeliveryTime: r.expected_delivery_time || r.expectedDeliveryTime || '14:15',
    driverName: r.driver_name || r.driverName || 'Driver',
    driverPhone: r.driver_phone || r.driverPhone || '',
    speedKmH: Number(r.speed_kmh ?? r.speedKmH ?? 50),
    totalTripKm: Number(r.total_trip_km ?? r.totalTripKm ?? 160),
    outboundRemainingKm: Number(r.outbound_remaining_km ?? r.outboundRemainingKm ?? 65),
    vehicleMileageKmPerL: Number(r.vehicle_mileage_km_per_l ?? r.mileage ?? 4.0),
    fuelPricePerL: Number(r.fuel_price_per_l ?? r.fuel_price ?? 95.0),
    emissionFactorKgPerL: Number(r.emission_factor_kg_per_l ?? 2.68),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function truckToRow(t, orgId = 'demo-org') {
  if (!t) return null;
  const currentCoords = t.currentCoords || [t.currentLat, t.currentLng];
  const originCoords = t.originCoords || [t.originLat, t.originLng];
  const destCoords = t.destinationCoords || [t.destLat, t.destLng];

  return {
    id: t.id,
    org_id: t.orgId || orgId,
    reg_number: t.regNumber || t.reg_number,
    model: t.model,
    vehicle_type: t.vehicleType,
    origin: t.origin,
    destination: t.destination,
    origin_lat: originCoords?.[0] != null ? Number(originCoords[0]) : null,
    origin_lng: originCoords?.[1] != null ? Number(originCoords[1]) : null,
    dest_lat: destCoords?.[0] != null ? Number(destCoords[0]) : null,
    dest_lng: destCoords?.[1] != null ? Number(destCoords[1]) : null,
    current_lat: currentCoords?.[0] != null ? Number(currentCoords[0]) : null,
    current_lng: currentCoords?.[1] != null ? Number(currentCoords[1]) : null,
    current_location_name: t.currentLocationName || t.current_location,
    capacity_tons: Number(t.capacityTons || (t.maxCapacity ? t.maxCapacity / 1000 : 10)),
    max_capacity: Number(t.maxCapacity || (t.capacityTons ? t.capacityTons * 1000 : 10000)),
    current_load_tons: Number(t.currentLoadTons || 0),
    current_load: Number(t.currentLoad || 0),
    status: t.status || 'In-Transit',
    empty_return_probability: Number(t.emptyReturnProbability || 85),
    countdown_seconds: Number(t.countdownSeconds || 8100),
    expected_delivery_time: t.expectedDeliveryTime,
    driver_name: t.driverName,
    driver_phone: t.driverPhone,
    speed_kmh: Number(t.speedKmH || 50),
    total_trip_km: Number(t.totalTripKm || 160),
    outbound_remaining_km: Number(t.outboundRemainingKm || 65),
    vehicle_mileage_km_per_l: Number(t.vehicleMileageKmPerL || 4.0),
    fuel_price_per_l: Number(t.fuelPricePerL || 95.0),
    emission_factor_kg_per_l: Number(t.emissionFactorKgPerL || 2.68),
    updated_at: new Date().toISOString(),
  };
}

export function rowToShipment(r) {
  if (!r) return null;
  const originCoords = [
    Number(r.pickup_lat ?? r.origin_lat ?? r.originCoords?.[0] ?? 19.0),
    Number(r.pickup_lng ?? r.origin_lng ?? r.originCoords?.[1] ?? 73.0),
  ];
  const destCoords = [
    Number(r.drop_lat ?? r.dest_lat ?? r.destCoords?.[0] ?? 20.0),
    Number(r.drop_lng ?? r.dest_lng ?? r.destCoords?.[1] ?? 74.0),
  ];

  return {
    id: r.id,
    orgId: r.org_id,
    name: r.name || `Consignment ${r.id}`,
    origin: r.pickup_location || r.origin || 'Pickup Location',
    destination: r.drop_location || r.destination || 'Delivery Location',
    originCoords,
    destCoords,
    pickupLat: originCoords[0],
    pickupLng: originCoords[1],
    dropLat: destCoords[0],
    dropLng: destCoords[1],
    weightTons: Number(r.weight_tons ?? r.weightTons ?? ((r.cargo_weight ?? 0) / 1000)),
    cargoWeight: Number(r.cargo_weight ?? r.cargoWeight ?? ((r.weight_tons ?? 0) * 1000)),
    cargoType: r.cargo_type || r.cargoType || 'General Freight',
    pickupWindowStart: r.pickup_window_start || r.pickupWindowStart || '14:00',
    pickupWindowEnd: r.pickup_window_end || r.pickupWindowEnd || '16:00',
    predictedTruckEta: r.predicted_truck_eta || r.predictedTruckEta || '14:15',
    etaBufferMinutes: Number(r.eta_buffer_minutes ?? r.etaBufferMinutes ?? 15),
    detourKm: Number(r.detour_km ?? r.detourKm ?? 10),
    freightOfferInr: Number(r.freight_offer_inr ?? r.value ?? 25000),
    value: Number(r.value ?? r.freight_offer_inr ?? 25000),
    delayRisk: r.delay_risk || r.delayRisk || 'low',
    delayRiskReason: r.delay_risk_reason || r.delayRiskReason || '',
    status: r.status || 'Available',
    requiredVehicleType: r.required_vehicle_type || r.requiredVehicleType || 'Any',
    specialRequirements: r.special_requirements || r.specialRequirements || 'None',
    isCancelled: r.is_cancelled || r.status === 'Cancelled',
    whyWhyNot: r.why_why_not || r.whyWhyNot || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function shipmentToRow(s, orgId = 'demo-org') {
  if (!s) return null;
  const originCoords = s.originCoords || [s.pickupLat, s.pickupLng];
  const destCoords = s.destCoords || [s.dropLat, s.dropLng];

  return {
    id: s.id,
    org_id: s.orgId || orgId,
    shipper_user_id: s.shipperUserId || s.shipper_user_id || null,
    name: s.name,
    pickup_location: s.origin || s.pickup_location,
    drop_location: s.destination || s.drop_location,
    pickup_lat: originCoords?.[0] != null ? Number(originCoords[0]) : null,
    pickup_lng: originCoords?.[1] != null ? Number(originCoords[1]) : null,
    drop_lat: destCoords?.[0] != null ? Number(destCoords[0]) : null,
    drop_lng: destCoords?.[1] != null ? Number(destCoords[1]) : null,
    weight_tons: Number(s.weightTons || (s.cargoWeight ? s.cargoWeight / 1000 : 0)),
    cargo_weight: Number(s.cargoWeight || (s.weightTons ? s.weightTons * 1000 : 0)),
    cargo_type: s.cargoType,
    pickup_window_start: s.pickupWindowStart,
    pickup_window_end: s.pickupWindowEnd,
    predicted_truck_eta: s.predictedTruckEta,
    eta_buffer_minutes: Number(s.etaBufferMinutes || 0),
    detour_km: Number(s.detourKm || 0),
    freight_offer_inr: Number(s.freightOfferInr || s.value || 0),
    value: Number(s.value || s.freightOfferInr || 0),
    delay_risk: s.delayRisk || 'low',
    delay_risk_reason: s.delayRiskReason || '',
    status: s.status || (s.isCancelled ? 'Cancelled' : 'Available'),
    is_cancelled: Boolean(s.isCancelled || s.status === 'Cancelled'),
    required_vehicle_type: s.requiredVehicleType || 'Any',
    special_requirements: s.specialRequirements || 'None',
    why_why_not: s.whyWhyNot,
    updated_at: new Date().toISOString(),
  };
}

export function rowToAssignment(r) {
  if (!r) return null;
  return {
    id: r.id,
    orgId: r.org_id,
    truckId: r.truck_id,
    shipmentId: r.shipment_id,
    assignedAt: r.assigned_at,
    matchScore: Number(r.match_score || 0),
    detourKm: Number(r.detour_km || 0),
    loadedKm: Number(r.loaded_km || 0),
    etaArrival: r.eta_arrival || '',
    sustainability: r.sustainability,
    costGain: Number(r.cost_gain || 0),
    status: r.status || 'Active',
    createdAt: r.created_at,
  };
}

export function assignmentToRow(a, orgId = 'demo-org') {
  if (!a) return null;
  return {
    id: a.id,
    org_id: a.orgId || orgId,
    truck_id: a.truckId,
    shipment_id: a.shipmentId,
    assigned_at: a.assignedAt || new Date().toISOString(),
    match_score: Number(a.matchScore || 0),
    detour_km: Number(a.detourKm || 0),
    loaded_km: Number(a.loadedKm || 0),
    eta_arrival: a.etaArrival || '',
    sustainability: a.sustainability || null,
    cost_gain: Number(a.costGain || 0),
    status: a.status || 'Active',
  };
}

export function rowToTruckRequest(r) {
  if (!r) return null;
  return {
    id: r.id,
    orgId: r.org_id,
    truckId: r.truck_id,
    shipmentId: r.shipment_id,
    shipperId: r.shipper_id,
    status: r.status || 'requested',
    offeredRateInr: Number(r.offered_rate_inr || 0),
    quoteInr: Number(r.quote_inr || 0),
    savingsInr: Number(r.savings_inr || 0),
    detourKm: Number(r.detour_km || 0),
    etaBufferMinutes: Number(r.eta_buffer_minutes || 0),
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function truckRequestToRow(req, orgId = 'demo-org') {
  if (!req) return null;
  return {
    id: req.id,
    org_id: req.orgId || orgId,
    truck_id: req.truckId,
    shipment_id: req.shipmentId,
    shipper_id: req.shipperId || null,
    status: req.status || 'requested',
    offered_rate_inr: Number(req.offeredRateInr || 0),
    quote_inr: Number(req.quoteInr || 0),
    savings_inr: Number(req.savingsInr || 0),
    detour_km: Number(req.detourKm || 0),
    eta_buffer_minutes: Number(req.etaBufferMinutes || 0),
    expires_at: req.expiresAt || new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    created_at: req.createdAt || new Date().toISOString(),
    updated_at: req.updatedAt || new Date().toISOString(),
  };
}

// --- Local Demo Adapter (In-Memory + LocalStorage Fallback) ---

export class LocalDemoAdapter {
  constructor() {
    this.name = 'LocalDemoAdapter';
    this.storageKeyPrefix = 'reroute_demo_';
    this._initData();
  }

  _initData() {
    try {
      const storedTrucks = localStorage.getItem(`${this.storageKeyPrefix}trucks`);
      const storedShipments = localStorage.getItem(`${this.storageKeyPrefix}shipments`);
      const storedAssignments = localStorage.getItem(`${this.storageKeyPrefix}assignments`);
      const storedSettings = localStorage.getItem(`${this.storageKeyPrefix}settings`);
      const storedDisruptions = localStorage.getItem(`${this.storageKeyPrefix}disruptions`);
      const storedRequests = localStorage.getItem(`${this.storageKeyPrefix}truck_requests`);

      this.trucks = storedTrucks ? JSON.parse(storedTrucks) : JSON.parse(JSON.stringify(INITIAL_TRUCKS));
      this.shipments = storedShipments ? JSON.parse(storedShipments) : JSON.parse(JSON.stringify(INITIAL_SHIPMENTS));
      this.assignments = storedAssignments ? JSON.parse(storedAssignments) : [];
      this.settings = storedSettings ? JSON.parse(storedSettings) : JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      this.disruptions = storedDisruptions ? JSON.parse(storedDisruptions) : [];
      this.truckRequests = storedRequests ? JSON.parse(storedRequests) : [];
    } catch {
      this.trucks = JSON.parse(JSON.stringify(INITIAL_TRUCKS));
      this.shipments = JSON.parse(JSON.stringify(INITIAL_SHIPMENTS));
      this.assignments = [];
      this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      this.disruptions = [];
      this.truckRequests = [];
    }
  }

  _save() {
    try {
      localStorage.setItem(`${this.storageKeyPrefix}trucks`, JSON.stringify(this.trucks));
      localStorage.setItem(`${this.storageKeyPrefix}shipments`, JSON.stringify(this.shipments));
      localStorage.setItem(`${this.storageKeyPrefix}assignments`, JSON.stringify(this.assignments));
      localStorage.setItem(`${this.storageKeyPrefix}settings`, JSON.stringify(this.settings));
      localStorage.setItem(`${this.storageKeyPrefix}disruptions`, JSON.stringify(this.disruptions));
      localStorage.setItem(`${this.storageKeyPrefix}truck_requests`, JSON.stringify(this.truckRequests));
    } catch {
      // Local storage quota or unavailable in certain test environments
    }
  }

  async getTrucks() {
    return JSON.parse(JSON.stringify(this.trucks));
  }

  async getShipments() {
    return JSON.parse(JSON.stringify(this.shipments));
  }

  async getAssignments() {
    return JSON.parse(JSON.stringify(this.assignments));
  }

  async getModelSettings() {
    return JSON.parse(JSON.stringify(this.settings));
  }

  async saveModelSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this._save();
    return this.settings;
  }

  async createAssignment(assignment) {
    const newAss = {
      id: assignment.id || `A-${Date.now()}`,
      assignedAt: new Date().toISOString(),
      status: 'Active',
      ...assignment,
    };
    this.assignments = [newAss, ...this.assignments];

    // Mark shipment as assigned
    this.shipments = this.shipments.map((s) =>
      s.id === assignment.shipmentId ? { ...s, status: 'Assigned' } : s
    );
    this._save();
    return newAss;
  }

  async deleteAssignment(assignmentId) {
    const found = this.assignments.find((a) => a.id === assignmentId);
    this.assignments = this.assignments.filter((a) => a.id !== assignmentId);
    if (found?.shipmentId) {
      this.shipments = this.shipments.map((s) =>
        s.id === found.shipmentId ? { ...s, status: 'Available' } : s
      );
    }
    this._save();
    return true;
  }

  async createShipment(shipment) {
    const newS = {
      id: shipment.id || `S${this.shipments.length + 1}`,
      createdAt: new Date().toISOString(),
      status: 'Available',
      ...shipment,
    };
    this.shipments = [newS, ...this.shipments];
    this._save();
    return newS;
  }

  async recordTelemetry(point) {
    this.trucks = this.trucks.map((t) => {
      if (t.id !== point.truckId) return t;
      return {
        ...t,
        currentCoords: [point.lat, point.lng],
        currentLat: point.lat,
        currentLng: point.lng,
        speedKmH: point.speed ?? t.speedKmH,
        currentLocationName: point.locationName || t.currentLocationName,
      };
    });
    this._save();
    return { success: true };
  }

  async updateAssignmentStatus(assignmentId, status) {
    this.assignments = this.assignments.map((a) =>
      a.id === assignmentId ? { ...a, status } : a
    );
    this._save();
    return true;
  }

  async updateShipmentStatus(shipmentId, status, extraFields = {}) {
    this.shipments = this.shipments.map((s) => {
      if (s.id !== shipmentId) return s;
      return {
        ...s,
        status,
        isCancelled: status === 'Cancelled',
        ...extraFields,
      };
    });
    this._save();
    return this.shipments.find((s) => s.id === shipmentId);
  }

  async createDisruptionEvent(event) {
    const newEvent = {
      id: event.id || `EVT-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...event,
    };
    this.disruptions = [newEvent, ...this.disruptions];
    this._save();
    return newEvent;
  }

  async getDisruptionEvents() {
    return JSON.parse(JSON.stringify(this.disruptions));
  }

  async getTruckRequests() {
    return JSON.parse(JSON.stringify(this.truckRequests));
  }

  async createTruckRequest(request) {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const newReq = {
      id: request.id || `REQ-${Date.now()}`,
      status: 'requested',
      expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...request,
    };
    this.truckRequests = [newReq, ...this.truckRequests];

    // Hold lock on truck (10 mins)
    this.trucks = this.trucks.map((t) =>
      t.id === request.truckId
        ? { ...t, requestStatus: 'requested', holdExpiresAt: expiresAt }
        : t
    );

    this._save();
    return newReq;
  }

  async updateTruckRequestStatus(requestId, status) {
    const reqIndex = this.truckRequests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) return null;

    const req = this.truckRequests[reqIndex];
    const updated = {
      ...req,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.truckRequests[reqIndex] = updated;

    if (status === 'accepted') {
      // Create confirmed assignment
      await this.createAssignment({
        truckId: req.truckId,
        shipmentId: req.shipmentId,
        matchScore: req.matchScore || 92,
        detourKm: req.detourKm || 8,
        costGain: req.savingsInr || req.offeredRateInr || 20000,
        status: 'Active',
      });
      // Mark truck assigned
      this.trucks = this.trucks.map((t) =>
        t.id === req.truckId
          ? { ...t, status: 'Assigned', requestStatus: null, holdExpiresAt: null }
          : t
      );
    } else if (status === 'rejected' || status === 'expired') {
      // Release lock
      this.trucks = this.trucks.map((t) =>
        t.id === req.truckId
          ? { ...t, requestStatus: null, holdExpiresAt: null }
          : t
      );
    }

    this._save();
    return updated;
  }

  async resetToDemo() {
    this.trucks = JSON.parse(JSON.stringify(INITIAL_TRUCKS));
    this.shipments = JSON.parse(JSON.stringify(INITIAL_SHIPMENTS));
    this.assignments = [];
    this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    this.disruptions = [];
    this.truckRequests = [];
    this._save();
    return { success: true };
  }
}

// --- Supabase Adapter (Cloud Postgres) ---

export class SupabaseAdapter {
  constructor(client, orgId = 'demo-org') {
    this.name = 'SupabaseAdapter';
    this.client = client;
    this.orgId = orgId;
  }

  async getTrucks() {
    const { data, error } = await this.client
      .from('trucks')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw new Error(`Supabase getTrucks failed: ${error.message}`);
    return (data || []).map(rowToTruck);
  }

  async getShipments() {
    const { data, error } = await this.client
      .from('shipments')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw new Error(`Supabase getShipments failed: ${error.message}`);
    return (data || []).map(rowToShipment);
  }

  async getAssignments() {
    const { data, error } = await this.client
      .from('assignments')
      .select('*')
      .order('assigned_at', { ascending: false });

    if (error) throw new Error(`Supabase getAssignments failed: ${error.message}`);
    return (data || []).map(rowToAssignment);
  }

  async getModelSettings() {
    const { data, error } = await this.client
      .from('model_settings')
      .select('*')
      .eq('org_id', this.orgId)
      .maybeSingle();

    if (error) throw new Error(`Supabase getModelSettings failed: ${error.message}`);
    if (!data) return DEFAULT_SETTINGS;
    return {
      weights: data.weights || DEFAULT_SETTINGS.weights,
      speedKmH: data.speed_kmh || DEFAULT_SETTINGS.speedKmH,
      maxDetourKm: data.max_detour_km || DEFAULT_SETTINGS.maxDetourKm,
      co2Factor: data.co2_factor || DEFAULT_SETTINGS.co2Factor,
      fuelPrice: data.fuel_price || DEFAULT_SETTINGS.fuelPrice,
      mileage: data.mileage || DEFAULT_SETTINGS.mileage,
    };
  }

  async saveModelSettings(newSettings) {
    const row = {
      org_id: this.orgId,
      weights: newSettings.weights,
      speed_kmh: newSettings.speedKmH,
      max_detour_km: newSettings.maxDetourKm,
      co2_factor: newSettings.co2Factor,
      fuel_price: newSettings.fuelPrice,
      mileage: newSettings.mileage,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from('model_settings')
      .upsert(row, { onConflict: 'org_id' })
      .select()
      .single();

    if (error) throw new Error(`Supabase saveModelSettings failed: ${error.message}`);
    return data;
  }

  async createAssignment(assignment) {
    const row = assignmentToRow(assignment, this.orgId);

    // 1. Attempt atomic database RPC call
    try {
      const { data: rpcData, error: rpcError } = await this.client.rpc('create_assignment_atomic', {
        p_id: row.id,
        p_org_id: row.org_id,
        p_truck_id: row.truck_id,
        p_shipment_id: row.shipment_id,
        p_match_score: row.match_score,
        p_detour_km: row.detour_km,
        p_loaded_km: row.loaded_km,
        p_eta_arrival: row.eta_arrival,
        p_sustainability: row.sustainability,
        p_cost_gain: row.cost_gain,
        p_status: row.status,
      });

      if (!rpcError && rpcData) {
        return rowToAssignment(rpcData);
      }
    } catch {
      // Graceful fallback to sequential operations
    }

    // 2. Sequential fallback if RPC is unavailable
    const { data, error } = await this.client
      .from('assignments')
      .insert(row)
      .select()
      .single();

    if (error) throw new Error(`Supabase createAssignment failed: ${error.message}`);

    // Update shipment status to Assigned
    await this.client
      .from('shipments')
      .update({ status: 'Assigned', updated_at: new Date().toISOString() })
      .eq('id', assignment.shipmentId);

    return rowToAssignment(data);
  }

  async deleteAssignment(assignmentId) {
    const { data: assignment } = await this.client
      .from('assignments')
      .select('shipment_id')
      .eq('id', assignmentId)
      .maybeSingle();

    const { error } = await this.client
      .from('assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) throw new Error(`Supabase deleteAssignment failed: ${error.message}`);

    if (assignment?.shipment_id) {
      await this.client
        .from('shipments')
        .update({ status: 'Available', updated_at: new Date().toISOString() })
        .eq('id', assignment.shipment_id);
    }

    return true;
  }

  async createShipment(shipment) {
    let currentUserId = null;
    try {
      const { data: userData } = await this.client.auth.getUser();
      currentUserId = userData?.user?.id || null;
    } catch {
      // Ignored if unauthenticated
    }

    const row = shipmentToRow({
      ...shipment,
      shipperUserId: shipment.shipperUserId || shipment.shipper_user_id || currentUserId,
    }, this.orgId);

    const { data, error } = await this.client
      .from('shipments')
      .insert(row)
      .select()
      .single();

    if (error) throw new Error(`Supabase createShipment failed: ${error.message}`);
    return rowToShipment(data);
  }

  async recordTelemetry(point) {
    // Aligns with schema: column is `speed` (not speed_kmh) and includes required NOT NULL `org_id`
    const row = {
      org_id: this.orgId,
      truck_id: point.truckId,
      lat: point.lat,
      lng: point.lng,
      speed: Number(point.speed ?? 0),
      recorded_at: new Date().toISOString(),
    };
    await this.client.from('telemetry_points').insert(row);
    await this.client
      .from('trucks')
      .update({
        current_lat: point.lat,
        current_lng: point.lng,
        speed_kmh: Number(point.speed ?? 50),
        updated_at: new Date().toISOString(),
      })
      .eq('id', point.truckId);
    return { success: true };
  }

  async updateAssignmentStatus(assignmentId, status) {
    // Schema does not contain `updated_at` on assignments table
    const { error } = await this.client
      .from('assignments')
      .update({ status })
      .eq('id', assignmentId);
    if (error) throw new Error(`Supabase updateAssignmentStatus failed: ${error.message}`);
    return true;
  }

  async updateShipmentStatus(shipmentId, status, extraFields = {}) {
    const updatePayload = {
      status,
      is_cancelled: status === 'Cancelled',
      updated_at: new Date().toISOString(),
    };
    if (extraFields.whyWhyNot) updatePayload.why_why_not = extraFields.whyWhyNot;
    if (extraFields.predictedTruckEta) updatePayload.predicted_truck_eta = extraFields.predictedTruckEta;
    if (extraFields.pickupWindowStart) updatePayload.pickup_window_start = extraFields.pickupWindowStart;
    if (extraFields.pickupWindowEnd) updatePayload.pickup_window_end = extraFields.pickupWindowEnd;
    if (extraFields.etaBufferMinutes != null) updatePayload.eta_buffer_minutes = extraFields.etaBufferMinutes;

    const { data, error } = await this.client
      .from('shipments')
      .update(updatePayload)
      .eq('id', shipmentId)
      .select()
      .single();

    if (error) throw new Error(`Supabase updateShipmentStatus failed: ${error.message}`);
    return rowToShipment(data);
  }

  async createDisruptionEvent(event) {
    const row = {
      org_id: this.orgId,
      type: event.type || 'DISRUPTION',
      shipment_id: event.shipmentId || null,
      truck_id: event.truckId || null,
      payload: event.payload || {},
      created_at: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from('disruption_events')
      .insert(row)
      .select()
      .single();

    if (error) throw new Error(`Supabase createDisruptionEvent failed: ${error.message}`);
    return data;
  }

  async getDisruptionEvents() {
    const { data, error } = await this.client
      .from('disruption_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(`Supabase getDisruptionEvents failed: ${error.message}`);
    return data || [];
  }

  async getTruckRequests() {
    const { data, error } = await this.client
      .from('truck_requests')
      .select('*')
      .eq('org_id', this.orgId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Supabase getTruckRequests failed: ${error.message}`);
    return (data || []).map(rowToTruckRequest);
  }

  async createTruckRequest(request) {
    const row = truckRequestToRow(request, this.orgId);
    const { data, error } = await this.client
      .from('truck_requests')
      .insert(row)
      .select()
      .single();

    if (error) throw new Error(`Supabase createTruckRequest failed: ${error.message}`);
    return rowToTruckRequest(data);
  }

  async updateTruckRequestStatus(requestId, status) {
    const { data, error } = await this.client
      .from('truck_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw new Error(`Supabase updateTruckRequestStatus failed: ${error.message}`);
    const req = rowToTruckRequest(data);

    if (status === 'accepted') {
      await this.createAssignment({
        truckId: req.truckId,
        shipmentId: req.shipmentId,
        matchScore: 92,
        detourKm: req.detourKm,
        costGain: req.savingsInr,
        status: 'Active',
      });
    }
    return req;
  }

  async resetToDemo() {
    // In cloud mode, reseed demo org
    return { success: true, message: 'Cloud reseed requested.' };
  }
}

// --- Repository Factory ---

export function createRepository(options = {}) {
  const { user, profile, forceLocal = false, client } = options;

  // New Rule: Visitors who are not logged in ALWAYS use LocalDemoAdapter
  // (fully writable sandbox, zero cloud mutations, zero RLS errors).
  // SupabaseAdapter is only used for an authenticated user with an active profile.
  const activeClient = client || (isSupabaseConfigured ? supabase : null);
  if (forceLocal || !user || !profile || !activeClient) {
    return new LocalDemoAdapter();
  }

  const orgId = profile.org_id || profile.orgId || 'demo-org';
  return new SupabaseAdapter(activeClient, orgId);
}
