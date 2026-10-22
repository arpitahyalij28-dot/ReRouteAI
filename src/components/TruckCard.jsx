import React, { useState, useEffect } from 'react';
import { TriangleAlert, Clock, Search, ArrowRight, Radio, MapPin } from 'lucide-react';
import { formatCountdown } from '../utils/scoring';

export default function TruckCard({ truck, onFindBackhaul, isMatched, activeShipmentCount }) {
  const [secondsLeft, setSecondsLeft] = useState(truck.countdownSeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const countdown = formatCountdown(secondsLeft);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const emptyProb = truck.emptyReturnProbability;
  const strokeDashoffset = circumference - (emptyProb / 100) * circumference;

  const tripProgressPct = Math.round(
    ((truck.totalTripKm - truck.outboundRemainingKm) / truck.totalTripKm) * 100
  );

  return (
    <div className="space-y-4">
      {/* Early Warning Card */}
      <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />

        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-[#EF4444]">
              <TriangleAlert className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#EF4444]">
                Proactive Early Warning
              </span>
              <h2 className="text-base font-bold text-[#0F172A] leading-tight">
                Truck {truck.id} — {truck.emptyReturnProbability}% probability of empty return
              </h2>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 shrink-0">
            High Deadhead Risk
          </span>
        </div>

        {/* Gauge & Countdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl mb-4">
          {/* Radial Probability Gauge */}
          <div className="flex items-center gap-3">
            <div className="relative w-[76px] h-[76px] shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="#E2E8F0"
                  strokeWidth="7"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="url(#riskGradient)"
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-extrabold text-[#0F172A] leading-none">
                  {emptyProb}%
                </span>
                <span className="text-[9px] font-medium text-[#64748B] mt-0.5">Empty Prob.</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#0F172A]">Deadhead Exposure</div>
              <p className="text-[11px] text-[#64748B] leading-snug">
                165 km empty return projected if unassigned before Bhiwandi depot arrival.
              </p>
            </div>
          </div>

          {/* Countdown Clock */}
          <div className="flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-[#E2E8F0] pt-2.5 sm:pt-0 sm:pl-3">
            <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-medium mb-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Expected Empty Availability:</span>
            </div>
            <div className="text-xl font-extrabold text-[#0F172A] tracking-tight font-mono">
              {countdown.formatted}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-medium text-[#64748B]">
                ETA Dock Bay 4: <strong className="text-[#0F172A]">14:15 IST</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Find Backhaul Action Button */}
        <button
          onClick={onFindBackhaul}
          className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
            isMatched
              ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
              : 'bg-[#2563EB] text-white hover:bg-blue-700 hover:shadow-md'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>{isMatched ? 'Re-scan Backhaul Candidates' : 'Find Backhaul'}</span>
          <span className="ml-1 px-1.5 py-0.2 text-[11px] rounded bg-white/20 font-bold">
            {activeShipmentCount} Loads Ready
          </span>
          <ArrowRight className="w-4 h-4 ml-auto" />
        </button>
      </div>

      {/* Vehicle Telemetry Spec Card */}
      <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              T101
            </div>
            <div>
              <div className="text-xs font-bold text-[#0F172A]">{truck.regNumber}</div>
              <div className="text-[11px] text-[#64748B]">{truck.model}</div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Radio className="w-3 h-3 text-blue-600 animate-pulse" />
            {truck.status}
          </span>
        </div>

        <div className="space-y-2.5 text-xs">
          {/* Outbound Progress */}
          <div>
            <div className="flex justify-between text-[11px] text-[#64748B] mb-1">
              <span>Active Outbound Trip</span>
              <span className="font-semibold text-[#0F172A]">
                {truck.totalTripKm - truck.outboundRemainingKm} / {truck.totalTripKm} km (
                {tripProgressPct}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${tripProgressPct}%` }}
              />
            </div>
          </div>

          {/* Origin & Destination */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[10px]">Origin:</span>
              <span className="font-semibold text-[#0F172A] truncate block">{truck.origin}</span>
            </div>
            <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[10px]">Current Dest:</span>
              <span className="font-semibold text-[#0F172A] truncate block">
                {truck.destination}
              </span>
            </div>
          </div>

          {/* Specs */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block">Payload Capacity</span>
              <span className="font-bold text-xs text-[#0F172A]">{truck.capacityTons} Tons</span>
            </div>
            <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block">Current Speed</span>
              <span className="font-bold text-xs text-[#0F172A]">{truck.speedKmH} km/h</span>
            </div>
            <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block">Vehicle Mileage</span>
              <span className="font-bold text-xs text-[#0F172A]">
                {truck.vehicleMileageKmPerL} km/L
              </span>
            </div>
          </div>

          {/* Location & Driver */}
          <div className="p-2.5 rounded-lg bg-slate-50 border border-[#E2E8F0] flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-[#64748B]">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate max-w-[190px]">{truck.currentLocationName}</span>
            </div>
            <span className="font-medium text-[#0F172A] shrink-0">Driver: {truck.driverName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
