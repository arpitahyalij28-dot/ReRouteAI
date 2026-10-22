import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, ShieldAlert, Sparkles, Navigation, Layers, Eye, EyeOff } from 'lucide-react';
import { CORRIDOR_WAYPOINTS } from '../data/mockData';
import { apiFetch } from '../lib/api';

export default function CorridorMap({
  truck,
  trucks = [],
  shipments = [],
  selectedShipmentId,
  recommendedId,
  onSelectShipmentId,
  onSelectTruckId,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const [showAllTrucks, setShowAllTrucks] = useState(true);
  const [isUsingApproximateRoutes, setIsUsingApproximateRoutes] = useState(false);
  const [isTilesOffline, setIsTilesOffline] = useState(false);
  const [realRouteCoords, setRealRouteCoords] = useState(null);
  const routeCacheRef = useRef(new Map());

  // Fetch real road polyline from /api/route for the active focus shipment
  useEffect(() => {
    const focusId = selectedShipmentId || recommendedId;
    const focusShipment = shipments.find((s) => s.id === focusId);
    if (!truck?.currentLat || !focusShipment) return;

    const pickLat = focusShipment.originCoords?.[0] || focusShipment.pickupLat;
    const pickLng = focusShipment.originCoords?.[1] || focusShipment.pickupLng;
    const dropLat = focusShipment.destCoords?.[0] || focusShipment.dropLat;
    const dropLng = focusShipment.destCoords?.[1] || focusShipment.dropLng;

    if (!pickLat || !dropLat) return;

    const cacheKey = `${truck.currentLat.toFixed(3)},${truck.currentLng.toFixed(3)}-${pickLat.toFixed(3)},${pickLng.toFixed(3)}-${dropLat.toFixed(3)},${dropLng.toFixed(3)}`;

    if (routeCacheRef.current.has(cacheKey)) {
      setRealRouteCoords(routeCacheRef.current.get(cacheKey));
      setIsUsingApproximateRoutes(false);
      return;
    }

    let isMounted = true;
    async function fetchRoadRoute() {
      const res = await apiFetch(
        `/api/route?originLat=${truck.currentLat}&originLng=${truck.currentLng}&destLat=${dropLat}&destLng=${dropLng}`
      );

      if (!isMounted) return;

      if (res?.coordinates && Array.isArray(res.coordinates) && res.coordinates.length > 2) {
        routeCacheRef.current.set(cacheKey, res.coordinates);
        setRealRouteCoords(res.coordinates);
        setIsUsingApproximateRoutes(false);
      } else {
        setRealRouteCoords(null);
        setIsUsingApproximateRoutes(true);
      }
    }

    fetchRoadRoute();

    return () => {
      isMounted = false;
    };
  }, [truck?.currentLat, truck?.currentLng, selectedShipmentId, recommendedId, shipments]);

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

    const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    });
    tileLayer.on('tileerror', () => {
      setIsTilesOffline(true);
    });
    tileLayer.addTo(map);

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
    if (!mapInstanceRef.current || !layerGroupRef.current) return;
    const layers = layerGroupRef.current;
    layers.clearLayers();

    const activeTruckList = showAllTrucks && trucks.length > 0 ? trucks : truck ? [truck] : [];

    if (activeTruckList.length === 0 && shipments.length === 0) {
      mapInstanceRef.current.setView([19.5, 73.3], 7);
      return;
    }

    const boundsPoints = [];

    // Helper: color by risk
    const getRiskColor = (prob) => {
      const p = Number(prob) || 0;
      if (p > 60) return '#EF4444'; // Red
      if (p >= 40) return '#F59E0B'; // Amber
      return '#10B981'; // Green
    };

    // 1. Draw Routes for Trucks
    activeTruckList.forEach((t) => {
      const isSelectedTruck = truck && t.id === truck.id;
      const riskColor = getRiskColor(t.emptyReturnProbability);

      if (t.currentCoords) boundsPoints.push(t.currentCoords);
      if (t.originCoords) boundsPoints.push(t.originCoords);
      if (t.destinationCoords) boundsPoints.push(t.destinationCoords);

      const nominalPath = [
        t.originCoords || [19.9575, 73.742],
        t.currentCoords || [19.645, 73.485],
        t.destinationCoords || [19.2967, 73.0631],
      ];

      if (isSelectedTruck) {
        // Glowing halo line for active truck
        L.polyline(nominalPath, {
          color: '#2563EB',
          weight: 6,
          opacity: 0.25,
        }).addTo(layers);

        // Solid primary route line
        L.polyline(nominalPath, {
          color: '#2563EB',
          weight: 3.5,
          opacity: 0.9,
        }).addTo(layers);
      } else {
        // Faded corridor line for other fleet trucks
        L.polyline(nominalPath, {
          color: riskColor,
          weight: 2,
          dashArray: '4, 6',
          opacity: 0.45,
        }).addTo(layers);
      }
    });

    // 2. Draw Candidate Shipment Backhaul Vectors (for active truck)
    const activeCandidates = shipments.filter((s) => !s.isCancelled);

    activeCandidates.forEach((s) => {
      const isSelected = s.id === selectedShipmentId;
      const isRecommended = s.id === recommendedId;

      const pickCoords = s.originCoords || (s.pickupLat ? [s.pickupLat, s.pickupLng] : null);
      const dropCoords = s.destCoords || (s.dropLat ? [s.dropLat, s.dropLng] : null);

      if (!pickCoords || !dropCoords) return;
      boundsPoints.push(pickCoords);

      if (truck) {
        const intermediate = [
          truck.destinationCoords || [19.2967, 73.0631],
          pickCoords,
          dropCoords,
        ];

        const isFocused = isSelected || isRecommended;
        const pathToDraw = isFocused && realRouteCoords ? realRouteCoords : intermediate;

        if (isFocused) {
          L.polyline(pathToDraw, {
            color: isRecommended ? '#059669' : '#2563EB',
            weight: 6,
            opacity: 0.2,
          }).addTo(layers);

          L.polyline(pathToDraw, {
            color: isRecommended ? '#059669' : '#2563EB',
            weight: 3.5,
            opacity: 0.9,
          })
            .addTo(layers)
            .on('click', () => onSelectShipmentId?.(s.id));
        }
      }

      // Pickup Marker Pin
      const pickupIcon = L.divIcon({
        className: 'custom-pickup-pin',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer">
            <div class="w-4 h-4 rounded-full border-2 border-white shadow-md flex items-center justify-center ${
              isSelected ? 'bg-blue-600 ring-2 ring-blue-400' : isRecommended ? 'bg-emerald-600 ring-2 ring-emerald-400' : 'bg-slate-700'
            }">
              <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
            <div class="absolute -top-4 px-1 py-0.2 bg-white/95 text-[9px] font-bold rounded shadow-xs whitespace-nowrap border border-slate-200">
              ${s.id}
            </div>
          </div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      L.marker(pickCoords, { icon: pickupIcon })
        .addTo(layers)
        .on('click', () => onSelectShipmentId?.(s.id))
        .bindPopup(`
          <div style="font-family: 'Inter', sans-serif; font-size: 11px;">
            <strong style="color: #0F172A; display: block;">${s.id}: ${s.name}</strong>
            <span style="color: #64748B;">Pickup: ${s.origin}</span><br/>
            <span style="color: #64748B;">Drop: ${s.destination}</span><br/>
            <span style="color: #2563EB; font-weight: 600;">Payload: ${s.weightTons || (s.cargoWeight ? s.cargoWeight / 1000 : 0)}t | Gross: ₹${(s.freightOfferInr || s.value || 0).toLocaleString('en-IN')}</span>
          </div>
        `);
    });

    // 3. Draw Corridor Waypoints
    CORRIDOR_WAYPOINTS.forEach((node) => {
      const pinIcon = L.divIcon({
        className: 'custom-city-pin',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
            <div class="w-2 h-2 rounded-full border border-white shadow-xs bg-slate-400">
            </div>
          </div>
        `,
        iconSize: [8, 8],
        iconAnchor: [4, 4],
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

    // 4. Draw Live Truck Markers for ALL visible trucks
    activeTruckList.forEach((t) => {
      if (!t.currentCoords) return;
      const isSelectedTruck = truck && t.id === truck.id;
      const riskColor = getRiskColor(t.emptyReturnProbability);
      const riskVal = Number(t.emptyReturnProbability) || 0;

      const truckIcon = L.divIcon({
        className: 'custom-truck-marker',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer">
            ${
              isSelectedTruck
                ? `<div class="absolute w-10 h-10 rounded-full bg-blue-500/30 animate-ping"></div>`
                : ''
            }
            <div class="relative ${
              isSelectedTruck ? 'w-8 h-8 ring-2 ring-blue-500/60 shadow-lg' : 'w-6 h-6 shadow-md'
            } rounded-full text-white flex items-center justify-center border-2 border-white" style="background-color: ${
              isSelectedTruck ? '#2563EB' : riskColor
            };">
              <svg class="${isSelectedTruck ? 'w-4 h-4' : 'w-3 h-3'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <div class="absolute -bottom-5 px-1.5 py-0.5 rounded ${
              isSelectedTruck ? 'bg-blue-900 text-white font-black' : 'bg-slate-900/90 text-white font-bold'
            } text-[9px] whitespace-nowrap shadow-md border border-slate-700">
              ${t.id} (${riskVal}%)
            </div>
          </div>
        `,
        iconSize: [isSelectedTruck ? 40 : 30, isSelectedTruck ? 40 : 30],
        iconAnchor: [isSelectedTruck ? 20 : 15, isSelectedTruck ? 20 : 15],
      });

      L.marker(t.currentCoords, { icon: truckIcon })
        .addTo(layers)
        .on('click', () => onSelectTruckId?.(t.id))
        .bindPopup(`
          <div style="font-family: 'Inter', sans-serif; font-size: 11px;">
            <strong style="color: #0F172A;">Vehicle ${t.id} (${t.regNumber || ''})</strong><br/>
            <span style="color: #64748B;">Route: ${t.origin} → ${t.destination}</span><br/>
            <span style="color: ${riskColor}; font-weight: 600;">Deadhead Risk: ${riskVal}%</span><br/>
            <span style="color: #2563EB; font-weight: 600;">ETA: ${t.expectedDeliveryTime || '14:30'}</span>
          </div>
        `);
    });

    // 5. Auto-fit bounds
    if (boundsPoints.length > 1) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(boundsPoints), {
        padding: [35, 35],
        maxZoom: 11,
      });
    }
  }, [truck, trucks, showAllTrucks, shipments, selectedShipmentId, recommendedId, onSelectShipmentId, onSelectTruckId]);

  return (
    <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft overflow-hidden relative">
      {/* Top Map Header */}
      <div className="px-4 py-2.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 bg-white">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-[#0F172A]">
            Western Freight Corridor Geo-Spatial Map
          </span>
          <span className="text-[10px] text-[#64748B] hidden sm:inline">
            • {showAllTrucks ? `Showing All ${trucks.length} Fleet Haulers` : truck ? `${truck.id}: ${truck.origin?.split(' ')[0]} ↔ ${truck.destination?.split(' ')[0]}` : 'Western India Grid'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Toggle All vs Selected */}
          {trucks.length > 1 && (
            <button
              onClick={() => setShowAllTrucks((prev) => !prev)}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold border flex items-center gap-1.5 transition-all cursor-pointer bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>{showAllTrucks ? `All Fleet (${trucks.length})` : 'Selected Only'}</span>
            </button>
          )}

          {isUsingApproximateRoutes ? (
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200 text-[10px] flex items-center gap-1">
              <Navigation className="w-3 h-3 text-amber-600" />
              <span>Approximate Route</span>
            </span>
          ) : realRouteCoords ? (
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-[10px] flex items-center gap-1">
              <Navigation className="w-3 h-3 text-emerald-600" />
              <span>OSRM Polyline</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative">
        <div ref={mapContainerRef} className="h-[340px] w-full z-0" />

        {/* Floating Map Legend */}
        <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-2 shadow-md text-[10px] font-medium text-slate-700 space-y-1">
          <div className="font-bold text-slate-900 text-[10px] border-b border-slate-100 pb-0.5">
            Fleet Risk Legend
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Low Risk (&lt;40%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Med Risk (40-60%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>High Risk (&gt;60%)</span>
          </div>
          <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-100">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="font-bold text-blue-700">Active Truck Route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-700" />
            <span>Load Pickup Point</span>
          </div>
        </div>
      </div>
    </div>
  );
}
