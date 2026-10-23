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

const TRANSLATIONS = {
  en: {
    activeShift: 'Active Shift',
    gpsTelemetry: 'GPS Telemetry',
    transmitting: 'Transmitting (10s)',
    paused: 'Paused',
    pausePing: 'Pause Ping',
    resumePing: 'Resume Ping',
    assignedTender: 'Assigned Backhaul Tender',
    pickupBay: '1. Pickup Bay',
    window: 'Window',
    destDepot: '2. Destination Depot',
    cargo: 'Cargo',
    tons: 'tons',
    launchNav: 'Launch Google Maps GPS Navigation',
    sendWhatsapp: 'Send Dispatch Details via WhatsApp',
    checkinMilestones: 'Driver Check-in Milestones',
    atPickup: '1. At Pickup',
    loaded: '2. Loaded',
    delivered: '3. Delivered',
    hotline: '24/7 Dispatch Hotline',
    callDispatch: 'Call Dispatch',
    noActive: 'No Active Backhaul Consignment',
    waitingMatch: 'You have completed all scheduled deliveries. Waiting for autonomous dispatcher match.',
  },
  hi: {
    activeShift: 'सक्रिय शिफ्ट',
    gpsTelemetry: 'जीपीएस टेलीमेट्री',
    transmitting: 'भेजा जा रहा है (10s)',
    paused: 'रोक दिया गया',
    pausePing: 'पॉज़ करें',
    resumePing: 'शुरू करें',
    assignedTender: 'सौंपा गया बैकहॉल टेंडर',
    pickupBay: '१. पिकअप स्थान',
    window: 'समय सीमा',
    destDepot: '२. डिलीवरी स्थान',
    cargo: 'सामान',
    tons: 'टन',
    launchNav: 'गूगल मैप्स नेविगेशन खोलें',
    sendWhatsapp: 'व्हाट्सएप पर डिस्पैच विवरण भेजें',
    checkinMilestones: 'ड्राइवर चेक-इन चरण',
    atPickup: '१. पिकअप पर पहुंचे',
    loaded: '२. लोड हो गया',
    delivered: '३. डिलीवरी संपन्न',
    hotline: '24/7 डिस्पैच कंट्रोल रूम',
    callDispatch: 'कॉल करें',
    noActive: 'कोई सक्रिय बैकहॉल टेंडर नहीं',
    waitingMatch: 'सभी डिलीवरी पूरी हो चुकी हैं। नए बैकहॉल लोड की प्रतीक्षा की जा रही है।',
  },
  mr: {
    activeShift: 'सक्रिय पाळी (Shift)',
    gpsTelemetry: 'जीपीएस टेलीमेट्री',
    transmitting: 'पाठवले जात आहे (10s)',
    paused: 'थांबवले',
    pausePing: 'थांबवा',
    resumePing: 'सुरू करा',
    assignedTender: 'नियोजित बॅकहॉल टेंडर',
    pickupBay: '१. माल उचलण्याचे ठिकाण (Pickup)',
    window: 'वेळ मर्यादा',
    destDepot: '२. माल वितरण ठिकाण (Drop)',
    cargo: 'माल',
    tons: 'टन',
    launchNav: 'गुगल मॅप्स नेव्हिगेशन सुरू करा',
    sendWhatsapp: 'व्हॉट्सअ‍ॅपवर पाठवा',
    checkinMilestones: 'चालक चेक-इन टप्पे',
    atPickup: '१. पिकअपवर पोहोचलो',
    loaded: '२. माल भरला (Loaded)',
    delivered: '३. वितरण पूर्ण (Delivered)',
    hotline: '२४/७ डिस्पॅच नियंत्रण कक्ष',
    callDispatch: 'कॉल करा',
    noActive: 'सक्रिय बॅकहॉल लोड नाही',
    waitingMatch: 'सर्व वितरणे पूर्ण झाली आहेत. नवीन बॅकहॉल लोड नियोजनाची प्रतीक्षा करत आहे.',
  },
};

