import React, { useState, useEffect } from 'react';
import {
  TriangleAlert,
  Clock,
  Search,
  ArrowRight,
  Radio,
  MapPin,
  CloudSun,
  Truck,
  Plus,
  Sparkles,
  Edit2,
  Trash2,
} from 'lucide-react';
import { formatCountdown } from '../utils/scoring';
import { useDataContext } from '../context/DataContext';
import { useReRoute } from '../context/ReRouteContext';
import { getCorridorWeather } from '../lib/weather';
import WeatherBadge from './WeatherBadge';

export default function TruckCard({
  truck,
  onFindBackhaul,
  isMatched,
  activeShipmentCount = 0,
}) {
  const {
    setIsAddTruckOpen,
    setEditingTruck,
    deleteTruck,
    handleRequestLoadDemo,
  } = useDataContext();

  const [secondsLeft, setSecondsLeft] = useState(truck?.countdownSeconds || 8100);
  const [weatherData, setWeatherData] = useState(null);

  useEffect(() => {
    if (!truck) return;
    setSecondsLeft(truck.countdownSeconds || 8100);
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [truck?.id, truck?.countdownSeconds]);

  const { corridorWeather, simulateHeavyRain, selectedTruckId } = useReRoute();
  const [localWeather, setLocalWeather] = useState(null);

  // Fetch or resolve weather along truck corridor
  useEffect(() => {
    if (!truck) return;
    if (selectedTruckId === truck.id && corridorWeather) {
      setLocalWeather(corridorWeather);
      return;
    }
    let isMounted = true;
    getCorridorWeather(truck, { simulateHeavyRain }).then((res) => {
      if (isMounted) {
        setLocalWeather(res);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [truck?.id, truck?.currentLat, truck?.currentLng, selectedTruckId, corridorWeather, simulateHeavyRain]);

  // Empty state handling
  if (!truck) {
    return (
      <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
          <Truck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#0F172A]">No trucks added yet</h3>
          <p className="text-xs text-[#64748B] mt-1 max-w-xs mx-auto">
            Add your first vehicle or load the demonstration dataset to start predictive corridor optimization.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
          <button
            onClick={() => {
              setEditingTruck(null);
              setIsAddTruckOpen(true);
            }}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Truck</span>
          </button>
          <button
            onClick={handleRequestLoadDemo}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Load Demo Data</span>
          </button>
        </div>
      </div>
    );
  }

  const countdown = formatCountdown(secondsLeft);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const emptyProb = truck.emptyReturnProbability || 85;
  const strokeDashoffset = circumference - (emptyProb / 100) * circumference;

  const totalKm = Number(truck.totalTripKm) || 160;
  const remainingKm = Number(truck.outboundRemainingKm) || 60;
  const tripProgressPct = Math.min(100, Math.max(0, Math.round(((totalKm - remainingKm) / totalKm) * 100)));

  const handleEdit = () => {
    setEditingTruck(truck);
    setIsAddTruckOpen(true);
  };

  const handleDelete = () => {
    if (confirm(`Remove vehicle ${truck.id} (${truck.regNumber}) from fleet?`)) {
      deleteTruck(truck.id);
    }
  };

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
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleEdit}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Edit truck parameters"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete truck"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Gauge & Countdown Section - Clean vertical stack to avoid cramped columns */}
        <div className="flex flex-col gap-3 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl mb-4">
          {/* Radial Probability Gauge */}
          <div className="flex items-center gap-3.5">
            <div className="relative w-[72px] h-[72px] shrink-0 flex items-center justify-center">
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
              <div className="absolute text-center leading-none">
                <span className="text-base font-black text-[#0F172A]">
                  {truck.emptyReturnProbability}%
                </span>
                <span className="block text-[8px] text-[#64748B] font-semibold uppercase">
                  Risk
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-[#0F172A]">
                  Transit Re-Route Risk
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  {truck.emptyReturnProbability}% Predictive Risk
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed break-words">
                Destination has freight demand deficit. Proactive corridor assignment recommended before arrival.
              </p>
            </div>
          </div>

          {/* Countdown Clock Box */}
          <div className="border-t border-[#E2E8F0] pt-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="font-semibold text-[#0F172A]">Re-Route Opportunity Window</span>
              </div>
              <div className="font-mono text-base font-black text-[#0F172A] tracking-tight">
                {countdown.formatted}
              </div>
            </div>
            <p className="text-[10px] text-[#64748B] mt-1">
              Expected empty at {truck.expectedDeliveryTime} IST ({truck.destination?.split(' ')[0] || 'Destination'})
            </p>
          </div>
        </div>

        {/* Find Backhaul CTA */}
        <div className="space-y-2">
          <button
            onClick={onFindBackhaul}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Find Optimal Loads ({activeShipmentCount} Consignments Available)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="flex items-center justify-between text-[11px] text-[#64748B] px-1">
            <span className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-[#059669] animate-pulse" />
              <span>GPS Telemetry: Active</span>
            </span>
            <span>Pre-matching in transit</span>
          </div>
        </div>
      </div>

      {/* Truck Specs Card */}
      <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              Active Vehicle Specifications
            </h3>
            <span className="text-xs text-[#64748B]">
              {truck.model || 'Heavy Commercial Vehicle'} • {truck.regNumber}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            {truck.status}
          </span>
        </div>

        <div className="space-y-3">
          {/* Corridor Route on Separate Rows */}
          <div className="space-y-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            {/* Origin Row */}
            <div className="flex items-start gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0 ring-2 ring-emerald-100" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Origin</span>
                <span className="text-xs font-semibold text-[#0F172A] break-words">
                  {truck.origin} {truck.originHub && !truck.origin?.includes(truck.originHub) ? `(${truck.originHub})` : ''}
                </span>
              </div>
            </div>

            {/* Destination Row */}
            <div className="flex items-start gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 shrink-0 ring-2 ring-rose-100" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Destination</span>
                <span className="text-xs font-semibold text-[#0F172A] break-words">
                  {truck.destination} {truck.destinationHub && !truck.destination?.includes(truck.destinationHub) ? `(${truck.destinationHub})` : ''}
                </span>
              </div>
            </div>

            {/* Progress Bar Below Routes */}
            <div className="pt-1.5 border-t border-slate-200">
              <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                <span className="font-semibold text-[#0F172A]">Trip Progress: {tripProgressPct}%</span>
                <span>{totalKm - remainingKm} of {totalKm} km ({remainingKm} km left)</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${tripProgressPct}%` }}
                />
              </div>
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

          {/* Corridor Weather Telemetry Chip */}
          <WeatherBadge weather={localWeather || corridorWeather} variant="badge" />
        </div>
      </div>
    </div>
  );
}
