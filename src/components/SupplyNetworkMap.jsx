// Disruption-Aware Logistics Twin - Interactive Supply Network Map
// High-clarity, decluttered Leaflet visualization with smart label placement,
// zoom-adaptive markers, cluster bubbles, parallel route separation, and collapsible legend.

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import {
  Factory,
  Warehouse,
  ShoppingBag,
  Maximize2,
  Navigation,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ROUTE_STATUS, BUYER_PRIORITY, getEffectiveTravelTime } from '../engine/network.js';

// --- Helper Functions ---

/**
 * Truncate long entity names to first 2-3 meaningful words for compact map pills
 */
function getShortNodeName(fullName) {
  if (!fullName) return '';
  const clean = fullName.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  const words = clean.split(' ').filter(Boolean);
  if (words.length <= 3) return words.join(' ');
  return words.slice(0, 3).join(' ');
}

/**
 * Calculate marker dimensions based on map zoom level
 */
function getMarkerDimensions(zoom) {
  if (zoom < 9) {
    return { size: 24, iconSize: 11, border: 2 };
  }
  if (zoom <= 10) {
    return { size: 30, iconSize: 13, border: 2.5 };
  }
  return { size: 38, iconSize: 16, border: 3 };
}

/**
 * Priority scoring for greedy label placement
 */
function getNodePriorityScore(node, selectedNodeId) {
  if (node.id === selectedNodeId) return 100;
  if (node.entityType === 'buyer' && node.priority === BUYER_PRIORITY.HIGH) return 80;
  if (node.entityType === 'warehouse') return 60;
  if (node.entityType === 'supplier') return 40;
  return 20; // other buyers
}

/**
 * Check if candidate label rectangle overlaps placed label rectangles, map bounds, or node circles
 */
