import React from 'react';
import { Eye, TriangleAlert, GitMerge, Cpu, CircleHelp, RefreshCw, Leaf } from 'lucide-react';

export const STAGES = [
  { id: 'predict', label: 'Predict', tagline: 'Early empty probability', icon: Eye },
  { id: 'warn', label: 'Warn', tagline: 'Real-time alert & countdown', icon: TriangleAlert },
  { id: 'match', label: 'Match', tagline: 'Candidate corridor discovery', icon: GitMerge },
  { id: 'optimize', label: 'Optimize', tagline: 'Scored on 6 factors', icon: Cpu },
  { id: 'explain', label: 'Explain', tagline: 'Why this match?', icon: CircleHelp },
  { id: 'recover', label: 'Recover', tagline: 'Autonomous disruption fix', icon: RefreshCw },
  { id: 'measure', label: 'Measure', tagline: 'Carbon & INR sustainability', icon: Leaf },
];

export default function PipelineStages({ currentStage, onSelectStage }) {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="bg-white border-b border-[#E2E8F0] px-3 sm:px-4 py-2 shadow-sm w-full max-w-full overflow-hidden">
      <div className="max-w-[1680px] mx-auto flex items-center justify-between overflow-x-auto no-scrollbar gap-2 pb-0.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] shrink-0 mr-1 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          Pipeline Flow
        </div>

        <div className="flex items-center flex-1 justify-between min-w-[760px] gap-1">
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isCurrent = stage.id === currentStage;
            const isCompleted = idx < currentIndex;
            const isRecover = stage.id === 'recover';
            const isMeasure = stage.id === 'measure';

            let btnClass = 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50';
            if (isCurrent) {
              if (isRecover) {
                btnClass = 'bg-amber-50 text-amber-900 border border-amber-300 ring-2 ring-amber-400/20 shadow-sm';
              } else if (isMeasure) {
                btnClass = 'bg-emerald-50 text-[#059669] border border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm';
              } else {
                btnClass = 'bg-blue-50 text-blue-900 border border-blue-300 ring-2 ring-blue-500/20 shadow-sm';
              }
            } else if (isCompleted) {
              btnClass = 'text-[#0F172A] hover:bg-slate-50';
            }

            let badgeClass = 'bg-slate-100 text-[#64748B] border border-[#E2E8F0]';
            if (isCurrent) {
              if (isRecover) badgeClass = 'bg-amber-600 text-white';
              else if (isMeasure) badgeClass = 'bg-[#059669] text-white';
              else badgeClass = 'bg-blue-600 text-white';
            } else if (isCompleted) {
              badgeClass = 'bg-slate-200 text-slate-700';
            }

            return (
              <React.Fragment key={stage.id}>
                <button
                  onClick={() => onSelectStage(stage.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 min-h-[44px] rounded-xl text-left transition-all shrink-0 group ${btnClass}`}
                  title={`${stage.label}: ${stage.tagline}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${badgeClass}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-semibold ${isCurrent ? 'font-bold' : ''}`}>
                        {idx + 1}. {stage.label}
                      </span>
                      {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />}
                    </div>
                    <div className="text-[10px] text-[#64748B] leading-none hidden xl:block">
                      {stage.tagline}
                    </div>
                  </div>
                </button>

                {idx < STAGES.length - 1 && (
                  <div className="flex items-center text-[#CBD5E1] shrink-0 px-1">
                    <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
