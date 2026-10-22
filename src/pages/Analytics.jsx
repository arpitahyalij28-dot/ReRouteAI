// ReRoute AI 2.0 - Carbon-Aware ESG Scope 1 Sustainability Page
// Audits fleet-wide environmental metrics and provides CSV export and printable PDF reports.

import React from 'react';
import { Leaf, Download, Printer, TrendingUp, ShieldCheck, Fuel, DollarSign, CloudRain } from 'lucide-react';
import { useReRoute } from '../context/ReRouteContext';
import { calculateFleetSustainability } from '../engine/index';

export default function Analytics() {
  const { assignments, trucks } = useReRoute();

  const fleetMetrics = calculateFleetSustainability(assignments);

  const handleExportCSV = () => {
    if (assignments.length === 0) {
      alert('No assignment records available to export.');
      return;
    }

    const headers = ['Assignment_ID', 'Truck_ID', 'Shipment_ID', 'Match_Score', 'Empty_KM_Avoided', 'Fuel_Saved_L', 'Cost_Saved_INR', 'CO2_Reduced_KG', 'Assigned_At'];
    const rows = assignments.map((a) => [
      a.id,
      a.truckId,
      a.shipmentId,
      a.matchScore,
      a.sustainability?.emptyKmAvoided ?? 0,
      a.sustainability?.fuelSavedLitres ?? 0,
      a.sustainability?.costSavedInr ?? a.costGain ?? 0,
      a.sustainability?.co2ReducedKg ?? 0,
      a.assignedAt || new Date().toISOString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ReRoute_ESG_Scope1_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Leaf className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-bold text-[#0F172A]">Carbon-Aware ESG Scope 1 Sustainability Analytics</h1>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Model-based estimate of Scope 1 greenhouse gas emissions reductions and freight deadhead prevention audits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-[#0F172A] border border-[#E2E8F0] flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#059669] hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Printable PDF Report</span>
          </button>
        </div>
      </div>

      {/* 4 Cumulative ESG Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Empty KM Avoided */}
        <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-soft space-y-2">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Deadhead Running Prevented</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-[#0F172A]">
            {fleetMetrics.totalEmptyKmAvoided || 0} <span className="text-xs font-medium text-[#64748B]">km</span>
          </div>
          <p className="text-[11px] text-[#64748B]">
            Eliminated unladen transit miles across return legs
          </p>
        </div>

        {/* Diesel Fuel Saved */}
        <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-soft space-y-2">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Diesel Fuel Conserved</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Fuel className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-[#0F172A]">
            {fleetMetrics.totalFuelSavedLitres || 0} <span className="text-xs font-medium text-[#64748B]">litres</span>
          </div>
          <p className="text-[11px] text-[#64748B]">
            Based on heavy vehicle efficiency average (4.0 km/L)
          </p>
        </div>

        {/* Operating Cost Savings */}
        <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-soft space-y-2">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Net Operating Cost Saved</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-[#059669]">
            ₹{(fleetMetrics.totalCostImpact || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#64748B]">
            Direct diesel expenditure saved at ₹95.00/L
          </p>
        </div>

        {/* Scope 1 CO2 Reductions */}
        <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-soft space-y-2">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Scope 1 CO₂ Avoided</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Leaf className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-[#059669]">
            {fleetMetrics.totalCo2AvoidedKg || 0} <span className="text-xs font-medium text-[#64748B]">kg CO₂e</span>
          </div>
          <p className="text-[11px] text-[#64748B]">
            Calculated at 2.68 kg CO₂ per litre diesel combustion
          </p>
        </div>
      </div>

      {/* Model Verification Methodology Card */}
      <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>GHG Protocol Scope 1 Verification Methodology</span>
        </h2>
        <p className="text-xs text-[#64748B] leading-relaxed">
          The emissions avoidance models operate according to the GHG Protocol Corporate Standard (Scope 1 Direct Mobile Combustion).
          Eliminated deadhead distances are converted to saved diesel volume using vehicle-calibrated mileage ratings, applying the India Bureau of Energy Efficiency standard emission factor of 2.68 kg CO₂ per litre of high-speed diesel (HSD).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E2E8F0] text-xs">
          <div>
            <span className="text-[#64748B] block">Baseline Vehicle Mileage:</span>
            <strong className="text-[#0F172A]">4.0 - 6.2 km/L (Class Specific)</strong>
          </div>
          <div>
            <span className="text-[#64748B] block">Diesel Price Benchmark:</span>
            <strong className="text-[#0F172A]">₹95.00 / Litre (Maharashtra Index)</strong>
          </div>
          <div>
            <span className="text-[#64748B] block">Emission Intensity Factor:</span>
            <strong className="text-[#0F172A]">2.68 kg CO₂ / Litre HSD</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
