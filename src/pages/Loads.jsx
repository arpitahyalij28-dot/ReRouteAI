// ReRoute AI 2.0 - Freight Demand Pool (Loads Page)
// Displays candidate backhaul loads and provides a verified load posting modal.

import React, { useState } from 'react';
import { Package, Plus, Search, Filter, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { useReRoute } from '../context/ReRouteContext';
import { validateShipment } from '../engine/validation';

export default function Loads() {
  const { shipments, repository, refreshData } = useReRoute();
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Load Form State
  const [formData, setFormData] = useState({
    name: '',
    pickupLocation: 'Mumbai (Bhiwandi Central Depot)',
    pickupLat: 19.2967,
    pickupLng: 73.0631,
    dropLocation: 'Nashik (Ambad MIDC)',
    dropLat: 19.9575,
    dropLng: 73.742,
    cargoWeight: 8000,
    cargoType: 'Automotive Components',
    pickupWindowStart: '14:30',
    pickupWindowEnd: '16:00',
    value: 28000,
    requiredVehicleType: 'Any',
    specialRequirements: 'None',
  });
  const [formErrors, setFormErrors] = useState([]);

  const filteredShipments = shipments.filter((s) => {
    const matchesStatus =
      filterStatus === 'All'
        ? true
        : filterStatus === 'Available'
        ? s.status === 'Available' && !s.isCancelled
        : filterStatus === 'Assigned'
        ? s.status === 'Assigned'
        : s.status === 'Cancelled' || s.isCancelled;

    const matchesQuery =
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.destination?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesQuery;
  });

  const handlePostLoad = async (e) => {
    e.preventDefault();
    const validation = validateShipment(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors([]);
    const newId = `S${shipments.length + 1}`;
    const newShipment = {
      id: newId,
      name: formData.name || `Spot Load ${newId}`,
      origin: formData.pickupLocation,
      destination: formData.dropLocation,
      originCoords: [Number(formData.pickupLat), Number(formData.pickupLng)],
      destCoords: [Number(formData.dropLat), Number(formData.dropLng)],
      weightTons: Number(formData.cargoWeight) / 1000,
      cargoWeight: Number(formData.cargoWeight),
      cargoType: formData.cargoType,
      pickupWindowStart: formData.pickupWindowStart,
      pickupWindowEnd: formData.pickupWindowEnd,
      predictedTruckEta: '14:15',
      etaBufferMinutes: 15,
      detourKm: 10,
      freightOfferInr: Number(formData.value),
      value: Number(formData.value),
      delayRisk: 'low',
      delayRiskReason: 'New tender posted with standard bay reservation',
      status: 'Available',
      requiredVehicleType: formData.requiredVehicleType,
      specialRequirements: formData.specialRequirements,
      whyWhyNot: {
        recommendedSummary: 'Fresh tender posted into corridor freight pool.',
        reasons: [{ type: 'check', title: 'Verified Tender', description: 'Validated and ready for backhaul matching.' }],
      },
    };

    if (repository.createShipment) {
      await repository.createShipment(newShipment);
    } else {
      shipments.push(newShipment);
    }

    await refreshData();
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <Package className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-bold text-[#0F172A]">Freight Demand Pool (Available Cargo)</h1>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            {shipments.length} candidate consignments available across Western Golden Quadrangle routes.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Post New Load Tender</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-[12px] border border-[#E2E8F0] shadow-soft flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by ID, city, or cargo type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E2E8F0] text-xs outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['All', 'Available', 'Assigned', 'Cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterStatus === status
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-[#64748B] hover:text-[#0F172A] hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Shipments Table */}
      <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#64748B] uppercase text-[10px] border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3 px-4">Tender ID</th>
                <th className="py-3 px-4">Consignment Name</th>
                <th className="py-3 px-4">Pickup → Drop</th>
                <th className="py-3 px-4">Cargo & Weight</th>
                <th className="py-3 px-4">Pickup Window</th>
                <th className="py-3 px-4">Gross Yield</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredShipments.map((s) => {
                const isCancelled = s.isCancelled || s.status === 'Cancelled';
                const isAssigned = s.status === 'Assigned';
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <strong className="text-blue-600 font-bold block">{s.id}</strong>
                      <span className="text-[10px] text-[#64748B] font-medium">Spot Load</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#0F172A] block">{s.name}</span>
                      <span className="text-[10px] text-[#64748B]">{s.cargoType}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-[#0F172A] font-medium">
                        <span>{s.origin?.split(' ')[0]}</span>
                        <ArrowRight className="w-3 h-3 text-[#64748B]" />
                        <span>{s.destination?.split(' ')[0]}</span>
                      </div>
                      <span className="text-[10px] text-[#64748B] truncate max-w-[200px] block">{s.origin}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#0F172A]">{s.weightTons} tons</span>
                      <span className="text-[10px] text-[#64748B] block">Vehicle: {s.requiredVehicleType || 'Any'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[#0F172A] font-semibold">{s.pickupWindowStart} - {s.pickupWindowEnd}</span>
                      <span className="text-[10px] text-[#64748B] block">Buffer: {s.etaBufferMinutes}m</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700">
                      ₹{(s.freightOfferInr || s.value || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCancelled
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : isAssigned
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isCancelled ? 'Cancelled' : isAssigned ? 'Assigned' : 'Available'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Post Load Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#0F172A]">Post New Backhaul Load Tender</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {formErrors.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
                <strong>Please fix the following validation issues:</strong>
                <ul className="list-disc pl-4 text-[11px]">
                  {formErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handlePostLoad} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#0F172A] block mb-1">Consignment Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pune Tier-1 Auto Spares"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#0F172A] block mb-1">Pickup Location</label>
                  <input
                    type="text"
                    required
                    value={formData.pickupLocation}
                    onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#0F172A] block mb-1">Drop Location</label>
                  <input
                    type="text"
                    required
                    value={formData.dropLocation}
                    onChange={(e) => setFormData({ ...formData, dropLocation: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#0F172A] block mb-1">Cargo Weight (kg)</label>
                  <input
                    type="number"
                    required
                    value={formData.cargoWeight}
                    onChange={(e) => setFormData({ ...formData, cargoWeight: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#0F172A] block mb-1">Freight Spot Yield (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#0F172A] block mb-1">Pickup Start (IST)</label>
                  <input
                    type="text"
                    placeholder="14:30"
                    value={formData.pickupWindowStart}
                    onChange={(e) => setFormData({ ...formData, pickupWindowStart: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#0F172A] block mb-1">Pickup End (IST)</label>
                  <input
                    type="text"
                    placeholder="16:00"
                    value={formData.pickupWindowEnd}
                    onChange={(e) => setFormData({ ...formData, pickupWindowEnd: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-[#0F172A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white shadow-sm"
                >
                  Verify & Post Load
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
