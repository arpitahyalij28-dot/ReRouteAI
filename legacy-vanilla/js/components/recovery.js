// ReRoute AI 2.0 - Recovery Simulation Component
// Section 17: Autonomous Failure Recovery & Live Rescheduling
// Demonstrates dynamic resilience when a booked backhaul fails or is cancelled

(function() {
  let isSimulating = false;
  let currentStageIndex = -1;
  let recoveryResult = null;

  const STAGES = [
    { title: "PLAN INTERRUPTED", desc: "Shipment cancellation or loading failure detected." },
    { title: "RE-EVALUATING", desc: "Invalidating assignment and releasing corridor lock." },
    { title: "CHECKING AVAILABLE SHIPMENTS", desc: "Scanning remaining active freight demand in route sector." },
    { title: "RECALCULATING", desc: "Recomputing ETA, detour, capacity, and emission metrics." },
    { title: "NEW MATCH FOUND", desc: "Optimal backup backhaul identified from remaining pool." }
  ];

  function render(container) {
    const store = window.ReRoute.store;
    const state = store.getState();
    const assignments = state.assignments || [];
    const trucks = state.trucks || [];
    const shipments = state.shipments || [];

    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn max-w-5xl mx-auto">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-extrabold text-white tracking-tight">Autonomous Disruption Recovery</h1>
              <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Self-Healing Logistics Engine
              </span>
            </div>
            <p class="text-xs text-[#94A3B8] mt-1">
              Simulate real-world shipment failures (shipper cancellation, dock rejection) and verify instantaneous dynamic re-optimization.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs text-[#64748B] font-mono">Assigned Loads: <strong>${assignments.length}</strong></span>
          </div>
        </div>

        <!-- 1. Active Assigned Shipments Panel -->
        <div class="glass-card p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-base font-bold text-white">Active Backhaul Assignments</h2>
              <div class="text-xs text-[#94A3B8]">Select an assigned shipment below to simulate a cancellation failure event:</div>
            </div>
          </div>

          ${assignments.length === 0 ? `
            <div class="p-8 text-center border border-dashed border-[#1E293B] rounded-xl text-xs text-[#94A3B8] space-y-3">
              <div class="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <p class="text-white font-semibold">No active assignments to cancel or recover.</p>
              <p class="text-[#64748B]">Assign a backhaul to a vehicle in the AI Matching screen first, then return here to test failure recovery.</p>
              <button onclick="window.ReRoute.store.setActiveScreen('matching')" class="btn-primary px-4 py-2 text-xs font-semibold">
                Go to AI Matching
              </button>
            </div>
          ` : `
            <div class="space-y-3">
              ${assignments.map(asg => {
                const trk = trucks.find(t => t.id === asg.truckId);
                const shp = shipments.find(s => s.id === asg.shipmentId);

                return `
                  <div class="p-4 rounded-xl bg-[#0E1626] border border-[#1E293B] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-bold text-white font-mono text-sm">${asg.id}</span>
                        <span class="badge-status bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">LOCKED ASSIGNMENT</span>
                        <span class="text-xs font-mono text-emerald-400 font-bold">${asg.matchScore}% Score</span>
                      </div>
                      <div class="text-xs text-[#94A3B8]">
                        Vehicle: <strong class="text-white font-mono">${asg.truckId}</strong> (${trk ? trk.destination : 'N/A'})
                        ⇄ Shipment: <strong class="text-white font-mono">${asg.shipmentId}</strong> (${shp ? `${shp.pickupLocation} → ${shp.dropLocation}` : 'N/A'})
                      </div>
                      <div class="text-[11px] text-[#64748B] font-mono mt-1">
                        Detour: ${asg.detourKm} km • Revenue Gain: ₹${asg.costGain?.toLocaleString() || 0}
                      </div>
                    </div>

                    <div class="flex items-center gap-2 flex-shrink-0">
                      <button 
                        onclick="window.ReRoute.Recovery.simulateFailure('${asg.truckId}', '${asg.shipmentId}')" 
                        class="btn-danger px-4 py-2 text-xs font-bold shadow"
                        ${isSimulating ? 'disabled' : ''}
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        <span>Cancel Selected Shipment</span>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- 2. ANIMATED RECOVERY STEPPER (Displayed during / after simulation) -->
        <div id="recovery-pipeline-panel" class="${isSimulating || recoveryResult ? 'block' : 'hidden'} glass-card p-6 border-amber-500/40 glow-cyan">
          <div class="flex items-center justify-between mb-4 pb-3 border-b border-[#1E293B]">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full ${isSimulating ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}"></span>
              <h2 class="text-base font-bold text-white">Autonomous Dynamic Recovery Pipeline</h2>
            </div>
            <span class="text-xs font-mono text-cyan-300">
              ${isSimulating ? 'Processing...' : 'Recovery Complete'}
            </span>
          </div>

          <!-- Stepper Graphic: 5 stages -->
          <div class="grid grid-cols-1 md:grid-cols-5 gap-2 my-4">
            ${STAGES.map((st, idx) => {
              const isPast = currentStageIndex > idx;
              const isCurrent = currentStageIndex === idx;
              let stepClass = "border-[#1E293B] bg-[#0E1626]/50 text-[#64748B]";
              if (isPast) stepClass = "border-emerald-500/50 bg-emerald-950/20 text-emerald-300";
              if (isCurrent) stepClass = "border-amber-500 bg-amber-950/30 text-amber-300 animate-pulse";

              return `
                <div class="p-3 rounded-lg border ${stepClass} transition-all text-xs">
                  <div class="font-mono text-[10px] font-bold mb-1">STAGE 0${idx + 1}</div>
                  <div class="font-bold text-[11px] mb-1">${st.title}</div>
                  <div class="text-[10px] leading-tight opacity-80">${st.desc}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 3. NEW RECOMMENDED BACKHAUL CARD -->
        ${recoveryResult ? `
          <div class="glass-card p-6 border-l-4 border-l-emerald-500 animate-fadeIn">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="badge-status bg-emerald-500 text-black font-extrabold shadow">
                  ★ NEW RECOMMENDED BACKHAUL
                </span>
                <span class="text-xs text-[#94A3B8]">
                  Dynamically selected from remaining <strong>${recoveryResult.remainingCount}</strong> available shipments.
                </span>
              </div>
              <span class="text-xs font-mono text-cyan-400">Zero Manual Intervention</span>
            </div>

            ${recoveryResult.newRecommendation ? `
              <div class="p-4 rounded-xl bg-[#0E1626] border border-[#1E293B] mt-3">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-lg font-black text-white font-mono">${recoveryResult.newRecommendation.shipment.id}</span>
                      <span class="badge-status badge-risk-low">FEASIBLE</span>
                      <span class="text-xs font-mono text-emerald-400 font-bold">
                        ${recoveryResult.newRecommendation.matchScore}% Match
                      </span>
                    </div>
                    <div class="text-sm font-semibold text-white">
                      ${recoveryResult.newRecommendation.shipment.pickupLocation} 
                      <span class="text-cyan-400">→</span> 
                      ${recoveryResult.newRecommendation.shipment.dropLocation}
                    </div>
                    <div class="flex flex-wrap items-center gap-3 text-xs text-[#94A3B8] font-mono mt-2">
                      <span>Payload: <strong>${recoveryResult.newRecommendation.shipment.cargoWeight} kg</strong></span>
                      <span>•</span>
                      <span>Detour: <strong>${recoveryResult.newRecommendation.detourKm} km</strong></span>
                      <span>•</span>
                      <span>Net Gain: <strong class="text-emerald-400">₹${recoveryResult.newRecommendation.sustainability?.netEconomicGain?.toLocaleString() || 0}</strong></span>
                      <span>•</span>
                      <span>CO₂ Saved: <strong class="text-emerald-400">${recoveryResult.newRecommendation.estimatedCo2} kg</strong></span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <button 
                      onclick="window.ReRoute.Matching.acceptMatch('${recoveryResult.truck.id}', '${recoveryResult.newRecommendation.shipment.id}')" 
                      class="btn-primary px-5 py-2.5 text-xs font-bold shadow-lg"
                    >
                      Accept New Match
                    </button>
                    <button 
                      onclick="window.ReRoute.Matching.explainMatch('${recoveryResult.newRecommendation.shipment.id}')" 
                      class="btn-outline px-3.5 py-2.5 text-xs text-cyan-300 border-cyan-500/30"
                    >
                      Explain
                    </button>
                  </div>
                </div>
              </div>
            ` : `
              <div class="p-6 text-center border border-dashed border-red-500/30 rounded-xl text-xs text-red-300 bg-red-950/20">
                <p class="font-bold text-sm mb-1">No Alternate Feasible Backhaul Found</p>
                <p class="text-[#94A3B8]">All remaining candidate shipments exceeded vehicle capacity, had incompatible time windows, or excessive detour.</p>
                <p class="text-[#64748B] mt-2">Recommend direct unladen return or repositioning vehicle to high-demand logistics terminal.</p>
              </div>
            `}
          </div>
        ` : ''}
      </div>
    `;
  }

  async function simulateFailure(truckId, shipmentId) {
    const store = window.ReRoute.store;
    const container = document.getElementById('main-content');
    const state = store.getState();
    const truck = state.trucks.find(t => t.id === truckId);

    isSimulating = true;
    currentStageIndex = 0;
    recoveryResult = null;

    // 1. Mark shipment cancelled in store & remove assignment
    store.cancelShipment(shipmentId);

    // 2. Animate the 5 recovery stages
    for (let i = 0; i < STAGES.length; i++) {
      currentStageIndex = i;
      render(container);
      await new Promise(r => setTimeout(r, 450));
    }

    // 3. Re-evaluate remaining available shipments using actual store state
    const remainingAvailable = store.getState().shipments.filter(s => s.status === 'Available');
    const newEvaluations = window.ReRoute.MatchingEngine.evaluateShipments(truck, remainingAvailable, state.modelSettings);
    const newRec = newEvaluations.find(item => item.isFeasible) || null;

    recoveryResult = {
      truck,
      cancelledShipmentId: shipmentId,
      remainingCount: remainingAvailable.length,
      newRecommendation: newRec
    };

    isSimulating = false;
    currentStageIndex = 5;
    render(container);
  }

  window.ReRoute = window.ReRoute || {};
  window.ReRoute.Recovery = { render, simulateFailure };
})();
