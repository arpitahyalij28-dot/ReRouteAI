// ReRoute AI 2.0 - Share & Judge Mode Modal
// Renders live phone QR code and toggleable read-only Judge Mode.

import React from 'react';
import { QrCode, X, Smartphone, ShieldCheck, Check, Copy } from 'lucide-react';
import { useReRoute } from '../context/ReRouteContext';

export default function ShareJudgeModal({ isOpen, onClose }) {
  const { isJudgeMode, setIsJudgeMode, showToast } = useReRoute();
  const liveUrl = 'https://reroute-fleet.vercel.app/';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(liveUrl)}`;

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText?.(liveUrl);
    if (showToast) showToast('Live URL copied to clipboard!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] max-w-sm w-full p-6 space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-2">
            <Smartphone className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A]">Open on Your Phone</h3>
          <p className="text-xs text-[#64748B]">
            Scan to test the responsive Driver Portal & Cockpit live on mobile
          </p>
        </div>

        {/* QR Code Container */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
          <img
            src={qrUrl}
            alt="ReRoute AI Live Deployment QR Code"
            className="w-44 h-44 rounded-lg shadow-xs bg-white p-2"
          />
          <button
            onClick={handleCopyLink}
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Live URL</span>
          </button>
        </div>

        {/* Judge Mode Toggle */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#0F172A] block">Judge Presentation Mode</span>
              <span className="text-[10px] text-[#64748B]">Hides Settings, Data Gateway & Reset</span>
            </div>
          </div>
          <button
            onClick={() => setIsJudgeMode(!isJudgeMode)}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
              isJudgeMode ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                isJudgeMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
