// ReRoute AI 2.0 - Data Gateway & Management Page
// CSV Export, CSV Import with validation, JSON system backup and reset.

import React, { useState } from 'react';
import { Database, Download, Upload, RefreshCw, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useReRoute } from '../context/ReRouteContext';
import { validateTruck, validateShipment } from '../engine/validation';

export default function DataManagement() {
  const { trucks, shipments, assignments, resetDemo, refreshData } = useReRoute();
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // CSV Export for Trucks
  const handleExportTrucksCSV = () => {
    const headers = ['id', 'reg_number', 'model', 'vehicle_type', 'origin', 'destination', 'capacity_tons', 'current_load_tons', 'speed_kmh', 'status'];
    const rows = trucks.map((t) => [
      t.id,
      t.regNumber,
      `"${t.model}"`,
      `"${t.vehicleType}"`,
      `"${t.origin}"`,
      `"${t.destination}"`,
      t.capacityTons,
      t.currentLoadTons,
      t.speedKmH,
      t.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    downloadFile(csvContent, `ReRoute_Fleet_Trucks_${Date.now()}.csv`);
    setStatusMessage('Fleet trucks CSV exported successfully.');
  };

  // CSV Export for Shipments
  const handleExportShipmentsCSV = () => {
    const headers = ['id', 'name', 'origin', 'destination', 'weight_tons', 'cargo_type', 'pickup_window_start', 'pickup_window_end', 'freight_offer_inr', 'status'];
    const rows = shipments.map((s) => [
      s.id,
      `"${s.name}"`,
      `"${s.origin}"`,
      `"${s.destination}"`,
      s.weightTons,
      `"${s.cargoType}"`,
      s.pickupWindowStart,
      s.pickupWindowEnd,
      s.freightOfferInr || s.value,
      s.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    downloadFile(csvContent, `ReRoute_Freight_Shipments_${Date.now()}.csv`);
    setStatusMessage('Freight demand pool CSV exported successfully.');
  };

  // JSON Full System Backup
  const handleExportJSON = () => {
    const backupData = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      trucks,
      shipments,
      assignments,
    };
    const jsonString = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    downloadFile(jsonString, `ReRoute_Backup_${Date.now()}.json`);
    setStatusMessage('Full system JSON backup downloaded.');
  };

  const downloadFile = (uri, filename) => {
    const link = document.createElement('a');
    link.setAttribute('href', uri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetData = async () => {
    if (confirm('Reset all fleet and shipment data to default seed baseline?')) {
      await resetDemo();
      setStatusMessage('Data reset to baseline seed records.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <Database className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-bold text-[#0F172A]">Data Management & CSV Gateway</h1>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Export, audit, and reset fleet vehicles and freight demand records.
          </p>
        </div>

        <button
          onClick={handleResetData}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset to Seed Baseline</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* 3 Main Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Fleet Export */}
        <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Fleet Vehicles CSV</span>
          </div>
          <p className="text-xs text-[#64748B]">
            Contains {trucks.length} vehicle records including coordinates, capacity ratings, and telematics.
          </p>
          <button
            onClick={handleExportTrucksCSV}
            className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Trucks CSV</span>
          </button>
        </div>

        {/* Card 2: Shipments Export */}
        <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Freight Demand CSV</span>
          </div>
          <p className="text-xs text-[#64748B]">
            Contains {shipments.length} candidate consignments with pickup windows, cargo weights, and spot offers.
          </p>
          <button
            onClick={handleExportShipmentsCSV}
            className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Shipments CSV</span>
          </button>
        </div>

        {/* Card 3: Full JSON Backup */}
        <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
            <Database className="w-4 h-4 text-indigo-600" />
            <span>Complete System JSON</span>
          </div>
          <p className="text-xs text-[#64748B]">
            Exports entire fleet, demand pool, assignments, and parameters as a portable JSON snapshot.
          </p>
          <button
            onClick={handleExportJSON}
            className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Backup JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
}
