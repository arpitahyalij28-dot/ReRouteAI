// ReRoute AI 2.0 - Add & Edit Shipment / Load Modal
// Manages demand-side freight tenders, pickup windows, and rate inputs.

import React, { useState, useEffect } from 'react';
import { X, Package, Check, Sparkles } from 'lucide-react';
import { CITIES } from '../data/cities';
import { useDataContext } from '../context/DataContext';

const CARGO_TYPES = [
  'Automotive Sub-Assemblies & Tier-1 Spares',
  'FMCG Packaging Materials & Cartons',
  'Pharmaceutical & Cold-Chain Goods',
  'Industrial Heavy Machinery & Equipment',
  'Textiles, Apparel & Yarns',
  'Chemicals & Polymers (Non-Hazmat)',
  'Electronics & Electrical Assemblies',
  'General Dry Freight',
];

const PRIORITIES = ['High', 'Medium', 'Standard'];

export default function AddShipmentModal({ isOpen, onClose, editingShipment = null }) {
  const { addShipment, updateShipment, shipments } = useDataContext();

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    pickupCity: 'Mumbai',
    dropCity: 'Nashik',
    weightTons: 8,
    cargoType: 'Automotive Sub-Assemblies & Tier-1 Spares',
    pickupWindowStart: '14:30',
    pickupWindowEnd: '16:00',
    freightRate: 28000,
    priority: 'High',
    detourKm: 8,
    delayRisk: 'low',
    specialRequirements: 'None',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editingShipment) {
      setFormData({
        id: editingShipment.id || '',
        name: editingShipment.name || '',
        pickupCity: editingShipment.origin || 'Mumbai',
        dropCity: editingShipment.destination || 'Nashik',
        weightTons: editingShipment.weightTons || 8,
        cargoType: editingShipment.cargoType || 'Automotive Sub-Assemblies & Tier-1 Spares',
        pickupWindowStart: editingShipment.pickupWindowStart || '14:30',
        pickupWindowEnd: editingShipment.pickupWindowEnd || '16:00',
        freightRate: editingShipment.freightOfferInr || editingShipment.value || 28000,
        priority: editingShipment.priority || 'High',
        detourKm: editingShipment.detourKm || 8,
        delayRisk: editingShipment.delayRisk || 'low',
        specialRequirements: editingShipment.specialRequirements || 'None',
      });
    } else {
      const nextNum = shipments.length + 1;
      setFormData({
        id: `S${nextNum}`,
        name: `Spot Load S${nextNum}`,
        pickupCity: 'Mumbai',
        dropCity: 'Nashik',
        weightTons: 8,
        cargoType: 'Automotive Sub-Assemblies & Tier-1 Spares',
        pickupWindowStart: '14:30',
        pickupWindowEnd: '16:00',
        freightRate: 28000,
        priority: 'High',
        detourKm: 8,
        delayRisk: 'low',
        specialRequirements: 'None',
      });
    }
    setErrors({});
  }, [editingShipment, isOpen, shipments.length]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.pickupCity) errs.pickupCity = 'Pickup city is required';
    if (!formData.dropCity) errs.dropCity = 'Drop city is required';
    if (formData.pickupCity && formData.dropCity && formData.pickupCity === formData.dropCity) {
      errs.dropCity = 'Pickup and drop cannot be the same city';
    }
    const weight = Number(formData.weightTons);
    if (isNaN(weight) || weight <= 0 || weight > 50) {
      errs.weightTons = 'Weight must be between 0.1 and 50 tonnes';
    }
    const rate = Number(formData.freightRate);
    if (isNaN(rate) || rate <= 0) {
      errs.freightRate = 'Freight rate must be a positive number';
    }
    if (!formData.pickupWindowStart) errs.pickupWindowStart = 'Window start is required';
    if (!formData.pickupWindowEnd) errs.pickupWindowEnd = 'Window end is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...formData,
      id: formData.id?.trim() || `S${shipments.length + 1}`,
      name:
        formData.name?.trim() ||
        `${formData.pickupCity} → ${formData.dropCity} (${formData.cargoType.split(' ')[0]})`,
      origin: formData.pickupCity,
      destination: formData.dropCity,
      weightTons: Number(formData.weightTons),
      freightOfferInr: Number(formData.freightRate),
      value: Number(formData.freightRate),
    };

    if (editingShipment) {
      updateShipment(editingShipment.id, payload);
    } else {
      addShipment(payload);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-[#E2E8F0] shadow-soft-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                {editingShipment ? `Edit Load ${editingShipment.id}` : 'Post Freight Load / Consignment'}
              </h3>
              <p className="text-xs text-[#64748B]">
                Specify tender volume, pickup availability window and spot freight rate
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Row 1: Shipment ID & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Shipment / Tender ID
              </label>
              <input
                type="text"
                disabled={!!editingShipment}
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="Leave blank to auto-generate (e.g. S1)"
                className={`w-full px-3 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                  editingShipment ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'border-[#E2E8F0]'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Consignment Description
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Mumbai Industrial Consignment"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Row 2: Origin & Drop Cities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Pickup City <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.pickupCity}
                onChange={(e) => setFormData({ ...formData, pickupCity: e.target.value })}
                className={`w-full px-3 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer ${
                  errors.pickupCity ? 'border-rose-400' : 'border-[#E2E8F0]'
                }`}
              >
                {CITIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.state})
                  </option>
                ))}
              </select>
              {errors.pickupCity && (
                <p className="text-[10px] text-rose-500 mt-0.5">{errors.pickupCity}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Drop City <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.dropCity}
                onChange={(e) => setFormData({ ...formData, dropCity: e.target.value })}
                className={`w-full px-3 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer ${
                  errors.dropCity ? 'border-rose-400' : 'border-[#E2E8F0]'
                }`}
              >
                {CITIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.state})
                  </option>
                ))}
              </select>
              {errors.dropCity && (
                <p className="text-[10px] text-rose-500 mt-0.5">{errors.dropCity}</p>
              )}
            </div>
          </div>

          {/* Row 3: Weight & Freight Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Cargo Weight (Tonnes) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                max="50"
                value={formData.weightTons}
                onChange={(e) => setFormData({ ...formData, weightTons: e.target.value })}
                className={`w-full px-3 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                  errors.weightTons ? 'border-rose-400' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.weightTons && (
                <p className="text-[10px] text-rose-500 mt-0.5">{errors.weightTons}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Freight Offer Rate (₹ INR) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="500"
                min="1000"
                value={formData.freightRate}
                onChange={(e) => setFormData({ ...formData, freightRate: e.target.value })}
                className={`w-full px-3 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                  errors.freightRate ? 'border-rose-400' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.freightRate && (
                <p className="text-[10px] text-rose-500 mt-0.5">{errors.freightRate}</p>
              )}
            </div>
          </div>

          {/* Row 4: Pickup Window Start & End */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Pickup Window Opens <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={formData.pickupWindowStart}
                onChange={(e) => setFormData({ ...formData, pickupWindowStart: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Pickup Window Closes <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={formData.pickupWindowEnd}
                onChange={(e) => setFormData({ ...formData, pickupWindowEnd: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Row 5: Cargo Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Cargo Classification
              </label>
              <select
                value={formData.cargoType}
                onChange={(e) => setFormData({ ...formData, cargoType: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                {CARGO_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Priority Tier
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p} Priority
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 6: Incremental Detour & Risk */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Corridor Detour (+{formData.detourKm} km)
              </label>
              <input
                type="range"
                min="2"
                max="50"
                value={formData.detourKm}
                onChange={(e) => setFormData({ ...formData, detourKm: Number(e.target.value) })}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Traffic & Operational Risk
              </label>
              <select
                value={formData.delayRisk}
                onChange={(e) => setFormData({ ...formData, delayRisk: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="low">Low Delay Risk (Expressway)</option>
                <option value="medium">Medium Delay Risk (Suburban / Ghat)</option>
                <option value="high">High Delay Risk (Dock Bottleneck)</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editingShipment ? 'Save Load' : 'Post Load'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
