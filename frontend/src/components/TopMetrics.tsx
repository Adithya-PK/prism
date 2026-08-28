import React from 'react';
import { Wallet, ShieldAlert, DollarSign, Activity, Percent } from 'lucide-react';
import { RiskLevel } from '../types';

interface TopMetricsProps {
  portfolioValue?: number;
  collateralValue?: number;
  debtValue?: number;
  healthFactor?: number;
  riskLevel?: RiskLevel;
  riskScore?: number;
  hasPosition?: boolean;
}

export const TopMetrics: React.FC<TopMetricsProps> = ({
  portfolioValue = 0,
  collateralValue = 0,
  debtValue = 0,
  healthFactor = 999,
  riskLevel = 'SAFE',
  riskScore = 0,
  hasPosition = false,
}) => {
  const getRiskColor = (level?: RiskLevel) => {
    switch (level) {
      case 'CRITICAL':
      case 'HIGH':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'MODERATE':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'LOW':
      case 'SAFE':
      default:
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  const getHfColor = (hf: number) => {
    if (hf <= 1.05) return 'text-red-400';
    if (hf <= 1.20) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const safePortfolio = isNaN(portfolioValue) ? 0 : portfolioValue;
  const safeCollateral = isNaN(collateralValue) ? 0 : collateralValue;
  const effectivePortfolio = safePortfolio > 0 ? safePortfolio : safeCollateral;
  const safeDebt = isNaN(debtValue) ? 0 : debtValue;
  const safeHf = isNaN(healthFactor) ? 999 : healthFactor;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {/* Portfolio Value */}
      <div className="card-prism">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-1">
          <span>TOTAL PORTFOLIO</span>
          <Wallet className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono text-white">
          ${effectivePortfolio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-[11px] font-mono text-slate-400 mt-1">Whole Wallet Valuation</div>
      </div>

      {/* Total Collateral */}
      <div className="card-prism">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-1">
          <span>DEFI COLLATERAL</span>
          <DollarSign className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono text-white">
          {hasPosition ? (
            `$${safeCollateral.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          ) : (
            <span className="text-slate-500 text-lg">No Position</span>
          )}
        </div>
        <div className="text-[11px] font-mono text-slate-400 mt-1">
          {hasPosition ? 'Active Lending Collateral' : 'Ready for deposit'}
        </div>
      </div>

      {/* Total Debt */}
      <div className="card-prism">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-1">
          <span>TOTAL DEFI DEBT</span>
          <Activity className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono text-white">
          {hasPosition ? (
            `$${safeDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          ) : (
            <span className="text-slate-500 text-lg">$0.00</span>
          )}
        </div>
        <div className="text-[11px] font-mono text-slate-400 mt-1">
          {hasPosition ? 'Outstanding Borrows' : 'No active borrowings'}
        </div>
      </div>

      {/* Health Factor */}
      <div className="card-prism">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-1">
          <span>HEALTH FACTOR</span>
          <ShieldAlert className="w-4 h-4 text-prism-purple-bright" />
        </div>
        <div className={`text-xl sm:text-2xl font-bold font-mono ${getHfColor(safeHf)}`}>
          {hasPosition ? (safeHf > 100 ? '100+' : safeHf.toFixed(3)) : '∞'}
        </div>
        <div className="text-[11px] font-mono text-slate-400 mt-1">
          {hasPosition ? (
            safeHf <= 1.15 ? '⚠️ Danger zone (< 1.15)' : '✓ Healthy position'
          ) : (
            'Zero liquidation risk'
          )}
        </div>
      </div>

      {/* Risk Assessment */}
      <div className="card-prism col-span-2 sm:col-span-1">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-1">
          <span>RISK LEVEL</span>
          <Percent className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getRiskColor(riskLevel)}`}>
            {hasPosition ? (riskLevel || 'SAFE') : 'SAFE'}
          </span>
          {hasPosition && (
            <span className="text-xs font-mono text-slate-400">({riskScore || 0}/100)</span>
          )}
        </div>
        <div className="text-[11px] font-mono text-slate-400 mt-1">PRISM Risk Engine</div>
      </div>
    </div>
  );
};
