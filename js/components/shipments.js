// ReRoute AI 2.0 - Shipment Operations Component
// Full CRUD: Add, Edit, Delete, Cancel, Restore, Search, Filter by Status/Priority

(function() {
  let filterStatus = 'ALL';
  let filterPriority = 'ALL';
  let searchQuery = '';

  function render(container) {
    const store = window.ReRoute.store;
    const state = store.getState();
    const shipments = state.shipments || [];

    // Filter shipments
    const filteredShipments = shipments.filter(s => {
      const matchesStatus = filterStatus === 'ALL' || s.status === filterStatus;
      const matchesPriority = filterPriority === 'ALL' || s.priority === filterPriority;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        s.id.toLowerCase().includes(q) ||
        (s.pickupLocation && s.pickupLocation.toLowerCase().includes(q)) ||
        (s.dropLocation && s.dropLocation.toLowerCase().includes(q)) ||
        (s.requiredVehicleType && s.requiredVehicleType.toLowerCase().includes(q));
      return matchesStatus && matchesPriority && matchesSearch;
    });

    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn">
        <!-- Shipment Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>Freight Demand Pool</span>
              <span class="text-xs font-mono font-normal text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">
                ${shipments.length} Total Registered
              </span>
            </h1>
            <p class="text-xs text-[#94A3B8] mt-1">
              Active shipper backhaul orders, cargo dimensions, pickup windows, and priority SLAs.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="window.ReRoute.UI.openAddShipmentModal()" class="btn-primary px-4 py-2 text-xs font-semibold shadow">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              <span>+ Add Shipment</span>
            </button>
            <button onclick="window.ReRoute.store.setActiveScreen('data-management')" class="btn-outline px-3.5 py-2 text-xs font-semibold">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              <span>CSV Import</span>
            </button>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="glass-card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <!-- Search -->
          <div class="relative flex-1 max-w-md">
            <input 
              type="text" 
              id="shipment-search-input" 
              placeholder="Search by Shipment ID, pickup, drop, or vehicle type..." 
              value="${searchQuery}"
              class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#64748B] outline-none"
            >
            <svg class="w-4 h-4 text-[#64748B] absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>

          <!-- Status & Priority Filters -->
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span class="text-[#64748B] text-[11px] font-semibold">Status:</span>
            ${['ALL', 'Available', 'Reserved', 'Cancelled', 'Completed'].map(st => `
              <button 
                onclick="window.ReRoute.Shipments.setFilter('${st}', '${filterPriority}')" 
                class="px-2 py-1 rounded text-[11px] font-semibold transition ${filterStatus === st ? 'bg-cyan-500 text-white font-bold shadow' : 'bg-[#1E293B]/60 text-[#94A3B8] hover:text-white'}"
              >
                ${st}
              </button>
            `).join('')}

            <span class="text-[#64748B] text-[11px] font-semibold ml-2">Priority:</span>
            ${['ALL', 'Critical', 'High', 'Standard'].map(pr => `
              <button 
                onclick="window.ReRoute.Shipments.setFilter('${filterStatus}', '${pr}')" 
                class="px-2 py-1 rounded text-[11px] font-semibold transition ${filterPriority === pr ? 'bg-blue-600 text-white font-bold shadow' : 'bg-[#1E293B]/60 text-[#94A3B8] hover:text-white'}"
              >
                ${pr}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Shipments Table or Empty Notice -->
        ${shipments.length === 0 ? `
          <div class="glass-card p-12 text-center border-dashed border-[#1E293B]">
            <div class="w-12 h-12 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            </div>
            <h3 class="text-base font-bold text-white mb-1">No Shipments in Demand Pool</h3>
            <p class="text-xs text-[#94A3B8] mb-4">Add your backhaul cargo orders to start pairing them with returning empty trucks.</p>
            <button onclick="window.ReRoute.UI.openAddShipmentModal()" class="btn-primary px-4 py-2 text-xs font-semibold">
              + Add First Shipment
            </button>
          </div>
        ` : filteredShipments.length === 0 ? `
          <div class="glass-card p-8 text-center text-xs text-[#94A3B8]">
            No shipments match your search or filter selection.
          </div>
        ` : `
          <div class="glass-card overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="text-[11px] text-[#94A3B8] uppercase border-b border-[#1E293B] bg-[#0E1626]">
                  <tr>
                    <th class="py-3 px-4 font-semibold">Shipment ID</th>
                    <th class="py-3 px-4 font-semibold">Pickup Location</th>
                    <th class="py-3 px-4 font-semibold">Drop Location</th>
                    <th class="py-3 px-4 font-semibold">Cargo Weight</th>
                    <th class="py-3 px-4 font-semibold">Pickup Window</th>
                    <th class="py-3 px-4 font-semibold">Priority / Value</th>
                    <th class="py-3 px-4 font-semibold">Status</th>
                    <th class="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#1E293B]">
                  ${filteredShipments.map(s => {
                    const weight = Number(s.cargoWeight) || 0;
                    const value = Number(s.value) || 0;

                    let statusClass = "bg-blue-500/10 text-blue-400 border border-blue-500/30";
                    if (s.status === 'Available') statusClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
                    if (s.status === 'Reserved') statusClass = "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40";
                    if (s.status === 'Cancelled') statusClass = "bg-red-500/10 text-red-400 border border-red-500/30";
                    if (s.status === 'Completed') statusClass = "bg-slate-500/20 text-slate-300 border border-slate-500/40";

                    let priorityClass = "text-slate-400";
                    if (s.priority === 'Critical') priorityClass = "text-red-400 font-bold";
                    if (s.priority === 'High') priorityClass = "text-amber-400 font-semibold";
                    if (s.priority === 'Standard') priorityClass = "text-blue-400";

                    return `
                      <tr class="hover:bg-[#1F2937]/50 transition group">
                        <td class="py-3.5 px-4">
                          <div class="font-bold text-white font-mono flex items-center gap-1.5">
                            <span>${s.id}</span>
                            ${s.isSample ? '<span class="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-sans">SAMPLE DATA</span>' : '<span class="text-[9px] px-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-sans">USER DATA</span>'}
                          </div>
                          <div class="text-[10px] text-[#94A3B8] mt-0.5">Req: ${s.requiredVehicleType || 'Any'}</div>
                        </td>
                        <td class="py-3.5 px-4">
                          <div class="text-white font-medium">${s.pickupLocation}</div>
                          <div class="text-[10px] text-[#64748B] font-mono">${s.pickupLat?.toFixed(4)}, ${s.pickupLng?.toFixed(4)}</div>
                        </td>
                        <td class="py-3.5 px-4">
                          <div class="text-white font-medium">${s.dropLocation}</div>
                          <div class="text-[10px] text-[#64748B] font-mono">${s.dropLat?.toFixed(4)}, ${s.dropLng?.toFixed(4)}</div>
                        </td>
                        <td class="py-3.5 px-4">
                          <div class="font-bold text-white font-mono">${weight.toLocaleString()} kg</div>
                          <div class="text-[10px] text-[#64748B]">${s.specialRequirements || 'Standard freight'}</div>
                        </td>
                        <td class="py-3.5 px-4 text-[#94A3B8] font-mono text-[11px]">
                          <div>${s.pickupWindowStart ? new Date(s.pickupWindowStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} → ${s.pickupWindowEnd ? new Date(s.pickupWindowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                          <div class="text-[10px] text-[#64748B]">${s.pickupWindowStart ? new Date(s.pickupWindowStart).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}</div>
                        </td>
                        <td class="py-3.5 px-4">
                          <div class="${priorityClass} text-xs">${s.priority || 'Standard'}</div>
                          <div class="text-[10px] text-emerald-400 font-mono font-semibold">₹${value.toLocaleString()}</div>
                        </td>
                        <td class="py-3.5 px-4">
                          <span class="badge-status ${statusClass}">
                            ${s.status}
                          </span>
                        </td>
                        <td class="py-3.5 px-4 text-right">
                          <div class="flex items-center justify-end gap-1.5">
                            ${s.status === 'Cancelled' ? `
                              <button onclick="window.ReRoute.store.restoreShipment('${s.id}')" class="px-2 py-1 rounded bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 text-[11px] font-bold border border-emerald-500/30" title="Restore to Available">
                                ↺ Restore
                              </button>
                            ` : s.status === 'Available' ? `
                              <button onclick="window.ReRoute.store.cancelShipment('${s.id}')" class="px-2 py-1 rounded bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-[11px] font-bold border border-amber-500/30" title="Cancel Shipment">
                                ✕ Cancel
                              </button>
                            ` : `
                              <span class="text-[10px] text-[#64748B] italic">Locked</span>
                            `}
                            <button onclick="window.ReRoute.UI.openEditShipmentModal('${s.id}')" class="p-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white" title="Edit">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            </button>
                            <button onclick="window.ReRoute.UI.deleteShipmentConfirm('${s.id}')" class="p-1 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400" title="Delete">
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

    const searchInput = document.getElementById('shipment-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render(container);
      });
    }
  }

  function setFilter(status, priority) {
    filterStatus = status;
    filterPriority = priority;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  window.ReRoute = window.ReRoute || {};
  window.ReRoute.Shipments = { render, setFilter };
})();
