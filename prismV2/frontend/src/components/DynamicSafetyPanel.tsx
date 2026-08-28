import React from 'react';
import { Sliders, HelpCircle, Shield, Plus } from 'lucide-react';
import { SafetyBuffer } from '../types';

interface DynamicSafetyPanelProps {
  safety?: SafetyBuffer;
  currentHf: number;
}

export const DynamicSafetyPanel: React.FC<DynamicSafetyPanelProps> = ({
  safety,
  currentHf,
}) => {
  if (!safety) return null;

  return (
    <div className="card-prism">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-prism-purple-bright" />
          <h3 className="text-sm font-semibold text-white">DYNAMIC SAFETY BUFFER ENGINE</h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-secondary text-purple-300 border border-border">
          Adaptive Margin
        </span>
      </div>

      {/* Target vs Liquidation Equation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 font-mono text-center">
        <div className="card-prism-secondary">
          <span className="text-[10px] text-slate-400 block mb-0.5">LIQUIDATION BOUNDARY</span>
          <span className="text-lg font-bold text-red-400">1.000</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Protocol Minimum</span>
        </div>

        <div className="card-prism-secondary relative">
          <span className="text-[10px] text-slate-400 block mb-0.5">DYNAMIC SAFETY BUFFER</span>
          <span className="text-lg font-bold text-amber-400">+{safety.dynamic_safety_buffer.toFixed(3)}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Market Condition Adjusted</span>
        </div>

        <div className="card-prism-secondary border-emerald-500/30 bg-emerald-500/5">
          <span className="text-[10px] text-emerald-400 block mb-0.5 font-semibold">PRISM TARGET HF</span>
          <span className="text-lg font-bold text-emerald-400">{safety.target_health_factor.toFixed(3)}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Safe Operating Threshold</span>
        </div>
      </div>

      {/* Buffer Components Breakdown */}
      <div className="p-3 rounded-lg bg-surface-secondary/50 border border-border/70 mb-3 text-xs font-mono">
        <div className="text-slate-400 text-[11px] font-semibold mb-2">BUFFER CALCULATION BREAKDOWN:</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded bg-surface border border-border/40">
            <span className="text-[10px] text-slate-400 block">Base Buffer</span>
            <span className="font-bold text-slate-200">+{safety.base_buffer.toFixed(2)}</span>
          </div>
          <div className="p-2 rounded bg-surface border border-border/40">
            <span className="text-[10px] text-slate-400 block">Volatility Adj</span>
            <span className="font-bold text-amber-300">+{safety.volatility_adjustment.toFixed(2)}</span>
          </div>
          <div className="p-2 rounded bg-surface border border-border/40">
            <span className="text-[10px] text-slate-400 block">Trend Adj</span>
            <span className="font-bold text-amber-300">
              {safety.trend_adjustment >= 0 ? `+${safety.trend_adjustment.toFixed(2)}` : safety.trend_adjustment.toFixed(2)}
            </span>
          </div>
          <div className="p-2 rounded bg-surface border border-border/40">
            <span className="text-[10px] text-slate-400 block">Liquidity Adj</span>
            <span className="font-bold text-amber-300">+{safety.liquidity_adjustment.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Why Did the Buffer Change? */}
      <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-purple-300 font-semibold mb-1 text-[11px]">
          <HelpCircle className="w-3.5 h-3.5" />
          WHY DID THE SAFETY BUFFER CHANGE?
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          {safety.explanation}
        </p>
      </div>
    </div>
  );
};
