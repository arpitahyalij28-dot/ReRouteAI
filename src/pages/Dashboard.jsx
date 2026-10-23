// ReRoute AI 2.0 - Dispatch Cockpit Dashboard
// 100% data-driven, reactive to multi-truck fleet optimization, disruption injection, and candidate evaluation.

import React, { useState, useMemo } from 'react';
import { Sparkles, Package, Plus, AlertCircle, Info } from 'lucide-react';
import FleetOverview from '../components/FleetOverview';
import PipelineStages from '../components/PipelineStages';
import TruckCard from '../components/TruckCard';
import ShipmentCard from '../components/ShipmentCard';
import ExplainabilityPanel from '../components/ExplainabilityPanel';
import DisruptionSimulator from '../components/DisruptionSimulator';
import SustainabilityDashboard from '../components/SustainabilityDashboard';
import CorridorMap from '../components/CorridorMap';
import DemoGuideModal from '../components/DemoGuideModal';
import BeforeVsAfterCard from '../components/BeforeVsAfterCard';
import WeatherBadge from '../components/WeatherBadge';
import QuickWhatsAppIngest from '../components/QuickWhatsAppIngest';
import { useReRoute, addMinutesToTimeString } from '../context/ReRouteContext';
import {
  calculateShipmentScore,
  calculateSustainabilityMetrics,
} from '../utils/scoring';
import { optimizeFleetGlobal } from '../utils/fleetOptimizer';
import { apiFetch } from '../lib/api';

