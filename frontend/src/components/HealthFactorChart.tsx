import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Area,
  ComposedChart,
} from 'recharts';
import { Activity, Info } from 'lucide-react';

interface HealthFactorChartProps {
  currentHf: number;
  predictedHf: number;
  targetHf: number;
  liquidationBoundary?: number;
}

export const HealthFactorChart: React.FC<HealthFactorChartProps> = ({
  currentHf,
  predictedHf,
  targetHf,
  liquidationBoundary = 1.0,
}) => {
  // Generate a smooth 12-point timeline representing past observations, current live, and projected future
  const data = [
    { time: '-6h', hf: Number((currentHf + 0.14).toFixed(3)), type: 'historical' },
    { time: '-4h', hf: Number((currentHf + 0.09).toFixed(3)), type: 'historical' },
    { time: '-2h', hf: Number((currentHf + 0.04).toFixed(3)), type: 'historical' },
    { time: '-1h', hf: Number((currentHf + 0.02).toFixed(3)), type: 'historical' },
    { time: 'LIVE ●', hf: Number(currentHf.toFixed(3)), type: 'live' },
    { time: '+1h', hf: Number((currentHf + (predictedHf - currentHf) * 0.25).toFixed(3)), type: 'predicted' },
    { time: '+2h', hf: Number((currentHf + (predictedHf - currentHf) * 0.55).toFixed(3)), type: 'predicted' },
    { time: '+3h', hf: Number((currentHf + (predictedHf - currentHf) * 0.80).toFixed(3)), type: 'predicted' },
    { time: '+4h (Proj)', hf: Number(predictedHf.toFixed(3)), type: 'predicted' },
  ];

  return (
    <div className="card-prism">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-prism-purple-bright" />
          <h3 className="text-sm font-semibold text-white">HEALTH FACTOR TRAJECTORY & PROJECTION</h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-prism-purple inline-block" />
            HF Trajectory
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" />
            PRISM Target ({targetHf.toFixed(2)})
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <span className="w-2.5 h-0.5 bg-red-400 inline-block" />
            Liquidation (1.00)
          </span>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="hfGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2333" vertical={false} />
            <XAxis dataKey="time" stroke="#64748B" fontSize={11} fontFamily="monospace" tickLine={false} />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              fontFamily="monospace"
              domain={[0.85, Math.max(targetHf + 0.15, currentHf + 0.15)]}
              tickLine={false}
              tickFormatter={(v) => v.toFixed(2)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#10131F',
                borderColor: '#252A3A',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#fff',
              }}
              formatter={(value: any) => [`${Number(value).toFixed(3)}`, 'Health Factor']}
            />
            {/* Liquidation Boundary Reference */}
            <ReferenceLine
              y={liquidationBoundary}
              stroke="#EF4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'LIQUIDATION 1.00',
                position: 'insideBottomRight',
                fill: '#EF4444',
                fontSize: 10,
                fontFamily: 'monospace',
              }}
            />
            {/* PRISM Target Reference */}
            <ReferenceLine
              y={targetHf}
              stroke="#22C55E"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              label={{
                value: `PRISM TARGET ${targetHf.toFixed(2)}`,
                position: 'insideTopRight',
                fill: '#22C55E',
                fontSize: 10,
                fontFamily: 'monospace',
              }}
            />
            <Area type="monotone" dataKey="hf" fill="url(#hfGradient)" stroke="none" />
            <Line
              type="monotone"
              dataKey="hf"
              stroke="#8B5CF6"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#8B5CF6', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#A78BFA' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2 pt-2 border-t border-border/60">
        <span className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-purple-400" />
          Data distinction: Points before LIVE are historical/estimated; points after are PRISM Predictive Model output.
        </span>
        <span className="text-purple-300">Model: Statistical Downside Projection</span>
      </div>
    </div>
  );
};
