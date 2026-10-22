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
} from 'lucide-react';
import CountUp from './CountUp';

export default function SustainabilityDashboard({ metrics, selectedShipment, truck }) {
  const [showFormulas, setShowFormulas] = useState(false);

  const safeMetrics = metrics || {
    emptyKmAvoided: 0,
    additionalDetourKm: 0,
    fuelSavedLitres: 0,
    costSavedInr: 0,
    co2ReducedKg: 0,
    vehicleUtilizationPct: 0,
  };

  const truckRating = truck?.capacityTons ? `${truck.capacityTons}t rating` : 'No vehicle selected';

  return (
    <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft p-5 space-y-4">
      {/* Title & Formula Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
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
              Real-time ecological & fleet efficiency metrics for assigned return load:{' '}
              <strong className="text-[#0F172A]">
                {selectedShipment ? selectedShipment.id : 'None (Awaiting backhaul assignment)'}
              </strong>
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowFormulas(!showFormulas)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#059669] hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 rounded-lg transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Info className="w-3.5 h-3.5" />
          <span>View Audit Formulas</span>
        </button>
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

      {/* 6 Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* 1. Empty KM Avoided */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Empty KM Avoided
            </span>
            <Navigation className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
            <CountUp value={safeMetrics.emptyKmAvoided} decimals={0} suffix=" km" />
          </div>
          <div className="text-[10px] text-[#059669] font-medium mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Eliminated Deadhead</span>
          </div>
        </div>

        {/* 2. Detour Overhead */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 relative overflow-hidden group hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Detour Overhead
            </span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
            <CountUp value={safeMetrics.additionalDetourKm} decimals={0} prefix="+" suffix=" km" />
          </div>
          <div className="text-[10px] text-[#64748B] font-medium mt-1">
            Route diversion from NH corridor
          </div>
        </div>

        {/* 3. Fuel Saved */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Fuel Saved
            </span>
            <Fuel className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-extrabold text-[#059669] tracking-tight">
            <CountUp value={safeMetrics.fuelSavedLitres} decimals={1} suffix=" L" />
          </div>
          <div className="text-[10px] text-[#64748B] font-medium mt-1">Diesel conserved</div>
        </div>

        {/* 4. Fuel Cost Saved */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Fuel Cost Saved
            </span>
            <IndianRupee className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-extrabold text-[#059669] tracking-tight">
            <CountUp value={safeMetrics.costSavedInr} decimals={0} prefix="₹" />
          </div>
          <div className="text-[10px] text-[#64748B] font-medium mt-1">
            Direct operational savings
          </div>
        </div>

        {/* 5. CO2 Reduced */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              CO₂ Reduced
            </span>
            <Leaf className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-extrabold text-[#059669] tracking-tight">
            <CountUp value={safeMetrics.co2ReducedKg} decimals={1} suffix=" kg" />
          </div>
          <div className="text-[10px] text-[#059669] font-medium mt-1 flex items-center gap-1">
            <CircleCheck className="w-3 h-3" />
            <span>Scope 1 Emissions Saved</span>
          </div>
        </div>

        {/* 6. Vehicle Utilization */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Vehicle Utilization
            </span>
            <Gauge className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
            <CountUp value={safeMetrics.vehicleUtilizationPct} decimals={0} suffix="%" />
          </div>
          <div className="text-[10px] text-[#64748B] font-medium mt-1">
            {selectedShipment && truck
              ? `${selectedShipment.weightTons}t on ${truckRating}`
              : 'Empty Return'}
          </div>
        </div>
      </div>

      {/* Baseline Footer Citation */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#64748B] gap-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
          <span className="italic">Model-based estimates based on authentic corridor parameters.</span>
        </div>
        <div className="text-[10px] text-slate-500">
          Base: 4.0 km/L diesel consumption • ₹95/L diesel spot tariff • 2.68 kg CO₂e/L diesel GHG conversion
        </div>
      </div>
    </div>
  );
}
