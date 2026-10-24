// ReRoute AI 2.0 - Fleet Overview Component
// Dynamic multi-truck fleet monitor with live KPIs, risk badges, filters, and global match status.

import React, { useState, useMemo } from 'react';
import {
  Truck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  RefreshCw,
  TrendingDown,
  Navigation,
  Info,
} from 'lucide-react';
import { formatCountdown } from '../utils/scoring';

export default function FleetOverview({
  trucks = [],
  selectedTruckId,
  onSelectTruck,
  fleetAssignmentsByTruckId = {},
  onAddTruck,
  onLoadDemo,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('RISK_DESC');

  // KPI Calculations across the entire fleet
  const totalTrucks = trucks.length;

  const trucksAtRisk = useMemo(() => {
    return trucks.filter((t) => (Number(t.emptyReturnProbability) || 0) > 60).length;
  }, [trucks]);

  const matchedTrucksCount = useMemo(() => {
    return trucks.filter((t) => fleetAssignmentsByTruckId[t.id] != null).length;
  }, [trucks, fleetAssignmentsByTruckId]);

  const totalEmptyKmAtRisk = useMemo(() => {
    return trucks.reduce((sum, t) => {
      const risk = Number(t.emptyReturnProbability) || 0;
      if (risk > 60) {
        const km = Number(t.outboundRemainingKm) || Number(t.totalTripKm) || 120;
        return sum + km;
      }
      return sum;
    }, 0);
  }, [trucks]);

  // Filter & Search Logic
  const filteredTrucks = useMemo(() => {
    return trucks
      .filter((t) => {
        // Search by ID, driver name, model, or city
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchId = t.id?.toLowerCase().includes(q);
          const matchDriver = t.driverName?.toLowerCase().includes(q);
          const matchModel = t.model?.toLowerCase().includes(q);
          const matchOrigin = t.origin?.toLowerCase().includes(q);
          const matchDest = t.destination?.toLowerCase().includes(q);
          if (!matchId && !matchDriver && !matchModel && !matchOrigin && !matchDest) {
            return false;
          }
        }

        // Status Filter
        if (statusFilter !== 'ALL') {
          if (t.status !== statusFilter) return false;
        }

        // Risk Filter
        const risk = Number(t.emptyReturnProbability) || 0;
        if (riskFilter === 'HIGH' && risk <= 60) return false;
        if (riskFilter === 'MEDIUM' && (risk < 40 || risk > 60)) return false;
        if (riskFilter === 'LOW' && risk >= 40) return false;

        return true;
      })
      .sort((a, b) => {
        const riskA = Number(a.emptyReturnProbability) || 0;
        const riskB = Number(b.emptyReturnProbability) || 0;
        const countdownA = Number(a.countdownSeconds) || 99999;
        const countdownB = Number(b.countdownSeconds) || 99999;

        if (sortBy === 'RISK_DESC') return riskB - riskA;
        if (sortBy === 'RISK_ASC') return riskA - riskB;
        if (sortBy === 'ETA_SOONEST') return countdownA - countdownB;
        return 0;
      });
  }, [trucks, searchQuery, statusFilter, riskFilter, sortBy]);

  // Helper for risk badge styling
  const getRiskBadge = (prob) => {
    const val = Number(prob) || 0;
    if (val > 60) {
      return {
        bg: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-500',
        label: `${val}% High Risk`,
      };
    }
    if (val >= 40) {
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        label: `${val}% Med Risk`,
      };
    }
    return {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      label: `${val}% Low Risk`,
    };
  };

  if (totalTrucks === 0) {
    return (
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-soft p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
          <Truck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[#0F172A]">Fleet Overview (0 Vehicles)</h3>
          <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
            No commercial vehicles are currently registered in your fleet. Add your active trucks or load pre-packaged demonstration data.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            onClick={onAddTruck}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Truck</span>
          </button>
          <button
            onClick={onLoadDemo}
            className="px-4 py-2 text-xs font-bold text-[#0F172A] bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-all inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Load Demo Data</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-soft overflow-hidden">
      {/* 1. Header & KPI Strip */}
      <div className="p-4 sm:p-5 border-b border-[#F1F5F9] bg-gradient-to-r from-slate-50/70 to-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 rounded-lg border border-blue-200 text-blue-600">
                <Truck className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-[#0F172A]">Fleet Operations Overview</h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100/70 text-blue-700">
                {totalTrucks} Vehicles Active
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-1 flex items-center gap-1.5">
              <span>Real-time corridor telemetry, fleet-wide best match status, and transit risk monitoring.</span>
              <span className="group relative inline-flex items-center cursor-help" title="Algorithm Details">
                <Info className="w-3 h-3 text-slate-400 hover:text-blue-600" />
                <span className="pointer-events-none absolute left-0 bottom-full mb-1 hidden group-hover:block w-52 rounded-md bg-slate-900 px-2 py-1 text-[10px] text-white shadow-md z-30 font-normal">
                  Fleet optimization solved via Kuhn-Munkres bipartite matching algorithm.
                </span>
              </span>
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={onAddTruck}
              className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Vehicle</span>
            </button>
          </div>
        </div>

        {/* 4 KPIs Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200/60">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="text-[11px] text-[#64748B] font-medium flex items-center justify-between">
              <span>Total Fleet</span>
              <Truck className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-lg font-black text-[#0F172A] mt-1">{totalTrucks}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Commercial haulers in corridor</div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-red-100 shadow-xs">
            <div className="text-[11px] text-red-600 font-medium flex items-center justify-between">
              <span>Vehicles at Risk</span>
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            </div>
            <div className="text-lg font-black text-red-600 mt-1">{trucksAtRisk}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">&gt;60% transit risk probability</div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
            <div className="text-[11px] text-emerald-700 font-medium flex items-center justify-between">
              <span>Optimized Matches</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-lg font-black text-emerald-700 mt-1">
              {matchedTrucksCount} <span className="text-xs font-semibold text-slate-400">/ {totalTrucks}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Fleet-wide best match allocated</div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-xs">
            <div className="text-[11px] text-amber-700 font-medium flex items-center justify-between">
              <span>Empty Km at Risk</span>
              <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-lg font-black text-amber-700 mt-1">
              {totalEmptyKmAtRisk.toLocaleString('en-IN')} <span className="text-xs font-semibold text-slate-400">km</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Return legs without backhaul</div>
          </div>
        </div>
      </div>

      {/* 2. Search, Filter & Sort Toolbar */}
      <div className="p-3 bg-slate-50/80 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, driver, city..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
            <span className="text-[10px] text-slate-400 font-bold px-1.5">Status:</span>
            {['ALL', 'In-Transit', 'Available', 'Returning Empty'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'All' : st}
              </button>
            ))}
          </div>

          {/* Risk Filter */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
            <span className="text-[10px] text-slate-400 font-bold px-1.5">Risk:</span>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'HIGH', label: 'High (>60%)' },
              { id: 'MEDIUM', label: 'Med (40-60%)' },
              { id: 'LOW', label: 'Low (<40%)' },
            ].map((rf) => (
              <button
                key={rf.id}
                onClick={() => setRiskFilter(rf.id)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  riskFilter === rf.id
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {rf.label}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-[11px] font-medium text-slate-700 outline-none cursor-pointer"
            >
              <option value="RISK_DESC">Risk: High to Low</option>
              <option value="RISK_ASC">Risk: Low to High</option>
              <option value="ETA_SOONEST">ETA: Soonest</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Multi-Truck Cards Grid */}
      <div className="p-4 sm:p-5">
        {filteredTrucks.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No vehicles match the selected filter criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
            {filteredTrucks.map((truck) => {
              const isSelected = truck.id === selectedTruckId;
              const assignment = fleetAssignmentsByTruckId[truck.id];
              const riskBadge = getRiskBadge(truck.emptyReturnProbability);
              const countdown = formatCountdown(truck.countdownSeconds);

              return (
                <div
                  key={truck.id}
                  onClick={() => onSelectTruck?.(truck.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/40 shadow-sm ring-2 ring-blue-500/20'
                      : 'border-[#E2E8F0] bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  {/* Top Bar: ID, Status, Risk */}
                  <div className="flex items-center justify-between gap-1.5 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-[#0F172A]">{truck.id}</span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[85px]">
                        {truck.regNumber || ''}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${riskBadge.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${riskBadge.dot}`} />
                      <span>{riskBadge.label}</span>
                    </span>
                  </div>

                  {/* Vehicle Model & Driver */}
                  <div className="text-[11px] font-medium text-slate-700 truncate">
                    {truck.model || 'Heavy Hauler'}
                  </div>
                  <div className="text-[10px] text-slate-500 mb-2.5">
                    Driver: {truck.driverName || 'Patil S.'} • {truck.capacityTons || 10}t Capacity
                  </div>

                  {/* Route Badge */}
                  <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-2 mb-2.5 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1 font-semibold text-slate-800">
                      <span className="truncate max-w-[75px]">{truck.origin?.split(' ')[0]}</span>
                      <span className="text-slate-400">→</span>
                      <span className="truncate max-w-[75px] text-blue-700">{truck.destination?.split(' ')[0]}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {truck.expectedDeliveryTime || '14:15'}
                    </span>
                  </div>

                  {/* Bottom Line: Countdown & Match Status */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Empty in:</span>
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        {countdown.hours}h {countdown.minutes}m
                      </span>
                    </div>

                    {/* Global Assignment Status */}
                    <div className="pt-1">
                      {assignment ? (
                        <div className="bg-emerald-50 border border-emerald-200/80 rounded-md px-2 py-1 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>Matched: {assignment.shipmentId}</span>
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700">
                            {assignment.matchScore}%
                          </span>
                        </div>
                      ) : (
                        <div className="bg-slate-100/80 border border-slate-200/60 rounded-md px-2 py-1 flex items-center justify-between text-slate-500">
                          <span className="text-[10px] font-medium">No backhaul allocated</span>
                          <span className="text-[9px] font-bold text-amber-600">Searching</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Indicator Pill */}
                  {isSelected && (
                    <div className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold shadow-xs">
                      Active Vehicle
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
