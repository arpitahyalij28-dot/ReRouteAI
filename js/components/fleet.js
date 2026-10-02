// ReRoute AI 2.0 - Fleet Management Component
// Full CRUD: Add, Edit, Delete, Search, Filter, View Details, Trigger ReRoute AI

(function() {
  let filterStatus = 'ALL';
  let searchQuery = '';

  function render(container) {
    const store = window.ReRoute.store;
    const state = store.getState();
    const trucks = state.trucks || [];

    // Filter trucks
    const filteredTrucks = trucks.filter(t => {
      const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        t.id.toLowerCase().includes(q) ||
        (t.vehicleType && t.vehicleType.toLowerCase().includes(q)) ||
        (t.currentLocation && t.currentLocation.toLowerCase().includes(q)) ||
        (t.destination && t.destination.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });

    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn">
        <!-- Fleet Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>Fleet Operations Management</span>
              <span class="text-xs font-mono font-normal text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">
                ${trucks.length} Total Registered
              </span>
            </h1>
            <p class="text-xs text-[#94A3B8] mt-1">
              Real-time asset telemetry, cargo capacities, driver rest windows, and empty availability schedules.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="window.ReRoute.UI.openAddTruckModal()" class="btn-primary px-4 py-2 text-xs font-semibold shadow">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              <span>+ Add Truck</span>
            </button>
            <button onclick="window.ReRoute.store.setActiveScreen('data-management')" class="btn-outline px-3.5 py-2 text-xs font-semibold">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              <span>CSV Import</span>
            </button>
          </div>
        </div>

        <!-- Filters & Search Toolbar -->
        <div class="glass-card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <!-- Search input -->
          <div class="relative flex-1 max-w-md">
            <input 
              type="text" 
              id="fleet-search-input" 
              placeholder="Search by Truck ID, type, origin, or destination..." 
              value="${searchQuery}"
              class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#64748B] outline-none"
            >
            <svg class="w-4 h-4 text-[#64748B] absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>

          <!-- Status Filters -->
          <div class="flex items-center gap-1.5 overflow-x-auto text-xs">
            <span class="text-[#64748B] text-[11px] font-semibold mr-1">Status:</span>
            ${['ALL', 'Available', 'In Transit', 'Loading', 'Delayed', 'Backhaul Assigned', 'Maintenance'].map(st => `
              <button 
                onclick="window.ReRoute.Fleet.setFilter('${st}')" 
                class="px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${filterStatus === st ? 'bg-cyan-500 text-white font-bold shadow' : 'bg-[#1E293B]/60 text-[#94A3B8] hover:text-white'}"
              >
                ${st}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Fleet Table or Empty Notice -->
        ${trucks.length === 0 ? `
          <div class="glass-card p-12 text-center border-dashed border-[#1E293B]">
            <div class="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            </div>
            <h3 class="text-base font-bold text-white mb-1">No Trucks Registered</h3>
            <p class="text-xs text-[#94A3B8] mb-4">Your fleet database is empty. Add your vehicles to start predictive empty-mile matching.</p>
            <button onclick="window.ReRoute.UI.openAddTruckModal()" class="btn-primary px-4 py-2 text-xs font-semibold">
              + Register First Truck
            </button>
          </div>
        ` : filteredTrucks.length === 0 ? `
          <div class="glass-card p-8 text-center text-xs text-[#94A3B8]">
            No vehicles match your active search or filter criteria.
          </div>
        ` : `
          <div class="glass-card overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="text-[11px] text-[#94A3B8] uppercase border-b border-[#1E293B] bg-[#0E1626]">
                  <tr>
                    <th class="py-3 px-4 font-semibold">Truck ID / Type</th>
                    <th class="py-3 px-4 font-semibold">Current Location</th>
                    <th class="py-3 px-4 font-semibold">Destination Corridor</th>
                    <th class="py-3 px-4 font-semibold">Capacity (Load / Max)</th>
                    <th class="py-3 px-4 font-semibold">Expected Completion</th>
                    <th class="py-3 px-4 font-semibold">Status</th>
                    <th class="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#1E293B]">
                  ${filteredTrucks.map(truck => {
                    const maxCap = Number(truck.maxCapacity) || 0;
                    const curLoad = Number(truck.currentLoad) || 0;
                    const freeCap = Math.max(0, maxCap - curLoad);
                    const utilPercent = maxCap > 0 ? Math.round((curLoad / maxCap) * 100) : 0;
                    
                    let statusClass = "bg-blue-500/10 text-blue-400 border border-blue-500/30";
                    if (truck.status === 'Available') statusClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
                    if (truck.status === 'Delayed') statusClass = "bg-red-500/10 text-red-400 border border-red-500/30";
                    if (truck.status === 'Backhaul Assigned') statusClass = "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40";
                    if (truck.status === 'Maintenance') statusClass = "bg-slate-500/20 text-slate-400 border border-slate-500/40";

                    return `
                      <tr class="hover:bg-[#1F2937]/50 transition group">
                        <td class="py-3.5 px-4">
                          <div class="font-bold text-white font-mono flex items-center gap-1.5">
                            <span>${truck.id}</span>
                            ${truck.isSample ? '<span class="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-sans">SAMPLE DATA</span>' : '<span class="text-[9px] px-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-sans">USER DATA</span>'}
                          </div>
                          <div class="text-[11px] text-[#94A3B8] mt-0.5">${truck.vehicleType}</div>
                        </td>
                        <td class="py-3.5 px-4">
                          <div class="text-white font-medium">${truck.currentLocation}</div>
                          <div class="text-[10px] text-[#64748B] font-mono">${truck.currentLat?.toFixed(4)}, ${truck.currentLng?.toFixed(4)}</div>
                        </td>
                        <td class="py-3.5 px-4">
                          <div class="text-white font-medium">${truck.destination}</div>
                          <div class="text-[10px] text-[#64748B] font-mono">${truck.destLat?.toFixed(4)}, ${truck.destLng?.toFixed(4)}</div>
                        </td>
                        <td class="py-3.5 px-4">
                          <div class="flex items-center justify-between text-[11px] mb-1">
                            <span class="text-white font-semibold">${curLoad.toLocaleString()} / ${maxCap.toLocaleString()} kg</span>
                            <span class="text-cyan-400 font-mono">${freeCap.toLocaleString()} kg free</span>
                          </div>
                          <div class="w-36 bg-[#1E293B] h-1.5 rounded-full overflow-hidden">
                            <div class="bg-gradient-to-r from-blue-500 to-cyan-400 h-full" style="width: ${utilPercent}%"></div>
                          </div>
                        </td>
                        <td class="py-3.5 px-4 text-[#94A3B8] font-mono text-[11px]">
                          ${truck.expectedDeliveryTime ? new Date(truck.expectedDeliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (' + new Date(truck.expectedDeliveryTime).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')' : '—'}
                          <div class="text-[10px] text-[#64748B]">${truck.driverAvailability || 'Driver Available'}</div>
                        </td>
                        <td class="py-3.5 px-4">
                          <span class="badge-status ${statusClass}">
                            ${truck.status}
                          </span>
                        </td>
                        <td class="py-3.5 px-4 text-right">
                          <div class="flex items-center justify-end gap-1.5">
                            <button onclick="window.ReRoute.UI.runAnalysisForTruck('${truck.id}')" class="btn-primary px-2.5 py-1 text-[11px] font-bold" title="Run ReRoute AI on this truck">
                              <span>Analyze</span>
                            </button>
                            <button onclick="window.ReRoute.UI.openViewTruckModal('${truck.id}')" class="p-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white" title="View Specs">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            </button>
                            <button onclick="window.ReRoute.UI.openEditTruckModal('${truck.id}')" class="p-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white" title="Edit">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            </button>
                            <button onclick="window.ReRoute.UI.deleteTruckConfirm('${truck.id}')" class="p-1 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400" title="Delete">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `}
      </div>
    `;

    // Attach search event
    const searchInput = document.getElementById('fleet-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render(container);
      });
    }
  }

  function setFilter(status) {
    filterStatus = status;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  window.ReRoute = window.ReRoute || {};
  window.ReRoute.Fleet = { render, setFilter };
})();
