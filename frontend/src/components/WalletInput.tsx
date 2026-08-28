import React, { useState } from 'react';
import { Search, ShieldCheck, Lock, Sparkles, ArrowRight, AlertTriangle } from 'lucide-react';

interface WalletInputProps {
  onLoadWallet: (address: string) => void;
  onSelectDemo: (scenario: string) => void;
  isLoading: boolean;
  errorMessage?: string;
}

export const WalletInput: React.FC<WalletInputProps> = ({
  onLoadWallet,
  onSelectDemo,
  isLoading,
  errorMessage,
}) => {
  const [inputAddress, setInputAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputAddress.trim()) {
      onLoadWallet(inputAddress.trim());
    }
  };

  const sampleAddresses = [
    { label: 'Vitalik Buterin', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
    { label: 'Aave Top Borrower', address: '0x5777d92f208679DB4b9778590FA3CAB3aC9e2168' },
    { label: 'Whale 0x71C7', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
  ];

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Terminal Header Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-prism-purple/10 border border-prism-purple/30 text-prism-purple-bright text-xs font-mono mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous DeFi Risk Management Terminal</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
            Predictive Risk Intelligence & Smart Protection
          </h2>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            Continuously monitors DeFi lending health, projects future risk, calculates dynamic safety buffers, and simulates atomic rescues.
          </p>
        </div>

        {/* Input Box */}
        <div className="card-prism glow-purple border-prism-purple/30 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="wallet-address" className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">
                Enter Public Ethereum Wallet Address
              </label>
              <div className="relative">
                <input
                  id="wallet-address"
                  type="text"
                  value={inputAddress}
                  onChange={(e) => setInputAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-surface-secondary border border-border focus:border-prism-purple focus:ring-1 focus:ring-prism-purple rounded-lg px-4 py-3 text-sm font-mono text-white placeholder-slate-500 transition-all outline-none"
                  disabled={isLoading}
                />
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !inputAddress.trim()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-prism-purple to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-md shadow-purple-900/30 text-sm"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>CONNECTING TO PUBLIC BLOCKCHAIN...</span>
                </>
              ) : (
                <>
                  <span>LOAD WALLET & ANALYZE RISK</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Select Public Addresses */}
          <div className="mt-5 pt-4 border-t border-border/80">
            <p className="text-[11px] font-mono text-slate-400 mb-2">Quick load public wallets:</p>
            <div className="flex flex-wrap gap-2">
              {sampleAddresses.map((s) => (
                <button
                  key={s.address}
                  type="button"
                  onClick={() => setInputAddress(s.address)}
                  className="text-xs font-mono px-2.5 py-1 rounded bg-surface-secondary hover:bg-surface-secondary/80 border border-border text-slate-300 hover:text-white transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Demo Mode Options Card for Judges */}
        <div className="card-prism-secondary border-dashed border-border mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Hackathon Judge Demo Scenarios
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Explore full PRISM intelligence engines with pre-configured lending positions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSelectDemo('SUCCESSFUL_RESCUE')}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium transition-colors"
              >
                1. Successful Rescue
              </button>
              <button
                type="button"
                onClick={() => onSelectDemo('SAFE_ABORT')}
                className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-mono font-medium transition-colors"
              >
                2. Safe Abort
              </button>
            </div>
          </div>
        </div>

        {/* Security & Read-Only Notice */}
        <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>READ-ONLY ACCESS: PRISM never requests private keys, passwords, or transaction signatures.</span>
        </div>
      </div>
    </div>
  );
};