export default function Dashboard() {
  const {
    trucks = [],
    shipments = [],
    assignments = [],
    selectedTruckId,
    setSelectedTruckId,
    selectedTruck,
    selectedShipmentId,
    setSelectedShipmentId,
    cancelShipment,
    delayShipment,
    shiftShipmentWindow,
    resetDemo,
    settings,
    corridorWeather,
    setIsAddTruckOpen,
    setIsAddShipmentOpen,
    handleRequestLoadDemo,
  } = useReRoute();

  const [currentStage, setCurrentStage] = useState('warn');
  const [isMatched, setIsMatched] = useState(true);

  // Disruption Simulation UI States
  const [isCancelled, setIsCancelled] = useState(false);
  const [isDelayed, setIsDelayed] = useState(false);
  const [isWindowShifted, setIsWindowShifted] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recoveryBanner, setRecoveryBanner] = useState(null);
  const [reassignmentAudit, setReassignmentAudit] = useState(null);
  const [measuredRecoveryLatency, setMeasuredRecoveryLatency] = useState(null);
  const [isDemoGuideOpen, setIsDemoGuideOpen] = useState(false);

  // Active truck (if any)
  const activeTruck = selectedTruck || trucks[0] || null;

  // 1. Run Global Fleet Optimization (Kuhn-Munkres Bipartite Matching)
  // Ensures: Each shipment assigned to at most ONE truck, conflict resolution tagged,
  // and fleet sustainability totals equal the sum of per-truck rows.
  const fleetPlan = useMemo(() => {
    return optimizeFleetGlobal(trucks, shipments, settings);
  }, [trucks, shipments, settings]);

  // Per-truck ranking derived from global fleet optimizer
  const activeTruckPlan = activeTruck ? fleetPlan.truckRankings[activeTruck.id] : null;
  const ranked = activeTruckPlan?.ranked || [];
  const recommendedId = activeTruckPlan?.recommendedId || null;
  const conflictInfo = activeTruck ? fleetPlan.conflictMap[activeTruck.id] : null;

  // Selected shipment (fallback to recommendedId or first available)
  const selectedShipment = useMemo(() => {
    if (!shipments || shipments.length === 0) return null;
    if (selectedShipmentId) {
      const found = shipments.find((s) => s.id === selectedShipmentId);
      if (found) return found;
    }
    if (recommendedId) {
      const rec = shipments.find((s) => s.id === recommendedId);
      if (rec) return rec;
    }
    return shipments[0] || null;
  }, [shipments, selectedShipmentId, recommendedId]);

  const selectedScore = useMemo(() => {
    if (!selectedShipment || !activeTruck) return null;
    return calculateShipmentScore(selectedShipment, settings?.weights, activeTruck);
  }, [selectedShipment, activeTruck, settings]);

  const sustainabilityMetrics = useMemo(() => {
    return calculateSustainabilityMetrics(selectedShipment, activeTruck);
  }, [selectedShipment, activeTruck]);

  // Handlers
  const handleFindBackhaul = () => {
    setCurrentStage('optimize');
    setIsMatched(true);
    if (recommendedId) setSelectedShipmentId(recommendedId);
  };

  const handleSelectShipment = (shipment) => {
    setSelectedShipmentId(shipment.id);
    setCurrentStage('explain');
  };

  const handleCancelTarget = async (targetId) => {
    if (isCancelled) return;
    setIsRecalculating(true);
    setCurrentStage('recover');
    setRecoveryBanner(null);

    // Snapshot pre-disruption assignments
    const prevAssignments = { ...fleetPlan.assignmentsByTruckId };

    const start = performance.now();
    try {
      await cancelShipment(targetId, 'Shipper facility crane maintenance shutdown');

      // Re-run fleet optimizer on updated dataset
      const remainingShipments = shipments.map((s) =>
        s.id === targetId ? { ...s, isCancelled: true, status: 'Cancelled' } : s
      );
      const newFleetPlan = optimizeFleetGlobal(trucks, remainingShipments, settings);

      const elapsed = Number((performance.now() - start).toFixed(2));
      setMeasuredRecoveryLatency(elapsed);
      setIsCancelled(true);
      setIsRecalculating(false);

      // Build Fleet Reassignment Audit
      const audit = trucks.map((t) => {
        const beforeId = prevAssignments[t.id]?.shipmentId || null;
        const afterId = newFleetPlan.assignmentsByTruckId[t.id]?.shipmentId || null;
        const isChanged = beforeId !== afterId;
        return {
          truckId: t.id,
          route: `${t.origin?.split(' ')[0]} → ${t.destination?.split(' ')[0]}`,
          beforeShipmentId: beforeId,
          afterShipmentId: afterId,
          status: isChanged ? 'REASSIGNED' : afterId ? 'UNCHANGED' : 'UNASSIGNED',
        };
      });
      setReassignmentAudit(audit);

      const newRecForActiveTruck = activeTruck ? newFleetPlan.truckRankings[activeTruck.id]?.recommendedId : null;
      if (newRecForActiveTruck) {
        setSelectedShipmentId(newRecForActiveTruck);
        setRecoveryBanner(
          `Autonomous Fleet Recovery Active: Tender ${targetId} cancelled. Global solver reassigned affected vehicles (${newFleetPlan.latencyMs}ms solver / ${elapsed}ms roundtrip).`
        );
      } else {
        setRecoveryBanner(
          `Autonomous Fleet Recovery Active: Tender ${targetId} cancelled. Corridors reallocated across ${trucks.length} vehicles in ${newFleetPlan.latencyMs}ms.`
        );
      }
    } catch {
      setIsRecalculating(false);
    }
  };

  const handleDelayTarget = async (targetId) => {
    setIsRecalculating(true);
    setCurrentStage('recover');

    // Snapshot pre-disruption assignments
    const prevAssignments = { ...fleetPlan.assignmentsByTruckId };

    const start = performance.now();
    try {
      await delayShipment(targetId, 60, 'Heavy vehicle breakdown on ghat descent link');

      const elapsed = Number((performance.now() - start).toFixed(2));
      setMeasuredRecoveryLatency(elapsed);
      setIsDelayed(true);
      setIsRecalculating(false);

      const delayedShipments = shipments.map((s) =>
        s.id === targetId
          ? {
              ...s,
              pickupWindowStart: addMinutesToTimeString(s.pickupWindowStart, 60),
              pickupWindowEnd: addMinutesToTimeString(s.pickupWindowEnd, 60),
            }
          : s
      );
      const newFleetPlan = optimizeFleetGlobal(trucks, delayedShipments, settings);

      const audit = trucks.map((t) => {
        const beforeId = prevAssignments[t.id]?.shipmentId || null;
        const afterId = newFleetPlan.assignmentsByTruckId[t.id]?.shipmentId || null;
        const isChanged = beforeId !== afterId;
        return {
          truckId: t.id,
          route: `${t.origin?.split(' ')[0]} → ${t.destination?.split(' ')[0]}`,
          beforeShipmentId: beforeId,
          afterShipmentId: afterId,
          status: isChanged ? 'REASSIGNED' : afterId ? 'UNCHANGED' : 'UNASSIGNED',
        };
      });
      setReassignmentAudit(audit);

      setRecoveryBanner(
        `Traffic Disruption Injected: ${targetId} delayed by 60 min. Re-ranked candidate shipments across fleet in ${elapsed}ms.`
      );
    } catch {
      setIsRecalculating(false);
    }
  };

  const handleShiftWindowTarget = async (targetId) => {
    const target = shipments.find((s) => s.id === targetId);
    await shiftShipmentWindow(targetId, 60);
    setIsWindowShifted(true);
    const newEnd = target ? addMinutesToTimeString(target.pickupWindowEnd, 60) : '17:00';
    setRecoveryBanner(
      `Shipper window broadened: ${targetId} pickup window extended to ${newEnd} IST (+60 min relative shift).`
    );
  };

  const handleReset = async () => {
    await resetDemo();
    setIsCancelled(false);
    setIsDelayed(false);
    setIsWindowShifted(false);
    setIsRecalculating(false);
    setRecoveryBanner(null);
    setReassignmentAudit(null);
    if (shipments.length > 0) setSelectedShipmentId(shipments[0].id);
    setCurrentStage('warn');
  };

  const handleJumpStep = (stepNum) => {
    switch (stepNum) {
      case 1:
        handleReset();
        setCurrentStage('warn');
        break;
      case 2:
        handleFindBackhaul();
        break;
      case 3:
        if (shipments.length > 1) setSelectedShipmentId(shipments[1].id);
        setCurrentStage('explain');
        break;
      case 4:
        setCurrentStage('measure');
        break;
      case 5:
        if (recommendedId) handleCancelTarget(recommendedId);
        break;
      case 6:
        handleReset();
        break;
      default:
        break;
    }
  };

  const topPickScore = ranked.find((r) => r.shipment?.id === recommendedId)?.score?.totalScore;

  return (
    <div className="space-y-6">
      {/* 0. Fleet Overview (Live KPI Strip, Filter, Search, and Multi-Truck Cards) */}
      <FleetOverview
        trucks={trucks}
        selectedTruckId={activeTruck?.id}
        onSelectTruck={(id) => setSelectedTruckId(id)}
        fleetAssignmentsByTruckId={fleetPlan.assignmentsByTruckId}
        onAddTruck={() => setIsAddTruckOpen(true)}
        onLoadDemo={handleRequestLoadDemo}
      />

      {/* 1. Before vs After Fleet Operational Impact Card */}
      <BeforeVsAfterCard
        trucks={trucks}
        assignments={assignments}
        settings={settings}
        onAddTruck={() => setIsAddTruckOpen(true)}
        onLoadDemo={handleRequestLoadDemo}
      />

      {/* 2. Pipeline Stages Indicator */}
      <PipelineStages
        currentStage={currentStage}
        onSelectStage={(stageId) => setCurrentStage(stageId)}
      />

      {/* 3. Cockpit Status Banner with Active Truck Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-[12px] border border-[#E2E8F0] shadow-soft">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                activeTruck ? 'bg-emerald-400' : 'bg-slate-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                activeTruck ? 'bg-[#059669]' : 'bg-slate-400'
              }`}
            />
          </span>

          <div className="text-xs">
            <span className="font-bold text-[#0F172A]">AI Logistics Dispatch Cockpit:</span>{' '}
            {activeTruck ? (
              <>
                <span className="text-[#64748B]">Active Focused Vehicle: </span>
                <select
                  value={selectedTruckId || ''}
                  onChange={(e) => setSelectedTruckId(e.target.value)}
                  className="font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5 ml-1 text-xs outline-none cursor-pointer"
                >
                  {trucks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} — {t.model?.split(' ')[0]} ({t.capacityTons || 10}t) [{t.origin?.split(' ')[0]} → {t.destination?.split(' ')[0]}]
                    </option>
                  ))}
                </select>
                <span className="text-[#64748B] hidden md:inline">
                  {' '}• Pre-allocating return load ahead of arrival at {activeTruck.destination?.split(' ')[0]}.
                </span>
              </>
            ) : (
              <span className="text-[#64748B]">
                No vehicles active •{' '}
                <button
                  onClick={() => setIsAddTruckOpen?.(true)}
                  className="text-blue-600 hover:underline font-bold cursor-pointer"
                >
                  Add a truck
                </button>{' '}
                or{' '}
                <button
                  onClick={handleRequestLoadDemo}
                  className="text-amber-800 hover:underline font-bold cursor-pointer"
                >
                  Load demo data
                </button>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <WeatherBadge weather={corridorWeather} variant="compact" />

          <span className="text-[#64748B] hidden md:inline">Optimal Backhaul:</span>
          <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>
              {recommendedId
                ? `${recommendedId} (${topPickScore || 85}%)`
                : activeTruck
                ? 'None Allocated'
                : 'Workspace Empty'}
            </span>
          </span>
        </div>
      </div>

      {/* 4. 3-Column Core Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Focused Truck Status & Specs (Width 3) */}
        <section className="lg:col-span-3 xl:col-span-3 space-y-4">
          <TruckCard
            truck={activeTruck}
            onFindBackhaul={handleFindBackhaul}
            isMatched={isMatched}
            activeShipmentCount={shipments.filter((s) => !s.isCancelled).length}
          />
        </section>

        {/* Center Column: Map, Disruption Simulator, and Ranked Matches (Width 5) */}
        <section className="lg:col-span-5 xl:col-span-5 space-y-4">
          {/* Interactive Multi-Truck Leaflet Map */}
          <CorridorMap
            truck={activeTruck}
            trucks={trucks}
            shipments={shipments}
            selectedShipmentId={selectedShipmentId}
            recommendedId={recommendedId}
            onSelectShipmentId={(id) => {
              setSelectedShipmentId(id);
              setCurrentStage('explain');
            }}
            onSelectTruckId={(id) => setSelectedTruckId(id)}
          />

          {/* Dynamic Generic Disruption Simulator with Fleet Reassignment Audit */}
          <DisruptionSimulator
            targetShipment={selectedShipment}
            allShipments={shipments}
            onCancelShipment={handleCancelTarget}
            onDelayShipment={handleDelayTarget}
            onShiftWindow={handleShiftWindowTarget}
            onReset={handleReset}
            isCancelled={isCancelled}
            isDelayed={isDelayed}
            isWindowShifted={isWindowShifted}
            isRecalculating={isRecalculating}
            recoveryBanner={recoveryBanner}
            measuredLatencyMs={measuredRecoveryLatency || fleetPlan.latencyMs}
            reassignmentAudit={reassignmentAudit}
          />

          {/* Quick Regional / WhatsApp Message Ingestion Dropzone */}
          <QuickWhatsAppIngest />

          {/* Ranked Shipments List for Focused Truck */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
                  <span>Candidate Backhaul Matches</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-[#64748B] font-medium">
                    {shipments.filter((s) => !s.isCancelled).length} candidate loads
                  </span>
                </h3>
                <p className="text-[11px] text-[#64748B] flex items-center gap-1.5 flex-wrap">
                  <span>Scored on 6 factors • Best truck-to-load pairing across your whole fleet</span>
                  <span className="group relative inline-flex items-center cursor-help" title="Algorithm Details">
                    <Info className="w-3 h-3 text-slate-400 hover:text-blue-600" />
                    <span className="pointer-events-none absolute left-0 bottom-full mb-1 hidden group-hover:block w-56 rounded-md bg-slate-900 px-2.5 py-1.5 text-[10px] text-white shadow-md z-30 font-normal">
                      Multi-Criteria Decision Analysis (6 factors) paired with Kuhn-Munkres global fleet allocation solver.
                    </span>
                  </span>
                </p>
              </div>
              <div className="text-[11px] text-[#64748B] flex items-center gap-1">
                <span>Selected:</span>
                <strong className="text-blue-600 font-bold">
                  {selectedShipmentId || 'None'}
                </strong>
              </div>
            </div>

            {shipments.length === 0 ? (
              <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft p-8 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0F172A]">No loads available</h4>
                  <p className="text-xs text-[#64748B] mt-1 max-w-xs mx-auto">
                    Post a return load or load the demo dataset to evaluate candidate consignments across the fleet.
                  </p>
                </div>
                <div className="pt-1">
                  <button
                    onClick={() => setIsAddShipmentOpen?.(true)}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Shipment</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {ranked.map(({ shipment, score, isRecommended }, idx) => (
                  <ShipmentCard
                    key={shipment.id}
                    shipment={shipment}
                    score={score}
                    isRecommended={isRecommended}
                    isSelected={shipment.id === selectedShipmentId}
                    rankIndex={idx}
                    onSelect={handleSelectShipment}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Explainability Decision Engine with Conflict Resolution (Width 4) */}
        <section className="lg:col-span-4 xl:col-span-4 space-y-4">
          <ExplainabilityPanel
            shipment={selectedShipment}
            score={selectedScore}
            allShipments={shipments}
            onSelectShipmentId={(id) => setSelectedShipmentId(id)}
            isRecommended={selectedShipment?.id === recommendedId}
            conflictInfo={conflictInfo}
          />
        </section>
      </div>

      {/* 5. Bottom Section: Fleet & Individual Sustainability Dashboard */}
      <section>
        <SustainabilityDashboard
          metrics={sustainabilityMetrics}
          selectedShipment={selectedShipment}
          truck={activeTruck}
          fleetSustainability={fleetPlan.fleetSustainability}
        />
      </section>

      {/* Demo Flow Guide Modal */}
      <DemoGuideModal
        isOpen={isDemoGuideOpen}
        onClose={() => setIsDemoGuideOpen(false)}
        onJumpStep={handleJumpStep}
      />
    </div>
  );
}
