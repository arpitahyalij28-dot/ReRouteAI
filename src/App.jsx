// ReRoute AI 2.0 - Core Application Hub
// Multi-page routing with data-driven state provider and 100% demo continuity.

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Navbar from './components/Navbar';
import DemoGuideModal from './components/DemoGuideModal';
import { ReRouteProvider, useReRoute } from './context/ReRouteContext';

// Pages
import Dashboard from './pages/Dashboard';
import Fleet from './pages/Fleet';
import Loads from './pages/Loads';
import Assignments from './pages/Assignments';
import Disruptions from './pages/Disruptions';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import DataManagement from './pages/DataManagement';
import DriverPortal from './pages/DriverPortal';
import Login from './pages/Login';
import { AuthProvider } from './context/AuthContext';

function AppContent() {
  const { resetDemo, isDemoMode, toasts, dismissToast } = useReRoute();
  const [isDemoGuideOpen, setIsDemoGuideOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-[#0F172A] selection:bg-blue-100 selection:text-blue-900 relative">
      {/* Realtime Toast Notifications */}
      {toasts && toasts.length > 0 && (
        <div className="fixed top-20 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`p-3.5 rounded-xl border shadow-lg text-xs font-semibold flex items-center justify-between gap-3 pointer-events-auto animate-in slide-in-from-top-2 duration-200 ${
                t.type === 'alert'
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : t.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-blue-50 border-blue-300 text-blue-900'
              }`}
            >
              <span>{t.message}</span>
              <button
                onClick={() => dismissToast(t.id)}
                className="text-slate-400 hover:text-slate-700 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 1. Header Telemetry & Status Bar */}
      <Header
        onOpenDemoGuide={() => setIsDemoGuideOpen(true)}
        onResetAll={resetDemo}
      />

      {/* 2. Top Navigation Tabs */}
      <Navbar />

      {/* 3. Main Multi-Page Body */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fleet" element={<Fleet />} />
          <Route path="/loads" element={<Loads />} />
          <Route path="/driver" element={<DriverPortal />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/disruptions" element={<Disruptions />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/data" element={<DataManagement />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* 4. Certified Footer */}
      <footer className="bg-white border-t border-[#E2E8F0] mt-auto py-5 px-4 sm:px-6">
        <div className="max-w-[1680px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
              R
            </div>
            <span className="font-semibold text-[#0F172A]">
              ReRoute AI 2.0 • Predictive Backhaul Intelligence Platform
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
              {isDemoMode ? 'Offline Demo Mode' : 'Cloud Sync Active'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Algorithms: Weighted Multi-Criteria Scoring • Hungarian Combinatorial Assignment</span>
            <span>•</span>
            <span className="text-[#059669] font-semibold">GHG Protocol Scope 1 Compliant</span>
          </div>
        </div>
      </footer>

      {/* 5. Demo Flow Guide Modal */}
      <DemoGuideModal
        isOpen={isDemoGuideOpen}
        onClose={() => setIsDemoGuideOpen(false)}
        onJumpStep={() => {}}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ReRouteProvider>
          <AppContent />
        </ReRouteProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
