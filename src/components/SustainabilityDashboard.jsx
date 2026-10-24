import React, { useState } from 'react';
import {
  Leaf,
  Info,
  Navigation,
  TrendingUp,
  Layers,
  Fuel,
  IndianRupee,
  CircleCheck,
  Gauge,
  Truck,
  Table,
} from 'lucide-react';
import CountUp from './CountUp';

export default function SustainabilityDashboard({
  metrics,
  selectedShipment,
  truck,
  fleetSustainability = null,
}) {
  const [showFormulas, setShowFormulas] = useState(false);
  const [viewMode, setViewMode] = useState('FLEET'); // 'FLEET' or 'SELECTED'

  const safeMetrics = metrics || {
    emptyKmAvoided: 0,
    additionalDetourKm: 0,
    fuelSavedLitres: 0,
    costSavedInr: 0,
    co2ReducedKg: 0,
    vehicleUtilizationPct: 0,
  };

  const isFleetMode = viewMode === 'FLEET' && fleetSustainability != null;

  // Values to display in cards based on viewMode
  const displayEmptyKm = isFleetMode
    ? fleetSustainability.totalEmptyKmAvoided || 0
    : safeMetrics.emptyKmAvoided;

  const displayFuelSaved = isFleetMode
    ? fleetSustainability.totalFuelSavedLitres || 0
    : safeMetrics.fuelSavedLitres;

  const displayCostSaved = isFleetMode
    ? fleetSustainability.totalCostSavedInr || 0
    : safeMetrics.costSavedInr;

  const displayCo2Reduced = isFleetMode
    ? fleetSustainability.totalCo2ReducedKg || 0
    : safeMetrics.co2ReducedKg;

  const truckRating = truck?.capacityTons ? `${truck.capacityTons}t rating` : 'No vehicle selected';

  const breakdownRows = fleetSustainability?.perTruckBreakdown || [];

  return (
    <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft p-5 space-y-4">
      {/* Title & View Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-[#059669] flex items-center justify-center shadow-sm">
            <Leaf className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#0F172A]">
                Carbon-Aware Sustainability Dashboard
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#059669] border border-emerald-200">
                ESG Verified Impact
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              {isFleetMode ? (
                <>
                  Aggregated ecological & fuel metrics across entire active fleet ({breakdownRows.length} vehicles).
                </>
              ) : (
                <>
                  Real-time ecological metrics for active vehicle{' '}
                  <strong className="text-[#0F172A]">{truck?.id || 'None'}</strong> (Assigned:{' '}
                  <strong className="text-[#0F172A]">{selectedShipment?.id || 'None'}</strong>).
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Toggle View Mode */}
          {fleetSustainability && breakdownRows.length > 1 && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setViewMode('FLEET')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'FLEET'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fleet Total
              </button>
              <button
                onClick={() => setViewMode('SELECTED')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'SELECTED'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Selected Vehicle
              </button>
            </div>
          )}

          <button
            onClick={() => setShowFormulas(!showFormulas)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#059669] hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Audit Formulas</span>
          </button>
        </div>
      </div>

      {/* Audit Formulas Collapsible */}
      {showFormulas && (
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-2 text-[#0F172A] animate-in fade-in duration-200">
          <div className="font-bold text-[#059669] flex items-center justify-between">
            <span>Verified Green Logistics Mathematical Formulation:</span>
            <button
              onClick={() => setShowFormulas(false)}
              className="text-[#64748B] hover:text-[#0F172A] font-semibold text-[11px] cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
            <div className="p-2 bg-white rounded-lg border border-emerald-200">
              <strong className="block text-[#059669]">Fuel Impact (L):</strong>
              <code>Empty km avoided ÷ Vehicle mileage (4.0 km/L)</code>
            </div>
            <div className="p-2 bg-white rounded-lg border border-emerald-200">
              <strong className="block text-[#059669]">Cost Impact (INR):</strong>
              <code>Fuel impact (L) × Diesel price (₹95.0 / L)</code>
            </div>
            <div className="p-2 bg-white rounded-lg border border-emerald-200">
              <strong className="block text-[#059669]">CO₂ Reduced (kg):</strong>
              <code>Fuel saved (L) × Emission factor (2.68 kg CO₂/L)</code>
            </div>
          </div>
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. Empty KM Avoided */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              {isFleetMode ? 'Fleet Empty KM Eliminated' : 'Empty KM Avoided'}
            </span>
            <Navigation className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
            <CountUp value={displayEmptyKm} decimals={0} suffix=" km" />
          </div>
          <div className="text-[10px] text-[#059669] font-medium mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Optimized Transit Distance</span>
          </div>
        </div>

        {/* 2. Fuel Saved */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              {isFleetMode ? 'Fleet Diesel Conserved' : 'Fuel Saved'}
            </span>
            <Fuel className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-extrabold text-[#059669] tracking-tight">
            <CountUp value={displayFuelSaved} decimals={1} suffix=" L" />
          </div>
          <div className="text-[10px] text-[#64748B] font-medium mt-1">Conserved Diesel Fuel</div>
        </div>

        {/* 3. Fuel Cost Saved */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              {isFleetMode ? 'Fleet Economic Gain' : 'Fuel Cost Saved'}
            </span>
            <IndianRupee className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-extrabold text-[#059669] tracking-tight">
            <CountUp value={displayCostSaved} decimals={0} prefix="₹" />
          </div>
          <div className="text-[10px] text-[#64748B] font-medium mt-1">
            Direct operational diesel savings
          </div>
        </div>

        {/* 4. CO2 Reduced */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              {isFleetMode ? 'Fleet CO₂ Abatement' : 'CO₂ Reduced'}
            </span>
            <Leaf className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-extrabold text-[#059669] tracking-tight">
            <CountUp value={displayCo2Reduced} decimals={1} suffix=" kg" />
          </div>
          <div className="text-[10px] text-[#059669] font-medium mt-1 flex items-center gap-1">
            <CircleCheck className="w-3 h-3" />
            <span>Scope 1 GHG Emissions Avoided</span>
          </div>
        </div>
      </div>

      {/* Per-Truck Sustainability Breakdown Table */}
      {breakdownRows.length > 0 && (
        <div className="pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-slate-500" />
              <span>Per-Vehicle Sustainability & Economics Breakdown</span>
            </h4>
            <span className="text-[11px] text-[#64748B]">
              Sum of vehicle rows strictly equals fleet total
            </span>
          </div>

          <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B]">
                  <th className="py-2.5 px-3">Vehicle</th>
                  <th className="py-2.5 px-3">Corridor Route</th>
                  <th className="py-2.5 px-3">Assigned Load</th>
                  <th className="py-2.5 px-3 text-right">Empty Km Avoided</th>
                  <th className="py-2.5 px-3 text-right">Fuel Saved (L)</th>
                  <th className="py-2.5 px-3 text-right">Cost Saved (₹)</th>
                  <th className="py-2.5 px-3 text-right">CO₂ Avoided (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[11px]">
                {breakdownRows.map((row) => (
                  <tr
                    key={row.truckId}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      truck && row.truckId === truck.id ? 'bg-blue-50/40 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-[#0F172A]">
                      {row.truckId}
                      <span className="text-[10px] text-slate-400 font-normal block">{row.truckReg}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-700">{row.route}</td>
                    <td className="py-2 px-3">
                      {row.assignedShipmentId ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                          {row.assignedShipmentId}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-900">
                      {row.emptyKmAvoided} km
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-700 font-bold">
                      {row.fuelSavedLitres} L
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-700 font-bold">
                      ₹{row.costSavedInr.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-700 font-bold">
                      {row.co2ReducedKg} kg
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50/70 border-t-2 border-emerald-300 text-[11px] font-black text-[#0F172A]">
                  <td className="py-2.5 px-3" colSpan="3">
                    Fleet Total Aggregate ({breakdownRows.length} Vehicles)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                    {displayEmptyKm} km
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                    {displayFuelSaved} L
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                    ₹{displayCostSaved.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                    {displayCo2Reduced} kg
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Baseline Footer Citation */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#64748B] gap-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
          <span className="italic">Standardised parameters: 4.0 km/L diesel mileage • ₹95/L fuel spot rate • 2.68 kg CO₂e/L GHG emission index.</span>
        </div>
      </div>
    </div>
  );
}
