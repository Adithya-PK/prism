import React from 'react';
import { Target, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { InterventionPlan } from '../types';

interface InterventionPanelProps {
  intervention?: InterventionPlan;
}

export const InterventionPanel: React.FC<InterventionPanelProps> = ({ intervention }) => {
  if (!intervention) return null;

  return (
    <div className="card-prism">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-prism-purple-bright" />
          <h3 className="text-sm font-semibold text-white">MINIMUM EFFECTIVE INTERVENTION</h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-secondary text-emerald-300 border border-border">
          Capital Minimizer Engine
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 font-mono">
        <div className="card-prism-secondary border-purple-500/30 bg-purple-500/5">
          <span className="text-[10px] text-purple-300 block mb-0.5 font-semibold">MINIMUM CAPITAL REQUIRED</span>
          <span className="text-xl font-bold text-white">
            ${intervention.minimum_intervention_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Exact amount to reach target HF</span>
        </div>

        <div className="card-prism-secondary">
          <span className="text-[10px] text-slate-400 block mb-0.5 font-semibold">OPTIMAL RESCUE ASSET</span>
          <span className="text-xl font-bold text-purple-300">
            {intervention.selected_amount.toFixed(4)} {intervention.selected_asset}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Scored by liquidity & slippage</span>
        </div>

        <div className="card-prism-secondary">
          <span className="text-[10px] text-slate-400 block mb-0.5 font-semibold">PROJECTED POST-RESCUE HF</span>
          <span className="text-xl font-bold text-emerald-400">
            {intervention.estimated_post_health_factor.toFixed(3)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Target: {intervention.target_health_factor.toFixed(2)}</span>
        </div>
      </div>

      {/* Whole-Wallet Collateral Candidate Optimization Table */}
      {intervention.collateral_candidates.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/80">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="font-semibold">WHOLE-WALLET COLLATERAL OPTIMIZATION SCORING:</span>
            <span className="text-[10px] text-purple-300">Deterministic Multi-Factor Scoring</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-400 border-b border-border/60 text-[11px]">
                  <th className="pb-1.5 font-medium">Candidate Asset</th>
                  <th className="pb-1.5 font-medium text-right">Balance Value</th>
                  <th className="pb-1.5 font-medium text-right">Liquidity</th>
                  <th className="pb-1.5 font-medium text-right">Est. Slippage</th>
                  <th className="pb-1.5 font-medium text-right">Score</th>
                  <th className="pb-1.5 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {intervention.collateral_candidates.map((cand, i) => (
                  <tr
                    key={i}
                    className={`transition-colors ${
                      cand.selected ? 'bg-purple-500/10 text-white font-medium' : 'text-slate-300 hover:bg-surface-secondary/40'
                    }`}
                  >
                    <td className="py-2 flex items-center gap-1.5">
                      {cand.selected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>{cand.symbol}</span>
                    </td>
                    <td className="py-2 text-right">${cand.value_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2 text-right">{(cand.liquidity_score * 100).toFixed(0)}%</td>
                    <td className="py-2 text-right">{(cand.estimated_slippage * 100).toFixed(1)}%</td>
                    <td className="py-2 text-right font-bold text-purple-300">{cand.execution_score.toFixed(1)}</td>
                    <td className="py-2 text-right">
                      {cand.selected ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-500/30">
                          PRISM SELECTED
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Alternative</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
