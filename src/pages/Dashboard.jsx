// ReRoute AI 2.0 - Dispatch Cockpit Dashboard
// 100% data-driven, reactive to truck selection, disruption injection, and candidate evaluation.

import React, { useState, useMemo } from 'react';
import { Sparkles, ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import PipelineStages from '../components/PipelineStages';
import TruckCard from '../components/TruckCard';
import ShipmentCard from '../components/ShipmentCard';
import ExplainabilityPanel from '../components/ExplainabilityPanel';
import DisruptionSimulator from '../components/DisruptionSimulator';
import SustainabilityDashboard from '../components/SustainabilityDashboard';
import CorridorMap from '../components/CorridorMap';
import DemoGuideModal from '../components/DemoGuideModal';
import { useReRoute } from '../context/ReRouteContext';
import {
  calculateShipmentScore,
  rankShipments,
  calculateSustainabilityMetrics,
} from '../utils/scoring';
import { apiFetch } from '../lib/api';

export default function Dashboard() {
  const {
    trucks,
    shipments,
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
  } = useReRoute();

  const [currentStage, setCurrentStage] = useState('warn');
  const [isMatched, setIsMatched] = useState(true);

  // Disruption Simulation UI States
  const [isCancelled, setIsCancelled] = useState(false);
  const [isDelayed, setIsDelayed] = useState(false);
  const [isWindowShifted, setIsWindowShifted] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recoveryBanner, setRecoveryBanner] = useState(null);
  const [measuredRecoveryLatency, setMeasuredRecoveryLatency] = useState(null);
  const [isDemoGuideOpen, setIsDemoGuideOpen] = useState(false);

  // Fallback active truck
  const activeTruck = selectedTruck || trucks[0];

  // Dynamic ranking based on currently selected truck and settings
  const { ranked, recommendedId, metadata } = useMemo(() => {
    if (!activeTruck || !shipments || shipments.length === 0) {
      return { ranked: [], recommendedId: null, metadata: { latencyMs: 0 } };
    }
    return rankShipments(shipments, settings?.weights, activeTruck);
  }, [activeTruck, shipments, settings]);

  const selectedShipment = useMemo(() => {
    return shipments.find((s) => s.id === selectedShipmentId) || shipments[0];
  }, [shipments, selectedShipmentId]);

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

    const start = performance.now();
    try {
      await cancelShipment(targetId, 'Shipper facility crane maintenance shutdown');

      // 1. Attempt Serverless Recovery via /api/recover
      const recoveryRes = await apiFetch('/api/recover', {
        method: 'POST',
        body: JSON.stringify({
          truck: activeTruck,
          cancelledShipmentId: targetId,
          allShipments: shipments,
          settings,
        }),
      });

      const elapsed = Number((performance.now() - start).toFixed(2));
      setMeasuredRecoveryLatency(elapsed);
      setIsCancelled(true);
      setIsRecalculating(false);

      if (recoveryRes?.newRecommendation?.shipmentId) {
        const nextId = recoveryRes.newRecommendation.shipmentId;
        setSelectedShipmentId(nextId);
        setRecoveryBanner(
          `Autonomous Recovery Active: ${targetId} cancelled. ${nextId} dynamically promoted as optimal backhaul (${recoveryRes.solverLatencyMs}ms solver / ${elapsed}ms roundtrip via /api/recover).`
        );
      } else {
        // 2. Client-side local engine fallback
        const remaining = shipments.filter((s) => s.id !== targetId && !s.isCancelled);
        const nextEval = rankShipments(remaining, settings?.weights, activeTruck);
        if (nextEval.recommendedId) {
          setSelectedShipmentId(nextEval.recommendedId);
          setRecoveryBanner(
            `Autonomous Recovery Active: ${targetId} cancelled. ${nextEval.recommendedId} dynamically promoted as optimal backhaul (Computed locally · ${elapsed}ms).`
          );
        }
      }
    } catch {
      setIsRecalculating(false);
    }
  };

  const handleDelayTarget = async (targetId) => {
    setIsRecalculating(true);
    setCurrentStage('recover');

    const start = performance.now();
    try {
      await delayShipment(targetId, 60, 'Heavy vehicle breakdown on ghat descent link');

      // Attempt Serverless Recovery
      const recoveryRes = await apiFetch('/api/recover', {
        method: 'POST',
        body: JSON.stringify({
          truck: activeTruck,
          cancelledShipmentId: targetId,
          allShipments: shipments,
          settings,
        }),
      });

      const elapsed = Number((performance.now() - start).toFixed(2));
      setMeasuredRecoveryLatency(elapsed);
      setIsDelayed(true);
      setIsRecalculating(false);

      const promotedId = recoveryRes?.newRecommendation?.shipmentId;
      if (promotedId) {
        setSelectedShipmentId(promotedId);
        setRecoveryBanner(
          `Traffic Disruption Injected: ${targetId} delayed by 60 min. Re-ranked candidate shipments in ${elapsed}ms via /api/recover.`
        );
      } else {
        const nextEval = rankShipments(shipments, settings?.weights, activeTruck);
        if (nextEval.recommendedId && nextEval.recommendedId !== targetId) {
          setSelectedShipmentId(nextEval.recommendedId);
        }
        setRecoveryBanner(
          `Traffic Disruption Injected: ${targetId} delayed by 60 min. Re-ranked candidate shipments in ${elapsed}ms (computed locally).`
        );
      }
    } catch {
      setIsRecalculating(false);
    }
  };

  const handleShiftWindowTarget = async (targetId) => {
    await shiftShipmentWindow(targetId, '15:30', '17:00');
    setIsWindowShifted(true);
    setRecoveryBanner(`Shipper window broadened: ${targetId} pickup window extended to 17:00 IST (+75 min buffer).`);
  };

  const handleReset = async () => {
    await resetDemo();
    setIsCancelled(false);
    setIsDelayed(false);
    setIsWindowShifted(false);
    setIsRecalculating(false);
    setRecoveryBanner(null);
    setSelectedShipmentId('S1');
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

  if (!activeTruck) {
    return (
      <div className="p-8 text-center text-xs text-[#64748B]">
        Loading logistics telemetry...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Pipeline Stages Indicator */}
      <PipelineStages
        currentStage={currentStage}
        onSelectStage={(stageId) => setCurrentStage(stageId)}
      />

      {/* 2. Cockpit Status Banner with Truck Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-[12px] border border-[#E2E8F0] shadow-soft">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#059669]" />
          </span>
          <div className="text-xs">
            <span className="font-bold text-[#0F172A]">AI Logistics Dispatch Cockpit:</span>{' '}
            <span className="text-[#64748B]">Active Vehicle: </span>
            {/* Truck Selector Dropdown */}
            <select
              value={selectedTruckId}
              onChange={(e) => setSelectedTruckId(e.target.value)}
              className="font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5 ml-1 text-xs outline-none cursor-pointer"
            >
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id} — {t.model?.split(' ')[0]} ({t.capacityTons}t) [{t.origin?.split(' ')[0]} → {t.destination?.split(' ')[0]}]
                </option>
              ))}
            </select>
            <span className="text-[#64748B] hidden md:inline">
              {' '}• Pre-allocating return load ahead of arrival at {activeTruck.destination?.split(' ')[0]}.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#64748B] hidden md:inline">Optimal Pick:</span>
          <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>
              {recommendedId ? `${recommendedId} (${topPickScore}%)` : 'None Viable'}
            </span>
          </span>
        </div>
      </div>

      {/* 3. 3-Column Core Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Truck Status & Specs (Width 3) */}
        <section className="lg:col-span-3 xl:col-span-3 space-y-4">
          <TruckCard
            truck={activeTruck}
            onFindBackhaul={handleFindBackhaul}
            isMatched={isMatched}
            activeShipmentCount={shipments.filter((s) => !s.isCancelled).length}
          />
        </section>

        {/* Center Column: Map, Simulator, and Ranked Matches (Width 5) */}
        <section className="lg:col-span-5 xl:col-span-5 space-y-4">
          {/* Interactive Leaflet Map */}
          <CorridorMap
            truck={activeTruck}
            shipments={shipments}
            selectedShipmentId={selectedShipmentId}
            recommendedId={recommendedId}
            onSelectShipmentId={(id) => {
              setSelectedShipmentId(id);
              setCurrentStage('explain');
            }}
          />

          {/* Dynamic Generic Disruption Simulator */}
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
            measuredLatencyMs={measuredRecoveryLatency}
          />

          {/* Ranked Shipments List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
                  <span>Ranked Backhaul Matches</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-[#64748B] font-medium">
                    {shipments.filter((s) => !s.isCancelled).length} viable candidates
                  </span>
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  Multi-criteria scored and sorted by AI corridor optimizer
                </p>
              </div>
              <div className="text-[11px] text-[#64748B] flex items-center gap-1">
                <span>Selected:</span>
                <strong className="text-blue-600 font-bold">{selectedShipmentId}</strong>
              </div>
            </div>

            <div className="space-y-3">
              {ranked.map(({ shipment, score }, idx) => (
                <ShipmentCard
                  key={shipment.id}
                  shipment={shipment}
                  score={score}
                  isRecommended={shipment.id === recommendedId}
                  isSelected={shipment.id === selectedShipmentId}
                  rankIndex={idx}
                  onSelect={handleSelectShipment}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Right Column: Explainability Decision Engine (Width 4) */}
        <section className="lg:col-span-4 xl:col-span-4 space-y-4">
          {selectedScore && (
            <ExplainabilityPanel
              shipment={selectedShipment}
              score={selectedScore}
              allShipments={shipments}
              onSelectShipmentId={(id) => setSelectedShipmentId(id)}
              isRecommended={selectedShipment?.id === recommendedId}
            />
          )}
        </section>
      </div>

      {/* 4. Bottom Section: Sustainability Dashboard */}
      <section>
        <SustainabilityDashboard
          metrics={sustainabilityMetrics}
          selectedShipment={selectedShipment}
          truck={activeTruck}
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
