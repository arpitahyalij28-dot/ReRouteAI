// Disruption-Aware Logistics Twin - Entity Add/Edit Modal
// Supports adding and updating Suppliers, Warehouses, Buyers, Routes, and Vehicles with validation.

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Plus } from 'lucide-react';
import {
  createSupplier,
  createWarehouse,
  createBuyer,
  createRoute,
  createVehicle,
  ROUTE_STATUS,
  BUYER_PRIORITY,
} from '../engine/network.js';

export default function NetworkEntityModal({
  isOpen,
  onClose,
  entityType = 'warehouse', // 'supplier', 'warehouse', 'buyer', 'route', 'vehicle'
  initialData = null,
  onSave,
  network,
}) {
  const isEdit = Boolean(initialData?.id);
  const [type, setEntityType] = useState(entityType);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState(null);

  const { suppliers = [], warehouses = [], buyers = [] } = network || {};
  const allNodes = [...suppliers, ...warehouses, ...buyers];

  useEffect(() => {
    setEntityType(entityType);
  }, [entityType]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        lat: initialData.location?.lat ?? 19.9975,
        lng: initialData.location?.lng ?? 73.7898,
        locationName: initialData.location?.name ?? '',
        maxWeightTons: initialData.restrictions?.maxVehicleWeightTons ?? '',
      });
    } else {
      // Defaults based on type
      if (type === 'supplier') {
        setFormData({
          id: `sup-${Date.now().toString().slice(-4)}`,
          name: '',
          locationName: 'Nashik Corridor',
          lat: 19.9975,
          lng: 73.7898,
          supplyLimit: 1000,
          product: 'Agro & Industrial Produce',
        });
      } else if (type === 'warehouse') {
        setFormData({
          id: `wh-${Date.now().toString().slice(-4)}`,
          name: '',
          locationName: 'Corridor Logistics Hub',
          lat: 19.6967,
          lng: 73.5594,
          stock: 500,
          storageLimit: 1200,
        });
      } else if (type === 'buyer') {
        setFormData({
          id: `buy-${Date.now().toString().slice(-4)}`,
          name: '',
          locationName: 'Mumbai/Thane Area',
          lat: 19.2183,
          lng: 72.9781,
          demandQty: 300,
          deadline: 8,
          priority: BUYER_PRIORITY.MEDIUM,
        });
      } else if (type === 'route') {
        setFormData({
          id: `r-${Date.now().toString().slice(-4)}`,
          name: '',
          from: warehouses[0]?.id || suppliers[0]?.id || '',
          to: buyers[0]?.id || warehouses[0]?.id || '',
          distanceKm: 50,
          baseTravelTimeH: 1.2,
          status: ROUTE_STATUS.OPEN,
          speedFactor: 1.0,
          riskScore: 0.15,
          maxWeightTons: 25,
        });
      } else if (type === 'vehicle') {
        setFormData({
          id: `veh-${Date.now().toString().slice(-4)}`,
          type: 'Medium Commercial (8T)',
          capacity: 150,
          availableFrom: warehouses[0]?.id || 'wh-satpur',
          availability: 1,
          costPerKm: 28,
          weightTons: 8,
        });
      }
    }
    setError(null);
  }, [type, initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    try {
      let created = null;

      if (type === 'supplier') {
        created = createSupplier({
          id: formData.id,
          name: formData.name,
          location: {
            name: formData.locationName,
            lat: Number(formData.lat),
            lng: Number(formData.lng),
          },
          supplyLimit: Number(formData.supplyLimit),
          product: formData.product,
        });
      } else if (type === 'warehouse') {
        created = createWarehouse({
          id: formData.id,
          name: formData.name,
          location: {
            name: formData.locationName,
            lat: Number(formData.lat),
            lng: Number(formData.lng),
          },
          stock: Number(formData.stock),
          storageLimit: Number(formData.storageLimit),
        });
      } else if (type === 'buyer') {
        created = createBuyer({
          id: formData.id,
          name: formData.name,
          location: {
            name: formData.locationName,
            lat: Number(formData.lat),
            lng: Number(formData.lng),
          },
          demandQty: Number(formData.demandQty),
          deadline: Number(formData.deadline),
          priority: formData.priority,
        });
      } else if (type === 'route') {
        created = createRoute({
          id: formData.id,
          name: formData.name || `${formData.from} -> ${formData.to}`,
          from: formData.from,
          to: formData.to,
          distanceKm: Number(formData.distanceKm),
          baseTravelTimeH: Number(formData.baseTravelTimeH),
          status: formData.status,
          speedFactor: Number(formData.speedFactor || 1.0),
          restrictions: {
            maxVehicleWeightTons: formData.maxWeightTons ? Number(formData.maxWeightTons) : null,
          },
          riskScore: Number(formData.riskScore || 0.1),
        });
      } else if (type === 'vehicle') {
        created = createVehicle({
          id: formData.id,
          type: formData.type,
          capacity: Number(formData.capacity),
          availableFrom: formData.availableFrom,
          availability: Number(formData.availability),
          costPerKm: Number(formData.costPerKm),
          weightTons: Number(formData.weightTons || 8),
        });
      }

      onSave(type, created, isEdit);
      onClose();
    } catch (err) {
      setError(err.message || 'Validation failed. Please verify entity fields.');
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isEdit ? 'Edit Network Entity' : 'Add Network Entity'}
            </h3>
            <p className="text-xs text-slate-500">
              Configure parameters for the regional supply network twin.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Entity Type Selector (if adding new) */}
        {!isEdit && (
          <div className="px-6 pt-3 flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 bg-slate-50/40">
            {['supplier', 'warehouse', 'buyer', 'route', 'vehicle'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setEntityType(t)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg capitalize transition-colors ${
                  type === t
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Common ID & Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Entity ID</label>
              <input
                type="text"
                value={formData.id || ''}
                disabled={isEdit}
                onChange={(e) => handleChange('id', e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {type === 'vehicle' ? 'Vehicle Type / Model' : 'Name / Title'}
              </label>
              <input
                type="text"
                value={formData.name || formData.type || ''}
                onChange={(e) =>
                  handleChange(type === 'vehicle' ? 'type' : 'name', e.target.value)
                }
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Geographic Location for Nodes */}
          {['supplier', 'warehouse', 'buyer'].includes(type) && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <label className="block font-bold text-slate-700">Location Details</label>
              <input
                type="text"
                placeholder="Hub / City Name (e.g. Satpur MIDC, Nashik)"
                value={formData.locationName || ''}
                onChange={(e) => handleChange('locationName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.lat ?? 19.99}
                    onChange={(e) => handleChange('lat', e.target.value)}
                    required
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.lng ?? 73.78}
                    onChange={(e) => handleChange('lng', e.target.value)}
                    required
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Specific: Supplier */}
          {type === 'supplier' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Supply Limit (units/period)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.supplyLimit || ''}
                  onChange={(e) => handleChange('supplyLimit', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Category</label>
                <input
                  type="text"
                  value={formData.product || ''}
                  onChange={(e) => handleChange('product', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          {/* Specific: Warehouse */}
          {type === 'warehouse' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Available Stock (units)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock || ''}
                  onChange={(e) => handleChange('stock', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Storage Limit (units)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.storageLimit || ''}
                  onChange={(e) => handleChange('storageLimit', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          {/* Specific: Buyer */}
          {type === 'buyer' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Demand Qty (units)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.demandQty || ''}
                  onChange={(e) => handleChange('demandQty', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Deadline (hours)</label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={formData.deadline || ''}
                  onChange={(e) => handleChange('deadline', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Priority</label>
                <select
                  value={formData.priority || 'medium'}
                  onChange={(e) => handleChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs uppercase font-bold"
                >
                  <option value="high">HIGH (Life/Critical)</option>
                  <option value="medium">MEDIUM</option>
                  <option value="low">LOW</option>
                </select>
              </div>
            </div>
          )}

          {/* Specific: Route */}
          {type === 'route' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">From Node</label>
                  <select
                    value={formData.from || ''}
                    onChange={(e) => handleChange('from', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    {allNodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} ({n.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">To Node</label>
                  <select
                    value={formData.to || ''}
                    onChange={(e) => handleChange('to', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    {allNodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} ({n.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold">Distance (km)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.distanceKm || ''}
                    onChange={(e) => handleChange('distanceKm', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold">Base Time (h)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={formData.baseTravelTimeH || ''}
                    onChange={(e) => handleChange('baseTravelTimeH', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold">Status</label>
                  <select
                    value={formData.status || 'open'}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs uppercase font-bold"
                  >
                    <option value="open">Open</option>
                    <option value="slow">Slow</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold">
                    Max Vehicle Weight (Tons)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 30"
                    value={formData.maxWeightTons || ''}
                    onChange={(e) => handleChange('maxWeightTons', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold">Risk Score (0 - 1)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={formData.riskScore || ''}
                    onChange={(e) => handleChange('riskScore', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Specific: Vehicle */}
          {type === 'vehicle' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stationed Warehouse</label>
                  <select
                    value={formData.availableFrom || ''}
                    onChange={(e) => handleChange('availableFrom', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Units Capacity per Trip
                  </label>
                  <input
                    type="number"
                    min="10"
                    value={formData.capacity || ''}
                    onChange={(e) => handleChange('capacity', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold">Vehicles Available</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.availability || 1}
                    onChange={(e) => handleChange('availability', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold">Cost per Km (₹)</label>
                  <input
                    type="number"
                    min="5"
                    value={formData.costPerKm || 25}
                    onChange={(e) => handleChange('costPerKm', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold">Weight (Tons)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.weightTons || 8}
                    onChange={(e) => handleChange('weightTons', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isEdit ? 'Save Changes' : 'Create Entity'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
