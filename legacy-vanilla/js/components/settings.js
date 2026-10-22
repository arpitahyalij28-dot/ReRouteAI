// ReRoute AI 2.0 - Model Settings Component
// Section 19: Configurable Matching Weights & Operational Engine Assumptions
// Enforces 100% total weight constraint with instant real-time validation

(function() {
  function render(container) {
    const store = window.ReRoute.store;
    const state = store.getState();
    const settings = state.modelSettings;
    const w = settings.weights;

    const totalWeight = (Number(w.route) || 0) + (Number(w.time) || 0) + (Number(w.capacity) || 0) +
                        (Number(w.detour) || 0) + (Number(w.cost) || 0) + (Number(w.disruption) || 0);

    const isValidTotal = totalWeight === 100;

    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn max-w-4xl mx-auto">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-extrabold text-white tracking-tight">Model Configuration & Weights</h1>
              <span class="text-xs font-mono font-bold px-2 py-0.5 rounded ${isValidTotal ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}">
                Total Weight: ${totalWeight}%
              </span>
            </div>
            <p class="text-xs text-[#94A3B8] mt-1">
              Customize algorithmic trade-offs between detour tolerance, time margins, payload utilization, and profitability.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="window.ReRoute.Settings.resetDefaults()" class="btn-outline px-3.5 py-1.5 text-xs text-[#94A3B8] hover:text-white font-mono">
              ↺ Reset Defaults
            </button>
            <button 
              id="btn-save-settings" 
              onclick="window.ReRoute.Settings.saveSettings()" 
              class="btn-primary px-5 py-1.5 text-xs font-bold shadow ${!isValidTotal ? 'opacity-50 cursor-not-allowed' : ''}"
              ${!isValidTotal ? 'disabled' : ''}
            >
              Save Configuration
            </button>
          </div>
        </div>

        <!-- Section 1: 6 Matching Weight Sliders -->
        <div class="glass-card p-6 border border-[#1E293B]">
          <div class="flex items-center justify-between mb-4 pb-3 border-b border-[#1E293B]">
            <div>
              <h2 class="text-base font-bold text-white">Backhaul Matching Weights</h2>
              <div class="text-xs text-[#94A3B8]">The 6 algorithmic components must sum exactly to 100%.</div>
            </div>
            
            <div id="settings-weight-indicator" class="text-xs font-mono font-bold ${isValidTotal ? 'text-emerald-400' : 'text-red-400'}">
              ${isValidTotal ? '✓ Weights sum to 100%' : `⚠ Sum is ${totalWeight}% (Must equal 100%)`}
            </div>
          </div>

          <div class="space-y-5">
            <!-- 1. Route Compatibility (25%) -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs font-bold">
                <span class="text-white">Route Compatibility</span>
                <span id="val-route" class="text-cyan-400 font-mono">${w.route}%</span>
              </div>
              <input 
                type="range" min="0" max="60" value="${w.route}" id="weight-route" 
                class="w-full h-1.5 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-cyan-400"
                oninput="window.ReRoute.Settings.onWeightChange()"
              >
              <div class="text-[10px] text-[#64748B]">Heading alignment, deadhead pickup proximity, and base terminal return.</div>
            </div>

            <!-- 2. Time Compatibility (20%) -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs font-bold">
                <span class="text-white">Time Compatibility</span>
                <span id="val-time" class="text-blue-400 font-mono">${w.time}%</span>
              </div>
              <input 
                type="range" min="0" max="60" value="${w.time}" id="weight-time" 
                class="w-full h-1.5 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-blue-500"
                oninput="window.ReRoute.Settings.onWeightChange()"
              >
              <div class="text-[10px] text-[#64748B]">Pickup window margin and buffer against scheduled delivery completion.</div>
            </div>

            <!-- 3. Capacity Fit (20%) -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs font-bold">
                <span class="text-white">Capacity Fit</span>
                <span id="val-capacity" class="text-emerald-400 font-mono">${w.capacity}%</span>
              </div>
              <input 
                type="range" min="0" max="60" value="${w.capacity}" id="weight-capacity" 
                class="w-full h-1.5 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-emerald-500"
                oninput="window.ReRoute.Settings.onWeightChange()"
              >
              <div class="text-[10px] text-[#64748B]">Optimal payload utilization percentage of available vehicle capacity.</div>
            </div>

            <!-- 4. Detour Efficiency (15%) -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs font-bold">
                <span class="text-white">Detour Efficiency</span>
                <span id="val-detour" class="text-amber-400 font-mono">${w.detour}%</span>
              </div>
              <input 
                type="range" min="0" max="60" value="${w.detour}" id="weight-detour" 
                class="w-full h-1.5 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-amber-500"
                oninput="window.ReRoute.Settings.onWeightChange()"
              >
              <div class="text-[10px] text-[#64748B]">Penalizes additional kilometers above direct return route.</div>
            </div>

            <!-- 5. Cost Efficiency (10%) -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs font-bold">
                <span class="text-white">Cost Efficiency</span>
                <span id="val-cost" class="text-purple-400 font-mono">${w.cost}%</span>
              </div>
              <input 
                type="range" min="0" max="60" value="${w.cost}" id="weight-cost" 
                class="w-full h-1.5 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-purple-500"
                oninput="window.ReRoute.Settings.onWeightChange()"
              >
              <div class="text-[10px] text-[#64748B]">Net margin ratio between shipment revenue and detour diesel expenses.</div>
            </div>

            <!-- 6. Disruption Risk (10%) -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs font-bold">
                <span class="text-white">Disruption Risk</span>
                <span id="val-disruption" class="text-indigo-400 font-mono">${w.disruption}%</span>
              </div>
              <input 
                type="range" min="0" max="60" value="${w.disruption}" id="weight-disruption" 
                class="w-full h-1.5 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                oninput="window.ReRoute.Settings.onWeightChange()"
              >
              <div class="text-[10px] text-[#64748B]">Driver fatigue buffers and SLA deadline margin stability.</div>
            </div>
          </div>
        </div>

        <!-- Section 2: Global Operational Thresholds -->
        <div class="glass-card p-6 border border-[#1E293B]">
          <h2 class="text-base font-bold text-white mb-1">Operational Engine Parameters</h2>
          <div class="text-xs text-[#94A3B8] mb-4">Physics and dispatch constraints used across ETA, distance, and ESG models:</div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Average Speed -->
            <div class="space-y-1">
              <label class="text-xs text-[#94A3B8] font-bold">Average Operating Speed (km/h):</label>
              <input 
                type="number" id="setting-speed" value="${settings.speedKmH}" min="20" max="90"
                class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
              >
              <div class="text-[10px] text-[#64748B]">Commercial highway transit speed</div>
            </div>

            <!-- Delay Threshold -->
            <div class="space-y-1">
              <label class="text-xs text-[#94A3B8] font-bold">Delay Alert Threshold (mins):</label>
              <input 
                type="number" id="setting-delay" value="${settings.delayThresholdMins}" min="10" max="180"
                class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
              >
              <div class="text-[10px] text-[#64748B]">Triggers 'AT RISK' classification</div>
            </div>

            <!-- Max Acceptable Detour -->
            <div class="space-y-1">
              <label class="text-xs text-[#94A3B8] font-bold">Max Acceptable Detour (km):</label>
              <input 
                type="number" id="setting-max-detour" value="${settings.maxDetourKm}" min="20" max="300"
                class="w-full bg-[#0E1626] border border-[#1E293B] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
              >
              <div class="text-[10px] text-[#64748B]">Upper detour tolerance for dispatch</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function onWeightChange() {
    const r = Number(document.getElementById('weight-route')?.value) || 0;
    const t = Number(document.getElementById('weight-time')?.value) || 0;
    const cap = Number(document.getElementById('weight-capacity')?.value) || 0;
    const d = Number(document.getElementById('weight-detour')?.value) || 0;
    const c = Number(document.getElementById('weight-cost')?.value) || 0;
    const dis = Number(document.getElementById('weight-disruption')?.value) || 0;

    document.getElementById('val-route').textContent = `${r}%`;
    document.getElementById('val-time').textContent = `${t}%`;
    document.getElementById('val-capacity').textContent = `${cap}%`;
    document.getElementById('val-detour').textContent = `${d}%`;
    document.getElementById('val-cost').textContent = `${c}%`;
    document.getElementById('val-disruption').textContent = `${dis}%`;

    const total = r + t + cap + d + c + dis;
    const indicator = document.getElementById('settings-weight-indicator');
    const saveBtn = document.getElementById('btn-save-settings');

    if (total === 100) {
      if (indicator) {
        indicator.textContent = "✓ Weights sum to 100%";
        indicator.className = "text-xs font-mono font-bold text-emerald-400";
      }
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    } else {
      if (indicator) {
        indicator.textContent = `⚠ Sum is ${total}% (Must equal 100%)`;
        indicator.className = "text-xs font-mono font-bold text-red-400";
      }
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }
    }
  }

  function saveSettings() {
    const store = window.ReRoute.store;
    const r = Number(document.getElementById('weight-route')?.value) || 25;
    const t = Number(document.getElementById('weight-time')?.value) || 20;
    const cap = Number(document.getElementById('weight-capacity')?.value) || 20;
    const d = Number(document.getElementById('weight-detour')?.value) || 15;
    const c = Number(document.getElementById('weight-cost')?.value) || 10;
    const dis = Number(document.getElementById('weight-disruption')?.value) || 10;

    if (r + t + cap + d + c + dis !== 100) {
      alert("Weights must sum exactly to 100% before saving.");
      return;
    }

    const speedKmH = Number(document.getElementById('setting-speed')?.value) || 45;
    const delayThresholdMins = Number(document.getElementById('setting-delay')?.value) || 45;
    const maxDetourKm = Number(document.getElementById('setting-max-detour')?.value) || 80;

    store.updateModelSettings({
      weights: { route: r, time: t, capacity: cap, detour: d, cost: c, disruption: dis },
      speedKmH,
      delayThresholdMins,
      maxDetourKm
    });

    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function resetDefaults() {
    const store = window.ReRoute.store;
    store.updateModelSettings({
      weights: { route: 25, time: 20, capacity: 20, detour: 15, cost: 10, disruption: 10 },
      speedKmH: 45,
      delayThresholdMins: 45,
      maxDetourKm: 80
    });
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  window.ReRoute = window.ReRoute || {};
  window.ReRoute.Settings = { render, onWeightChange, saveSettings, resetDefaults };
})();
