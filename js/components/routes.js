// ReRoute AI 2.0 - Routes Component
// Section 11 & 21: Schematic SVG Route Visualization
// Computes and renders route topologies directly from real coordinates without external map APIs

(function() {
  function render(container) {
    const store = window.ReRoute.store;
    const state = store.getState();
    const distEngine = window.ReRoute.DistanceEngine;
    const matchingEngine = window.ReRoute.MatchingEngine;

    const trucks = state.trucks || [];
    const shipments = state.shipments || [];

    if (trucks.length === 0) {
      container.innerHTML = `
        <div class="glass-card p-12 text-center max-w-xl mx-auto my-12">
          <h2 class="text-xl font-bold text-white mb-2">No Fleet Data to Visualize</h2>
          <p class="text-xs text-[#94A3B8] mb-4">Add a truck with origin and destination coordinates to view route schematics.</p>
          <button onclick="window.ReRoute.UI.openAddTruckModal()" class="btn-primary px-4 py-2 text-xs font-semibold">
            + Add Truck
          </button>
        </div>
      `;
      return;
    }

    const activeTruck = trucks.find(t => t.id === state.activeTruckId) || trucks[0];

    // Identify candidate shipment to visualize
    let selectedShipment = shipments.find(s => s.id === state.selectedShipmentId);
    if (!selectedShipment && shipments.length > 0) {
      selectedShipment = shipments[0];
      state.selectedShipmentId = selectedShipment.id;
    }

    // Calculate route metrics
    let routeEstimate = null;
    if (distEngine && selectedShipment) {
      routeEstimate = distEngine.calculateRouteEstimate(activeTruck, selectedShipment, state.modelSettings.speedKmH);
    }

    // Geometry mapping onto SVG coordinate space
    // Let's project lat/lng onto a responsive viewBox (e.g. 800 x 420)
    let svgContent = '';
    const points = [];

    if (activeTruck.currentLat && activeTruck.currentLng) {
      points.push({ name: 'Truck Origin', loc: activeTruck.currentLocation, lat: activeTruck.currentLat, lng: activeTruck.currentLng, type: 'origin', color: '#3B82F6' });
    }
    if (activeTruck.destLat && activeTruck.destLng) {
      points.push({ name: 'Truck Dest', loc: activeTruck.destination, lat: activeTruck.destLat, lng: activeTruck.destLng, type: 'dest', color: '#06B6D4' });
    }
    if (selectedShipment && selectedShipment.pickupLat && selectedShipment.pickupLng) {
      points.push({ name: 'Pickup Point', loc: selectedShipment.pickupLocation, lat: selectedShipment.pickupLat, lng: selectedShipment.pickupLng, type: 'pickup', color: '#F59E0B' });
    }
    if (selectedShipment && selectedShipment.dropLat && selectedShipment.dropLng) {
      points.push({ name: 'Drop Point', loc: selectedShipment.dropLocation, lat: selectedShipment.dropLat, lng: selectedShipment.dropLng, type: 'drop', color: '#10B981' });
    }

    if (points.length < 2) {
      svgContent = `
        <text x="400" y="210" fill="#94A3B8" font-size="14" text-anchor="middle">
          Insufficient coordinates to generate schematic route graph.
        </text>
      `;
    } else {
      // Find min/max lat/lng
      let minLat = Math.min(...points.map(p => p.lat));
      let maxLat = Math.max(...points.map(p => p.lat));
      let minLng = Math.min(...points.map(p => p.lng));
      let maxLng = Math.max(...points.map(p => p.lng));

      // Expand margins
      const padLat = Math.max(0.2, (maxLat - minLat) * 0.2);
      const padLng = Math.max(0.2, (maxLng - minLng) * 0.2);
      minLat -= padLat;
      maxLat += padLat;
      minLng -= padLng;
      maxLng += padLng;

      // Project onto SVG canvas (Width 800, Height 420)
      const toSvgX = (lng) => 80 + ((lng - minLng) / (maxLng - minLng)) * 640;
      const toSvgY = (lat) => 360 - ((lat - minLat) / (maxLat - minLat)) * 300;

      const pTruckOrigin = points.find(p => p.type === 'origin');
      const pTruckDest = points.find(p => p.type === 'dest');
      const pPickup = points.find(p => p.type === 'pickup');
      const pDrop = points.find(p => p.type === 'drop');

      let linesSvg = '';

      // 1. Original Inbound Route (Truck Origin -> Truck Dest) [Blue solid line]
      if (pTruckOrigin && pTruckDest) {
        const x1 = toSvgX(pTruckOrigin.lng);
        const y1 = toSvgY(pTruckOrigin.lat);
        const x2 = toSvgX(pTruckDest.lng);
        const y2 = toSvgY(pTruckDest.lat);
        linesSvg += `
          <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3B82F6" stroke-width="3" stroke-dasharray="8 4" opacity="0.6"/>
          <!-- Arrow marker / midpoint label -->
          <circle cx="${(x1+x2)/2}" cy="${(y1+y2)/2}" r="3" fill="#3B82F6"/>
        `;
      }

      // 2. Deadhead Detour leg (Truck Dest -> Shipment Pickup) [Amber dashed line]
      if (pTruckDest && pPickup) {
        const x1 = toSvgX(pTruckDest.lng);
        const y1 = toSvgY(pTruckDest.lat);
        const x2 = toSvgX(pPickup.lng);
        const y2 = toSvgY(pPickup.lat);
        linesSvg += `
          <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#F59E0B" stroke-width="2.5" stroke-dasharray="5 3" class="route-dash-animated"/>
          <text x="${(x1+x2)/2}" y="${(y1+y2)/2 - 8}" fill="#F59E0B" font-size="11" font-family="monospace" text-anchor="middle" font-weight="bold">
            Deadhead: ${routeEstimate?.pickupDeadheadKm || 0} km
          </text>
        `;
      }

      // 3. Loaded Backhaul leg (Shipment Pickup -> Shipment Drop) [Emerald solid line]
      if (pPickup && pDrop) {
        const x1 = toSvgX(pPickup.lng);
        const y1 = toSvgY(pPickup.lat);
        const x2 = toSvgX(pDrop.lng);
        const y2 = toSvgY(pDrop.lat);
        linesSvg += `
          <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#10B981" stroke-width="4"/>
          <text x="${(x1+x2)/2}" y="${(y1+y2)/2 - 10}" fill="#10B981" font-size="12" font-family="monospace" text-anchor="middle" font-weight="bold">
            Loaded Backhaul: ${routeEstimate?.loadedBackhaulKm || 0} km
          </text>
        `;
      }

      // 4. Return to base from drop (Shipment Drop -> Truck Origin) [Cyan line]
      if (pDrop && pTruckOrigin) {
        const x1 = toSvgX(pDrop.lng);
        const y1 = toSvgY(pDrop.lat);
        const x2 = toSvgX(pTruckOrigin.lng);
        const y2 = toSvgY(pTruckOrigin.lat);
        linesSvg += `
          <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#06B6D4" stroke-width="2" stroke-dasharray="4 4" opacity="0.5"/>
        `;
      }

      // Render pins and labels
      const pinsSvg = points.map(p => {
        const cx = toSvgX(p.lng);
        const cy = toSvgY(p.lat);
        return `
          <g transform="translate(${cx}, ${cy})">
            <!-- Pulsing outer ring -->
            <circle cx="0" cy="0" r="14" fill="${p.color}" opacity="0.2" class="animate-ping"/>
            <circle cx="0" cy="0" r="8" fill="#0B1220" stroke="${p.color}" stroke-width="3"/>
            <!-- Text badge -->
            <rect x="-60" y="-34" width="120" height="20" rx="4" fill="#111827" stroke="${p.color}" stroke-width="1" opacity="0.95"/>
            <text x="0" y="-20" fill="#FFFFFF" font-size="10" font-weight="bold" text-anchor="middle" font-family="sans-serif">
              ${p.name}
            </text>
            <text x="0" y="24" fill="#94A3B8" font-size="10" text-anchor="middle" font-family="monospace">
              ${p.loc}
            </text>
          </g>
        `;
      }).join('');

      svgContent = linesSvg + pinsSvg;
    }

    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn max-w-5xl mx-auto">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-extrabold text-white tracking-tight">Schematic Route Geometry</h1>
              <span class="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Prototype Route Estimate
              </span>
            </div>
            <p class="text-xs text-[#94A3B8] mt-1">
              Topological Haversine projection of inbound leg, pickup detour, and productive backhaul return.
            </p>
          </div>

          <!-- Selectors -->
          <div class="flex flex-wrap items-center gap-2">
            <select 
              class="bg-[#111827] text-white text-xs font-bold rounded-lg px-2.5 py-1.5 border border-[#334155] focus:border-cyan-500 outline-none cursor-pointer"
              onchange="window.ReRoute.Routes.selectTruck(this.value)"
            >
              ${trucks.map(t => `
                <option value="${t.id}" ${t.id === activeTruck.id ? 'selected' : ''}>
                  Vehicle: ${t.id} (${t.destination})
                </option>
              `).join('')}
            </select>

            <select 
              class="bg-[#111827] text-white text-xs font-bold rounded-lg px-2.5 py-1.5 border border-[#334155] focus:border-cyan-500 outline-none cursor-pointer"
              onchange="window.ReRoute.Routes.selectShipment(this.value)"
            >
              ${shipments.map(s => `
                <option value="${s.id}" ${selectedShipment && s.id === selectedShipment.id ? 'selected' : ''}>
                  Load: ${s.id} (${s.dropLocation})
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Metric Telemetry Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="glass-card p-4 border-l-4 border-l-blue-500">
            <div class="text-[10px] text-[#64748B] uppercase font-bold">Inbound Leg</div>
            <div class="text-xl font-black text-white font-mono mt-1">
              ${routeEstimate?.originalLegKm || 0} km
            </div>
            <div class="text-[10px] text-[#94A3B8]">Direct truck route</div>
          </div>

          <div class="glass-card p-4 border-l-4 border-l-amber-500">
            <div class="text-[10px] text-[#64748B] uppercase font-bold">Pickup Deadhead</div>
            <div class="text-xl font-black text-amber-400 font-mono mt-1">
              ${routeEstimate?.pickupDeadheadKm || 0} km
            </div>
            <div class="text-[10px] text-[#94A3B8]">Dest → Pickup distance</div>
          </div>

          <div class="glass-card p-4 border-l-4 border-l-emerald-500">
            <div class="text-[10px] text-[#64748B] uppercase font-bold">Productive Backhaul</div>
            <div class="text-xl font-black text-emerald-400 font-mono mt-1">
              ${routeEstimate?.loadedBackhaulKm || 0} km
            </div>
            <div class="text-[10px] text-[#94A3B8]">Loaded revenue haul</div>
          </div>

          <div class="glass-card p-4 border-l-4 border-l-purple-500">
            <div class="text-[10px] text-[#64748B] uppercase font-bold">Estimated Travel Time</div>
            <div class="text-xl font-black text-white font-mono mt-1">
              ${routeEstimate ? Math.floor(routeEstimate.totalTimeMinutes / 60) + 'h ' + (routeEstimate.totalTimeMinutes % 60) + 'm' : '—'}
            </div>
            <div class="text-[10px] text-[#94A3B8]">At ${state.modelSettings.speedKmH} km/h speed</div>
          </div>
        </div>

        <!-- SVG Visualizer Canvas -->
        <div class="glass-card p-6 overflow-hidden relative border border-[#1E293B]">
          <div class="flex items-center justify-between text-xs mb-3 text-[#94A3B8]">
            <div class="flex items-center gap-4">
              <span class="flex items-center gap-1.5"><span class="w-3 h-0.5 bg-blue-500 inline-block"></span> Inbound Route</span>
              <span class="flex items-center gap-1.5"><span class="w-3 h-0.5 bg-amber-500 inline-block border-dashed"></span> Deadhead Detour</span>
              <span class="flex items-center gap-1.5"><span class="w-3 h-0.5 bg-emerald-500 inline-block"></span> Loaded Backhaul</span>
              <span class="flex items-center gap-1.5"><span class="w-3 h-0.5 bg-cyan-500 inline-block border-dashed"></span> Return Leg</span>
            </div>
            <span class="text-[10px] font-mono text-[#64748B]">Non-geospatial schematic projection</span>
          </div>

          <!-- SVG Canvas with grid styling -->
          <div class="w-full bg-[#070D18] rounded-xl border border-[#1E293B] overflow-hidden flex items-center justify-center p-2">
            <svg viewBox="0 0 800 420" class="w-full h-auto max-h-[460px]">
              <!-- Grid background -->
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" stroke-width="0.7" opacity="0.4"/>
                </pattern>
              </defs>
              <rect width="800" height="420" fill="url(#grid)" />

              <!-- Rendered dynamic lines & nodes -->
              ${svgContent}
            </svg>
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

  function selectShipment(shipmentId) {
    const store = window.ReRoute.store;
    store.setSelectedShipment(shipmentId);
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  window.ReRoute = window.ReRoute || {};
  window.ReRoute.Routes = { render, selectTruck, selectShipment };
})();
