import React from 'react';
import {
  Zap,
  RotateCcw,
  CircleAlert,
  Clock,
  CalendarClock,
  LoaderCircle,
  CircleCheck,
} from 'lucide-react';

export default function DisruptionSimulator({
  onCancelS1,
  onDelayS1,
  onChangeWindowS1,
  onReset,
  isS1Cancelled,
  isS1Delayed,
  isWindowShifted,
  isRecalculating,
  recoveryBanner,
}) {
  const hasActiveDisruption = isS1Cancelled || isS1Delayed || isWindowShifted;

  return (
    <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft p-4 space-y-3">
      {/* Title & Reset */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
            <Zap className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              Dynamic Disruption Simulator
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Inject live field disruption to test self-healing autonomous recovery
            </p>
          </div>
        </div>

        {hasActiveDisruption && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 text-[#64748B] hover:text-[#0F172A] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
        )}
      </div>

      {/* 4 Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Cancel S1 */}
        <button
          onClick={onCancelS1}
          disabled={isRecalculating}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
            isS1Cancelled
              ? 'bg-rose-100 text-rose-800 border border-rose-300 ring-2 ring-rose-400/20'
              : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300'
          }`}
        >
          <CircleAlert className="w-3.5 h-3.5 text-rose-600" />
          <span>{isS1Cancelled ? 'S1 Cancelled (Active)' : 'Cancel S1 Load'}</span>
        </button>

        {/* Delay S1 */}
        <button
          onClick={onDelayS1}
          disabled={isRecalculating}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
            isS1Delayed
              ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white hover:bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>{isS1Delayed ? 'S1 Delayed (+60m)' : 'Delay S1 (+60m)'}</span>
        </button>

        {/* Shift Window */}
        <button
          onClick={onChangeWindowS1}
          disabled={isRecalculating}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
            isWindowShifted
              ? 'bg-blue-100 text-blue-900 border border-blue-300 ring-2 ring-blue-400/20'
              : 'bg-white hover:bg-slate-50 text-[#0F172A] border border-[#E2E8F0]'
          }`}
        >
          <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
          <span>{isWindowShifted ? 'Window Shifted' : 'Shift Window'}</span>
        </button>

        {/* Restore Baseline */}
        <button
          onClick={onReset}
          disabled={isRecalculating}
          className="px-3 py-2 rounded-xl text-xs font-bold transition-all bg-slate-100 hover:bg-slate-200 text-[#0F172A] border border-[#E2E8F0] flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#64748B]" />
          <span>Restore Baseline</span>
        </button>
      </div>

      {/* Loader during recalculation */}
      {isRecalculating && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 animate-in fade-in">
          <LoaderCircle className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-blue-900 block">
              Autonomous Solver Recalculating Corridors...
            </span>
            <span className="text-blue-700">
              Re-evaluating time-space feasibility across S2, S3, S4 in 420ms
            </span>
          </div>
        </div>
      )}

      {/* Autonomous Recovery Success Banner */}
      {!isRecalculating && recoveryBanner && (
        <div className="p-3 bg-emerald-50 border border-[#059669]/30 rounded-xl flex items-start gap-2.5 text-xs animate-in slide-in-from-top-2 duration-300">
          <span className="p-1 rounded-md bg-[#059669] text-white shrink-0 mt-0.5">
            <CircleCheck className="w-4 h-4" />
          </span>
          <div className="flex-1">
            <div className="font-bold text-[#059669] flex items-center gap-2">
              <span>Autonomous Disruption Recovery Completed</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-white/70 rounded text-[#059669] border border-[#059669]/20 font-mono">
                Latency: 380ms
              </span>
            </div>
            <p className="text-emerald-950 font-medium mt-0.5 leading-snug">{recoveryBanner}</p>
          </div>
        </div>
      )}
    </div>
  );
}
