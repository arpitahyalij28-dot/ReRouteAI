// Disruption-Aware Logistics Twin - Interactive Supply Network Map
// Displays suppliers, warehouses, buyers, route corridors with status-based coloring and travel metrics.

import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  Factory,
  Warehouse,
  ShoppingBag,
  Maximize2,
  Info,
  ShieldAlert,
  Clock,
  Navigation,
  Layers,
} from 'lucide-react';
import { ROUTE_STATUS, BUYER_PRIORITY, getEffectiveTravelTime } from '../engine/network.js';

export default function SupplyNetworkMap({
  network,
  selectedNodeId,
  selectedRouteId,
  onSelectNode,
  onSelectRoute,
  disruptedRouteIds = [],
  highlightedDeliveries = [],
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'suppliers', 'warehouses', 'buyers', 'routes'
  const [zoomLevel, setZoomLevel] = useState(9);

  const { suppliers = [], warehouses = [], buyers = [], routes = [] } = network || {};

  // Build node coordinate lookup map
  const nodeLookup = useMemo(() => {
    const map = new Map();
    suppliers.forEach((s) => map.set(s.id, { ...s, entityType: 'supplier' }));
    warehouses.forEach((w) => map.set(w.id, { ...w, entityType: 'warehouse' }));
    buyers.forEach((b) => map.set(b.id, { ...b, entityType: 'buyer' }));
    return map;
  }, [suppliers, warehouses, buyers]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
      maxZoom: 18,
    });

    // Default center on Kasara Corridor between Nashik and Mumbai
    map.setView([19.65, 73.45], 9);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    map.on('zoomend', () => setZoomLevel(map.getZoom()));

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Fit bounds helper
  const fitNetworkBounds = () => {
    if (!mapInstanceRef.current) return;
    const allCoords = [];
    nodeLookup.forEach((n) => {
      if (n.location?.lat && n.location?.lng) {
        allCoords.push([n.location.lat, n.location.lng]);
      }
    });
    if (allCoords.length > 0) {
      mapInstanceRef.current.fitBounds(allCoords, { padding: [40, 40], maxZoom: 11 });
    }
  };

  // Render Markers and Route Polylines
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;
    const layers = layerGroupRef.current;
    layers.clearLayers();

    // 1. Draw Routes (Edges)
    routes.forEach((route) => {
      const fromNode = nodeLookup.get(route.from);
      const toNode = nodeLookup.get(route.to);

      if (!fromNode?.location || !toNode?.location) return;

      const p1 = [fromNode.location.lat, fromNode.location.lng];
      const p2 = [toNode.location.lat, toNode.location.lng];

      const isSelected = selectedRouteId === route.id;
      const isDisrupted =
        route.status === ROUTE_STATUS.CLOSED ||
        route.status === ROUTE_STATUS.SLOW ||
        disruptedRouteIds.includes(route.id);

      // Color coding by route status
      let routeColor = '#2563EB'; // Open: Blue
      let dashArray = null;
      let opacity = 0.75;
      let weight = isSelected ? 5.5 : 3.5;

      if (route.status === ROUTE_STATUS.CLOSED || disruptedRouteIds.includes(route.id)) {
        routeColor = '#EF4444'; // Red: Closed
        dashArray = '8, 8';
        opacity = 0.95;
        weight = isSelected ? 6 : 4;
      } else if (route.status === ROUTE_STATUS.SLOW) {
        routeColor = '#F59E0B'; // Amber: Slow
        dashArray = '5, 5';
        opacity = 0.9;
        weight = isSelected ? 5.5 : 4;
      }

      const effectiveH = getEffectiveTravelTime(route);
      const timeDisplay =
        effectiveH === Infinity ? 'BLOCKED' : `${effectiveH.toFixed(1)}h`;

      const polyline = L.polyline([p1, p2], {
        color: routeColor,
        weight,
        opacity,
        dashArray,
      }).addTo(layers);

      polyline.on('click', () => {
        if (onSelectRoute) onSelectRoute(route);
      });

      // Midpoint badge for distance + travel time
      const midLat = (p1[0] + p2[0]) / 2;
      const midLng = (p1[1] + p2[1]) / 2;

      const badgeIcon = L.divIcon({
        className: 'route-label-icon',
        html: `
          <div style="
            background: ${route.status === ROUTE_STATUS.CLOSED ? '#EF4444' : '#0F172A'};
            color: #FFFFFF;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 9999px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.4);
            white-space: nowrap;
            cursor: pointer;
            transform: translate(-50%, -50%);
          ">
            ${route.distanceKm}km • ${timeDisplay}
          </div>
        `,
        iconSize: [0, 0],
      });

      const labelMarker = L.marker([midLat, midLng], {
        icon: badgeIcon,
        interactive: true,
      }).addTo(layers);

      labelMarker.on('click', () => {
        if (onSelectRoute) onSelectRoute(route);
      });

      // Tooltip
      polyline.bindTooltip(
        `
        <div class="text-xs font-sans p-1">
          <div class="font-bold text-slate-900">${route.name || `${fromNode.name} → ${toNode.name}`}</div>
          <div class="text-slate-600 mt-0.5">Distance: <b>${route.distanceKm} km</b> | Base: <b>${route.baseTravelTimeH}h</b></div>
          <div class="text-slate-600">Status: <span class="font-bold uppercase ${route.status === 'closed' ? 'text-red-600' : route.status === 'slow' ? 'text-amber-600' : 'text-emerald-600'}">${route.status}</span></div>
          ${route.restrictions?.maxVehicleWeightTons ? `<div class="text-amber-700 font-medium">Max Weight: ${route.restrictions.maxVehicleWeightTons}T</div>` : ''}
        </div>
        `,
        { sticky: true }
      );
    });

    // 2. Draw Nodes (Suppliers, Warehouses, Buyers)
    nodeLookup.forEach((node) => {
      if (!node.location?.lat || !node.location?.lng) return;

      const isSelected = selectedNodeId === node.id;
      const isSupplier = node.entityType === 'supplier';
      const isWarehouse = node.entityType === 'warehouse';
      const isBuyer = node.entityType === 'buyer';

      let bgGradient = 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)';
      let borderColor = '#FFFFFF';
      let iconSymbol = '🏢';
      let subtitle = '';

      if (isSupplier) {
        bgGradient = 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)';
        iconSymbol = '🏭';
        subtitle = `Limit: ${node.supplyLimit || 0}u`;
      } else if (isWarehouse) {
        bgGradient = 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)';
        iconSymbol = '📦';
        subtitle = `Stock: ${node.stock || 0}/${node.storageLimit || 0}u`;
      } else if (isBuyer) {
        const isHigh = node.priority === BUYER_PRIORITY.HIGH;
        bgGradient = isHigh
          ? 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)'
          : 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
        iconSymbol = isHigh ? '🏥' : '🏬';
        subtitle = `Demand: ${node.demandQty || 0}u (${node.deadline}h)`;
      }

      const ringEffect = isSelected
        ? 'ring: 4px solid #FACC15; transform: scale(1.15);'
        : 'box-shadow: 0 4px 12px rgba(0,0,0,0.3);';

      const customHtml = `
        <div style="
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: ${bgGradient};
          border: 3px solid ${isSelected ? '#FACC15' : borderColor};
          color: #FFFFFF;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          ${ringEffect}
        ">
          ${iconSymbol}
          <div style="
            position: absolute;
            top: 40px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.92);
            color: #FFFFFF;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 6px;
            white-space: nowrap;
            pointer-events: none;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            border: 1px solid rgba(255,255,255,0.15);
          ">
            ${node.name.length > 20 ? node.name.slice(0, 18) + '...' : node.name}
          </div>
        </div>
      `;

      const marker = L.marker([node.location.lat, node.location.lng], {
        icon: L.divIcon({
          className: 'custom-node-icon',
          html: customHtml,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        }),
      }).addTo(layers);

      marker.on('click', () => {
        if (onSelectNode) onSelectNode(node);
      });

      marker.bindPopup(`
        <div class="text-xs font-sans p-1 min-w-[200px]">
          <div class="flex items-center gap-1.5 font-bold text-sm text-slate-900 border-b border-slate-200 pb-1">
            <span>${iconSymbol}</span>
            <span>${node.name}</span>
          </div>
          <div class="text-slate-600 mt-1.5">Type: <span class="font-semibold uppercase text-slate-800">${node.entityType}</span></div>
          <div class="text-slate-600">Location: <span class="font-semibold text-slate-800">${node.location?.name || 'Corridor'}</span></div>
          ${
            isSupplier
              ? `<div class="mt-1 text-amber-700 font-medium">Supply Capacity: <b>${node.supplyLimit} units</b><br/>Product: <i>${node.product}</i></div>`
              : ''
          }
          ${
            isWarehouse
              ? `<div class="mt-1 text-blue-700 font-medium">Stock: <b>${node.stock} / ${node.storageLimit} units</b> (${Math.round((node.stock / node.storageLimit) * 100)}% capacity)</div>`
              : ''
          }
          ${
            isBuyer
              ? `<div class="mt-1 text-slate-800 font-medium">Demand: <b>${node.demandQty} units</b><br/>Deadline: <b>${node.deadline} hours</b><br/>Priority: <span class="uppercase font-bold ${node.priority === 'high' ? 'text-red-600' : 'text-emerald-600'}">${node.priority}</span></div>`
              : ''
          }
        </div>
      `);
    });
  }, [network, nodeLookup, selectedNodeId, selectedRouteId, disruptedRouteIds]);

  return (
    <div className="relative w-full h-[540px] lg:h-[620px] rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-sm bg-slate-900">
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Overlay Controls */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200/80 shadow-md">
        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-blue-600" />
          <span>Regional Network Twin</span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <button
          type="button"
          onClick={fitNetworkBounds}
          className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
          title="Fit all network nodes in view"
        >
          <Maximize2 className="w-3 h-3" />
          <span>Fit Corridor</span>
        </button>
      </div>

      {/* Floating Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-xl border border-slate-700/60 shadow-lg text-xs space-y-1.5 max-w-[280px]">
        <div className="font-bold text-slate-200 flex items-center gap-1 text-[11px] uppercase tracking-wider">
          <Layers className="w-3 h-3 text-blue-400" />
          <span>Corridor Topology</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <span>Suppliers ({suppliers.length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
            <span>Warehouses ({warehouses.length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
            <span>High Priority Buyer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Standard Buyer</span>
          </div>
        </div>
        <div className="border-t border-slate-700/80 pt-1 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-500" /> Open
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-amber-500" /> Slow
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-red-500 border-dashed" /> Closed
          </span>
        </div>
      </div>
    </div>
  );
}
