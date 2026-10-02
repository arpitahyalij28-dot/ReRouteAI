// ReRoute AI 2.0 - Explainability Component
// Section 14: "Why this shipment?" — 6-component score formula breakdown & actual points contribution
// Section 15: "Why Not?" Engine — dynamically explains why other candidate shipments ranked lower or failed feasibility

(function() {
  function render(container) {
    const store = window.ReRoute.store;
    const state = store.getState();
    const matchingEngine = window.ReRoute.MatchingEngine;

    const trucks = state.trucks || [];
    const shipments = state.shipments || [];

    if (trucks.length === 0 || shipments.length === 0) {
      container.innerHTML = `
        <div class="glass-card p-12 text-center max-w-xl mx-auto my-12">
          <h2 class="text-xl font-bold text-white mb-2">No Matching Data Available</h2>
          <p class="text-xs text-[#94A3B8] mb-4">Explainability requires an active vehicle and candidate shipments in the system.</p>
          <button onclick="window.ReRoute.store.setActiveScreen('matching')" class="btn-primary px-4 py-2 text-xs font-semibold">
            Go to AI Matching
          </button>
        </div>
      `;
      return;
    }

    const activeTruck = trucks.find(t => t.id === state.activeTruckId) || trucks[0];
    const evaluated = matchingEngine.evaluateShipments(activeTruck, shipments, state.modelSettings);

    // Identify selected shipment (or pick top recommended / highest scoring)
    let selectedItem = evaluated.find(item => item.shipment.id === state.selectedShipmentId);
    if (!selectedItem) {
      selectedItem = evaluated[0];
      if (selectedItem) state.selectedShipmentId = selectedItem.shipment.id;
    }

    if (!selectedItem) {
      container.innerHTML = `<div class="glass-card p-8 text-center text-xs text-[#94A3B8]">No candidate shipments to explain.</div>`;
      return;
    }

    const s = selectedItem.shipment;
    const comp = selectedItem.components || {};
    const otherShipments = evaluated.filter(item => item.shipment.id !== s.id);

    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn max-w-5xl mx-auto">
        <!-- Top Title Bar -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-extrabold text-white tracking-tight">Match Decision Explainability</h1>
              <span class="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Transparent Multi-Attribute Model
              </span>
            </div>
            <p class="text-xs text-[#94A3B8] mt-1">
              Deterministic mathematical breakdown of factor weights, normalized scores, and algorithmic ranking rationale.
            </p>
          </div>

          <!-- Select shipment to explain -->
          <div class="flex items-center gap-2">
            <label class="text-xs text-[#94A3B8] font-semibold">Explain Shipment:</label>
            <select 
              class="bg-[#111827] text-white text-xs font-bold rounded-lg px-3 py-1.5 border border-[#334155] focus:border-cyan-500 outline-none cursor-pointer"
              onchange="window.ReRoute.Explainability.selectShipment(this.value)"
            >
              ${evaluated.map(item => `
                <option value="${item.shipment.id}" ${item.shipment.id === s.id ? 'selected' : ''}>
                  ${item.shipment.id} (${item.matchScore}% Match ${item.isRecommended ? '— Recommended' : !item.isFeasible ? '— Infeasible' : ''})
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Selected Shipment Overview Header Card -->
        <div class="glass-card p-6 border-l-4 ${selectedItem.isFeasible ? 'border-l-cyan-500' : 'border-l-red-500'}">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xl font-extrabold text-white font-mono">${s.id}</span>
                ${selectedItem.isRecommended ? '<span class="badge-status bg-cyan-500 text-black font-extrabold">★ AI RECOMMENDED</span>' : ''}
                <span class="badge-status ${selectedItem.isFeasible ? 'badge-risk-low' : 'badge-risk-high'}">
                  ${selectedItem.isFeasible ? 'FEASIBLE' : 'INFEASIBLE'}
                </span>
                <span class="text-xs font-mono text-[#94A3B8]">Target: Vehicle <strong>${activeTruck.id}</strong></span>
              </div>
              <div class="text-sm font-semibold text-[#94A3B8]">
                ${s.pickupLocation} <span class="text-cyan-400">→</span> ${s.dropLocation}
              </div>
            </div>

            <div class="flex items-center gap-6">
              <div class="text-center px-4 py-2 rounded-xl bg-[#0E1626] border border-[#1E293B]">
                <div class="text-[10px] text-[#64748B] uppercase font-bold">Overall Match Score</div>
                <div class="text-3xl font-black ${selectedItem.matchScore >= 80 ? 'text-emerald-400' : selectedItem.matchScore >= 60 ? 'text-cyan-400' : 'text-amber-400'} font-mono">
                  ${selectedItem.matchScore}%
                </div>
              </div>

              ${selectedItem.isFeasible ? `
                <button onclick="window.ReRoute.Matching.acceptMatch('${activeTruck.id}', '${s.id}')" class="btn-primary px-4 py-2.5 text-xs font-bold shadow-md">
                  Accept Match
                </button>
              ` : `
                <div class="text-xs text-red-400 font-bold bg-red-950/40 border border-red-500/30 px-3 py-2 rounded">
                  Cannot Accept (Infeasible)
                </div>
              `}
            </div>
          </div>
        </div>

        <!-- SECTION 14: 6 SCORE COMPONENTS BREAKDOWN -->
        <div class="glass-card p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-base font-bold text-white">Score Composition Formula</h2>
              <div class="text-xs text-[#94A3B8]">Total Score = Σ (Factor Score × Configured Weight) ÷ 100</div>
            </div>
            <button onclick="window.ReRoute.store.setActiveScreen('settings')" class="text-xs text-cyan-400 hover:text-cyan-300 font-semibold">
              Adjust Weights in Settings →
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- 1. Route Compatibility -->
            <div class="p-4 rounded-xl bg-[#0E1626] border border-[#1E293B]">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-bold text-white">Route Compatibility</span>
                <span class="text-cyan-400 font-mono font-bold">${comp.route?.score || 0}%</span>
              </div>
              <div class="text-[11px] text-[#64748B] font-mono mb-2">
                Contribution: ${comp.route?.score || 0} × ${comp.route?.weight || 25}% = <strong>${comp.route?.contribution || 0} pts</strong>
              </div>
              <div class="w-full bg-[#1F2937] h-1.5 rounded-full overflow-hidden">
                <div class="bg-cyan-500 h-full" style="width: ${comp.route?.score || 0}%"></div>
              </div>
              <div class="text-[10px] text-[#94A3B8] mt-2">
                Deadhead: ${selectedItem.deadheadKm} km • Corridor alignment to terminal.
              </div>
            </div>

            <!-- 2. Time Compatibility -->
            <div class="p-4 rounded-xl bg-[#0E1626] border border-[#1E293B]">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-bold text-white">Time Compatibility</span>
                <span class="text-blue-400 font-mono font-bold">${comp.time?.score || 0}%</span>
              </div>
              <div class="text-[11px] text-[#64748B] font-mono mb-2">
                Contribution: ${comp.time?.score || 0} × ${comp.time?.weight || 20}% = <strong>${comp.time?.contribution || 0} pts</strong>
              </div>
              <div class="w-full bg-[#1F2937] h-1.5 rounded-full overflow-hidden">
                <div class="bg-blue-500 h-full" style="width: ${comp.time?.score || 0}%"></div>
              </div>
              <div class="text-[10px] text-[#94A3B8] mt-2">
                Status: ${selectedItem.eta?.status} (${selectedItem.eta?.marginToCloseMins} min margin).
              </div>
            </div>

            <!-- 3. Capacity Fit -->
            <div class="p-4 rounded-xl bg-[#0E1626] border border-[#1E293B]">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-bold text-white">Capacity Fit</span>
                <span class="text-emerald-400 font-mono font-bold">${comp.capacity?.score || 0}%</span>
              </div>
              <div class="text-[11px] text-[#64748B] font-mono mb-2">
                Contribution: ${comp.capacity?.score || 0} × ${comp.capacity?.weight || 20}% = <strong>${comp.capacity?.contribution || 0} pts</strong>
              </div>
              <div class="w-full bg-[#1F2937] h-1.5 rounded-full overflow-hidden">
                <div class="bg-emerald-500 h-full" style="width: ${comp.capacity?.score || 0}%"></div>
              </div>
              <div class="text-[10px] text-[#94A3B8] mt-2">
                Payload: ${Number(s.cargoWeight).toLocaleString()} kg of ${(activeTruck.maxCapacity - activeTruck.currentLoad).toLocaleString()} kg free.
              </div>
            </div>

            <!-- 4. Detour Efficiency -->
            <div class="p-4 rounded-xl bg-[#0E1626] border border-[#1E293B]">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-bold text-white">Detour Efficiency</span>
                <span class="text-amber-400 font-mono font-bold">${comp.detour?.score || 0}%</span>
              </div>
              <div class="text-[11px] text-[#64748B] font-mono mb-2">
                Contribution: ${comp.detour?.score || 0} × ${comp.detour?.weight || 15}% = <strong>${comp.detour?.contribution || 0} pts</strong>
              </div>
              <div class="w-full bg-[#1F2937] h-1.5 rounded-full overflow-hidden">
                <div class="bg-amber-500 h-full" style="width: ${comp.detour?.score || 0}%"></div>
              </div>
              <div class="text-[10px] text-[#94A3B8] mt-2">
                Additional Detour: ${selectedItem.detourKm} km.
              </div>
            </div>

            <!-- 5. Cost Efficiency -->
            <div class="p-4 rounded-xl bg-[#0E1626] border border-[#1E293B]">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-bold text-white">Cost Efficiency</span>
                <span class="text-purple-400 font-mono font-bold">${comp.cost?.score || 0}%</span>
              </div>
              <div class="text-[11px] text-[#64748B] font-mono mb-2">
                Contribution: ${comp.cost?.score || 0} × ${comp.cost?.weight || 10}% = <strong>${comp.cost?.contribution || 0} pts</strong>
              </div>
              <div class="w-full bg-[#1F2937] h-1.5 rounded-full overflow-hidden">
                <div class="bg-purple-500 h-full" style="width: ${comp.cost?.score || 0}%"></div>
              </div>
              <div class="text-[10px] text-[#94A3B8] mt-2">
                Est. Net Revenue: ₹${selectedItem.sustainability?.netEconomicGain?.toLocaleString() || 0}.
              </div>
            </div>

            <!-- 6. Disruption Risk -->
            <div class="p-4 rounded-xl bg-[#0E1626] border border-[#1E293B]">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-bold text-white">Disruption Risk</span>
                <span class="text-indigo-400 font-mono font-bold">${comp.disruption?.score || 0}%</span>
              </div>
              <div class="text-[11px] text-[#64748B] font-mono mb-2">
                Contribution: ${comp.disruption?.score || 0} × ${comp.disruption?.weight || 10}% = <strong>${comp.disruption?.contribution || 0} pts</strong>
              </div>
              <div class="w-full bg-[#1F2937] h-1.5 rounded-full overflow-hidden">
                <div class="bg-indigo-500 h-full" style="width: ${comp.disruption?.score || 0}%"></div>
              </div>
              <div class="text-[10px] text-[#94A3B8] mt-2">
                Buffer safety margin: ${100 - (selectedItem.eta?.delayRisk || 20)}% resilience score.
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 14 CONTINUED: "WHY THIS SHIPMENT?" DYNAMIC POSITIVES -->
        <div class="glass-card p-6">
          <h2 class="text-base font-bold text-white mb-2">Why this shipment?</h2>
          <div class="text-xs text-[#94A3B8] mb-4">Dynamic rule evaluation based on actual payload, transit schedules, and network topology:</div>

          <div class="space-y-2">
            ${selectedItem.whyReasons.length === 0 ? `
              <div class="text-xs text-[#64748B] italic">No positive alignment factors identified (infeasible candidate).</div>
            ` : selectedItem.whyReasons.map(r => `
              <div class="flex items-start gap-2.5 text-xs text-emerald-300 bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-lg">
                <span class="text-emerald-400 font-bold mt-0.5">✓</span>
                <span>${r}</span>
              </div>
            `).join('')}

            ${selectedItem.eta?.delayRisk > 40 ? `
              <div class="flex items-start gap-2.5 text-xs text-amber-300 bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-lg">
                <span class="text-amber-400 font-bold mt-0.5">⚠</span>
                <span>Moderate delay risk: Schedule has tight pickup margin (${selectedItem.eta?.marginToCloseMins} mins).</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- SECTION 15: DYNAMIC "WHY NOT?" ENGINE FOR LOWER RANKED & INFEASIBLE SHIPMENTS -->
        <div class="glass-card p-6">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-base font-bold text-white">"Why Not?" Algorithmic Rationale</h2>
            <span class="text-xs font-mono text-[#94A3B8]">${otherShipments.length} Alternative Candidates Evaluated</span>
          </div>
          <div class="text-xs text-[#94A3B8] mb-4">
            Deterministic explanation of why other freight opportunities ranked lower or failed feasibility for Vehicle <strong>${activeTruck.id}</strong>:
          </div>

          ${otherShipments.length === 0 ? `
            <div class="text-xs text-[#64748B] p-4 border border-dashed border-[#1E293B] rounded-lg text-center">
              No other candidate shipments exist in the current demand pool to compare.
            </div>
          ` : `
            <div class="space-y-3">
              ${otherShipments.map(item => {
                const otherS = item.shipment;
                const scoreDiff = selectedItem.matchScore - item.matchScore;

                return `
                  <div class="p-4 rounded-xl bg-[#0E1626] border ${item.isFeasible ? 'border-[#1E293B]' : 'border-red-500/20'} flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-bold text-white font-mono text-sm">${otherS.id}</span>
                        <span class="badge-status ${item.isFeasible ? 'badge-risk-low' : 'badge-risk-high'}">
                          ${item.isFeasible ? 'FEASIBLE' : 'INFEASIBLE'}
                        </span>
                        <span class="text-xs font-mono text-[#94A3B8]">
                          Match Score: <strong>${item.matchScore}%</strong> (${scoreDiff >= 0 ? `-${scoreDiff}% vs selected` : `+${Math.abs(scoreDiff)}%`})
                        </span>
                      </div>
                      <div class="text-xs text-[#94A3B8]">
                        ${otherS.pickupLocation} → ${otherS.dropLocation} (${Number(otherS.cargoWeight).toLocaleString()} kg)
                      </div>
                      
                      <!-- Dynamic Why Not bullet list -->
                      <div class="mt-2 space-y-1">
                        ${item.whyNotReasons.length > 0 ? item.whyNotReasons.map(r => `
                          <div class="flex items-center gap-1.5 text-xs text-red-400">
                            <span class="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                            <span>${r}</span>
                          </div>
                        `).join('') : `
                          <div class="text-xs text-[#94A3B8]">
                            Feasible, but scored lower in route compatibility and net cost efficiency.
                          </div>
                        `}
                      </div>
                    </div>

                    <div class="flex-shrink-0">
                      <button onclick="window.ReRoute.Explainability.selectShipment('${otherS.id}')" class="btn-outline px-3 py-1.5 text-xs text-cyan-300 border-cyan-500/30">
                        Inspect This Match
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  function selectShipment(shipmentId) {
    const store = window.ReRoute.store;
    store.setSelectedShipment(shipmentId);
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  window.ReRoute = window.ReRoute || {};
  window.ReRoute.Explainability = { render, selectShipment };
})();
