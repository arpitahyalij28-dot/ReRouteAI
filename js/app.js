// ReRoute AI 2.0 - Main Application Orchestrator
// Coordinates Navigation, Modals, Toasts, Store Subscriptions, and Component Rendering

(function() {
  window.ReRoute = window.ReRoute || {};
  const store = window.ReRoute.store;

  // --- Toast Notifications ---
  window.showToastNotification = function(notif) {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';

    let iconSvg = '<svg class="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    if (notif.type === 'success') {
      iconSvg = '<svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    } else if (notif.type === 'warning') {
      iconSvg = '<svg class="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
    } else if (notif.type === 'danger') {
      iconSvg = '<svg class="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="flex-1 min-w-0">
        <div class="text-xs font-bold text-white">${notif.title}</div>
        <div class="text-[11px] text-[#94A3B8] mt-0.5">${notif.message}</div>
      </div>
      <button onclick="this.parentElement.remove()" class="text-[#64748B] hover:text-white text-xs">✕</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4500);
  };

  // --- Modal Helpers ---
  function createModalShell(title, contentHtml) {
    const existing = document.getElementById('reroute-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'reroute-modal-overlay';
    overlay.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn';
    overlay.innerHTML = `
      <div class="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[#334155] shadow-2xl p-6 relative">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-[#1E293B]">
          <h3 class="text-base font-bold text-white">${title}</h3>
          <button onclick="window.ReRoute.UI.closeModal()" class="text-[#94A3B8] hover:text-white text-base font-bold p-1">✕</button>
        </div>
        <div>
          ${contentHtml}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  function closeModal() {
    const overlay = document.getElementById('reroute-modal-overlay');
    if (overlay) overlay.remove();
  }

  // --- Add / Edit Truck Modal ---
  function openAddTruckModal(existingId = null) {
    const state = store.getState();
    const existing = existingId ? state.trucks.find(t => t.id === existingId) : null;
    const isEdit = !!existing;

    const defaultCompletion = new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16);

    const html = `
      <form id="truck-form" class="space-y-4 text-xs" onsubmit="window.ReRoute.UI.handleTruckFormSubmit(event, ${isEdit ? `'${existingId}'` : 'null'})">
        <div id="truck-form-error" class="hidden p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs"></div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Truck ID -->
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Truck ID *</label>
            <input 
              type="text" id="t-id" required value="${existing ? existing.id : 'TRK-' + Math.floor(100 + Math.random()*900)}" 
              class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white font-mono"
              ${isEdit ? 'readonly' : ''}
            >
          </div>

          <!-- Vehicle Type -->
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Vehicle Type *</label>
            <select id="t-type" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white">
              <option value="32ft Multi-Axle (15T)" ${existing?.vehicleType === '32ft Multi-Axle (15T)' ? 'selected' : ''}>32ft Multi-Axle (15T)</option>
              <option value="24ft Container (9T)" ${existing?.vehicleType === '24ft Container (9T)' ? 'selected' : ''}>24ft Container (9T)</option>
              <option value="14ft Open Truck (4T)" ${existing?.vehicleType === '14ft Open Truck (4T)' ? 'selected' : ''}>14ft Open Truck (4T)</option>
              <option value="Trailer 40ft (25T)" ${existing?.vehicleType === 'Trailer 40ft (25T)' ? 'selected' : ''}>Trailer 40ft (25T)</option>
              <option value="Reefer (10T)" ${existing?.vehicleType === 'Reefer (10T)' ? 'selected' : ''}>Reefer (10T)</option>
            </select>
          </div>
        </div>

        <!-- Current Location & Coords -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Current Location *</label>
            <input type="text" id="t-curr-loc" required value="${existing ? existing.currentLocation : 'Pune Logistics Park'}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white">
          </div>
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Current Latitude *</label>
            <input type="number" step="0.0001" id="t-curr-lat" required value="${existing ? existing.currentLat : 18.5204}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white font-mono">
          </div>
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Current Longitude *</label>
            <input type="number" step="0.0001" id="t-curr-lng" required value="${existing ? existing.currentLng : 73.8567}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white font-mono">
          </div>
        </div>

        <!-- Destination & Coords -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Destination *</label>
            <input type="text" id="t-dest" required value="${existing ? existing.destination : 'Mumbai JNPT Port'}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white">
          </div>
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Destination Latitude *</label>
            <input type="number" step="0.0001" id="t-dest-lat" required value="${existing ? existing.destLat : 18.9496}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white font-mono">
          </div>
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Destination Longitude *</label>
            <input type="number" step="0.0001" id="t-dest-lng" required value="${existing ? existing.destLng : 72.9515}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white font-mono">
          </div>
        </div>

        <!-- Capacities & Rates -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Max Capacity (kg) *</label>
            <input type="number" id="t-max-cap" required value="${existing ? existing.maxCapacity : 15000}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white font-mono">
          </div>
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Current Load (kg) *</label>
            <input type="number" id="t-cur-load" required value="${existing ? existing.currentLoad : 11500}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white font-mono">
          </div>
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Mileage (km/L) *</label>
            <input type="number" step="0.1" id="t-mileage" required value="${existing ? existing.mileage : 4.2}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white font-mono">
          </div>
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Fuel Price (₹/L) *</label>
            <input type="number" step="0.5" id="t-fuel" required value="${existing ? existing.fuelPrice : 94.50}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white font-mono">
          </div>
        </div>

        <!-- Time & Status -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Expected Delivery Completion *</label>
            <input type="datetime-local" id="t-delivery-time" required value="${existing ? existing.expectedDeliveryTime : defaultCompletion}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white">
          </div>
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Driver Availability *</label>
            <input type="text" id="t-driver" required value="${existing ? existing.driverAvailability : 'Immediate / On Duty'}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white">
          </div>
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Vehicle Status *</label>
            <select id="t-status" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white">
              <option value="Available" ${existing?.status === 'Available' ? 'selected' : ''}>Available</option>
              <option value="In Transit" ${existing?.status === 'In Transit' || !existing ? 'selected' : ''}>In Transit</option>
              <option value="Loading" ${existing?.status === 'Loading' ? 'selected' : ''}>Loading</option>
              <option value="Delayed" ${existing?.status === 'Delayed' ? 'selected' : ''}>Delayed</option>
              <option value="Maintenance" ${existing?.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
              <option value="Backhaul Assigned" ${existing?.status === 'Backhaul Assigned' ? 'selected' : ''}>Backhaul Assigned</option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
          <button type="button" onclick="window.ReRoute.UI.closeModal()" class="btn-outline px-4 py-2">
            Cancel
          </button>
          <button type="submit" class="btn-primary px-5 py-2 font-bold shadow">
            ${isEdit ? 'Update Truck' : 'Save Truck'}
          </button>
        </div>
      </form>
    `;

    createModalShell(isEdit ? `Edit Vehicle: ${existing.id}` : "Register New Truck", html);
  }

  function handleTruckFormSubmit(event, editId) {
    event.preventDefault();
    const validation = window.ReRoute.Validation;

    const truck = {
      id: document.getElementById('t-id').value.trim(),
      vehicleType: document.getElementById('t-type').value,
      currentLocation: document.getElementById('t-curr-loc').value.trim(),
      currentLat: Number(document.getElementById('t-curr-lat').value),
      currentLng: Number(document.getElementById('t-curr-lng').value),
      destination: document.getElementById('t-dest').value.trim(),
      destLat: Number(document.getElementById('t-dest-lat').value),
      destLng: Number(document.getElementById('t-dest-lng').value),
      maxCapacity: Number(document.getElementById('t-max-cap').value),
      currentLoad: Number(document.getElementById('t-cur-load').value),
      mileage: Number(document.getElementById('t-mileage').value),
      fuelPrice: Number(document.getElementById('t-fuel').value),
      expectedDeliveryTime: document.getElementById('t-delivery-time').value,
      driverAvailability: document.getElementById('t-driver').value.trim(),
      status: document.getElementById('t-status').value,
      _originalId: editId,
      isSample: false
    };

    const res = validation.validateTruck(truck, store.getState().trucks, !!editId);
    if (!res.isValid) {
      const errBox = document.getElementById('truck-form-error');
      errBox.innerHTML = `<strong>Validation Error:</strong><ul class="list-disc pl-4 mt-1">${res.errors.map(e => `<li>${e}</li>`).join('')}</ul>`;
      errBox.classList.remove('hidden');
      return;
    }

    if (editId) {
      store.updateTruck(editId, truck);
    } else {
      store.addTruck(truck);
    }

    closeModal();
  }

  // --- Add / Edit Shipment Modal ---
  function openAddShipmentModal(existingId = null) {
    const state = store.getState();
    const existing = existingId ? state.shipments.find(s => s.id === existingId) : null;
    const isEdit = !!existing;

    const now = Date.now();
    const defaultWindowStart = new Date(now + 2.5 * 3600 * 1000).toISOString().slice(0, 16);
    const defaultWindowEnd = new Date(now + 6 * 3600 * 1000).toISOString().slice(0, 16);
    const defaultDeadline = new Date(now + 14 * 3600 * 1000).toISOString().slice(0, 16);

    const html = `
      <form id="shipment-form" class="space-y-4 text-xs" onsubmit="window.ReRoute.UI.handleShipmentFormSubmit(event, ${isEdit ? `'${existingId}'` : 'null'})">
        <div id="shipment-form-error" class="hidden p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs"></div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Shipment ID -->
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Shipment ID *</label>
            <input 
              type="text" id="s-id" required value="${existing ? existing.id : 'SHP-' + Math.floor(100 + Math.random()*900)}" 
              class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white font-mono"
              ${isEdit ? 'readonly' : ''}
            >
          </div>
          <!-- Priority -->
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Priority SLA *</label>
            <select id="s-priority" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white">
              <option value="Critical" ${existing?.priority === 'Critical' ? 'selected' : ''}>Critical (Express SLA)</option>
              <option value="High" ${existing?.priority === 'High' ? 'selected' : ''}>High</option>
              <option value="Standard" ${existing?.priority === 'Standard' || !existing ? 'selected' : ''}>Standard</option>
              <option value="Flexible" ${existing?.priority === 'Flexible' ? 'selected' : ''}>Flexible</option>
            </select>
          </div>
        </div>

        <!-- Pickup Location & Coords -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Pickup Location *</label>
            <input type="text" id="s-pick-loc" required value="${existing ? existing.pickupLocation : 'Navi Mumbai Taloja MIDC'}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white">
          </div>
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Pickup Latitude *</label>
            <input type="number" step="0.0001" id="s-pick-lat" required value="${existing ? existing.pickupLat : 19.0330}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white font-mono">
          </div>
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Pickup Longitude *</label>
            <input type="number" step="0.0001" id="s-pick-lng" required value="${existing ? existing.pickupLng : 73.0297}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white font-mono">
          </div>
        </div>

        <!-- Drop Location & Coords -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Drop Location *</label>
            <input type="text" id="s-drop-loc" required value="${existing ? existing.dropLocation : 'Pune Chakan Auto Cluster'}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white">
          </div>
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Drop Latitude *</label>
            <input type="number" step="0.0001" id="s-drop-lat" required value="${existing ? existing.dropLat : 18.7606}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white font-mono">
          </div>
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Drop Longitude *</label>
            <input type="number" step="0.0001" id="s-drop-lng" required value="${existing ? existing.dropLng : 73.8636}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white font-mono">
          </div>
        </div>

        <!-- Cargo Weight, Value, Required Vehicle -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Cargo Weight (kg) *</label>
            <input type="number" id="s-weight" required value="${existing ? existing.cargoWeight : 3200}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white font-mono">
          </div>
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Estimated Value (₹) *</label>
            <input type="number" id="s-value" required value="${existing ? existing.value : 18500}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white font-mono">
          </div>
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Required Vehicle Type</label>
            <select id="s-veh-type" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white">
              <option value="Any" ${existing?.requiredVehicleType === 'Any' || !existing ? 'selected' : ''}>Any / Compatible</option>
              <option value="32ft Multi-Axle (15T)" ${existing?.requiredVehicleType === '32ft Multi-Axle (15T)' ? 'selected' : ''}>32ft Multi-Axle (15T)</option>
              <option value="24ft Container (9T)" ${existing?.requiredVehicleType === '24ft Container (9T)' ? 'selected' : ''}>24ft Container (9T)</option>
              <option value="14ft Open Truck (4T)" ${existing?.requiredVehicleType === '14ft Open Truck (4T)' ? 'selected' : ''}>14ft Open Truck (4T)</option>
              <option value="Trailer 40ft (25T)" ${existing?.requiredVehicleType === 'Trailer 40ft (25T)' ? 'selected' : ''}>Trailer 40ft (25T)</option>
            </select>
          </div>
        </div>

        <!-- Schedule Windows -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Pickup Window Start *</label>
            <input type="datetime-local" id="s-start" required value="${existing ? existing.pickupWindowStart : defaultWindowStart}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white">
          </div>
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Pickup Window End *</label>
            <input type="datetime-local" id="s-end" required value="${existing ? existing.pickupWindowEnd : defaultWindowEnd}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white">
          </div>
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Delivery Deadline *</label>
            <input type="datetime-local" id="s-deadline" required value="${existing ? existing.deliveryDeadline : defaultDeadline}" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white">
          </div>
        </div>

        <!-- Status & Special Reqs -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Special Requirements</label>
            <input type="text" id="s-reqs" value="${existing ? existing.specialRequirements : 'None'}" placeholder="e.g. Forklift Loading, Hazmat Clearance" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white">
          </div>
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Shipment Status *</label>
            <select id="s-status" class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white">
              <option value="Available" ${existing?.status === 'Available' || !existing ? 'selected' : ''}>Available</option>
              <option value="Reserved" ${existing?.status === 'Reserved' ? 'selected' : ''}>Reserved</option>
              <option value="Cancelled" ${existing?.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
              <option value="Completed" ${existing?.status === 'Completed' ? 'selected' : ''}>Completed</option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
          <button type="button" onclick="window.ReRoute.UI.closeModal()" class="btn-outline px-4 py-2">
            Cancel
          </button>
          <button type="submit" class="btn-primary px-5 py-2 font-bold shadow bg-gradient-to-r from-cyan-600 to-blue-600">
            ${isEdit ? 'Update Shipment' : 'Save Shipment'}
          </button>
        </div>
      </form>
    `;

    createModalShell(isEdit ? `Edit Shipment: ${existing.id}` : "Register Backhaul Shipment", html);
  }

  function handleShipmentFormSubmit(event, editId) {
    event.preventDefault();
    const validation = window.ReRoute.Validation;

    const shipment = {
      id: document.getElementById('s-id').value.trim(),
      pickupLocation: document.getElementById('s-pick-loc').value.trim(),
      pickupLat: Number(document.getElementById('s-pick-lat').value),
      pickupLng: Number(document.getElementById('s-pick-lng').value),
      dropLocation: document.getElementById('s-drop-loc').value.trim(),
      dropLat: Number(document.getElementById('s-drop-lat').value),
      dropLng: Number(document.getElementById('s-drop-lng').value),
      cargoWeight: Number(document.getElementById('s-weight').value),
      value: Number(document.getElementById('s-value').value),
      requiredVehicleType: document.getElementById('s-veh-type').value,
      pickupWindowStart: document.getElementById('s-start').value,
      pickupWindowEnd: document.getElementById('s-end').value,
      deliveryDeadline: document.getElementById('s-deadline').value,
      priority: document.getElementById('s-priority').value,
      specialRequirements: document.getElementById('s-reqs').value.trim() || 'None',
      status: document.getElementById('s-status').value,
      _originalId: editId,
      isSample: false
    };

    const res = validation.validateShipment(shipment, store.getState().shipments, !!editId);
    if (!res.isValid) {
      const errBox = document.getElementById('shipment-form-error');
      errBox.innerHTML = `<strong>Validation Error:</strong><ul class="list-disc pl-4 mt-1">${res.errors.map(e => `<li>${e}</li>`).join('')}</ul>`;
      errBox.classList.remove('hidden');
      return;
    }

    if (editId) {
      store.updateShipment(editId, shipment);
    } else {
      store.addShipment(shipment);
    }

    closeModal();
  }

  // --- View Details Modal ---
  function openViewTruckModal(truckId) {
    const truck = store.getState().trucks.find(t => t.id === truckId);
    if (!truck) return;

    const availCap = Math.max(0, truck.maxCapacity - truck.currentLoad);

    const html = `
      <div class="space-y-4 text-xs">
        <div class="grid grid-cols-2 gap-3 p-4 rounded-xl bg-[#0E1626] border border-[#1E293B]">
          <div><span class="text-[#64748B]">Truck ID:</span> <strong class="text-white font-mono">${truck.id}</strong></div>
          <div><span class="text-[#64748B]">Vehicle Type:</span> <strong class="text-white">${truck.vehicleType}</strong></div>
          <div><span class="text-[#64748B]">Status:</span> <strong class="text-cyan-400 font-semibold">${truck.status}</strong></div>
          <div><span class="text-[#64748B]">Driver:</span> <strong class="text-white">${truck.driverAvailability}</strong></div>
        </div>

        <div class="p-4 rounded-xl bg-[#0E1626] border border-[#1E293B] space-y-2">
          <div class="font-bold text-white mb-1">Route & Coordinates</div>
          <div class="flex justify-between">
            <span class="text-[#64748B]">Origin:</span>
            <span class="text-white">${truck.currentLocation} (${truck.currentLat?.toFixed(4)}, ${truck.currentLng?.toFixed(4)})</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[#64748B]">Destination:</span>
            <span class="text-cyan-400">${truck.destination} (${truck.destLat?.toFixed(4)}, ${truck.destLng?.toFixed(4)})</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[#64748B]">Delivery Completion:</span>
            <span class="text-white font-mono">${truck.expectedDeliveryTime ? new Date(truck.expectedDeliveryTime).toLocaleString() : '—'}</span>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-[#0E1626] border border-[#1E293B] space-y-2">
          <div class="font-bold text-white mb-1">Payload & Economic Constants</div>
          <div class="flex justify-between">
            <span class="text-[#64748B]">Capacity:</span>
            <span class="text-white font-mono">${truck.maxCapacity} kg (Available: ${availCap} kg)</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[#64748B]">Mileage:</span>
            <span class="text-white font-mono">${truck.mileage} km/L</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[#64748B]">Fuel Price:</span>
            <span class="text-white font-mono">₹${truck.fuelPrice}/L</span>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button onclick="window.ReRoute.UI.closeModal()" class="btn-outline px-4 py-2">Close</button>
          <button onclick="window.ReRoute.UI.closeModal(); window.ReRoute.UI.runAnalysisForTruck('${truck.id}')" class="btn-primary px-4 py-2">
            Run ReRoute AI on this Vehicle
          </button>
        </div>
      </div>
    `;

    createModalShell(`Vehicle Specifications: ${truck.id}`, html);
  }

  // --- Deletion Confirmations ---
  function deleteTruckConfirm(truckId) {
    if (confirm(`Are you sure you want to delete vehicle ${truckId}? Any active assignments will be unlinked.`)) {
      store.deleteTruck(truckId);
    }
  }

  function deleteShipmentConfirm(shipmentId) {
    if (confirm(`Are you sure you want to delete shipment ${shipmentId}?`)) {
      store.deleteShipment(shipmentId);
    }
  }

  function openClearModal() {
    const html = `
      <div class="space-y-4 text-xs">
        <p class="text-[#94A3B8]">Choose the reset mode for your platform database:</p>

        <div class="space-y-3">
          <button onclick="window.ReRoute.store.clearUserData(); window.ReRoute.UI.closeModal()" class="w-full text-left p-3 rounded-lg bg-[#0E1626] hover:bg-[#1F2937] border border-[#1E293B] transition">
            <div class="font-bold text-amber-300">Clear User Data Only</div>
            <div class="text-[11px] text-[#64748B] mt-0.5">Keeps sample records intact while wiping all manually added trucks & shipments.</div>
          </button>

          <button onclick="window.ReRoute.store.clearAllData(); window.ReRoute.UI.closeModal()" class="w-full text-left p-3 rounded-lg bg-red-950/20 hover:bg-red-950/40 border border-red-500/40 transition">
            <div class="font-bold text-red-400">Clear All Data (Hard Reset)</div>
            <div class="text-[11px] text-[#64748B] mt-0.5">Completely restores initial empty prototype state (0 trucks, 0 shipments).</div>
          </button>
        </div>

        <div class="flex justify-end pt-3">
          <button onclick="window.ReRoute.UI.closeModal()" class="btn-outline px-4 py-1.5 text-xs">Cancel</button>
        </div>
      </div>
    `;
    createModalShell("Reset Logistics Data", html);
  }

  function showValidationModal(title, errors) {
    const html = `
      <div class="space-y-3 text-xs">
        <div class="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300">
          The uploaded CSV contained data validation violations and was rejected:
        </div>
        <div class="max-h-60 overflow-y-auto space-y-1 font-mono text-[11px] text-red-300 bg-[#070D18] p-3 rounded border border-[#1E293B]">
          ${errors.map(err => `<div>• ${err}</div>`).join('')}
        </div>
        <div class="flex justify-end pt-2">
          <button onclick="window.ReRoute.UI.closeModal()" class="btn-primary px-4 py-1.5">Acknowledge</button>
        </div>
      </div>
    `;
    createModalShell(title, html);
  }

  function runAnalysisForTruck(truckId) {
    store.setActiveTruck(truckId);
    store.setActiveScreen('analysis');
    setTimeout(() => {
      if (window.ReRoute.Analysis && typeof window.ReRoute.Analysis.runAnalysis === 'function') {
        window.ReRoute.Analysis.runAnalysis(truckId);
      }
    }, 150);
  }

  // --- Router / View Switcher ---
  function renderActiveScreen() {
    const state = store.getState();
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    // Update active nav links
    document.querySelectorAll('[data-nav-screen]').forEach(el => {
      const screen = el.getAttribute('data-nav-screen');
      if (screen === state.activeScreen) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Update Topbar Data Mode Badge
    const modeBadge = document.getElementById('topbar-data-mode');
    if (modeBadge) {
      const mode = store.getDataMode();
      modeBadge.textContent = mode;
      if (mode === 'SAMPLE DATA') {
        modeBadge.className = 'px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold';
      } else if (mode === 'USER DATA') {
        modeBadge.className = 'px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold';
      } else {
        modeBadge.className = 'px-2.5 py-1 rounded-full bg-slate-500/10 border border-slate-500/30 text-slate-300 text-xs font-semibold';
      }
    }

    // Update Topbar Cloud Status Badge (Supabase)
    const cloudStatusEl = document.getElementById('topbar-cloud-status');
    const cloudDotEl = document.getElementById('topbar-cloud-dot');
    const cloudTextEl = document.getElementById('topbar-cloud-text');
    if (cloudStatusEl && cloudTextEl) {
      const cs = state.cloudStatus || 'CONNECTING';
      if (cs === 'CONNECTED') {
        cloudStatusEl.className = 'cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:border-emerald-400 transition';
        if (cloudDotEl) cloudDotEl.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400';
        cloudTextEl.textContent = 'CLOUD: CONNECTED (Supabase)';
      } else if (cs === 'CONNECTING') {
        cloudStatusEl.className = 'cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold hover:border-cyan-400 transition';
        if (cloudDotEl) cloudDotEl.className = 'w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse';
        cloudTextEl.textContent = 'CLOUD: SYNCING...';
      } else if (cs === 'SCHEMA_PENDING') {
        cloudStatusEl.className = 'cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:border-amber-400 transition';
        if (cloudDotEl) cloudDotEl.className = 'w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse';
        cloudTextEl.textContent = 'CLOUD: TABLES NEEDED';
      } else if (cs === 'FALLBACK_LOCAL') {
        cloudStatusEl.className = 'cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/20 border border-slate-500/40 text-slate-300 text-xs font-semibold hover:border-slate-400 transition';
        if (cloudDotEl) cloudDotEl.className = 'w-1.5 h-1.5 rounded-full bg-amber-400';
        cloudTextEl.textContent = 'CLOUD: LOCAL CACHE';
      } else {
        cloudStatusEl.className = 'cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold hover:border-red-400 transition';
        if (cloudDotEl) cloudDotEl.className = 'w-1.5 h-1.5 rounded-full bg-red-400';
        cloudTextEl.textContent = 'CLOUD: OFFLINE / ERROR';
      }
    }

    // Render target screen component
    switch (state.activeScreen) {
      case 'dashboard':
        window.ReRoute.Dashboard?.render(mainContent);
        break;
      case 'fleet':
        window.ReRoute.Fleet?.render(mainContent);
        break;
      case 'shipments':
        window.ReRoute.Shipments?.render(mainContent);
        break;
      case 'analysis':
        window.ReRoute.Analysis?.render(mainContent);
        break;
      case 'matching':
        window.ReRoute.Matching?.render(mainContent);
        break;
      case 'explainability':
        window.ReRoute.Explainability?.render(mainContent);
        break;
      case 'recovery':
        window.ReRoute.Recovery?.render(mainContent);
        break;
      case 'routes':
        window.ReRoute.Routes?.render(mainContent);
        break;
      case 'sustainability':
        window.ReRoute.Sustainability?.render(mainContent);
        break;
      case 'analytics':
        window.ReRoute.Analytics?.render(mainContent);
        break;
      case 'data-management':
        window.ReRoute.DataManagement?.render(mainContent);
        break;
      case 'settings':
        window.ReRoute.Settings?.render(mainContent);
        break;
      default:
        window.ReRoute.Dashboard?.render(mainContent);
    }
  }

  // --- Clock ---
  function startClock() {
    const clockEl = document.getElementById('live-clock');
    if (!clockEl) return;
    setInterval(() => {
      const d = new Date();
      clockEl.textContent = d.toLocaleTimeString([], { hour12: false });
    }, 1000);
  }

  // --- Notifications Dropdown ---
  function setupNotifications() {
    const btn = document.getElementById('notifications-menu');
    const menu = document.getElementById('notifications-dropdown');
    const badge = document.getElementById('notifications-badge');
    const list = document.getElementById('notifications-list');

    if (!btn || !menu) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('hidden');
      updateList();
    });

    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        menu.classList.add('hidden');
      }
    });

    function updateList() {
      const state = store.getState();
      const notifs = state.notifications || [];
      if (badge) badge.textContent = notifs.length;

      if (!list) return;
      if (notifs.length === 0) {
        list.innerHTML = `<div class="p-4 text-center text-xs text-[#64748B]">No alerts logged.</div>`;
      } else {
        list.innerHTML = notifs.map(n => `
          <div class="p-3 border-b border-[#1E293B] hover:bg-[#1F2937]/50 transition text-xs">
            <div class="flex justify-between items-center mb-0.5">
              <span class="font-bold text-white">${n.title}</span>
              <span class="text-[10px] text-[#64748B] font-mono">${n.timestamp}</span>
            </div>
            <div class="text-[11px] text-[#94A3B8]">${n.message}</div>
          </div>
        `).join('');
      }
    }

    updateList();
  }

  // Global search jump
  function setupSearch() {
    const input = document.getElementById('global-search-input');
    if (!input) return;

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = input.value.trim().toLowerCase();
        if (!q) return;

        // Check if matches truck
        const state = store.getState();
        const trk = state.trucks.find(t => t.id.toLowerCase().includes(q) || (t.destination && t.destination.toLowerCase().includes(q)));
        if (trk) {
          store.setActiveTruck(trk.id);
          store.setActiveScreen('fleet');
          return;
        }

        // Check if matches shipment
        const shp = state.shipments.find(s => s.id.toLowerCase().includes(q) || (s.pickupLocation && s.pickupLocation.toLowerCase().includes(q)));
        if (shp) {
          store.setSelectedShipment(shp.id);
          store.setActiveScreen('shipments');
          return;
        }

        store.setActiveScreen('dashboard');
      }
    });
  }

  // --- Cloud Connection Modal ---
  function openCloudStatusModal() {
    const state = store.getState();
    const cloudStatus = state.cloudStatus || 'CONNECTING';

    let customUrl = '';
    let customKey = '';
    try {
      const stored = localStorage.getItem('reroute_v2_cloud_config');
      if (stored) {
        const p = JSON.parse(stored);
        customUrl = p.url || '';
        customKey = p.anonKey || '';
      }
    } catch(e) {}

    let statusPill = '';
    if (cloudStatus === 'CONNECTED') {
      statusPill = `<span class="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono font-bold flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-400"></span>ONLINE & SYNCHRONIZED</span>`;
    } else if (cloudStatus === 'CONNECTING') {
      statusPill = `<span class="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono font-bold flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>CONNECTING...</span>`;
    } else if (cloudStatus === 'SCHEMA_PENDING') {
      statusPill = `<span class="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-bold flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-400"></span>CONNECTED • SQL SCHEMA REQUIRED</span>`;
    } else if (cloudStatus === 'FALLBACK_LOCAL') {
      statusPill = `<span class="px-2.5 py-1 rounded-full bg-slate-500/20 border border-slate-500/40 text-slate-300 font-mono font-bold flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-400"></span>LOCAL STORAGE FALLBACK</span>`;
    } else {
      statusPill = `<span class="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 font-mono font-bold flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-red-400"></span>ERROR / OFFLINE</span>`;
    }

    const html = `
      <div class="space-y-4 text-xs">
        <!-- Status card -->
        <div class="p-4 rounded-xl bg-[#0E1626] border border-[#1E293B] flex items-center justify-between">
          <div>
            <div class="text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">Cloud Persistence Layer</div>
            <div class="text-white font-bold text-sm mt-0.5">Supabase Realtime PostgreSQL</div>
            <div class="text-[11px] text-[#64748B] mt-1">Multi-browser live synchronization and cross-device persistence</div>
          </div>
          <div>
            ${statusPill}
          </div>
        </div>

        ${state.cloudError ? `
          <div class="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
            <span class="font-bold">Sync Notice:</span> ${state.cloudError}
          </div>
        ` : ''}

        <!-- Information -->
        <div class="p-3 rounded-lg bg-[#0F172A] border border-[#1E293B] text-[#94A3B8] space-y-1.5 text-[11px]">
          <div class="text-white font-bold flex items-center gap-1.5">
            <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Deployment & Environment Credentials
          </div>
          <p>
            When deployed to <strong>Vercel</strong>, the frontend securely fetches credentials from <code class="text-cyan-300 bg-black/40 px-1 py-0.5 rounded">/api/config</code> using serverless environment variables (<code class="text-cyan-300 bg-black/40 px-1 py-0.5 rounded">SUPABASE_URL</code> & <code class="text-cyan-300 bg-black/40 px-1 py-0.5 rounded">SUPABASE_ANON_KEY</code>).
          </p>
          <p>
            You can also connect directly from this browser or test custom credentials below:
          </p>
        </div>

        <!-- Form to input / update keys directly -->
        <form id="cloud-config-form" class="space-y-3" onsubmit="window.ReRoute.UI.handleCloudConfigSubmit(event)">
          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Supabase Project URL</label>
            <input 
              type="url" 
              id="cfg-supabase-url" 
              placeholder="https://xyzcompany.supabase.co" 
              value="${customUrl}"
              class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white font-mono"
            >
          </div>

          <div>
            <label class="block text-[#94A3B8] font-bold mb-1">Supabase Public / Anon API Key</label>
            <input 
              type="text" 
              id="cfg-supabase-key" 
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
              value="${customKey}"
              class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded px-3 py-1.5 text-white font-mono"
            >
          </div>

          <div class="flex items-center justify-between pt-2">
            <button 
              type="button" 
              onclick="window.ReRoute.UI.resetToLocalOnly()" 
              class="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs font-semibold"
            >
              Use Local Cache Only
            </button>

            <div class="flex items-center gap-2">
              <button 
                type="button" 
                onclick="window.ReRoute.UI.closeModal()" 
                class="px-3 py-1.5 rounded border border-[#334155] text-[#94A3B8] hover:text-white transition"
              >
                Close
              </button>
              <button 
                type="submit" 
                class="btn-primary"
              >
                Save & Connect Cloud
              </button>
            </div>
          </div>
        </form>

        <!-- Database Schema Helper -->
        <div class="border-t border-[#1E293B] pt-3 text-[11px] text-[#64748B] flex items-center justify-between">
          <span>SQL Schema: <code class="text-cyan-400">supabase/schema.sql</code></span>
          <button 
            type="button"
            onclick="store.initCloudSync(); window.ReRoute.UI.closeModal();"
            class="text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            ↻ Force Re-sync Now
          </button>
        </div>
      </div>
    `;

    createModalShell('Cloud Synchronization Settings', html);
  }

  function handleCloudConfigSubmit(e) {
    e.preventDefault();
    const url = document.getElementById('cfg-supabase-url').value.trim();
    const anonKey = document.getElementById('cfg-supabase-key').value.trim();

    if (url && anonKey) {
      localStorage.setItem('reroute_v2_cloud_config', JSON.stringify({ url, anonKey }));
      window.showToastNotification({
        type: 'info',
        title: 'Credentials Saved',
        message: 'Reconnecting to Supabase database...'
      });
    } else {
      localStorage.removeItem('reroute_v2_cloud_config');
    }

    closeModal();
    store.initCloudSync();
  }

  function resetToLocalOnly() {
    localStorage.removeItem('reroute_v2_cloud_config');
    window.showToastNotification({
      type: 'warning',
      title: 'Local Fallback',
      message: 'Switched to local browser cache.'
    });
    closeModal();
    store.state.cloudStatus = 'FALLBACK_LOCAL';
    store.notify();
  }

  // --- Initial Boot ---
  function init() {
    // Navigation listeners
    document.querySelectorAll('[data-nav-screen]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const screen = el.getAttribute('data-nav-screen');
        store.setActiveScreen(screen);
      });
    });

    // Subscribe to store updates
    store.subscribe(() => {
      renderActiveScreen();
    });

    startClock();
    setupNotifications();
    setupSearch();
    renderActiveScreen();

    // Initialize Supabase Cloud Sync
    store.initCloudSync().catch(err => {
      console.warn("Cloud sync initialization error:", err);
    });
  }

  // Export UI methods
  window.ReRoute.UI = {
    openAddTruckModal,
    openEditTruckModal: openAddTruckModal,
    handleTruckFormSubmit,
    openAddShipmentModal,
    openEditShipmentModal: openAddShipmentModal,
    handleShipmentFormSubmit,
    openViewTruckModal,
    deleteTruckConfirm,
    deleteShipmentConfirm,
    openClearModal,
    showValidationModal,
    runAnalysisForTruck,
    openCloudStatusModal,
    handleCloudConfigSubmit,
    resetToLocalOnly,
    closeModal
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
