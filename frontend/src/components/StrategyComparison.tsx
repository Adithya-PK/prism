import React from 'react';
import { GitCompare, Check, AlertTriangle, ShieldCheck, Flame } from 'lucide-react';
import { Strategy } from '../types';

interface StrategyComparisonProps {
  strategies: Strategy[];
}

export const StrategyComparison: React.FC<StrategyComparisonProps> = ({ strategies }) => {
  if (strategies.length === 0) return null;

  return (
    <div className="card-prism">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-prism-purple-bright" />
          <h3 className="text-sm font-semibold text-white">RESCUE STRATEGY EVALUATION & COMPARISON</h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-secondary text-slate-400 border border-border">
          Simulated Evaluation
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {strategies.map((strat, idx) => {
          const isSelected = strat.is_selected || strat.status === 'SELECTED';
          const isUnsafe = strat.status === 'UNSAFE';

          return (
            <div
              key={idx}
              className={`rounded-xl p-4 transition-all duration-200 font-mono text-xs relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-b from-purple-950/40 to-surface border-2 border-prism-purple shadow-lg shadow-purple-950/50'
                  : 'bg-surface-secondary/70 border border-border/80 hover:border-border'
              }`}
            >
              {isSelected && (
                <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-prism-purple to-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-md">
                  ★ PRISM SELECTED
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">{strat.name}</span>
                </div>

                <div className="space-y-2 py-2 border-t border-b border-border/50 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[11px]">User Capital:</span>
                    <span className="font-semibold text-white">
                      ${strat.required_capital_usd.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[11px]">Est. Cost:</span>
                    <span className="font-semibold text-amber-300">
                      ${strat.estimated_cost_usd.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[11px]">Est. Slippage:</span>
                    <span>{strat.estimated_slippage_pct.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[11px]">Est. Gas:</span>
                    <span>${strat.estimated_gas_usd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[11px]">Post-HF:</span>
                    <span className={`font-bold ${strat.post_health_factor < 1.15 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {strat.post_health_factor.toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Status:</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    isSelected
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : isUnsafe
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {strat.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
