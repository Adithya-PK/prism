import React from 'react';
import { DollarSign, Scale, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { EconomicsResult } from '../types';

interface EconomicsPanelProps {
  economics?: EconomicsResult;
}

export const EconomicsPanel: React.FC<EconomicsPanelProps> = ({ economics }) => {
  if (!economics) return null;

  const isViable = economics.economic_decision === 'RESCUE';

  return (
    <div className="card-prism">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-prism-purple-bright" />
          <h3 className="text-sm font-semibold text-white">ECONOMIC VIABILITY & LOSS AVOIDANCE</h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-secondary text-purple-300 border border-border">
          Cost-Benefit Gate
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 font-mono">
        {/* Total Rescue Cost */}
        <div className="card-prism-secondary">
          <span className="text-[10px] text-slate-400 block mb-0.5 font-semibold">TOTAL RESCUE COST</span>
          <span className="text-xl font-bold text-amber-300">
            ${economics.total_rescue_cost_usd.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Gas + Slippage + Swap Fees</span>
        </div>

        {/* Potential Liquidation Loss */}
        <div className="card-prism-secondary">
          <span className="text-[10px] text-slate-400 block mb-0.5 font-semibold">EST. LIQUIDATION LOSS</span>
          <span className="text-xl font-bold text-red-400">
            ${economics.estimated_liquidation_loss_usd.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Penalty if liquidated on-chain</span>
        </div>

        {/* Potential Loss Avoided / Net Benefit */}
        <div className={`card-prism-secondary border ${isViable ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30'}`}>
          <span className="text-[10px] text-emerald-400 block mb-0.5 font-semibold">NET VALUE PRESERVED</span>
          <span className="text-xl font-bold text-emerald-400">
            ${economics.potential_loss_avoided_usd.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Net capital saved by PRISM</span>
        </div>
      </div>

      {/* Decision Summary */}
      <div className={`p-3 rounded-lg border text-xs font-mono ${
        isViable
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
      }`}>
        <div className="font-semibold mb-1 flex items-center gap-1.5">
          {isViable ? <ShieldCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          ECONOMIC DECISION: {economics.economic_decision}
        </div>
        <p className="text-slate-200 text-[11px] leading-relaxed">
          {economics.decision_reason}
        </p>
      </div>
    </div>
  );
};
