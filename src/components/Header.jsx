import React, { useState, useRef, useEffect } from 'react';
import {
  Truck,
  Activity,
  CircleHelp,
  QrCode,
  Sparkles,
  Trash2,
  Plus,
  Package,
  MoreVertical,
  ChevronDown,
} from 'lucide-react';
import RoleSwitcher from './RoleSwitcher';
import ShareJudgeModal from './ShareJudgeModal';
import { useAuth } from '../context/AuthContext';
import { useReRoute } from '../context/ReRouteContext';

export default function Header({ onOpenDemoGuide, onResetAll }) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef(null);

  const { user, profile, isDemoUser } = useAuth();
  const {
    isDemoMode,
    trucks = [],
    shipments = [],
    handleRequestLoadDemo,
    setIsClearConfirmOpen,
    setIsAddTruckOpen,
    setIsAddShipmentOpen,
  } = useReRoute();

  const isLocal = isDemoMode || !user || !profile || isDemoUser;
  const orgName = profile?.org_name || profile?.org_id || 'demo-org';

  // Accurate fleet count matching real fleet state
  const activeCount = trucks.length;
  const hasData = trucks.length > 0 || shipments.length > 0;

  // Close "More" dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (moreRef.current && !moreRef.current.contains(event.target)) {
        setIsMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-40 shadow-soft w-full">
      <div className="max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white shadow-sm ring-1 ring-blue-500/20 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-[#0F172A] truncate">
                ReRoute AI{' '}
                <span className="text-blue-600 font-extrabold text-xs sm:text-base px-1 sm:px-1.5 py-0.5 rounded-md bg-blue-50 border border-blue-200">
                  2.0
                </span>
              </span>
              {isLocal ? (
                <span
                  data-testid="env-badge"
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 shrink-0"
                  title="Running in local writable sandbox mode. Zero cloud mutations."
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="hidden sm:inline">Local sandbox</span>
                  <span className="sm:hidden">Sandbox</span>
                </span>
              ) : (
                <span
                  data-testid="env-badge"
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0"
                  title={`Connected to Supabase (${orgName})`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden sm:inline">Cloud · {orgName}</span>
                  <span className="sm:hidden">Cloud</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B] hidden sm:block font-medium truncate">
              Predictive backhaul matching to eliminate empty return miles
            </p>
          </div>
        </div>

        {/* Clean Corridor Telemetry Pill - Cleanly truncated with hover tooltip */}
        <div
          className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full text-xs max-w-sm min-w-0 cursor-default"
          title="Corridor: Maharashtra & Western Express Corridor (Nashik - Mumbai - Pune - Gujarat)"
        >
          <Activity className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-[#64748B] font-medium shrink-0">Corridor:</span>
          <span className="text-[#0F172A] font-semibold truncate">
            Maharashtra & Western Express
          </span>
          <span className="text-[#CBD5E1] shrink-0">|</span>
          <span className="text-[#64748B] shrink-0">Active:</span>
          <span className="text-blue-600 font-bold shrink-0">
            {activeCount} {activeCount === 1 ? 'Truck' : 'Trucks'}
          </span>
        </div>

        {/* Primary Controls & "More" Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Primary Action 1: Add Truck */}
          <button
            onClick={() => setIsAddTruckOpen?.(true)}
            className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 min-h-[38px] text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors shadow-xs cursor-pointer"
            title="Add a new truck to fleet"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Add Truck</span>
          </button>

          {/* Primary Action 2: Add Load */}
          <button
            onClick={() => setIsAddShipmentOpen?.(true)}
            className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 min-h-[38px] text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shadow-xs cursor-pointer"
            title="Post a freight shipment consignment"
          >
            <Package className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Add Load</span>
          </button>

          {/* Primary Action 3: Load Demo Data */}
          <button
            onClick={handleRequestLoadDemo}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 min-h-[38px] text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-all shadow-xs cursor-pointer"
            title="Load demonstration scenario dataset"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden md:inline">Load Demo Data</span>
            <span className="md:hidden">Demo</span>
          </button>

          {/* 2-Min Demo Script / Guide Button */}
          <button
            onClick={onOpenDemoGuide}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 min-h-[38px] text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all shadow-xs cursor-pointer"
            title="2-minute demo guide"
          >
            <CircleHelp className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">2-Min Demo Script</span>
          </button>

          {/* "More" Dropdown Menu (Consolidates QR, Guide, and Clear All) */}
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setIsMoreOpen((prev) => !prev)}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 min-h-[38px] text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors shadow-xs cursor-pointer"
              title="More options (QR, Guide, Reset)"
            >
              <span>More</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMoreOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-soft-lg py-1.5 z-50 text-xs animate-in fade-in duration-100">
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    setIsShareOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-blue-600" />
                  <span>Mobile QR Access</span>
                </button>

                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    onOpenDemoGuide?.();
                  }}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <CircleHelp className="w-4 h-4 text-emerald-600" />
                  <span>Demo Flow Guide</span>
                </button>

                {hasData && (
                  <>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      onClick={() => {
                        setIsMoreOpen(false);
                        setIsClearConfirmOpen?.(true);
                      }}
                      className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      <span>Clear All Data</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Role Dropdown */}
          <div className="pl-1 border-l border-[#E2E8F0]">
            <RoleSwitcher />
          </div>
        </div>
      </div>

      <ShareJudgeModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
    </header>
  );
}
