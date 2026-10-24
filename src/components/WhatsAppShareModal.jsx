// Logistics Twin - WhatsApp Dispatch & Share Voucher Modal
// Generates formatted backhaul dispatch vouchers for drivers and shippers.
// Compatible with WhatsApp Web and mobile WhatsApp app via wa.me protocol.

import React, { useState } from 'react';
import {
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  X,
  Share2,
  Truck,
  MapPin,
  Calendar,
  IndianRupee,
  Leaf,
} from 'lucide-react';

export default function WhatsAppShareModal({
  isOpen,
  onClose,
  shipment,
  truck,
  matchScore,
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !shipment) return null;

  const truckId = truck?.id || 'T101';
  const truckReg = truck?.regNumber || 'MH-15-EG-4921';
  const driverName = truck?.driverName || 'Suresh Patil';
  const driverPhone = truck?.driverPhone || '+91 98230 45812';
  const scoreVal = matchScore || shipment.matchScore || 91;
  const freightRate = Number(shipment.freightOfferInr || shipment.value || 28500);

  const voucherText = `🚛 *Logistics Twin — Regional Dispatch Voucher*
---------------------------------------
✅ *Assigned Vehicle:* ${truckId} (${truckReg})
👨‍✈️ *Driver:* ${driverName} (${driverPhone})
🎯 *Match Score:* ${scoreVal}% Compatibility (Optimized Route)
---------------------------------------
📦 *Consignment ID:* ${shipment.id}
📋 *Cargo:* ${shipment.name || shipment.cargoType || 'Industrial Freight'}
⚖️ *Payload Weight:* ${shipment.weightTons || 8} Tons
📍 *Pickup Location:* ${shipment.origin}
🎯 *Delivery Destination:* ${shipment.destination}
⏰ *Pickup Window:* ${shipment.pickupWindowStart || '14:30'} - ${shipment.pickupWindowEnd || '16:00'} IST
💰 *Agreed Freight Rate:* ₹${freightRate.toLocaleString('en-IN')}
🗺️ *Google Maps Link:* https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shipment.origin)}
🌱 *Environmental Impact:* ~120 km empty running prevented (${Math.round((shipment.weightTons || 8) * 9.5)} kg CO₂ avoided)
---------------------------------------
⚡ *Powered by Logistics Twin Autonomous Corridor Dispatch*`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(voucherText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(voucherText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-2xl max-w-lg w-full overflow-hidden space-y-0 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">
                WhatsApp Dispatch Voucher
              </h3>
              <p className="text-[11px] text-emerald-100">
                1-Click dispatch details for driver {driverName} & shipper
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Voucher Preview Card */}
        <div className="p-4 space-y-3 bg-[#F8FAFC]">
          <div className="bg-white rounded-xl border border-emerald-200 p-3.5 space-y-2 text-xs font-mono text-slate-800 shadow-2xs whitespace-pre-line leading-relaxed max-h-64 overflow-y-auto">
            {voucherText}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={handleCopy}
              className="py-2.5 px-3 rounded-xl font-bold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copy Dispatch Text</span>
                </>
              )}
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-xl font-bold bg-[#25D366] hover:bg-[#1EBE5D] text-white flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 fill-white" />
              <span>Send via WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Leaf className="w-3.5 h-3.5 text-emerald-600" />
            <span>Optimizes regional transit trip</span>
          </span>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-semibold px-2 py-1 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
