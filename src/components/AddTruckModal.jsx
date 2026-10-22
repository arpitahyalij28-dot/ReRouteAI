// ReRoute AI 2.0 - Add & Edit Truck Modal
// Validates truck parameters, resolves cities to coordinates, and updates fleet state.

import React, { useState, useEffect } from 'react';
import { X, Truck, AlertCircle, Check } from 'lucide-react';
import { CITIES } from '../data/cities';
import { useDataContext } from '../context/DataContext';

const VEHICLE_TYPES = [
  '10T Heavy Commercial Vehicle',
  '7.5T Medium Commercial Vehicle',
  '12T Multi-Axle Heavy Truck',
  '14T Multi-Axle Hauler',
  '4T Light Commercial Vehicle',
  'Flatbed Trailer',
  'Refrigerated Van',
];

const STATUS_OPTIONS = ['In-Transit', 'Available', 'Delayed'];

export default function AddTruckModal({ isOpen, onClose, editingTruck = null }) {
  const { addTruck, updateTruck, trucks } = useDataContext();

  const [formData, setFormData] = useState({
    id: '',
    regNumber: '',
    driverName: '',
    driverPhone: '',
    vehicleType: '10T Heavy Commercial Vehicle',
    capacityTons: 10,
    currentLoadTons: 10,
    origin: 'Nashik',
    destination: 'Mumbai',
    departureTime: '08:00',
    expectedDeliveryTime: '14:15',
    status: 'In-Transit',
    emptyReturnProbability: 85,
    speedKmH: 52,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editingTruck) {
      setFormData({
        id: editingTruck.id || '',
        regNumber: editingTruck.regNumber || '',
        driverName: editingTruck.driverName || '',
        driverPhone: editingTruck.driverPhone || '',
        vehicleType: editingTruck.vehicleType || '10T Heavy Commercial Vehicle',
        capacityTons: editingTruck.capacityTons || 10,
        currentLoadTons: editingTruck.currentLoadTons ?? editingTruck.capacityTons ?? 10,
        origin: editingTruck.origin || 'Nashik',
        destination: editingTruck.destination || 'Mumbai',
        departureTime: editingTruck.departureTime || '08:00',
        expectedDeliveryTime: editingTruck.expectedDeliveryTime || '14:15',
        status: editingTruck.status || 'In-Transit',
        emptyReturnProbability: editingTruck.emptyReturnProbability || 85,
        speedKmH: editingTruck.speedKmH || 52,
      });
    } else {
      // Auto-suggest next truck ID
      const nextNum = trucks.length + 101;
      setFormData({
        id: `T${nextNum}`,
        regNumber: `MH-15-AB-${Math.floor(1000 + Math.random() * 9000)}`,
        driverName: '',
        driverPhone: '+91 98',
        vehicleType: '10T Heavy Commercial Vehicle',
        capacityTons: 10,
        currentLoadTons: 10,
        origin: 'Nashik',
        destination: 'Mumbai',
        departureTime: '08:00',
        expectedDeliveryTime: '14:15',
        status: 'In-Transit',
        emptyReturnProbability: 85,
        speedKmH: 52,
      });
    }
    setErrors({});
  }, [editingTruck, isOpen, trucks.length]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.id?.trim()) errs.id = 'Truck ID is required';
    if (!formData.driverName?.trim()) errs.driverName = 'Driver name is required';
    if (!formData.origin) errs.origin = 'Origin city is required';
    if (!formData.destination) errs.destination = 'Destination city is required';
    if (formData.origin && formData.destination && formData.origin === formData.destination) {
      errs.destination = 'Origin and destination must be different cities';
    }
    const cap = Number(formData.capacityTons);
    if (isNaN(cap) || cap <= 0 || cap > 100) {
      errs.capacityTons = 'Capacity must be between 1 and 100 tonnes';
    }
    const load = Number(formData.currentLoadTons);
    if (isNaN(load) || load < 0 || load > cap) {
      errs.currentLoadTons = `Current load must be between 0 and capacity (${cap}T)`;
    }
    if (!formData.expectedDeliveryTime?.trim()) {
      errs.expectedDeliveryTime = 'ETA is required';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (editingTruck) {
      updateTruck(editingTruck.id, formData);
    } else {
      addTruck(formData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-[#E2E8F0] shadow-soft-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                {editingTruck ? `Edit Vehicle ${editingTruck.id}` : 'Add Corridor Fleet Truck'}
              </h3>
              <p className="text-xs text-[#64748B]">
                Configure telemetry and capacity parameters for early empty-return prediction
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
          {/* Row 1: Truck ID & Reg Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Truck ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                disabled={!!editingTruck}
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="e.g. T101"
                className={`w-full px-3 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  errors.id ? 'border-rose-400' : 'border-[#E2E8F0]'
                } ${editingTruck ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
              />
              {errors.id && <p className="text-[10px] text-rose-500 mt-0.5">{errors.id}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Registration Plate Number
              </label>
              <input
                type="text"
                value={formData.regNumber}
                onChange={(e) => setFormData({ ...formData, regNumber: e.target.value })}
                placeholder="e.g. MH-15-EG-4921"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Row 2: Driver Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Driver Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.driverName}
                onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                placeholder="e.g. Suresh Patil"
                className={`w-full px-3 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  errors.driverName ? 'border-rose-400' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.driverName && (
                <p className="text-[10px] text-rose-500 mt-0.5">{errors.driverName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Driver Phone
              </label>
              <input
                type="text"
                value={formData.driverPhone}
                onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                placeholder="+91 98230 45812"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Row 3: Vehicle Type & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Vehicle Type
              </label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {VEHICLE_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Origin & Destination (City Dropdowns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Origin City <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                className={`w-full px-3 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer ${
                  errors.origin ? 'border-rose-400' : 'border-[#E2E8F0]'
                }`}
              >
                {CITIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.state})
                  </option>
                ))}
              </select>
              {errors.origin && <p className="text-[10px] text-rose-500 mt-0.5">{errors.origin}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Destination City <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className={`w-full px-3 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer ${
                  errors.destination ? 'border-rose-400' : 'border-[#E2E8F0]'
                }`}
              >
                {CITIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.state})
                  </option>
                ))}
              </select>
              {errors.destination && (
                <p className="text-[10px] text-rose-500 mt-0.5">{errors.destination}</p>
              )}
            </div>
          </div>

          {/* Row 5: Capacity & Current Load */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Payload Capacity (Tonnes) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="100"
                value={formData.capacityTons}
                onChange={(e) => setFormData({ ...formData, capacityTons: e.target.value })}
                className={`w-full px-3 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  errors.capacityTons ? 'border-rose-400' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.capacityTons && (
                <p className="text-[10px] text-rose-500 mt-0.5">{errors.capacityTons}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Current Outbound Load (Tonnes)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max={formData.capacityTons || 100}
                value={formData.currentLoadTons}
                onChange={(e) => setFormData({ ...formData, currentLoadTons: e.target.value })}
                className={`w-full px-3 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  errors.currentLoadTons ? 'border-rose-400' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.currentLoadTons && (
                <p className="text-[10px] text-rose-500 mt-0.5">{errors.currentLoadTons}</p>
              )}
            </div>
          </div>

          {/* Row 6: Departure & ETA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Departure Time (HH:MM)
              </label>
              <input
                type="time"
                value={formData.departureTime}
                onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Destination ETA (HH:MM) <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={formData.expectedDeliveryTime}
                onChange={(e) =>
                  setFormData({ ...formData, expectedDeliveryTime: e.target.value })
                }
                className={`w-full px-3 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  errors.expectedDeliveryTime ? 'border-rose-400' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.expectedDeliveryTime && (
                <p className="text-[10px] text-rose-500 mt-0.5">
                  {errors.expectedDeliveryTime}
                </p>
              )}
            </div>
          </div>

          {/* Row 7: Empty Return Risk % & Avg Speed */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Deadhead Probability ({formData.emptyReturnProbability}%)
              </label>
              <input
                type="range"
                min="10"
                max="99"
                value={formData.emptyReturnProbability}
                onChange={(e) =>
                  setFormData({ ...formData, emptyReturnProbability: Number(e.target.value) })
                }
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Highway Speed ({formData.speedKmH} km/h)
              </label>
              <input
                type="range"
                min="30"
                max="80"
                value={formData.speedKmH}
                onChange={(e) =>
                  setFormData({ ...formData, speedKmH: Number(e.target.value) })
                }
                className="w-full accent-blue-600 cursor-pointer"
              />
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
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editingTruck ? 'Save Vehicle' : 'Add Vehicle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
