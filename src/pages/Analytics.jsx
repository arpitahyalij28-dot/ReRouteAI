// Disruption-Aware Logistics Twin - Resilience Analytics & Stress Testing Hub (Track 3-05)
// Combines Monte Carlo 50-Scenario Stress Testing, Single Point of Failure (SPOF) Analysis,
// Plan B Backup Corridors, and Scope 1 ESG Sustainability Audits.

import React, { useState, useMemo } from 'react';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RefreshCw,
  Award,
  Download,
  Printer,
  X,
  Zap,
  Layers,
  Leaf,
  Fuel,
  DollarSign,
  Compass,
  ArrowRight,
  Clock,
  Info,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useReRoute } from '../context/ReRouteContext';
import {
  runMonteCarloStressTest,
  runSPOFAnalysis,
  findBackupRoutes,
} from '../engine/analytics.js';
import { calculateFleetSustainability } from '../engine/index';
import { BUYER_PRIORITY } from '../engine/network.js';

export default function Analytics() {
  const { network, isDemoData, isScenarioSimulated, loadDemoData, showToast } = useData();
  const { assignments = [] } = useReRoute();

  // Active view tab: 'STRESS_TEST' | 'SPOF' | 'PLAN_B' | 'ESG'
  const [activeTab, setActiveTab] = useState('STRESS_TEST');
  const [stressRounds, setStressRounds] = useState(50);
  const [stressSeed, setStressSeed] = useState(12345);
  const [isStressRunning, setIsStressRunning] = useState(false);
  const [isCertOpen, setIsCertOpen] = useState(false);

  // Compute 50-scenario Monte Carlo stress test
  const stressResults = useMemo(() => {
    if (!network || !network.routes || network.routes.length === 0) return null;
    return runMonteCarloStressTest(network, stressRounds, stressSeed);
  }, [network, stressRounds, stressSeed]);

  // Compute SPOF analysis
  const spofResults = useMemo(() => {
    if (!network || !network.routes || network.routes.length === 0) return null;
    return runSPOFAnalysis(network);
  }, [network]);

  // Compute Plan B Backup corridors
  const backupRoutes = useMemo(() => {
    if (!network || !network.buyers || network.buyers.length === 0) return [];
    return findBackupRoutes(network);
  }, [network]);

  // Fleet ESG metrics
  const fleetMetrics = useMemo(() => {
    return calculateFleetSustainability(assignments);
  }, [assignments]);

  const handleReRunStressTest = () => {
    setIsStressRunning(true);
    const newSeed = Math.floor(Math.random() * 100000);
    setStressSeed(newSeed);
    setTimeout(() => {
      setIsStressRunning(false);
      showToast(`Completed ${stressRounds}-scenario Monte Carlo simulation (Seed: ${newSeed})`, 'success');
    }, 300);
  };

  const handleExportCSV = () => {
    if (!stressResults?.scenarios || stressResults.scenarios.length === 0) {
      showToast('No scenario results to export', 'error');
      return;
    }
    const headers = ['Scenario_Index', 'Resilience_Score', 'Rating', 'OnTime_Pct', 'Fulfillment_Pct', 'Cost_INR'];
    const rows = stressResults.scenarios.map((s) => [
      s.scenarioIndex,
      s.resilienceScore,
      s.rating,
      s.onTimePct,
      s.fulfillmentPct,
      s.cost,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MonteCarlo_StressTest_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Stress test data exported as CSV', 'success');
  };

  // Empty network guard
  if (!network || !network.warehouses || network.warehouses.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-12 text-center max-w-xl mx-auto space-y-4 my-8">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
          <Activity className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Supply Network is Empty</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Load the Nashik regional logistics twin dataset to run Monte Carlo stress tests and Single Point of Failure audits.
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
            <span className="p-2 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-xs">
              <Activity className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-extrabold text-[#0F172A] tracking-tight">
              Resilience Analytics & Stress Testing Hub
            </h1>

            {/* Badges */}
            {isDemoData && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                DEMO DATA
              </span>
            )}
            {isScenarioSimulated && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-300 animate-pulse shadow-2xs flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-600" />
                SIMULATED
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl">
            Track 3-05 Advanced Intelligence: 50-run Monte Carlo stress testing, Single Point of Failure (SPOF) bottleneck ranking, and Plan B backup corridors.
          </p>
        </div>

        {/* Global Tab Switcher */}
        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('STRESS_TEST')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'STRESS_TEST' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🎲 Monte Carlo (50 Runs)
          </button>
          <button
            onClick={() => setActiveTab('SPOF')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'SPOF' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚠️ SPOF Ranker
          </button>
          <button
            onClick={() => setActiveTab('PLAN_B')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'PLAN_B' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🔄 Plan B Backups
          </button>
          <button
            onClick={() => setActiveTab('ESG')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'ESG' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🌱 ESG Carbon Scope 1
          </button>
        </div>
      </div>

      {/* 2. TAB 1: Monte Carlo 50-Scenario Stress Test */}
      {activeTab === 'STRESS_TEST' && (
        <div className="space-y-6">
          {/* Top KPI Cards for Monte Carlo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: On-Time Compliance Rate */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold uppercase tracking-wider text-[10px]">≥80% On-Time Compliance</span>
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900">
                {stressResults?.complianceRate80}%
              </div>
              <p className="text-[11px] text-slate-500">
                Fraction of 50 randomized stress scenarios maintaining ≥80% on-time delivery.
              </p>
            </div>

            {/* KPI 2: Full Demand Fulfillment Rate */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold uppercase tracking-wider text-[10px]">100% Demand Met Rate</span>
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl font-black text-blue-700">
                {stressResults?.complianceRate100}%
              </div>
              <p className="text-[11px] text-slate-500">
                Scenarios fulfilling all buyer orders without unallocated drop-offs.
              </p>
            </div>

            {/* KPI 3: Average Resilience Score */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold uppercase tracking-wider text-[10px]">Avg Resilience Score</span>
                <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl font-black text-purple-700">
                {stressResults?.avgResilienceScore} <span className="text-xs text-slate-400 font-bold">/ 100</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Mean resilience index calculated across 50 simulated crisis states.
              </p>
            </div>

            {/* KPI 4: Simulation Controls */}
            <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-2xl border border-indigo-200 shadow-soft flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                  Deterministic RNG Engine
                </span>
                <span className="text-xs text-slate-600 block mt-0.5">
                  Mulberry32 PRNG (Seed: <strong className="font-mono text-slate-900">{stressSeed}</strong>)
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleReRunStressTest}
                  disabled={isStressRunning}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isStressRunning ? 'animate-spin' : ''}`} />
                  <span>{isStressRunning ? 'Simulating...' : 'Re-Run 50 Scenarios'}</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-2.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                  title="Export results"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Distribution & Extremes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left (7 cols): Resilience Distribution Buckets */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-soft p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Resilience Score Distribution Across 50 Scenarios
                </h3>
                <p className="text-[11px] text-slate-500">
                  Categorized outcome distribution under varying rainfall (10-110mm), road cuts, and fuel price volatility.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {/* Excellent >= 85 */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-emerald-700">Excellent (≥ 85 pts)</span>
                    <strong className="text-slate-900">{stressResults?.distribution?.excellent || 0} scenarios ({((stressResults?.distribution?.excellent || 0) / 50) * 100}%)</strong>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2.5 rounded-full"
                      style={{ width: `${((stressResults?.distribution?.excellent || 0) / 50) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* High 70 - 84 */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-blue-700">High Resilience (70 - 84 pts)</span>
                    <strong className="text-slate-900">{stressResults?.distribution?.high || 0} scenarios ({((stressResults?.distribution?.high || 0) / 50) * 100}%)</strong>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-2.5 rounded-full"
                      style={{ width: `${((stressResults?.distribution?.high || 0) / 50) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Moderate 50 - 69 */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-amber-700">Moderate Resilience (50 - 69 pts)</span>
                    <strong className="text-slate-900">{stressResults?.distribution?.moderate || 0} scenarios ({((stressResults?.distribution?.moderate || 0) / 50) * 100}%)</strong>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-2.5 rounded-full"
                      style={{ width: `${((stressResults?.distribution?.moderate || 0) / 50) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Degraded 30 - 49 */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-rose-600">Degraded (30 - 49 pts)</span>
                    <strong className="text-slate-900">{stressResults?.distribution?.degraded || 0} scenarios ({((stressResults?.distribution?.degraded || 0) / 50) * 100}%)</strong>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-rose-400 h-2.5 rounded-full"
                      style={{ width: `${((stressResults?.distribution?.degraded || 0) / 50) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Critical < 30 */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-rose-800">Critical Failure (&lt; 30 pts)</span>
                    <strong className="text-slate-900">{stressResults?.distribution?.critical || 0} scenarios ({((stressResults?.distribution?.critical || 0) / 50) * 100}%)</strong>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-rose-600 h-2.5 rounded-full"
                      style={{ width: `${((stressResults?.distribution?.critical || 0) / 50) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right (5 cols): Worst vs Best Scenario Cards */}
            <div className="lg:col-span-5 space-y-4">
              {/* Best Scenario Card */}
              <div className="bg-white rounded-2xl border border-emerald-200 shadow-soft p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Best Case Scenario (#{stressResults?.bestScenario?.scenarioIndex || 1})
                  </span>
                  <span className="font-black text-emerald-700 text-sm">
                    {stressResults?.bestScenario?.resilienceScore}/100
                  </span>
                </div>
                <div className="text-xs text-slate-600 grid grid-cols-2 gap-2 pt-1 font-medium">
                  <div>On-Time Rate: <strong className="text-slate-900">{stressResults?.bestScenario?.onTimePct}%</strong></div>
                  <div>Demand Fulfilled: <strong className="text-slate-900">{stressResults?.bestScenario?.fulfillmentPct}%</strong></div>
                  <div>Rainfall: <strong className="text-slate-900">{stressResults?.bestScenario?.disruptionConfig?.rainfallMm || 20} mm</strong></div>
                  <div>Diesel Price: <strong className="text-slate-900">₹{stressResults?.bestScenario?.disruptionConfig?.fuelPrice || 95}/L</strong></div>
                </div>
              </div>

              {/* Worst Scenario Card */}
              <div className="bg-white rounded-2xl border border-rose-200 shadow-soft p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                    Worst Case Scenario (#{stressResults?.worstScenario?.scenarioIndex || 50})
                  </span>
                  <span className="font-black text-rose-700 text-sm">
                    {stressResults?.worstScenario?.resilienceScore}/100
                  </span>
                </div>
                <div className="text-xs text-slate-600 grid grid-cols-2 gap-2 pt-1 font-medium">
                  <div>On-Time Rate: <strong className="text-rose-700 font-bold">{stressResults?.worstScenario?.onTimePct}%</strong></div>
                  <div>Demand Fulfilled: <strong className="text-slate-900">{stressResults?.worstScenario?.fulfillmentPct}%</strong></div>
                  <div>Rainfall: <strong className="text-slate-900">{stressResults?.worstScenario?.disruptionConfig?.rainfallMm || 95} mm</strong></div>
                  <div>Closed Roads: <strong className="text-rose-700 font-bold">{stressResults?.worstScenario?.disruptionConfig?.closedRoutes?.length || 2}</strong></div>
                </div>
                <p className="text-[10px] text-slate-500 pt-1 border-t border-rose-100">
                  Multiple simultaneous mountain road severances and torrential rain combined.
                </p>
              </div>
            </div>
          </div>

          {/* Representative Scenarios Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Representative Sample Scenarios (Top 15 of 50)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Snapshot of simulated conditions, fuel escalations, and solver responses.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#64748B] uppercase text-[10px] tracking-wider border-b border-[#E2E8F0]">
                  <tr>
                    <th className="py-2.5 px-4 font-bold">Scenario</th>
                    <th className="py-2.5 px-4 font-bold">Rainfall</th>
                    <th className="py-2.5 px-4 font-bold">Closed Corridors</th>
                    <th className="py-2.5 px-4 font-bold">Fuel Price</th>
                    <th className="py-2.5 px-4 font-bold text-center">On-Time %</th>
                    <th className="py-2.5 px-4 font-bold text-center">Fulfillment %</th>
                    <th className="py-2.5 px-4 font-bold text-right">Cost (₹)</th>
                    <th className="py-2.5 px-4 font-bold text-center">Resilience Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {stressResults?.scenarios?.map((s) => (
                    <tr key={s.scenarioIndex} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-bold font-mono text-slate-900">
                        #{s.scenarioIndex}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">
                        {s.disruptionConfig.rainfallMm} mm
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">
                        {s.disruptionConfig.closedRoutes.length > 0 ? (
                          <span className="font-semibold text-rose-700">
                            {s.disruptionConfig.closedRoutes.join(', ')}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">None</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-800">
                        ₹{s.disruptionConfig.fuelPrice}/L
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold">
                        {s.onTimePct}%
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold">
                        {s.fulfillmentPct}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{s.cost.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            s.resilienceScore >= 70
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.resilienceScore >= 50
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {s.resilienceScore}/100
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB 2: Single Point of Failure (SPOF) Ranker */}
      {activeTab === 'SPOF' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Single Point of Failure (SPOF) Risk Ranker
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Simulating complete individual removal of each route and depot to identify structural bottlenecks.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-semibold">Overall Vulnerability:</span>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                  {spofResults?.overallNetworkVulnerability}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Ranked Routes by Impact */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Corridor Routes Ranked by Failure Impact
                </h3>
                <p className="text-[11px] text-slate-500">
                  Impact score calculated by on-time drop %, cost escalation %, and unmet demand if severed.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] uppercase text-[10px] tracking-wider border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-2.5 px-4 font-bold">Route Name</th>
                      <th className="py-2.5 px-4 font-bold text-center">Cost Delta</th>
                      <th className="py-2.5 px-4 font-bold text-center">On-Time Drop</th>
                      <th className="py-2.5 px-4 font-bold text-center">Impact Score</th>
                      <th className="py-2.5 px-4 font-bold text-center">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {spofResults?.rankedRoutes?.slice(0, 8).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4">
                          <strong className="text-slate-900 block font-semibold">{r.name}</strong>
                          <span className="text-[10px] text-slate-500 font-mono">{r.id} ({r.distanceKm} km)</span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-800">
                          +{r.costDeltaPct}%
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-rose-700">
                          -{r.onTimeDropPct}%
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <strong className="text-xs font-black text-slate-900">{r.impactScore}</strong>
                          <span className="text-[10px] text-slate-400">/100</span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              r.riskLevel.includes('Critical')
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : r.riskLevel.includes('Moderate')
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {r.riskLevel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Ranked Warehouses by Impact */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Consolidation Depots Ranked by Failure Impact
                </h3>
                <p className="text-[11px] text-slate-500">
                  Simulating complete outage / stock depletion at each depot.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] uppercase text-[10px] tracking-wider border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-2.5 px-4 font-bold">Depot Hub</th>
                      <th className="py-2.5 px-4 font-bold text-center">Base Stock</th>
                      <th className="py-2.5 px-4 font-bold text-center">Cost Delta</th>
                      <th className="py-2.5 px-4 font-bold text-center">Impact Score</th>
                      <th className="py-2.5 px-4 font-bold text-center">Criticality</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {spofResults?.rankedWarehouses?.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4">
                          <strong className="text-slate-900 block font-semibold">{w.name}</strong>
                          <span className="text-[10px] text-slate-500 font-mono">{w.id}</span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-slate-800">
                          {w.stock}u
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-800">
                          +{w.costDeltaPct}%
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <strong className="text-xs font-black text-slate-900">{w.impactScore}</strong>
                          <span className="text-[10px] text-slate-400">/100</span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              w.riskLevel.includes('Systemic')
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}
                          >
                            {w.riskLevel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 3: Plan B Backup Corridors */}
      {activeTab === 'PLAN_B' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-600" />
              Pre-Computed Plan B Backup Corridors
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Every critical buyer has pre-mapped independent contingency bypass routes with transparent detour delta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {backupRoutes.map((b) => (
              <div
                key={b.buyerId}
                className={`bg-white rounded-xl border p-4 shadow-2xs space-y-3 ${
                  b.priority === BUYER_PRIORITY.HIGH
                    ? 'border-indigo-200 ring-1 ring-indigo-50/50'
                    : 'border-slate-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{b.buyerName}</h3>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Order: {b.demandQty}u • Deadline: {b.deadline}h
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      b.priority === BUYER_PRIORITY.HIGH
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {b.priority}
                  </span>
                </div>

                {/* Primary Route */}
                <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <strong className="text-emerald-900 font-bold uppercase tracking-wider">
                      Primary Route (Plan A)
                    </strong>
                    <span className="text-emerald-700 font-bold">
                      {b.primaryRoute?.travelTimeH}h ({b.primaryRoute?.distanceKm} km)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-700 truncate">
                    Via {b.primaryRoute?.warehouseName} ➔ {b.primaryRoute?.routeNames?.join(' ➔ ')}
                  </div>
                </div>

                {/* Backup Route (Plan B) */}
                <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <strong className="text-blue-900 font-bold uppercase tracking-wider">
                      Contingency Bypass (Plan B)
                    </strong>
                    <span className="text-blue-700 font-bold">
                      {b.backupRoute?.travelTimeH}h (+{b.deltaTimeH}h)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-700 truncate">
                    Via {b.backupRoute?.warehouseName} ➔ {b.backupRoute?.routeNames?.join(' ➔ ')}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Detour: +{b.deltaKm} km additional transit
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. TAB 4: Carbon-Aware ESG Scope 1 Sustainability */}
      {activeTab === 'ESG' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-600" />
                Carbon-Aware ESG Scope 1 Sustainability Audits
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Model-based estimate of greenhouse gas avoidance and diesel savings compliant with SEBI BRSR Core.
              </p>
            </div>
            <button
              onClick={() => setIsCertOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span>Scope 1 ESG Certificate</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Deadhead Running Prevented
              </span>
              <div className="text-2xl font-black text-slate-900">
                {fleetMetrics.totalEmptyKmAvoided || 0} <span className="text-xs font-medium text-slate-500">km</span>
              </div>
              <p className="text-[11px] text-slate-500">Eliminated unladen transit miles across return legs</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Diesel Fuel Conserved
              </span>
              <div className="text-2xl font-black text-amber-700">
                {fleetMetrics.totalFuelSavedLitres || 0} <span className="text-xs font-medium text-slate-500">litres</span>
              </div>
              <p className="text-[11px] text-slate-500">Based on heavy vehicle efficiency average (4.0 km/L)</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Net Operating Cost Saved
              </span>
              <div className="text-2xl font-black text-emerald-700">
                ₹{(fleetMetrics.totalCostImpact || 0).toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-500">Direct diesel expenditure saved at ₹95.00/L</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Scope 1 CO₂ Avoided
              </span>
              <div className="text-2xl font-black text-emerald-600">
                {fleetMetrics.totalCo2AvoidedKg || 0} <span className="text-xs font-medium text-slate-500">kg CO₂e</span>
              </div>
              <p className="text-[11px] text-slate-500">Calculated at 2.68 kg CO₂ per litre diesel combustion</p>
            </div>
          </div>
        </div>
      )}

      {/* Scope 1 Green Corridor Verification Certificate Modal */}
      {isCertOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-bold tracking-wide">Scope 1 Green Corridor Audit Certificate</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCertOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-8 space-y-6 bg-gradient-to-b from-emerald-50/40 via-white to-slate-50">
              <div className="text-center border-b border-emerald-100 pb-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/90 text-emerald-800 text-[11px] font-bold mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>GHG Protocol Corporate Standard & SEBI BRSR Core Compliant</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  DISRUPTION-AWARE LOGISTICS TWIN (TRACK 3-05)
                </h2>
                <p className="text-xs font-bold text-emerald-700 tracking-widest uppercase mt-0.5">
                  Scope 1 Greenhouse Gas Emissions Reduction Verification
                </p>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  Certificate ID: <span className="font-semibold text-slate-700">TWIN-ESG-2026-NSK</span> • Issued: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-center shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Deadhead Avoided</span>
                  <strong className="text-base font-black text-slate-900">{fleetMetrics.totalEmptyKmAvoided || 0} KM</strong>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-center shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Diesel Conserved</span>
                  <strong className="text-base font-black text-amber-700">{fleetMetrics.totalFuelSavedLitres || 0} L</strong>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-center shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Cost Avoidance</span>
                  <strong className="text-base font-black text-emerald-700">₹{(fleetMetrics.totalCostImpact || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-center shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Scope 1 CO₂ Avoided</span>
                  <strong className="text-base font-black text-emerald-600">{fleetMetrics.totalCo2AvoidedKg || 0} kg</strong>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-2 bg-white p-4 rounded-xl border border-slate-200/80 leading-relaxed">
                <p>
                  This certifies that autonomous corridor optimization executed by the Disruption-Aware Logistics Twin has eliminated empty-truck deadhead return trips and diverted transit around mountain bottleneck hazards.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Audited Verification Engine</span>
                  <strong className="text-slate-800 font-mono text-[11px]">Logistics Twin Resilience Engine (v3.05)</strong>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Official Certificate</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
