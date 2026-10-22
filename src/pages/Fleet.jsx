import React, { useState } from 'react';
import {
  Truck,
  Cpu,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useReRoute } from '../context/ReRouteContext';
import { optimizeFleet } from '../engine/index';
import { apiFetch } from '../lib/api';

export default function Fleet() {
  const {
    trucks = [],
    shipments = [],
    settings,
    assignShipment,
    setIsAddTruckOpen,
    setEditingTruck,
    deleteTruck,
    handleRequestLoadDemo,
    showToast,
  } = useReRoute();

  const [optimizationResult, setOptimizationResult] = useState(null);
  const [isSolving, setIsSolving] = useState(false);
  const [assignedStatus, setAssignedStatus] = useState({});

  const handleOptimizeFleet = async () => {
    if (trucks.length === 0 || shipments.length === 0) {
      showToast('Need at least 1 truck and 1 load to run Hungarian solver', 'alert');
      return;
    }

    setIsSolving(true);
    const start = performance.now();

    try {
      // 1. Try calling serverless API endpoint
      const res = await apiFetch('/api/optimize-fleet', {
        method: 'POST',
        body: JSON.stringify({ trucks, shipments, settings }),
      });

      const elapsed = Number((performance.now() - start).toFixed(2));

      if (res && res.success && Array.isArray(res.assignments)) {
        setOptimizationResult({
          ...res,
          latencyMs: res.latencyMs || elapsed,
          solver: `Vercel Serverless /api/optimize-fleet (Kuhn-Munkres ${elapsed}ms roundtrip)`,
        });
      } else {
        // 2. Graceful fallback to client-side Hungarian Kuhn-Munkres solver
        const localResult = optimizeFleet(trucks, shipments, settings);
        setOptimizationResult({
          ...localResult,
          latencyMs: elapsed,
          solver: `Kuhn-Munkres Hungarian Solver (Local Engine Fallback · ${elapsed}ms)`,
        });
      }
    } catch (err) {
      console.error('Fleet optimization error:', err);
    } finally {
      setIsSolving(false);
    }
  };

  const handleApplyAssignment = async (assignment) => {
    try {
      await assignShipment(assignment.truckId, assignment.shipmentId, assignment);
      setAssignedStatus((prev) => ({ ...prev, [assignment.id]: true }));
    } catch (err) {
      alert(`Assignment failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <Truck className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-bold text-[#0F172A]">Fleet Management & Global Optimizer</h1>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Monitoring {trucks.length} active fleet vehicles across the Western Logistics Corridor.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setEditingTruck?.(null);
              setIsAddTruckOpen?.(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Truck</span>
          </button>

          <button
            onClick={handleOptimizeFleet}
            disabled={isSolving || trucks.length === 0 || shipments.length === 0}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all ${
              trucks.length === 0 || shipments.length === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-[#2563EB] hover:bg-blue-700 text-white cursor-pointer'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>{isSolving ? 'Pairing Fleet Loads...' : 'Fleet-Wide Best Match (All Trucks)'}</span>
          </button>
        </div>
      </div>

      {/* Global Optimization Results Banner */}
      {optimizationResult && (
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-[12px] p-5 shadow-soft space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-sm font-bold">Optimal Conflict-Free Fleet Assignment</h2>
                <span className="text-[11px] text-blue-200">
                  Algorithm: {optimizationResult.solver} • Measured Latency: {optimizationResult.latencyMs}ms
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
              {optimizationResult.totalMatches} Optimal Matches Found
            </span>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-lg">
              <span className="text-[10px] text-blue-200 block uppercase">Total Gross Freight Yield</span>
              <strong className="text-base text-emerald-300 font-extrabold">
                ₹{(optimizationResult.totalYieldInr || 0).toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-lg">
              <span className="text-[10px] text-blue-200 block uppercase">Empty-KM Avoided</span>
              <strong className="text-base text-blue-200 font-extrabold">
                {optimizationResult.totalEmptyKmAvoided} km
              </strong>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-lg">
              <span className="text-[10px] text-blue-200 block uppercase">CO₂ Emissions Reduced</span>
              <strong className="text-base text-emerald-300 font-extrabold">
                {optimizationResult.totalCo2ReducedKg} kg
              </strong>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-lg">
              <span className="text-[10px] text-blue-200 block uppercase">Conflict Guarantee</span>
              <strong className="text-base text-amber-300 font-extrabold">
                Zero Overlap (1-to-1)
              </strong>
            </div>
          </div>

          {/* Assignment Pairings Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-blue-200 border-b border-white/10 uppercase">
                <tr>
                  <th className="py-2 px-3">Vehicle</th>
                  <th className="py-2 px-3">Assigned Load</th>
                  <th className="py-2 px-3">Match Score</th>
                  <th className="py-2 px-3">Detour</th>
                  <th className="py-2 px-3">Gross Yield</th>
                  <th className="py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {optimizationResult.assignments.map((asg) => {
                  const isCommitted = assignedStatus[asg.id];
                  return (
                    <tr key={asg.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3">
                        <strong className="text-white block">{asg.truckId}</strong>
                        <span className="text-[10px] text-blue-300">{asg.truckRegNumber}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-white block">{asg.shipmentId}</span>
                        <span className="text-[10px] text-blue-300 truncate max-w-[200px] block">{asg.shipmentName}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-400/20">
                          {asg.matchScore}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-blue-200">+{asg.detourKm} km</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-300">
                        ₹{(asg.grossRevenueInr || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3">
                        {isCommitted ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Committed
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApplyAssignment(asg)}
                            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            Commit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fleet Vehicles Table or Empty State */}
      {trucks.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">No trucks added yet</h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
              Register your fleet vehicles or load the demo dataset to run global combinatorial optimization.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => {
                setEditingTruck?.(null);
                setIsAddTruckOpen?.(true);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Truck</span>
            </button>
            <button
              onClick={handleRequestLoadDemo}
              className="px-4 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Load Demo Data</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0F172A]">All Active Fleet Vehicles ({trucks.length})</h2>
            <span className="text-xs text-[#64748B]">Real-time GPS status & specs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] uppercase text-[10px] border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Vehicle ID</th>
                  <th className="py-3 px-4">Model & Type</th>
                  <th className="py-3 px-4">Corridor Vector</th>
                  <th className="py-3 px-4">Capacity / Load</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Deadhead Risk</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {trucks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <strong className="text-[#0F172A] block">{t.id}</strong>
                      <span className="text-[10px] text-[#64748B] font-mono">{t.regNumber}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#0F172A] block">{t.model}</span>
                      <span className="text-[10px] text-[#64748B]">{t.vehicleType}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-[#0F172A] font-medium">
                        <span>{t.origin?.split(' ')[0]}</span>
                        <ArrowRight className="w-3 h-3 text-[#64748B]" />
                        <span>{t.destination?.split(' ')[0]}</span>
                      </div>
                      <span className="text-[10px] text-[#64748B]">ETA {t.expectedDeliveryTime}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#0F172A]">{t.capacityTons}t rating</span>
                      <span className="text-[10px] text-[#64748B] block">Mileage: {t.vehicleMileageKmPerL} km/L</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[#0F172A] font-medium block">{t.driverName}</span>
                      <span className="text-[10px] text-[#64748B]">{t.driverPhone}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#059669] border border-emerald-200">
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-rose-600 font-bold">{t.emptyReturnProbability}%</span>
                      <span className="text-[10px] text-[#64748B] block">empty probability</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingTruck?.(t);
                            setIsAddTruckOpen?.(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit vehicle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove vehicle ${t.id} from fleet?`)) {
                              deleteTruck?.(t.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete vehicle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
