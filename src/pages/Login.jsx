// ReRoute AI 2.0 - Login & Role Portal
// Supports passwordless Supabase Magic Link authentication + one-click Offline Demo Mode.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Mail, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabaseClient';

export default function Login() {
  const { loginWithMagicLink, continueInDemoMode } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await loginWithMagicLink(email);
      setIsSent(true);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to send magic link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoAccess = () => {
    continueInDemoMode();
    navigate('/');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 border border-[#E2E8F0] shadow-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 mx-auto flex items-center justify-center text-white shadow-md">
            <Truck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
            Sign in to ReRoute AI 2.0
          </h1>
          <p className="text-xs text-[#64748B]">
            Autonomous Predictive Backhaul Intelligence Platform
          </p>
        </div>

        {/* Demo Mode Button (Primary requirement) */}
        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-900">Zero-Config Demo Mode</span>
          </div>
          <p className="text-[11px] text-[#64748B] leading-relaxed">
            Experience the complete 7-stage backhaul matching pipeline with realistic Mumbai-Nashik corridor data.
          </p>
          <button
            onClick={handleDemoAccess}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Continue in Demo Mode</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-[#E2E8F0] w-full" />
          <span className="bg-white px-3 text-[11px] text-[#64748B] font-semibold uppercase absolute">
            Or Cloud Access
          </span>
        </div>

        {/* Magic Link Form */}
        {isSent ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs space-y-1.5 text-center animate-in fade-in">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
            <strong className="block text-sm">Magic Link Dispatched</strong>
            <p className="text-[11px]">
              We emailed a secure sign-in link to <strong>{email}</strong>. Check your inbox to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="dispatcher@logistics.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E2E8F0] text-xs outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {errorMessage && (
              <p className="text-[11px] text-rose-600 font-medium">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Sending Link...' : 'Send Magic Link'}</span>
            </button>
          </form>
        )}

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#64748B]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Role-Based Access Control • Dispatcher • Shipper • Driver</span>
        </div>
      </div>
    </div>
  );
}
