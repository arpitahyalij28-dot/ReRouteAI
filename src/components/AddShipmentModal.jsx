// ReRoute AI 2.0 - Add & Edit Shipment / Load Modal
// Dual-mode: Manual form entry OR AI WhatsApp/Transporter Message Parser.
// Supports Hindi, Hinglish, Marathi, and English load extraction.

import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Check,
  Sparkles,
  MessageSquareText,
  FileEdit,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Clock,
  IndianRupee,
  Truck,
} from 'lucide-react';
import { CITIES } from '../data/cities';
import { useDataContext } from '../context/DataContext';
import { parseLoadMessage } from '../lib/loadParser';

const CARGO_TYPES = [
  'Automotive Sub-Assemblies & Tier-1 Spares',
  'FMCG Packaging Materials & Cartons',
  'Pharmaceutical & Cold-Chain Goods',
  'Industrial Heavy Machinery & Equipment',
  'Textiles, Apparel & Yarns',
  'Chemicals & Polymers (Non-Hazmat)',
  'Electronics & Electrical Assemblies',
  'Steel coils & structural metal',
  'Perishable Agri-Produce & Cold-Chain',
  'General Dry Freight',
];

const PRIORITIES = ['High', 'Medium', 'Standard'];

const SAMPLE_MESSAGES = [
  {
    label: 'Hindi (Pune → Surat Steel)',
    text: 'कल सुबह 6 बजे पुणे से सूरत 12 टन स्टील भेजना है, 28000 दूंगा',
  },
  {
    label: 'Hinglish (Nashik → Vapi FMCG)',
    text: 'kal 10am Nashik to Vapi 8T FMCG bhada 18k urgent',
  },
  {
    label: 'English (Thane → Pune Auto)',
    text: 'Today 4pm Thane to Pune 5 ton auto parts offer 14000',
  },
];

