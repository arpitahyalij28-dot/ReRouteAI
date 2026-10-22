// ReRoute AI 2.0 - Active Assignments Page
// Manages committed backhaul assignments, execution status, and load tracking.

import React from 'react';
import { Layers, CheckCircle2, ArrowRight, Trash2, Fuel, DollarSign, Calendar } from 'lucide-react';
import { useReRoute } from '../context/ReRouteContext';

export default function Assignments() {
  const { assignments, unassignShipment, trucks, shipments } = useReRoute();

  const handleUnassign = async (assignmentId) => {
    if (confirm('Cancel this backhaul assignment and release cargo back to demand pool?')) {
      await unassignShipment(assignmentId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-bold text-[#0F172A]">Committed Backhaul Assignments</h1>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Tracking active backhaul dispatch commitments across carrier fleets.
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700 font-bold flex items-center gap-2">
          <span>Active Dispatches:</span>
          <span className="text-sm font-extrabold">{assignments.length}</span>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
            <Layers className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-[#0F172A]">No Active Assignments</h2>
          <p className="text-xs text-[#64748B] max-w-md mx-auto">
            Dispatchers can evaluate and assign backhaul tenders from the Dashboard Cockpit or run the Fleet Optimizer.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] uppercase text-[10px] border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Assignment ID</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Committed Cargo</th>
                  <th className="py-3 px-4">Match Score</th>
                  <th className="py-3 px-4">Detour / Loaded</th>
                  <th className="py-3 px-4">Net Economic Gain</th>
                  <th className="py-3 px-4">Assigned At</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {assignments.map((a) => {
                  const truck = trucks.find((t) => t.id === a.truckId);
                  const shipment = shipments.find((s) => s.id === a.shipmentId);
                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <strong className="text-[#0F172A] block font-mono">{a.id}</strong>
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {a.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <strong className="text-blue-700 block">{a.truckId}</strong>
                        <span className="text-[10px] text-[#64748B]">{truck?.regNumber || 'Commercial Truck'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#0F172A] block">{a.shipmentId}</span>
                        <span className="text-[10px] text-[#64748B] block truncate max-w-[220px]">
                          {shipment?.name || 'Assigned Freight Tender'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                          {a.matchScore}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[#0F172A] font-semibold block">+{a.detourKm} km detour</span>
                        <span className="text-[10px] text-[#64748B]">{a.loadedKm || 140} km loaded transit</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-emerald-700 text-sm block">
                          ₹{(a.costGain || a.sustainability?.costSavedInr || 24000).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-[#64748B]">net margin</span>
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {new Date(a.assignedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(
                              `🚛 *ReRoute AI Dispatch Assignment* (${a.id})\n` +
                              `• Truck: ${a.truckId} (${truck?.regNumber || 'Vehicle'})\n` +
                              `• Load: ${a.shipmentId} - ${shipment?.name || 'Cargo'}\n` +
                              `• Detour: +${a.detourKm} km | Loaded: ${a.loadedKm || 140} km\n` +
                              `• Margin: ₹${(a.costGain || 24000).toLocaleString('en-IN')}\n` +
                              `• Dispatch Portal: https://reroute-ai-2.vercel.app/driver`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition-colors inline-flex items-center"
                            title="Share assignment via WhatsApp"
                          >
                            <span>📱</span>
                          </a>
                          <button
                            onClick={() => handleUnassign(a.id)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                            title="Cancel assignment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
