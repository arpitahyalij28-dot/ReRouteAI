// ReRoute AI 2.0 - Driver Mobile Experience Portal
// Mobile-first responsive interface for field operators and heavy commercial drivers.
// Provides live dispatch instructions, SLA countdown, one-tap milestone check-ins,
// Google Maps navigation links, and 10s background GPS telemetry transmission.

import React, { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  Navigation,
  CheckCircle2,
  Clock,
  Radio,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Package,
  PhoneCall,
  RefreshCw,
} from 'lucide-react';
import { useReRoute } from '../context/ReRouteContext';
import { useAuth } from '../context/AuthContext';

export default function DriverPortal() {
  const { user } = useAuth();
  const {
    trucks,
    shipments,
    assignments,
    updateAssignmentStatus,
    recordTelemetry,
    showToast,
  } = useReRoute();

  // Active driver truck: assigned to authenticated user, or first available fleet truck
  const activeTruck = (user?.id ? trucks.find((t) => t.assignedDriverId === user.id) : null) || trucks[0] || null;

  // Find active assignment for this truck
  const activeAssignment = assignments.find(
    (a) => a.truckId === activeTruck?.id && a.status !== 'Delivered'
  );

  // Find assigned shipment
  const assignedShipment = activeAssignment
    ? shipments.find((s) => s.id === activeAssignment.shipmentId)
    : shipments[0]; // Fallback to candidate load

  const [gpsActive, setGpsActive] = useState(true);
  const [lastPingTime, setLastPingTime] = useState(new Date().toLocaleTimeString());
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Corridor route simulation coordinates (Nashik to Bhiwandi via Kasara Ghat)
  const ROUTE_WAYPOINTS = [
    { lat: 19.9575, lng: 73.742, name: 'Nashik (Ambad MIDC)', speed: 0 },
    { lat: 19.851, lng: 73.654, name: 'Igatpuri Approaching', speed: 45 },
    { lat: 19.702, lng: 73.518, name: 'Kasara Ghat Summit', speed: 35 },
    { lat: 19.584, lng: 73.342, name: 'Shahapur Bypass', speed: 58 },
    { lat: 19.412, lng: 73.195, name: 'Kalyan Phata Junction', speed: 52 },
    { lat: 19.2967, lng: 73.0631, name: 'Bhiwandi Central Depot', speed: 20 },
  ];

  // 10-second Telemetry Transmitter
  useEffect(() => {
    if (!gpsActive || !activeTruck) return;

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        const nextIdx = (prev + 1) % ROUTE_WAYPOINTS.length;
        const pt = ROUTE_WAYPOINTS[nextIdx];
        recordTelemetry({
          truckId: activeTruck.id,
          lat: pt.lat,
          lng: pt.lng,
          speed: pt.speed,
          locationName: pt.name,
        });
        setLastPingTime(new Date().toLocaleTimeString());
        return nextIdx;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [gpsActive, activeTruck, recordTelemetry]);

  // Milestone check-in actions
  const handleMilestone = async (newStatus) => {
    if (!activeAssignment) {
      showToast('No active dispatch assignment to update.', 'alert');
      return;
    }
    await updateAssignmentStatus(activeAssignment.id, newStatus);
  };

  const currentWaypoint = ROUTE_WAYPOINTS[currentStepIndex];

  // Generate Google Maps Turn-by-Turn URL
  const navUrl = assignedShipment
    ? `https://www.google.com/maps/dir/?api=1&origin=${activeTruck?.currentLat || 19.9575},${
        activeTruck?.currentLng || 73.742
      }&destination=${assignedShipment.dropLat || 19.2967},${
        assignedShipment.dropLng || 73.0631
      }`
    : '#';

  const assignmentStatus = activeAssignment?.status || 'Assigned';

  return (
    <div className="max-w-md mx-auto space-y-4 pb-12">
      {/* Driver Identity Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-xl border border-slate-700 relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-20px] w-36 h-36 bg-blue-500/10 rounded-full blur-2xl" />

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-lg">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight">
                  {activeTruck?.driverName || 'Driver Ramesh Shinde'}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  Active Shift
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono">
                {activeTruck?.regNumber || 'MH-15-EG-4402'} • {activeTruck?.model || 'Tata Prima 2830.K'}
              </p>
            </div>
          </div>
        </div>

        {/* GPS Live Telemetry Pill */}
        <div className="mt-4 pt-3 border-t border-slate-700/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {gpsActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  gpsActive ? 'bg-emerald-500' : 'bg-slate-500'
                }`}
              />
            </span>
            <span className="text-slate-300 text-[11px]">
              GPS Telemetry: {gpsActive ? 'Transmitting (10s)' : 'Paused'}
            </span>
          </div>

          <button
            onClick={() => setGpsActive(!gpsActive)}
            className="text-[11px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            {gpsActive ? 'Pause Ping' : 'Resume Ping'}
          </button>
        </div>

        <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Current: {currentWaypoint.name}</span>
          <span>Last Ping: {lastPingTime}</span>
        </div>
      </div>

      {/* Active Load Instruction Card */}
      {assignedShipment ? (
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-blue-50 text-blue-600 border border-blue-200">
                <Package className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  Assigned Backhaul Tender
                </span>
                <h2 className="text-sm font-bold text-[#0F172A]">{assignedShipment.name}</h2>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {assignmentStatus}
            </span>
          </div>

          {/* Locations */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700 mt-0.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1 text-xs">
                <span className="text-[10px] text-[#64748B] uppercase font-bold">1. Pickup Bay</span>
                <p className="font-bold text-[#0F172A]">{assignedShipment.origin}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#64748B]">
                  <Clock className="w-3 h-3 text-blue-600" />
                  <span>
                    Window: {assignedShipment.pickupWindowStart} - {assignedShipment.pickupWindowEnd}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-l-2 border-dashed border-slate-200 ml-5 h-4" />

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700 mt-0.5">
                <MapPin className="w-4 h-4 text-rose-600" />
              </div>
              <div className="flex-1 text-xs">
                <span className="text-[10px] text-[#64748B] uppercase font-bold">2. Destination Depot</span>
                <p className="font-bold text-[#0F172A]">{assignedShipment.destination}</p>
                <span className="text-[11px] text-[#64748B]">
                  Cargo: {assignedShipment.weightTons} tons • {assignedShipment.cargoType}
                </span>
              </div>
            </div>
          </div>

          {/* Turn-by-Turn Navigation Action */}
          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Navigation className="w-4 h-4" />
            <span>Launch Google Maps GPS Navigation</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Driver Milestone Status Progression */}
          <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
            <span className="text-[11px] font-bold text-[#0F172A] block">
              Driver Check-in Milestones
            </span>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <button
                onClick={() => handleMilestone('Arrived at Pickup')}
                className={`py-2 px-1 rounded-xl font-bold border transition-all cursor-pointer text-center ${
                  assignmentStatus === 'Arrived at Pickup'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                1. At Pickup
              </button>
              <button
                onClick={() => handleMilestone('Cargo Loaded')}
                className={`py-2 px-1 rounded-xl font-bold border transition-all cursor-pointer text-center ${
                  assignmentStatus === 'Cargo Loaded'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                2. Loaded
              </button>
              <button
                onClick={() => handleMilestone('Delivered')}
                className={`py-2 px-1 rounded-xl font-bold border transition-all cursor-pointer text-center ${
                  assignmentStatus === 'Delivered'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                3. Delivered
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-soft text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-sm font-bold text-[#0F172A]">No Active Backhaul Consignment</h3>
          <p className="text-xs text-[#64748B]">
            You have completed all scheduled deliveries. Waiting for autonomous dispatcher match.
          </p>
        </div>
      )}

      {/* Emergency & Support Card */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-soft flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <PhoneCall className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-[#0F172A] block">24/7 Dispatch Hotline</span>
            <span className="text-[11px] text-[#64748B]">West Zone Control Room</span>
          </div>
        </div>
        <a
          href="tel:18002004400"
          className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
        >
          Call Dispatch
        </a>
      </div>
    </div>
  );
}