function isPositionFree(candidate, mapWidth, mapHeight, placedRects, circles, padding = 3) {
  // 1. Boundary check: ensure label stays fully within the map container
  if (
    candidate.x < 6 ||
    candidate.y < 6 ||
    candidate.x + candidate.width > mapWidth - 6 ||
    candidate.y + candidate.height > mapHeight - 6
  ) {
    return false;
  }

  // 2. Overlap with already placed label rectangles
  for (const r of placedRects) {
    const overlaps = !(
      candidate.x + candidate.width + padding <= r.x ||
      r.x + r.width + padding <= candidate.x ||
      candidate.y + candidate.height + padding <= r.y ||
      r.y + r.height + padding <= candidate.y
    );
    if (overlaps) return false;
  }

  // 3. Overlap with node marker circles or cluster bubbles
  for (const c of circles) {
    // Skip checking collision with candidate's own node marker
    if (c.nodeId && c.nodeId === candidate.nodeId) continue;

    const closestX = Math.max(candidate.x, Math.min(c.cx, candidate.x + candidate.width));
    const closestY = Math.max(candidate.y, Math.min(c.cy, candidate.y + candidate.height));
    const distX = c.cx - closestX;
    const distY = c.cy - closestY;
    if (distX * distX + distY * distY < (c.r + padding) * (c.r + padding)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if two rectangles overlap
 */
function rectsOverlap(r1, r2, padding = 2) {
  return !(
    r1.x + r1.width + padding <= r2.x ||
    r2.x + r2.width + padding <= r1.x ||
    r1.y + r1.height + padding <= r2.y ||
    r2.y + r2.height + padding <= r1.y
  );
}

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
  const renderLayersRef = useRef(null);

  // Component state
  const [zoomLevel, setZoomLevel] = useState(9);
  const [labelMode, setLabelMode] = useState('smart'); // 'smart' | 'all' | 'off'
  const [hoveredRouteId, setHoveredRouteId] = useState(null);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1024
  );

  const { suppliers = [], warehouses = [], buyers = [], routes = [] } = network || {};

  // Build node coordinate lookup map
  const nodeLookup = useMemo(() => {
    const map = new Map();
    suppliers.forEach((s) => map.set(s.id, { ...s, entityType: 'supplier' }));
    warehouses.forEach((w) => map.set(w.id, { ...w, entityType: 'warehouse' }));
    buyers.forEach((b) => map.set(b.id, { ...b, entityType: 'buyer' }));
    return map;
  }, [suppliers, warehouses, buyers]);

  // Fit bounds helper
  const fitNetworkBounds = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const allCoords = [];
    nodeLookup.forEach((n) => {
      if (n.location?.lat && n.location?.lng) {
        allCoords.push([n.location.lat, n.location.lng]);
      }
    });

    if (allCoords.length === 0) return;
    if (allCoords.length === 1) {
      mapInstanceRef.current.setView(allCoords[0], 11);
      return;
    }

    mapInstanceRef.current.fitBounds(allCoords, { padding: [40, 40], maxZoom: 11 });
  }, [nodeLookup]);

  // Ensure deterministic Leaflet custom z-index panes
  const setupCustomPanes = useCallback((map) => {
    if (!map) return;
    const panes = [
      { name: 'routesPane', zIndex: '390', pointerEvents: 'auto' },
      { name: 'routeBadgesPane', zIndex: '410', pointerEvents: 'auto' },
      { name: 'nodesPane', zIndex: '430', pointerEvents: 'auto' },
      { name: 'labelsPane', zIndex: '450', pointerEvents: 'none' },
      { name: 'selectedPane', zIndex: '470', pointerEvents: 'auto' },
    ];
    panes.forEach(({ name, zIndex, pointerEvents }) => {
      if (!map.getPane(name)) {
        const p = map.createPane(name);
        p.style.zIndex = zIndex;
        p.style.pointerEvents = pointerEvents;
      }
    });
  }, []);

  // Main rendering routine: builds polylines, badges, clusters, markers, and smart labels
  const renderMapLayers = useCallback(() => {
    const map = mapInstanceRef.current;
    const layers = layerGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();
    setupCustomPanes(map);

    const currentZoom = map.getZoom();
    const mapSize = map.getSize();
    const mapWidth = mapSize.x;
    const mapHeight = mapSize.y;

    const baseRouteWeight = currentZoom < 9 ? 2.5 : 3.5;
    const { size: markerSize, iconSize, border: markerBorder } = getMarkerDimensions(currentZoom);

    // =========================================================================
    // 1. Group Routes by Undirected Node Pair (Handling Parallel / Double Edges)
    // =========================================================================
    const routePairGroups = new Map();
    routes.forEach((route) => {
      const fromNode = nodeLookup.get(route.from);
      const toNode = nodeLookup.get(route.to);
      if (!fromNode?.location?.lat || !toNode?.location?.lat) return;

      const pairKey = [route.from, route.to].sort().join('--');
      if (!routePairGroups.has(pairKey)) {
        routePairGroups.set(pairKey, []);
      }
      routePairGroups.get(pairKey).push({ route, fromNode, toNode });
    });

    const placedBadgeRects = [];

    // =========================================================================
    // 2. Draw Routes (Polylines + Tooltips + Midpoint Badges)
    // =========================================================================
    routePairGroups.forEach((group) => {
      const groupCount = group.length;

      group.forEach((item, idx) => {
        const { route, fromNode, toNode } = item;
        const p1 = [fromNode.location.lat, fromNode.location.lng];
        const p2 = [toNode.location.lat, toNode.location.lng];

        const isSelected = selectedRouteId === route.id;
        const isHovered = hoveredRouteId === route.id;
        const isDisrupted =
          route.status === ROUTE_STATUS.CLOSED ||
          route.status === ROUTE_STATUS.SLOW ||
          disruptedRouteIds.includes(route.id);

        // Status coloring
        let routeColor = '#2563EB'; // Open: Blue
        let dashArray = null;
        let opacity = 0.75;
        let weight = isSelected ? baseRouteWeight + 2.5 : baseRouteWeight;

        if (route.status === ROUTE_STATUS.CLOSED || disruptedRouteIds.includes(route.id)) {
          routeColor = '#EF4444'; // Red: Closed
          dashArray = '8, 8';
          opacity = 0.95;
          weight = isSelected ? baseRouteWeight + 3 : baseRouteWeight + 0.5;
        } else if (route.status === ROUTE_STATUS.SLOW) {
          routeColor = '#F59E0B'; // Amber: Slow
          dashArray = '5, 5';
          opacity = 0.9;
          weight = isSelected ? baseRouteWeight + 2.5 : baseRouteWeight + 0.5;
        }

        // Calculate offset for parallel routes
        let polylineCoords = [p1, p2];
        let midLatLng = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];

        if (groupCount > 1) {
          const pt1 = map.latLngToLayerPoint(p1);
          const pt2 = map.latLngToLayerPoint(p2);
          const dx = pt2.x - pt1.x;
          const dy = pt2.y - pt1.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;

          const offsetPx = (idx - (groupCount - 1) / 2) * 8; // Separation offset
          const midPoint = {
            x: (pt1.x + pt2.x) / 2 + nx * offsetPx,
            y: (pt1.y + pt2.y) / 2 + ny * offsetPx,
          };
          midLatLng = [
            map.layerPointToLatLng(midPoint).lat,
            map.layerPointToLatLng(midPoint).lng,
          ];
          polylineCoords = [p1, midLatLng, p2];
        }

        // Polyline drawing
        const polyline = L.polyline(polylineCoords, {
          color: routeColor,
          weight,
          opacity,
          dashArray,
          pane: 'routesPane',
        }).addTo(layers);

        polyline.on('click', () => {
          if (onSelectRoute) onSelectRoute(route);
        });

        polyline.on('mouseover', () => {
          setHoveredRouteId(route.id);
        });
        polyline.on('mouseout', () => {
          setHoveredRouteId((prev) => (prev === route.id ? null : prev));
        });

        // Rich hover tooltip (preserved for all routes)
        polyline.bindTooltip(
          `
          <div class="text-xs font-sans p-1">
            <div class="font-bold text-slate-900">${route.name || `${fromNode.name} → ${toNode.name}`}</div>
            <div class="text-slate-600 mt-0.5">Distance: <b>${route.distanceKm} km</b> | Base: <b>${route.baseTravelTimeH}h</b></div>
            <div class="text-slate-600">Status: <span class="font-bold uppercase ${
              route.status === 'closed'
                ? 'text-red-600'
                : route.status === 'slow'
                ? 'text-amber-600'
                : 'text-emerald-600'
            }">${route.status}</span></div>
            ${
              route.restrictions?.maxVehicleWeightTons
                ? `<div class="text-amber-700 font-medium">Max Weight: ${route.restrictions.maxVehicleWeightTons}T</div>`
                : ''
            }
          </div>
          `,
          { sticky: true }
        );

        // =====================================================================
        // Route Badges (Decluttered: selected, hovered, problems, or high zoom)
        // =====================================================================
        const effectiveH = getEffectiveTravelTime(route);
        const timeDisplay = effectiveH === Infinity ? 'BLOCKED' : `${effectiveH.toFixed(1)}h`;
        const badgeText = `${route.distanceKm}km • ${timeDisplay}`;

        let shouldShowBadge = false;

        if (labelMode === 'all') {
          shouldShowBadge = true;
        } else if (labelMode === 'off') {
          shouldShowBadge = isSelected || isHovered;
        } else {
          // 'smart' mode:
          if (isSelected || isHovered || isDisrupted) {
            shouldShowBadge = true;
          } else if (currentZoom >= 11) {
            // Check collision against already visible badge rects
            const badgeContainerPt = map.latLngToContainerPoint(midLatLng);
            const badgeW = Math.max(60, badgeText.length * 6.2 + 14);
            const badgeH = 18;
            const badgeRect = {
              x: badgeContainerPt.x - badgeW / 2,
              y: badgeContainerPt.y - badgeH / 2,
              width: badgeW,
              height: badgeH,
            };

            const collides = placedBadgeRects.some((r) => rectsOverlap(r, badgeRect, 4));
            if (!collides) {
              shouldShowBadge = true;
              placedBadgeRects.push(badgeRect);
            }
          }
        }

        if (shouldShowBadge) {
          const badgeBg =
            route.status === ROUTE_STATUS.CLOSED || disruptedRouteIds.includes(route.id)
              ? '#EF4444'
              : route.status === ROUTE_STATUS.SLOW
              ? '#D97706'
              : isSelected
              ? '#2563EB'
              : '#0F172A';

          const badgeIcon = L.divIcon({
            className: 'route-label-icon',
            html: `
              <div style="
                background: ${badgeBg};
                color: #FFFFFF;
                font-size: 9.5px;
                font-weight: 700;
                padding: 1.5px 6.5px;
                border-radius: 9999px;
                box-shadow: 0 1px 4px rgba(0,0,0,0.35);
                border: 1.5px solid #FFFFFF;
                white-space: nowrap;
                cursor: pointer;
                transform: translate(-50%, -50%);
                pointer-events: auto;
                line-height: 1.25;
              ">
                ${badgeText}
              </div>
            `,
            iconSize: [0, 0],
          });

          const labelMarker = L.marker(midLatLng, {
            icon: badgeIcon,
            interactive: true,
            pane: 'routeBadgesPane',
          }).addTo(layers);

          labelMarker.on('click', () => {
            if (onSelectRoute) onSelectRoute(route);
          });
          labelMarker.on('mouseover', () => setHoveredRouteId(route.id));
          labelMarker.on('mouseout', () =>
            setHoveredRouteId((prev) => (prev === route.id ? null : prev))
          );
        }
      });
    });

    // =========================================================================
    // 3. Node Clustering Pass (< 28px on screen, selected node NEVER clustered)
    // =========================================================================
    const visibleNodes = [];
    nodeLookup.forEach((node) => {
      if (node.location?.lat && node.location?.lng) {
        visibleNodes.push(node);
      }
    });

    const CLUSTER_THRESHOLD_PX = 28;
    const selectedNode = visibleNodes.find((n) => n.id === selectedNodeId);
    const unclusteredNodes = [];
    const clusters = []; // Array of { centerPt: {x, y}, nodes: [] }

    visibleNodes.forEach((node) => {
      // The selected node must NEVER be hidden inside a cluster
      if (node.id === selectedNodeId) {
        unclusteredNodes.push(node);
        return;
      }

      const pt = map.latLngToContainerPoint([node.location.lat, node.location.lng]);

      let merged = false;
      for (const cluster of clusters) {
        const dist = Math.hypot(cluster.centerPt.x - pt.x, cluster.centerPt.y - pt.y);
        if (dist < CLUSTER_THRESHOLD_PX) {
          cluster.nodes.push(node);
          const count = cluster.nodes.length;
          cluster.centerPt.x = (cluster.centerPt.x * (count - 1) + pt.x) / count;
          cluster.centerPt.y = (cluster.centerPt.y * (count - 1) + pt.y) / count;
          merged = true;
          break;
        }
      }

      if (!merged) {
        clusters.push({ centerPt: { x: pt.x, y: pt.y }, nodes: [node] });
      }
    });

    // Clusters of 1 become normal individual nodes
    const finalClusterBubbles = [];
    clusters.forEach((cluster) => {
      if (cluster.nodes.length === 1) {
        unclusteredNodes.push(cluster.nodes[0]);
      } else {
        finalClusterBubbles.push(cluster);
      }
    });

    // Record circles for smart label collision detection
    const markerCirclesForCollision = [];

    // =========================================================================
    // 4. Render Cluster Bubbles (Numbered Count, Zooms In on Click)
    // =========================================================================
    finalClusterBubbles.forEach((cluster) => {
      const avgLat =
        cluster.nodes.reduce((sum, n) => sum + n.location.lat, 0) / cluster.nodes.length;
      const avgLng =
        cluster.nodes.reduce((sum, n) => sum + n.location.lng, 0) / cluster.nodes.length;
      const clusterSize = currentZoom < 9 ? 26 : 30;

      const clusterHtml = `
        <div style="
          width: ${clusterSize}px;
          height: ${clusterSize}px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
          border: 2px solid #94A3B8;
          box-shadow: 0 3px 8px rgba(0,0,0,0.35);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: ${clusterSize > 28 ? 12 : 11}px;
          cursor: pointer;
          transition: transform 0.15s ease;
        ">
          ${cluster.nodes.length}
        </div>
      `;

      const clusterMarker = L.marker([avgLat, avgLng], {
        icon: L.divIcon({
          className: 'cluster-bubble-icon',
          html: clusterHtml,
          iconSize: [clusterSize, clusterSize],
          iconAnchor: [clusterSize / 2, clusterSize / 2],
        }),
        pane: 'nodesPane',
      }).addTo(layers);

      const nodeNamesSummary = cluster.nodes.map((n) => getShortNodeName(n.name)).join(', ');
      clusterMarker.bindTooltip(
        `<div class="text-xs font-sans p-1"><b>${cluster.nodes.length} Network Nodes:</b><br/>${nodeNamesSummary}<br/><span class="text-blue-600 font-bold">Click to zoom in</span></div>`,
        { sticky: true }
      );

      clusterMarker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        const bounds = L.latLngBounds(cluster.nodes.map((n) => [n.location.lat, n.location.lng]));
        map.fitBounds(bounds, { padding: [55, 55], maxZoom: Math.min(18, currentZoom + 2) });
      });

      markerCirclesForCollision.push({
        cx: cluster.centerPt.x,
        cy: cluster.centerPt.y,
        r: clusterSize / 2,
      });
    });

    // =========================================================================
    // 5. Render Individual Node Markers (Zoom-Adaptive Size)
    // =========================================================================
    unclusteredNodes.forEach((node) => {
      const isSelected = selectedNodeId === node.id;
      const isSupplier = node.entityType === 'supplier';
      const isWarehouse = node.entityType === 'warehouse';
      const isBuyer = node.entityType === 'buyer';

      let bgGradient = 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)';
      let borderColor = '#FFFFFF';
      let iconSymbol = '🏢';

      if (isSupplier) {
        bgGradient = 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)';
        iconSymbol = '🏭';
      } else if (isWarehouse) {
        bgGradient = 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)';
        iconSymbol = '📦';
      } else if (isBuyer) {
        const isHigh = node.priority === BUYER_PRIORITY.HIGH;
        bgGradient = isHigh
          ? 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)'
          : 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
        iconSymbol = isHigh ? '🏥' : '🏬';
      }

      const ringEffect = isSelected
        ? 'border: 3px solid #FACC15; box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.45); transform: scale(1.15);'
        : `border: ${markerBorder}px solid ${borderColor}; box-shadow: 0 3px 8px rgba(0,0,0,0.3);`;

      const markerHtml = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: ${markerSize}px;
          height: ${markerSize}px;
          border-radius: 50%;
          background: ${bgGradient};
          color: #FFFFFF;
          font-size: ${iconSize}px;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          ${ringEffect}
        ">
          ${iconSymbol}
        </div>
      `;

      const marker = L.marker([node.location.lat, node.location.lng], {
        icon: L.divIcon({
          className: 'custom-node-icon',
          html: markerHtml,
          iconSize: [markerSize, markerSize],
          iconAnchor: [markerSize / 2, markerSize / 2],
        }),
        pane: isSelected ? 'selectedPane' : 'nodesPane',
      }).addTo(layers);

      marker.on('click', () => {
        if (onSelectNode) onSelectNode(node);
      });

      // Hover tooltip for node (guarantees full name is always accessible)
      let subtitle = '';
      if (isSupplier) subtitle = `Capacity: ${node.supplyLimit || 0}u`;
      else if (isWarehouse) subtitle = `Stock: ${node.stock || 0}/${node.storageLimit || 0}u`;
      else if (isBuyer) subtitle = `Demand: ${node.demandQty || 0}u (${node.deadline}h)`;

      marker.bindTooltip(
        `<div class="text-xs font-sans p-1"><b>${node.name}</b><br/><span class="text-slate-600 font-medium">${subtitle}</span></div>`,
        { sticky: true }
      );

      // Detailed interactive popup
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
              ? `<div class="mt-1 text-blue-700 font-medium">Stock: <b>${node.stock} / ${node.storageLimit} units</b> (${Math.round(
                  (node.stock / node.storageLimit) * 100
                )}% capacity)</div>`
              : ''
          }
          ${
            isBuyer
              ? `<div class="mt-1 text-slate-800 font-medium">Demand: <b>${node.demandQty} units</b><br/>Deadline: <b>${node.deadline} hours</b><br/>Priority: <span class="uppercase font-bold ${
                  node.priority === 'high' ? 'text-red-600' : 'text-emerald-600'
                }">${node.priority}</span></div>`
              : ''
          }
        </div>
      `);

      const pt = map.latLngToContainerPoint([node.location.lat, node.location.lng]);
      markerCirclesForCollision.push({
        nodeId: node.id,
        cx: pt.x,
        cy: pt.y,
        r: markerSize / 2,
      });
    });

    // =========================================================================
    // 6. Smart Node Label Placement Pass (Collision-Free Greedy Algorithm)
    // =========================================================================
    if (labelMode !== 'off') {
      // Sort nodes by priority: Selected > High Buyer > Warehouse > Supplier > Other
      const sortedNodes = [...unclusteredNodes].sort((a, b) => {
        return (
          getNodePriorityScore(b, selectedNodeId) - getNodePriorityScore(a, selectedNodeId)
        );
      });

      const placedLabelRects = [];

      sortedNodes.forEach((node) => {
        const isSelected = selectedNodeId === node.id;
        const shortName = getShortNodeName(node.name);
        if (!shortName) return;

        const pt = map.latLngToContainerPoint([node.location.lat, node.location.lng]);
        const R = markerSize / 2;
        const labelW = Math.max(48, Math.round(shortName.length * 6.5) + 14);
        const labelH = 18;
        const gap = 4;

        let chosenRect = null;

        if (labelMode === 'all') {
          // 'all' mode: always place below (classic view)
          chosenRect = {
            nodeId: node.id,
            x: pt.x - labelW / 2,
            y: pt.y + R + gap,
            width: labelW,
            height: labelH,
          };
        } else {
          // 'smart' mode: Greedily test [below, above, right, left]
          const candidates = [
            {
              nodeId: node.id,
              x: pt.x - labelW / 2,
              y: pt.y + R + gap,
              width: labelW,
              height: labelH,
            },
            {
              nodeId: node.id,
              x: pt.x - labelW / 2,
              y: pt.y - R - gap - labelH,
              width: labelW,
              height: labelH,
            },
            {
              nodeId: node.id,
              x: pt.x + R + gap,
              y: pt.y - labelH / 2,
              width: labelW,
              height: labelH,
            },
            {
              nodeId: node.id,
              x: pt.x - R - gap - labelW,
              y: pt.y - labelH / 2,
              width: labelW,
              height: labelH,
            },
          ];

          for (const cand of candidates) {
            if (
              isPositionFree(
                cand,
                mapWidth,
                mapHeight,
                placedLabelRects,
                markerCirclesForCollision
              )
            ) {
              chosenRect = cand;
              break;
            }
          }

          // Selected node's label must ALWAYS show (even if crowded)
          if (!chosenRect && isSelected) {
            chosenRect = candidates[0]; // fallback to below
          }
        }

        // Render the pill label if a valid collision-free spot was found
        if (chosenRect) {
          placedLabelRects.push(chosenRect);

          const centerPoint = [
            chosenRect.x + chosenRect.width / 2,
            chosenRect.y + chosenRect.height / 2,
          ];
          const labelLatLng = map.containerPointToLatLng(centerPoint);

          const pillBg = isSelected ? 'rgba(30, 58, 138, 0.95)' : 'rgba(15, 23, 42, 0.9)';
          const pillBorder = isSelected ? '#FACC15' : 'rgba(255, 255, 255, 0.2)';

          const labelIcon = L.divIcon({
            className: 'smart-node-label',
            html: `
              <div style="
                background: ${pillBg};
                color: #FFFFFF;
                font-size: 10px;
                font-weight: 700;
                padding: 1.5px 6.5px;
                border-radius: 9999px;
                white-space: nowrap;
                pointer-events: none;
                box-shadow: 0 1.5px 5px rgba(0,0,0,0.3);
                border: 1px solid ${pillBorder};
                transform: translate(-50%, -50%);
                text-align: center;
                line-height: 1.25;
              ">
                ${shortName}
              </div>
            `,
            iconSize: [0, 0],
          });

          L.marker(labelLatLng, {
            icon: labelIcon,
            pane: 'labelsPane',
            interactive: false,
          }).addTo(layers);
        }
      });
    }
  }, [
    network,
    nodeLookup,
    selectedNodeId,
    selectedRouteId,
    disruptedRouteIds,
    labelMode,
    hoveredRouteId,
    setupCustomPanes,
    onSelectNode,
    onSelectRoute,
  ]);

  // Keep ref up to date for map event listeners
  renderLayersRef.current = renderMapLayers;

  // Initialize Leaflet Map instance
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

    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
      renderLayersRef.current?.();
    });

    map.on('moveend', () => {
      renderLayersRef.current?.();
    });

    map.on('resize', () => {
      renderLayersRef.current?.();
    });

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        renderLayersRef.current?.();
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Re-run layer updates when dependencies change
  useEffect(() => {
    renderMapLayers();
  }, [renderMapLayers]);

  return (
    <div className="relative w-full h-[540px] lg:h-[620px] rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-sm bg-slate-900">
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Overlay Controls: Fit Corridor + Label Mode Segmented Switch */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-md">
        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Regional Network Twin</span>
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

        <div className="h-4 w-px bg-slate-200" />

        {/* Segmented Control for Label Modes: Smart | All | Off */}
        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
          <span className="text-slate-500 pl-1.5 pr-1 hidden xs:inline">Labels:</span>
          <button
            type="button"
            onClick={() => setLabelMode('smart')}
            className={`px-2 py-0.5 rounded-md transition-all ${
              labelMode === 'smart'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
            title="Smart collision-free label placement"
          >
            Smart
          </button>
          <button
            type="button"
            onClick={() => setLabelMode('all')}
            className={`px-2 py-0.5 rounded-md transition-all ${
              labelMode === 'all'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
            title="Always show all labels and badges"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setLabelMode('off')}
            className={`px-2 py-0.5 rounded-md transition-all ${
              labelMode === 'off'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
            title="Hide labels (hover or click to view details)"
          >
            Off
          </button>
        </div>
      </div>

      {/* Collapsible Dark Legend Card (bottom-left, default collapsed on <1024px screens) */}
      {isLegendCollapsed ? (
        <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-lg text-xs flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-200 text-[11px] uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Legend</span>
          </div>
          <span className="text-[10px] text-slate-400">
            ({suppliers.length + warehouses.length + buyers.length} nodes • {routes.length} routes)
          </span>
          <button
            type="button"
            onClick={() => setIsLegendCollapsed(false)}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Expand Legend"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl border border-slate-700/60 shadow-lg text-xs space-y-2 max-w-[280px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="font-bold text-slate-200 flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Corridor Topology</span>
            </div>
            <button
              type="button"
              onClick={() => setIsLegendCollapsed(true)}
              className="p-0.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
              title="Collapse Legend"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
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
          <div className="border-t border-slate-800 pt-1 flex items-center justify-between text-[10px] text-slate-400">
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
      )}
    </div>
  );
}
