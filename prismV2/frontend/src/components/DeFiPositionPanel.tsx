import React from 'react';
import { Layers, AlertCircle, ArrowDown, ArrowUp, Sparkles } from 'lucide-react';
import { DeFiPosition } from '../types';

interface DeFiPositionPanelProps {
  position?: DeFiPosition;
  onLoadDemo: (scenario: string) => void;
  positionSource: string;
}

export const DeFiPositionPanel: React.FC<DeFiPositionPanelProps> = ({
  position,
  onLoadDemo,
  positionSource,
}) => {
  if (!position) {
    return (
      <div className="card-prism">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-prism-purple-bright" />
            <h3 className="text-sm font-semibold text-white">DEFI LENDING POSITION</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Aave V3</span>
        </div>

        <div className="py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-border flex items-center justify-center mx-auto mb-3 text-slate-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-200 mb-1">
            NO SUPPORTED LENDING POSITION DETECTED
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4 font-mono">
            This wallet has no active Aave V3 debt or collateral on Ethereum Mainnet. Load a demo position to test PRISM risk engines.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => onLoadDemo('SUCCESSFUL_RESCUE')}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              LOAD DEMO POSITION (RESCUE)
            </button>
            <button
              onClick={() => onLoadDemo('SAFE_ABORT')}
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-mono font-medium transition-colors"
            >
              LOAD DEMO (SAFE ABORT)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-prism">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-prism-purple-bright" />
          <h3 className="text-sm font-semibold text-white">
            DEFI POSITION — {position.protocol} ({position.chain})
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className={`px-2 py-0.5 rounded border ${
            position.is_live
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            {position.is_live ? 'LIVE ON-CHAIN' : 'DEMO SIMULATION'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Collateral Breakdown */}
        <div className="card-prism-secondary">
          <div className="flex items-center justify-between text-xs font-mono text-emerald-400 font-semibold mb-2">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3.5 h-3.5" />
              DEPOSITED COLLATERAL
            </span>
            <span>${position.total_collateral_value_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="space-y-2">
            {position.collateral_assets.map((ca, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-mono py-1 border-b border-border/40 last:border-0">
                <div>
                  <span className="font-semibold text-white mr-1.5">{ca.symbol}</span>
                  <span className="text-[10px] text-slate-400">
                    {ca.balance < 0.01 ? ca.balance.toFixed(4) : ca.balance.toFixed(2)} units
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">${ca.value_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-[10px] text-slate-400">LT: {(ca.liquidation_threshold * 100).toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Debt Breakdown */}
        <div className="card-prism-secondary">
          <div className="flex items-center justify-between text-xs font-mono text-amber-400 font-semibold mb-2">
            <span className="flex items-center gap-1">
              <ArrowDown className="w-3.5 h-3.5" />
              BORROWED DEBT
            </span>
            <span>${position.total_debt_value_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="space-y-2">
            {position.debt_assets.map((da, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-mono py-1 border-b border-border/40 last:border-0">
                <div>
                  <span className="font-semibold text-white mr-1.5">{da.symbol}</span>
                  <span className="text-[10px] text-slate-400">
                    {da.balance.toLocaleString('en-US', { maximumFractionDigits: 2 })} units
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">${da.value_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Protocol Parameters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/60 text-xs font-mono">
        <div className="bg-surface-secondary/60 p-2 rounded">
          <span className="text-slate-500 block text-[10px]">CURRENT LTV</span>
          <span className="font-bold text-white">{(position.current_ltv * 100).toFixed(2)}%</span>
        </div>
        <div className="bg-surface-secondary/60 p-2 rounded">
          <span className="text-slate-500 block text-[10px]">LIQ THRESHOLD</span>
          <span className="font-bold text-purple-300">{(position.liquidation_threshold * 100).toFixed(2)}%</span>
        </div>
        <div className="bg-surface-secondary/60 p-2 rounded">
          <span className="text-slate-500 block text-[10px]">HEALTH FACTOR</span>
          <span className={`font-bold ${position.health_factor <= 1.15 ? 'text-red-400' : 'text-emerald-400'}`}>
            {position.health_factor.toFixed(3)}
          </span>
        </div>
        <div className="bg-surface-secondary/60 p-2 rounded">
          <span className="text-slate-500 block text-[10px]">LIQ PENALTY</span>
          <span className="font-bold text-amber-300">{(position.liquidation_penalty * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};
