// ReRoute AI 2.0 - Dashboard Component
// 100% Dynamic Logistics Command Center
// NEVER hardcodes KPI numbers; strictly computes from actual records.

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
    const hasData = trucks.length > 0 || shipments.length > 0;

    // Calculate dynamic KPIs
    const activeTrucks = trucks.filter(t => t.status !== 'Maintenance').length;
    const availableShipments = shipments.filter(s => s.status === 'Available').length;

    // At-Risk calculation
    let atRiskTrucks = [];
    let highRiskCount = 0;
    if (trucks.length > 0 && riskEngine) {
      trucks.forEach(t => {
        const risk = riskEngine.calculateEmptyReturnRisk(t, shipments, state.modelSettings);
        if (risk.riskLevel === 'HIGH' || risk.riskLevel === 'MEDIUM') {
          atRiskTrucks.push({ truck: t, risk });
          if (risk.riskLevel === 'HIGH') highRiskCount++;
        }
      });
    }

    // Feasible matches count across all trucks
    let totalFeasibleMatches = 0;
    if (trucks.length > 0 && shipments.length > 0 && matchingEngine) {
      trucks.forEach(t => {
        const matches = matchingEngine.evaluateShipments(t, shipments, state.modelSettings);
        totalFeasibleMatches += matches.filter(m => m.isFeasible).length;
      });
    }

    // Fleet Utilization calculation
    let fleetUtilizationStr = "—";
    if (trucks.length > 0) {
      const totalMax = trucks.reduce((sum, t) => sum + (Number(t.maxCapacity) || 0), 0);
      const totalLoad = trucks.reduce((sum, t) => sum + (Number(t.currentLoad) || 0), 0);
      if (totalMax > 0) {
        fleetUtilizationStr = Math.round((totalLoad / totalMax) * 100) + "%";
      }
    }

    // Cumulative Sustainability from active assignments or opportunities
    let co2ImpactStr = "—";
    let costImpactStr = "—";
    if (assignments.length > 0 && sustEngine) {
      const fleetSust = sustEngine.calculateFleetSustainability(assignments, state.modelSettings);
      co2ImpactStr = `${fleetSust.totalCo2AvoidedKg.toLocaleString()} kg`;
      costImpactStr = `₹${fleetSust.totalCostImpact.toLocaleString()}`;
    } else if (hasData && totalFeasibleMatches > 0) {
      // Show projected potential if no assignments made yet
      co2ImpactStr = "Calculated in Analysis";
      costImpactStr = "Calculated in Analysis";
    }

    // 1. EMPTY STATE HERO (if no data)
    if (!hasData) {
      container.innerHTML = `
        <div class="space-y-8 animate-fadeIn">
          <!-- Welcome Empty State Banner -->
          <div class="glass-card p-8 md:p-12 text-center border-blue-500/30 glow-blue max-w-4xl mx-auto my-6">
            <div class="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/10">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
            
            <h1 class="text-3xl font-extrabold text-white tracking-tight mb-3">
              Welcome to ReRoute AI 2.0
            </h1>
            <p class="text-base text-[#94A3B8] max-w-2xl mx-auto mb-8 leading-relaxed">
              Predictive Backhaul & Empty-Mile Optimization Platform. Add your fleet and shipment data to begin dynamic matching, risk forecasting, and ESG impact tracking.
            </p>

            <div class="flex flex-wrap items-center justify-center gap-3">
              <button onclick="window.ReRoute.UI.openAddTruckModal()" class="btn-primary px-5 py-2.5 text-sm font-semibold shadow-lg">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                <span>+ Add Truck</span>
              </button>
              <button onclick="window.ReRoute.UI.openAddShipmentModal()" class="btn-primary px-5 py-2.5 text-sm font-semibold shadow-lg bg-gradient-to-r from-cyan-600 to-blue-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                <span>+ Add Shipment</span>
              </button>
              <button onclick="window.ReRoute.store.setActiveScreen('data-management')" class="btn-outline px-4 py-2.5 text-sm font-semibold">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                <span>Import CSV</span>
              </button>
              <button onclick="window.ReRoute.store.loadSampleData()" class="btn-outline px-4 py-2.5 text-sm font-semibold border-amber-500/30 text-amber-300 hover:border-amber-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                <span>Load Sample Data</span>
              </button>
            </div>
            
            <div class="mt-6 text-xs text-[#64748B]">
              Note: Sample data is strictly optional for demonstration. You can start with completely empty data.
            </div>
          </div>

          <!-- Zero State Metric Cards -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="glass-card p-5">
              <div class="text-xs text-[#94A3B8] uppercase font-bold tracking-wider">Active Trucks</div>
              <div class="text-2xl font-black text-white mt-1">0</div>
              <div class="text-[11px] text-[#64748B] mt-1">No active vehicles registered</div>
            </div>
            <div class="glass-card p-5">
              <div class="text-xs text-[#94A3B8] uppercase font-bold tracking-wider">Available Shipments</div>
              <div class="text-2xl font-black text-white mt-1">0</div>
              <div class="text-[11px] text-[#64748B] mt-1">No pending freight demand</div>
            </div>
            <div class="glass-card p-5">
              <div class="text-xs text-[#94A3B8] uppercase font-bold tracking-wider">At-Risk Returns</div>
              <div class="text-2xl font-black text-white mt-1">0</div>
              <div class="text-[11px] text-[#64748B] mt-1">Empty return risk uncalculated</div>
            </div>
            <div class="glass-card p-5">
              <div class="text-xs text-[#94A3B8] uppercase font-bold tracking-wider">Backhaul Matches</div>
              <div class="text-2xl font-black text-white mt-1">0</div>
              <div class="text-[11px] text-[#64748B] mt-1">Awaiting vehicle & cargo inputs</div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="glass-card p-5">
              <div class="text-xs text-[#94A3B8] uppercase font-bold">Fleet Utilization</div>
              <div class="text-2xl font-black text-[#64748B] mt-1">—</div>
              <div class="text-[11px] text-[#64748B] mt-1">No load data available</div>
            </div>
            <div class="glass-card p-5">
              <div class="text-xs text-[#94A3B8] uppercase font-bold">Estimated CO₂ Impact</div>
              <div class="text-2xl font-black text-[#64748B] mt-1">—</div>
              <div class="text-[11px] text-[#64748B] mt-1">Model-based estimate</div>
            </div>
            <div class="glass-card p-5">
              <div class="text-xs text-[#94A3B8] uppercase font-bold">Estimated Cost Impact</div>
              <div class="text-2xl font-black text-[#64748B] mt-1">—</div>
              <div class="text-[11px] text-[#64748B] mt-1">Model-based estimate</div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // 2. DYNAMIC DASHBOARD WITH REAL USER / SAMPLE DATA
    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn">
        <!-- Top Operational Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>Logistics Intelligence Command Center</span>
              <span class="badge-status ${state.trucks.some(t => t.isSample) ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'}">
                ${store.getDataMode()}
              </span>
            </h1>
            <p class="text-xs text-[#94A3B8] mt-1">
              Autonomous backhaul prediction and dynamic empty-mile reduction.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="window.ReRoute.UI.openAddTruckModal()" class="btn-primary px-3 py-1.5 text-xs font-semibold">
              <span>+ Add Truck</span>
            </button>
            <button onclick="window.ReRoute.UI.openAddShipmentModal()" class="btn-primary px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600">
              <span>+ Add Shipment</span>
            </button>
            <button onclick="window.ReRoute.store.setActiveScreen('analysis')" class="btn-outline px-3.5 py-1.5 text-xs font-semibold text-cyan-300 border-cyan-500/40">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              <span>Run ReRoute AI</span>
            </button>
          </div>
        </div>

        <!-- 4 Primary Dynamic KPI Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Active Trucks -->
          <div class="glass-card p-5 border-l-4 border-l-blue-500">
            <div class="flex items-center justify-between">
              <span class="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">Active Trucks</span>
              <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path></svg>
            </div>
            <div class="text-3xl font-black text-white mt-2">${activeTrucks}</div>
            <div class="text-[11px] text-[#94A3B8] mt-1 flex items-center justify-between">
              <span>Total Fleet: <strong>${trucks.length}</strong></span>
              <span class="text-emerald-400">${trucks.filter(t => t.status === 'Available').length} Available</span>
            </div>
          </div>

          <!-- Available Shipments -->
          <div class="glass-card p-5 border-l-4 border-l-cyan-500">
            <div class="flex items-center justify-between">
              <span class="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">Available Shipments</span>
              <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            </div>
            <div class="text-3xl font-black text-cyan-400 mt-2">${availableShipments}</div>
            <div class="text-[11px] text-[#94A3B8] mt-1 flex items-center justify-between">
              <span>Demand Pool: <strong>${shipments.length}</strong></span>
              <span class="text-amber-400">${shipments.filter(s => s.status === 'Reserved').length} Reserved</span>
            </div>
          </div>

          <!-- At-Risk Returns -->
          <div class="glass-card p-5 border-l-4 border-l-red-500">
            <div class="flex items-center justify-between">
              <span class="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">At-Risk Returns</span>
              <span class="w-2 h-2 rounded-full bg-red-400 ${atRiskTrucks.length > 0 ? 'animate-ping' : ''}"></span>
            </div>
            <div class="text-3xl font-black text-red-400 mt-2">${atRiskTrucks.length}</div>
            <div class="text-[11px] text-[#94A3B8] mt-1 flex items-center justify-between">
              <span>${highRiskCount} High Risk</span>
              <span class="text-xs font-mono text-red-300">Prototype Risk Model</span>
            </div>
          </div>

          <!-- Backhaul Matches -->
          <div class="glass-card p-5 border-l-4 border-l-emerald-500">
            <div class="flex items-center justify-between">
              <span class="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">Feasible Matches</span>
              <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div class="text-3xl font-black text-emerald-400 mt-2">${totalFeasibleMatches}</div>
            <div class="text-[11px] text-[#94A3B8] mt-1 flex items-center justify-between">
              <span>Assignments: <strong>${assignments.length}</strong></span>
              <span class="text-xs text-emerald-400 font-semibold">Active Optimizations</span>
            </div>
          </div>
        </div>

        <!-- 3 Secondary Dynamic Impact Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="glass-card p-5">
            <div class="flex items-center justify-between">
              <span class="text-xs text-[#94A3B8] uppercase font-bold">Fleet Utilization</span>
              <span class="text-[10px] text-cyan-400 font-mono">Dynamic Load Ratio</span>
            </div>
            <div class="text-2xl font-black text-white mt-1">${fleetUtilizationStr}</div>
            <div class="w-full bg-[#1F2937] h-1.5 rounded-full mt-2 overflow-hidden">
              <div class="bg-gradient-to-r from-blue-500 to-cyan-400 h-full" style="width: ${fleetUtilizationStr === '—' ? '0%' : fleetUtilizationStr}"></div>
            </div>
          </div>

          <div class="glass-card p-5">
            <div class="flex items-center justify-between">
              <span class="text-xs text-[#94A3B8] uppercase font-bold">Estimated CO₂ Impact</span>
              <span class="text-[10px] text-emerald-400 font-mono">Model-based estimate</span>
            </div>
            <div class="text-2xl font-black text-emerald-400 mt-1">${co2ImpactStr}</div>
            <div class="text-[11px] text-[#94A3B8] mt-1">Cumulative emissions avoided via backhaul</div>
          </div>

          <div class="glass-card p-5">
            <div class="flex items-center justify-between">
              <span class="text-xs text-[#94A3B8] uppercase font-bold">Estimated Cost Impact</span>
              <span class="text-[10px] text-emerald-400 font-mono">Model-based estimate</span>
            </div>
            <div class="text-2xl font-black text-white mt-1">${costImpactStr}</div>
            <div class="text-[11px] text-[#94A3B8] mt-1">Net diesel and deadhead revenue gain</div>
          </div>
        </div>

        <!-- Main Dashboard Split: Urgent At-Risk Vehicles + Recent Backhaul Assignments -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left Column (2 Cols): Urgent Vehicles Requiring Backhaul Analysis -->
          <div class="lg:col-span-2 glass-card p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-base font-bold text-white flex items-center gap-2">
                  <span>Vehicles at Risk of Empty Return</span>
                  <span class="text-xs font-mono text-[#94A3B8]">(${atRiskTrucks.length} detected)</span>
                </h2>
                <div class="text-xs text-[#94A3B8]">Vehicles completing deliveries without assigned backhauls.</div>
              </div>
              <button onclick="window.ReRoute.store.setActiveScreen('fleet')" class="text-xs text-cyan-400 hover:text-cyan-300 font-semibold">
                View All Fleet →
              </button>
            </div>

            ${atRiskTrucks.length === 0 ? `
              <div class="p-8 text-center border border-dashed border-[#1E293B] rounded-xl text-xs text-[#94A3B8]">
                ✓ All active vehicles currently have low empty-return risk or assigned backhauls.
              </div>
            ` : `
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="text-[11px] text-[#94A3B8] uppercase border-b border-[#1E293B] bg-[#0E1626]">
                    <tr>
                      <th class="py-2.5 px-3 font-semibold">Vehicle</th>
                      <th class="py-2.5 px-3 font-semibold">Corridor</th>
                      <th class="py-2.5 px-3 font-semibold">Empty Availability</th>
                      <th class="py-2.5 px-3 font-semibold">Risk Level</th>
                      <th class="py-2.5 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#1E293B]">
                    ${atRiskTrucks.slice(0, 5).map(item => `
                      <tr class="hover:bg-[#1F2937]/50 transition">
                        <td class="py-3 px-3">
                          <div class="font-bold text-white font-mono flex items-center gap-1.5">
                            <span>${item.truck.id}</span>
                            ${item.truck.isSample ? '<span class="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300">SAMPLE</span>' : ''}
                          </div>
                          <div class="text-[10px] text-[#94A3B8]">${item.truck.vehicleType}</div>
                        </td>
                        <td class="py-3 px-3">
                          <div class="text-white font-medium">${item.truck.destination}</div>
                          <div class="text-[10px] text-[#64748B]">From: ${item.truck.currentLocation}</div>
                        </td>
                        <td class="py-3 px-3 text-[#94A3B8] font-mono">
                          ${item.risk.expectedAvailability}
                        </td>
                        <td class="py-3 px-3">
                          <span class="badge-status ${item.risk.riskLevel === 'HIGH' ? 'badge-risk-high' : 'badge-risk-medium'}">
                            ${item.risk.riskLevel} (${item.risk.probability}%)
                          </span>
                        </td>
                        <td class="py-3 px-3 text-right">
                          <button onclick="window.ReRoute.UI.runAnalysisForTruck('${item.truck.id}')" class="btn-primary px-2.5 py-1 text-xs">
                            <span>Analyze</span>
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>

          <!-- Right Column: Active Assignments & Quick Pipeline -->
          <div class="glass-card p-6 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-base font-bold text-white">Active Backhaul Matches</h2>
                <span class="text-xs font-mono text-cyan-400">${assignments.length} assigned</span>
              </div>

              ${assignments.length === 0 ? `
                <div class="p-6 text-center border border-dashed border-[#1E293B] rounded-xl text-xs text-[#94A3B8] space-y-3">
                  <p>No backhauls assigned yet.</p>
                  <p class="text-[11px] text-[#64748B]">Select an at-risk vehicle to run ReRoute AI and assign an optimal return load.</p>
                  <button onclick="window.ReRoute.store.setActiveScreen('analysis')" class="btn-primary px-3 py-1.5 text-xs">
                    Select Vehicle for Analysis
                  </button>
                </div>
              ` : `
                <div class="space-y-3 max-h-80 overflow-y-auto">
                  ${assignments.map(asg => {
                    const trk = trucks.find(t => t.id === asg.truckId);
                    const shp = shipments.find(s => s.id === asg.shipmentId);
                    return `
                      <div class="p-3 rounded-lg bg-[#0E1626] border border-[#1E293B] hover:border-cyan-500/40 transition">
                        <div class="flex items-center justify-between text-xs">
                          <div class="font-bold text-white font-mono">${asg.truckId} ⇄ ${asg.shipmentId}</div>
                          <span class="text-xs font-bold text-emerald-400 font-mono">${asg.matchScore}% Match</span>
                        </div>
                        <div class="text-[11px] text-[#94A3B8] mt-1">
                          ${shp ? `${shp.pickupLocation} → ${shp.dropLocation}` : 'Route locked'}
                        </div>
                        <div class="flex items-center justify-between text-[10px] text-[#64748B] mt-2 pt-2 border-t border-[#1E293B]">
                          <span>Detour: <strong>${asg.detourKm} km</strong></span>
                          <span class="text-emerald-400 font-semibold">+₹${asg.costGain.toLocaleString()} net</span>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>

            <!-- Quick Action Info Box -->
            <div class="mt-4 p-3 rounded-lg bg-[#0E1626]/80 border border-blue-500/20 text-xs text-[#94A3B8]">
              <div class="font-bold text-white flex items-center gap-1.5 mb-1">
                <svg class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>Automated Workflow</span>
              </div>
              <div>Select any vehicle to predict empty-return risk, match loads, review explainable score contributions, and simulate failure recovery.</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  window.ReRoute = window.ReRoute || {};
  window.ReRoute.Dashboard = { render };
})();
