// ReRoute AI 2.0 - Model Configuration & Sensitivity Analysis Page
// Multi-attribute weight tuning with auto-normalization and live +/-10 pt sensitivity matrix.

import React, { useState, useMemo } from 'react';
import { Sliders, CheckCircle2, RotateCcw, Activity, ShieldCheck, Info, CloudRain } from 'lucide-react';
import { useReRoute } from '../context/ReRouteContext';
import { normalizeWeights, evaluateShipments, DEFAULT_WEATHER_PENALTIES } from '../engine/index';
import { FACTOR_WEIGHTS } from '../data/mockData';

export default function Settings() {
  const { settings, updateSettings, trucks, shipments } = useReRoute();
  const [weights, setWeights] = useState(settings?.weights || FACTOR_WEIGHTS);
  const [speedKmH, setSpeedKmH] = useState(settings?.speedKmH || 45);
  const [maxDetourKm, setMaxDetourKm] = useState(settings?.maxDetourKm || 80);
  const [fuelPrice, setFuelPrice] = useState(settings?.fuelPrice || 95.0);
  const [weatherEnabled, setWeatherEnabled] = useState(settings?.weatherEnabled !== false);
  const [weatherPenalties, setWeatherPenalties] = useState(
    settings?.weatherPenalties || DEFAULT_WEATHER_PENALTIES
  );
  const [isSaved, setIsSaved] = useState(false);

  const activeTruck = trucks[0];

  // Auto-normalize weights whenever slider changes
  const handleWeightChange = (key, value) => {
    setIsSaved(false);
    const newWeights = { ...weights, [key]: Number(value) };
    const normalized = normalizeWeights(newWeights);
    setWeights(normalized);
  };

  const handleResetDefaults = () => {
    setWeights(FACTOR_WEIGHTS);
    setSpeedKmH(45);
    setMaxDetourKm(80);
    setFuelPrice(95.0);
    setWeatherEnabled(true);
    setWeatherPenalties({ ...DEFAULT_WEATHER_PENALTIES });
    setIsSaved(false);
  };

  const handleSave = async () => {
    await updateSettings({
      weights,
      speedKmH: Number(speedKmH),
      maxDetourKm: Number(maxDetourKm),
      fuelPrice: Number(fuelPrice),
      weatherEnabled,
      weatherPenalties,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Base ranking with current weights & weather
  const baseEvaluated = useMemo(() => {
    if (!activeTruck || shipments.length === 0) return [];
    return evaluateShipments(activeTruck, shipments, {
      weights,
      speedKmH,
      maxDetourKm,
      weather: settings?.weather,
      weatherEnabled,
      weatherPenalties,
    });
  }, [activeTruck, shipments, weights, speedKmH, maxDetourKm, settings?.weather, weatherEnabled, weatherPenalties]);

  const baseTopPick = baseEvaluated.find((e) => e.isFeasible)?.shipmentId || 'None';

  // Sensitivity Analysis: For each factor, check top pick when factor moves +10 and -10 points
  const sensitivityMatrix = useMemo(() => {
    if (!activeTruck || shipments.length === 0) return [];

    const factorKeys = ['route', 'time', 'capacity', 'detour', 'cost', 'disruption'];
    return factorKeys.map((factorKey) => {
      // Shift +10 points
      const plusWeights = normalizeWeights({ ...weights, [factorKey]: (weights[factorKey] || 15) + 10 });
      const plusEval = evaluateShipments(activeTruck, shipments, { weights: plusWeights, speedKmH, maxDetourKm });
      const plusTopPick = plusEval.find((e) => e.isFeasible)?.shipmentId || 'None';

      // Shift -10 points
      const minusWeights = normalizeWeights({ ...weights, [factorKey]: Math.max(0, (weights[factorKey] || 15) - 10) });
      const minusEval = evaluateShipments(activeTruck, shipments, { weights: minusWeights, speedKmH, maxDetourKm });
      const minusTopPick = minusEval.find((e) => e.isFeasible)?.shipmentId || 'None';

      const isStable = plusTopPick === baseTopPick && minusTopPick === baseTopPick;

      return {
        factorKey,
        currentWeight: weights[factorKey] || 0,
        plusTopPick,
        minusTopPick,
        isStable,
      };
    });
  }, [activeTruck, shipments, weights, speedKmH, maxDetourKm, baseTopPick]);

  const totalWeight = Object.values(weights).reduce((a, b) => a + Number(b), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-bold text-[#0F172A]">Multi-Attribute Decision Model Settings</h1>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Configure factor weights, operational speed assumptions, and test parameter sensitivity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-[#0F172A] border border-[#E2E8F0] flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {isSaved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Model settings saved successfully. Rankings recomputed across active corridors.</span>
        </div>
      )}

      {/* Grid: Weights Sliders (Left 6) + Sensitivity Matrix (Right 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Sliders */}
        <div className="lg:col-span-7 bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">Multi-Criteria Weight Sliders</h2>
              <span className="text-[11px] text-[#64748B]">Normalized automatically to sum to 100%</span>
            </div>
            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Sum: {Math.round(totalWeight)}%
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {[
              { key: 'route', label: 'Route Alignment', desc: 'Corridor vector alignment and return directness' },
              { key: 'time', label: 'Time Compatibility', desc: 'Arriving ahead of receiving dock window cutoff' },
              { key: 'capacity', label: 'Payload Capacity Fit', desc: 'Optimal utilization of available payload rating' },
              { key: 'detour', label: 'Detour Efficiency', desc: 'Minimizing incremental diversion km' },
              { key: 'cost', label: 'Cost & Margin Yield', desc: 'Gross spot freight margin above fuel cost' },
              { key: 'disruption', label: 'Low Disruption Risk', desc: 'Insulating against bottleneck delay hazards' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="text-[#0F172A] block">{label}</strong>
                    <span className="text-[10px] text-[#64748B]">{desc}</span>
                  </div>
                  <span className="text-sm font-black text-blue-600 font-mono">
                    {Math.round(weights[key] || 0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={weights[key] || 0}
                  onChange={(e) => handleWeightChange(key, e.target.value)}
                  className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
                />
              </div>
            ))}
          </div>

          {/* Operational Assumptions */}
          <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
            <h3 className="text-xs font-bold text-[#0F172A]">Corridor Operational Assumptions</h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-[#64748B] block mb-1">Average Speed (km/h)</label>
                <input
                  type="number"
                  value={speedKmH}
                  onChange={(e) => setSpeedKmH(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#64748B] block mb-1">Max Detour Cap (km)</label>
                <input
                  type="number"
                  value={maxDetourKm}
                  onChange={(e) => setMaxDetourKm(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#64748B] block mb-1">Diesel Index (₹/L)</label>
                <input
                  type="number"
                  value={fuelPrice}
                  onChange={(e) => setFuelPrice(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Weather-Aware Scoring Tuners */}
          <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-indigo-50 text-indigo-600">
                  <CloudRain className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A]">Weather-Aware Scoring</h2>
                  <p className="text-[11px] text-[#64748B]">
                    Convert atmospheric precipitation and wind risk into disruption score penalties and transit slowdowns.
                  </p>
                </div>
              </div>

              {/* Weather Enable/Disable Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={weatherEnabled}
                  onChange={(e) => setWeatherEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-2 text-xs font-bold text-[#0F172A]">
                  {weatherEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            {weatherEnabled ? (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-amber-900 block mb-1">
                      Medium Weather Penalty (pts)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={weatherPenalties.medium ?? 15}
                      onChange={(e) =>
                        setWeatherPenalties((prev) => ({
                          ...prev,
                          medium: Number(e.target.value),
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-amber-200 bg-amber-50/40 text-xs font-bold text-amber-950"
                    />
                    <span className="text-[10px] text-[#64748B] mt-0.5 block">
                      Light/moderate rain (-10% transit speed)
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-rose-900 block mb-1">
                      High Weather Penalty (pts)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="70"
                      value={weatherPenalties.high ?? 35}
                      onChange={(e) =>
                        setWeatherPenalties((prev) => ({
                          ...prev,
                          high: Number(e.target.value),
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-rose-200 bg-rose-50/40 text-xs font-bold text-rose-950"
                    />
                    <span className="text-[10px] text-[#64748B] mt-0.5 block">
                      Violent rain & storms (-25% transit speed)
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-[#64748B]">
                  <strong>Atmospheric Model:</strong> Live forecasts from Open-Meteo. Penalties apply directly to the 6th multi-criteria component (Low Disruption Risk, clamped 5..100).
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-[#64748B]">
                Weather-aware scoring is currently disabled. Disruption calculations rely solely on schedule buffer margins.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sensitivity Matrix */}
        <div className="lg:col-span-5 bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft p-5 space-y-4">
          <div className="border-b border-[#E2E8F0] pb-3">
            <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Sensitivity Analysis Matrix</span>
            </h2>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Simulating top candidate stability when each factor weight moves ±10 points.
            </p>
          </div>

          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs flex items-center justify-between">
            <div>
              <span className="text-[#64748B] block text-[10px]">Current Baseline Recommendation:</span>
              <strong className="text-blue-900 font-extrabold text-sm">{baseTopPick}</strong>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              Baseline Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] text-[10px] uppercase border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-2.5 px-3">Factor</th>
                  <th className="py-2.5 px-2 text-center">-10 Pts</th>
                  <th className="py-2.5 px-2 text-center">+10 Pts</th>
                  <th className="py-2.5 px-3 text-right">Stability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {sensitivityMatrix.map((item) => (
                  <tr key={item.factorKey} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-[#0F172A] capitalize">
                      {item.factorKey}
                      <span className="text-[10px] text-[#64748B] block font-normal">
                        ({Math.round(item.currentWeight)}%)
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700">
                      {item.minusTopPick}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-blue-700">
                      {item.plusTopPick}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {item.isStable ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Robust
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Sensitive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-[#64748B] space-y-1">
            <strong className="text-[#0F172A] block">What this measures:</strong>
            <p>
              "Robust" indicates the top pick remains optimal even if weight fluctuates by 10%.
              "Sensitive" signals where dispatcher operational priorities alter the dispatch decision.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
