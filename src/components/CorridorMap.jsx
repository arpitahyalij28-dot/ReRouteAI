import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Compass } from 'lucide-react';
import { CORRIDOR_WAYPOINTS } from '../data/mockData';

export default function CorridorMap({
  truck,
  shipments,
  selectedShipmentId,
  recommendedId,
  onSelectShipmentId,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  const initialBoundsCoords = [
    [19.9975, 73.7898],
    [19.6967, 73.5594],
    [19.645, 73.485],
    [19.2967, 73.0631],
    [19.2083, 72.9681],
    [19.055, 73.02],
    [18.995, 72.865],
  ];

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const bounds = L.latLngBounds(initialBoundsCoords);
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
      maxZoom: 19,
    });

    map.fitBounds(bounds, { padding: [35, 35] });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    const timeout = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.fitBounds(bounds, { padding: [35, 35] });
      }
    }, 250);

    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Dynamic Layers & Polylines
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;
    const layers = layerGroupRef.current;
    layers.clearLayers();

    // 1. Draw Nominal Highway Corridor (NH 160)
    const nominalHighwayPath = [
      [19.9975, 73.7898],
      [19.6967, 73.5594],
      [19.645, 73.485],
      [19.2967, 73.0631],
    ];
    L.polyline(nominalHighwayPath, {
      color: '#94A3B8',
      weight: 3,
      dashArray: '4, 6',
      opacity: 0.7,
    }).addTo(layers);

    // 2. Draw Return Vectors for Available Shipments
    shipments.forEach((s) => {
      const isSelected = s.id === selectedShipmentId;
      const isRecommended = s.id === recommendedId;
      if (s.isCancelled) return;

      let routeCoords = [];
      if (s.id === 'S1') {
        routeCoords = [
          s.originCoords,
          [19.2967, 73.0631],
          [19.645, 73.485],
          [19.6967, 73.5594],
          s.destCoords,
        ];
      } else if (s.id === 'S2') {
        routeCoords = [
          s.originCoords,
          [19.2967, 73.0631],
          [19.645, 73.485],
          s.destCoords,
        ];
      } else if (s.id === 'S3') {
        routeCoords = [s.originCoords, [19.645, 73.485], s.destCoords];
      } else if (s.id === 'S4') {
        routeCoords = [
          s.originCoords,
          [19.2083, 72.9681],
          [19.645, 73.485],
          s.destCoords,
        ];
      }

      if (isSelected || isRecommended) {
        // Glowing halo line
        L.polyline(routeCoords, {
          color: '#2563EB',
          weight: 6,
          opacity: 0.25,
        }).addTo(layers);
        // Main active route line
        L.polyline(routeCoords, {
          color: '#2563EB',
          weight: 4,
          opacity: 0.95,
        })
          .addTo(layers)
          .on('click', () => onSelectShipmentId(s.id));
      } else {
        // Inactive alternative dashed line
        L.polyline(routeCoords, {
          color: '#94A3B8',
          weight: 2.5,
          dashArray: '6, 8',
          opacity: 0.75,
        })
          .addTo(layers)
          .on('click', () => onSelectShipmentId(s.id));
      }
    });

    // 3. Draw City Pins and Tooltips
    CORRIDOR_WAYPOINTS.forEach((node) => {
      const cityKey = node.id === 'navimumbai' ? 'Navi Mumbai' : node.name.split(' ')[0];
      const isOriginNode = shipments.some(
        (s) => s.id === selectedShipmentId && s.origin.toLowerCase().includes(cityKey.toLowerCase())
      );
      const isDestNode = shipments.some(
        (s) => s.id === selectedShipmentId && s.destination.toLowerCase().includes(cityKey.toLowerCase())
      );
      const isActiveNode = isOriginNode || isDestNode;

      let pinColor = '#2563EB';
      if (isOriginNode) pinColor = '#2563EB';
      else if (isDestNode) pinColor = '#059669';

      const pinIcon = L.divIcon({
        className: 'custom-city-pin',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
            <div class="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md flex items-center justify-center" style="background-color: ${pinColor};">
              <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
          </div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker(node.coords, { icon: pinIcon }).addTo(layers);
      marker.bindTooltip(cityKey, {
        permanent: true,
        direction: 'top',
        offset: [0, -8],
        className: `map-city-pill ${isActiveNode ? 'active-node' : ''}`,
      });
      marker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; font-size: 11px;">
          <strong style="color: #0F172A; display: block; margin-bottom: 2px;">${node.name}</strong>
          <span style="color: #64748B;">Corridor Waypoint</span>
        </div>
      `);
    });

    // 4. Draw Live Animated Truck Marker (Kasara Ghat Descent)
    const truckIcon = L.divIcon({
      className: 'custom-truck-marker',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <!-- Pulse radar ring -->
          <div class="absolute w-10 h-10 rounded-full bg-blue-500/25 animate-ping"></div>
          <div class="relative w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-blue-500/50">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
          </div>
          <!-- Truck label badge -->
          <div class="absolute -bottom-5 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-bold whitespace-nowrap shadow-md">
            T101 (${truck.speedKmH} km/h)
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    L.marker(truck.currentCoords, { icon: truckIcon })
      .addTo(layers)
      .bindPopup(`
        <div style="font-family: 'Inter', sans-serif; font-size: 11px;">
          <strong style="color: #0F172A;">Truck T101 (${truck.regNumber})</strong><br/>
          <span style="color: #64748B;">GPS: NH 160 near Kasara Ghat</span><br/>
          <span style="color: #2563EB; font-weight: 600;">Speed: ${truck.speedKmH} km/h | ETA Bhiwandi: 14:15</span>
        </div>
      `);
  }, [truck, shipments, selectedShipmentId, recommendedId, onSelectShipmentId]);

  return (
    <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft overflow-hidden relative">
      {/* Top Map Header */}
      <div className="px-4 py-2.5 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-[#0F172A]">
            Western Freight Corridor Geo-Spatial Map (NH 160)
          </span>
          <span className="text-[10px] text-[#64748B] hidden sm:inline">
            • Mumbai Metropolitan Region ↔ Nashik Industrial Belt
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[11px] text-[#64748B]">Active Path:</span>
          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[10px]">
            {selectedShipmentId ? `${selectedShipmentId} Corridor` : 'Nominal Track'}
          </span>
        </div>
      </div>

      {/* Map DOM Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-[360px] min-h-[360px] bg-slate-100 relative z-10"
        style={{ height: '360px' }}
      />

      {/* Floating Legend */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-sm border border-[#E2E8F0] p-2.5 rounded-lg text-[10px] shadow-sm space-y-1.5 max-w-[260px]">
        <div className="font-bold text-[#0F172A] flex items-center gap-1">
          <Compass className="w-3 h-3 text-blue-600" />
          <span>Interactive Corridor Legend</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-1 bg-[#2563EB] rounded" />
          <span className="text-[#0F172A] font-medium">Selected / Recommended Backhaul</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 border-t border-dashed border-slate-400" />
          <span className="text-[#64748B]">Alternative Backhaul Candidates</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-white" />
          <span className="text-[#64748B]">Live Vehicle T101 (Descent to Bhiwandi)</span>
        </div>
      </div>
    </div>
  );
}
