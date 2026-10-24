// Disruption-Aware Logistics Twin - Problem Simulator Page
// Track 3-05: 5 Disruption Problems with Severity Sliders & Multi-Disruption Combining
// Applies disruptions strictly to a COPY of the network without mutating baseline data.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  AlertTriangle,
  Flame,
  CloudRain,
  Warehouse,
  TrendingUp,
  Ban,
  RotateCcw,
  Play,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Info,
  Clock,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import SupplyNetworkMap from '../components/SupplyNetworkMap';
import { useReRoute } from '../context/ReRouteContext';
import { DEFAULT_DISRUPTIONS, DISRUPTION_TYPES } from '../engine/disruptions.js';
import { ROUTE_STATUS, BUYER_PRIORITY } from '../engine/network.js';

export default function Disruptions() {
  const navigate = useNavigate();
  const {
    network = {},
    isDemoData,
    disruptionsConfig = DEFAULT_DISRUPTIONS,
    scenarioResult,
    isScenarioSimulated,
    applyDisruptions,
    clearDisruptions,
  } = useReRoute();

  const {
    suppliers = [],
    warehouses = [],
    buyers = [],
    routes = [],
    vehicles = [],
    settings = {},
  } = network || {};

  // Local draft state for disruption sliders and toggles
  const [config, setConfig] = useState(disruptionsConfig || DEFAULT_DISRUPTIONS);

  useEffect(() => {
    if (disruptionsConfig) {
      setConfig(disruptionsConfig);
    }
  }, [disruptionsConfig]);

  // Handler to toggle / adjust specific disruption
  const updateProblem = (key, patch) => {
    setConfig((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...patch,
      },
    }));
  };

  const handleApply = () => {
    applyDisruptions(config);
  };

  const handleReset = () => {
    clearDisruptions();
    setConfig(DEFAULT_DISRUPTIONS);
  };

  // Quick Preset Scenarios
  const applyPreset = (presetName) => {
    let presetConfig = { ...DEFAULT_DISRUPTIONS };

    if (presetName === 'kasara_mudslide') {
      presetConfig = {
        ...presetConfig,
        heavyRain: { enabled: true, severityPct: 90 },
        roadClosed: {
          enabled: true,
          routeId: 'r-igatpuri-bhiwandi',
          status: ROUTE_STATUS.CLOSED,
        },
      };
    } else if (presetName === 'depot_fire_surge') {
      presetConfig = {
        ...presetConfig,
        warehouseStockLow: {
          enabled: true,
          warehouseId: 'wh-bhiwandi',
          reductionPct: 80,
        },
        demandSpike: {
          enabled: true,
          buyerId: 'buy-thane-med',
          spikePct: 60,
        },
      };
    } else if (presetName === 'triple_crisis') {
      presetConfig = {
        ...presetConfig,
        roadClosed: {
          enabled: true,
          routeId: 'r-igatpuri-bhiwandi',
          status: ROUTE_STATUS.CLOSED,
        },
        warehouseStockLow: {
          enabled: true,
          warehouseId: 'wh-satpur',
          reductionPct: 60,
        },
        fuelPriceUp: {
          enabled: true,
          increasePct: 35,
        },
        heavyRain: {
          enabled: true,
          severityPct: 75,
        },
      };
    }

    setConfig(presetConfig);
    applyDisruptions(presetConfig);
  };

  // Results from simulated scenario or baseline fallback
  const activeNetwork = scenarioResult?.disruptedNetwork || network;
  const affectedDeliveries = scenarioResult?.affectedDeliveries || [];
  const affectedRoutesList = scenarioResult?.affectedRoutes || [];
  const affectedRouteIds = affectedRoutesList.map((r) => r.id);

  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Header & Live Status Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
              <span>Problem Simulator</span>
            </h1>

            {/* MANDATORY DEMO DATA BADGE */}
            {isDemoData && (
              <span
                id="badge-demo-data"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 shadow-xs"
              >
                <Sparkles className="w-3 h-3 text-amber-600" />
                DEMO DATA
              </span>
            )}

            {/* MANDATORY SIMULATED BADGE */}
            {isScenarioSimulated && (
              <span
                id="badge-simulated"
                className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-red-600 text-white shadow-md animate-pulse"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                SIMULATED DISRUPTION ACTIVE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Simulate 5 real-world disruption hazards (road closures, stock depletion, demand surges,
            fuel price shocks, torrential rain) on a safe duplicate copy of the regional supply network.
          </p>
        </div>

        {/* Global Controls & Solver Trigger */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            id="btn-reset-disruptions"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Baseline</span>
          </button>
          <button
            type="button"
            id="btn-apply-disruptions"
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl text-xs font-black shadow-xs transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Apply Simulation</span>
          </button>
          <button
            type="button"
            id="btn-find-recovery-plan"
            onClick={() => {
              if (!isScenarioSimulated) handleApply();
              navigate('/assignments');
            }}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition-all hover:gap-2.5"
          >
            <span>Find Recovery Plan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Quick Presets Bar */}
      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-700">
          <Sliders className="w-4 h-4 text-blue-600" />
          <span>Quick Scenario Presets:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => applyPreset('kasara_mudslide')}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-800 transition-colors"
          >
            🌧️ Kasara Mudslide (Torrential Rain + NH 160 Closed)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('depot_fire_surge')}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-800 transition-colors"
          >
            🔥 Bhiwandi Depot Stock Drop (-80%) + Hospital Surge (+60%)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('triple_crisis')}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-red-700 transition-colors"
          >
            ⚡ Triple Shock (Route Closed + Stock -60% + Fuel +35%)
          </button>
        </div>
      </div>

      {/* 3. 5 Problem Simulator Cards (Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Problem 1: Road Closed */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            config.roadClosed?.enabled
              ? 'bg-red-50/60 border-red-300 shadow-sm'
              : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-red-100 text-red-700">
                <Ban className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-black text-sm text-slate-900">1. Road Closed</h3>
                <p className="text-[11px] text-slate-500">Block or throttle freight corridors</p>
              </div>
            </div>
            <input
              type="checkbox"
              id="check-road-closed"
              checked={Boolean(config.roadClosed?.enabled)}
              onChange={(e) => updateProblem('roadClosed', { enabled: e.target.checked })}
              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer mt-1"
            />
          </div>

          <div className="space-y-2.5 mt-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Target Route Corridor
              </label>
              <select
                value={config.roadClosed?.routeId || ''}
                disabled={!config.roadClosed?.enabled}
                onChange={(e) => updateProblem('roadClosed', { routeId: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white disabled:bg-slate-100 font-semibold text-slate-800"
              >
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.distanceKm}km)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Enforced Corridor Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!config.roadClosed?.enabled}
                  onClick={() => updateProblem('roadClosed', { status: ROUTE_STATUS.CLOSED })}
                  className={`py-1 rounded-lg text-xs font-bold border transition-colors ${
                    config.roadClosed?.status === ROUTE_STATUS.CLOSED
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Fully Closed
                </button>
                <button
                  type="button"
                  disabled={!config.roadClosed?.enabled}
                  onClick={() => updateProblem('roadClosed', { status: ROUTE_STATUS.SLOW })}
                  className={`py-1 rounded-lg text-xs font-bold border transition-colors ${
                    config.roadClosed?.status === ROUTE_STATUS.SLOW
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Severe Slowdown
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Problem 2: Warehouse Stock Low */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            config.warehouseStockLow?.enabled
              ? 'bg-amber-50/60 border-amber-300 shadow-sm'
              : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <Warehouse className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-black text-sm text-slate-900">2. Warehouse Stock Low</h3>
                <p className="text-[11px] text-slate-500">Inventory depletion or fire hazard</p>
              </div>
            </div>
            <input
              type="checkbox"
              id="check-warehouse-low"
              checked={Boolean(config.warehouseStockLow?.enabled)}
              onChange={(e) => updateProblem('warehouseStockLow', { enabled: e.target.checked })}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer mt-1"
            />
          </div>

          <div className="space-y-2.5 mt-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Target Consolidation Depot
              </label>
              <select
                value={config.warehouseStockLow?.warehouseId || ''}
                disabled={!config.warehouseStockLow?.enabled}
                onChange={(e) => updateProblem('warehouseStockLow', { warehouseId: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white disabled:bg-slate-100 font-semibold text-slate-800"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.stock} units)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Stock Depletion Severity:</span>
                <span className="text-amber-700 font-mono">
                  -{config.warehouseStockLow?.reductionPct || 50}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                disabled={!config.warehouseStockLow?.enabled}
                value={config.warehouseStockLow?.reductionPct || 50}
                onChange={(e) =>
                  updateProblem('warehouseStockLow', { reductionPct: Number(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>-10% (Minor delay)</span>
                <span>-50% (Depot crunch)</span>
                <span>-100% (Zero stock)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Problem 3: Demand Spike */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            config.demandSpike?.enabled
              ? 'bg-blue-50/60 border-blue-300 shadow-sm'
              : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <TrendingUp className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-black text-sm text-slate-900">3. Demand Spike</h3>
                <p className="text-[11px] text-slate-500">Emergency surge from buyers</p>
              </div>
            </div>
            <input
              type="checkbox"
              id="check-demand-spike"
              checked={Boolean(config.demandSpike?.enabled)}
              onChange={(e) => updateProblem('demandSpike', { enabled: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer mt-1"
            />
          </div>

          <div className="space-y-2.5 mt-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Target Buyer Destination
              </label>
              <select
                value={config.demandSpike?.buyerId || ''}
                disabled={!config.demandSpike?.enabled}
                onChange={(e) => updateProblem('demandSpike', { buyerId: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white disabled:bg-slate-100 font-semibold text-slate-800"
              >
                {buyers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.demandQty}u • {b.priority})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Demand Surge Intensity:</span>
                <span className="text-blue-700 font-mono">
                  +{config.demandSpike?.spikePct || 50}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                disabled={!config.demandSpike?.enabled}
                value={config.demandSpike?.spikePct || 50}
                onChange={(e) =>
                  updateProblem('demandSpike', { spikePct: Number(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>+10% Surge</span>
                <span>+50% Panic buying</span>
                <span>+100% 2x Demand</span>
              </div>
            </div>
          </div>
        </div>

        {/* Problem 4: Fuel Price Up */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            config.fuelPriceUp?.enabled
              ? 'bg-purple-50/60 border-purple-300 shadow-sm'
              : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <Flame className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-black text-sm text-slate-900">4. Fuel Price Up</h3>
                <p className="text-[11px] text-slate-500">Diesel inflation & operating tariffs</p>
              </div>
            </div>
            <input
              type="checkbox"
              id="check-fuel-up"
              checked={Boolean(config.fuelPriceUp?.enabled)}
              onChange={(e) => updateProblem('fuelPriceUp', { enabled: e.target.checked })}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer mt-1"
            />
          </div>

          <div className="space-y-2.5 mt-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Fuel Tariff Surge:</span>
                <span className="text-purple-700 font-mono">
                  +{config.fuelPriceUp?.increasePct || 25}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                step="5"
                disabled={!config.fuelPriceUp?.enabled}
                value={config.fuelPriceUp?.increasePct || 25}
                onChange={(e) =>
                  updateProblem('fuelPriceUp', { increasePct: Number(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>+10% (₹104.5/L)</span>
                <span>+25% (₹118.8/L)</span>
                <span>+40% (₹133.0/L)</span>
              </div>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg text-[11px] text-slate-600">
              Directly scales vehicle trip transport costs and penalizes longer alternative detour routes.
            </div>
          </div>
        </div>

        {/* Problem 5: Heavy Rain (Monsoon Ghat Disruption) */}
        <div
          className={`p-4 rounded-2xl border transition-all md:col-span-2 lg:col-span-2 ${
            config.heavyRain?.enabled
              ? 'bg-sky-50/60 border-sky-300 shadow-sm'
              : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-sky-100 text-sky-700">
                <CloudRain className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-black text-sm text-slate-900">
                  5. Heavy Rain (Kasara Mountain Corridor Monsoon Hazard)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Regional monsoon rainfall causing ghat section fog, waterlogging, or landslide closure
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              id="check-heavy-rain"
              checked={Boolean(config.heavyRain?.enabled)}
              onChange={(e) => updateProblem('heavyRain', { enabled: e.target.checked })}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer mt-1"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Monsoon Intensity:</span>
                <span className="text-sky-700 font-mono font-black">
                  {config.heavyRain?.severityPct || 60}%{' '}
                  {(config.heavyRain?.severityPct || 60) >= 80 ? '(Ghat Closed)' : '(Slow Transit)'}
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="100"
                step="5"
                disabled={!config.heavyRain?.enabled}
                value={config.heavyRain?.severityPct || 60}
                onChange={(e) =>
                  updateProblem('heavyRain', { severityPct: Number(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>30% Slowdown</span>
                <span>60% Dense fog/waterlog</span>
                <span>80%+ Landslide closure</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] space-y-1 text-slate-600 border border-slate-200/80">
              <div className="font-bold text-slate-800 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Kasara Ghat NH 160 Corridor Threshold:</span>
              </div>
              <p>
                At ≥80% severity, mountain hairpin routes close completely, forcing traffic onto the
                Wada-Jawahar mountain bypass or rural Murbad alternative corridors.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Disruption Impact Visualizer & Map Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Disrupted Network Map (2 cols) */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <span>Simulated Network State</span>
              {isScenarioSimulated && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  {affectedRoutesList.length} affected route(s) highlighted
                </span>
              )}
            </h3>
            <span className="text-xs text-slate-500">
              Red dashed lines indicate closed routes
            </span>
          </div>

          <SupplyNetworkMap
            network={activeNetwork}
            disruptedRouteIds={affectedRouteIds}
          />
        </div>

        {/* Affected Deliveries Panel (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Affected Deliveries ({affectedDeliveries.length})</span>
              </h3>
              <p className="text-[11px] text-slate-500">Impact on buyer orders & deadlines</p>
            </div>
          </div>

          {affectedDeliveries.length > 0 ? (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {affectedDeliveries.map((item) => (
                <div
                  key={item.buyerId}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                    item.status === 'severed'
                      ? 'bg-red-50/80 border-red-300 text-red-900'
                      : item.status === 'stock_deficit'
                      ? 'bg-purple-50/80 border-purple-300 text-purple-900'
                      : 'bg-amber-50/80 border-amber-300 text-amber-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-xs truncate">
                      {item.buyerName}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        item.priority === 'high'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {item.priority}
                    </span>
                  </div>

                  <div className="font-bold text-[11px] leading-snug">{item.headline}</div>
                  <p className="text-[11px] opacity-80">{item.detail}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-black/10 text-[10px] font-semibold">
                    <span>Order: <b>{item.demandQty} units</b></span>
                    <span>Deadline: <b>{item.deadline}h</b></span>
                    <span>
                      Backups: <b>{item.openAlternatePaths} open paths</b>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 opacity-60" />
              <p className="text-xs font-bold text-slate-700">No Disruption Impacts Detected</p>
              <p className="text-[11px]">
                Toggle one or more problems above and click <b>Apply Simulation</b> to audit corridor impacts.
              </p>
            </div>
          )}

          {/* Quick Solver CTA */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                if (!isScenarioSimulated) handleApply();
                navigate('/assignments');
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Solve Resilient Recovery Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
