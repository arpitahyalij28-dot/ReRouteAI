import React, { useState } from 'react';
import { Truck, Activity, CircleHelp, QrCode } from 'lucide-react';
import RoleSwitcher from './RoleSwitcher';
import ShareJudgeModal from './ShareJudgeModal';
import { useAuth } from '../context/AuthContext';
import { useReRoute } from '../context/ReRouteContext';

export default function Header({ onOpenDemoGuide, onResetAll }) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { user, profile, role, isDemoUser } = useAuth();
  const { isDemoMode, trucks, isJudgeMode } = useReRoute();

  const isLocal = isDemoMode || !user || !profile || isDemoUser;
  const orgName = profile?.org_name || profile?.org_id || 'demo-org';
  const roleName = profile?.role || role || 'dispatcher';

  const inTransitTrucks = (trucks || []).filter((t) => t.status === 'In-Transit');
  const activeTruckSummary = inTransitTrucks.length > 0
    ? `${inTransitTrucks.length} In-Transit (${inTransitTrucks.map((t) => t.id).join(', ')})`
    : '0 In-Transit';

  return (
    <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-40 shadow-soft w-full overflow-hidden">
      <div className="max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
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
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 shrink-0"
                  title="Running in local writable sandbox mode. Zero cloud mutations."
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="hidden sm:inline">Local sandbox</span>
                  <span className="sm:hidden">Sandbox</span>
                </span>
              ) : (
                <span
                  data-testid="env-badge"
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0"
                  title={`Connected to Supabase (${orgName})`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden sm:inline">Cloud · {orgName}</span>
                  <span className="sm:hidden">Cloud</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B] hidden sm:block font-medium">
              Predictive. Proactive. Explainable. Resilient. Sustainable.
            </p>
          </div>
        </div>

        {/* Corridor Telemetry Pill */}
        <div className="hidden xl:flex items-center gap-2.5 px-3.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full text-xs">
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[#64748B] font-medium">Corridor:</span>
          <span className="text-[#0F172A] font-semibold">Nashik ↔ Mumbai MMR</span>
          <span className="text-[#CBD5E1]">|</span>
          <span className="text-[#64748B]">Active Trucks:</span>
          <span className="text-blue-600 font-bold">{activeTruckSummary}</span>
        </div>

        {/* Controls & Role Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            onClick={() => setIsShareOpen(true)}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 min-h-[44px] text-xs font-semibold text-slate-700 hover:text-[#0F172A] bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors shadow-xs"
            title="Open live system on your phone via QR code"
          >
            <QrCode className="w-4 h-4 text-slate-700" />
            <span className="hidden sm:inline">Phone QR</span>
          </button>

          <button
            onClick={onOpenDemoGuide}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 min-h-[44px] text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors shadow-sm"
            title="Open 2-minute live demo instructions"
          >
            <CircleHelp className="w-4 h-4 text-blue-600" />
            <span className="hidden md:inline">2-Min Demo Script</span>
          </button>

          {!isJudgeMode && (
            <button
              onClick={onResetAll}
              className="hidden sm:inline-flex items-center justify-center gap-1 px-2.5 py-1.5 min-h-[44px] text-xs font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl transition-colors"
              title="Reset simulation to initial state"
            >
              <span>Reset Demo</span>
            </button>
          )}

          <div className="pl-1 border-l border-[#E2E8F0]">
            <RoleSwitcher />
          </div>
        </div>
      </div>

      <ShareJudgeModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
    </header>
  );
}
