// ReRoute AI 2.0 - Disruptions Audit & Field Injection Page
// Monitors live operational disruptions and audits autonomous recovery performance.

import React, { useState } from 'react';
import { Zap, AlertTriangle, Clock, RefreshCw, XCircle, ShieldAlert, CheckCircle2, CloudRain } from 'lucide-react';
import { useReRoute } from '../context/ReRouteContext';

export default function Disruptions() {
  const {
    disruptions,
    shipments,
    trucks,
    cancelShipment,
    delayShipment,
    shiftShipmentWindow,
    resetDemo,
    simulateHeavyRain,
    toggleSimulateHeavyRain,
  } = useReRoute();
  const [selectedTargetId, setSelectedTargetId] = useState(shipments[0]?.id || '');
  const [activeMessage, setActiveMessage] = useState(null);

  const activeTargetId = selectedTargetId || shipments[0]?.id;

  const handleTriggerCancel = async () => {
    if (!activeTargetId) return;
    await cancelShipment(activeTargetId, 'Shipper emergency facility maintenance');
    setActiveMessage(`Tender ${activeTargetId} cancelled. Disruption event logged.`);
  };

  const handleTriggerDelay = async () => {
    if (!activeTargetId) return;
    await delayShipment(activeTargetId, 60, 'Heavy road freight bottleneck delay');
    setActiveMessage(`Transit delay (+60m) injected on ${activeTargetId}.`);
  };

  const handleTriggerShift = async () => {
    if (!activeTargetId) return;
    await shiftShipmentWindow(activeTargetId, 60);
    setActiveMessage(`Dock window modified for ${activeTargetId} (+60m relative shift).`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <Zap className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-bold text-[#0F172A]">Disruptions & Self-Healing Audit Log</h1>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Tracking field disruptions, automated recalculations, and recovery events.
          </p>
        </div>

        <button
          onClick={resetDemo}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-[#0F172A] border border-[#E2E8F0] flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#64748B]" />
          <span>Clear & Reset Simulation</span>
        </button>
      </div>

      {/* Disruption Injection Sandbox */}
      <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">Interactive Disruption Injection Sandbox</h2>
            <p className="text-xs text-[#64748B]">
              Inject live operational disruptions on any freight candidate to verify system resilience.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#64748B]">Target Cargo:</span>
            <select
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              className="font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-2.5 py-1 text-xs outline-none cursor-pointer"
            >
              {shipments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}: {s.name?.slice(0, 30)}...
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={handleTriggerCancel}
            className="p-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-left transition-colors flex items-start gap-3 cursor-pointer"
          >
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-xs font-bold text-rose-900 block">Cancel Load Tender</strong>
              <span className="text-[11px] text-rose-700">Simulate shipper tender withdrawal or bay shutdown.</span>
            </div>
          </button>

          <button
            onClick={handleTriggerDelay}
            className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-left transition-colors flex items-start gap-3 cursor-pointer"
          >
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-xs font-bold text-amber-900 block">Inject 60-Min Delay</strong>
              <span className="text-[11px] text-amber-700">Simulate highway ghat congestion and check buffer breach.</span>
            </div>
          </button>

          <button
            onClick={handleTriggerShift}
            className="p-3 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-left transition-colors flex items-start gap-3 cursor-pointer"
          >
            <RefreshCw className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-xs font-bold text-blue-900 block">Shift Pickup Window</strong>
              <span className="text-[11px] text-blue-700">Extend receiving dock schedule window.</span>
            </div>
          </button>

          <button
            onClick={() => {
              toggleSimulateHeavyRain();
              setActiveMessage(
                !simulateHeavyRain
                  ? 'Simulating heavy rain near Kasara Ghat: disruption penalty (-35 pts) & speed slowdown (-25%) injected.'
                  : 'Heavy rain simulation disabled. Normal corridor weather restored.'
              );
            }}
            className={`p-3 rounded-xl border text-left transition-colors flex items-start gap-3 cursor-pointer ${
              simulateHeavyRain
                ? 'border-indigo-300 bg-indigo-100/80 ring-2 ring-indigo-400/30'
                : 'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70'
            }`}
          >
            <CloudRain className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-xs font-bold text-indigo-900 block">
                {simulateHeavyRain ? 'Heavy Rain (Active)' : 'Simulate Heavy Rain'}
              </strong>
              <span className="text-[11px] text-indigo-700">
                {simulateHeavyRain
                  ? 'High risk active: -35 pts disruption, -25% speed.'
                  : 'Inject high-risk monsoon storm at Kasara Ghat.'}
              </span>
            </div>
          </button>
        </div>

        {activeMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{activeMessage}</span>
          </div>
        )}
      </div>

      {/* Disruption Events Table */}
      <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0F172A]">Live Disruption Event Stream ({disruptions.length})</h2>
          <span className="text-xs text-[#64748B]">Audited in persistent database</span>
        </div>

        {disruptions.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748B]">
            No disruption events recorded yet. Use the sandbox above to simulate live field disruptions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] uppercase text-[10px] border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Disruption Type</th>
                  <th className="py-3 px-4">Affected Entity</th>
                  <th className="py-3 px-4">Details / Payload</th>
                  <th className="py-3 px-4">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {disruptions.map((d, idx) => (
                  <tr key={d.id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0F172A]">{d.id}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {d.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-blue-700">
                      {d.shipmentId || d.shipment_id || d.truckId || 'Corridor Link'}
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">
                      {d.payload?.reason || JSON.stringify(d.payload || {})}
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">
                      {new Date(d.createdAt || d.created_at || Date.now()).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
