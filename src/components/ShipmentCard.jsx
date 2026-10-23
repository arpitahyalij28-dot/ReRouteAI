import React, { useState } from 'react';
import {
  CircleX,
  CircleCheck,
  TriangleAlert,
  CircleAlert,
  Sparkles,
  MapPin,
  Clock,
  ChevronRight,
  Edit2,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import { useDataContext } from '../context/DataContext';
import WhatsAppShareModal from './WhatsAppShareModal';

export default function ShipmentCard({
  shipment,
  score = { totalScore: 0 },
  isRecommended,
  isSelected,
  rankIndex,
  onSelect,
}) {
  const { setIsAddShipmentOpen, setEditingShipment, deleteShipment } = useDataContext();
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const isCancelled = shipment.isCancelled;

  const handleEdit = (e) => {
    e.stopPropagation();
    setEditingShipment(shipment);
    setIsAddShipmentOpen(true);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm(`Delete consignment ${shipment.id} (${shipment.name})?`)) {
      deleteShipment(shipment.id);
    }
  };

  const renderRiskBadge = () => {
    if (isCancelled) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-[#EF4444] border border-[#EF4444]/30">
          <CircleX className="w-3.5 h-3.5" />
          Cancelled
        </span>
      );
    }
    switch (shipment.delayRisk) {
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-[#22C55E] border border-[#22C55E]/30">
            <CircleCheck className="w-3.5 h-3.5" />
            Low Risk
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-[#F59E0B] border border-[#F59E0B]/30">
            <TriangleAlert className="w-3.5 h-3.5" />
            Medium Risk
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-[#EF4444] border border-[#EF4444]/30">
            <CircleAlert className="w-3.5 h-3.5" />
            High Risk
          </span>
        );
      default:
        return null;
    }
  };

  let cardClasses =
    'bg-white rounded-[12px] p-4 transition-all duration-200 cursor-pointer relative shadow-soft ';
  if (isCancelled) {
    cardClasses += 'border-2 border-[#EF4444] bg-rose-50/20 opacity-80 ';
  } else if (isRecommended) {
    cardClasses += 'border-2 border-[#2563EB] ring-2 ring-blue-500/10 hover:shadow-soft-md ';
  } else if (isSelected) {
    cardClasses += 'border border-[#2563EB] bg-blue-50/10 shadow-soft-md ';
  } else {
    cardClasses += 'border border-[#E2E8F0] hover:border-slate-300 hover:shadow-soft-md ';
  }

  const safeScore = score?.totalScore ?? 0;
  const freightYield = Number(shipment.freightOfferInr || shipment.value || 0);

  return (
    <div onClick={() => onSelect(shipment)} className={cardClasses}>
      {/* Top Bar: Rank, ID, Tags, Score, Edit/Delete */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
              isCancelled
                ? 'bg-rose-100 text-rose-700'
                : isRecommended
                ? 'bg-[#2563EB] text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            #{rankIndex + 1}
          </span>
          <span className="font-extrabold text-[#0F172A] text-sm tracking-tight">{shipment.id}</span>
          {isCancelled ? (
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#EF4444] text-white">
              Cancelled
            </span>
          ) : isRecommended ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#2563EB] text-white shadow-sm">
              <Sparkles className="w-3 h-3" />
              Recommended
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {renderRiskBadge()}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[10px] text-[#64748B] block font-medium leading-none mb-0.5">
                Match Score
              </span>
              <div
                className={`text-base font-extrabold leading-none ${
                  isCancelled
                    ? 'text-[#EF4444] line-through'
                    : safeScore >= 90
                    ? 'text-[#2563EB]'
                    : safeScore >= 80
                    ? 'text-slate-800'
                    : 'text-[#64748B]'
                }`}
              >
                {safeScore}%
              </div>
            </div>
            <div className="text-right border-l border-slate-200 pl-2">
              <span className="text-[10px] text-[#64748B] block font-medium leading-none mb-0.5">
                Final Score
              </span>
              <div className="text-base font-black text-slate-800 leading-none">
                {isCancelled
                  ? '—'
                  : `${shipment.finalAllocationScore || Math.max(1, Math.round(safeScore * 0.92))}%`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5 ml-1 border-l border-[#E2E8F0] pl-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsWhatsAppOpen(true);
              }}
              className="p-1 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
              title="Share WhatsApp Dispatch Voucher"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleEdit}
              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Edit load specifications"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Delete load"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Cargo & Route */}
      <div className="mb-3">
        <div className="text-xs font-semibold text-[#0F172A] mb-1 truncate">{shipment.name}</div>
        <div className="flex items-center gap-2 text-xs text-[#0F172A] font-medium">
          <span className="flex items-center gap-1 text-[#0F172A] truncate">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <strong className="truncate">{shipment.origin}</strong>
          </span>
          <span className="text-[#64748B] shrink-0">→</span>
          <span className="flex items-center gap-1 text-[#0F172A] truncate">
            <MapPin className="w-3.5 h-3.5 text-[#059669] shrink-0" />
            <strong className="truncate">{shipment.destination}</strong>
          </span>
        </div>
      </div>

      {/* Quick Specs Grid */}
      <div className="grid grid-cols-4 gap-2 p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs mb-3">
        <div>
          <span className="text-[10px] text-[#64748B] block">Payload</span>
          <span className="font-bold text-[#0F172A]">{shipment.weightTons} Tons</span>
        </div>
        <div>
          <span className="text-[10px] text-[#64748B] block">Detour</span>
          <span
            className={`font-bold ${
              (shipment.detourKm || 0) <= 10
                ? 'text-[#059669]'
                : (shipment.detourKm || 0) <= 25
                ? 'text-amber-600'
                : 'text-[#EF4444]'
            }`}
          >
            +{shipment.detourKm || 0} km
          </span>
        </div>
        <div>
          <span className="text-[10px] text-[#64748B] block">Pickup Window</span>
          <span className="font-bold text-[#0F172A]">
            {shipment.pickupWindowStart || '14:30'} - {shipment.pickupWindowEnd || '16:00'}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-[#64748B] block">Freight Yield</span>
          <span className="font-bold text-[#0F172A]">
            ₹{freightYield.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Timing Margin & Safety Bar */}
      <div className="pt-2 border-t border-[#E2E8F0]">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <div className="flex items-center gap-1 text-[#64748B]">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>
              Truck ETA: <strong className="text-[#0F172A]">{shipment.predictedTruckEta || '14:15'}</strong>
            </span>
            <span>
              vs Window:{' '}
              <strong className="text-[#0F172A]">
                {shipment.pickupWindowStart}-{shipment.pickupWindowEnd}
              </strong>
            </span>
          </div>
          <div>
            {(shipment.etaBufferMinutes ?? 15) >= 0 ? (
              <span className="font-bold text-[#22C55E] flex items-center gap-1">
                +{shipment.etaBufferMinutes ?? 15}m Safety Margin
              </span>
            ) : (
              <span className="font-bold text-[#EF4444] flex items-center gap-1">
                {shipment.etaBufferMinutes}m Window Breach
              </span>
            )}
          </div>
        </div>

        {/* Visual Timeline Buffer Bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex relative">
          <div className="absolute inset-y-0 left-[20%] right-[30%] bg-blue-100 border-x border-blue-300" />
          {(shipment.etaBufferMinutes ?? 15) >= 0 ? (
            <div
              className="h-full bg-[#22C55E] rounded-full transition-all duration-300"
              style={{ width: `${Math.min(95, 30 + (shipment.etaBufferMinutes ?? 15) * 2)}%` }}
            />
          ) : (
            <div className="h-full bg-[#EF4444] rounded-full transition-all duration-300 style={{ width: '92%' }}" />
          )}
        </div>

        <p className="text-[10px] text-[#64748B] mt-1.5 flex items-center justify-between">
          <span>{shipment.delayRiskReason || 'Nominal freight corridor routing'}</span>
          {isSelected && (
            <span className="text-blue-600 font-semibold flex items-center gap-0.5">
              Inspecting Explainability <ChevronRight className="w-3 h-3" />
            </span>
          )}
        </p>
      </div>

      {/* WhatsApp Dispatch Voucher Modal */}
      <WhatsAppShareModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        shipment={shipment}
        matchScore={safeScore}
      />
    </div>
  );
}
