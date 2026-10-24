// Disruption-Aware Logistics Twin - Recovery Plan & Plan Comparison Page (Track 3-05)
// Benchmarks Baseline (Normal) vs Disrupted (Basic Naive) vs Disrupted (Resilient Recovery)
// Provides 0-100 Resilience Score breakdown, 6-item Live Validator Checklist, and Explainability.

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  Clock,
  Truck,
  Warehouse,
  Zap,
  ArrowRight,
  Download,
  Share2,
  RefreshCw,
  Info,
  Sliders,
  DollarSign,
  Activity,
  FileText,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import {
  generatePlanComparison,
  solveRecoveryPlan,
  solveDisruptedBasicPlan,
} from '../engine/planner.js';
import { calculateResilienceScore, RESILIENCE_FORMULA_EXPLANATION } from '../engine/resilience.js';
import { validateDispatchPlan } from '../engine/validation.js';
import { BUYER_PRIORITY } from '../engine/network.js';

export default function Assignments() {
  const {
    network,
    isDemoData,
    disruptionsConfig,
    isScenarioSimulated,
    loadDemoData,
    showToast,
  } = useData();

  // Optimization mode state: 'resilient' | 'cheapest' | 'fastest'
  const [solverMode, setSolverMode] = useState('resilient');
  const [selectedPlanTab, setSelectedPlanTab] = useState('recovery'); // 'recovery' | 'disruptionBasic' | 'normal'
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);
  const [buyerFilter, setBuyerFilter] = useState('ALL'); // 'ALL' | 'HIGH_PRIORITY'

  // Generate 3-Way Plan Comparison live
  const comparison = useMemo(() => {
    if (!network || !network.warehouses || network.warehouses.length === 0) {
      return null;
    }
    return generatePlanComparison(network, disruptionsConfig, { mode: solverMode });
  }, [network, disruptionsConfig, solverMode]);

  const normalPlan = comparison?.plans?.normal || null;
  const disruptionBasicPlan = comparison?.plans?.disruptionBasic || null;
  const recoveryPlan = comparison?.plans?.recovery || null;

  // Active plan for deep-dive tabs
  const activePlan = useMemo(() => {
    if (selectedPlanTab === 'disruptionBasic') return disruptionBasicPlan;
    if (selectedPlanTab === 'normal') return normalPlan;
    return recoveryPlan;
  }, [selectedPlanTab, disruptionBasicPlan, normalPlan, recoveryPlan]);

  // Resilience score & breakdown for all 3 plans
  const normalResilience = useMemo(() => {
    return calculateResilienceScore(normalPlan, normalPlan, network);
  }, [normalPlan, network]);

  const basicResilience = useMemo(() => {
    const disruptedNet = comparison?.disruptionReport?.disruptedNetwork || network;
    return calculateResilienceScore(disruptionBasicPlan, normalPlan, disruptedNet);
  }, [disruptionBasicPlan, normalPlan, comparison, network]);

  const recoveryResilience = useMemo(() => {
    const disruptedNet = comparison?.disruptionReport?.disruptedNetwork || network;
    return calculateResilienceScore(recoveryPlan, normalPlan, disruptedNet);
  }, [recoveryPlan, normalPlan, comparison, network]);

  // Live validator checklist for the active plan
  const validationResult = useMemo(() => {
    if (!activePlan || !network) return null;
    const targetNet =
      selectedPlanTab === 'normal'
        ? network
        : comparison?.disruptionReport?.disruptedNetwork || network;
    return validateDispatchPlan(activePlan, targetNet);
  }, [activePlan, network, selectedPlanTab, comparison]);

  // Filtered allocations for the active plan
  const allocations = useMemo(() => {
    if (!activePlan || !activePlan.allocations) return [];
    if (buyerFilter === 'HIGH_PRIORITY') {
      return activePlan.allocations.filter((a) => a.buyerPriority === BUYER_PRIORITY.HIGH);
    }
    return activePlan.allocations;
  }, [activePlan, buyerFilter]);

  // Infeasible / unmet demand list
  const unmetDemands = useMemo(() => {
    if (!activePlan?.perBuyerResults) return [];
    return Object.values(activePlan.perBuyerResults).filter((r) => r.pendingQty > 0);
  }, [activePlan]);

  // Handle WhatsApp Dispatch Plan Share
  const handleShareWhatsApp = () => {
    if (!recoveryPlan) return;
    const totals = recoveryPlan.totals;
    const text =
      `🚚 *Disruption-Aware Logistics Recovery Dispatch*\n` +
      `• Mode: ${solverMode.toUpperCase()}\n` +
      `• Resilience Score: ${recoveryResilience.score}/100 (${recoveryResilience.rating})\n` +
      `• On-Time Fulfillment: ${totals.onTimePct}%\n` +
      `• Total Delivered: ${totals.totalDelivered} units\n` +
      `• Unmet Pending: ${totals.totalPending} units\n` +
      `• Total Network Cost: ₹${(totals.cost || 0).toLocaleString('en-IN')}\n` +
      `• Live Validation: ${validationResult?.isValid ? 'ALL 6 CONSTRAINTS VERIFIED' : 'VIOLATIONS DETECTED'}\n` +
      `• View Live Twin: https://reroute-fleet.vercel.app/assignments`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Export JSON
  const handleExportJSON = () => {
    if (!activePlan) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activePlan, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `recovery_plan_${selectedPlanTab}_${Date.now()}.json`);
    dlAnchor.click();
    showToast('Dispatch plan exported as JSON', 'success');
  };

  // Empty network guard
  if (!network || !network.warehouses || network.warehouses.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-12 text-center max-w-xl mx-auto space-y-4 my-8">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
          <Layers className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Supply Network is Empty</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          The logistics digital twin requires network nodes (warehouses, buyers, routes) to compute resilient recovery plans.
        </p>
        <button
          onClick={() => loadDemoData('replace')}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Load Demo Supply Network
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Bar with Track 3-05 Identity & Badges */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-soft flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-extrabold text-[#0F172A] tracking-tight">
              Recovery Plan & Multi-Plan Benchmark
            </h1>

            {/* Mandatory Badges */}
            {isDemoData && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                DEMO DATA
              </span>
            )}
            {isScenarioSimulated && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-300 animate-pulse shadow-2xs flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-600" />
                SIMULATED DISRUPTION ACTIVE
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl">
            Track 3-05 Digital Twin: Benchmarking baseline efficiency, naive disruption collapse, and resilient contingency rerouting with live constraint validation.
          </p>
        </div>

        {/* Controls: Mode Switcher & Quick Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Optimization Mode Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setSolverMode('resilient')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                solverMode === 'resilient'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Prioritizes on-time delivery, emergency buffer stock, and bypass routes"
            >
              🛡️ Most Resilient
            </button>
            <button
              onClick={() => setSolverMode('cheapest')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                solverMode === 'cheapest'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Minimizes transport and detour fuel costs"
            >
              💰 Cheapest
            </button>
            <button
              onClick={() => setSolverMode('fastest')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                solverMode === 'fastest'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Minimizes travel time and lateness"
            >
              ⚡ Fastest
            </button>
          </div>

          <Link
            to="/disruptions"
            className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-all inline-flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>Problem Simulator</span>
          </Link>
        </div>
      </div>

      {/* 2. Three-Way Plan Comparison Table (Normal vs Disrupted Basic vs Recovery) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-soft overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Three-Way Plan Comparison: Baseline vs Naive vs Resilient Recovery
            </h2>
            <p className="text-[11px] text-slate-500">
              Demonstrates the catastrophic failure of naive shortest-route planning under disruption and the recovery solver’s resilience gain.
            </p>
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            Current Optimization Goal: <span className="font-extrabold text-blue-700 capitalize">{solverMode}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#64748B] uppercase text-[10px] tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3 px-4 font-bold">Dispatch Strategy</th>
                <th className="py-3 px-4 font-bold">Network Condition</th>
                <th className="py-3 px-4 font-bold text-right">Total Cost (₹)</th>
                <th className="py-3 px-4 font-bold text-center">Avg Transit (h)</th>
                <th className="py-3 px-4 font-bold text-center">On-Time %</th>
                <th className="py-3 px-4 font-bold text-center">Late Qty</th>
                <th className="py-3 px-4 font-bold text-center">Pending / Unmet</th>
                <th className="py-3 px-4 font-bold text-center">Resilience Score</th>
                <th className="py-3 px-4 font-bold text-center">Action / View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {/* Row 1: Baseline Normal Plan */}
              <tr
                onClick={() => setSelectedPlanTab('normal')}
                className={`cursor-pointer transition-colors ${
                  selectedPlanTab === 'normal' ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50'
                }`}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <div>
                      <strong className="text-slate-900 block text-xs">Normal Dispatch (Baseline)</strong>
                      <span className="text-[10px] text-slate-500">Pre-disruption optimal plan</span>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    All Routes Clear
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                  ₹{(normalPlan?.totals?.cost || 0).toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-4 text-center font-medium">
                  {normalPlan?.totals?.avgDeliveryTime || 3.2}h
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {normalPlan?.totals?.onTimePct || 100}%
                  </span>
                </td>
                <td className="py-3 px-4 text-center font-medium text-slate-600">
                  {normalPlan?.totals?.totalLate || 0}u
                </td>
                <td className="py-3 px-4 text-center font-medium text-slate-600">
                  {normalPlan?.totals?.totalPending || 0}u
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="font-extrabold text-emerald-700 text-xs">
                      {normalResilience.score}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold">/100</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlanTab('normal');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      selectedPlanTab === 'normal'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Inspect Plan
                  </button>
                </td>
              </tr>

              {/* Row 2: Disrupted Naive Basic Plan */}
              <tr
                onClick={() => setSelectedPlanTab('disruptionBasic')}
                className={`cursor-pointer transition-colors ${
                  selectedPlanTab === 'disruptionBasic'
                    ? 'bg-rose-50/70 font-semibold'
                    : 'hover:bg-slate-50'
                }`}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <div>
                      <strong className="text-rose-900 block text-xs">Disrupted: Naive Basic Strategy</strong>
                      <span className="text-[10px] text-rose-500">No alternate routing / nearest-only</span>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Disrupted Network
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-rose-900">
                  ₹{(disruptionBasicPlan?.totals?.cost || 0).toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-4 text-center font-medium">
                  {disruptionBasicPlan?.totals?.avgDeliveryTime || 3.5}h
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                    {disruptionBasicPlan?.totals?.onTimePct || 0}%
                  </span>
                </td>
                <td className="py-3 px-4 text-center font-medium text-rose-700">
                  {disruptionBasicPlan?.totals?.totalLate || 0}u
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                    {disruptionBasicPlan?.totals?.totalPending || 0}u Unmet
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200">
                    <span className="font-extrabold text-rose-700 text-xs">
                      {basicResilience.score}
                    </span>
                    <span className="text-[10px] text-rose-600 font-semibold">/100</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlanTab('disruptionBasic');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      selectedPlanTab === 'disruptionBasic'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Inspect Plan
                  </button>
                </td>
              </tr>

              {/* Row 3: Disrupted Resilient Recovery Plan */}
              <tr
                onClick={() => setSelectedPlanTab('recovery')}
                className={`cursor-pointer transition-colors ${
                  selectedPlanTab === 'recovery'
                    ? 'bg-indigo-50/80 font-bold border-l-4 border-l-blue-600'
                    : 'hover:bg-slate-50'
                }`}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-300"></span>
                    <div>
                      <strong className="text-blue-900 block text-xs">Disrupted: Resilient Recovery Solver</strong>
                      <span className="text-[10px] text-blue-600">Multi-commodity bypass & buffer optimization</span>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                    Disrupted Network
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-blue-950">
                  ₹{(recoveryPlan?.totals?.cost || 0).toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-4 text-center font-medium">
                  {recoveryPlan?.totals?.avgDeliveryTime || 3.8}h
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                    {recoveryPlan?.totals?.onTimePct || 0}%
                  </span>
                </td>
                <td className="py-3 px-4 text-center font-medium text-amber-700">
                  {recoveryPlan?.totals?.totalLate || 0}u
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {recoveryPlan?.totals?.totalPending || 0}u Unmet
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 text-white shadow-xs">
                    <span className="font-black text-xs">{recoveryResilience.score}</span>
                    <span className="text-[10px] text-blue-100 font-medium">/100</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlanTab('recovery');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                      selectedPlanTab === 'recovery'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    Recommended
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Middle Section: Resilience Score Card (0-100) + Live Validator Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Resilience Score Card with Formula Tooltip & 5-Factor Breakdown */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-soft p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-slate-900">Resilience Score Card (0 - 100)</h2>
            </div>
            <button
              onClick={() => setShowFormulaInfo(!showFormulaInfo)}
              className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Click to view full mathematical formula"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          {/* Formula Tooltip Dropdown */}
          {showFormulaInfo && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 space-y-1.5 animate-fadeIn">
              <strong className="block text-slate-900 font-bold">Standard Resilience Formula:</strong>
              <p className="font-mono text-[10px] text-blue-700 leading-relaxed bg-white p-2 rounded-lg border border-slate-200">
                {RESILIENCE_FORMULA_EXPLANATION}
              </p>
              <p className="text-[10px] text-slate-500">
                Penalizes unfulfilled high-priority hospital/mandi demand 3.5× heavier than low priority cargo.
              </p>
            </div>
          )}

          {/* Active Score Display */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-white border border-blue-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                {selectedPlanTab === 'recovery'
                  ? 'Recovery Plan Resilience'
                  : selectedPlanTab === 'disruptionBasic'
                  ? 'Naive Disrupted Resilience'
                  : 'Baseline Normal Resilience'}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {selectedPlanTab === 'recovery'
                    ? recoveryResilience.score
                    : selectedPlanTab === 'disruptionBasic'
                    ? basicResilience.score
                    : normalResilience.score}
                </span>
                <span className="text-xs text-slate-500 font-bold">/ 100</span>
              </div>
              <span
                className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  (selectedPlanTab === 'recovery' ? recoveryResilience.score : basicResilience.score) >=
                  70
                    ? 'bg-emerald-100 text-emerald-800'
                    : (selectedPlanTab === 'recovery'
                        ? recoveryResilience.score
                        : basicResilience.score) >= 50
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {selectedPlanTab === 'recovery'
                  ? recoveryResilience.rating
                  : selectedPlanTab === 'disruptionBasic'
                  ? basicResilience.rating
                  : normalResilience.rating}
              </span>
            </div>

            {/* Visual Ring / Icon */}
            <div className="w-16 h-16 rounded-full bg-white shadow-soft border-4 border-blue-500 flex items-center justify-center text-blue-600 font-black text-base">
              {selectedPlanTab === 'recovery'
                ? recoveryResilience.score
                : selectedPlanTab === 'disruptionBasic'
                ? basicResilience.score
                : normalResilience.score}
              %
            </div>
          </div>

          {/* 5-Factor Component Breakdown */}
          <div className="space-y-2.5 pt-1">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Score Component Breakdown
            </h3>

            {/* 1. On-Time Delivery */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">On-Time Delivery (40%)</span>
                <span className="font-bold text-slate-900">
                  {selectedPlanTab === 'recovery'
                    ? recoveryResilience.breakdown?.onTime.score
                    : basicResilience.breakdown?.onTime.score}{' '}
                  / 40 pts
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      ((selectedPlanTab === 'recovery'
                        ? recoveryResilience.breakdown?.onTime.score || 0
                        : basicResilience.breakdown?.onTime.score || 0) /
                        40) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            {/* 2. Unmet Demand / Fulfillment */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Demand Fulfilled (25%)</span>
                <span className="font-bold text-slate-900">
                  {selectedPlanTab === 'recovery'
                    ? recoveryResilience.breakdown?.fulfillment.score
                    : basicResilience.breakdown?.fulfillment.score}{' '}
                  / 25 pts
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      ((selectedPlanTab === 'recovery'
                        ? recoveryResilience.breakdown?.fulfillment.score || 0
                        : basicResilience.breakdown?.fulfillment.score || 0) /
                        25) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            {/* 3. Cost Stability */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Cost Stability vs Normal (15%)</span>
                <span className="font-bold text-slate-900">
                  {selectedPlanTab === 'recovery'
                    ? recoveryResilience.breakdown?.costStability.score
                    : basicResilience.breakdown?.costStability.score}{' '}
                  / 15 pts
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      ((selectedPlanTab === 'recovery'
                        ? recoveryResilience.breakdown?.costStability.score || 0
                        : basicResilience.breakdown?.costStability.score || 0) /
                        15) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            {/* 4. Corridor Redundancy */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Route Diversity & Backups (10%)</span>
                <span className="font-bold text-slate-900">
                  {selectedPlanTab === 'recovery'
                    ? recoveryResilience.breakdown?.routeDiversity.score
                    : basicResilience.breakdown?.routeDiversity.score}{' '}
                  / 10 pts
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      ((selectedPlanTab === 'recovery'
                        ? recoveryResilience.breakdown?.routeDiversity.score || 0
                        : basicResilience.breakdown?.routeDiversity.score || 0) /
                        10) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            {/* 5. Stock Buffer Retention */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Stock Buffer Retention (10%)</span>
                <span className="font-bold text-slate-900">
                  {selectedPlanTab === 'recovery'
                    ? recoveryResilience.breakdown?.stockBuffer.score
                    : basicResilience.breakdown?.stockBuffer.score}{' '}
                  / 10 pts
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      ((selectedPlanTab === 'recovery'
                        ? recoveryResilience.breakdown?.stockBuffer.score || 0
                        : basicResilience.breakdown?.stockBuffer.score || 0) /
                        10) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Live Validator Checklist (6 items) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] shadow-soft p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Live Dispatch Validator Checklist</h2>
                <p className="text-[11px] text-slate-500">
                  Verifying mathematical feasibility across all 6 supply network hard constraints.
                </p>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-black ${
                validationResult?.isValid
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {validationResult?.isValid ? 'ALL 6 CONSTRAINTS PASSED' : 'CONSTRAINTS VIOLATED'}
            </span>
          </div>

          {/* Checklist Items */}
          <div className="space-y-2.5">
            {validationResult?.checklist?.map((item, idx) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                  item.passed
                    ? 'bg-slate-50/70 border-slate-200'
                    : 'bg-rose-50/80 border-rose-200 text-rose-900'
                }`}
              >
                <div className="mt-0.5">
                  {item.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {idx + 1}. {item.name}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                        item.passed
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{item.details}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Infeasible Violations Log if any */}
          {validationResult && !validationResult.isValid && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
              <strong className="block font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Active Violations Detected:
              </strong>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {validationResult.violations.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 4. Recovery Allocation Dispatch Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-soft overflow-hidden space-y-0">
        <div className="p-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-blue-100 text-blue-700">
                <Layers className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                {selectedPlanTab === 'recovery'
                  ? 'Recommended Resilient Recovery Dispatches'
                  : selectedPlanTab === 'disruptionBasic'
                  ? 'Naive Disrupted Strategy Dispatches'
                  : 'Baseline Normal Dispatches'}
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Exact routing, depot origins, vehicle assignments, and on-time ETAs.
            </p>
          </div>

          {/* Controls: Filter & Export */}
          <div className="flex items-center gap-2">
            <select
              value={buyerFilter}
              onChange={(e) => setBuyerFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-blue-500"
            >
              <option value="ALL">All Buyers ({activePlan?.allocations?.length || 0})</option>
              <option value="HIGH_PRIORITY">High Priority Only (Hospital / Mandi)</option>
            </select>

            <button
              onClick={handleExportJSON}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition-colors"
              title="Download dispatch plan as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
              title="Share recovery plan via WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Plan</span>
            </button>
          </div>
        </div>

        {allocations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No allocations recorded for this plan filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] uppercase text-[10px] tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4 font-bold">Allocation ID</th>
                  <th className="py-3 px-4 font-bold">Origin Depot</th>
                  <th className="py-3 px-4 font-bold">Destination Buyer</th>
                  <th className="py-3 px-4 font-bold">Vehicle Assigned</th>
                  <th className="py-3 px-4 font-bold text-center">Shipped Qty</th>
                  <th className="py-3 px-4 font-bold">Route Corridor & Hops</th>
                  <th className="py-3 px-4 font-bold text-center">ETA vs Deadline</th>
                  <th className="py-3 px-4 font-bold text-right">Trip Cost (₹)</th>
                  <th className="py-3 px-4 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {allocations.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <strong className="text-slate-900 block font-mono text-xs">{a.id}</strong>
                      <span className="text-[10px] text-slate-500">{a.distanceKm} km</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-blue-700 block">{a.warehouseName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{a.warehouseId}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{a.buyerName}</span>
                        {a.buyerPriority === BUYER_PRIORITY.HIGH && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-extrabold uppercase">
                            High Priority
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block">{a.buyerId}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 block">{a.vehicleType}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {a.vehicleId} • {a.trips || 1} Trip
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      {a.quantity} units
                    </td>
                    <td className="py-3 px-4 max-w-[240px]">
                      <span className="text-slate-700 font-medium block truncate text-[11px]">
                        {Array.isArray(a.pathNames) ? a.pathNames.join(' ➔ ') : a.path?.join(' ➔ ')}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {a.decisionReason || 'Optimal multi-commodity flow'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="font-bold text-slate-900">{a.etaH}h</span>
                        <span className="text-slate-400 text-[10px]">/ {a.deadlineH}h</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{a.cost.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {a.isOnTime ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          On-Time
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
                          +{a.latenessH}h Late
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Per-Buyer Fulfillment Cards ("Why this plan?") */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Per-Buyer Order Fulfillment & Deterministic Explainability
            </h2>
            <p className="text-[11px] text-slate-500">
              Clear mathematical justification for each buyer destination and order fulfillment status.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {network.buyers?.length || 0} Critical Regional Buyers
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {network.buyers?.map((buyer) => {
            const result = activePlan?.perBuyerResults?.[buyer.id] || {
              demandQty: buyer.demandQty,
              deliveredQty: 0,
              onTimeQty: 0,
              lateQty: 0,
              pendingQty: buyer.demandQty,
              isFullySatisfied: false,
              reasons: [],
            };

            const isHighPriority = buyer.priority === BUYER_PRIORITY.HIGH;
            const isFulfilled = result.deliveredQty >= buyer.demandQty;

            return (
              <div
                key={buyer.id}
                className={`bg-white rounded-xl border p-4 shadow-2xs space-y-3 transition-all ${
                  isHighPriority
                    ? 'border-indigo-200 ring-1 ring-indigo-50/50'
                    : 'border-slate-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{buyer.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {buyer.location?.name || buyer.id}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      isHighPriority
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {buyer.priority} Priority
                  </span>
                </div>

                {/* Demand & Delivery Metrics */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Demanded</span>
                    <strong className="text-xs text-slate-900">{buyer.demandQty}u</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 block">On-Time</span>
                    <strong className="text-xs text-emerald-700">{result.onTimeQty}u</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-600 block">Pending</span>
                    <strong
                      className={`text-xs ${
                        result.pendingQty > 0 ? 'text-rose-700 font-extrabold' : 'text-slate-400'
                      }`}
                    >
                      {result.pendingQty}u
                    </strong>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Fulfillment Ratio</span>
                    <span className="font-bold text-slate-800">
                      {Math.round(((result.deliveredQty || 0) / (buyer.demandQty || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        isFulfilled ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(((result.deliveredQty || 0) / (buyer.demandQty || 1)) * 100)
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Deterministic "Why this plan?" Explainability Box */}
                <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 text-[11px] text-slate-700 space-y-1">
                  <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-blue-600" />
                    Why This Plan?
                  </span>
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    {result.reasons && result.reasons.length > 0
                      ? result.reasons.join(' ')
                      : `Selected optimal warehouse corridor based on stock buffer retention and arrival within the ${buyer.deadline}h commitment.`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Infeasible / Unmet Demand Section */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-soft p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
            <AlertTriangle className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Infeasible Demand & Bottleneck Root-Cause Report
            </h2>
            <p className="text-[11px] text-slate-500">
              Audit trail of any unfilled buyer orders, capacity limits, and physical route disruptions.
            </p>
          </div>
        </div>

        {unmetDemands.length === 0 ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Zero Unmet Orders:</strong> 100% of demand across all {network.buyers?.length || 0}{' '}
              buyers successfully fulfilled by the solver within all capacity limits.
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {unmetDemands.map((u) => (
              <div
                key={u.buyerId}
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <strong className="block text-rose-950 font-bold">
                    {u.buyerName} — {u.pendingQty} units unmet
                  </strong>
                  <span className="text-[11px] text-rose-700 block mt-0.5">
                    {u.reasons?.join(' ') ||
                      'Depot stock depleted or connecting mountain corridors severed.'}
                  </span>
                </div>
                <Link
                  to="/disruptions"
                  className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-[10px] font-bold text-rose-800 hover:bg-rose-100 transition-colors shrink-0"
                >
                  Adjust Disruption Sliders ➔
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
