// ReRoute AI 2.0 - Shipper Truck Marketplace Modal
// Uber-style reverse matching: ranks returning fleet trucks for a shipper's load tender.
// Displays dynamic backhaul quotes, detour km, pickup ETA buffer, and 10-minute soft-hold reservations.

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Truck,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Gauge,
  Navigation,
  Loader2,
  Lock,
} from 'lucide-react';
import { rankTrucksForShipment } from '../engine/reverseMatching.js';
import { useReRoute } from '../context/ReRouteContext.jsx';

export default function ShipperMarketplaceModal({ isOpen, onClose, shipment }) {
  const {
    trucks = [],
    settings = {},
    corridorWeather,
    truckRequests = [],
    requestTruck,
    showToast,
  } = useReRoute();

  const [requestingTruckId, setRequestingTruckId] = useState(null);

  // Compute live rankings
  const rankedTrucks = useMemo(() => {
    if (!shipment || !trucks.length) return [];
    return rankTrucksForShipment(shipment, trucks, {
      ...settings,
      weather: corridorWeather,
    });
  }, [shipment, trucks, settings, corridorWeather]);

  if (!isOpen || !shipment) return null;

  const handleRequest = async (candidate) => {
    setRequestingTruckId(candidate.truckId);
    try {
      await requestTruck(candidate.truckId, shipment.id, {
        regNumber: candidate.regNumber,
        offeredRateInr: shipment.freightOfferInr || shipment.value || candidate.backhaulQuoteInr,
        quoteInr: candidate.backhaulQuoteInr,
        savingsInr: candidate.savingsInr,
        detourKm: candidate.detourKm,
        etaBufferMinutes: candidate.etaBufferMinutes,
      });
    } catch (err) {
      console.error('Failed to request truck:', err);
    } finally {
      setRequestingTruckId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/80 via-white to-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Return Truck Marketplace
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                  Uber-Style Reverse Match
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Book returning corridor trucks to eliminate deadhead miles and capture backhaul discounts
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

        {/* Shipment Details Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Tender Load</span>
              <strong className="text-slate-900 font-bold">
                {shipment.id}: {shipment.name}
              </strong>
            </div>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Corridor</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                {shipment.origin} <ArrowRight className="w-3 h-3 text-slate-400 inline" /> {shipment.destination}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Payload & Window</span>
              <span className="text-slate-700">
                {shipment.weightTons}t | {shipment.pickupWindowStart} - {shipment.pickupWindowEnd}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {corridorWeather && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                🌧️ {corridorWeather.currentWeather?.condition || corridorWeather.condition || 'Corridor Transit'}
              </span>
            )}
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-lg text-xs">
              Budget: ₹{(shipment.freightOfferInr || shipment.value || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Candidate Trucks List */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {rankedTrucks.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No returning trucks currently available in this corridor.
            </div>
          ) : (
            rankedTrucks.map((candidate) => {
              const activeRequest = truckRequests.find(
                (r) => r.truckId === candidate.truckId && r.status === 'requested'
              );
              const isThisShipmentRequested = activeRequest && activeRequest.shipmentId === shipment.id;
              const isOtherShipmentRequested = activeRequest && activeRequest.shipmentId !== shipment.id;

              return (
                <div
                  key={candidate.truckId}
                  className={`p-4 rounded-xl border transition-all ${
                    candidate.rank === 1 && candidate.isFeasible
                      ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/40 via-white to-blue-50/20 shadow-sm'
                      : candidate.isFeasible
                      ? 'border-slate-200 bg-white hover:border-slate-300'
                      : 'border-slate-200 bg-slate-50/60 opacity-75'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    {/* Truck Info */}
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          candidate.rank === 1 && candidate.isFeasible
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        #{candidate.rank}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-bold text-slate-900">
                            {candidate.regNumber}
                          </strong>
                          <span className="text-xs text-slate-500 font-medium">
                            ({candidate.vehicleType})
                          </span>
                          {candidate.rank === 1 && candidate.isFeasible && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              Best Match
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Driver: <strong>{candidate.driverName}</strong></span>
                          <span>•</span>
                          <span>Location: {candidate.currentLocationName}</span>
                          <span>•</span>
                          <span>Capacity: {candidate.capacityTons}t</span>
                        </div>
                      </div>
                    </div>

                    {/* Match Score & Feasibility */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-semibold">Match Score</span>
                        <span
                          className={`text-base font-black ${
                            candidate.matchScore >= 80
                              ? 'text-emerald-700'
                              : candidate.matchScore >= 60
                              ? 'text-blue-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {candidate.matchScore}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Row: Price, Savings, Detour, ETA */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 text-xs">
                    {/* Backhaul Quote */}
                    <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200">
                      <span className="text-[10px] text-emerald-700 block font-semibold">
                        Backhaul Rate Quote
                      </span>
                      <strong className="text-sm font-black text-emerald-800">
                        ₹{candidate.backhaulQuoteInr.toLocaleString('en-IN')}
                      </strong>
                    </div>

                    {/* Shipper Savings */}
                    <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200">
                      <span className="text-[10px] text-blue-700 block font-semibold flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        Shipper Savings
                      </span>
                      <strong className="text-sm font-black text-blue-800">
                        ₹{candidate.savingsInr.toLocaleString('en-IN')}
                        <span className="text-[10px] font-bold text-blue-600 ml-1">
                          ({candidate.savingsPct}%)
                        </span>
                      </strong>
                    </div>

                    {/* Detour */}
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-semibold">
                        Corridor Detour
                      </span>
                      <strong className="text-sm font-bold text-slate-800">
                        +{candidate.detourKm} km
                      </strong>
                    </div>

                    {/* Arrival ETA */}
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-semibold">
                        Dock Arrival ETA
                      </span>
                      <strong className="text-sm font-bold text-slate-800 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {candidate.etaArrival}
                        <span
                          className={`text-[10px] font-bold ml-1 ${
                            candidate.etaBufferMinutes >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          ({candidate.etaBufferMinutes >= 0 ? `+${candidate.etaBufferMinutes}m` : `${candidate.etaBufferMinutes}m`})
                        </span>
                      </strong>
                    </div>
                  </div>

                  {/* Reasons / Checklist */}
                  <div className="space-y-1 mb-3">
                    {candidate.reasons.slice(0, 3).map((reason, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <span className="text-[10px] text-slate-400">
                      Standard Outbound Price: ₹{candidate.freshTripInr.toLocaleString('en-IN')}
                    </span>

                    {isThisShipmentRequested ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Hold Active (10m Soft Reservation)</span>
                      </div>
                    ) : isOtherShipmentRequested ? (
                      <div className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-medium cursor-not-allowed">
                        Reserved by another tender
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!candidate.isFeasible || requestingTruckId === candidate.truckId}
                        onClick={() => handleRequest(candidate)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          candidate.isFeasible
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {requestingTruckId === candidate.truckId ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Requesting...</span>
                          </>
                        ) : (
                          <>
                            <Truck className="w-3.5 h-3.5" />
                            <span>Request Truck (Hold 10m)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Soft-reservation holds vehicle for 10 minutes while driver confirms.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
