// ReRoute AI 2.0 - Geo-Spatial Corridor Map Component
// Interactive Leaflet map displaying live vehicle radar and candidate backhaul vectors.
// 100% data-driven: renders any truck and candidate shipments without hardcoded identifiers.

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Compass, ShieldAlert, Sparkles } from 'lucide-react';
import { CORRIDOR_WAYPOINTS } from '../data/mockData';

export default function CorridorMap({
  truck,
  shipments = [],
  selectedShipmentId,
  recommendedId,
  onSelectShipmentId,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const [isUsingApproximateRoutes, setIsUsingApproximateRoutes] = useState(false);

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const defaultCenter = truck?.currentCoords || [19.5, 73.3];
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
      maxZoom: 18,
    });

    map.setView(defaultCenter, 9);

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
  }, [truck?.currentCoords]);

  // Update Dynamic Layers & Polylines
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current || !truck) return;
    const layers = layerGroupRef.current;
    layers.clearLayers();

    const boundsPoints = [];
    if (truck.currentCoords) boundsPoints.push(truck.currentCoords);
    if (truck.destinationCoords) boundsPoints.push(truck.destinationCoords);
    if (truck.originCoords) boundsPoints.push(truck.originCoords);

    // 1. Draw Nominal Truck Transit Corridor (Origin -> Current -> Destination)
    const nominalPath = [
      truck.originCoords || [19.9575, 73.742],
      truck.currentCoords || [19.645, 73.485],
      truck.destinationCoords || [19.2967, 73.0631],
    ];

    L.polyline(nominalPath, {
      color: '#64748B',
      weight: 3,
      dashArray: '5, 8',
      opacity: 0.65,
    }).addTo(layers);

    // 2. Draw Return Vectors for Available Shipments
    const activeCandidates = shipments.filter((s) => !s.isCancelled);

    activeCandidates.forEach((s) => {
      const isSelected = s.id === selectedShipmentId;
      const isRecommended = s.id === recommendedId;

      const pickCoords = s.originCoords || [s.pickupLat, s.pickupLng];
      const dropCoords = s.destCoords || [s.dropLat, s.dropLng];

      if (!pickCoords || !dropCoords) return;
      boundsPoints.push(pickCoords, dropCoords);

      // Intermediate corridor waypoints for realistic highway routing
      const intermediate = [
        truck.destinationCoords || [19.2967, 73.0631],
        pickCoords,
        dropCoords,
      ];

      if (isSelected || isRecommended) {
        // Glowing halo line
        L.polyline(intermediate, {
          color: isRecommended ? '#059669' : '#2563EB',
          weight: 7,
          opacity: 0.25,
        }).addTo(layers);

        // Main active route line
        L.polyline(intermediate, {
          color: isRecommended ? '#059669' : '#2563EB',
          weight: 4,
          opacity: 0.95,
        })
          .addTo(layers)
          .on('click', () => onSelectShipmentId(s.id));
      } else {
        // Alternative dashed line
        L.polyline(intermediate, {
          color: '#94A3B8',
          weight: 2,
          dashArray: '4, 6',
          opacity: 0.7,
        })
          .addTo(layers)
          .on('click', () => onSelectShipmentId(s.id));
      }

      // Draw pickup marker pin
      const pickupIcon = L.divIcon({
        className: 'custom-pickup-pin',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer">
            <div class="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md flex items-center justify-center ${
              isSelected ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-slate-700'
            }">
              <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
            <div class="absolute -top-4 px-1 py-0.2 bg-white/90 text-[8px] font-bold rounded shadow-sm whitespace-nowrap">
              ${s.id}
            </div>
          </div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      L.marker(pickCoords, { icon: pickupIcon })
        .addTo(layers)
        .on('click', () => onSelectShipmentId(s.id))
        .bindPopup(`
          <div style="font-family: 'Inter', sans-serif; font-size: 11px;">
            <strong style="color: #0F172A; display: block;">${s.id}: ${s.name}</strong>
            <span style="color: #64748B;">Pickup: ${s.origin}</span><br/>
            <span style="color: #64748B;">Drop: ${s.destination}</span><br/>
            <span style="color: #2563EB; font-weight: 600;">Payload: ${s.weightTons}t | Gross: ₹${(s.freightOfferInr || s.value || 0).toLocaleString('en-IN')}</span>
          </div>
        `);
    });

    // 3. Draw Corridor Waypoints
    CORRIDOR_WAYPOINTS.forEach((node) => {
      const pinIcon = L.divIcon({
        className: 'custom-city-pin',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
            <div class="w-2.5 h-2.5 rounded-full border border-white shadow-sm bg-slate-400">
            </div>
          </div>
        `,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });

      L.marker(node.coords, { icon: pinIcon })
        .addTo(layers)
        .bindTooltip(node.name.split(' ')[0], {
          permanent: false,
          direction: 'top',
          offset: [0, -6],
          className: 'map-city-pill',
        });
    });

    // 4. Draw Animated Active Truck Marker
    if (truck.currentCoords) {
      const truckIcon = L.divIcon({
        className: 'custom-truck-marker',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
            <div class="absolute w-10 h-10 rounded-full bg-blue-500/25 animate-ping"></div>
            <div class="relative w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-blue-500/50">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <div class="absolute -bottom-5 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-bold whitespace-nowrap shadow-md">
              ${truck.id} (${truck.speedKmH || 50} km/h)
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
            <strong style="color: #0F172A;">Vehicle ${truck.id} (${truck.regNumber})</strong><br/>
            <span style="color: #64748B;">GPS: ${truck.currentLocationName || 'Corridor Transit'}</span><br/>
            <span style="color: #2563EB; font-weight: 600;">ETA ${truck.destination?.split(' ')[0] || 'Dest'}: ${truck.expectedDeliveryTime}</span>
          </div>
        `);
    }

    if (boundsPoints.length > 1) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(boundsPoints), {
        padding: [40, 40],
        maxZoom: 11,
      });
    }
  }, [truck, shipments, selectedShipmentId, recommendedId, onSelectShipmentId]);

  return (
    <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft overflow-hidden relative">
      {/* Top Map Header */}
      <div className="px-4 py-2.5 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-[#0F172A]">
            Western Freight Corridor Geo-Spatial Map
          </span>
          <span className="text-[10px] text-[#64748B] hidden sm:inline">
            • {truck?.origin?.split(' ')[0] || 'Origin'} ↔ {truck?.destination?.split(' ')[0] || 'Dest'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[11px] text-[#64748B]">Active Track:</span>
          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[10px] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span>{selectedShipmentId ? `${selectedShipmentId} Vector` : 'Nominal Leg'}</span>
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
      <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-sm border border-[#E2E8F0] p-2.5 rounded-lg text-[10px] shadow-sm space-y-1.5 max-w-[280px]">
        <div className="font-bold text-[#0F172A] flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Compass className="w-3 h-3 text-blue-600" />
            <span>Corridor Spatial Legend</span>
          </div>
          <span className="text-[9px] px-1 py-0.2 bg-emerald-50 text-[#059669] font-medium rounded border border-emerald-200">
            Live Radar
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-1 bg-[#059669] rounded" />
          <span className="text-[#0F172A] font-medium">Recommended Backhaul Vector</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-1 bg-[#2563EB] rounded" />
          <span className="text-[#0F172A] font-medium">Selected Backhaul Path</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 border-t border-dashed border-slate-400" />
          <span className="text-[#64748B]">Candidate Freight Demand Pool</span>
        </div>
      </div>
    </div>
  );
}
