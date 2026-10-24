import React from 'react';
import { Play, X, ArrowRight } from 'lucide-react';

export default function DemoGuideModal({ isOpen, onClose, onJumpStep, onStartGuidedDemo }) {
  if (!isOpen) return null;

  const steps = [
    {
      num: 1,
      title: '1. Early Warning + Countdown',
      desc: 'Observe Truck T101 on left panel with 87% empty return probability. The live countdown ticks down to 14:15 availability before truck even arrives.',
      action: 'Click "Find Backhaul"',
      actionFn: () => {
        onJumpStep(1);
        onClose();
      },
    },
    {
      num: 2,
      title: '2. Intelligent Backhaul Matching',
      desc: 'Shipments rank automatically (S1 at 94%, S2 at 86%, S3 at 78%, S4 at 71%). S1 is highlighted in blue as "Recommended" with low delay risk.',
      action: 'Select S1',
      actionFn: () => {
        onJumpStep(2);
        onClose();
      },
    },
    {
      num: 3,
      title: '3. Explainable Match Score & Why/Why Not?',
      desc: 'Click S1 and S2 to inspect the Explainability panel on the right. Verify the 6 weighted factors (summing to 94%) and the operation checklist.',
      action: 'Compare S1 vs S2',
      actionFn: () => {
        onJumpStep(3);
        onClose();
      },
    },
    {
      num: 4,
      title: '4. Carbon-Aware Sustainability Dashboard',
      desc: 'Review the bottom green KPI cards: 159 empty km avoided, 39.8 L fuel saved, ₹3,776 cost saved, 106.5 kg CO₂ reduced with count-up animations.',
      action: 'Review Metrics',
      actionFn: () => {
        onJumpStep(4);
        onClose();
      },
    },
    {
      num: 5,
      title: '5. Dynamic Re-Matching (Key Demo Moment)',
      desc: 'Click "Cancel S1 Load" in the Disruption Simulator. Watch the 400ms recalculation loader, S1 turn red, and S2 autonomously promoted to top recommendation.',
      action: 'Simulate S1 Disruption',
      actionFn: () => {
        onJumpStep(5);
        onClose();
      },
    },
    {
      num: 6,
      title: '6. Restore & Measure Baseline',
      desc: 'Click "Reset Simulation" to restore initial state or test the +60m delay scenario.',
      action: 'Reset Scenario',
      actionFn: () => {
        onJumpStep(6);
        onClose();
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-[#E2E8F0] shadow-soft-lg overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              <Play className="w-4 h-4 ml-0.5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">2-Minute Live Demo Flow Guide</h3>
              <p className="text-xs text-[#64748B]">
                Follow these 6 stages to showcase Logistics Twin's predictive backhaul capability
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Autoplay Banner */}
        <div className="p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
          <div className="space-y-0.5">
            <span className="text-xs font-black uppercase tracking-wider text-amber-300 block">
              Autonomous Guided Presentation Mode
            </span>
            <p className="text-[11px] text-blue-100 leading-tight">
              Autoplay all 7 pipeline stages with live telemetry and narration in ~90 seconds.
            </p>
          </div>
          <button
            data-testid="run-guided-demo-btn"
            onClick={() => {
              if (onStartGuidedDemo) onStartGuidedDemo();
              onClose();
            }}
            className="px-4 py-2 bg-white hover:bg-blue-50 text-blue-700 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-blue-700" />
            <span>▶ Run Guided Demo</span>
          </button>
        </div>

        {/* Steps List */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-3.5 divide-y divide-slate-100">
          {steps.map((step) => (
            <div key={step.num} className="pt-3.5 first:pt-0 flex items-start gap-3.5 group">
              <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-extrabold text-xs flex items-center justify-center shrink-0 border border-blue-200 mt-0.5">
                {step.num}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#0F172A] group-hover:text-blue-600 transition-colors">
                    {step.title}
                  </h4>
                  <button
                    onClick={step.actionFn}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                  >
                    <span>{step.action}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-[#E2E8F0] flex items-center justify-between">
          <span className="text-xs text-[#64748B]">
            Concept:{' '}
            <strong>Predict → Warn → Match → Optimize → Explain → Recover → Measure</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-sm"
          >
            Ready to Demo
          </button>
        </div>
      </div>
    </div>
  );
}
