// ReRoute AI 2.0 - Login & Role Portal
// Supports password authentication with demo-role credentials + magic link fallback + offline Demo Mode.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Mail, Lock, ArrowRight, ShieldCheck, Sparkles, CheckCircle2, User, KeyRound } from 'lucide-react';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabaseClient';

export default function Login() {
  const { loginWithPassword, loginWithMagicLink, continueInDemoMode } = useAuth();
  const navigate = useNavigate();

  const [authMethod, setAuthMethod] = useState('password'); // 'password' | 'magic-link'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleFillCredentials = (roleKey) => {
    const creds = DEMO_CREDENTIALS[roleKey];
    if (creds) {
      setEmail(creds.email);
      setPassword(creds.password);
      setAuthMethod('password');
      setErrorMessage(null);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await loginWithPassword(email, password);
      const userRole = res?.user?.user_metadata?.role || 'dispatcher';
      if (userRole === 'shipper') navigate('/loads');
      else if (userRole === 'driver') navigate('/driver');
      else navigate('/');
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLinkSubmit = async (e) => {
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
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-[#E2E8F0] shadow-xl space-y-6">
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

        {/* Demo Mode Button (Primary evaluator bypass) */}
        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-900">Zero-Config Local Sandbox</span>
          </div>
          <p className="text-[11px] text-[#64748B] leading-relaxed">
            Experience the complete 7-stage backhaul matching pipeline with realistic Mumbai-Nashik corridor data. No cloud keys required.
          </p>
          <button
            onClick={handleDemoAccess}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Launch Local Demo Sandbox</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-[#E2E8F0] w-full" />
          <span className="bg-white px-3 text-[10px] text-[#64748B] font-bold uppercase tracking-wider absolute">
            Cloud Authentication
          </span>
        </div>

        {/* Quick Demo Credential Fill Buttons */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase text-[#64748B] tracking-wide block text-center">
            Fill Demo Credentials (Instant Judge Access):
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              data-testid="fill-dispatcher"
              onClick={() => handleFillCredentials('dispatcher')}
              className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-[11px] font-bold text-blue-800 transition-colors cursor-pointer"
            >
              👔 Dispatcher
            </button>
            <button
              type="button"
              data-testid="fill-shipper"
              onClick={() => handleFillCredentials('shipper')}
              className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-bold text-emerald-800 transition-colors cursor-pointer"
            >
              📦 Shipper
            </button>
            <button
              type="button"
              data-testid="fill-driver"
              onClick={() => handleFillCredentials('driver')}
              className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-[11px] font-bold text-amber-800 transition-colors cursor-pointer"
            >
              🚚 Driver
            </button>
          </div>
        </div>

        {/* Auth Method Switcher */}
        <div className="flex border border-[#E2E8F0] rounded-xl p-1 bg-slate-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setAuthMethod('password')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              authMethod === 'password'
                ? 'bg-white shadow-xs text-blue-600 font-bold'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Email & Password
          </button>
          <button
            type="button"
            onClick={() => setAuthMethod('magic-link')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              authMethod === 'magic-link'
                ? 'bg-white shadow-xs text-blue-600 font-bold'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Magic Link
          </button>
        </div>

        {/* Password Login Form */}
        {authMethod === 'password' ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Account Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="dispatcher@demo.reroute"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2E8F0] text-xs outline-none focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2E8F0] text-xs outline-none focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            {errorMessage && (
              <p className="text-[11px] text-rose-600 font-medium bg-rose-50 border border-rose-200 p-2 rounded-lg">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#0F172A] hover:bg-slate-800 text-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <KeyRound className="w-3.5 h-3.5 text-blue-400" />
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In with Password'}</span>
            </button>
          </form>
        ) : isSent ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs space-y-1.5 text-center animate-in fade-in">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
            <strong className="block text-sm">Magic Link Dispatched</strong>
            <p className="text-[11px]">
              We emailed a secure sign-in link to <strong>{email}</strong>. Check your inbox to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleMagicLinkSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="dispatcher@demo.reroute"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2E8F0] text-xs outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {errorMessage && (
              <p className="text-[11px] text-rose-600 font-medium bg-rose-50 border border-rose-200 p-2 rounded-lg">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 rounded-xl text-xs font-bold bg-[#0F172A] hover:bg-slate-800 text-white transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
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
