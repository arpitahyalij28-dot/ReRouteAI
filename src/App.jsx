// ReRoute AI 2.0 - Core Application Hub
// Multi-page routing with data-driven state provider and 100% demo continuity.
// Integrates 7-stage guided tour autoplay with narrative controls for evaluators and judges.

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Navbar from './components/Navbar';
import DemoGuideModal from './components/DemoGuideModal';
import GuidedTourBar from './components/GuidedTourBar';
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
  const navigate = useNavigate();
  const {
    resetDemo,
    isDemoMode,
    toasts,
    dismissToast,
    setSelectedTruckId,
    setSelectedShipmentId,
    cancelShipment,
  } = useReRoute();

  const [isDemoGuideOpen, setIsDemoGuideOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourStageIndex, setTourStageIndex] = useState(0);
  const [isTourPlaying, setIsTourPlaying] = useState(true);
  const [tourProgress, setTourProgress] = useState(0);

  // 7 High-Impact Presentation Stages for Judges
  const TOUR_STAGES = [
    {
      stage: 1,
      title: 'Predict: Telemetry Early Warning Radar',
      caption: 'Stage 1 of 7 — Vehicle telemetry radar monitors 6 corridor trucks. Empty-return risk computed 2+ hours before arrival.',
      action: async () => {
        await resetDemo();
        setSelectedTruckId('T101');
        navigate('/');
      },
    },
    {
      stage: 2,
      title: 'Warn: Early Backhaul Window Countdown',
      caption: 'Stage 2 of 7 — 14:15 delivery at Bhiwandi triggers proactive backhaul matching window while truck is still in transit.',
      action: async () => {
        setSelectedTruckId('T101');
        navigate('/');
      },
    },
    {
      stage: 3,
      title: 'Match: 15 Candidate Consignments Evaluated',
      caption: 'Stage 3 of 7 — 15 candidate loads scanned along NH 160. Multi-criteria engine evaluates capacity, time windows, and detour.',
      action: async () => {
        setSelectedTruckId('T101');
        setSelectedShipmentId('S1');
        navigate('/');
      },
    },
    {
      stage: 4,
      title: 'Optimize: Kuhn-Munkres Fleet Assignment',
      caption: 'Stage 4 of 7 — Hungarian combinatorial solver matches fleet loads globally, eliminating 159 empty km.',
      action: async () => {
        navigate('/fleet');
      },
    },
    {
      stage: 5,
      title: 'Explain: Transparent Why / Why Not Math',
      caption: 'Stage 5 of 7 — Transparent operational factor breakdown shows why S1 beat S2 (94% vs 86%) with verifiable formulas.',
      action: async () => {
        navigate('/');
        setSelectedShipmentId('S1');
      },
    },
    {
      stage: 6,
      title: 'Recover: Disruption Re-Routing in <400ms',
      caption: 'Stage 6 of 7 — Disruption injected! Top tender S1 cancelled by shipper. Engine reroutes in <400ms, promoting S2.',
      action: async () => {
        navigate('/');
        try {
          await cancelShipment('S1', 'Cancelled by shipper tender revocation.');
          setSelectedShipmentId('S2');
        } catch (e) {
          console.warn('Tour cancel action:', e);
        }
      },
    },
    {
      stage: 7,
      title: 'Measure: Scope 1 ESG & Net Rupees Saved',
      caption: 'Stage 7 of 7 — ₹3,776 cost gain, 106.5 kg CO₂ saved per trip. Before vs After operational savings verified.',
      action: async () => {
        navigate('/');
      },
    },
  ];

  // Manual jump-to-step handler for DemoGuideModal
  const handleJumpStep = async (stepNum) => {
    switch (stepNum) {
      case 1:
        await resetDemo();
        setSelectedTruckId('T101');
        navigate('/');
        break;
      case 2:
        setSelectedTruckId('T101');
        setSelectedShipmentId('S1');
        navigate('/');
        break;
      case 3:
        setSelectedShipmentId('S2');
        navigate('/');
        break;
      case 4:
        navigate('/analytics');
        break;
      case 5:
        navigate('/');
        try {
          await cancelShipment('S1', 'Cancelled by shipper tender revocation.');
          setSelectedShipmentId('S2');
        } catch (e) {
          console.warn('Jump step cancel:', e);
        }
        break;
      case 6:
        await resetDemo();
        navigate('/');
        break;
      default:
        break;
    }
  };

  const handleStartGuidedDemo = () => {
    setIsTourActive(true);
    setTourStageIndex(0);
    setIsTourPlaying(true);
    setTourProgress(0);
  };

  // Run stage action when index updates
  useEffect(() => {
    if (!isTourActive) return;
    const stage = TOUR_STAGES[tourStageIndex];
    if (stage?.action) {
      stage.action();
    }
    setTourProgress(0);
  }, [isTourActive, tourStageIndex]);

  // Autoplay progression timer (~12.5 seconds per stage = ~87.5s total autoplay)
  useEffect(() => {
    if (!isTourActive || !isTourPlaying) return;

    const interval = setInterval(() => {
      setTourProgress((prev) => {
        if (prev >= 100) {
          setTourStageIndex((curr) => {
            if (curr >= TOUR_STAGES.length - 1) {
              setIsTourActive(false);
              return 0;
            }
            return curr + 1;
          });
          return 0;
        }
        return prev + 0.8;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isTourActive, isTourPlaying]);

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
              {isDemoMode ? 'Local sandbox' : 'Cloud Sync Active'}
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
        onJumpStep={handleJumpStep}
        onStartGuidedDemo={handleStartGuidedDemo}
      />

      {/* 6. Guided Tour Floating Presentation Bar */}
      {isTourActive && (
        <GuidedTourBar
          currentStageIndex={tourStageIndex}
          isPlaying={isTourPlaying}
          progress={tourProgress}
          stages={TOUR_STAGES}
          onPlayPause={() => setIsTourPlaying(!isTourPlaying)}
          onNext={() => {
            setTourStageIndex((curr) => Math.min(curr + 1, TOUR_STAGES.length - 1));
            setTourProgress(0);
          }}
          onPrev={() => {
            setTourStageIndex((curr) => Math.max(curr - 1, 0));
            setTourProgress(0);
          }}
          onExit={() => setIsTourActive(false)}
        />
      )}
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
