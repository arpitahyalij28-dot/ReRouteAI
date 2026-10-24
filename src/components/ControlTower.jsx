// Logistics Twin - Executive Supply Chain Control Tower Component
// Clean SaaS Design, Pure SVG/Div Visualizations, Responsive Grids

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Package,
  Clock,
  TrendingDown,
  Warehouse,
  ShoppingBag,
  Truck,
  ArrowRight,
  BarChart3,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Leaf,
  Fuel,
  Activity,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { computeControlTowerMetrics } from '../engine/controlTower.js';

export default function ControlTower({
  network,
  trucks = [],
  shipments = [],
  assignments = [],
}) {
  const navigate = useNavigate();
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  // Compute live metrics dynamically
  const data = useMemo(() => {
    return computeControlTowerMetrics({ network, trucks, shipments, assignments });
  }, [network, trucks, shipments, assignments]);

  // Graceful empty state when network is empty or cleared
  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
          <Warehouse className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Control Tower Idle: No Active Network Entities</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Add warehouses, buyers, and transport corridors or click <strong>Reset Demo Network</strong> to activate the live executive control tower.
        </p>
      </div>
    );
  }

  const { health, alerts, inventory, fleet, performance } = data;

  // Verdict style mapping
  const verdictConfig = {
    HEALTHY: {
      bg: 'bg-emerald-500 text-white',
      badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      ringColor: '#10B981',
      icon: CheckCircle2,
      label: 'HEALTHY',
    },
    'AT RISK': {
      bg: 'bg-amber-500 text-white',
      badgeBg: 'bg-amber-50 border-amber-200 text-amber-800',
      ringColor: '#F59E0B',
      icon: AlertTriangle,
      label: 'AT RISK',
    },
    CRITICAL: {
      bg: 'bg-rose-500 text-white',
      badgeBg: 'bg-rose-50 border-rose-200 text-rose-800',
      ringColor: '#EF4444',
      icon: ShieldAlert,
      label: 'CRITICAL',
    },
  }[health.verdict.status] || {
    bg: 'bg-slate-500 text-white',
    badgeBg: 'bg-slate-50 border-slate-200 text-slate-800',
    ringColor: '#64748B',
    icon: AlertCircle,
    label: health.verdict.status,
  };

  const VerdictIcon = verdictConfig.icon;

  // Alerts to display
  const displayedAlerts = showAllAlerts ? alerts.alerts : alerts.alerts.slice(0, 5);

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      {/* ================================================================= */}
      {/* 1. OVERALL HEALTH (Hero Banner & Core Report Card Verdict)       */}
      {/* ================================================================= */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-100 pb-5">
          {/* Verdict + Reason */}
          <div className="flex items-start sm:items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${verdictConfig.bg} flex items-center justify-center shrink-0 shadow-sm`}>
              <VerdictIcon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Control Tower Verdict:
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${verdictConfig.badgeBg}`}>
                  <span className="w-2 h-2 rounded-full bg-current" />
                  {verdictConfig.label}
                </span>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">•</span>
                <span className="text-xs font-semibold text-slate-600">
                  Resilience Rating: <strong className="text-slate-900">{health.verdict.rating}</strong>
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 mt-1 leading-snug">
                {health.verdict.reason}
              </h2>
            </div>
          </div>

          {/* Circular Resilience Ring */}
          <div className="flex items-center gap-4 bg-slate-50/80 p-3 sm:px-4 sm:py-2.5 rounded-2xl border border-slate-200/80 shrink-0 self-start lg:self-auto">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  strokeDasharray={`${health.verdict.resilienceScore}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke={verdictConfig.ringColor}
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-black text-slate-900 leading-none">
                  {health.verdict.resilienceScore}
                </span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">/100</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Resilience Index
              </div>
              <div className="text-xs font-bold text-slate-800">
                Adaptive Capacity
              </div>
            </div>
          </div>
        </div>

        {/* Top KPI Cards (5 Columns) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wide">Active Shipments</span>
              <Package className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-black text-slate-900">{health.kpis.activeShipments}</div>
            <div className="text-[10px] text-slate-500 font-medium">Dispatched Trips</div>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wide">On-Time Delivery</span>
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-slate-900">{health.kpis.onTimeDeliveryPct}%</div>
            <div className="text-[10px] text-slate-500 font-medium">Within Deadlines</div>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wide">Delayed Shipments</span>
              <AlertCircle className={`w-3.5 h-3.5 ${health.kpis.delayedShipments > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
            </div>
            <div className="text-xl font-black text-slate-900">{health.kpis.delayedShipments}</div>
            <div className="text-[10px] text-slate-500 font-medium">Lateness breaches</div>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wide">Orders At Risk</span>
              <TrendingDown className={`w-3.5 h-3.5 ${health.kpis.ordersAtRisk.highPriorityCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
            </div>
            <div className="text-xl font-black text-slate-900">{health.kpis.ordersAtRisk.text}</div>
            <div className="text-[10px] text-rose-700 font-bold truncate">
              {health.kpis.ordersAtRisk.highPriorityCount} High-Priority
            </div>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wide">Demand Fulfilled</span>
              <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-black text-slate-900">{health.kpis.demandFulfilledPct}%</div>
            <div className="text-[10px] text-slate-500 font-medium">Gross volume satisfied</div>
          </div>
        </div>

        {/* Segmented Bar for Corridor Status */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
            <span>Corridor Artery Status ({health.corridorStatus.total} total regional routes)</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="inline-flex items-center gap-1 text-blue-700">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                Open ({health.corridorStatus.open})
              </span>
              <span className="inline-flex items-center gap-1 text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Slow ({health.corridorStatus.slow})
              </span>
              <span className="inline-flex items-center gap-1 text-rose-700">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Closed ({health.corridorStatus.closed})
              </span>
            </div>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden p-0.5 gap-0.5 border border-slate-200/60">
            {health.corridorStatus.total > 0 && (
              <>
                <div
                  style={{ width: `${(health.corridorStatus.open / health.corridorStatus.total) * 100}%` }}
                  className="bg-blue-600 h-full rounded-sm transition-all duration-300"
                  title={`Open: ${health.corridorStatus.open} routes`}
                />
                <div
                  style={{ width: `${(health.corridorStatus.slow / health.corridorStatus.total) * 100}%` }}
                  className="bg-amber-500 h-full rounded-sm transition-all duration-300"
                  title={`Slow: ${health.corridorStatus.slow} routes`}
                />
                <div
                  style={{ width: `${(health.corridorStatus.closed / health.corridorStatus.total) * 100}%` }}
                  className="bg-rose-500 h-full rounded-sm transition-all duration-300"
                  title={`Closed: ${health.corridorStatus.closed} routes`}
                />
              </>
            )}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 2. CRITICAL ALERTS & RISKS                                        */}
      {/* ================================================================= */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Critical Alerts & Risk Register</h3>
              <p className="text-xs text-slate-500">
                Prioritized disruptions, bottleneck vulnerabilities, and recommended tactical mitigations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              {alerts.totalCount} active items ({alerts.criticalCount} Critical)
            </span>
          </div>
        </div>

        {alerts.alerts.length === 0 ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <div className="text-xs font-semibold">
              Zero active risks detected. All supply corridors, depot buffers, and buyer delivery commitments are operating within nominal parameters.
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedAlerts.map((alert) => {
              const badgeStyle = {
                Critical: 'bg-rose-50 text-rose-800 border-rose-200',
                Warning: 'bg-amber-50 text-amber-800 border-amber-200',
                Watch: 'bg-blue-50 text-blue-800 border-blue-200',
              }[alert.severity] || 'bg-slate-50 text-slate-800 border-slate-200';

              return (
                <div
                  key={alert.id}
                  className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${badgeStyle}`}>
                        {alert.severity}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white border border-slate-200 text-slate-600">
                        {alert.category}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                        {alert.title}
                      </h4>
                    </div>
                    <div className="text-slate-600 leading-relaxed">
                      <strong className="text-slate-700">Why: </strong>
                      {alert.reason}
                    </div>
                    <div className="text-slate-800 bg-white/80 p-2 rounded-lg border border-slate-200/60 leading-relaxed font-medium">
                      <strong className="text-blue-700">Do: </strong>
                      {alert.action}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <button
                      type="button"
                      onClick={() => navigate(alert.link)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 font-bold text-xs shadow-2xs transition-colors"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {alerts.alerts.length > 5 && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setShowAllAlerts(!showAllAlerts)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  <span>{showAllAlerts ? 'Show Top 5' : `Show all ${alerts.alerts.length} alerts`}</span>
                  {showAllAlerts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* 3. INVENTORY & DEMAND                                             */}
      {/* ================================================================= */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Warehouse className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Inventory Health & Demand Coverage</h3>
              <p className="text-xs text-slate-500">
                Hub storage capacities, post-dispatch buffer health, and inter-depot rebalancing proposals.
              </p>
            </div>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              Stock vs Demand
            </div>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {inventory.kpis.stockVsDemand}
            </div>
            <div className="text-[10px] text-blue-700 font-bold mt-0.5">
              {inventory.kpis.coveragePct}% Coverage
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              Stockout Risk
            </div>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                inventory.kpis.stockoutRisk === 'High'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : inventory.kpis.stockoutRisk === 'Medium'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}>
                {inventory.kpis.stockoutRisk}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Network aggregate</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              Low-Stock Depots
            </div>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {inventory.kpis.lowStockDepotsCount}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">&lt; 25% safety buffer</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              Overstocked Depots
            </div>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {inventory.kpis.overstockedDepotsCount}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">&gt; 85% capacity footprint</div>
          </div>
        </div>

        {/* 2 Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
          {/* Chart 1: Per Depot Stock Now vs Left After Dispatch */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Depot Stock: Current vs Remaining After Plan
              </h4>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2 rounded-xs bg-blue-600" /> Stock Now
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2 rounded-xs bg-emerald-500" /> After Plan
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {inventory.depotStockChart.map((d) => {
                const nowPct = Math.min(100, Math.round((d.stockNow / d.storageLimit) * 100));
                const afterPct = Math.min(100, Math.round((d.stockAfter / d.storageLimit) * 100));
                const badgeStyle = {
                  LOW: 'bg-rose-50 text-rose-700 border-rose-200',
                  BALANCED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  OVERSTOCKED: 'bg-amber-50 text-amber-700 border-amber-200',
                }[d.stateTag];

                return (
                  <div key={d.depotId} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-800">{d.depotName}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-black border ${badgeStyle}`}>
                        {d.stateTag}
                      </span>
                    </div>

                    {/* Dual segmented bar */}
                    <div className="w-full h-4 rounded-md bg-slate-200/70 relative overflow-hidden flex items-center">
                      {/* Current Stock Bar */}
                      <div
                        style={{ width: `${nowPct}%` }}
                        className="h-full bg-blue-600/30 absolute left-0 top-0 transition-all duration-300"
                        title={`Initial Stock: ${d.stockNow} units`}
                      />
                      {/* After Dispatch Bar */}
                      <div
                        style={{ width: `${afterPct}%` }}
                        className="h-full bg-emerald-500 absolute left-0 top-0 rounded-xs transition-all duration-300"
                        title={`Remaining Buffer: ${d.stockAfter} units`}
                      />
                      <span className="relative z-10 text-[10px] font-mono font-bold text-slate-900 px-2 truncate">
                        {d.stockAfter} / {d.storageLimit}u left ({d.dispatched}u dispatched)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 2: Per Buyer Stacked Delivery Breakdown */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Buyer Delivery Demand Fulfillment
              </h4>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> On-Time
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Late
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Short
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              {inventory.buyerFulfillmentChart.map((b) => {
                const total = Math.max(1, b.demandQty);
                const onTimeW = (b.onTimeQty / total) * 100;
                const lateW = (b.lateQty / total) * 100;
                const shortW = (b.shortQty / total) * 100;

                const priorityBadge = {
                  high: 'bg-rose-50 text-rose-700 border-rose-200',
                  medium: 'bg-amber-50 text-amber-700 border-amber-200',
                  low: 'bg-slate-50 text-slate-700 border-slate-200',
                }[b.priority] || 'bg-slate-50 text-slate-700';

                return (
                  <div key={b.buyerId} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="truncate max-w-[200px] text-slate-800">{b.buyerName}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase border ${priorityBadge}`}>
                          {b.priority}
                        </span>
                        <span className="font-mono text-slate-600 text-[10px]">
                          {b.onTimeQty + b.lateQty} / {b.demandQty}u
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-3 rounded-full bg-slate-200/80 overflow-hidden flex gap-0.5 p-0.5">
                      {onTimeW > 0 && (
                        <div
                          style={{ width: `${onTimeW}%` }}
                          className="bg-emerald-500 h-full rounded-sm transition-all duration-300"
                          title={`On-time: ${b.onTimeQty} units`}
                        />
                      )}
                      {lateW > 0 && (
                        <div
                          style={{ width: `${lateW}%` }}
                          className="bg-amber-500 h-full rounded-sm transition-all duration-300"
                          title={`Late: ${b.lateQty} units`}
                        />
                      )}
                      {shortW > 0 && (
                        <div
                          style={{ width: `${shortW}%` }}
                          className="bg-rose-500 h-full rounded-sm transition-all duration-300"
                          title={`Short: ${b.shortQty} units`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recommended Stock Transfers */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recommended Inter-Depot Stock Transfers (Active Open Corridors Only)
            </span>
          </div>

          {inventory.recommendedTransfers.length === 0 ? (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
              All depot inventory balanced along active routes. No inter-depot transfers required.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {inventory.recommendedTransfers.map((t, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-blue-700 truncate">{t.fromDepotName}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-1" />
                    <span className="text-slate-900 truncate">{t.toDepotName}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold bg-white p-2 rounded-lg border border-slate-200/60">
                    <span className="text-blue-700 font-bold">{t.units} units</span>
                    <span>{t.distanceKm} km • {t.travelTimeH}h</span>
                    <span className="text-slate-900 font-bold">₹{t.estimatedCost.toLocaleString('en-IN')}</span>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-tight">
                    {t.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 4. FLEET & EMPTY-MILE OPTIMISATION                                */}
      {/* ================================================================= */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Fleet Dispatch & Empty-Mile Optimisation</h3>
              <p className="text-xs text-slate-500">
                Vehicle utilisation, backhaul pairings, and automated empty return elimination.
              </p>
            </div>
          </div>
        </div>

        {/* 5 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Vehicles Status</div>
            <div className="text-lg font-black text-slate-900 mt-0.5">{fleet.kpis.vehiclesFreeVsBusy}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Available for trip</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Capacity Utilisation</div>
            <div className="text-lg font-black text-slate-900 mt-0.5">{fleet.kpis.capacityUtilisationPct}%</div>
            <div className="text-[10px] text-blue-700 font-semibold mt-0.5">Average trip payload</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Empty Return Risk</div>
            <div className="text-lg font-black text-slate-900 mt-0.5">{fleet.kpis.emptyReturnRiskCount}</div>
            <div className="text-[10px] text-amber-700 font-semibold mt-0.5">&gt; 70% deadhead risk</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Open Return Loads</div>
            <div className="text-lg font-black text-slate-900 mt-0.5">{fleet.kpis.openReturnLoadsCount}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Awaiting backhaul match</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Empty KM Avoidable</div>
            <div className="text-lg font-black text-emerald-700 mt-0.5">{fleet.kpis.avoidableEmptyKm} km</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">+{fleet.kpis.extraDetourKm} km detour</div>
          </div>
        </div>

        {/* Vehicles by Depot Chart */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>Stationed Transporter Fleet by Hub (Busy vs Free)</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-blue-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-600" /> Busy (Allocated)
              </span>
              <span className="flex items-center gap-1 text-slate-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-slate-300" /> Free (Ready)
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {fleet.vehiclesByDepotChart.map((d) => {
              const total = Math.max(1, d.total);
              const busyPct = (d.busy / total) * 100;
              const freePct = (d.free / total) * 100;

              return (
                <div key={d.depotId} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                    <span>{d.depotName}</span>
                    <span className="font-mono text-slate-500">
                      {d.busy} busy, {d.free} free / {d.total} total
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200 flex overflow-hidden p-0.5 gap-0.5">
                    {busyPct > 0 && (
                      <div
                        style={{ width: `${busyPct}%` }}
                        className="h-full bg-blue-600 rounded-sm transition-all duration-300"
                        title={`Busy: ${d.busy}`}
                      />
                    )}
                    {freePct > 0 && (
                      <div
                        style={{ width: `${freePct}%` }}
                        className="h-full bg-slate-300 rounded-sm transition-all duration-300"
                        title={`Free: ${d.free}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Return Loads Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Best Return Load Recommendations for In-Transit Trucks
            </h4>
            <span className="text-[10px] text-slate-500">One load per truck • Skipped trucks with active assignments</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700 bg-white">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Vehicle</th>
                  <th className="py-2.5 px-3">Heading / Unload Hub</th>
                  <th className="py-2.5 px-3">Suggested Load</th>
                  <th className="py-2.5 px-3">Payload Fill</th>
                  <th className="py-2.5 px-3">Detour</th>
                  <th className="py-2.5 px-3">Net Profit</th>
                  <th className="py-2.5 px-3">CO₂ Avoided</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fleet.matchedReturnLoads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-slate-400 italic">
                      No unassigned in-transit trucks requiring backhaul matching.
                    </td>
                  </tr>
                ) : (
                  fleet.matchedReturnLoads.map((row) => (
                    <tr key={row.truckId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{row.regNumber}</td>
                      <td className="py-2.5 px-3 text-slate-600 truncate max-w-[150px]">{row.truckDestination}</td>
                      <td className="py-2.5 px-3 font-semibold text-blue-700 truncate max-w-[200px]">{row.suggestedLoadName}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-800">{row.fillPct}%</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">+{row.detourKm} km</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-700">₹{row.netGainInr.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-slate-600">{row.co2AvoidedKg} kg</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 5. COST, ETA & PERFORMANCE                                        */}
      {/* ================================================================= */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Cost, Transit ETA & Performance Benchmarks</h3>
              <p className="text-xs text-slate-500">
                Operating expenditures, buyer arrival deadlines, and comparison vs unoptimized naive baseline.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 self-start sm:self-auto">
            <Info className="w-3 h-3 text-slate-400" />
            {performance.kpis.label}
          </span>
        </div>

        {/* 5 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Average Trip ETA</div>
            <div className="text-lg font-black text-slate-900 mt-0.5">{performance.kpis.averageEtaH} hrs</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Corridor line-haul</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Trip & Unit Cost</div>
            <div className="text-lg font-black text-slate-900 mt-0.5 truncate">₹{performance.kpis.costPerShipment}</div>
            <div className="text-[10px] text-blue-700 font-bold mt-0.5">₹{performance.kpis.costPerUnit} / unit</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Detour Mileage & Fuel</div>
            <div className="text-lg font-black text-slate-900 mt-0.5">{performance.kpis.extraDetourKm} km</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">₹{performance.kpis.detourFuelCost.toLocaleString('en-IN')} fuel</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Fuel & CO₂ Avoided</div>
            <div className="text-lg font-black text-emerald-700 mt-0.5">{performance.kpis.fuelSavedL} L</div>
            <div className="text-[10px] text-emerald-800 font-semibold mt-0.5">{performance.kpis.co2SavedKg} kg CO₂ saved</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Net Financial Gain</div>
            <div className="text-lg font-black text-emerald-700 mt-0.5">₹{performance.kpis.netBenefitInr.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-emerald-800 font-semibold mt-0.5">Backhaul spot yield</div>
          </div>
        </div>

        {/* 2 Comparison Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
          {/* Chart 1: Planned ETA vs Buyer Deadline */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Planned Trip ETA vs Buyer Arrival Deadline
              </h4>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2 rounded-xs bg-blue-600" /> Planned ETA
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-1.5 h-3 border-r-2 border-slate-900" /> Deadline
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {performance.etaVsDeadlineChart.map((b) => {
                const maxScale = Math.max(12, b.deadlineH * 1.3);
                const etaPct = b.plannedEtaH !== null ? Math.min(100, (b.plannedEtaH / maxScale) * 100) : 0;
                const deadlinePct = Math.min(100, (b.deadlineH / maxScale) * 100);

                return (
                  <div key={b.buyerId} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="truncate max-w-[200px] text-slate-800">{b.buyerName}</span>
                      <div className="text-[10px] font-mono">
                        {b.isScheduled ? (
                          <span className={b.isLate ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                            {b.plannedEtaH}h / {b.deadlineH}h {b.isLate ? '(Late)' : '(On-Time)'}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not scheduled</span>
                        )}
                      </div>
                    </div>

                    <div className="w-full h-3 rounded-md bg-slate-200/80 relative overflow-hidden flex items-center">
                      {b.isScheduled && (
                        <div
                          style={{ width: `${etaPct}%` }}
                          className={`h-full rounded-sm transition-all duration-300 ${
                            b.isLate ? 'bg-amber-500' : 'bg-blue-600'
                          }`}
                          title={`ETA: ${b.plannedEtaH}h`}
                        />
                      )}
                      {/* Deadline marker */}
                      <div
                        style={{ left: `${deadlinePct}%` }}
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10"
                        title={`Deadline: ${b.deadlineH}h`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 2: Optimised Plan vs Nearest-Depot Baseline */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Resilient Solver vs Nearest-Depot Baseline
                </h4>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Track 3-05 Benchmark
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Optimised Column */}
                <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-2 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[11px] uppercase tracking-wide">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Resilient Solver</span>
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <span className="text-[10px] text-slate-500 block">On-Time Delivery</span>
                      <strong className="text-base font-black text-slate-900">
                        {performance.comparison.optimised.onTimePct}%
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Unmet Pending Demand</span>
                      <strong className="text-sm font-bold text-emerald-700">
                        {performance.comparison.optimised.unmetUnits} units
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Network Cost</span>
                      <strong className="text-sm font-bold text-slate-800">
                        ₹{performance.comparison.optimised.cost.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Baseline Column */}
                <div className="p-3 bg-slate-100/80 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] uppercase tracking-wide">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Naive Baseline</span>
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <span className="text-[10px] text-slate-500 block">On-Time Delivery</span>
                      <strong className="text-base font-black text-slate-700">
                        {performance.comparison.baseline.onTimePct}%
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Unmet Pending Demand</span>
                      <strong className="text-sm font-bold text-rose-700">
                        {performance.comparison.baseline.unmetUnits} units
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Network Cost</span>
                      <strong className="text-sm font-bold text-slate-700">
                        ₹{performance.comparison.baseline.cost.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 p-2.5 bg-white rounded-lg border border-slate-200/60 leading-relaxed mt-3">
              <strong className="text-slate-700">Baseline Definition: </strong>
              {performance.comparison.baseline.note}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
