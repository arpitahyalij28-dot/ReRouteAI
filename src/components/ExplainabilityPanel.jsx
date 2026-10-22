import React, { useState } from 'react';
import {
  Cpu,
  GitCompare,
  CircleCheck,
  CircleX,
  TriangleAlert,
  Info,
} from 'lucide-react';

export default function ExplainabilityPanel({
  shipment,
  score,
  allShipments,
  onSelectShipmentId,
  isRecommended,
}) {
  const [activeTab, setActiveTab] = useState('whywhynot');
  const [showHeadToHead, setShowHeadToHead] = useState(false);

  const s1 = allShipments.find((s) => s.id === 'S1');
  const s2 = allShipments.find((s) => s.id === 'S2');
  const factorKeys = ['route', 'time', 'capacity', 'detour', 'cost', 'risk'];

  return (
    <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-soft p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2.5 pb-3 border-b border-[#E2E8F0]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                Explainable Decision Engine
              </span>
              <h3 className="text-sm font-bold text-[#0F172A] leading-none">
                Evaluation: {shipment.id} — {shipment.origin.split(' ')[0]} to{' '}
                {shipment.destination.split(' ')[0]}
              </h3>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[#64748B] block">Computed Score</span>
            <span className="text-lg font-black text-[#2563EB]">{score.totalScore}%</span>
          </div>
        </div>

        {/* Inspect Tabs & Head-to-Head Button */}
        <div className="flex items-center gap-1.5 pt-1">
          <span className="text-[11px] text-[#64748B] font-medium mr-1">Inspect:</span>
          {allShipments.map((s) => {
            const isCurrent = s.id === shipment.id;
            const isCancelled = s.isCancelled;
            return (
              <button
                key={s.id}
                onClick={() => onSelectShipmentId(s.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : isCancelled
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    : 'bg-slate-100 text-[#0F172A] hover:bg-slate-200'
                }`}
              >
                {s.id} {isCancelled && '✕'}
              </button>
            );
          })}

          <button
            onClick={() => setShowHeadToHead(!showHeadToHead)}
            className={`ml-auto text-[11px] font-semibold px-2 py-1 rounded border transition-colors flex items-center gap-1 ${
              showHeadToHead
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <GitCompare className="w-3 h-3" />
            <span>S1 vs S2 Head-to-Head</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 text-xs">
        <button
          onClick={() => setActiveTab('whywhynot')}
          className={`pb-1 font-bold transition-colors relative ${
            activeTab === 'whywhynot'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Why / Why Not? Checklist
        </button>
        <button
          onClick={() => setActiveTab('breakdown')}
          className={`pb-1 font-bold transition-colors relative ${
            activeTab === 'breakdown'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Weighted Factor Breakdown (Formula)
        </button>
      </div>

      {/* Head to Head Comparison Modal/Panel */}
      {showHeadToHead && s1 && s2 && (
        <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2.5 text-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between font-bold text-[#0F172A]">
            <span className="flex items-center gap-1.5 text-blue-700">
              <GitCompare className="w-3.5 h-3.5" />
              Direct Contrast: S1 (Primary) vs S2 (Fallback)
            </span>
            <button
              onClick={() => setShowHeadToHead(false)}
              className="text-[#64748B] hover:text-[#0F172A] text-xs font-semibold"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 bg-white rounded-lg border border-blue-200">
              <div className="font-bold text-blue-700 mb-1 flex items-center justify-between">
                <span>S1: Mumbai Hub (94%)</span>
                <span className="text-[#22C55E]">✓ On-Time</span>
              </div>
              <ul className="space-y-1 text-slate-700">
                <li className="text-[#22C55E]">✓ 6 km detour only</li>
                <li className="text-[#22C55E]">✓ +15m window buffer</li>
                <li className="text-[#22C55E]">✓ Low corridor risk</li>
              </ul>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-amber-200">
              <div className="font-bold text-amber-800 mb-1 flex items-center justify-between">
                <span>S2: Thane Yard (86%)</span>
                <span className="text-[#EF4444]">✗ 38m Mismatch</span>
              </div>
              <ul className="space-y-1 text-slate-700">
                <li className="text-[#EF4444]">✗ 34 km detour penalty</li>
                <li className="text-[#EF4444]">✗ Arrives 38m after cutoff</li>
                <li className="text-amber-600">⚠ Ghodbunder toll risk</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Why / Why Not? Checklist */}
      {activeTab === 'whywhynot' && (
        <div className="space-y-3">
          <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
            <span className="font-semibold text-[#0F172A] block mb-0.5">
              {isRecommended ? 'Why Selected as Top Match:' : 'Why Ranked Behind Alternative Loads:'}
            </span>
            <p className="text-[#64748B] leading-relaxed">{shipment.whyWhyNot.recommendedSummary}</p>
          </div>

          <div className="space-y-2">
            {shipment.whyWhyNot.reasons.map((r, idx) => {
              let Icon = CircleCheck;
              let styleClass = 'text-[#22C55E] bg-emerald-50 border-emerald-200';
              if (r.type === 'cross') {
                Icon = CircleX;
                styleClass = 'text-[#EF4444] bg-rose-50 border-rose-200';
              } else if (r.type === 'warning') {
                Icon = TriangleAlert;
                styleClass = 'text-[#F59E0B] bg-amber-50 border-amber-200';
              }

              return (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 transition-colors"
                >
                  <span className={`p-1 rounded-md border shrink-0 mt-0.5 ${styleClass}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="text-xs">
                    <div className="font-semibold text-[#0F172A]">{r.title}</div>
                    <div className="text-[#64748B] mt-0.5 leading-snug">{r.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Weighted Factor Breakdown */}
      {activeTab === 'breakdown' && (
        <div className="space-y-3">
          <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200 text-[11px] text-[#0F172A]">
            <div className="font-bold text-blue-900 mb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              Dynamic Multi-Criteria Weight Equation:
            </div>
            <code className="font-mono text-[10px] text-blue-800 block bg-white/70 p-1 rounded border border-blue-200">
              Score = (Route×25%) + (Time×20%) + (Cap×20%) + (Detour×15%) + (Cost×10%) + (Risk×10%)
            </code>
          </div>

          <div className="space-y-2.5">
            {factorKeys.map((key) => {
              const factor = score.factors[key];
              const raw = factor.rawScore;
              let barColor = 'bg-[#2563EB]';
              if (raw < 70) barColor = 'bg-[#EF4444]';
              else if (raw < 85) barColor = 'bg-[#F59E0B]';

              return (
                <div key={key} className="text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                      {factor.label}
                      <span className="text-[10px] font-normal text-[#64748B]">
                        (Weight: {factor.weightPctLabel})
                      </span>
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-[#0F172A]">{factor.rawScore}/100</span>
                      <span className="text-[10px] text-blue-600 font-semibold ml-1.5">
                        +{factor.weightedScore} pts
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${raw}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-0.5 truncate">{factor.detail}</div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-bold text-[#0F172A]">
            <span>Total Weighted Aggregation:</span>
            <span className="text-sm font-extrabold text-[#2563EB]">
              {score.totalScore}% / 100%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
