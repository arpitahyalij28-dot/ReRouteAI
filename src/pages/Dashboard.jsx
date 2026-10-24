// Disruption-Aware Logistics Twin - Supply Network Page (Dashboard)
// Track 3-05: Regional Supply Network Twin (Suppliers, Warehouses, Buyers, Fleet, Routes)
// Pure data-driven, offline-first with zero env vars and visible DEMO DATA badge.

import React, { useState, useMemo } from 'react';
import {
  Factory,
  Warehouse,
  ShoppingBag,
  Truck,
  Route as RouteIcon,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  Database,
  BarChart3,
  Sliders,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import SupplyNetworkMap from '../components/SupplyNetworkMap';
import NetworkEntityModal from '../components/NetworkEntityModal';
import ControlTower from '../components/ControlTower';
import { ClearDataConfirmModal } from '../components/ConfirmModal';
import { useReRoute } from '../context/ReRouteContext';
import {
  getNetworkSummary,
  findPaths,
  ROUTE_STATUS,
  BUYER_PRIORITY,
  getEffectiveTravelTime,
} from '../engine/network.js';

export default function Dashboard() {
  const {
    network = {},
    setNetwork,
    isDemoData,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addWarehouse,
    updateWarehouse,
    deleteWarehouse,
    addBuyer,
    updateBuyer,
    deleteBuyer,
    addRoute,
    updateRoute,
    deleteRoute,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    loadDemoData,
    clearAllData,
    trucks = [],
    shipments = [],
    assignments = [],
  } = useReRoute();

  const {
    suppliers = [],
    warehouses = [],
    buyers = [],
    routes = [],
    vehicles = [],
    settings = {},
  } = network || {};

  // Selection state for map and inspector
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [activeTab, setActiveTab] = useState('warehouses'); // 'warehouses', 'buyers', 'suppliers', 'vehicles', 'routes'

  // Modal states
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [modalEntityType, setModalEntityType] = useState('warehouse');
  const [editingEntity, setEditingEntity] = useState(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Network Summary calculations
  const summary = useMemo(() => getNetworkSummary(network), [network]);

  // Selected item lookup
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return (
      warehouses.find((w) => w.id === selectedNodeId) ||
      buyers.find((b) => b.id === selectedNodeId) ||
      suppliers.find((s) => s.id === selectedNodeId) ||
      null
    );
  }, [selectedNodeId, warehouses, buyers, suppliers]);

  const selectedRoute = useMemo(() => {
    if (!selectedRouteId) return null;
    return routes.find((r) => r.id === selectedRouteId) || null;
  }, [selectedRouteId, routes]);

  // Entity Modal Handlers
  const handleOpenAddModal = (entityType) => {
    setModalEntityType(entityType);
    setEditingEntity(null);
    setIsEntityModalOpen(true);
  };

  const handleOpenEditModal = (entityType, entity) => {
    setModalEntityType(entityType);
    setEditingEntity(entity);
    setIsEntityModalOpen(true);
  };

  const handleSaveEntity = (type, entityData, isEdit) => {
    if (type === 'supplier') {
      if (isEdit) updateSupplier(entityData.id, entityData);
      else addSupplier(entityData);
    } else if (type === 'warehouse') {
      if (isEdit) updateWarehouse(entityData.id, entityData);
      else addWarehouse(entityData);
    } else if (type === 'buyer') {
      if (isEdit) updateBuyer(entityData.id, entityData);
      else addBuyer(entityData);
    } else if (type === 'route') {
      if (isEdit) updateRoute(entityData.id, entityData);
      else addRoute(entityData);
    } else if (type === 'vehicle') {
      if (isEdit) updateVehicle(entityData.id, entityData);
      else addVehicle(entityData);
    }
  };

  const handleToggleRouteStatus = (route) => {
    const nextStatus =
      route.status === ROUTE_STATUS.OPEN
        ? ROUTE_STATUS.SLOW
        : route.status === ROUTE_STATUS.SLOW
        ? ROUTE_STATUS.CLOSED
        : ROUTE_STATUS.OPEN;
    updateRoute(route.id, { status: nextStatus });
  };

  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Header Banner & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Supply Network Twin
            </h1>
            {/* MANDATORY DEMO DATA BADGE */}
            {isDemoData && (
              <span
                id="badge-demo-data"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 shadow-xs"
                title="This regional network is loaded with realistic Nashik corridor demo data."
              >
                <Sparkles className="w-3 h-3 text-amber-600" />
                DEMO DATA
              </span>
            )}
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              Track 3-05 Logistics Twin
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Regional supply network model (Nashik-Mumbai-Pune Corridor) simulating suppliers,
            consolidation depots, delivery points, and multi-path route corridors.
          </p>
        </div>

        {/* Global Network Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="btn-add-entity-dropdown"
            onClick={() => handleOpenAddModal('warehouse')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Entity</span>
          </button>
          <button
            type="button"
            id="btn-load-demo-network"
            onClick={() => loadDemoData('replace')}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Reset Demo Network</span>
          </button>
          <button
            type="button"
            id="btn-clear-network"
            onClick={() => setIsClearModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Network</span>
          </button>
        </div>
      </div>

      {/* Control Tower: Executive Report Card */}
      <ControlTower
        network={network}
        trucks={trucks}
        shipments={shipments}
        assignments={assignments}
      />

      {/* 2. Key Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Suppliers */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Factory className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Suppliers
            </div>
            <div className="text-lg font-black text-slate-900 leading-tight">
              {suppliers.length}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {summary?.totalSupplyLimit || 0} units cap
            </div>
          </div>
        </div>

        {/* Warehouses & Buffer */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
            <Warehouse className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Depot Stock
            </div>
            <div className="text-lg font-black text-slate-900 leading-tight">
              {summary?.totalStock || 0} / {summary?.totalStorageLimit || 0}
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${
                    summary?.totalStorageLimit
                      ? Math.min(100, (summary.totalStock / summary.totalStorageLimit) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Buyers & Priority */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Buyers Demand
            </div>
            <div className="text-lg font-black text-slate-900 leading-tight">
              {summary?.totalDemand || 0} units
            </div>
            <div className="text-[10px] text-red-600 font-semibold truncate">
              {buyers.filter((b) => b.priority === 'high').length} high-priority
            </div>
          </div>
        </div>

        {/* Fleet & Trip Capacity */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Fleet Capacity
            </div>
            <div className="text-lg font-black text-slate-900 leading-tight">
              {summary?.totalFleetCapacity || 0} units
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {vehicles.length} vehicle models
            </div>
          </div>
        </div>

        {/* Route Corridors */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
            <RouteIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Corridors
            </div>
            <div className="text-lg font-black text-slate-900 leading-tight">
              {routes.length} routes
            </div>
            <div className="text-[10px] flex items-center gap-1.5 font-medium truncate">
              <span className="text-emerald-600">{summary?.openRoutes || 0} open</span>
              {Boolean(summary?.slowRoutes) && (
                <span className="text-amber-600">{summary.slowRoutes} slow</span>
              )}
              {Boolean(summary?.closedRoutes) && (
                <span className="text-red-600 font-bold">{summary.closedRoutes} closed</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Interactive Map & Node Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Map (3 Columns on Large) */}
        <div className="lg:col-span-3 space-y-2">
          <SupplyNetworkMap
            network={network}
            selectedNodeId={selectedNodeId}
            selectedRouteId={selectedRouteId}
            onSelectNode={(node) => {
              setSelectedNodeId(node.id);
              setSelectedRouteId(null);
            }}
            onSelectRoute={(route) => {
              setSelectedRouteId(route.id);
              setSelectedNodeId(null);
            }}
          />
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>Click any node or route marker to inspect parameters or edit details.</span>
            <span>Nashik (Satpur) • Igatpuri Kasara Ghat • Bhiwandi Logistics Depot</span>
          </div>
        </div>

        {/* Quick Inspector Side Panel (1 Column) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>Entity Inspector</span>
            </h3>
            {(selectedNodeId || selectedRouteId) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedNodeId(null);
                  setSelectedRouteId(null);
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
              >
                Clear Focus
              </button>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-blue-700 uppercase">
                  {selectedNode.entityType}
                </div>
                <div className="font-black text-slate-900 text-sm">{selectedNode.name}</div>
                <div className="text-[11px] text-slate-600">
                  Location: <b>{selectedNode.location?.name || 'Corridor'}</b>
                </div>
              </div>

              {selectedNode.entityType === 'warehouse' && (
                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="flex justify-between text-slate-700">
                    <span>Stock On Hand:</span>
                    <b className="text-slate-900">{selectedNode.stock} units</b>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Storage Capacity:</span>
                    <b className="text-slate-900">{selectedNode.storageLimit} units</b>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Stationed Vehicles:</span>
                    <b className="text-slate-900">
                      {vehicles.filter((v) => v.availableFrom === selectedNode.id).length} units
                    </b>
                  </div>
                </div>
              )}

              {selectedNode.entityType === 'buyer' && (
                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="flex justify-between text-slate-700">
                    <span>Demand Quantity:</span>
                    <b className="text-slate-900">{selectedNode.demandQty} units</b>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Delivery Deadline:</span>
                    <b className="text-slate-900">{selectedNode.deadline} hours</b>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Priority Level:</span>
                    <span
                      className={`font-black uppercase text-[10px] px-2 py-0.5 rounded-full ${
                        selectedNode.priority === 'high'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {selectedNode.priority}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                    Available Incoming Routes:{' '}
                    <b>{routes.filter((r) => r.to === selectedNode.id).length} corridors</b>
                  </div>
                </div>
              )}

              {selectedNode.entityType === 'supplier' && (
                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="flex justify-between text-slate-700">
                    <span>Supply Capacity:</span>
                    <b className="text-slate-900">{selectedNode.supplyLimit} units</b>
                  </div>
                  <div className="text-slate-700">
                    <span>Product: </span>
                    <b className="text-slate-900">{selectedNode.product}</b>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(selectedNode.entityType, selectedNode)}
                  className="flex-1 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedNode.entityType === 'warehouse') deleteWarehouse(selectedNode.id);
                    else if (selectedNode.entityType === 'buyer') deleteBuyer(selectedNode.id);
                    else if (selectedNode.entityType === 'supplier')
                      deleteSupplier(selectedNode.id);
                    setSelectedNodeId(null);
                  }}
                  className="py-1.5 px-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : selectedRoute ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-blue-400 uppercase">
                  Route Corridor {selectedRoute.id}
                </div>
                <div className="font-bold text-sm leading-snug">{selectedRoute.name}</div>
                <div className="text-[11px] text-slate-300">
                  {selectedRoute.from} ➔ {selectedRoute.to}
                </div>
              </div>

              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex justify-between text-slate-700">
                  <span>Distance:</span>
                  <b className="text-slate-900">{selectedRoute.distanceKm} km</b>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Base Travel Time:</span>
                  <b className="text-slate-900">{selectedRoute.baseTravelTimeH} hours</b>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Effective Travel Time:</span>
                  <b className="text-slate-900">
                    {getEffectiveTravelTime(selectedRoute) === Infinity
                      ? 'BLOCKED'
                      : `${getEffectiveTravelTime(selectedRoute).toFixed(1)} h`}
                  </b>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>Current Status:</span>
                  <button
                    type="button"
                    onClick={() => handleToggleRouteStatus(selectedRoute)}
                    className={`font-black uppercase text-[10px] px-2.5 py-0.5 rounded-full border transition-all ${
                      selectedRoute.status === 'closed'
                        ? 'bg-red-100 text-red-700 border-red-300'
                        : selectedRoute.status === 'slow'
                        ? 'bg-amber-100 text-amber-700 border-amber-300'
                        : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    }`}
                    title="Click to toggle Open / Slow / Closed"
                  >
                    {selectedRoute.status} (Click to toggle)
                  </button>
                </div>
                {selectedRoute.restrictions?.maxVehicleWeightTons && (
                  <div className="flex justify-between text-slate-700">
                    <span>Weight Restriction:</span>
                    <b className="text-amber-700">
                      ≤ {selectedRoute.restrictions.maxVehicleWeightTons} Tons
                    </b>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal('route', selectedRoute)}
                  className="flex-1 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Route</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteRoute(selectedRoute.id);
                    setSelectedRouteId(null);
                  }}
                  className="py-1.5 px-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 space-y-2">
              <Maximize2 className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs">Select any node or route on the map to inspect live metrics.</p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Tabbed Entity Panels & Tables (Section 1 Side Panels/Tables) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-200 overflow-x-auto bg-slate-50/60 no-scrollbar">
          {[
            { id: 'warehouses', label: `Warehouses & Stock (${warehouses.length})`, icon: Warehouse },
            { id: 'buyers', label: `Buyers & Demand (${buyers.length})`, icon: ShoppingBag },
            { id: 'suppliers', label: `Suppliers (${suppliers.length})`, icon: Factory },
            { id: 'vehicles', label: `Transporters & Fleet (${vehicles.length})`, icon: Truck },
            { id: 'routes', label: `Corridors & Restrictions (${routes.length})`, icon: RouteIcon },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs border-b-2 whitespace-nowrap transition-all ${
                activeTab === id
                  ? 'border-blue-600 text-blue-700 bg-white shadow-xs rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Warehouses Table & Buffer Progress */}
        {activeTab === 'warehouses' && (
          <div className="p-6 overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900">
                Regional Consolidation Depots & Buffers
              </h3>
              <button
                type="button"
                onClick={() => handleOpenAddModal('warehouse')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-3.5 h-3.5" /> Add Warehouse
              </button>
            </div>
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Depot ID</th>
                  <th className="py-2.5 px-4">Warehouse Name</th>
                  <th className="py-2.5 px-4">Location</th>
                  <th className="py-2.5 px-4 min-w-[200px]">Stock vs Storage Limit</th>
                  <th className="py-2.5 px-4">Buffer Health</th>
                  <th className="py-2.5 px-4">Stationed Fleet</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {warehouses.map((wh) => {
                  const pct = Math.round((wh.stock / (wh.storageLimit || 1)) * 100);
                  const isLow = pct < 25;
                  const isHigh = pct > 85;
                  const fleetCount = vehicles.filter((v) => v.availableFrom === wh.id).length;

                  return (
                    <tr
                      key={wh.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedNodeId(wh.id);
                        setSelectedRouteId(null);
                      }}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{wh.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{wh.name}</td>
                      <td className="py-3 px-4 text-slate-600">{wh.location?.name || 'Corridor'}</td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-semibold">
                            <span>{wh.stock} units</span>
                            <span className="text-slate-500">cap {wh.storageLimit}u</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isLow ? 'bg-red-500' : isHigh ? 'bg-amber-500' : 'bg-sky-500'
                              }`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isLow
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : isHigh
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {pct}% Filled
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {fleetCount} vehicles
                      </td>
                      <td className="py-3 px-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal('warehouse', wh)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteWarehouse(wh.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Buyers & Demand Table */}
        {activeTab === 'buyers' && (
          <div className="p-6 overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900">
                Buyer Delivery Demand, Deadlines & Priorities
              </h3>
              <button
                type="button"
                onClick={() => handleOpenAddModal('buyer')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-3.5 h-3.5" /> Add Buyer
              </button>
            </div>
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Buyer ID</th>
                  <th className="py-2.5 px-4">Buyer / Destination</th>
                  <th className="py-2.5 px-4">Location</th>
                  <th className="py-2.5 px-4">Demand Qty</th>
                  <th className="py-2.5 px-4">Deadline</th>
                  <th className="py-2.5 px-4">Priority</th>
                  <th className="py-2.5 px-4">Alternate Corridors</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {buyers.map((buyer) => {
                  const incomingPaths = warehouses.flatMap((wh) =>
                    findPaths(network, wh.id, buyer.id, 3)
                  );
                  const isHigh = buyer.priority === BUYER_PRIORITY.HIGH;

                  return (
                    <tr
                      key={buyer.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedNodeId(buyer.id);
                        setSelectedRouteId(null);
                      }}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{buyer.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{buyer.name}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {buyer.location?.name || 'Corridor'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {buyer.demandQty} units
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {buyer.deadline} hours
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isHigh
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {buyer.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-blue-700">
                          {incomingPaths.length} route options
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal('buyer', buyer)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBuyer(buyer.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Suppliers Table */}
        {activeTab === 'suppliers' && (
          <div className="p-6 overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900">
                Tier-1 Production Sources & Supply Capacities
              </h3>
              <button
                type="button"
                onClick={() => handleOpenAddModal('supplier')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-3.5 h-3.5" /> Add Supplier
              </button>
            </div>
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Supplier ID</th>
                  <th className="py-2.5 px-4">Supplier Name</th>
                  <th className="py-2.5 px-4">Location</th>
                  <th className="py-2.5 px-4">Supply Limit (units)</th>
                  <th className="py-2.5 px-4">Product Category</th>
                  <th className="py-2.5 px-4">Connected Depots</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((sup) => {
                  const outbound = routes.filter((r) => r.from === sup.id);

                  return (
                    <tr
                      key={sup.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedNodeId(sup.id);
                        setSelectedRouteId(null);
                      }}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{sup.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{sup.name}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {sup.location?.name || 'Corridor'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {sup.supplyLimit} units
                      </td>
                      <td className="py-3 px-4 text-slate-600">{sup.product}</td>
                      <td className="py-3 px-4 font-semibold text-blue-700">
                        {outbound.length} outbound routes
                      </td>
                      <td className="py-3 px-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal('supplier', sup)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSupplier(sup.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Transporters & Fleet Vehicles */}
        {activeTab === 'vehicles' && (
          <div className="p-6 overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900">
                Transporter Vehicles & Trip Capacities
              </h3>
              <button
                type="button"
                onClick={() => handleOpenAddModal('vehicle')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-3.5 h-3.5" /> Add Vehicle Model
              </button>
            </div>
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Vehicle ID</th>
                  <th className="py-2.5 px-4">Type / Model</th>
                  <th className="py-2.5 px-4">Stationed Depot</th>
                  <th className="py-2.5 px-4">Trip Capacity</th>
                  <th className="py-2.5 px-4">Available Trips</th>
                  <th className="py-2.5 px-4">Operating Cost</th>
                  <th className="py-2.5 px-4">Vehicle Weight</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{v.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{v.type}</td>
                    <td className="py-3 px-4 font-semibold text-blue-700">{v.availableFrom}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{v.capacity} units</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{v.availability}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">₹{v.costPerKm} / km</td>
                    <td className="py-3 px-4 text-slate-600">{v.weightTons || 8} Tons</td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal('vehicle', v)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteVehicle(v.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Corridors & Road Restrictions */}
        {activeTab === 'routes' && (
          <div className="p-6 overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900">
                Route Corridors, Speed Factors & Road Restrictions
              </h3>
              <button
                type="button"
                onClick={() => handleOpenAddModal('route')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-3.5 h-3.5" /> Add Route Corridor
              </button>
            </div>
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Route ID</th>
                  <th className="py-2.5 px-4">Corridor Name</th>
                  <th className="py-2.5 px-4">From ➔ To</th>
                  <th className="py-2.5 px-4">Distance</th>
                  <th className="py-2.5 px-4">Base Time</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Restrictions</th>
                  <th className="py-2.5 px-4">Risk</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {routes.map((r) => {
                  const isClosed = r.status === ROUTE_STATUS.CLOSED;
                  const isSlow = r.status === ROUTE_STATUS.SLOW;

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedRouteId(r.id);
                        setSelectedNodeId(null);
                      }}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{r.name}</td>
                      <td className="py-3 px-4 font-semibold text-slate-600">
                        {r.from} ➔ {r.to}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{r.distanceKm} km</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {r.baseTravelTimeH} h
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleToggleRouteStatus(r)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-colors ${
                            isClosed
                              ? 'bg-red-100 text-red-700 border-red-300'
                              : isSlow
                              ? 'bg-amber-100 text-amber-700 border-amber-300'
                              : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                          }`}
                          title="Click to toggle Open / Slow / Closed"
                        >
                          {r.status}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {r.restrictions?.maxVehicleWeightTons
                          ? `Max ${r.restrictions.maxVehicleWeightTons}T`
                          : 'None'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {Math.round((r.riskScore || 0) * 100)}%
                      </td>
                      <td className="py-3 px-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal('route', r)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRoute(r.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Entity Modal */}
      <NetworkEntityModal
        isOpen={isEntityModalOpen}
        onClose={() => setIsEntityModalOpen(false)}
        entityType={modalEntityType}
        initialData={editingEntity}
        onSave={handleSaveEntity}
        network={network}
      />

      {/* Clear Data Confirmation Modal */}
      <ClearDataConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={() => {
          clearAllData();
          setIsClearModalOpen(false);
          setSelectedNodeId(null);
          setSelectedRouteId(null);
        }}
      />
    </div>
  );
}
