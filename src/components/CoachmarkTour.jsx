// ReRoute AI 2.0 - First-Visit 4-Step Coach-mark Tour Component
// Dismissible, remembers completion in localStorage, guides new evaluators on key features.

import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, Check, X, ShieldAlert, Compass } from 'lucide-react';

const TOUR_STEPS = [
  {
    step: 1,
    title: 'Autonomous Inbound Radar',
    description: 'Monitors inbound heavy trucks in real time. Predicts transit disruption risk 2+ hours before destination arrival.',
    targetHighlight: 'Corridor Radar',
  },
  {
    step: 2,
    title: 'Explainable Multi-Factor Scoring',
    description: 'Every consignment is scored across Route (25%), Detour (15%), Time (20%), Payload (20%), and Net Yield (20%).',
    targetHighlight: 'Decision Matrix',
  },
  {
    step: 3,
    title: 'Resilient Disruption Recovery',
    description: 'Simulate live cancellations, delay bottlenecks, or shipper dock shifts. Solver recalculates alternative re-route options in <400ms.',
    targetHighlight: 'Disruption Simulator',
  },
  {
    step: 4,
    title: '90-Second Guided Tour',
    description: 'Click "2-Min Demo Script" or "Run Guided Demo" at any time for a narrated walkthrough designed for hackathon judges.',
    targetHighlight: 'Judge Autoplay',
  },
];

export default function CoachmarkTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    try {
      const completed = localStorage.getItem('reroute_coachmark_done');
      if (!completed) {
        setIsOpen(true);
      }
    } catch {
      // Safe fallback if localStorage is disabled
    }
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
    try {
      localStorage.setItem('reroute_coachmark_done', 'true');
    } catch {
      // ignore
    }
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-end sm:items-center justify-center p-4 bg-slate-900/30 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-blue-200 max-w-md w-full p-5 space-y-4 relative ring-4 ring-blue-500/10">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Dismiss Tour"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
            {step.step}/4
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 block">
              Quick Orientation • {step.targetHighlight}
            </span>
            <h3 className="text-base font-bold text-[#0F172A]">{step.title}</h3>
          </div>
        </div>

        {/* Step Body */}
        <p className="text-xs text-[#64748B] leading-relaxed">
          {step.description}
        </p>

        {/* Step Progress Dots & Navigation */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStep ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-200'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <span>{currentStep === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
