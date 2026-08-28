import React from 'react';
import { Shield, ShieldAlert, Zap, Globe, RefreshCw } from 'lucide-react';

interface HeaderProps {
  mode: 'LIVE' | 'DEMO';
  network: string;
  address: string;
  autonomousProtection: boolean;
  onToggleAutonomous: (val: boolean) => void;
  lastUpdated: string;
  isRefreshing: boolean;
  onManualRefresh: () => void;
  dataSource: string;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  network,
  address,
  autonomousProtection,
  onToggleAutonomous,
  lastUpdated,
  isRefreshing,
  onManualRefresh,
  dataSource,
}) => {
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  return (
    <header className="border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-prism-purple to-prism-purple-dark flex items-center justify-center shadow-md shadow-purple-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-wider text-white">PRISM</h1>
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                mode === 'LIVE'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {mode === 'LIVE' ? 'LIVE ●' : 'DEMO MODE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono tracking-tight">Predict. Protect. Preserve.</p>
          </div>
        </div>

        {/* Right Info Controls */}
        <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs font-mono">
          {/* Network & Source */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-secondary border border-border/80 text-slate-300">
            <Globe className="w-3.5 h-3.5 text-prism-purple-bright" />
            <span>{network}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">{dataSource}</span>
          </div>

          {/* Active Address */}
          {shortAddress && (
            <div className="px-3 py-1.5 rounded-lg bg-surface-secondary border border-border/80 text-slate-300">
              <span className="text-slate-500 mr-1.5">Wallet:</span>
              <span className="text-purple-300 font-semibold">{shortAddress}</span>
            </div>
          )}

          {/* Autonomous Protection Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-secondary border border-border/80">
            <Zap className={`w-3.5 h-3.5 ${autonomousProtection ? 'text-amber-400' : 'text-slate-500'}`} />
            <span className="text-slate-300 text-[11px]">AUTONOMOUS RESCUE</span>
            <button
              type="button"
              onClick={() => onToggleAutonomous(!autonomousProtection)}
              className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors duration-200 ${
                autonomousProtection ? 'bg-prism-purple' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform duration-200 ${
                  autonomousProtection ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onManualRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-surface-secondary border border-border/80 text-slate-400 hover:text-white hover:border-prism-purple/50 transition-colors"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-prism-purple-bright' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
