// ReRoute AI 2.0 - Sustainability Component
// Section 18: ESG Environmental & Financial Impact Dashboard
// Dynamic calculations from actual fleet data and interactive editable assumptions panel
// Label: "Model-based estimates"

(function() {
  function render(container) {
    const store = window.ReRoute.store;
    const state = store.getState();
    const sustEngine = window.ReRoute.SustainabilityEngine;
    const matchingEngine = window.ReRoute.MatchingEngine;

    const trucks = state.trucks || [];
    const shipments = state.shipments || [];
    const assignments = state.assignments || [];

    // Calculate aggregated fleet sustainability
    const fleetSust = sustEngine 
      ? sustEngine.calculateFleetSustainability(assignments, state.modelSettings)
      : { hasData: false, totalEmptyKmAvoided: 0, totalFuelSavedLitres: 0, totalCostImpact: 0, totalCo2AvoidedKg: 0 };

    // Also compute potential impact if all available trucks took top feasible backhauls
    let potentialKm = 0;
    let potentialFuel = 0;
    let potentialCost = 0;
    let potentialCo2 = 0;

    if (trucks.length > 0 && shipments.length > 0 && matchingEngine) {
      trucks.forEach(t => {
        const matches = matchingEngine.evaluateShipments(t, shipments, state.modelSettings);
        const top = matches.find(m => m.isFeasible);
        if (top && top.sustainability) {
          potentialKm += top.sustainability.emptyKmAvoided;
          potentialFuel += top.sustainability.fuelSavedLitres;
          potentialCost += top.sustainability.fuelCostImpact;
          potentialCo2 += top.sustainability.co2AvoidedKg;
        }
      });
    }

    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn max-w-5xl mx-auto">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-extrabold text-white tracking-tight">Sustainability & ESG Impact</h1>
              <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Model-based estimates
              </span>
            </div>
            <p class="text-xs text-[#94A3B8] mt-1">
              Deterministic calculation of avoided deadhead emissions, fuel savings, and financial returns.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs text-[#64748B] font-mono">Assignments Logged: <strong>${assignments.length}</strong></span>
          </div>
        </div>

        <!-- 4 Primary ESG Metric Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Empty KM Avoided -->
          <div class="glass-card p-5 border-l-4 border-l-cyan-500">
            <div class="text-[10px] text-[#64748B] uppercase font-bold">Empty KM Avoided</div>
            <div class="text-3xl font-black text-white font-mono mt-1">
              ${assignments.length > 0 ? `${fleetSust.totalEmptyKmAvoided} km` : potentialKm > 0 ? `${potentialKm.toFixed(1)} km*` : '—'}
            </div>
            <div class="text-[11px] text-[#94A3B8] mt-1">
              ${assignments.length > 0 ? 'From active locked assignments' : potentialKm > 0 ? '*Projected from candidate loads' : 'Awaiting data'}
            </div>
          </div>

          <!-- Estimated Fuel Saved -->
          <div class="glass-card p-5 border-l-4 border-l-blue-500">
            <div class="text-[10px] text-[#64748B] uppercase font-bold">Fuel Conserved</div>
            <div class="text-3xl font-black text-blue-400 font-mono mt-1">
              ${assignments.length > 0 ? `${fleetSust.totalFuelSavedLitres} L` : potentialFuel > 0 ? `${potentialFuel.toFixed(1)} L*` : '—'}
            </div>
            <div class="text-[11px] text-[#94A3B8] mt-1">
              Formula: Distance ÷ Vehicle Mileage
            </div>
          </div>

          <!-- Estimated CO2 Avoided -->
          <div class="glass-card p-5 border-l-4 border-l-emerald-500">
            <div class="text-[10px] text-[#64748B] uppercase font-bold">CO₂ Emissions Avoided</div>
            <div class="text-3xl font-black text-emerald-400 font-mono mt-1">
              ${assignments.length > 0 ? `${fleetSust.totalCo2AvoidedKg} kg` : potentialCo2 > 0 ? `${potentialCo2.toFixed(1)} kg*` : '—'}
            </div>
            <div class="text-[11px] text-[#94A3B8] mt-1">
              Factor: ${state.modelSettings.co2Factor} kg CO₂ / Litre
            </div>
          </div>

          <!-- Estimated Cost Saved -->
          <div class="glass-card p-5 border-l-4 border-l-purple-500">
            <div class="text-[10px] text-[#64748B] uppercase font-bold">Net Financial Impact</div>
            <div class="text-3xl font-black text-purple-300 font-mono mt-1">
              ${assignments.length > 0 ? `₹${fleetSust.totalCostImpact.toLocaleString()}` : potentialCost > 0 ? `₹${potentialCost.toLocaleString()}*` : '—'}
            </div>
            <div class="text-[11px] text-[#94A3B8] mt-1">
              At ₹${state.modelSettings.fuelPrice}/L diesel benchmark
            </div>
          </div>
        </div>

        <!-- Interactive Assumptions Panel (Editable inputs) -->
        <div class="glass-card p-6 border border-[#1E293B]">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-[#1E293B]">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                <span>Model Assumptions & Environmental Constants</span>
                <span class="text-[10px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">Editable</span>
              </h2>
              <div class="text-xs text-[#94A3B8]">Adjust diesel benchmarks and emissions factors to update ESG calculations across the platform:</div>
            </div>
            <button onclick="window.ReRoute.Sustainability.resetAssumptions()" class="text-xs text-[#64748B] hover:text-white font-mono">
              ↺ Reset Defaults
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Fuel Price -->
            <div class="space-y-1.5">
              <label class="text-xs text-[#94A3B8] font-bold">Fuel Price (₹ / Litre):</label>
              <div class="relative">
                <input 
                  type="number" 
                  step="0.5" 
                  id="sust-fuel-price" 
                  value="${state.modelSettings.fuelPrice}"
                  class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
                  onchange="window.ReRoute.Sustainability.updateAssumptions()"
                >
                <span class="absolute right-3 top-2.5 text-xs text-[#64748B] font-mono">₹/L</span>
              </div>
              <div class="text-[10px] text-[#64748B]">Commercial diesel pump price</div>
            </div>

            <!-- Average Operating Speed -->
            <div class="space-y-1.5">
              <label class="text-xs text-[#94A3B8] font-bold">Fleet Benchmark Mileage (km / L):</label>
              <div class="relative">
                <input 
                  type="number" 
                  step="0.1" 
                  id="sust-benchmark-mileage" 
                  value="4.2"
                  class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
                  onchange="window.ReRoute.Sustainability.updateAssumptions()"
                >
                <span class="absolute right-3 top-2.5 text-xs text-[#64748B] font-mono">km/L</span>
              </div>
              <div class="text-[10px] text-[#64748B]">Used when vehicle-specific mileage is unassigned</div>
            </div>

            <!-- CO2 Emission Factor -->
            <div class="space-y-1.5">
              <label class="text-xs text-[#94A3B8] font-bold">CO₂ Emission Factor (kg / L):</label>
              <div class="relative">
                <input 
                  type="number" 
                  step="0.01" 
                  id="sust-co2-factor" 
                  value="${state.modelSettings.co2Factor}"
                  class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
                  onchange="window.ReRoute.Sustainability.updateAssumptions()"
                >
                <span class="absolute right-3 top-2.5 text-xs text-[#64748B] font-mono">kg/L</span>
              </div>
              <div class="text-[10px] text-[#64748B]">IPCC standard diesel factor (2.68 kg CO₂/L)</div>
            </div>
          </div>
        </div>

        <!-- Assignments Breakdown Table -->
        <div class="glass-card p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-bold text-white">Active Assignment Environmental Footprints</h2>
            <span class="text-xs text-[#94A3B8] font-mono">${assignments.length} assignments</span>
          </div>

          ${assignments.length === 0 ? `
            <div class="p-8 text-center border border-dashed border-[#1E293B] rounded-xl text-xs text-[#94A3B8]">
              No backhauls currently assigned. Accept a match in the AI Matching section to record audited environmental savings.
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="text-[11px] text-[#94A3B8] uppercase border-b border-[#1E293B] bg-[#0E1626]">
                  <tr>
                    <th class="py-2.5 px-3">Assignment ID</th>
                    <th class="py-2.5 px-3">Vehicle & Load</th>
                    <th class="py-2.5 px-3">Empty KM Avoided</th>
                    <th class="py-2.5 px-3">Fuel Saved</th>
                    <th class="py-2.5 px-3">CO₂ Avoided</th>
                    <th class="py-2.5 px-3 text-right">Net Financial Gain</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#1E293B]">
                  ${assignments.map(asg => `
                    <tr class="hover:bg-[#1F2937]/50 transition">
                      <td class="py-3 px-3 font-mono font-bold text-white">${asg.id}</td>
                      <td class="py-3 px-3 text-[#94A3B8] font-mono">
                        ${asg.truckId} ⇄ ${asg.shipmentId}
                      </td>
                      <td class="py-3 px-3 font-mono text-cyan-400 font-bold">
                        ${asg.sustainability ? `${asg.sustainability.emptyKmAvoided} km` : '—'}
                      </td>
                      <td class="py-3 px-3 font-mono text-blue-400">
                        ${asg.sustainability ? `${asg.sustainability.fuelSavedLitres} L` : '—'}
                      </td>
                      <td class="py-3 px-3 font-mono text-emerald-400 font-bold">
                        ${asg.sustainability ? `${asg.sustainability.co2AvoidedKg} kg` : '—'}
                      </td>
                      <td class="py-3 px-3 font-mono text-right text-emerald-400 font-bold">
                        +₹${asg.costGain?.toLocaleString() || 0}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  }

  function updateAssumptions() {
    const store = window.ReRoute.store;
    const fuelPrice = Number(document.getElementById('sust-fuel-price')?.value) || 94.50;
    const co2Factor = Number(document.getElementById('sust-co2-factor')?.value) || 2.68;

    store.updateModelSettings({ fuelPrice, co2Factor });
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function resetAssumptions() {
    const store = window.ReRoute.store;
    store.updateModelSettings({ fuelPrice: 94.50, co2Factor: 2.68 });
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  window.ReRoute = window.ReRoute || {};
  window.ReRoute.Sustainability = { render, updateAssumptions, resetAssumptions };
})();
