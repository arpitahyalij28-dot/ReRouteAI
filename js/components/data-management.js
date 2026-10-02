// ReRoute AI 2.0 - Data Management Component
// Section 6: Dedicated Fleet & Shipment Data Management
// CSV Import with rigorous validation, CSV Export, JSON Backup, Clear User Data, Load Sample Data

(function() {
  function render(container) {
    const store = window.ReRoute.store;
    const state = store.getState();
    const trucks = state.trucks || [];
    const shipments = state.shipments || [];

    const userTrucksCount = trucks.filter(t => !t.isSample).length;
    const sampleTrucksCount = trucks.filter(t => t.isSample).length;
    const userShipmentsCount = shipments.filter(s => !s.isSample).length;
    const sampleShipmentsCount = shipments.filter(s => s.isSample).length;

    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn max-w-5xl mx-auto">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-extrabold text-white tracking-tight">Data Management & CSV Gateway</h1>
              <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                ${store.getDataMode()}
              </span>
            </div>
            <p class="text-xs text-[#94A3B8] mt-1">
              Import, export, audit, and reset fleet telemetry and freight demand records.
            </p>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="window.ReRoute.store.loadSampleData()" class="btn-outline px-3 py-1.5 text-xs text-amber-300 border-amber-500/40 hover:border-amber-400 font-semibold">
              Load Sample Data
            </button>
            <button onclick="window.ReRoute.DataManagement.exportBackupJSON()" class="btn-outline px-3 py-1.5 text-xs text-cyan-300 border-cyan-500/40 font-semibold">
              Export Backup JSON
            </button>
            <button onclick="window.ReRoute.UI.openClearModal()" class="btn-danger px-3 py-1.5 text-xs font-semibold">
              Clear Data...
            </button>
          </div>
        </div>

        <!-- Section 1: Fleet Data Management -->
        <div class="glass-card p-6 border border-[#1E293B]">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-[#1E293B]">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                <span>Fleet Records</span>
                <span class="text-xs font-mono text-cyan-400">(${trucks.length} total • ${userTrucksCount} user, ${sampleTrucksCount} sample)</span>
              </h2>
              <div class="text-xs text-[#94A3B8]">Vehicle types, capacity limits, coordinates, and operational statuses.</div>
            </div>

            <div class="flex items-center gap-2">
              <button onclick="window.ReRoute.UI.openAddTruckModal()" class="btn-primary px-3 py-1.5 text-xs font-semibold">
                + Add Truck
              </button>
              <button onclick="window.ReRoute.DataManagement.triggerCSVUpload('trucks')" class="btn-outline px-3 py-1.5 text-xs font-semibold">
                Import Trucks CSV
              </button>
              <button onclick="window.ReRoute.DataManagement.downloadCSV('trucks')" class="btn-outline px-3 py-1.5 text-xs text-[#94A3B8] hover:text-white" ${trucks.length === 0 ? 'disabled' : ''}>
                Export CSV
              </button>
            </div>
          </div>

          ${trucks.length === 0 ? `
            <div class="p-6 text-center text-xs text-[#64748B] border border-dashed border-[#1E293B] rounded-lg">
              No vehicles in fleet database. Add manually or import CSV.
            </div>
          ` : `
            <div class="max-h-60 overflow-y-auto">
              <table class="w-full text-left text-xs">
                <thead class="text-[11px] text-[#94A3B8] uppercase border-b border-[#1E293B] bg-[#0E1626]">
                  <tr>
                    <th class="py-2 px-3">ID / Type</th>
                    <th class="py-2 px-3">Current Location</th>
                    <th class="py-2 px-3">Destination</th>
                    <th class="py-2 px-3">Capacity (kg)</th>
                    <th class="py-2 px-3">Status</th>
                    <th class="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#1E293B]">
                  ${trucks.map(t => `
                    <tr class="hover:bg-[#1F2937]/50 transition">
                      <td class="py-2.5 px-3">
                        <span class="font-mono font-bold text-white">${t.id}</span>
                        ${t.isSample ? '<span class="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 ml-1">SAMPLE</span>' : ''}
                        <div class="text-[10px] text-[#94A3B8]">${t.vehicleType}</div>
                      </td>
                      <td class="py-2.5 px-3 text-[#94A3B8]">${t.currentLocation}</td>
                      <td class="py-2.5 px-3 text-white">${t.destination}</td>
                      <td class="py-2.5 px-3 font-mono text-cyan-400 font-semibold">${Number(t.maxCapacity).toLocaleString()}</td>
                      <td class="py-2.5 px-3"><span class="badge-status text-[10px] bg-[#1E293B] text-[#94A3B8]">${t.status}</span></td>
                      <td class="py-2.5 px-3 text-right">
                        <button onclick="window.ReRoute.UI.openEditTruckModal('${t.id}')" class="text-xs text-cyan-400 hover:text-cyan-300 font-semibold mr-2">Edit</button>
                        <button onclick="window.ReRoute.UI.deleteTruckConfirm('${t.id}')" class="text-xs text-red-400 hover:text-red-300">Delete</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Section 2: Shipment Data Management -->
        <div class="glass-card p-6 border border-[#1E293B]">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-[#1E293B]">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                <span>Shipment Demand Records</span>
                <span class="text-xs font-mono text-cyan-400">(${shipments.length} total • ${userShipmentsCount} user, ${sampleShipmentsCount} sample)</span>
              </h2>
              <div class="text-xs text-[#94A3B8]">Pickup & drop nodes, freight weights, time windows, and cargo values.</div>
            </div>

            <div class="flex items-center gap-2">
              <button onclick="window.ReRoute.UI.openAddShipmentModal()" class="btn-primary px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600">
                + Add Shipment
              </button>
              <button onclick="window.ReRoute.DataManagement.triggerCSVUpload('shipments')" class="btn-outline px-3 py-1.5 text-xs font-semibold">
                Import Shipments CSV
              </button>
              <button onclick="window.ReRoute.DataManagement.downloadCSV('shipments')" class="btn-outline px-3 py-1.5 text-xs text-[#94A3B8] hover:text-white" ${shipments.length === 0 ? 'disabled' : ''}>
                Export CSV
              </button>
            </div>
          </div>

          ${shipments.length === 0 ? `
            <div class="p-6 text-center text-xs text-[#64748B] border border-dashed border-[#1E293B] rounded-lg">
              No shipments in demand pool. Add manually or import CSV.
            </div>
          ` : `
            <div class="max-h-60 overflow-y-auto">
              <table class="w-full text-left text-xs">
                <thead class="text-[11px] text-[#94A3B8] uppercase border-b border-[#1E293B] bg-[#0E1626]">
                  <tr>
                    <th class="py-2 px-3">ID</th>
                    <th class="py-2 px-3">Pickup Location</th>
                    <th class="py-2 px-3">Drop Location</th>
                    <th class="py-2 px-3">Weight (kg)</th>
                    <th class="py-2 px-3">Value</th>
                    <th class="py-2 px-3">Status</th>
                    <th class="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#1E293B]">
                  ${shipments.map(s => `
                    <tr class="hover:bg-[#1F2937]/50 transition">
                      <td class="py-2.5 px-3">
                        <span class="font-mono font-bold text-white">${s.id}</span>
                        ${s.isSample ? '<span class="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 ml-1">SAMPLE</span>' : ''}
                      </td>
                      <td class="py-2.5 px-3 text-[#94A3B8]">${s.pickupLocation}</td>
                      <td class="py-2.5 px-3 text-white">${s.dropLocation}</td>
                      <td class="py-2.5 px-3 font-mono font-semibold">${Number(s.cargoWeight).toLocaleString()}</td>
                      <td class="py-2.5 px-3 font-mono text-emerald-400">₹${Number(s.value).toLocaleString()}</td>
                      <td class="py-2.5 px-3"><span class="badge-status text-[10px] bg-[#1E293B] text-[#94A3B8]">${s.status}</span></td>
                      <td class="py-2.5 px-3 text-right">
                        <button onclick="window.ReRoute.UI.openEditShipmentModal('${s.id}')" class="text-xs text-cyan-400 hover:text-cyan-300 font-semibold mr-2">Edit</button>
                        <button onclick="window.ReRoute.UI.deleteShipmentConfirm('${s.id}')" class="text-xs text-red-400 hover:text-red-300">Delete</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Section 3: Data Integrity & Format Specifications -->
        <div class="glass-card p-6 bg-[#0E1626]/80 border border-[#1E293B] text-xs space-y-2">
          <div class="font-bold text-white flex items-center gap-2">
            <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>CSV Import Validation Rules</span>
          </div>
          <p class="text-[#94A3B8]">
            CSV files are strictly verified before ingestion. Any missing mandatory fields, negative capacity/weight values, invalid latitudes (-90 to 90), invalid longitudes (-180 to 180), corrupt datetime strings, or duplicate IDs will be flagged row-by-row.
          </p>
        </div>

        <!-- Hidden File Input for CSV / JSON Upload -->
        <input type="file" id="csv-file-input" class="hidden" accept=".csv,.json">
      </div>
    `;
  }

  function triggerCSVUpload(type) {
    const fileInput = document.getElementById('csv-file-input');
    if (!fileInput) return;

    fileInput.accept = ".csv";
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const csvText = event.target.result;
        const validation = window.ReRoute.Validation;
        const store = window.ReRoute.store;

        const existing = type === 'trucks' ? store.getState().trucks : store.getState().shipments;
        const result = validation.parseAndValidateCSV(csvText, type, existing);

        if (!result.isValid) {
          window.ReRoute.UI.showValidationModal("CSV Ingestion Failed", result.errors);
        } else {
          let count = 0;
          if (type === 'trucks') {
            result.parsed.forEach(t => { store.addTruck(t); count++; });
          } else {
            result.parsed.forEach(s => { store.addShipment(s); count++; });
          }
          store.addNotification("CSV Ingestion Succeeded", `Successfully imported ${count} valid ${type} records.`, "success");
          const container = document.getElementById('main-content');
          if (container) render(container);
        }
      };
      reader.readAsText(file);
      fileInput.value = '';
    };
    fileInput.click();
  }

  function downloadCSV(type) {
    const store = window.ReRoute.store;
    const csvContent = type === 'trucks' ? store.exportFleetCSV() : store.exportShipmentsCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reroute_${type}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportBackupJSON() {
    const store = window.ReRoute.store;
    const jsonStr = store.exportToJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reroute_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  window.ReRoute = window.ReRoute || {};
  window.ReRoute.DataManagement = { render, triggerCSVUpload, downloadCSV, exportBackupJSON };
})();
