// ReRoute AI 2.0 - Central Reactive State Store
// Upgraded with Supabase Cloud-Synchronized Persistent Storage
// LocalStorage serves as an optional temporary cache/fallback.

(function() {
  const STORAGE_KEY = 'reroute_v2_store_state';
  const CLOUD_CONFIG_KEY = 'reroute_v2_cloud_config';

  const DEFAULT_SETTINGS = {
    weights: {
      route: 25,
      time: 20,
      capacity: 20,
      detour: 15,
      cost: 10,
      disruption: 10
    },
    speedKmH: 45,
    fuelPrice: 94.50,
    co2Factor: 2.68,
    delayThresholdMins: 45,
    maxDetourKm: 80
  };

  class Store {
    constructor() {
      this.listeners = [];
      this.state = this.loadInitialState();
      this.cloudStatus = 'CONNECTING'; // 'CONNECTING' | 'CONNECTED' | 'FALLBACK_LOCAL' | 'SCHEMA_PENDING' | 'ERROR'
      this.cloudError = null;
      this.isLoadingCloud = true;
    }

    loadInitialState() {
      // 1. Try loading cached data from localStorage as temporary fallback
      if (typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            return {
              trucks: Array.isArray(parsed.trucks) ? parsed.trucks : [],
              shipments: Array.isArray(parsed.shipments) ? parsed.shipments : [],
              assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
              activeTruckId: parsed.activeTruckId || null,
              selectedShipmentId: parsed.selectedShipmentId || null,
              modelSettings: Object.assign({}, DEFAULT_SETTINGS, parsed.modelSettings || {}),
              activeScreen: parsed.activeScreen || 'dashboard',
              notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
              searchQuery: '',
              recoverySimulation: null,
              cloudStatus: 'CONNECTING',
              cloudError: null,
              isLoadingCloud: true
            };
          }
        } catch (e) {
          console.warn("Could not read local cache, starting fresh:", e);
        }
      }

      // 2. Default: START WITH EMPTY DATA (NO hardcoded trucks, shipments, or KPIs)
      return {
        trucks: [],
        shipments: [],
        assignments: [],
        activeTruckId: null,
        selectedShipmentId: null,
        modelSettings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
        activeScreen: 'dashboard',
        notifications: [
          {
            id: 'notif-init',
            title: "Welcome to ReRoute AI 2.0",
            message: "Empty state ready. Initializing cloud persistent storage...",
            type: "info",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ],
        searchQuery: '',
        recoverySimulation: null,
        cloudStatus: 'CONNECTING',
        cloudError: null,
        isLoadingCloud: true
      };
    }

    saveLocalCache() {
      if (typeof localStorage !== 'undefined') {
        try {
          const toSave = {
            trucks: this.state.trucks,
            shipments: this.state.shipments,
            assignments: this.state.assignments,
            activeTruckId: this.state.activeTruckId,
            selectedShipmentId: this.state.selectedShipmentId,
            modelSettings: this.state.modelSettings,
            activeScreen: this.state.activeScreen,
            notifications: this.state.notifications.slice(0, 20)
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        } catch (e) {
          console.error("Failed to persist state to local cache:", e);
        }
      }
    }

    getState() {
      return this.state;
    }

    subscribe(listener) {
      this.listeners.push(listener);
      return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
      };
    }

    notify() {
      this.saveLocalCache();
      this.listeners.forEach(fn => fn(this.state));
    }

    getDataMode() {
      const hasSample = this.state.trucks.some(t => t.isSample) || this.state.shipments.some(s => s.isSample);
      const hasUser = this.state.trucks.some(t => !t.isSample) || this.state.shipments.some(s => !s.isSample);

      if (this.state.trucks.length === 0 && this.state.shipments.length === 0) {
        return 'EMPTY DATA';
      }
      if (hasSample && !hasUser) {
        return 'SAMPLE DATA';
      }
      if (hasUser && !hasSample) {
        return 'USER DATA';
      }
      return 'HYBRID (USER + SAMPLE)';
    }

    // --- Cloud Synchronization Initialization ---
    async initCloudSync() {
      this.state.isLoadingCloud = true;
      this.state.cloudStatus = 'CONNECTING';
      this.notify();

      let supabaseUrl = '';
      let supabaseAnonKey = '';

      // 1. Try fetching from Vercel / serverless /api/config endpoint (reads process.env without exposing secrets)
      try {
        const res = await fetch('/api/config', { cache: 'no-store' });
        if (res.ok) {
          const configData = await res.json();
          if (configData.configured) {
            supabaseUrl = configData.supabaseUrl;
            supabaseAnonKey = configData.supabaseAnonKey;
          }
        }
      } catch (e) {
        // Local direct file opening or serverless route unavailable
      }

      // 2. Check if manually provided in localStorage session
      if (!supabaseUrl && typeof localStorage !== 'undefined') {
        try {
          const customConfig = localStorage.getItem(CLOUD_CONFIG_KEY);
          if (customConfig) {
            const parsed = JSON.parse(customConfig);
            supabaseUrl = parsed.url;
            supabaseAnonKey = parsed.anonKey;
          }
        } catch (e) {}
      }

      const syncClient = window.ReRoute.supabaseSync;

      // If no keys configured anywhere, fallback to localStorage
      if (!supabaseUrl || !supabaseAnonKey || !syncClient) {
        this.state.cloudStatus = 'FALLBACK_LOCAL';
        this.state.isLoadingCloud = false;
        this.state.cloudError = "Supabase credentials not configured in environment. Using localStorage fallback.";
        this.addNotification("Cloud Mode: Local Fallback", "Running in offline/local cache mode. Set SUPABASE_URL and SUPABASE_ANON_KEY to enable cloud sync.", "info");
        this.notify();
        return;
      }

      // Initialize Supabase Client
      const initialized = syncClient.init(supabaseUrl, supabaseAnonKey);
      if (!initialized) {
        this.state.cloudStatus = 'FALLBACK_LOCAL';
        this.state.isLoadingCloud = false;
        this.state.cloudError = "Failed to initialize Supabase SDK.";
        this.notify();
        return;
      }

      // Verify Connection
      const connCheck = await syncClient.checkConnection();
      if (!connCheck.connected) {
        this.state.cloudStatus = 'ERROR';
        this.state.isLoadingCloud = false;
        this.state.cloudError = connCheck.error || "Connection failed";
        this.addNotification("Cloud Connection Error", `Could not connect to Supabase: ${connCheck.error}`, "danger");
        this.notify();
        return;
      }

      if (!connCheck.tablesReady) {
        this.state.cloudStatus = 'SCHEMA_PENDING';
        this.state.isLoadingCloud = false;
        this.state.cloudError = connCheck.error;
        this.addNotification("Supabase Tables Needed", "Connected to Supabase! Please execute supabase/schema.sql in the Supabase SQL Editor to initialize tables.", "warning");
        this.notify();
        return;
      }

      // Connected! Fetch latest persistent data from Supabase
      try {
        const cloudData = await syncClient.fetchAllData();
        if (cloudData) {
          // If cloud has data, update state with cloud records
          this.state.trucks = cloudData.trucks || [];
          this.state.shipments = cloudData.shipments || [];
          this.state.assignments = cloudData.assignments || [];

          if (cloudData.modelSettings) {
            this.state.modelSettings = Object.assign({}, DEFAULT_SETTINGS, cloudData.modelSettings);
          }

          if (cloudData.demoState && cloudData.demoState.active_truck_id) {
            this.state.activeTruckId = cloudData.demoState.active_truck_id;
          } else if (this.state.trucks.length > 0 && !this.state.activeTruckId) {
            this.state.activeTruckId = this.state.trucks[0].id;
          }

          this.state.cloudStatus = 'CONNECTED';
          this.state.cloudError = null;
          this.state.isLoadingCloud = false;

          this.addNotification("Cloud Synchronized", `Fetched ${this.state.trucks.length} trucks and ${this.state.shipments.length} shipments from Supabase cloud database.`, "success");
          
          // Setup Realtime synchronization across browsers
          syncClient.subscribeRealtime((tableName, payload) => {
            this.handleRealtimeEvent(tableName, payload);
          });

          this.notify();
        }
      } catch (err) {
        this.state.cloudStatus = 'ERROR';
        this.state.cloudError = err.message;
        this.state.isLoadingCloud = false;
        this.addNotification("Cloud Fetch Error", err.message, "danger");
        this.notify();
      }
    }

    /**
     * Handles real-time multi-browser updates from Supabase
     */
    async handleRealtimeEvent(tableName, payload) {
      console.log(`[Realtime Sync] ${tableName} event:`, payload.eventType);
      const syncClient = window.ReRoute.supabaseSync;
      if (!syncClient) return;

      try {
        if (tableName === 'trucks') {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedTruck = syncClient.rowToTruck(payload.new);
            const idx = this.state.trucks.findIndex(t => t.id === updatedTruck.id);
            if (idx !== -1) this.state.trucks[idx] = updatedTruck;
            else this.state.trucks.push(updatedTruck);
          } else if (payload.eventType === 'DELETE') {
            this.state.trucks = this.state.trucks.filter(t => t.id !== payload.old.id);
          }
        } else if (tableName === 'shipments') {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedShipment = syncClient.rowToShipment(payload.new);
            const idx = this.state.shipments.findIndex(s => s.id === updatedShipment.id);
            if (idx !== -1) this.state.shipments[idx] = updatedShipment;
            else this.state.shipments.push(updatedShipment);
          } else if (payload.eventType === 'DELETE') {
            this.state.shipments = this.state.shipments.filter(s => s.id !== payload.old.id);
          }
        } else if (tableName === 'assignments') {
          if (payload.eventType === 'INSERT') {
            const asg = syncClient.rowToAssignment(payload.new);
            if (!this.state.assignments.some(a => a.id === asg.id)) {
              this.state.assignments.push(asg);
            }
          } else if (payload.eventType === 'DELETE') {
            this.state.assignments = this.state.assignments.filter(a => a.id !== payload.old.id);
          }
        }
        this.notify();
      } catch (e) {
        console.warn("Realtime handle error:", e);
      }
    }

    // --- Screen Navigation ---
    setActiveScreen(screenName) {
      this.state.activeScreen = screenName;
      this.notify();
    }

    setSearchQuery(q) {
      this.state.searchQuery = q || '';
      this.notify();
    }

    // --- Truck CRUD (Cloud Synchronized) ---
    async addTruck(truck) {
      const newTruck = Object.assign({}, truck, {
        isSample: !!truck.isSample,
        createdAt: new Date().toISOString()
      });
      this.state.trucks.push(newTruck);

      if (!this.state.activeTruckId) {
        this.state.activeTruckId = newTruck.id;
      }

      this.addNotification("Truck Registered", `Vehicle ${newTruck.id} (${newTruck.vehicleType}) added.`, "success");
      this.notify();

      // Cloud Sync
      if (this.state.cloudStatus === 'CONNECTED' && window.ReRoute.supabaseSync) {
        try {
          await window.ReRoute.supabaseSync.upsertTruck(newTruck);
        } catch (err) {
          console.error("Cloud sync truck error:", err);
          this.addNotification("Cloud Sync Warning", `Truck saved locally, but cloud write failed: ${err.message}`, "warning");
        }
      }

      return newTruck;
    }

    async updateTruck(id, patch) {
      const idx = this.state.trucks.findIndex(t => t.id === id);
      if (idx !== -1) {
        this.state.trucks[idx] = Object.assign({}, this.state.trucks[idx], patch, { updatedAt: new Date().toISOString() });
        const updated = this.state.trucks[idx];
        this.notify();

        // Cloud Sync
        if (this.state.cloudStatus === 'CONNECTED' && window.ReRoute.supabaseSync) {
          try {
            await window.ReRoute.supabaseSync.upsertTruck(updated);
          } catch (err) {
            console.error("Cloud update truck error:", err);
          }
        }

        return updated;
      }
      return null;
    }

    async deleteTruck(id) {
      this.state.assignments = this.state.assignments.filter(a => a.truckId !== id);
      this.state.trucks = this.state.trucks.filter(t => t.id !== id);

      if (this.state.activeTruckId === id) {
        this.state.activeTruckId = this.state.trucks.length > 0 ? this.state.trucks[0].id : null;
      }

      this.addNotification("Truck Removed", `Vehicle ${id} removed from fleet.`, "warning");
      this.notify();

      // Cloud Sync
      if (this.state.cloudStatus === 'CONNECTED' && window.ReRoute.supabaseSync) {
        try {
          await window.ReRoute.supabaseSync.deleteTruck(id);
        } catch (err) {
          console.error("Cloud delete truck error:", err);
        }
      }
    }

    setActiveTruck(id) {
      this.state.activeTruckId = id;
      this.notify();

      if (this.state.cloudStatus === 'CONNECTED' && window.ReRoute.supabaseSync) {
        window.ReRoute.supabaseSync.saveDemoState(this.state.activeTruckId, this.state.selectedShipmentId);
      }
    }

    // --- Shipment CRUD (Cloud Synchronized) ---
    async addShipment(shipment) {
      const newShipment = Object.assign({}, shipment, {
        isSample: !!shipment.isSample,
        status: shipment.status || 'Available',
        createdAt: new Date().toISOString()
      });
      this.state.shipments.push(newShipment);
      this.addNotification("Shipment Created", `Shipment ${newShipment.id} (${newShipment.cargoWeight} kg) logged in demand pool.`, "success");
      this.notify();

      // Cloud Sync
      if (this.state.cloudStatus === 'CONNECTED' && window.ReRoute.supabaseSync) {
        try {
          await window.ReRoute.supabaseSync.upsertShipment(newShipment);
        } catch (err) {
          console.error("Cloud sync shipment error:", err);
          this.addNotification("Cloud Sync Warning", `Shipment saved locally, but cloud write failed: ${err.message}`, "warning");
        }
      }

      return newShipment;
    }

    async updateShipment(id, patch) {
      const idx = this.state.shipments.findIndex(s => s.id === id);
      if (idx !== -1) {
        this.state.shipments[idx] = Object.assign({}, this.state.shipments[idx], patch, { updatedAt: new Date().toISOString() });
        const updated = this.state.shipments[idx];
        this.notify();

        // Cloud Sync
        if (this.state.cloudStatus === 'CONNECTED' && window.ReRoute.supabaseSync) {
          try {
            await window.ReRoute.supabaseSync.upsertShipment(updated);
          } catch (err) {
            console.error("Cloud update shipment error:", err);
          }
        }

        return updated;
      }
      return null;
    }

    async deleteShipment(id) {
      const assignment = this.state.assignments.find(a => a.shipmentId === id);
      if (assignment) {
        await this.cancelAssignment(assignment.id);
      }
      this.state.shipments = this.state.shipments.filter(s => s.id !== id);
      if (this.state.selectedShipmentId === id) {
        this.state.selectedShipmentId = null;
      }
      this.addNotification("Shipment Deleted", `Shipment ${id} deleted from database.`, "warning");
      this.notify();

      // Cloud Sync
      if (this.state.cloudStatus === 'CONNECTED' && window.ReRoute.supabaseSync) {
        try {
          await window.ReRoute.supabaseSync.deleteShipment(id);
        } catch (err) {
          console.error("Cloud delete shipment error:", err);
        }
      }
    }

    async cancelShipment(id) {
      const shipment = this.state.shipments.find(s => s.id === id);
      if (shipment) {
        shipment.status = 'Cancelled';
        const assignment = this.state.assignments.find(a => a.shipmentId === id);
        if (assignment) {
          const truck = this.state.trucks.find(t => t.id === assignment.truckId);
          if (truck && truck.status === 'Backhaul Assigned') {
            truck.status = 'Available';
            if (this.state.cloudStatus === 'CONNECTED' && window.ReRoute.supabaseSync) {
              window.ReRoute.supabaseSync.upsertTruck(truck);
            }
          }
          this.state.assignments = this.state.assignments.filter(a => a.id !== assignment.id);
          if (this.state.cloudStatus === 'CONNECTED' && window.ReRoute.supabaseSync) {
            window.ReRoute.supabaseSync.deleteAssignment(assignment.id);
          }
        }

        this.addNotification("Shipment Cancelled", `Shipment ${id} marked as Cancelled.`, "danger");
        this.notify();

        // Cloud Sync
        if (this.state.cloudStatus === 'CONNECTED' && window.ReRoute.supabaseSync) {
          window.ReRoute.supabaseSync.upsertShipment(shipment);
        }
      }
    }

    async restoreShipment(id) {
      const shipment = this.state.shipments.find(s => s.id === id);
      if (shipment) {
        shipment.status = 'Available';
        this.addNotification("Shipment Restored", `Shipment ${id} restored to Available status.`, "info");
        this.notify();

        // Cloud Sync
        if (this.state.cloudStatus === 'CONNECTED' && window.ReRoute.supabaseSync) {
          window.ReRoute.supabaseSync.upsertShipment(shipment);
        }
      }
    }

    setSelectedShipment(id) {
      this.state.selectedShipmentId = id;
      this.notify();

      if (this.state.cloudStatus === 'CONNECTED' && window.ReRoute.supabaseSync) {
        window.ReRoute.supabaseSync.saveDemoState(this.state.activeTruckId, this.state.selectedShipmentId);
      }
    }

    // --- Backhaul Assignment (Cloud Synchronized) ---
    async assignBackhaul(truckId, shipmentId, matchDetails = {}) {
      const truck = this.state.trucks.find(t => t.id === truckId);
      const shipment = this.state.shipments.find(s => s.id === shipmentId);

      if (!truck || !shipment) {
        throw new Error("Invalid truck or shipment ID for assignment.");
      }

      truck.status = 'Backhaul Assigned';
      shipment.status = 'Reserved';

      const assignmentRecord = {
        id: `ASG-${Date.now().toString().slice(-6)}`,
        truckId,
        shipmentId,
        assignedAt: new Date().toISOString(),
        matchScore: matchDetails.matchScore || 0,
        detourKm: matchDetails.detourKm || 0,
        loadedKm: matchDetails.loadedKm || 0,
        etaArrival: matchDetails.eta ? matchDetails.eta.predictedArrivalFormatted : "Scheduled",
        sustainability: matchDetails.sustainability || null,
        costGain: matchDetails.sustainability ? matchDetails.sustainability.netEconomicGain : 0
      };

      this.state.assignments.push(assignmentRecord);
      this.addNotification("Backhaul Assigned", `Assigned shipment ${shipmentId} to truck ${truckId} (${assignmentRecord.matchScore}% Match).`, "success");
      this.notify();

      // Cloud Sync
      if (this.state.cloudStatus === 'CONNECTED' && window.ReRoute.supabaseSync) {
        try {
          await Promise.all([
            window.ReRoute.supabaseSync.createAssignment(assignmentRecord),
            window.ReRoute.supabaseSync.upsertTruck(truck),
            window.ReRoute.supabaseSync.upsertShipment(shipment)
          ]);
        } catch (err) {
          console.error("Cloud assign backhaul error:", err);
        }
      }

      return assignmentRecord;
    }

    async cancelAssignment(assignmentId) {
      const idx = this.state.assignments.findIndex(a => a.id === assignmentId);
      if (idx !== -1) {
        const assignment = this.state.assignments[idx];
        const truck = this.state.trucks.find(t => t.id === assignment.truckId);
        const shipment = this.state.shipments.find(s => s.id === assignment.shipmentId);

        if (truck && truck.status === 'Backhaul Assigned') {
          truck.status = 'Available';
        }
        if (shipment && shipment.status === 'Reserved') {
          shipment.status = 'Available';
        }

        this.state.assignments.splice(idx, 1);
        this.addNotification("Assignment Removed", `Assignment ${assignmentId} cancelled. Vehicle reverted to Available.`, "info");
        this.notify();

        // Cloud Sync
        if (this.state.cloudStatus === 'CONNECTED' && window.ReRoute.supabaseSync) {
          try {
            await Promise.all([
              window.ReRoute.supabaseSync.deleteAssignment(assignmentId),
              truck ? window.ReRoute.supabaseSync.upsertTruck(truck) : Promise.resolve(),
              shipment ? window.ReRoute.supabaseSync.upsertShipment(shipment) : Promise.resolve()
            ]);
          } catch (err) {
            console.error("Cloud cancel assignment error:", err);
          }
        }
      }
    }

    // --- Sample Data & Cleanup (Cloud Synchronized) ---
    async loadSampleData() {
      const samples = (typeof window !== 'undefined' && window.ReRoute) ? window.ReRoute : {};
      const sampleTrucks = samples.SAMPLE_TRUCKS || [];
      const sampleShipments = samples.SAMPLE_SHIPMENTS || [];

      const addedTrucks = [];
      const addedShipments = [];

      sampleTrucks.forEach(st => {
        if (!this.state.trucks.some(t => t.id === st.id)) {
          const clone = JSON.parse(JSON.stringify(st));
          this.state.trucks.push(clone);
          addedTrucks.push(clone);
        }
      });

      sampleShipments.forEach(ss => {
        if (!this.state.shipments.some(s => s.id === ss.id)) {
          const clone = JSON.parse(JSON.stringify(ss));
          this.state.shipments.push(clone);
          addedShipments.push(clone);
        }
      });

      if (!this.state.activeTruckId && this.state.trucks.length > 0) {
        this.state.activeTruckId = this.state.trucks[0].id;
      }

      this.addNotification("Sample Data Loaded", `Loaded ${sampleTrucks.length} trucks and ${sampleShipments.length} shipments (clearly tagged as SAMPLE DATA).`, "info");
      this.notify();

      // Cloud Sync
      if (this.state.cloudStatus === 'CONNECTED' && window.ReRoute.supabaseSync) {
        try {
          await Promise.all([
            window.ReRoute.supabaseSync.batchUpsertTrucks(addedTrucks),
            window.ReRoute.supabaseSync.batchUpsertShipments(addedShipments)
          ]);
        } catch (err) {
          console.error("Cloud batch sample error:", err);
        }
      }
    }

    async clearUserData() {
      this.state.trucks = this.state.trucks.filter(t => t.isSample);
      this.state.shipments = this.state.shipments.filter(s => s.isSample);
      this.state.assignments = this.state.assignments.filter(a => {
        const t = this.state.trucks.find(trk => trk.id === a.truckId);
        const s = this.state.shipments.find(shp => shp.id === a.shipmentId);
        return t && s;
      });

      if (!this.state.trucks.some(t => t.id === this.state.activeTruckId)) {
        this.state.activeTruckId = this.state.trucks.length > 0 ? this.state.trucks[0].id : null;
      }

      this.addNotification("User Data Cleared", "Removed user-created fleet and shipment records.", "warning");
      this.notify();

      // Cloud Sync
      if (this.state.cloudStatus === 'CONNECTED' && window.ReRoute.supabaseSync) {
        try {
          await window.ReRoute.supabaseSync.clearCloudData('user_only');
        } catch (err) {
          console.error("Cloud clear user data error:", err);
        }
      }
    }

    async clearAllData() {
      this.state.trucks = [];
      this.state.shipments = [];
      this.state.assignments = [];
      this.state.activeTruckId = null;
      this.state.selectedShipmentId = null;
      this.state.recoverySimulation = null;
      this.addNotification("All Data Cleared", "Complete system reset to initial empty state.", "warning");
      this.notify();

      // Cloud Sync
      if (this.state.cloudStatus === 'CONNECTED' && window.ReRoute.supabaseSync) {
        try {
          await window.ReRoute.supabaseSync.clearCloudData('all');
        } catch (err) {
          console.error("Cloud clear all error:", err);
        }
      }
    }

    // --- Model Settings (Cloud Synchronized) ---
    async updateModelSettings(newSettings) {
      this.state.modelSettings = Object.assign({}, this.state.modelSettings, newSettings);
      this.addNotification("Model Settings Updated", "Matching weights and operational parameters reconfigured.", "info");
      this.notify();

      // Cloud Sync
      if (this.state.cloudStatus === 'CONNECTED' && window.ReRoute.supabaseSync) {
        try {
          await window.ReRoute.supabaseSync.saveModelSettings(this.state.modelSettings);
        } catch (err) {
          console.error("Cloud save model settings error:", err);
        }
      }
    }

    // --- Notifications ---
    addNotification(title, message, type = 'info') {
      const notif = {
        id: 'notif-' + Date.now() + '-' + Math.floor(Math.random()*1000),
        title,
        message,
        type,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      this.state.notifications.unshift(notif);
      if (this.state.notifications.length > 30) {
        this.state.notifications.pop();
      }

      if (typeof window !== 'undefined' && typeof window.showToastNotification === 'function') {
        window.showToastNotification(notif);
      }
    }

    // --- Export / Import ---
    exportToJSON() {
      return JSON.stringify({
        trucks: this.state.trucks,
        shipments: this.state.shipments,
        assignments: this.state.assignments,
        modelSettings: this.state.modelSettings,
        exportedAt: new Date().toISOString()
      }, null, 2);
    }

    importFromJSON(jsonString) {
      try {
        const data = JSON.parse(jsonString);
        if (!Array.isArray(data.trucks) || !Array.isArray(data.shipments)) {
          throw new Error("Invalid JSON structure: Must contain 'trucks' and 'shipments' arrays.");
        }
        this.state.trucks = data.trucks;
        this.state.shipments = data.shipments;
        this.state.assignments = Array.isArray(data.assignments) ? data.assignments : [];
        if (data.modelSettings) {
          this.state.modelSettings = Object.assign({}, DEFAULT_SETTINGS, data.modelSettings);
        }
        this.state.activeTruckId = this.state.trucks.length > 0 ? this.state.trucks[0].id : null;
        this.addNotification("Data Imported", `Restored ${this.state.trucks.length} trucks and ${this.state.shipments.length} shipments.`, "success");
        this.notify();

        // Cloud Sync batch in background
        if (this.state.cloudStatus === 'CONNECTED' && window.ReRoute.supabaseSync) {
          Promise.all([
            window.ReRoute.supabaseSync.batchUpsertTrucks(this.state.trucks),
            window.ReRoute.supabaseSync.batchUpsertShipments(this.state.shipments)
          ]).catch(err => {
            console.error("Cloud batch import sync error:", err);
          });
        }

        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    exportFleetCSV() {
      const headers = [
        "id", "vehicleType", "currentLocation", "currentLat", "currentLng",
        "destination", "destLat", "destLng", "maxCapacity", "currentLoad",
        "mileage", "fuelPrice", "expectedDeliveryTime", "driverAvailability", "status"
      ];
      const rows = this.state.trucks.map(t => [
        t.id, `"${t.vehicleType}"`, `"${t.currentLocation}"`, t.currentLat, t.currentLng,
        `"${t.destination}"`, t.destLat, t.destLng, t.maxCapacity, t.currentLoad,
        t.mileage, t.fuelPrice, t.expectedDeliveryTime, `"${t.driverAvailability}"`, t.status
      ].join(','));
      return [headers.join(','), ...rows].join('\n');
    }

    exportShipmentsCSV() {
      const headers = [
        "id", "pickupLocation", "pickupLat", "pickupLng", "dropLocation",
        "dropLat", "dropLng", "cargoWeight", "pickupWindowStart", "pickupWindowEnd",
        "deliveryDeadline", "priority", "value", "requiredVehicleType", "specialRequirements", "status"
      ];
      const rows = this.state.shipments.map(s => [
        s.id, `"${s.pickupLocation}"`, s.pickupLat, s.pickupLng, `"${s.dropLocation}"`,
        s.dropLat, s.dropLng, s.cargoWeight, s.pickupWindowStart, s.pickupWindowEnd,
        s.deliveryDeadline, s.priority, s.value, `"${s.requiredVehicleType}"`, `"${s.specialRequirements}"`, s.status
      ].join(','));
      return [headers.join(','), ...rows].join('\n');
    }
  }

  const storeInstance = new Store();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = storeInstance;
  }
  if (typeof window !== 'undefined') {
    window.ReRoute = window.ReRoute || {};
    window.ReRoute.store = storeInstance;
  }
})();
