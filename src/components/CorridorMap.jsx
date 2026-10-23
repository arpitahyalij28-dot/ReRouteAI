import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Layers, Play, Pause, RotateCcw, Gauge } from 'lucide-react';
import { CORRIDOR_WAYPOINTS } from '../data/mockData';
import { apiFetch } from '../lib/api';
import { useReRoute } from '../context/ReRouteContext';
import WeatherBadge from './WeatherBadge';

export default function CorridorMap({
  truck,
  trucks = [],
  shipments = [],
  selectedShipmentId,
  recommendedId,
  onSelectShipmentId,
  onSelectTruckId,
}) {
  const { corridorWeather } = useReRoute();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const [showAllTrucks, setShowAllTrucks] = useState(true);
  const [isUsingApproximateRoutes, setIsUsingApproximateRoutes] = useState(false);
  const [realRouteCoords, setRealRouteCoords] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(9);
  const routeCacheRef = useRef(new Map());

  // Transit Route Simulation State (P0.2)
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0); // 0 to 100%
  const [simSpeed, setSimSpeed] = useState(2); // 1x, 2x, 5x

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
    tileLayer.addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    // Track zoom level for dynamic clustering
    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

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

  // Simulation Timer Interval (P0.2)
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      setSimProgress((prev) => {
        const step = simSpeed * 0.75;
        if (prev + step >= 100) {
          setIsSimulating(false);
          return 100;
        }
        return prev + step;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isSimulating, simSpeed]);

  const getMilestoneName = (progress) => {
    if (progress <= 5) return 'Origin Terminal (Nashik Satpur)';
    if (progress < 25) return 'NH 160 Corridor (Igatpuri Toll)';
    if (progress < 60) return 'Kasara Ghat Hairpins (580m Summit)';
    if (progress < 85) return 'Asangaon Industrial Depot';
    if (progress < 100) return 'Approaching Bhiwandi Depot';
    return 'Arrived at Bhiwandi (Unloading Ready)';
  };

  const getInterpolatedPoint = (coords, progress) => {
    if (!coords || coords.length === 0) return null;
    if (coords.length === 1) return coords[0];
    const t = Math.max(0, Math.min(100, progress)) / 100;
    const totalSegs = coords.length - 1;
    const rawIndex = t * totalSegs;
    const idx = Math.min(Math.floor(rawIndex), totalSegs - 1);
    const frac = rawIndex - idx;
    const p1 = coords[idx];
    const p2 = coords[idx + 1];
    return [
      p1[0] + (p2[0] - p1[0]) * frac,
      p1[1] + (p2[1] - p1[1]) * frac,
    ];
  };

  // Update Dynamic Layers, Clusters & Polylines
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;
    const map = mapInstanceRef.current;
    const layers = layerGroupRef.current;
    layers.clearLayers();

    const activeTruckList = showAllTrucks && trucks.length > 0 ? trucks : truck ? [truck] : [];

    if (activeTruckList.length === 0 && shipments.length === 0) {
      map.setView([19.5, 73.3], 7);
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
    let currentSimCoords = null;
    activeTruckList.forEach((t) => {
      const isSelectedTruck = truck && t.id === truck.id;
      const riskColor = getRiskColor(t.emptyReturnProbability);

      if (t.currentCoords) boundsPoints.push(t.currentCoords);
      if (t.originCoords) boundsPoints.push(t.originCoords);
      if (t.destinationCoords) boundsPoints.push(t.destinationCoords);

      const transitPath = [
        t.originCoords || [19.9575, 73.742],
        [19.78, 73.61],
        [19.645, 73.485],
        [19.52, 73.38],
        [19.435, 73.305],
        [19.36, 73.18],
        t.destinationCoords || [19.2967, 73.0631],
      ];

      const nominalPath = [
        t.originCoords || [19.9575, 73.742],
        t.currentCoords || [19.645, 73.485],
        t.destinationCoords || [19.2967, 73.0631],
      ];

      if (isSelectedTruck) {
        if (simProgress > 0) {
          currentSimCoords = getInterpolatedPoint(transitPath, simProgress);
          if (currentSimCoords) boundsPoints.push(currentSimCoords);

          // Render active traveled green trail
          const traveled = [];
          const tFrac = simProgress / 100;
          const totalSegs = transitPath.length - 1;
          const maxIdx = Math.floor(tFrac * totalSegs);
          for (let i = 0; i <= maxIdx; i++) {
            traveled.push(transitPath[i]);
          }
          if (currentSimCoords) traveled.push(currentSimCoords);

          if (traveled.length > 1) {
            L.polyline(traveled, {
              color: '#10B981',
              weight: 4.5,
              opacity: 0.95,
            }).addTo(layers);
          }
        }

        // Glowing halo line for active focused truck
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
        // Faded corridor line for other fleet trucks (non-selected)
        L.polyline(nominalPath, {
          color: riskColor,
          weight: 2,
          dashArray: '4, 6',
          opacity: 0.35,
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
    });

    // 3. Draw Corridor Waypoints (Small dots, tooltips on hover only)
    CORRIDOR_WAYPOINTS.forEach((node) => {
      const isKasaraGhat = node.id === 'W3';
      const wRisk = (corridorWeather?.disruptionImpact?.riskLevel || corridorWeather?.riskLevel || 'low').toLowerCase();

      if (isKasaraGhat) {
        // High visibility weather pin on Kasara Ghat
        const ghatColor = wRisk === 'high' ? '#E11D48' : wRisk === 'medium' ? '#D97706' : '#059669';
        const weatherGhatIcon = L.divIcon({
          className: 'custom-weather-ghat-pin',
          html: `
            <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer">
              <div class="px-2 py-0.5 rounded-full text-[9px] font-black text-white shadow-md flex items-center gap-1 border-2 border-white" style="background-color: ${ghatColor};">
                <span>🌧️ Kasara Ghat (${wRisk.toUpperCase()})</span>
              </div>
            </div>
          `,
          iconSize: [110, 20],
          iconAnchor: [55, 10],
        });

        L.marker(node.coords, { icon: weatherGhatIcon })
          .addTo(layers)
          .bindPopup(`
            <div style="font-family: 'Inter', sans-serif; font-size: 11px;">
              <strong style="color: #0F172A;">${node.name}</strong><br/>
              <span style="color: #64748B;">Condition: ${corridorWeather?.currentWeather?.condition || corridorWeather?.condition || 'Clear sky'}</span><br/>
              <span style="color: ${ghatColor}; font-weight: bold;">Weather Hazard: ${wRisk.toUpperCase()}</span><br/>
              <span style="color: #475569; font-size: 10px;">${corridorWeather?.isFallback ? 'Fallback estimate' : corridorWeather?.isSimulated ? 'Simulated Heavy Rain' : 'Live (Open-Meteo)'}</span>
            </div>
          `);
        return;
      }

      const pinIcon = L.divIcon({
        className: 'custom-city-pin',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
            <div class="w-1.5 h-1.5 rounded-full bg-slate-400 opacity-60"></div>
          </div>
        `,
        iconSize: [6, 6],
        iconAnchor: [3, 3],
      });

      L.marker(node.coords, { icon: pinIcon })
        .addTo(layers)
        .bindTooltip(node.name.split(' ')[0], {
          permanent: false,
          direction: 'top',
          offset: [0, -4],
          className: 'map-city-pill',
        });
    });

    // 4. Clustering vs Individual Markers
    // When zoomed out (zoom <= 8), cluster nearby trucks/loads
    const isClustered = currentZoom <= 8 && activeTruckList.length > 3;

    if (isClustered) {
      // Spatial clustering
      const clusters = [];
      const threshold = 0.25; // ~25km in lat/lng

      activeTruckList.forEach((t) => {
        if (!t.currentCoords) return;
        let added = false;
        for (const cluster of clusters) {
          const dist = Math.hypot(
            cluster.center[0] - t.currentCoords[0],
            cluster.center[1] - t.currentCoords[1]
          );
          if (dist < threshold) {
            cluster.items.push(t);
            added = true;
            break;
          }
        }
        if (!added) {
          clusters.push({ center: [...t.currentCoords], items: [t] });
        }
      });

      clusters.forEach((cluster) => {
        if (cluster.items.length === 1) {
          // Render individual single truck
          renderTruckMarker(cluster.items[0]);
        } else {
          // Render cluster bubble
          const hasSelected = cluster.items.some((t) => truck && t.id === truck.id);
          const clusterIcon = L.divIcon({
            className: 'custom-cluster-marker',
            html: `
              <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
                <div class="w-8 h-8 rounded-full ${
                  hasSelected ? 'bg-blue-600 ring-4 ring-blue-300' : 'bg-slate-800 ring-2 ring-white'
                } text-white font-extrabold text-xs flex items-center justify-center shadow-md transition-transform group-hover:scale-110">
                  ${cluster.items.length}
                </div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          L.marker(cluster.center, { icon: clusterIcon })
            .addTo(layers)
            .on('click', () => {
              map.setView(cluster.center, 10);
            })
            .bindTooltip(`${cluster.items.length} Trucks in this corridor segment (Click to zoom in)`, {
              direction: 'top',
              offset: [0, -10],
            });
        }
      });
    } else {
      // Render individual markers for all trucks
      activeTruckList.forEach((t) => renderTruckMarker(t));
    }

    function renderTruckMarker(t) {
      if (!t.currentCoords) return;
      const isSelectedTruck = truck && t.id === truck.id;
      const isSimulatingThisTruck = isSelectedTruck && simProgress > 0;
      const activeCoords = isSimulatingThisTruck && currentSimCoords ? currentSimCoords : t.currentCoords;
      if (!activeCoords) return;

      const riskColor = getRiskColor(t.emptyReturnProbability);
      const riskVal = Number(t.emptyReturnProbability) || 0;

      // By default show small icon/dot with NO permanent text label.
      // Label shows only for selected truck, and on hover for all others.
      const truckIcon = L.divIcon({
        className: 'custom-truck-marker',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
            ${
              isSelectedTruck
                ? `<div class="absolute w-9 h-9 rounded-full ${isSimulatingThisTruck ? 'bg-emerald-500/40' : 'bg-blue-500/30'} animate-ping"></div>`
                : ''
            }
            <div class="relative ${
              isSelectedTruck
                ? 'w-7 h-7 ring-2 ring-blue-500/80 shadow-lg'
                : 'w-4 h-4 shadow-sm hover:scale-125'
            } rounded-full text-white flex items-center justify-center border-2 border-white transition-transform" style="background-color: ${
              isSelectedTruck ? (isSimulatingThisTruck ? '#059669' : '#2563EB') : riskColor
            };">
              ${
                isSelectedTruck
                  ? `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>`
                  : ''
              }
            </div>
            ${
              isSelectedTruck
                ? `<div class="absolute -bottom-5 px-1.5 py-0.2 rounded ${isSimulatingThisTruck ? 'bg-emerald-900 border-emerald-600' : 'bg-blue-900 border-blue-700'} text-white font-extrabold text-[9px] whitespace-nowrap shadow-md border">
                    ${t.id} ${isSimulatingThisTruck ? `(${Math.round(simProgress)}% In Transit)` : `(${riskVal}%)`}
                  </div>`
                : ''
            }
          </div>
        `,
        iconSize: [isSelectedTruck ? 32 : 16, isSelectedTruck ? 32 : 16],
        iconAnchor: [isSelectedTruck ? 16 : 8, isSelectedTruck ? 16 : 8],
      });

      const marker = L.marker(activeCoords, { icon: truckIcon })
        .addTo(layers)
        .on('click', () => onSelectTruckId?.(t.id));

      // Show tooltip on hover
      marker.bindTooltip(
        `<div style="font-family: 'Inter', sans-serif; font-size: 11px;">
          <strong>Vehicle ${t.id}</strong> • ${isSimulatingThisTruck ? `<strong style="color: #059669;">${getMilestoneName(simProgress)}</strong>` : `Deadhead Risk: <strong style="color: ${riskColor};">${riskVal}%</strong>`}<br/>
          <span style="color: #64748B;">Route: ${t.origin?.split(' ')[0]} → ${t.destination?.split(' ')[0]}</span>
        </div>`,
        { direction: 'top', offset: [0, isSelectedTruck ? -14 : -8], opacity: 0.95 }
      );

      marker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; font-size: 11px;">
          <strong style="color: #0F172A;">Vehicle ${t.id} (${t.regNumber || ''})</strong><br/>
          <span style="color: #64748B;">Route: ${t.origin} → ${t.destination}</span><br/>
          <span style="color: ${riskColor}; font-weight: 600;">Deadhead Risk: ${riskVal}%</span><br/>
          <span style="color: #2563EB; font-weight: 600;">ETA: ${t.expectedDeliveryTime || '14:30'}</span>
        </div>
      `);
    }

    // 5. Render Shipments: Small dots, no permanent text labels; hover tooltip
    activeCandidates.forEach((s) => {
      const pickCoords = s.originCoords || (s.pickupLat ? [s.pickupLat, s.pickupLng] : null);
      if (!pickCoords) return;

      const isSelected = s.id === selectedShipmentId;
      const isRecommended = s.id === recommendedId;

      const pickupIcon = L.divIcon({
        className: 'custom-pickup-pin',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
            <div class="${
              isSelected
                ? 'w-5 h-5 rounded-full bg-blue-600 ring-2 ring-blue-300 shadow-md flex items-center justify-center'
                : isRecommended
                ? 'w-4 h-4 rounded-full bg-emerald-600 ring-2 ring-emerald-300 shadow-md flex items-center justify-center'
                : 'w-2.5 h-2.5 rounded-full bg-slate-700 shadow-xs border border-white group-hover:scale-125'
            } transition-transform">
              ${
                isSelected || isRecommended
                  ? `<div class="w-1.5 h-1.5 rounded-full bg-white"></div>`
                  : ''
              }
            </div>
            ${
              isSelected || isRecommended
                ? `<div class="absolute -top-4 px-1 py-0.2 bg-white/95 text-[9px] font-bold rounded shadow-xs whitespace-nowrap border border-slate-200">
                    ${s.id}
                  </div>`
                : ''
            }
          </div>
        `,
        iconSize: [isSelected ? 20 : 10, isSelected ? 20 : 10],
        iconAnchor: [isSelected ? 10 : 5, isSelected ? 10 : 5],
      });

      const sMarker = L.marker(pickCoords, { icon: pickupIcon })
        .addTo(layers)
        .on('click', () => onSelectShipmentId?.(s.id));

      sMarker.bindTooltip(
        `<div style="font-family: 'Inter', sans-serif; font-size: 11px;">
          <strong>${s.id}: ${s.name}</strong><br/>
          <span>${s.origin?.split(' ')[0]} → ${s.destination?.split(' ')[0]}</span> • <strong>₹${(s.freightOfferInr || s.value || 0).toLocaleString('en-IN')}</strong>
        </div>`,
        { direction: 'top', offset: [0, -8], opacity: 0.95 }
      );
    });

    // 6. Auto-fit bounds (only when not actively animating transit)
    if (boundsPoints.length > 1 && simProgress === 0) {
      map.fitBounds(L.latLngBounds(boundsPoints), {
        padding: [35, 35],
        maxZoom: 11,
      });
    }
  }, [truck, trucks, showAllTrucks, shipments, selectedShipmentId, recommendedId, currentZoom, onSelectShipmentId, onSelectTruckId, simProgress, isSimulating]);

  return (
    <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft overflow-hidden relative">
      {/* Top Map Header */}
      <div className="px-4 py-2.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 bg-white">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-xs font-bold text-[#0F172A]">
            Western Freight Corridor Geo-Spatial Map
          </span>
          <span className="text-[10px] text-[#64748B] hidden sm:inline">
            • {showAllTrucks ? `Showing All ${trucks.length} Fleet Haulers` : truck ? `${truck.id}: ${truck.origin?.split(' ')[0]} ↔ ${truck.destination?.split(' ')[0]}` : 'Western India Grid'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Transit Simulation Toggle (P0.2) */}
          {truck && (
            <button
              type="button"
              onClick={() => {
                if (simProgress >= 100) setSimProgress(0);
                setIsSimulating((prev) => !prev);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                isSimulating
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                  : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}
              title="Simulate live corridor transit for selected vehicle"
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-blue-600" />}
              <span>{isSimulating ? 'Pause Transit' : simProgress > 0 ? 'Resume Transit' : '▶ Simulate Transit'}</span>
            </button>
          )}

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

        {/* Floating Weather Indicator near Ghat/Corridor */}
        <div className="absolute top-3 right-3 z-[400] max-w-[250px]">
          <WeatherBadge weather={corridorWeather} variant="map" />
        </div>

        {/* Floating Map Legend (Retained with risk colors, route, pickup point) */}
        <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-2 shadow-md text-[10px] font-medium text-slate-700 space-y-1">
          <div className="font-bold text-slate-900 text-[10px] border-b border-slate-100 pb-0.5">
            Corridor Legend
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
            <span className="font-bold text-blue-700">Selected Truck Route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-700" />
            <span>Load Pickup Point</span>
          </div>
        </div>

        {/* Floating Live Transit Simulation HUD (P0.2) */}
        {(isSimulating || simProgress > 0) && (
          <div className="absolute bottom-3 right-3 z-[400] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-xl text-white max-w-[270px] w-full text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Transit Simulator</span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 5].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setSimSpeed(spd)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                      simSpeed === spd ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setIsSimulating(false);
                    setSimProgress(0);
                  }}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Reset simulation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span className="truncate max-w-[190px]">{getMilestoneName(simProgress)}</span>
                <span className="font-bold text-slate-200">{Math.round(simProgress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-150"
                  style={{ width: `${simProgress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-300">
              <div className="flex items-center gap-1">
                <Gauge className="w-3 h-3 text-blue-400" />
                <span>{simProgress >= 100 ? 'At Dock' : `${Math.round(48 + ((simProgress * 3) % 15))} km/h`}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Dock ETA: </span>
                <span className="font-bold text-white">
                  {simProgress >= 100 ? 'Arrived' : `+${Math.max(2, Math.round((100 - simProgress) * 0.45))} min`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
