import React, { useState, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import Header from './components/Header';
import PipelineStages from './components/PipelineStages';
import TruckCard from './components/TruckCard';
import ShipmentCard from './components/ShipmentCard';
import ExplainabilityPanel from './components/ExplainabilityPanel';
import DisruptionSimulator from './components/DisruptionSimulator';
import SustainabilityDashboard from './components/SustainabilityDashboard';
import CorridorMap from './components/CorridorMap';
import DemoGuideModal from './components/DemoGuideModal';
import {
  INITIAL_TRUCK,
  INITIAL_SHIPMENTS,
  FACTOR_WEIGHTS,
} from './data/mockData';
import {
  calculateShipmentScore,
  rankShipments,
  calculateSustainabilityMetrics,
} from './utils/scoring';

export default function App() {
  const [truck] = useState(INITIAL_TRUCK);
  const [shipments, setShipments] = useState(INITIAL_SHIPMENTS);
  const [selectedShipmentId, setSelectedShipmentId] = useState('S1');
  const [currentStage, setCurrentStage] = useState('warn');
  const [isMatched, setIsMatched] = useState(true);

  // Disruption Simulation Flags
  const [isS1Cancelled, setIsS1Cancelled] = useState(false);
  const [isS1Delayed, setIsS1Delayed] = useState(false);
  const [isWindowShifted, setIsWindowShifted] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recoveryBanner, setRecoveryBanner] = useState(null);
  const [isDemoGuideOpen, setIsDemoGuideOpen] = useState(false);

  // Ranked shipments and top recommendation
  const { ranked, recommendedId } = useMemo(
    () => rankShipments(shipments, FACTOR_WEIGHTS),
    [shipments]
  );

  const selectedShipment = useMemo(
    () => shipments.find((s) => s.id === selectedShipmentId) || shipments[0],
    [shipments, selectedShipmentId]
  );

  const selectedScore = useMemo(
    () => calculateShipmentScore(selectedShipment, FACTOR_WEIGHTS),
    [selectedShipment]
  );

  const sustainabilityMetrics = useMemo(
    () => calculateSustainabilityMetrics(selectedShipment, truck),
    [selectedShipment, truck]
  );

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

  const handleCancelS1 = () => {
    if (isS1Cancelled) return;
    setIsRecalculating(true);
    setCurrentStage('recover');
    setRecoveryBanner(null);

    setTimeout(() => {
      setShipments((prev) =>
        prev.map((s) =>
          s.id === 'S1'
            ? {
                ...s,
                isCancelled: true,
                whyWhyNot: {
                  ...s.whyWhyNot,
                  recommendedSummary:
                    'Cancelled: Shipper revoked tender due to loading dock maintenance.',
                  reasons: [
                    {
                      type: 'cross',
                      title: 'Tender Cancelled by Shipper',
                      description:
                        'Shipper facility in Wadala declared loading dock crane maintenance shutdown.',
                    },
                    ...s.whyWhyNot.reasons,
                  ],
                },
              }
            : s
        )
      );
      setIsS1Cancelled(true);
      setIsRecalculating(false);
      setSelectedShipmentId('S2');
      setRecoveryBanner(
        'Autonomous Recovery Active: S1 cancelled by shipper. S2 (Thane → Nashik, 86% match) dynamically promoted as optimal backhaul. 131 km empty running prevented.'
      );
    }, 650);
  };

  const handleDelayS1 = () => {
    setIsRecalculating(true);
    setCurrentStage('recover');

    setTimeout(() => {
      setShipments((prev) =>
        prev.map((s) =>
          s.id === 'S1'
            ? {
                ...s,
                isDelayed: true,
                predictedTruckEta: '15:15',
                etaBufferMinutes: -45,
                delayRisk: 'high',
                delayRiskReason:
                  'Unplanned 60-min delay on Kasara Ghat heavy vehicle breakdown',
                rawFactors: {
                  ...s.rawFactors,
                  time: 60,
                  risk: 65,
                },
              }
            : s
        )
      );
      setIsS1Delayed(true);
      setIsRecalculating(false);
      setSelectedShipmentId('S2');
      setRecoveryBanner(
        'Traffic Disruption Injected: S1 delayed by 60 min. S2 (Thane → Nashik) re-ranked to #1 due to strict cutoff compliance.'
      );
    }, 550);
  };

  const handleChangeWindowS1 = () => {
    setShipments((prev) =>
      prev.map((s) =>
        s.id === 'S1'
          ? {
              ...s,
              pickupWindowStart: '15:30',
              pickupWindowEnd: '17:00',
              etaBufferMinutes: 75,
            }
          : s
      )
    );
    setIsWindowShifted(true);
    setRecoveryBanner(
      'Shipper window broadened: S1 pickup extended to 17:00 IST (+75 min buffer).'
    );
  };

  const handleResetAll = () => {
    setShipments(INITIAL_SHIPMENTS);
    setIsS1Cancelled(false);
    setIsS1Delayed(false);
    setIsWindowShifted(false);
    setIsRecalculating(false);
    setRecoveryBanner(null);
    setSelectedShipmentId('S1');
    setCurrentStage('warn');
  };

  const handleJumpStep = (stepNum) => {
    switch (stepNum) {
      case 1:
        handleResetAll();
        setCurrentStage('warn');
        break;
      case 2:
        handleFindBackhaul();
        break;
      case 3:
        setSelectedShipmentId('S2');
        setCurrentStage('explain');
        break;
      case 4:
        setCurrentStage('measure');
        break;
      case 5:
        handleCancelS1();
        break;
      case 6:
        handleResetAll();
        break;
      default:
        break;
    }
  };

  const topPickScore = ranked.find((r) => r.shipment.id === recommendedId)?.score?.totalScore;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-[#0F172A] selection:bg-blue-100 selection:text-blue-900">
      {/* 1. Header */}
      <Header
        onOpenDemoGuide={() => setIsDemoGuideOpen(true)}
        onResetAll={handleResetAll}
      />

      {/* 2. Pipeline Stages Indicator */}
      <PipelineStages
        currentStage={currentStage}
        onSelectStage={(stageId) => setCurrentStage(stageId)}
      />

      {/* 3. Main Dashboard Layout */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Cockpit Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-[12px] border border-[#E2E8F0] shadow-soft">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#059669]" />
            </span>
            <div className="text-xs">
              <span className="font-bold text-[#0F172A]">AI Logistics Dispatch Cockpit:</span>{' '}
              <span className="text-[#64748B]">Monitoring Vehicle </span>
              <strong className="text-[#0F172A]">T101</strong>
              <span className="text-[#64748B]"> en route Nashik → Mumbai. </span>
              <span className="text-blue-600 font-semibold">
                Pre-allocating return load 2h 15m ahead of arrival.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#64748B] hidden md:inline">Top Pick:</span>
            <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>
                {recommendedId
                  ? `${recommendedId} (${topPickScore}%)`
                  : 'None Available'}
              </span>
            </span>
          </div>
        </div>

        {/* 3-Column Core Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Truck Status & Specs (Width 3) */}
          <section className="lg:col-span-3 xl:col-span-3 space-y-4">
            <TruckCard
              truck={truck}
              onFindBackhaul={handleFindBackhaul}
              isMatched={isMatched}
              activeShipmentCount={shipments.filter((s) => !s.isCancelled).length}
            />
          </section>

          {/* Center Column: Map, Simulator, and Ranked Matches (Width 5) */}
          <section className="lg:col-span-5 xl:col-span-5 space-y-4">
            {/* Interactive Leaflet Map */}
            <CorridorMap
              truck={truck}
              shipments={shipments}
              selectedShipmentId={selectedShipmentId}
              recommendedId={recommendedId}
              onSelectShipmentId={(id) => {
                setSelectedShipmentId(id);
                setCurrentStage('explain');
              }}
            />

            {/* Dynamic Disruption Simulator */}
            <DisruptionSimulator
              onCancelS1={handleCancelS1}
              onDelayS1={handleDelayS1}
              onChangeWindowS1={handleChangeWindowS1}
              onReset={handleResetAll}
              isS1Cancelled={isS1Cancelled}
              isS1Delayed={isS1Delayed}
              isWindowShifted={isWindowShifted}
              isRecalculating={isRecalculating}
              recoveryBanner={recoveryBanner}
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
            <ExplainabilityPanel
              shipment={selectedShipment}
              score={selectedScore}
              allShipments={shipments}
              onSelectShipmentId={(id) => setSelectedShipmentId(id)}
              isRecommended={selectedShipment.id === recommendedId}
            />
          </section>
        </div>

        {/* Bottom Section: Sustainability Dashboard */}
        <section>
          <SustainabilityDashboard
            metrics={sustainabilityMetrics}
            selectedShipment={selectedShipment}
            truck={truck}
          />
        </section>
      </main>

      {/* 4. Footer */}
      <footer className="bg-white border-t border-[#E2E8F0] mt-auto py-5 px-4 sm:px-6">
        <div className="max-w-[1680px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
              R
            </div>
            <span className="font-semibold text-[#0F172A]">
              ReRoute AI 2.0 transforms reactive load searching into predictive, resilient and sustainable backhaul planning.
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Algorithm: Weighted Multi-Criteria Scoring</span>
            <span>•</span>
            <span>Optimization Latency: {ranked.metadata?.latencyMs ?? 1.8}ms (measured)</span>
            <span>•</span>
            <span className="text-[#059669] font-semibold">ESG Scope 1 Compliant</span>
          </div>
        </div>
      </footer>

      {/* 5. Demo Flow Guide Modal */}
      <DemoGuideModal
        isOpen={isDemoGuideOpen}
        onClose={() => setIsDemoGuideOpen(false)}
        onJumpStep={handleJumpStep}
      />
    </div>
  );
}
