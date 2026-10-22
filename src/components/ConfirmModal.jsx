// ReRoute AI 2.0 - Confirmation & Demo Option Modals
// Handles "Clear All Data" safety verification and "Replace vs Merge" demo data choices.

import React from 'react';
import { AlertTriangle, Sparkles, Trash2, X, RefreshCw } from 'lucide-react';

export function ClearDataConfirmModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full border border-rose-200 shadow-soft-lg overflow-hidden p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">Clear All Data?</h3>
            <p className="text-xs text-[#64748B] mt-1">
              This will remove all fleet vehicles, demand loads, and assignments from your browser storage and return the app to a clean empty state.
            </p>
          </div>
        </div>

        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>You can always load the official seed demo dataset anytime using the "Load Demo Data" button.</span>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Yes, Clear Everything</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function DemoPromptModal({ isOpen, onClose, onReplace, onMerge }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full border border-[#E2E8F0] shadow-soft-lg overflow-hidden p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">Load Demo Dataset</h3>
            <p className="text-xs text-[#64748B] mt-1">
              You already have active data in your workspace. How would you like to load the demo records (T101 & S1-S3)?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 pt-1">
          <button
            onClick={() => {
              onReplace();
              onClose();
            }}
            className="p-3 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <strong className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 group-hover:rotate-180 transition-transform duration-500" />
                Replace Existing Data
              </strong>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                Recommended
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Resets workspace to the clean Nashik-Mumbai corridor demo with T101 and S1-S3.
            </p>
          </button>

          <button
            onClick={() => {
              onMerge();
              onClose();
            }}
            className="p-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 hover:border-slate-300 text-left transition-all cursor-pointer"
          >
            <strong className="text-xs font-bold text-[#0F172A] block mb-1">
              Merge with Existing Data
            </strong>
            <p className="text-[11px] text-[#64748B]">
              Keeps your current trucks and consignments, adding any missing demo items alongside them.
            </p>
          </button>
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
