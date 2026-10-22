// ReRoute AI 2.0 - Backhaul Matching Component
// Header: "AI Backhaul Matching"
// Subheading: "Evaluating feasible shipments for the selected vehicle."
// Ranks feasible shipments dynamically, flags AI RECOMMENDED, provides Explain / Accept / Route actions

(function() {
  function render(container) {
    const store = window.ReRoute.store;
    const state = store.getState();
    const matchingEngine = window.ReRoute.MatchingEngine;

    const trucks = state.trucks || [];
    const shipments = state.shipments || [];

    if (trucks.length === 0) {
      container.innerHTML = `
        <div class="glass-card p-12 text-center max-w-xl mx-auto my-12">
          <h2 class="text-xl font-bold text-white mb-2">No Vehicles in Fleet</h2>
          <p class="text-xs text-[#94A3B8] mb-4">Please register at least one truck to evaluate backhaul matches.</p>
          <button onclick="window.ReRoute.UI.openAddTruckModal()" class="btn-primary px-4 py-2 text-xs font-semibold">
            + Add Truck
          </button>
        </div>
      `;
      return;
    }

    let activeTruck = trucks.find(t => t.id === state.activeTruckId) || trucks[0];
    const maxCap = Number(activeTruck.maxCapacity) || 0;
    const curLoad = Number(activeTruck.currentLoad) || 0;
    const availCap = Math.max(0, maxCap - curLoad);

    // Evaluate all shipments
    const matches = matchingEngine 
      ? matchingEngine.evaluateShipments(activeTruck, shipments, state.modelSettings)
      : [];

    const feasibleCount = matches.filter(m => m.isFeasible).length;

    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-extrabold text-white tracking-tight">AI Backhaul Matching</h1>
              <span class="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                ${feasibleCount} Feasible Candidate${feasibleCount === 1 ? '' : 's'}
              </span>
            </div>
            <p class="text-xs text-[#94A3B8] mt-1">
              Evaluating feasible shipments for the selected vehicle.
            </p>
          </div>

          <!-- Vehicle Selector Switcher -->
          <div class="flex items-center gap-3">
            <div class="text-right">
              <div class="text-[10px] text-[#64748B] uppercase">Active Vehicle</div>
              <div class="text-xs font-bold text-white font-mono">${activeTruck.id} (${activeTruck.destination})</div>
            </div>
            <select 
              class="bg-[#111827] text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 border border-[#334155] focus:border-cyan-500 outline-none cursor-pointer"
              onchange="window.ReRoute.Matching.switchTruck(this.value)"
            >
              ${trucks.map(t => `
                <option value="${t.id}" ${t.id === activeTruck.id ? 'selected' : ''}>
                  ${t.id} — ${t.destination}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Vehicle Context Bar -->
        <div class="glass-card p-4 flex flex-wrap items-center justify-between gap-4 border-l-4 border-l-cyan-500">
          <div class="flex flex-wrap items-center gap-6 text-xs">
            <div>
              <span class="text-[#64748B] block text-[10px] uppercase">Vehicle Type</span>
              <span class="text-white font-semibold">${activeTruck.vehicleType}</span>
            </div>
            <div>
              <span class="text-[#64748B] block text-[10px] uppercase">Destination Corridor</span>
              <span class="text-cyan-400 font-semibold">${activeTruck.destination}</span>
            </div>
            <div>
              <span class="text-[#64748B] block text-[10px] uppercase">Available Capacity</span>
              <span class="text-emerald-400 font-mono font-bold">${availCap.toLocaleString()} kg</span>
            </div>
            <div>
              <span class="text-[#64748B] block text-[10px] uppercase">Release ETA</span>
              <span class="text-white font-mono">${activeTruck.expectedDeliveryTime ? new Date(activeTruck.expectedDeliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
            </div>
            <div>
              <span class="text-[#64748B] block text-[10px] uppercase">Status</span>
              <span class="text-white font-medium">${activeTruck.status}</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="window.ReRoute.store.setActiveScreen('settings')" class="text-xs text-[#94A3B8] hover:text-white flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg>
              <span>Model Weights</span>
            </button>
          </div>
        </div>

        <!-- Matches Cards List -->
        ${matches.length === 0 ? `
          <div class="glass-card p-12 text-center text-xs text-[#94A3B8]">
            <p class="text-sm font-bold text-white mb-2">No Shipments Available to Match</p>
            <p>Add shipments to the demand pool to evaluate feasible backhaul pairs.</p>
            <button onclick="window.ReRoute.UI.openAddShipmentModal()" class="btn-primary px-4 py-2 mt-4 text-xs font-semibold">
              + Add Shipment
            </button>
          </div>
        ` : `
          <div class="space-y-4">
            ${matches.map((item, idx) => {
              const s = item.shipment;
              const isRecommended = item.isRecommended;

              let cardBorderClass = "border-[#1E293B]";
              if (isRecommended) cardBorderClass = "border-cyan-500/60 shadow-lg shadow-cyan-500/10 glow-cyan";
              else if (!item.isFeasible) cardBorderClass = "border-red-500/20 opacity-75";

              return `
                <div class="glass-card p-5 ${cardBorderClass} transition">
                  <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <!-- Left block: Identity & Route -->
                    <div class="flex-1 min-w-0">
                      <div class="flex flex-wrap items-center gap-2 mb-1.5">
                        <span class="text-base font-extrabold text-white font-mono">${s.id}</span>
                        
                        ${isRecommended ? `
                          <span class="badge-status bg-cyan-500 text-black font-extrabold shadow-md flex items-center gap-1">
                            ★ AI RECOMMENDED
                          </span>
                        ` : ''}

                        <span class="badge-status ${item.isFeasible ? 'badge-risk-low' : 'badge-risk-high'}">
                          ${item.isFeasible ? 'FEASIBLE' : 'INFEASIBLE'}
                        </span>

                        <span class="badge-status ${item.eta?.status === 'ON TIME' ? 'bg-emerald-500/20 text-emerald-300' : item.eta?.status === 'AT RISK' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}">
                          ${item.eta?.status || 'ETA PENDING'}
                        </span>

                        <span class="text-[11px] text-[#64748B] font-mono">
                          Rank #${idx + 1}
                        </span>
                      </div>

                      <!-- Route leg -->
                      <div class="text-sm font-semibold text-white flex items-center gap-2">
                        <span>${s.pickupLocation}</span>
                        <svg class="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        <span>${s.dropLocation}</span>
                      </div>

                      <!-- Telemetry Pills -->
                      <div class="flex flex-wrap items-center gap-4 text-xs text-[#94A3B8] mt-2 font-mono">
                        <span>Payload: <strong class="text-white">${Number(s.cargoWeight).toLocaleString()} kg</strong></span>
                        <span>•</span>
                        <span>Detour: <strong class="text-amber-400">${item.detourKm} km</strong></span>
                        <span>•</span>
                        <span>Deadhead: <strong class="text-white">${item.deadheadKm} km</strong></span>
                        <span>•</span>
                        <span>Value: <strong class="text-emerald-400">₹${Number(s.value).toLocaleString()}</strong></span>
                        <span>•</span>
                        <span>CO₂ Saved: <strong class="text-emerald-400">${item.estimatedCo2} kg</strong></span>
                      </div>

                      ${!item.isFeasible ? `
                        <div class="mt-2 text-xs text-red-400 bg-red-950/30 border border-red-500/30 p-2 rounded">
                          <strong>Infeasible:</strong> ${item.infeasibleReasons.join('; ')}
                        </div>
                      ` : ''}
                    </div>

                    <!-- Center block: Match Score Progress Gauge -->
                    <div class="flex items-center gap-6 px-4 py-2 bg-[#0E1626]/80 rounded-xl border border-[#1E293B]">
                      <div class="text-center">
                        <div class="text-[10px] text-[#64748B] uppercase font-bold">Match Score</div>
                        <div class="text-3xl font-black ${item.matchScore >= 80 ? 'text-emerald-400' : item.matchScore >= 60 ? 'text-cyan-400' : 'text-amber-400'} font-mono">
                          ${item.matchScore}%
                        </div>
                      </div>

                      <div class="hidden sm:block text-xs space-y-1 font-mono text-[#94A3B8] border-l border-[#1E293B] pl-4">
                        <div>Route Comp: <strong class="text-white">${item.components?.route?.score}%</strong></div>
                        <div>Time Comp: <strong class="text-white">${item.components?.time?.score}%</strong></div>
                        <div>Capacity Fit: <strong class="text-white">${item.components?.capacity?.score}%</strong></div>
                      </div>
                    </div>

                    <!-- Right block: Actions -->
                    <div class="flex lg:flex-col items-center justify-end gap-2 flex-shrink-0">
                      ${item.isFeasible ? `
                        <button onclick="window.ReRoute.Matching.acceptMatch('${activeTruck.id}', '${s.id}')" class="btn-primary w-full px-4 py-2 text-xs font-bold shadow-md">
                          Accept Match
                        </button>
                      ` : `
                        <button disabled class="px-4 py-2 rounded bg-[#1F2937] text-[#64748B] text-xs font-semibold cursor-not-allowed w-full">
                          Infeasible
                        </button>
                      `}

                      <button onclick="window.ReRoute.Matching.explainMatch('${s.id}')" class="btn-outline w-full px-3 py-1.5 text-xs font-semibold text-cyan-300 border-cyan-500/30">
                        Explain Match
                      </button>

                      <button onclick="window.ReRoute.Matching.viewRoute('${s.id}')" class="btn-outline w-full px-3 py-1.5 text-xs text-[#94A3B8] hover:text-white">
                        View Route
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  }

  function switchTruck(truckId) {
    const store = window.ReRoute.store;
    store.setActiveTruck(truckId);
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function explainMatch(shipmentId) {
    const store = window.ReRoute.store;
    store.setSelectedShipment(shipmentId);
    store.setActiveScreen('explainability');
  }

  function viewRoute(shipmentId) {
    const store = window.ReRoute.store;
    store.setSelectedShipment(shipmentId);
    store.setActiveScreen('routes');
  }

  function acceptMatch(truckId, shipmentId) {
    const store = window.ReRoute.store;
    const state = store.getState();
    const truck = state.trucks.find(t => t.id === truckId);
    const matchingEngine = window.ReRoute.MatchingEngine;

    const matches = matchingEngine.evaluateShipments(truck, state.shipments, state.modelSettings);
    const match = matches.find(m => m.shipment.id === shipmentId);

    store.assignBackhaul(truckId, shipmentId, match || {});
    // Render feedback and redirect to dashboard or matching
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  window.ReRoute = window.ReRoute || {};
  window.ReRoute.Matching = { render, switchTruck, explainMatch, viewRoute, acceptMatch };
})();
