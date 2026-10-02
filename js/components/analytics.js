// ReRoute AI 2.0 - Analytics Component
// Section 20: Dynamic Fleet & Optimization Analytics
// Computed purely from actual data; shows clean "Not enough data for this metric" when empty.

(function() {
  function render(container) {
    const store = window.ReRoute.store;
    const state = store.getState();
    const riskEngine = window.ReRoute.RiskEngine;
    const matchingEngine = window.ReRoute.MatchingEngine;
    const sustEngine = window.ReRoute.SustainabilityEngine;

    const trucks = state.trucks || [];
    const shipments = state.shipments || [];
    const assignments = state.assignments || [];

    const hasTrucks = trucks.length > 0;
    const hasShipments = shipments.length > 0;
    const hasAssignments = assignments.length > 0;

    // 1. Fleet Utilization
    let totalCap = 0;
    let totalLoad = 0;
    let avgUtilization = null;
    if (hasTrucks) {
      trucks.forEach(t => {
        totalCap += (Number(t.maxCapacity) || 0);
        totalLoad += (Number(t.currentLoad) || 0);
      });
      if (totalCap > 0) {
        avgUtilization = Math.round((totalLoad / totalCap) * 100);
      }
    }

    // 2. Risk Distribution
    let riskCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    if (hasTrucks && riskEngine) {
      trucks.forEach(t => {
        const r = riskEngine.calculateEmptyReturnRisk(t, shipments, state.modelSettings);
        if (riskCounts[r.riskLevel] !== undefined) {
          riskCounts[r.riskLevel]++;
        }
      });
    }

    // 3. Backhaul Matches & Average Score
    let totalMatches = 0;
    let totalScoreSum = 0;
    if (hasTrucks && hasShipments && matchingEngine) {
      trucks.forEach(t => {
        const evaluated = matchingEngine.evaluateShipments(t, shipments, state.modelSettings);
        const feasible = evaluated.filter(m => m.isFeasible);
        totalMatches += feasible.length;
        feasible.forEach(m => { totalScoreSum += m.matchScore; });
      });
    }
    const avgMatchScore = totalMatches > 0 ? Math.round(totalScoreSum / totalMatches) : null;

    // 4. Sustainability Totals from assignments
    const fleetSust = hasAssignments && sustEngine 
      ? sustEngine.calculateFleetSustainability(assignments, state.modelSettings)
      : null;

    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn max-w-5xl mx-auto">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-extrabold text-white tracking-tight">Performance Analytics & Telemetry</h1>
              <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                100% Dynamic Aggregation
              </span>
            </div>
            <p class="text-xs text-[#94A3B8] mt-1">
              Fleet-wide utilization, corridor risk distributions, match efficiency, and avoided deadhead metrics.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs font-mono text-cyan-400">Audited Platform Data</span>
          </div>
        </div>

        <!-- Metric Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- 1. Fleet Utilization -->
          <div class="glass-card p-5 border-l-4 border-l-blue-500">
            <div class="text-[10px] text-[#64748B] uppercase font-bold">Fleet Utilization</div>
            ${avgUtilization !== null ? `
              <div class="text-3xl font-black text-white font-mono mt-1">${avgUtilization}%</div>
              <div class="text-[11px] text-[#94A3B8] mt-1">${totalLoad.toLocaleString()} kg of ${totalCap.toLocaleString()} kg</div>
              <div class="w-full bg-[#1E293B] h-1.5 rounded-full overflow-hidden mt-2">
                <div class="bg-blue-500 h-full" style="width: ${avgUtilization}%"></div>
              </div>
            ` : `
              <div class="text-lg font-bold text-[#64748B] mt-2 italic">Not enough data for this metric.</div>
              <div class="text-[11px] text-[#64748B] mt-1">Register vehicles with load & capacity.</div>
            `}
          </div>

          <!-- 2. Backhaul Matches -->
          <div class="glass-card p-5 border-l-4 border-l-cyan-500">
            <div class="text-[10px] text-[#64748B] uppercase font-bold">Feasible Match Opportunities</div>
            ${hasTrucks && hasShipments ? `
              <div class="text-3xl font-black text-cyan-400 font-mono mt-1">${totalMatches}</div>
              <div class="text-[11px] text-[#94A3B8] mt-1">Across ${trucks.length} trucks & ${shipments.length} loads</div>
            ` : `
              <div class="text-lg font-bold text-[#64748B] mt-2 italic">Not enough data for this metric.</div>
              <div class="text-[11px] text-[#64748B] mt-1">Requires trucks & shipment orders.</div>
            `}
          </div>

          <!-- 3. Average Match Score -->
          <div class="glass-card p-5 border-l-4 border-l-emerald-500">
            <div class="text-[10px] text-[#64748B] uppercase font-bold">Average Match Score</div>
            ${avgMatchScore !== null ? `
              <div class="text-3xl font-black text-emerald-400 font-mono mt-1">${avgMatchScore}%</div>
              <div class="text-[11px] text-[#94A3B8] mt-1">Mean multi-attribute efficiency</div>
            ` : `
              <div class="text-lg font-bold text-[#64748B] mt-2 italic">Not enough data for this metric.</div>
              <div class="text-[11px] text-[#64748B] mt-1">Computed once feasible matches exist.</div>
            `}
          </div>

          <!-- 4. Active Assignments -->
          <div class="glass-card p-5 border-l-4 border-l-purple-500">
            <div class="text-[10px] text-[#64748B] uppercase font-bold">Active Assignments</div>
            <div class="text-3xl font-black text-purple-300 font-mono mt-1">${assignments.length}</div>
            <div class="text-[11px] text-[#94A3B8] mt-1">Locked backhaul dispatches</div>
          </div>
        </div>

        <!-- Risk Distribution & ESG Impact Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Empty Return Risk Distribution -->
          <div class="glass-card p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-base font-bold text-white">Empty Return Risk Distribution</h2>
              <span class="text-xs font-mono text-[#64748B]">${trucks.length} Active Vehicles</span>
            </div>

            ${hasTrucks ? `
              <div class="space-y-4">
                <!-- High Risk -->
                <div>
                  <div class="flex justify-between text-xs mb-1">
                    <span class="text-red-400 font-bold flex items-center gap-1.5">
                      <span class="w-2 h-2 rounded-full bg-red-400"></span>
                      High Risk (Immediate Deadhead Threat)
                    </span>
                    <span class="font-mono text-white font-bold">${riskCounts.HIGH} vehicles</span>
                  </div>
                  <div class="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden">
                    <div class="bg-red-500 h-full" style="width: ${trucks.length > 0 ? (riskCounts.HIGH / trucks.length) * 100 : 0}%"></div>
                  </div>
                </div>

                <!-- Medium Risk -->
                <div>
                  <div class="flex justify-between text-xs mb-1">
                    <span class="text-amber-400 font-bold flex items-center gap-1.5">
                      <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                      Medium Risk (Moderate Exposure)
                    </span>
                    <span class="font-mono text-white font-bold">${riskCounts.MEDIUM} vehicles</span>
                  </div>
                  <div class="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden">
                    <div class="bg-amber-500 h-full" style="width: ${trucks.length > 0 ? (riskCounts.MEDIUM / trucks.length) * 100 : 0}%"></div>
                  </div>
                </div>

                <!-- Low Risk -->
                <div>
                  <div class="flex justify-between text-xs mb-1">
                    <span class="text-emerald-400 font-bold flex items-center gap-1.5">
                      <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                      Low Risk (Backhaul Assigned or High Demand)
                    </span>
                    <span class="font-mono text-white font-bold">${riskCounts.LOW} vehicles</span>
                  </div>
                  <div class="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden">
                    <div class="bg-emerald-500 h-full" style="width: ${trucks.length > 0 ? (riskCounts.LOW / trucks.length) * 100 : 0}%"></div>
                  </div>
                </div>
              </div>
            ` : `
              <div class="p-8 text-center text-xs text-[#64748B] border border-dashed border-[#1E293B] rounded-xl">
                Not enough data for this metric. Add trucks to evaluate risk distribution.
              </div>
            `}
          </div>

          <!-- Total Audited Savings -->
          <div class="glass-card p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-base font-bold text-white">Aggregated Backhaul Impact</h2>
              <span class="text-xs font-mono text-emerald-400">Audited Metrics</span>
            </div>

            ${fleetSust ? `
              <div class="space-y-4 text-xs font-mono">
                <div class="p-3 rounded-lg bg-[#0E1626] border border-[#1E293B] flex justify-between items-center">
                  <span class="text-[#94A3B8]">Total Empty KM Avoided:</span>
                  <span class="text-base font-bold text-cyan-400">${fleetSust.totalEmptyKmAvoided} km</span>
                </div>
                <div class="p-3 rounded-lg bg-[#0E1626] border border-[#1E293B] flex justify-between items-center">
                  <span class="text-[#94A3B8]">Diesel Fuel Conserved:</span>
                  <span class="text-base font-bold text-blue-400">${fleetSust.totalFuelSavedLitres} Litres</span>
                </div>
                <div class="p-3 rounded-lg bg-[#0E1626] border border-[#1E293B] flex justify-between items-center">
                  <span class="text-[#94A3B8]">Avoided CO₂ Footprint:</span>
                  <span class="text-base font-bold text-emerald-400">${fleetSust.totalCo2AvoidedKg} kg CO₂</span>
                </div>
                <div class="p-3 rounded-lg bg-[#0E1626] border border-[#1E293B] flex justify-between items-center">
                  <span class="text-[#94A3B8]">Net Financial Revenue Gain:</span>
                  <span class="text-base font-bold text-emerald-400">+₹${fleetSust.totalCostImpact.toLocaleString()}</span>
                </div>
              </div>
            ` : `
              <div class="p-8 text-center text-xs text-[#64748B] border border-dashed border-[#1E293B] rounded-xl">
                Not enough data for this metric. Locked backhaul assignments are required to audit cumulative savings.
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  window.ReRoute = window.ReRoute || {};
  window.ReRoute.Analytics = { render };
})();