export default function DriverPortal() {
  const { user } = useAuth();
  const [lang, setLang] = useState('en');
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const {
    trucks,
    shipments,
    assignments,
    updateAssignmentStatus,
    recordTelemetry,
    showToast,
    truckRequests = [],
    acceptTruckRequest,
    rejectTruckRequest,
  } = useReRoute();

  // Active driver truck: assigned to authenticated user, or first available fleet truck
  const activeTruck = (user?.id ? trucks.find((t) => t.assignedDriverId === user.id) : null) || trucks[0] || null;

  // Find active assignment for this truck
  const activeAssignment = assignments.find(
    (a) => a.truckId === activeTruck?.id && a.status !== 'Delivered'
  );

  // Incoming shipper marketplace request for this vehicle
  const incomingRequest = truckRequests.find(
    (r) => r.truckId === activeTruck?.id && r.status === 'requested'
  );
  const requestedShipment = incomingRequest
    ? shipments.find((s) => s.id === incomingRequest.shipmentId)
    : null;

  // Find assigned shipment
  const assignedShipment = activeAssignment
    ? shipments.find((s) => s.id === activeAssignment.shipmentId)
    : null;

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

  // Generate WhatsApp Dispatch URL
  const waText = encodeURIComponent(
    `🚛 *ReRoute AI Dispatch Assignment*\n` +
    `• Truck: ${activeTruck?.regNumber || 'MH-15-EG-4402'} (${activeTruck?.driverName || 'Driver'})\n` +
    `• Tender: ${assignedShipment?.name || 'Backhaul Tender'}\n` +
    `• Pickup: ${assignedShipment?.origin || 'Bhiwandi'} (${assignedShipment?.pickupWindowStart || '14:00'} - ${assignedShipment?.pickupWindowEnd || '16:00'})\n` +
    `• Dropoff: ${assignedShipment?.destination || 'Nashik'}\n` +
    `• Cargo: ${assignedShipment?.weightTons || 10}T (${assignedShipment?.cargoType || 'Industrial'})\n` +
    `• Freight: ₹${assignedShipment?.freightOfferInr?.toLocaleString('en-IN') || '28,000'}\n` +
    `• Live Track: https://reroute-fleet.vercel.app/driver`
  );
  const waUrl = `https://wa.me/?text=${waText}`;

  const assignmentStatus = activeAssignment?.status || 'Assigned';

  return (
    <div className="max-w-md mx-auto space-y-4 pb-12">
      {/* Language Selector Bar */}
      <div className="flex items-center justify-between bg-white px-4 py-2 rounded-xl border border-[#E2E8F0] shadow-xs">
        <span className="text-xs font-bold text-[#64748B]">भाषा / Language:</span>
        <div className="flex items-center gap-1">
          {[
            { code: 'en', label: 'English' },
            { code: 'hi', label: 'हिंदी' },
            { code: 'mr', label: 'मराठी' },
          ].map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === l.code
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] bg-slate-100 hover:bg-slate-200'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

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
                  {t.activeShift}
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
              {t.gpsTelemetry}: {gpsActive ? t.transmitting : t.paused}
            </span>
          </div>

          <button
            onClick={() => setGpsActive(!gpsActive)}
            className="text-[11px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            {gpsActive ? t.pausePing : t.resumePing}
          </button>
        </div>

        <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Current: {currentWaypoint.name}</span>
          <span>Last Ping: {lastPingTime}</span>
        </div>
      </div>

      {/* Incoming Shipper Marketplace Request Banner */}
      {incomingRequest && requestedShipment && (
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-2xl p-5 border-2 border-blue-400 shadow-xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-blue-800/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-blue-500 text-white shadow-xs">
                <Package className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 block">
                  New Shipper Backhaul Offer
                </span>
                <strong className="text-sm font-bold text-white">
                  {requestedShipment.id}: {requestedShipment.name}
                </strong>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950">
              10m Hold Active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-blue-800/40 border border-blue-700/50">
              <span className="text-[10px] text-blue-300 block">Route Corridor</span>
              <strong className="text-white text-xs">
                {requestedShipment.origin} → {requestedShipment.destination}
              </strong>
            </div>
            <div className="p-2 rounded-lg bg-blue-800/40 border border-blue-700/50">
              <span className="text-[10px] text-blue-300 block">Offered Spot Rate</span>
              <strong className="text-emerald-300 text-xs font-black">
                ₹{(incomingRequest.offeredRateInr || requestedShipment.freightOfferInr || requestedShipment.value || 0).toLocaleString('en-IN')}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => acceptTruckRequest?.(incomingRequest.id)}
              className="flex-1 py-2 text-xs font-black rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Accept & Commit Vehicle</span>
            </button>
            <button
              onClick={() => rejectTruckRequest?.(incomingRequest.id)}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            >
              Decline
            </button>
          </div>
        </div>
      )}

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
                  {t.assignedTender}
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
                <span className="text-[10px] text-[#64748B] uppercase font-bold">{t.pickupBay}</span>
                <p className="font-bold text-[#0F172A]">{assignedShipment.origin}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#64748B]">
                  <Clock className="w-3 h-3 text-blue-600" />
                  <span>
                    {t.window}: {assignedShipment.pickupWindowStart} - {assignedShipment.pickupWindowEnd}
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
                <span className="text-[10px] text-[#64748B] uppercase font-bold">{t.destDepot}</span>
                <p className="font-bold text-[#0F172A]">{assignedShipment.destination}</p>
                <span className="text-[11px] text-[#64748B]">
                  {t.cargo}: {assignedShipment.weightTons || 10} {t.tons} • {assignedShipment.cargoType}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Google Maps Navigation + WhatsApp Dispatch */}
          <div className="space-y-2 pt-1">
            <a
              href={navUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 min-h-[44px] rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>{t.launchNav}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 min-h-[44px] rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>📱 {t.sendWhatsapp}</span>
            </a>
          </div>

          {/* Driver Milestone Status Progression */}
          <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
            <span className="text-[11px] font-bold text-[#0F172A] block">
              {t.checkinMilestones}
            </span>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <button
                onClick={() => handleMilestone('Arrived at Pickup')}
                className={`py-2 px-1 min-h-[44px] rounded-xl font-bold border transition-all cursor-pointer text-center ${
                  assignmentStatus === 'Arrived at Pickup'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {t.atPickup}
              </button>
              <button
                onClick={() => handleMilestone('Cargo Loaded')}
                className={`py-2 px-1 min-h-[44px] rounded-xl font-bold border transition-all cursor-pointer text-center ${
                  assignmentStatus === 'Cargo Loaded'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {t.loaded}
              </button>
              <button
                onClick={() => handleMilestone('Delivered')}
                className={`py-2 px-1 min-h-[44px] rounded-xl font-bold border transition-all cursor-pointer text-center ${
                  assignmentStatus === 'Delivered'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {t.delivered}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-soft text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-sm font-bold text-[#0F172A]">{t.noActive}</h3>
          <p className="text-xs text-[#64748B]">
            {t.waitingMatch}
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
            <span className="font-bold text-[#0F172A] block">{t.hotline}</span>
            <span className="text-[11px] text-[#64748B]">West Zone Control Room</span>
          </div>
        </div>
        <a
          href="tel:18002004400"
          className="px-3 py-2 min-h-[44px] rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors inline-flex items-center"
        >
          {t.callDispatch}
        </a>
      </div>
    </div>
  );
}