export default function AddShipmentModal({ isOpen, onClose, editingShipment = null }) {
  const { addShipment, updateShipment, shipments } = useDataContext();

  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'parser'
  const [pasteText, setPasteText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [parsedResult, setParsedResult] = useState(null);

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
      setActiveTab('form');
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
      setPasteText('');
      setParsedResult(null);
      setParseError(null);
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
    if (e?.preventDefault) e.preventDefault();
    if (!validate()) {
      setActiveTab('form');
      return;
    }

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

  const handleParse = async (textToParse = pasteText) => {
    const target = textToParse.trim();
    if (!target) {
      setParseError('Please enter or select a transporter load message to parse.');
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      const res = await parseLoadMessage(target);
      if (res && res.success && res.data) {
        setParsedResult(res);

        // Populate formData
        setFormData((prev) => ({
          ...prev,
          pickupCity: res.data.origin || prev.pickupCity,
          dropCity: res.data.destination || prev.dropCity,
          weightTons: res.data.weightTons ?? prev.weightTons,
          cargoType: res.data.cargoType || prev.cargoType,
          freightRate: res.data.freightOfferInr ?? prev.freightRate,
          pickupWindowStart: res.data.pickupWindowStart || prev.pickupWindowStart,
          pickupWindowEnd: res.data.pickupWindowEnd || prev.pickupWindowEnd,
          priority: res.data.priority || prev.priority,
          specialRequirements: res.data.specialRequirements || prev.specialRequirements,
          name: `${res.data.origin} → ${res.data.destination} (${(res.data.cargoType || '').split(' ')[0]})`,
        }));
      } else {
        setParseError(res?.error || 'Could not parse load parameters from this text.');
      }
    } catch (err) {
      setParseError(err.message || 'Failed to parse text.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSampleClick = (sampleText) => {
    setPasteText(sampleText);
    handleParse(sampleText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-[#E2E8F0] shadow-soft-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
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

        {/* Tab Switcher (Only when adding a new shipment) */}
        {!editingShipment && (
          <div className="px-6 pt-3 pb-0 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-all cursor-pointer ${
                activeTab === 'form'
                  ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Manual Entry</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('parser')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-all cursor-pointer ${
                activeTab === 'parser'
                  ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquareText className="w-3.5 h-3.5 text-emerald-600" />
              <div className="flex items-center gap-1.5">
                <span>WhatsApp / Chat Parser</span>
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full">
                  AI
                </span>
              </div>
            </button>
          </div>
        )}

        {/* TAB 1: WhatsApp / Message Parser */}
        {activeTab === 'parser' && !editingShipment ? (
          <div className="p-6 space-y-4 overflow-y-auto">
            {/* Explanatory Banner */}
            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/60 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 leading-relaxed">
                <strong>Natural Language Consignment Parser:</strong> Paste unformatted WhatsApp messages or broker tenders in Hindi, Hinglish, Marathi, or English. ReRoute AI extracts origin, destination, payload, freight quote, and schedule automatically.
              </div>
            </div>

            {/* Quick Sample Chips */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                Quick Test Samples:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_MESSAGES.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSampleClick(s.text)}
                    className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer text-left"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-900">
                  Message Text
                </label>
                <span className="text-[10px] text-slate-400">
                  {pasteText.length} characters
                </span>
              </div>
              <textarea
                rows={3}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="e.g. kal subah 6 baje Pune se Surat 12 ton steel bhejna hai, 28000 dunga..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
              />
            </div>

            {/* Parse Button */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={isParsing || !pasteText.trim()}
                onClick={() => handleParse()}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing message...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Parse Load Details</span>
                  </>
                )}
              </button>

              {parsedResult && (
                <span className="text-[10px] text-slate-500 font-medium">
                  Engine: <strong className="text-slate-700">{parsedResult.provider || 'Deterministic Engine'}</strong>
                </span>
              )}
            </div>

            {/* Error Message */}
            {parseError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Parsed Output Card */}
            {parsedResult && parsedResult.data && (
              <div className="p-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">Extracted Consignment Parameters</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {Math.round((parsedResult.confidence?.overall || 0.9) * 100)}% Confidence
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Corridor</span>
                    <strong className="text-slate-800 text-xs flex items-center gap-1">
                      {parsedResult.data.origin} <ArrowRight className="w-3 h-3 text-slate-400 inline" /> {parsedResult.data.destination}
                    </strong>
                  </div>

                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Payload</span>
                    <strong className="text-slate-800 text-xs">
                      {parsedResult.data.weightTons} Tonnes
                    </strong>
                  </div>

                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Freight Offer</span>
                    <strong className="text-emerald-700 text-xs font-bold">
                      ₹{parsedResult.data.freightOfferInr?.toLocaleString('en-IN') || '25,000'}
                    </strong>
                  </div>

                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Schedule Window</span>
                    <strong className="text-slate-800 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400 inline" />
                      {parsedResult.data.pickupWindowStart} - {parsedResult.data.pickupWindowEnd}
                    </strong>
                  </div>

                  <div className="p-2 rounded-lg bg-white border border-slate-200 col-span-2">
                    <span className="text-[10px] text-slate-400 block font-semibold">Commodity Type</span>
                    <strong className="text-slate-800 text-xs truncate block">
                      {parsedResult.data.cargoType}
                    </strong>
                  </div>
                </div>

                {/* Next Steps */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('form')}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Review in Form
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Add Load</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: Standard Manual Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            {parsedResult && (
              <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Form pre-filled from parsed message ({parsedResult.provider})
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('parser')}
                  className="text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  Edit message
                </button>
              </div>
            )}

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
                  Freight Rate Offer (₹ INR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="500"
                  min="500"
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

            {/* Row 4: Commodity Type */}
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Commodity & Cargo Profile
              </label>
              <select
                value={formData.cargoType}
                onChange={(e) => setFormData({ ...formData, cargoType: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                {CARGO_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 5: Pickup Time Window */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Pickup Window Start <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.pickupWindowStart}
                  onChange={(e) => setFormData({ ...formData, pickupWindowStart: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Pickup Window End (Cutoff) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.pickupWindowEnd}
                  onChange={(e) => setFormData({ ...formData, pickupWindowEnd: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Row 6: Detour Allowance & Delay Risk */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#0F172A]">
                    Max Detour Allowed
                  </label>
                  <span className="text-xs font-bold text-emerald-600">
                    +{formData.detourKm} km
                  </span>
                </div>
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
        )}
      </div>
    </div>
  );
}
