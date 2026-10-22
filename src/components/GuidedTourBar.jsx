// ReRoute AI 2.0 - Guided Demo Autoplay Controller Bar
// High-impact judge-facing presentation toolbar with 7-stage autoplay, controls, and caption narration.

import React from 'react';
import { Play, Pause, SkipForward, SkipBack, X, Sparkles } from 'lucide-react';

export default function GuidedTourBar({
  currentStageIndex = 0,
  isPlaying = true,
  progress = 0,
  stages = [],
  onPlayPause,
  onNext,
  onPrev,
  onExit,
}) {
  const currentStage = stages[currentStageIndex] || stages[0];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-3xl w-[94%] bg-[#0F172A] text-white rounded-2xl shadow-2xl border border-slate-700 p-4 sm:p-5 animate-in slide-in-from-bottom-5 duration-300 backdrop-blur-md">
      {/* Top progress line */}
      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-3">
        <div
          className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        {/* Caption Info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 animate-spin-slow" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
                Stage {currentStageIndex + 1} of {stages.length}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs font-bold text-white truncate">
                {currentStage?.title}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 leading-snug font-medium">
              {currentStage?.caption}
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={onPrev}
            disabled={currentStageIndex === 0}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Previous Stage"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onPlayPause}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            title={isPlaying ? 'Pause Autoplay' : 'Resume Autoplay'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </>
            )}
          </button>

          <button
            onClick={onNext}
            disabled={currentStageIndex === stages.length - 1}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Next Stage"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={onExit}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/70 hover:text-rose-300 text-slate-400 transition-colors ml-1 cursor-pointer"
            title="Exit Guided Tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
