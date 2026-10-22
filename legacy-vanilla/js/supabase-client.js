// ReRoute AI 2.0 - Supabase Cloud Synchronization Client
// Bridges client-side models with Supabase Postgres database.
// Never exposes secret keys. Uses anon public key with Row Level Security.

(function() {
  window.ReRoute = window.ReRoute || {};

  class SupabaseSyncClient {
    constructor() {
      this.client = null;
      this.isConfigured = false;
      this.isConnected = false;
      this.config = { url: '', anonKey: '' };
      this.channel = null;
    }

    /**
     * Initializes the Supabase client with URL and Anon Key
     */
    init(supabaseUrl, supabaseAnonKey) {
      if (!supabaseUrl || !supabaseAnonKey) {
        this.isConfigured = false;
        this.isConnected = false;
        return false;
      }

      if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
        console.warn("Supabase JS SDK not loaded in browser yet.");
        return false;
      }

      try {
        this.client = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
        this.config = { url: supabaseUrl, anonKey: supabaseAnonKey };
        this.isConfigured = true;
        return true;
      } catch (err) {
        console.error("Failed to initialize Supabase client:", err);
        this.isConfigured = false;
        return false;
      }
    }

    /**
     * Verifies connection to Supabase database
     */
    async checkConnection() {
      if (!this.client) return { connected: false, error: "Supabase client not initialized." };

      try {
        // Query trucks table head
        const { error } = await this.client
          .from('reroute_trucks')
          .select('id', { count: 'exact', head: true });

        if (error) {
          // If table doesn't exist yet
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            return {
              connected: true,
              tablesReady: false,
              error: "Supabase connected! Schema tables not yet created. Run supabase/schema.sql in the Supabase SQL Editor."
            };
          }
          return { connected: false, tablesReady: false, error: error.message };
        }

        this.isConnected = true;
        return { connected: true, tablesReady: true };
      } catch (err) {
        this.isConnected = false;
        return { connected: false, tablesReady: false, error: err.message };
      }
    }

    // --- Object Mappers: JS camelCase <-> Postgres snake_case ---
    truckToRow(t) {
      return {
        id: t.id,
        vehicle_type: t.vehicleType,
        current_location: t.currentLocation,
        current_lat: Number(t.currentLat),
        current_lng: Number(t.currentLng),
        destination: t.destination,
        dest_lat: Number(t.destLat),
        dest_lng: Number(t.destLng),
        max_capacity: Number(t.maxCapacity),
        current_load: Number(t.currentLoad || 0),
        mileage: Number(t.mileage || 4.2),
        fuel_price: Number(t.fuelPrice || 94.50),
        expected_delivery_time: t.expectedDeliveryTime,
        driver_availability: t.driverAvailability || 'Immediate / On Duty',
        status: t.status || 'Available',
        is_sample: Boolean(t.isSample),
        updated_at: new Date().toISOString()
      };
    }

    rowToTruck(r) {
      return {
        id: r.id,
        vehicleType: r.vehicle_type,
        currentLocation: r.current_location,
        currentLat: Number(r.current_lat),
        currentLng: Number(r.current_lng),
        destination: r.destination,
        destLat: Number(r.dest_lat),
        destLng: Number(r.dest_lng),
        maxCapacity: Number(r.max_capacity),
        currentLoad: Number(r.current_load),
        mileage: Number(r.mileage),
        fuelPrice: Number(r.fuel_price),
        expectedDeliveryTime: r.expected_delivery_time,
        driverAvailability: r.driver_availability,
        status: r.status,
        isSample: Boolean(r.is_sample),
        createdAt: r.created_at,
        updatedAt: r.updated_at
      };
    }

    shipmentToRow(s) {
      return {
        id: s.id,
        pickup_location: s.pickupLocation,
        pickup_lat: Number(s.pickupLat),
        pickup_lng: Number(s.pickupLng),
        drop_location: s.dropLocation,
        drop_lat: Number(s.dropLat),
        drop_lng: Number(s.dropLng),
        cargo_weight: Number(s.cargoWeight),
        pickup_window_start: s.pickupWindowStart,
        pickup_window_end: s.pickupWindowEnd,
        delivery_deadline: s.deliveryDeadline,
        priority: s.priority || 'Standard',
        value: Number(s.value || 0),
        required_vehicle_type: s.requiredVehicleType || 'Any',
        special_requirements: s.specialRequirements || 'None',
        status: s.status || 'Available',
        is_sample: Boolean(s.isSample),
        updated_at: new Date().toISOString()
      };
    }

    rowToShipment(r) {
      return {
        id: r.id,
        pickupLocation: r.pickup_location,
        pickupLat: Number(r.pickup_lat),
        pickupLng: Number(r.pickup_lng),
        dropLocation: r.drop_location,
        dropLat: Number(r.drop_lat),
        dropLng: Number(r.drop_lng),
        cargoWeight: Number(r.cargo_weight),
        pickupWindowStart: r.pickup_window_start,
        pickupWindowEnd: r.pickup_window_end,
        deliveryDeadline: r.delivery_deadline,
        priority: r.priority,
        value: Number(r.value),
        requiredVehicleType: r.required_vehicle_type,
        specialRequirements: r.special_requirements,
        status: r.status,
        isSample: Boolean(r.is_sample),
        createdAt: r.created_at,
        updatedAt: r.updated_at
      };
    }

    assignmentToRow(a) {
      return {
        id: a.id,
        truck_id: a.truckId,
        shipment_id: a.shipmentId,
        assigned_at: a.assignedAt || new Date().toISOString(),
        match_score: Number(a.matchScore || 0),
        detour_km: Number(a.detourKm || 0),
        loaded_km: Number(a.loadedKm || 0),
        eta_arrival: a.etaArrival || '',
        sustainability: a.sustainability || null,
        cost_gain: Number(a.costGain || 0)
      };
    }

    rowToAssignment(r) {
      return {
        id: r.id,
        truckId: r.truck_id,
        shipmentId: r.shipment_id,
        assignedAt: r.assigned_at,
        matchScore: Number(r.match_score),
        detourKm: Number(r.detour_km),
        loadedKm: Number(r.loaded_km),
        etaArrival: r.eta_arrival,
        sustainability: r.sustainability,
        costGain: Number(r.cost_gain)
      };
    }

    // --- CRUD Operations ---
    async fetchAllData() {
      if (!this.client) return null;

      try {
        const [trucksRes, shipmentsRes, assignmentsRes, settingsRes, demoStateRes] = await Promise.all([
          this.client.from('reroute_trucks').select('*').order('created_at', { ascending: true }),
          this.client.from('reroute_shipments').select('*').order('created_at', { ascending: true }),
          this.client.from('reroute_assignments').select('*').order('assigned_at', { ascending: true }),
          this.client.from('reroute_model_settings').select('*').eq('id', 'default').maybeSingle(),
          this.client.from('reroute_demo_state').select('*').eq('id', 'global').maybeSingle()
        ]);

        if (trucksRes.error) throw trucksRes.error;
        if (shipmentsRes.error) throw shipmentsRes.error;
        if (assignmentsRes.error) throw assignmentsRes.error;

        return {
          trucks: (trucksRes.data || []).map(r => this.rowToTruck(r)),
          shipments: (shipmentsRes.data || []).map(r => this.rowToShipment(r)),
          assignments: (assignmentsRes.data || []).map(r => this.rowToAssignment(r)),
          modelSettings: settingsRes.data ? settingsRes.data.settings : null,
          demoState: demoStateRes.data || null
        };
      } catch (err) {
        console.error("Supabase fetchAllData error:", err);
        throw err;
      }
    }

    async upsertTruck(truck) {
      if (!this.client) return;
      const row = this.truckToRow(truck);
      const { error } = await this.client.from('reroute_trucks').upsert(row);
      if (error) throw error;
    }

    async deleteTruck(id) {
      if (!this.client) return;
      const { error } = await this.client.from('reroute_trucks').delete().eq('id', id);
      if (error) throw error;
    }

    async upsertShipment(shipment) {
      if (!this.client) return;
      const row = this.shipmentToRow(shipment);
      const { error } = await this.client.from('reroute_shipments').upsert(row);
      if (error) throw error;
    }

    async deleteShipment(id) {
      if (!this.client) return;
      const { error } = await this.client.from('reroute_shipments').delete().eq('id', id);
      if (error) throw error;
    }

    async createAssignment(assignment) {
      if (!this.client) return;
      const row = this.assignmentToRow(assignment);
      const { error } = await this.client.from('reroute_assignments').upsert(row);
      if (error) throw error;
    }

    async deleteAssignment(id) {
      if (!this.client) return;
      const { error } = await this.client.from('reroute_assignments').delete().eq('id', id);
      if (error) throw error;
    }

    async saveModelSettings(settings) {
      if (!this.client) return;
      const { error } = await this.client.from('reroute_model_settings').upsert({
        id: 'default',
        settings: settings,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
    }

    async saveDemoState(activeTruckId, selectedShipmentId) {
      if (!this.client) return;
      const { error } = await this.client.from('reroute_demo_state').upsert({
        id: 'global',
        active_truck_id: activeTruckId,
        selected_shipment_id: selectedShipmentId,
        updated_at: new Date().toISOString()
      });
      if (error) console.warn("Could not save demo state:", error.message);
    }

    async batchUpsertTrucks(trucks = []) {
      if (!this.client || trucks.length === 0) return;
      const rows = trucks.map(t => this.truckToRow(t));
      const { error } = await this.client.from('reroute_trucks').upsert(rows);
      if (error) throw error;
    }

    async batchUpsertShipments(shipments = []) {
      if (!this.client || shipments.length === 0) return;
      const rows = shipments.map(s => this.shipmentToRow(s));
      const { error } = await this.client.from('reroute_shipments').upsert(rows);
      if (error) throw error;
    }

    async clearCloudData(mode = 'all') {
      if (!this.client) return;

      if (mode === 'all') {
        await Promise.all([
          this.client.from('reroute_assignments').delete().neq('id', '___none___'),
          this.client.from('reroute_trucks').delete().neq('id', '___none___'),
          this.client.from('reroute_shipments').delete().neq('id', '___none___')
        ]);
      } else if (mode === 'user_only') {
        await Promise.all([
          this.client.from('reroute_trucks').delete().eq('is_sample', false),
          this.client.from('reroute_shipments').delete().eq('is_sample', false)
        ]);
      }
    }

    /**
     * Subscribes to Realtime broadcast changes so multiple browser windows stay synced
     */
    subscribeRealtime(onUpdateCallback) {
      if (!this.client || this.channel) return;

      try {
        this.channel = this.client
          .channel('reroute-cloud-sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'reroute_trucks' }, (payload) => {
            if (typeof onUpdateCallback === 'function') onUpdateCallback('trucks', payload);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'reroute_shipments' }, (payload) => {
            if (typeof onUpdateCallback === 'function') onUpdateCallback('shipments', payload);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'reroute_assignments' }, (payload) => {
            if (typeof onUpdateCallback === 'function') onUpdateCallback('assignments', payload);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'reroute_model_settings' }, (payload) => {
            if (typeof onUpdateCallback === 'function') onUpdateCallback('settings', payload);
          })
          .subscribe();
      } catch (e) {
        console.warn("Could not subscribe to Realtime:", e.message);
      }
    }
  }

  window.ReRoute.supabaseSync = new SupabaseSyncClient();
})();
