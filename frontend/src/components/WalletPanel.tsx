import React from 'react';
import { Coins } from 'lucide-react';
import { TokenBalance } from '../types';

interface WalletPanelProps {
  tokens: TokenBalance[];
  totalValue: number;
  ethBalance: number;
  source: string;
}

export const WalletPanel: React.FC<WalletPanelProps> = ({
  tokens = [],
  totalValue = 0,
  ethBalance = 0,
  source = 'Ethereum',
}) => {
  return (
    <div className="card-prism">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-prism-purple-bright" />
          <h3 className="text-sm font-semibold text-white">WHOLE WALLET ASSETS</h3>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span>Source:</span>
          <span className="px-1.5 py-0.5 rounded bg-surface-secondary text-slate-300 border border-border">
            {source}
          </span>
        </div>
      </div>

      {(!tokens || tokens.length === 0) ? (
        <div className="py-8 text-center text-slate-500 text-xs font-mono">
          No tokens with non-zero balance discovered in this wallet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-slate-400 border-b border-border/80">
                <th className="pb-2 font-medium">Asset</th>
                <th className="pb-2 font-medium text-right">Balance</th>
                <th className="pb-2 font-medium text-right">Price (USD)</th>
                <th className="pb-2 font-medium text-right">Value (USD)</th>
                <th className="pb-2 font-medium text-right">24h Change</th>
                <th className="pb-2 font-medium text-right">Allocation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {tokens.map((token, idx) => {
                const sym = token?.symbol || 'UNKNOWN';
                const name = token?.name || sym;
                const isPositive = (token?.price_change_24h ?? 0) >= 0;
                const balance = token?.balance ?? 0;
                const price = token?.price_usd;
                const value = token?.value_usd;
                const alloc = token?.allocation_pct;

                return (
                  <tr key={idx} className="hover:bg-surface-secondary/40 transition-colors">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        {token?.logo_url ? (
                          <img src={token.logo_url} alt={sym} className="w-5 h-5 rounded-full" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-prism-purple/20 border border-prism-purple/40 flex items-center justify-center text-[10px] text-purple-300 font-bold">
                            {sym.slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-white flex items-center gap-1">
                            {sym}
                            {token?.is_native && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Native
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">{name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-200">
                      {balance < 0.0001
                        ? balance.toExponential(2)
                        : balance.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                    </td>
                    <td className="py-2.5 text-right text-slate-300">
                      {price !== undefined && price !== null && !isNaN(price)
                        ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-white">
                      {value !== undefined && value !== null && !isNaN(value)
                        ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className={`py-2.5 text-right ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {token?.price_change_24h !== undefined && token?.price_change_24h !== null && !isNaN(token.price_change_24h)
                        ? `${isPositive ? '+' : ''}${token.price_change_24h.toFixed(2)}%`
                        : '—'}
                    </td>
                    <td className="py-2.5 text-right">
                      {alloc !== undefined && alloc !== null && !isNaN(alloc) ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-slate-300">{alloc.toFixed(1)}%</span>
                          <div className="w-12 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-prism-purple to-purple-400 rounded-full"
                              style={{ width: `${Math.min(alloc, 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
