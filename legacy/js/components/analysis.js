// ReRoute AI 2.0 - AI Analysis Component
// Truck selector, telemetry preview, "RUN REROUTE AI", and 8-stage analysis execution

(function() {
  let isAnalyzing = false;
  let analysisStage = 0;

  const STAGES = [
    "Analyzing route geometry & corridor bearings...",
    "Checking vehicle capacity constraints & payload fit...",
    "Evaluating pickup window schedules & driver rest...",
    "Estimating transit ETA & arrival buffers...",
    "Calculating route detour & deadhead kilometers...",
    "Estimating fuel consumption & net cost impact...",
    "Evaluating disruption risk & SLA feasibility...",
    "Calculating ESG sustainability & avoided CO₂ emissions..."
  ];

  function render(container) {
    const store = window.ReRoute.store;
    const state = store.getState();
    const trucks = state.trucks || [];
    const shipments = state.shipments || [];

    if (trucks.length === 0) {
      container.innerHTML = `
        <div class="glass-card p-12 text-center max-w-xl mx-auto my-12">
          <div class="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h2 class="text-xl font-bold text-white mb-2">No Vehicles Available for Analysis</h2>
          <p class="text-xs text-[#94A3B8] mb-6">Add at least one truck to your fleet to evaluate empty-return risk and match backhauls.</p>
          <div class="flex items-center justify-center gap-3">
            <button onclick="window.ReRoute.UI.openAddTruckModal()" class="btn-primary px-4 py-2 text-xs font-semibold">
              + Add Truck
            </button>
            <button onclick="window.ReRoute.store.loadSampleData()" class="btn-outline px-4 py-2 text-xs font-semibold text-amber-300 border-amber-500/30">
              Load Sample Data
            </button>
          </div>
        </div>
      `;
      return;
    }

    // Identify active truck
    let activeTruck = trucks.find(t => t.id === state.activeTruckId);
    if (!activeTruck) {
      activeTruck = trucks[0];
      state.activeTruckId = activeTruck.id;
    }

    const maxCap = Number(activeTruck.maxCapacity) || 0;
    const curLoad = Number(activeTruck.currentLoad) || 0;
    const availCap = Math.max(0, maxCap - curLoad);

    // Compute live risk model for preview
    const riskEngine = window.ReRoute.RiskEngine;
    const risk = riskEngine ? riskEngine.calculateEmptyReturnRisk(activeTruck, shipments, state.modelSettings) : null;

    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn max-w-5xl mx-auto">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>Predictive ReRoute Analysis</span>
              <span class="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Prototype Risk Model
              </span>
            </h1>
            <p class="text-xs text-[#94A3B8] mt-1">
              Select any vehicle from your fleet to analyze empty return probability, evaluate demand density, and generate ranked backhaul matches.
            </p>
          </div>

          <!-- Vehicle Selector -->
          <div class="flex items-center gap-2">
            <label class="text-xs text-[#94A3B8] font-semibold">Select Vehicle:</label>
            <select 
              id="analysis-truck-select" 
              class="bg-[#111827] text-white text-xs font-bold rounded-lg px-3 py-2 border border-[#334155] focus:border-cyan-500 outline-none cursor-pointer"
              onchange="window.ReRoute.Analysis.selectTruck(this.value)"
            >
              ${trucks.map(t => `
                <option value="${t.id}" ${t.id === activeTruck.id ? 'selected' : ''}>
                  ${t.id} — ${t.destination} (${t.status})
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Telemetry & Vehicle Specifications Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <!-- Card 1: Asset Core -->
          <div class="glass-card p-5 border-l-4 border-l-blue-500">
            <div class="text-xs text-[#94A3B8] uppercase font-bold tracking-wider mb-3">Vehicle Telemetry</div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xl font-black text-white font-mono">${activeTruck.id}</span>
              <span class="badge-status ${activeTruck.status === 'Available' ? 'badge-risk-low' : activeTruck.status === 'Delayed' ? 'badge-risk-high' : 'badge-ai'}">
                ${activeTruck.status}
              </span>
            </div>
            <div class="text-xs text-[#94A3B8]">${activeTruck.vehicleType}</div>
            
            <div class="mt-4 pt-3 border-t border-[#1E293B] space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-[#64748B]">Driver Status:</span>
                <span class="text-white font-medium">${activeTruck.driverAvailability || 'On Duty'}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[#64748B]">Mileage:</span>
                <span class="text-white font-mono">${activeTruck.mileage} km/L</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[#64748B]">Fuel Price:</span>
                <span class="text-white font-mono">₹${activeTruck.fuelPrice}/L</span>
              </div>
            </div>
          </div>

          <!-- Card 2: Corridor & Timeline -->
          <div class="glass-card p-5 border-l-4 border-l-cyan-500">
            <div class="text-xs text-[#94A3B8] uppercase font-bold tracking-wider mb-3">Route Corridor & ETA</div>
            
            <div class="space-y-3 text-xs">
              <div>
                <div class="text-[10px] text-[#64748B] uppercase">Origin Terminal</div>
                <div class="text-white font-semibold text-sm">${activeTruck.currentLocation}</div>
                <div class="text-[10px] text-[#64748B] font-mono">${activeTruck.currentLat?.toFixed(4)}, ${activeTruck.currentLng?.toFixed(4)}</div>
              </div>

              <div class="pt-2 border-t border-[#1E293B]">
                <div class="text-[10px] text-[#64748B] uppercase">Current Destination</div>
                <div class="text-cyan-400 font-semibold text-sm">${activeTruck.destination}</div>
                <div class="text-[10px] text-[#64748B] font-mono">${activeTruck.destLat?.toFixed(4)}, ${activeTruck.destLng?.toFixed(4)}</div>
              </div>

              <div class="pt-2 border-t border-[#1E293B] flex justify-between items-center">
                <span class="text-[#64748B]">Delivery Completion:</span>
                <span class="text-white font-mono font-bold">
                  ${activeTruck.expectedDeliveryTime ? new Date(activeTruck.expectedDeliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
              </div>
            </div>
          </div>

          <!-- Card 3: Capacity & Empty Exposure -->
          <div class="glass-card p-5 border-l-4 border-l-emerald-500">
            <div class="text-xs text-[#94A3B8] uppercase font-bold tracking-wider mb-3">Capacity & Payload Fit</div>
            
            <div class="flex items-baseline justify-between mb-1">
              <span class="text-2xl font-black text-cyan-400 font-mono">${availCap.toLocaleString()} kg</span>
              <span class="text-xs text-[#94A3B8]">Available Capacity</span>
            </div>

            <div class="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden my-3">
              <div class="bg-gradient-to-r from-blue-500 to-cyan-400 h-full" style="width: ${maxCap > 0 ? (curLoad/maxCap)*100 : 0}%"></div>
            </div>

            <div class="space-y-1.5 text-xs">
              <div class="flex justify-between">
                <span class="text-[#64748B]">Current Inbound Load:</span>
                <span class="text-white font-mono">${curLoad.toLocaleString()} kg</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[#64748B]">Max Rated Capacity:</span>
                <span class="text-white font-mono">${maxCap.toLocaleString()} kg</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[#64748B]">Current Utilization:</span>
                <span class="text-white font-mono font-semibold">${maxCap > 0 ? Math.round((curLoad/maxCap)*100) : 0}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Prototype Empty Return Risk Forecast Card -->
        ${risk ? `
          <div class="glass-card p-6 border border-[#1E293B]">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-white uppercase tracking-wider">Empty Return Risk Forecast</span>
                  <span class="badge-status ${risk.riskLevel === 'HIGH' ? 'badge-risk-high' : risk.riskLevel === 'MEDIUM' ? 'badge-risk-medium' : 'badge-risk-low'}">
                    ${risk.riskLevel} RISK (${risk.probability}%)
                  </span>
                </div>
                <div class="text-xs text-[#94A3B8] mt-1">
                  Expected unladen release: <strong class="text-white">${risk.expectedAvailability}</strong> • Corridor candidates: <strong class="text-cyan-400">${risk.loadsNearby} loads</strong> within 120 km.
                </div>
              </div>

              <div class="flex items-center gap-4">
                <div class="text-right hidden sm:block">
                  <div class="text-[10px] text-[#64748B] uppercase">Empty Risk Probability</div>
                  <div class="text-2xl font-black ${risk.riskLevel === 'HIGH' ? 'text-red-400' : risk.riskLevel === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'} font-mono">
                    ${risk.probability}%
                  </div>
                </div>
                <!-- Action Button -->
                <button 
                  id="btn-run-reroute" 
                  onclick="window.ReRoute.Analysis.runAnalysis('${activeTruck.id}')" 
                  class="btn-primary px-6 py-3 text-sm font-bold shadow-lg shadow-blue-500/20 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  <span>RUN REROUTE AI</span>
                </button>
              </div>
            </div>

            <!-- Risk Contributing Factor Breakdown -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              ${risk.factors.map(f => `
                <div class="p-3 rounded-lg bg-[#0E1626] border border-[#1E293B]">
                  <div class="flex justify-between text-xs mb-1">
                    <span class="text-[#94A3B8] font-medium">${f.name}</span>
                    <span class="font-mono font-bold text-white">${f.score} / ${f.maxScore}</span>
                  </div>
                  <div class="w-full bg-[#1F2937] h-1 rounded-full overflow-hidden mb-2">
                    <div class="bg-gradient-to-r from-blue-500 to-cyan-400 h-full" style="width: ${(f.score / f.maxScore) * 100}%"></div>
                  </div>
                  <div class="text-[11px] text-[#64748B] leading-tight">${f.description}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Execution Stepper Overlay (Shown when running) -->
        <div id="analysis-progress-panel" class="${isAnalyzing ? 'block' : 'hidden'} glass-card p-6 border-cyan-500/40 glow-cyan">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-cyan-400 animate-ping"></span>
              <span class="text-sm font-bold text-white">Executing ReRoute Multi-Factor Optimization Pipeline</span>
            </div>
            <span id="analysis-step-count" class="text-xs font-mono text-cyan-300">Stage 1 of 8</span>
          </div>

          <div class="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden mb-3">
            <div id="analysis-progress-bar" class="bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 h-full transition-all duration-300" style="width: 12.5%"></div>
          </div>

          <div id="analysis-step-label" class="text-xs font-mono text-cyan-300">
            ${STAGES[0]}
          </div>
        </div>
      </div>
    `;
  }

  function selectTruck(truckId) {
    const store = window.ReRoute.store;
    store.setActiveTruck(truckId);
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  async function runAnalysis(truckId) {
    const store = window.ReRoute.store;
    const container = document.getElementById('main-content');
    isAnalyzing = true;
    render(container);

    const progressPanel = document.getElementById('analysis-progress-panel');
    const progressBar = document.getElementById('analysis-progress-bar');
    const stepCount = document.getElementById('analysis-step-count');
    const stepLabel = document.getElementById('analysis-step-label');

    if (progressPanel) progressPanel.classList.remove('hidden');

    for (let i = 0; i < STAGES.length; i++) {
      if (progressBar) progressBar.style.width = `${((i + 1) / STAGES.length) * 100}%`;
      if (stepCount) stepCount.textContent = `Stage ${i + 1} of ${STAGES.length}`;
      if (stepLabel) stepLabel.textContent = STAGES[i];
      await new Promise(r => setTimeout(r, 220));
    }

    isAnalyzing = false;
    store.setActiveTruck(truckId);
    // Navigate straight to Matching results screen
    store.setActiveScreen('matching');
  }

  window.ReRoute = window.ReRoute || {};
  window.ReRoute.Analysis = { render, selectTruck, runAnalysis };
})();
