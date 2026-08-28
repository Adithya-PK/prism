import React from 'react';
import { Radio } from 'lucide-react';
import { MarketData } from '../types';

interface MarketFeedPanelProps {
  market?: MarketData;
}

export const MarketFeedPanel: React.FC<MarketFeedPanelProps> = ({ market }) => {
  if (!market || !market.prices) {
    return null;
  }

  const priceEntries = Object.values(market.prices).filter(Boolean);

  if (priceEntries.length === 0) {
    return null;
  }

  return (
    <div className="card-prism">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-white">LIVE MARKET FEED</h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <span>Source:</span>
          <span className="px-1.5 py-0.5 rounded bg-surface-secondary text-slate-300 border border-border">
            CoinGecko
          </span>
          {market.network_gas_price_gwei && (
            <span className="text-amber-400">Gas: {market.network_gas_price_gwei} Gwei</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono text-xs">
        {priceEntries.slice(0, 6).map((asset, i) => {
          const sym = asset?.symbol || 'ASSET';
          const price = asset?.price_usd ?? 0;
          const chg = asset?.price_change_24h ?? 0;
          const isPos = chg >= 0;
          const vol = asset?.volatility_30d;

          return (
            <div
              key={sym + i}
              className="p-2 rounded-lg bg-surface-secondary/50 border border-border/50 hover:border-border transition-colors"
            >
              <div className="flex items-center justify-between text-slate-400 text-[10px] mb-0.5">
                <span className="font-bold text-white">{sym}</span>
                <span className={isPos ? 'text-emerald-400' : 'text-red-400'}>
                  {asset?.price_change_24h !== undefined && asset?.price_change_24h !== null && !isNaN(chg)
                    ? `${isPos ? '+' : ''}${chg.toFixed(1)}%`
                    : ''}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-200">
                ${price >= 1
                  ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : price.toFixed(4)}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">
                Vol: {vol && !isNaN(vol) ? `${(vol * 100).toFixed(0)}%` : '65%'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
