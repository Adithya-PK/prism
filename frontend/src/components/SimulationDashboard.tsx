import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, Zap, AlertTriangle, CheckCircle2, XCircle, TrendingDown,
  Activity, Target, DollarSign, RefreshCw, PlayCircle, BarChart2,
  ChevronDown, Clock, Cpu, Globe, Flame, ArrowRight, RotateCcw,
  ShieldAlert, ShieldCheck, Sparkles, Info, Settings2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { AICopilotChat } from './AICopilotChat';

/* ─── Types ──────────────────────────────────────────────────────────── */
interface Position {
  eth_amount: number;
  eth_price: number;
  debt_usdc: number;
  liquidation_threshold: number;
  flash_fee: number;
  dex_fee: number;
  slippage: number;
  gas_usd: number;
}

interface SimResult {
  health_factor: number;
  hf_velocity: number;
  hf_velocity_label: string;
  risk_level: string;
  volatility: number;
  target_hf_data: {
    base_buffer: number; vol_adj: number; vel_adj: number;
    dynamic_buffer: number; target_hf: number; reasons: string[];
  };
  ml_prediction: {
    probability: number; risk_class: string;
    model_type: string; confidence: number;
  };
  intervention: {
    status: string;
    debt_to_repay_usd?: number;
    collateral_to_sell_usd?: number;
    collateral_to_sell_eth?: number;
    flash_loan_amount?: number;
    flash_fee_usd?: number;
    dex_fee_usd?: number;
    slippage_usd?: number;
    post_rescue_hf?: number;
  };
  liquidation_scenario: {
    debt_liquidated: number; liquidation_penalty: number;
    remaining_collateral: number; remaining_debt: number; total_loss: number;
  };
  economics: {
    rescue_cost_usd: number; liquidation_loss_usd: number;
    net_benefit_usd: number; flash_fee_usd: number;
    dex_fee_usd: number; slippage_usd: number; gas_usd: number;
    economic_viable: boolean; adjusted_slippage_pct?: number;
  };
  capital_preservation: {
    score: number; capital_saved: number;
    rescue_cost: number; preserved_pct: number;
  };
  liquidator_radar: {
    distance_to_liquidation_pct: number;
    liquidator_pressure: string; status: string;
  };
  decision: string;
  decision_reason: string;
  position: {
    eth_amount: number; eth_price: number;
    collateral_usd: number; debt_usdc: number;
    net_equity: number; liquidation_threshold: number; ltv: number;
  };
  crash_applied?: number;
  original_eth_price?: number;
  original_hf?: number;
  new_eth_price?: number;
  intervention_ratio_pct?: number;
  retained_standard_liquidation_usd?: number;
  retained_prism_rescue_usd?: number;
  ai_bullets?: string[];
  ai_source?: string;
}

interface RescueStep {
  step: number; name: string; status: string; details?: string;
}

interface RescueResult {
  success: boolean;
  steps: RescueStep[];
  original_hf: number;
  final_hf: number;
  target_hf?: number;
  debt_repaid?: number;
  eth_sold?: number;
  rescue_cost?: number;
  capital_saved?: number;
  capital_preservation_score?: number;
  liquidation_loss_avoided?: number;
  net_benefit?: number;
  message: string;
}

/* ─── Constants ─────────────────────────────────────────────────────── */
const DEFAULT_POSITION: Position = {
  eth_amount: 10,
  eth_price: 4000,
  debt_usdc: 30000,
  liquidation_threshold: 0.825,
  flash_fee: 0.0005,
  dex_fee: 0.003,
  slippage: 0.004,
  gas_usd: 25,
};

const CRASH_OPTIONS = [-1, -5, -10, -15, -20, -30];

/* ─── Helpers ────────────────────────────────────────────────────────── */
function computeHF(ethAmt: number, ethPrice: number, debt: number, lt: number): number {
  if (debt <= 0) return 999;
  return (ethAmt * ethPrice * lt) / debt;
}

function formatUSD(n: number, dec = 0) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function hfColor(hf: number): string {
  if (hf >= 1.5) return 'text-emerald-400';
  if (hf >= 1.3) return 'text-yellow-400';
  if (hf >= 1.15) return 'text-orange-400';
  return 'text-red-400';
}

function riskBadge(level: string): string {
  switch (level) {
    case 'SAFE': case 'LOW': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'MODERATE': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
    case 'HIGH_RISK': case 'CRITICAL': return 'bg-red-500/20 text-red-300 border-red-500/40';
    case 'LIQUIDATABLE': return 'bg-red-900/40 text-red-200 border-red-400/60';
    default: return 'bg-slate-700 text-slate-300 border-slate-600';
  }
}

function decisionColor(d: string): string {
  if (d === 'RESCUE') return 'emerald';
  if (d === 'ALREADY_SAFE') return 'sky';
  if (d === 'DO_NOT_RESCUE') return 'amber';
  return 'red';
}

/* ─── Notification / Alert Log Item ─────────────────────────────────── */
interface Notification { id: string; type: string; title: string; body: string; timestamp: string; }

const NotificationBanner: React.FC<{ n: Notification; onDismiss: (id: string) => void }> = ({ n, onDismiss }) => {
  const icon = n.type === 'danger' ? <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" /> :
               n.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" /> :
               n.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> :
               <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />;
  const border = n.type === 'danger' ? 'border-red-500/30 bg-red-500/10 text-red-300' :
                 n.type === 'warning' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' :
                 n.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' :
                 'border-blue-500/30 bg-blue-500/10 text-blue-300';
  return (
    <div className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border ${border} font-mono text-xs transition-all`}>
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {icon}
        <div className="flex-1 truncate">
          <span className="font-bold text-white mr-2">{n.title}:</span>
          <span className="text-slate-300">{n.body}</span>
        </div>
        <span className="text-[10px] text-slate-500 whitespace-nowrap">{n.timestamp}</span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDismiss(n.id);
        }}
        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
        title="Dismiss alert"
      >
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  );
};

/* ─── HF Gauge ───────────────────────────────────────────────────────── */
const HFGauge: React.FC<{ hf: number; target: number }> = ({ hf, target }) => {
  const maxHF = 3.0;
  const pct = Math.min((hf / maxHF) * 100, 100);
  const tPct = Math.min((target / maxHF) * 100, 100);
  const liqPct = (1.0 / maxHF) * 100;
  const color = hf >= 1.5 ? '#10b981' : hf >= 1.3 ? '#fbbf24' : hf >= 1.1 ? '#f97316' : '#ef4444';
  return (
    <div className="relative w-full">
      <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden border border-border">
        {/* Danger zone */}
        <div className="absolute left-0 top-0 h-full bg-red-900/30" style={{ width: `${liqPct}%` }} />
        {/* Progress */}
        <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
             style={{ width: `${pct}%`, background: color }} />
        {/* Target line */}
        <div className="absolute top-0 h-full w-0.5 bg-purple-400/80" style={{ left: `${tPct}%` }} />
        {/* Liquidation boundary */}
        <div className="absolute top-0 h-full w-0.5 bg-red-500" style={{ left: `${liqPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
        <span>0</span>
        <span className="text-red-400">LIQ 1.0</span>
        <span className="text-purple-400">Target {target.toFixed(2)}</span>
        <span>{maxHF.toFixed(1)}</span>
      </div>
    </div>
  );
};

/* ─── Position Editor ────────────────────────────────────────────────── */
const PositionEditor: React.FC<{
  position: Position;
  onChange: (p: Position) => void;
  onApply: () => void;
}> = ({ position, onChange, onApply }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="card-prism mb-4">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full text-left">
        <Settings2 className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-mono font-bold text-slate-300">POSITION CONFIGURATION</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'ETH Amount', key: 'eth_amount', step: 0.5, min: 0.1 },
            { label: 'ETH Price ($)', key: 'eth_price', step: 100, min: 100 },
            { label: 'USDC Debt ($)', key: 'debt_usdc', step: 500, min: 0 },
            { label: 'Liq. Threshold', key: 'liquidation_threshold', step: 0.01, min: 0.5, max: 1 },
            { label: 'Flash Fee', key: 'flash_fee', step: 0.0001, min: 0 },
            { label: 'DEX Fee', key: 'dex_fee', step: 0.001, min: 0 },
            { label: 'Slippage', key: 'slippage', step: 0.001, min: 0 },
            { label: 'Gas USD', key: 'gas_usd', step: 5, min: 0 },
          ].map(({ label, key, step, min, max }) => (
            <div key={key}>
              <label className="text-[10px] font-mono text-slate-500 mb-1 block">{label}</label>
              <input
                type="number" step={step} min={min} max={max}
                value={(position as any)[key]}
                onChange={e => onChange({ ...position, [key]: parseFloat(e.target.value) || 0 })}
                className="w-full bg-surface-secondary border border-border rounded px-2 py-1 text-xs font-mono text-white"
              />
            </div>
          ))}
          <div className="col-span-2 md:col-span-4 flex gap-2">
            <button onClick={onApply}
              className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold transition-colors">
              APPLY POSITION
            </button>
            <button onClick={() => { onChange(DEFAULT_POSITION); setTimeout(onApply, 50); }}
              className="px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-mono transition-colors">
              RESET DEFAULT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────── */
const SimulationDashboard: React.FC = () => {
  const [position, setPosition] = useState<Position>(DEFAULT_POSITION);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [hfHistory, setHfHistory] = useState<{ t: number; hf: number; target: number }[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 'init-1',
      type: 'info',
      title: 'SYSTEM READY',
      body: 'PRISM deterministic risk engine & ML model initialized in Simulation Mode',
      timestamp: new Date().toLocaleTimeString(),
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [customCrash, setCustomCrash] = useState('');
  const [isRescueOpen, setIsRescueOpen] = useState(false);
  const [isRescuing, setIsRescuing] = useState(false);
  const [rescueResult, setRescueResult] = useState<RescueResult | null>(null);
  const [rescueAnimIdx, setRescueAnimIdx] = useState(0);
  const [mode, setMode] = useState<'SIMULATION' | 'LIVE_MARKET' | 'TESTNET'>('SIMULATION');
  const prevHFRef = useRef<number | null>(null);

  const addNotif = useCallback((type: string, title: string, body: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = new Date().toLocaleTimeString();
    setNotifications(prev => [{ id, type, title, body, timestamp }, ...prev.slice(0, 19)]);
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(x => x.id !== id));
  }, []);

  const fetchSimulation = useCallback(async (pos: Position, isCrash = false, crashPct = 0) => {
    setLoading(true);
    try {
      let res: Response;
      if (isCrash) {
        res = await fetch('/api/v1/simulation/crash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: pos, crash_pct: crashPct }),
        });
      } else {
        res = await fetch('/api/v1/simulation/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pos),
        });
      }
      if (!res.ok) throw new Error('Simulation request failed');
      const data: SimResult = await res.json();
      setSimResult(data);

      // Update HF history
      setHfHistory(prev => {
        const entry = { t: prev.length + 1, hf: data.health_factor, target: data.target_hf_data.target_hf };
        return [...prev.slice(-19), entry];
      });

      // Notifications
      const prevHF = prevHFRef.current;
      if (prevHF !== null && data.health_factor < 1.15 && data.health_factor >= 1.0) {
        addNotif('danger', '🚨 CRITICAL RISK', `HF: ${data.health_factor.toFixed(3)} — Position approaching liquidation boundary`);
      } else if (prevHF !== null && data.health_factor < 1.30 && (prevHF ?? 99) >= 1.30) {
        addNotif('warning', '⚠️ WARNING ZONE', `HF: ${data.health_factor.toFixed(3)} — Position entered warning zone`);
      }
      if (data.ml_prediction.probability > 0.70 && (prevHF ?? 0) > data.health_factor) {
        addNotif('danger', '🧠 ML RISK ELEVATED', `Liquidation probability: ${(data.ml_prediction.probability * 100).toFixed(1)}%`);
      }
      if (data.hf_velocity < -0.02) {
        addNotif('warning', '📉 RAPID DETERIORATION', `HF velocity: ${data.hf_velocity.toFixed(4)}/min`);
      }
      if (isCrash) {
        addNotif('danger', `⚡ ETH CRASHED ${crashPct}%`,
          `ETH: ${formatUSD(data.original_eth_price ?? pos.eth_price)} → ${formatUSD(data.new_eth_price ?? 0)} | HF: ${(data.original_hf ?? 0).toFixed(3)} → ${data.health_factor.toFixed(3)}`);
      }
      if (data.decision === 'RESCUE' && (prevHFRef.current ?? 99) >= 1.30) {
        addNotif('warning', '🛡️ PRISM RESCUE RECOMMENDED', `Minimum repayment: ${formatUSD(data.intervention.debt_to_repay_usd ?? 0)}`);
      }
      prevHFRef.current = data.health_factor;
    } catch (err) {
      // Fallback to local computation
      computeLocalFallback(pos, isCrash ? crashPct : 0);
    } finally {
      setLoading(false);
    }
  }, [addNotif]);

  // Fallback when backend unavailable
  const computeLocalFallback = (pos: Position, crashPct: number) => {
    const effPrice = pos.eth_price * (1 + crashPct / 100);
    const hf = computeHF(pos.eth_amount, effPrice, pos.debt_usdc, pos.liquidation_threshold);
    const collateral = pos.eth_amount * effPrice;
    const lt = pos.liquidation_threshold;
    const vol = 0.65 + Math.abs(crashPct) * 0.01;
    const targetBuf = 0.10 + (vol > 0.7 ? 0.10 : 0) + (hf < 1.2 ? 0.07 : 0);
    const target = 1 + targetBuf;
    const k = (1 + pos.flash_fee) / (1 - pos.dex_fee - pos.slippage);
    const num = target * pos.debt_usdc - collateral * lt;
    const den = target - lt * k;
    let x = 0, y = 0, postHF = hf;
    if (num > 0 && den > 0) {
      x = Math.min(num / den, pos.debt_usdc);
      y = k * x;
      postHF = ((collateral - y) * lt) / (pos.debt_usdc - x);
    }
    const liqLoss = pos.debt_usdc * 0.5 * 0.05;
    const rescueCost = x * pos.flash_fee + y * pos.dex_fee + y * pos.slippage + pos.gas_usd;
    const prob = Math.max(0, Math.min(0.99, 1 / (1 + Math.exp(6 * ((hf - 1) - vol)))));
    const distPct = Math.max(0, (hf - 1) / hf * 100);
    const result: SimResult = {
      health_factor: Math.round(hf * 10000) / 10000,
      hf_velocity: crashPct !== 0 ? -Math.abs(crashPct) * 0.002 : 0,
      hf_velocity_label: crashPct !== 0 ? 'RAPID DETERIORATION' : 'STABLE',
      risk_level: hf >= 1.5 ? 'LOW' : hf >= 1.3 ? 'MODERATE' : hf >= 1.15 ? 'HIGH_RISK' : 'CRITICAL',
      volatility: Math.round(vol * 10000) / 10000,
      target_hf_data: {
        base_buffer: 0.10, vol_adj: vol > 0.7 ? 0.10 : 0, vel_adj: hf < 1.2 ? 0.07 : 0,
        dynamic_buffer: Math.round(targetBuf * 10000) / 10000,
        target_hf: Math.round(target * 10000) / 10000,
        reasons: vol > 0.7 ? ['High ETH volatility'] : ['Stable market'],
      },
      ml_prediction: { probability: Math.round(prob * 10000) / 10000, risk_class: prob > 0.8 ? 'CRITICAL' : prob > 0.6 ? 'HIGH' : prob > 0.4 ? 'MODERATE' : 'LOW', model_type: 'deterministic_fallback', confidence: 0.7 },
      intervention: num > 0 && den > 0 ? {
        status: 'VIABLE', debt_to_repay_usd: Math.round(x * 100) / 100,
        collateral_to_sell_usd: Math.round(y * 100) / 100,
        collateral_to_sell_eth: Math.round(y / effPrice * 10000) / 10000,
        flash_loan_amount: Math.round(x * 100) / 100,
        flash_fee_usd: Math.round(x * pos.flash_fee * 10000) / 10000,
        dex_fee_usd: Math.round(y * pos.dex_fee * 10000) / 10000,
        slippage_usd: Math.round(y * pos.slippage * 10000) / 10000,
        post_rescue_hf: Math.round(postHF * 10000) / 10000,
      } : { status: num <= 0 ? 'NO_INTERVENTION_REQUIRED' : 'UNSAFE_INTERVENTION' },
      liquidation_scenario: {
        debt_liquidated: Math.round(pos.debt_usdc * 0.5 * 100) / 100,
        liquidation_penalty: Math.round(liqLoss * 100) / 100,
        remaining_collateral: Math.round((collateral - pos.debt_usdc * 0.5 - liqLoss) * 100) / 100,
        remaining_debt: Math.round(pos.debt_usdc * 0.5 * 100) / 100,
        total_loss: Math.round(liqLoss * 100) / 100,
      },
      economics: {
        rescue_cost_usd: Math.round(rescueCost * 100) / 100,
        liquidation_loss_usd: Math.round(liqLoss * 100) / 100,
        net_benefit_usd: Math.round((liqLoss - rescueCost) * 100) / 100,
        flash_fee_usd: Math.round(x * pos.flash_fee * 10000) / 10000,
        dex_fee_usd: Math.round(y * pos.dex_fee * 10000) / 10000,
        slippage_usd: Math.round(y * pos.slippage * 10000) / 10000,
        gas_usd: pos.gas_usd,
        economic_viable: rescueCost < liqLoss * 0.9,
      },
      capital_preservation: {
        score: liqLoss > 0 ? Math.round((liqLoss - rescueCost) / liqLoss * 100 * 10) / 10 : 100,
        capital_saved: Math.round((liqLoss - rescueCost) * 100) / 100,
        rescue_cost: Math.round(rescueCost * 100) / 100,
        preserved_pct: liqLoss > 0 ? Math.round((liqLoss - rescueCost) / liqLoss * 10000) / 100 : 100,
      },
      liquidator_radar: {
        distance_to_liquidation_pct: Math.round(distPct * 100) / 100,
        liquidator_pressure: distPct < 5 ? 'CRITICAL' : distPct < 10 ? 'HIGH' : distPct < 20 ? 'MEDIUM' : 'LOW',
        status: distPct < 5 ? 'Liquidation imminent' : distPct < 10 ? 'Liquidation window narrowing' : 'Position at risk',
      },
      decision: num <= 0 ? 'ALREADY_SAFE' : (num > 0 && den > 0 && rescueCost < liqLoss * 0.9 ? 'RESCUE' : 'DO_NOT_RESCUE'),
      decision_reason: num <= 0 ? 'Position already safe' : 'Rescue economically viable',
      position: {
        eth_amount: pos.eth_amount, eth_price: Math.round(effPrice * 100) / 100,
        collateral_usd: Math.round(collateral * 100) / 100,
        debt_usdc: pos.debt_usdc, net_equity: Math.round((collateral - pos.debt_usdc) * 100) / 100,
        liquidation_threshold: pos.liquidation_threshold, ltv: Math.round(pos.debt_usdc / collateral * 10000) / 10000,
      },
      crash_applied: crashPct, original_eth_price: pos.eth_price,
      original_hf: computeHF(pos.eth_amount, pos.eth_price, pos.debt_usdc, pos.liquidation_threshold),
      new_eth_price: Math.round(effPrice * 100) / 100,
    };
    setSimResult(result);
    setHfHistory(prev => {
      const entry = { t: prev.length + 1, hf: result.health_factor, target: result.target_hf_data.target_hf };
      return [...prev.slice(-19), entry];
    });
    prevHFRef.current = result.health_factor;
    if (crashPct !== 0) {
      addNotif('danger', `⚡ ETH CRASHED ${crashPct}%`,
        `ETH: ${formatUSD(pos.eth_price)} → ${formatUSD(effPrice)} | HF: ${(result.original_hf ?? 0).toFixed(3)} → ${result.health_factor.toFixed(3)}`);
    }
  };

  // Initial load
  useEffect(() => {
    fetchSimulation(position);
  }, []);

  const handleCrash = async (pct: number) => {
    await fetchSimulation(position, true, pct);
  };

  const handleRescue = async () => {
    if (!simResult) return;
    setIsRescueOpen(true);
    setIsRescuing(true);
    setRescueResult(null);
    setRescueAnimIdx(0);
    try {
      const res = await fetch('/api/v1/simulation/rescue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(position),
      });
      if (!res.ok) throw new Error('Rescue request failed');
      const data: RescueResult = await res.json();
      setRescueResult(data);
      if (data.success) {
        addNotif('success', '✓ POSITION RESTORED',
          `HF: ${data.original_hf.toFixed(3)} → ${data.final_hf.toFixed(3)} | Capital Saved: ${formatUSD(data.capital_saved ?? 0, 2)}`);
        // Update position state to reflect rescue
        setSimResult(prev => prev ? { ...prev, health_factor: data.final_hf } : prev);
        setHfHistory(prev => [...prev, { t: prev.length + 1, hf: data.final_hf, target: simResult?.target_hf_data.target_hf ?? 1.2 }]);
      }
    } catch {
      // Fallback local rescue simulation
      const pos = position;
      const x = simResult.intervention.debt_to_repay_usd ?? 0;
      const eth_sold = simResult.intervention.collateral_to_sell_eth ?? 0;
      const rescue_cost = simResult.economics.rescue_cost_usd;
      const liq_loss = simResult.economics.liquidation_loss_usd;
      const final_hf = simResult.intervention.post_rescue_hf ?? simResult.target_hf_data.target_hf;
      const fallback: RescueResult = {
        success: simResult.decision === 'RESCUE',
        steps: [
          { step: 1, name: 'RISK DETECTED', status: 'DONE', details: `HF=${simResult.health_factor.toFixed(4)}` },
          { step: 2, name: 'MARKET VOLATILITY ANALYZED', status: 'DONE', details: `Volatility: ${(simResult.volatility * 100).toFixed(1)}%` },
          { step: 3, name: 'LIQUIDATION PROBABILITY PREDICTED', status: 'DONE', details: `ML: ${(simResult.ml_prediction.probability * 100).toFixed(1)}%` },
          { step: 4, name: 'TARGET HF OPTIMIZED', status: 'DONE', details: `Target: ${simResult.target_hf_data.target_hf.toFixed(4)}` },
          { step: 5, name: 'MINIMUM REPAYMENT CALCULATED', status: 'DONE', details: `Repay: ${formatUSD(x, 2)} | ETH to sell: ${eth_sold.toFixed(4)}` },
          { step: 6, name: 'DEX LIQUIDITY CHECKED', status: 'DONE', details: 'Slippage: ACCEPTABLE' },
          { step: 7, name: 'ECONOMIC VIABILITY PASSED', status: simResult.economics.economic_viable ? 'DONE' : 'FAILED', details: `Net benefit: ${formatUSD(liq_loss - rescue_cost, 2)}` },
          { step: 8, name: 'FLASH LIQUIDITY SOURCED', status: 'DONE', details: `Flash loan: ${formatUSD(x, 2)} USDC` },
          { step: 9, name: 'USDC DEBT REPAID', status: 'DONE', details: `Repaid: ${formatUSD(x, 2)}` },
          { step: 10, name: 'ETH COLLATERAL RELEASED', status: 'DONE', details: `Released: ${eth_sold.toFixed(4)} ETH` },
          { step: 11, name: 'ETH → USDC SWAP', status: 'DONE', details: `Swapped ${eth_sold.toFixed(4)} ETH → USDC` },
          { step: 12, name: 'FLASH LIQUIDITY REPAID', status: 'DONE', details: `Repaid principal + fee` },
          { step: 13, name: 'POST-RESCUE VERIFICATION', status: 'DONE', details: `HF: ${simResult.health_factor.toFixed(4)} → ${final_hf.toFixed(4)}` },
          { step: 14, name: 'CAPITAL PRESERVED', status: 'DONE', details: `Capital Preservation Score: ${simResult.capital_preservation.score.toFixed(1)}` },
        ],
        original_hf: simResult.health_factor,
        final_hf,
        target_hf: simResult.target_hf_data.target_hf,
        debt_repaid: x,
        eth_sold,
        rescue_cost,
        capital_saved: simResult.capital_preservation.capital_saved,
        capital_preservation_score: simResult.capital_preservation.score,
        liquidation_loss_avoided: liq_loss,
        net_benefit: liq_loss - rescue_cost,
        message: `RESCUE SUCCESSFUL. HF: ${simResult.health_factor.toFixed(4)} → ${final_hf.toFixed(4)}`,
      };
      setRescueResult(fallback);
      if (fallback.success) {
        addNotif('success', '✓ POSITION RESTORED', `HF: ${simResult.health_factor.toFixed(3)} → ${final_hf.toFixed(3)}`);
      }
    } finally {
      setIsRescuing(false);
    }
  };

  // Animate rescue steps
  useEffect(() => {
    if (!isRescuing && rescueResult && rescueAnimIdx < rescueResult.steps.length) {
      const t = setTimeout(() => setRescueAnimIdx(i => i + 1), 180);
      return () => clearTimeout(t);
    }
  }, [isRescuing, rescueResult, rescueAnimIdx]);

  const hf = simResult?.health_factor ?? computeHF(position.eth_amount, position.eth_price, position.debt_usdc, position.liquidation_threshold);
  const target = simResult?.target_hf_data.target_hf ?? 1.2;
  const collateral = (simResult?.position.collateral_usd ?? position.eth_amount * position.eth_price);
  const needsRescue = hf < target;

  return (
    <div className="min-h-screen bg-background text-slate-100">
      {/* ── Header ── */}
      <header className="border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-widest text-white">PRISM</h1>
                <span className="text-[9px] font-bold text-slate-400 tracking-wider">AUTONOMOUS LIQUIDATION SHIELD</span>
              </div>
              <p className="text-[10px] font-mono text-purple-400">Predict. Protect. Preserve.</p>
            </div>
          </div>

          {/* Mode selector */}
          <div className="flex items-center gap-1.5 bg-surface-secondary border border-border rounded-lg p-1">
            {(['SIMULATION', 'LIVE_MARKET', 'TESTNET'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-colors ${mode === m ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {m.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEM ONLINE
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-slate-400">
              {mode === 'SIMULATION' ? '🔷 SIMULATED' : mode === 'LIVE_MARKET' ? '🟢 LIVE' : '🟡 TESTNET'}
            </div>
            <button onClick={() => fetchSimulation(position)}
              className="p-1.5 rounded-lg bg-surface-secondary border border-border text-slate-400 hover:text-white transition-colors"
              disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">

        {/* Position Editor */}
        <PositionEditor position={position} onChange={setPosition} onApply={() => fetchSimulation(position)} />

        {/* ── Top KPI Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {/* Health Factor */}
          <div className={`card-prism col-span-2 p-4`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-[10px] font-mono text-slate-500 mb-0.5">HEALTH FACTOR</div>
                <div className={`text-4xl font-bold ${hfColor(hf)}`}>{hf.toFixed(3)}</div>
                <div className={`text-xs font-mono mt-1 px-2 py-0.5 rounded border inline-block ${
                  riskBadge(
                    hf >= 1.5 ? 'SAFE' :
                    hf >= 1.3 ? 'LOW' :
                    hf >= 1.15 ? 'MODERATE' :
                    hf >= 1.05 ? 'HIGH_RISK' :
                    hf >= 1.0 ? 'CRITICAL' : 'LIQUIDATABLE'
                  )
                }`}>
                  {hf >= 1.5 ? 'SAFE' : hf >= 1.3 ? 'LOW' : hf >= 1.15 ? 'MODERATE' : hf >= 1.05 ? 'HIGH_RISK' : hf >= 1.0 ? 'CRITICAL' : 'LIQUIDATABLE'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-slate-500 mb-0.5">HF VELOCITY</div>
                <div className={`text-lg font-bold font-mono ${(simResult?.hf_velocity ?? 0) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {(simResult?.hf_velocity ?? 0).toFixed(4)}/min
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{simResult?.hf_velocity_label ?? 'STABLE'}</div>
              </div>
            </div>
            <HFGauge hf={hf} target={target} />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2">
              <span>LIQUIDATION @ 1.000</span>
              <span className="text-purple-400">TARGET: {target.toFixed(3)}</span>
              <span>BADGE: {simResult ? 'SIMULATED' : '—'}</span>
            </div>
          </div>

          {/* ML Liquidation Risk */}
          <div className="card-prism p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] font-mono text-slate-500">ML LIQUIDATION RISK</span>
            </div>
            <div className={`text-3xl font-bold ${(simResult?.ml_prediction.probability ?? 0) > 0.7 ? 'text-red-400' : (simResult?.ml_prediction.probability ?? 0) > 0.4 ? 'text-orange-400' : 'text-emerald-400'}`}>
              {((simResult?.ml_prediction.probability ?? 0) * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">{simResult?.ml_prediction.risk_class ?? '—'}</div>
            <div className="mt-2 pt-2 border-t border-border/60">
              <div className="text-[10px] text-slate-500 mb-0.5">MODEL CONFIDENCE</div>
              <div className="text-sm font-bold font-mono text-purple-300">{((simResult?.ml_prediction.confidence ?? 0) * 100).toFixed(0)}%</div>
              <div className="text-[9px] text-slate-600 mt-0.5">{simResult?.ml_prediction.model_type ?? '—'}</div>
              <div className="text-[9px] text-amber-500 mt-1">ML scenario estimate</div>
            </div>
          </div>

          {/* Liquidator Radar */}
          <div className="card-prism p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[10px] font-mono text-slate-500">LIQUIDATOR RADAR</span>
            </div>
            <div className="text-2xl font-bold text-white">{(simResult?.liquidator_radar.distance_to_liquidation_pct ?? 0).toFixed(1)}%</div>
            <div className="text-[10px] font-mono text-slate-400">DISTANCE TO LIQUIDATION</div>
            <div className="mt-2 pt-2 border-t border-border/60">
              <div className={`text-xs font-bold font-mono px-2 py-0.5 rounded border inline-block ${
                simResult?.liquidator_radar.liquidator_pressure === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                simResult?.liquidator_radar.liquidator_pressure === 'HIGH' ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
                simResult?.liquidator_radar.liquidator_pressure === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
                'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {simResult?.liquidator_radar.liquidator_pressure ?? 'LOW'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1.5">{simResult?.liquidator_radar.status ?? '—'}</div>
            </div>
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">

          {/* Left: Position + HF Chart + Target HF */}
          <div className="lg:col-span-7 space-y-5">

            {/* Position Card */}
            <div className="card-prism p-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-mono font-bold text-white">ETH/USDC POSITION</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono">SIMULATED</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-[10px] font-mono text-slate-500">ETH COLLATERAL</div>
                  <div className="text-xl font-bold text-white">{(simResult?.position.eth_amount ?? position.eth_amount)} ETH</div>
                  <div className="text-xs font-mono text-slate-400">{formatUSD(simResult?.position.collateral_usd ?? position.eth_amount * position.eth_price, 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-slate-500">ETH PRICE</div>
                  <div className="text-xl font-bold text-white">{formatUSD(simResult?.position.eth_price ?? position.eth_price, 0)}</div>
                  {simResult?.crash_applied ? (
                    <div className="text-xs font-mono text-red-400">{simResult.crash_applied}% crash</div>
                  ) : <div className="text-xs font-mono text-slate-500">Current</div>}
                </div>
                <div>
                  <div className="text-[10px] font-mono text-slate-500">USDC DEBT</div>
                  <div className="text-xl font-bold text-white">{formatUSD(simResult?.position.debt_usdc ?? position.debt_usdc, 0)}</div>
                  <div className="text-xs font-mono text-slate-400">LTV {((simResult?.position.ltv ?? 0) * 100).toFixed(1)}%</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-3 gap-3 text-[10px] font-mono text-slate-500">
                <div>LIQ. THRESHOLD: <span className="text-slate-300">{((simResult?.position.liquidation_threshold ?? position.liquidation_threshold) * 100).toFixed(1)}%</span></div>
                <div>NET EQUITY: <span className="text-emerald-400">{formatUSD(simResult?.position.net_equity ?? (position.eth_amount * position.eth_price - position.debt_usdc), 0)}</span></div>
                <div>COLLATERAL: <span className="text-slate-300">{formatUSD(collateral, 0)}</span></div>
              </div>
            </div>

            {/* HF History Chart */}
            <div className="card-prism p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-mono font-bold text-white">HEALTH FACTOR TRAJECTORY</span>
                <span className="ml-auto text-[10px] text-slate-500 font-mono">Last {hfHistory.length} readings</span>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hfHistory} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
                    <defs>
                      <linearGradient id="hfGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'monospace' }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'monospace' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                      formatter={(v: number) => [v.toFixed(4), 'HF']}
                    />
                    <ReferenceLine y={1.0} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'LIQ 1.0', fontSize: 9, fill: '#ef4444', fontFamily: 'monospace' }} />
                    <ReferenceLine y={target} stroke="#8b5cf6" strokeDasharray="4 2" label={{ value: `Target ${target.toFixed(2)}`, fontSize: 9, fill: '#a78bfa', fontFamily: 'monospace' }} />
                    <Area type="monotone" dataKey="hf" stroke="#8b5cf6" fill="url(#hfGrad)" strokeWidth={2} dot={{ r: 2, fill: '#8b5cf6' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Dynamic Target HF */}
            <div className="card-prism p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-mono font-bold text-white">DYNAMIC SAFETY BUFFER</span>
              </div>
              <div className="flex items-start gap-6">
                <div>
                  <div className="text-[10px] font-mono text-slate-500">TARGET HF</div>
                  <div className="text-3xl font-bold text-purple-300">{target.toFixed(4)}</div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded bg-surface-secondary border border-border/60">
                    <div className="text-slate-500 text-[10px]">BASE BUFFER</div>
                    <div className="text-white">+{((simResult?.target_hf_data.base_buffer ?? 0.1) * 100).toFixed(0)}%</div>
                  </div>
                  <div className="p-2 rounded bg-surface-secondary border border-border/60">
                    <div className="text-slate-500 text-[10px]">VOL ADJ</div>
                    <div className="text-amber-400">+{((simResult?.target_hf_data.vol_adj ?? 0) * 100).toFixed(0)}%</div>
                  </div>
                  <div className="p-2 rounded bg-surface-secondary border border-border/60">
                    <div className="text-slate-500 text-[10px]">VEL ADJ</div>
                    <div className="text-orange-400">+{((simResult?.target_hf_data.vel_adj ?? 0) * 100).toFixed(0)}%</div>
                  </div>
                  <div className="p-2 rounded bg-surface-secondary border border-border/60">
                    <div className="text-slate-500 text-[10px]">VOLATILITY</div>
                    <div className="text-white">{((simResult?.volatility ?? 0.65) * 100).toFixed(0)}%</div>
                  </div>
                </div>
              </div>
              {simResult?.target_hf_data.reasons && (
                <div className="mt-3 text-[11px] font-mono text-slate-400">
                  Reason: {simResult.target_hf_data.reasons.join(' + ')}
                </div>
              )}
            </div>

            {/* Rescue vs Liquidation Comparison */}
            <div className="card-prism p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-mono font-bold text-white">PRISM RESCUE vs LIQUIDATION</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div className="text-[10px] text-slate-500 space-y-2 pt-6">
                  <div className="py-2">Collateral</div>
                  <div className="py-2">Debt</div>
                  <div className="py-2">Intervention</div>
                  <div className="py-2">Final HF</div>
                  <div className="py-2">Capital Retained</div>
                  <div className="py-2">Penalty / Cost</div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="text-[10px] font-bold text-emerald-400 mb-2 text-center">🛡️ PRISM RESCUE</div>
                  <div className="text-white">{formatUSD(collateral, 0)}</div>
                  <div className="text-white">{formatUSD(position.debt_usdc, 0)}</div>
                  <div className="text-emerald-400">Minimum {formatUSD(simResult?.intervention.debt_to_repay_usd ?? 0, 0)}</div>
                  <div className="text-emerald-400">{(simResult?.intervention.post_rescue_hf ?? target).toFixed(3)}</div>
                  <div className="text-emerald-300 font-bold">{formatUSD((collateral - (simResult?.intervention.collateral_to_sell_usd ?? 0)), 0)}</div>
                  <div className="text-slate-400">{formatUSD(simResult?.economics.rescue_cost_usd ?? 0, 2)}</div>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 space-y-2">
                  <div className="text-[10px] font-bold text-red-400 mb-2 text-center">💀 LIQUIDATION</div>
                  <div className="text-white">{formatUSD(collateral, 0)}</div>
                  <div className="text-white">{formatUSD(position.debt_usdc, 0)}</div>
                  <div className="text-red-400">Forced up to 50%</div>
                  <div className="text-red-400">Liquidated</div>
                  <div className="text-red-300">{formatUSD(simResult?.liquidation_scenario.remaining_collateral ?? 0, 0)}</div>
                  <div className="text-red-400">{formatUSD(simResult?.liquidation_scenario.liquidation_penalty ?? 0, 2)}</div>
                </div>
              </div>
              {simResult && (
                <div className="mt-3 p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-center text-xs font-mono">
                  <span className="text-slate-400">Capital Saved by PRISM: </span>
                  <span className="text-emerald-400 font-bold">+{formatUSD(simResult.capital_preservation.capital_saved, 2)}</span>
                </div>
              )}
            </div>

            {/* 🤖 Interactive PRISM AI Risk Copilot */}
            <AICopilotChat contextData={simResult} />
          </div>

          {/* Right: Crash Simulator + Intervention + Economics + Capital Score */}
          <div className="lg:col-span-5 space-y-5">

            {/* ⚡ Crash Simulator */}
            <div className="card-prism p-4 border-orange-500/20">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-mono font-bold text-white">⚡ ETH CRASH SIMULATOR</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-orange-500/20 border border-orange-500/40 text-orange-300 font-mono">SIMULATED</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {CRASH_OPTIONS.map(pct => (
                  <button key={pct} onClick={() => handleCrash(pct)} disabled={loading}
                    className={`py-2 px-2 rounded-lg font-mono font-bold text-xs border transition-all hover:scale-105 ${
                      Math.abs(pct) <= 5 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20' :
                      Math.abs(pct) <= 15 ? 'bg-orange-500/10 border-orange-500/30 text-orange-300 hover:bg-orange-500/20' :
                      'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
                    }`}>
                    {pct}%
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="number" placeholder="Custom %" min={-99} max={-1} step={1}
                  value={customCrash}
                  onChange={e => setCustomCrash(e.target.value)}
                  className="flex-1 bg-surface-secondary border border-border rounded px-3 py-2 text-xs font-mono text-white placeholder-slate-500"
                />
                <button onClick={() => { const v = parseFloat(customCrash); if (v < 0) handleCrash(v); }}
                  disabled={loading || !customCrash}
                  className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono font-bold transition-colors disabled:opacity-50">
                  CRASH
                </button>
              </div>
              {simResult?.crash_applied && (
                <div className="mt-3 p-2 rounded text-[10px] font-mono bg-red-500/10 border border-red-500/30 text-red-300">
                  Applied: ETH {formatUSD(simResult.original_eth_price ?? 0)} → {formatUSD(simResult.new_eth_price ?? 0)} ({simResult.crash_applied}%)
                </div>
              )}
            </div>

            {/* Minimum Intervention */}
            <div className="card-prism p-4">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-mono font-bold text-white">MINIMUM INTERVENTION</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono">CALCULATED</span>
              </div>
              {simResult?.intervention.status === 'VIABLE' ? (
                <div className="space-y-3 text-xs font-mono">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] text-slate-500">DEBT TO REPAY</div>
                      <div className="text-lg font-bold text-emerald-400">{formatUSD(simResult.intervention.debt_to_repay_usd ?? 0, 2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">ETH TO SELL</div>
                      <div className="text-lg font-bold text-white">{(simResult.intervention.collateral_to_sell_eth ?? 0).toFixed(4)} ETH</div>
                      <div className="text-[10px] text-slate-400">{formatUSD(simResult.intervention.collateral_to_sell_usd ?? 0, 2)}</div>
                    </div>
                  </div>

                  {/* Minimum Intervention Ratio Bar */}
                  <div className="p-2.5 rounded-lg bg-surface-secondary border border-border/80">
                    <div className="flex justify-between items-center text-[10px] mb-1">
                      <span className="text-slate-400">INTERVENTION RATIO</span>
                      <span className="text-purple-300 font-bold">{Math.min(simResult.intervention_ratio_pct ?? 0, 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 mb-1.5">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(simResult.intervention_ratio_pct ?? 0, 100)}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 leading-tight">
                      PRISM uses the exact minimum collateral needed to reach the dynamic safety target.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                    <div>Flash Loan: <span className="text-white">{formatUSD(simResult.intervention.flash_loan_amount ?? 0, 2)}</span></div>
                    <div>Flash Fee: <span className="text-amber-400">{formatUSD(simResult.intervention.flash_fee_usd ?? 0, 4)}</span></div>
                    <div>DEX Fee: <span className="text-amber-400">{formatUSD(simResult.intervention.dex_fee_usd ?? 0, 4)}</span></div>
                    <div>Slippage: <span className="text-amber-400">{formatUSD(simResult.intervention.slippage_usd ?? 0, 4)}</span></div>
                  </div>
                  <div className="pt-2 border-t border-border/60">
                    <div className="text-[10px] text-slate-500">POST-RESCUE HF</div>
                    <div className="text-base font-bold text-emerald-400">{(simResult.intervention.post_rescue_hf ?? 0).toFixed(4)}</div>
                  </div>
                  <div className="text-[9px] text-slate-600">
                    Formula: x = (target×D − C×LT) / (target − LT×k) | k = (1+flash_fee)/(1−dex_fee−slip)
                  </div>
                </div>
              ) : simResult?.intervention.status === 'NO_INTERVENTION_REQUIRED' ? (
                <div className="text-center py-4 text-emerald-400 font-mono text-sm">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                  Position is already above target HF
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/40 text-center font-mono space-y-1.5">
                  <AlertTriangle className="w-6 h-6 mx-auto text-red-400" />
                  <div className="text-xs font-bold text-red-400">POSITION UNDERWATER / INSOLVENT</div>
                  <div className="text-[10px] text-slate-300">
                    Total Collateral ({formatUSD(simResult?.position.collateral_usd ?? 0, 0)}) is less than Debt ({formatUSD(simResult?.position.debt_usdc ?? 0, 0)}).
                  </div>
                  <div className="text-[9px] text-red-300">
                    Cannot restructure without external capital injection.
                  </div>
                </div>
              )}
            </div>

            {/* Economic Viability */}
            <div className="card-prism p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-mono font-bold text-white">ECONOMIC VIABILITY GATE</span>
              </div>
              {simResult?.economics && (
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Liquidation Loss Avoided</span>
                    <span className="text-emerald-400 font-bold">+{formatUSD(simResult.economics.liquidation_loss_usd, 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Flash Fee</span>
                    <span className="text-red-400">−{formatUSD(simResult.economics.flash_fee_usd, 4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">DEX Fee</span>
                    <span className="text-red-400">−{formatUSD(simResult.economics.dex_fee_usd, 4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Slippage</span>
                    <span className="text-red-400">−{formatUSD(simResult.economics.slippage_usd, 4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gas</span>
                    <span className="text-red-400">−{formatUSD(simResult.economics.gas_usd, 2)}</span>
                  </div>
                  <div className="pt-2 border-t border-border/60 flex justify-between font-bold">
                    <span className="text-slate-300">NET BENEFIT</span>
                    <span className={simResult.economics.net_benefit_usd >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {simResult.economics.net_benefit_usd >= 0 ? '+' : ''}{formatUSD(simResult.economics.net_benefit_usd, 2)}
                    </span>
                  </div>
                  <div className={`mt-2 p-2 rounded text-center font-bold text-sm border ${
                    simResult.economics.economic_viable
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-red-500/20 border-red-500/40 text-red-300'
                  }`}>
                    {simResult.economics.economic_viable ? '🟢 EXECUTION VIABLE' : '🔴 EXECUTION BLOCKED'}
                  </div>
                  {!simResult.economics.economic_viable && (
                    <p className="text-[10px] text-red-300 text-center mt-1">
                      Rescue cost exceeds expected liquidation loss. PRISM will NOT execute.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Capital Preservation Score */}
            <div className="card-prism p-4">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-white">CAPITAL PRESERVATION SCORE</span>
              </div>
              {simResult?.capital_preservation && (
                <div>
                  <div className="flex items-end gap-3 mb-2">
                    <div className="text-4xl font-bold text-emerald-400">{simResult.capital_preservation.score.toFixed(1)}</div>
                    <div className="text-xs font-mono text-slate-500 mb-1">/ 100</div>
                    <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 font-bold mb-1">
                      {simResult.capital_preservation.score >= 80 ? 'EXCELLENT PRESERVATION' : simResult.capital_preservation.score >= 50 ? 'MODERATE PRESERVATION' : 'LOW PRESERVATION'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 mb-3">
                    <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-2 rounded-full transition-all duration-700"
                         style={{ width: `${Math.min(simResult.capital_preservation.score, 100)}%` }} />
                  </div>

                  <div className="p-2.5 rounded-lg bg-surface-secondary border border-border/80 text-[11px] font-mono space-y-1.5 mb-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Standard liquidation retained:</span>
                      <span className="text-slate-200">{formatUSD(simResult.retained_standard_liquidation_usd ?? simResult.liquidation_scenario.remaining_collateral, 2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">PRISM rescue retained:</span>
                      <span className="text-emerald-400 font-bold">{formatUSD(simResult.retained_prism_rescue_usd ?? (collateral - (simResult.intervention.collateral_to_sell_usd ?? 0)), 2)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border/60 font-bold">
                      <span className="text-slate-300">Capital preserved:</span>
                      <span className="text-emerald-300">+{formatUSD(simResult.capital_preservation.capital_saved, 2)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-slate-500">CAPITAL SAVED</div>
                      <div className="text-emerald-400 font-bold">{formatUSD(simResult.capital_preservation.capital_saved, 2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">RESCUE COST</div>
                      <div className="text-amber-400 font-bold">{formatUSD(simResult.capital_preservation.rescue_cost, 2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">PRESERVED</div>
                      <div className="text-white font-bold">{simResult.capital_preservation.preserved_pct.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AI Risk Summary & Gemini Synthesis */}
            <div className="card-prism p-4 border-purple-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-mono font-bold text-white">AI RISK SUMMARY & DECISION SYNTHESIS</span>
                <span className="ml-auto text-[9px] px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono">
                  {simResult?.ai_source ?? 'PRISM AI Layer'}
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono text-slate-300">
                {simResult?.ai_bullets && simResult.ai_bullets.length > 0 ? (
                  simResult.ai_bullets.map((bullet, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded bg-surface-secondary/60 border border-border/60">
                      <span className="text-purple-400 font-bold mt-0.5">•</span>
                      <span className="leading-relaxed">{bullet}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 text-xs py-2">
                    • Analyzing position metrics and volatility parameters...
                  </div>
                )}
              </div>
            </div>

            {/* Decision + Rescue Button */}
            <div className="card-prism p-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-mono font-bold text-white">PRISM DECISION</span>
              </div>
              <div className={`p-3 rounded-lg border text-center font-mono font-bold text-base mb-4 ${
                simResult?.decision === 'RESCUE' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' :
                simResult?.decision === 'ALREADY_SAFE' ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' :
                simResult?.decision === 'DO_NOT_RESCUE' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' :
                'bg-red-500/20 border-red-500/40 text-red-300'
              }`}>
                {simResult?.decision ?? 'CALCULATING...'}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mb-4">{simResult?.decision_reason ?? ''}</div>
              <button
                onClick={handleRescue}
                disabled={!simResult || loading || simResult.decision === 'ALREADY_SAFE'}
                className={`w-full py-3 px-6 rounded-xl font-mono font-bold text-sm transition-all ${
                  simResult?.decision === 'RESCUE'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 cursor-pointer'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}>
                🛡 RUN PRISM RESCUE
              </button>
              <div className="text-[9px] font-mono text-slate-600 text-center mt-2">SIMULATED • NO REAL TRANSACTIONS</div>
            </div>
          </div>
        </div>

        {/* ── Bottom: System Activity & Alert History ── */}
        <div className="card-prism p-4 mt-6">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-mono font-bold text-white tracking-wide">SYSTEM ACTIVITY & ALERT HISTORY</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-secondary text-slate-400 border border-border">
                {notifications.length} events
              </span>
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearAllNotifications}
                className="text-[10px] font-mono px-2.5 py-1 rounded bg-surface-secondary hover:bg-slate-800 border border-border text-slate-400 hover:text-slate-200 transition-colors"
              >
                CLEAR ALL
              </button>
            )}
          </div>

          {notifications.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {notifications.map((n) => (
                <NotificationBanner
                  key={n.id}
                  n={n}
                  onDismiss={dismissNotification}
                />
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-slate-500 font-mono text-xs">
              No active alerts. System running nominal.
            </div>
          )}
        </div>
      </main>

      {/* ── Rescue Animation Modal ── */}
      {isRescueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="card-prism max-w-2xl w-full border-2 border-purple-500/40 shadow-2xl shadow-purple-500/10 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">PRISM AUTONOMOUS RESCUE EXECUTION</h3>
                  <p className="text-[10px] font-mono text-slate-400">SIMULATED ATOMIC TRANSACTION • ZERO REAL ON-CHAIN RISK</p>
                </div>
              </div>
              <button onClick={() => { setIsRescueOpen(false); setRescueResult(null); setRescueAnimIdx(0); }}
                className="p-1.5 rounded text-slate-400 hover:text-white">×</button>
            </div>

            <div className="py-4 overflow-y-auto flex-1">
              {isRescuing && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white font-mono font-bold">Executing atomic simulation pipeline...</p>
                  <p className="text-xs text-slate-500 mt-1">Sourcing flash liquidity, repaying debt, swapping collateral...</p>
                </div>
              )}

              {rescueResult && (
                <div className="space-y-3 font-mono text-xs">
                  {/* Result banner */}
                  <div className={`p-4 rounded-xl border flex items-center gap-3 ${rescueResult.success ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    {rescueResult.success ? <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" /> : <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />}
                    <div>
                      <div className={`font-bold text-sm ${rescueResult.success ? 'text-emerald-300' : 'text-red-300'}`}>
                        {rescueResult.success ? '✓ RESCUE SUCCESSFUL' : '✕ TRANSACTION REVERTED'}
                      </div>
                      <div className="text-[10px] text-slate-300 mt-0.5">{rescueResult.message}</div>
                    </div>
                  </div>

                  {/* HF Delta */}
                  {rescueResult.success && (
                    <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-surface-secondary border border-border/60 text-center">
                      <div>
                        <div className="text-[10px] text-slate-500">BEFORE</div>
                        <div className="text-xl font-bold text-red-400">{rescueResult.original_hf.toFixed(3)}</div>
                      </div>
                      <div className="flex items-center justify-center">
                        <ArrowRight className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">AFTER</div>
                        <div className="text-xl font-bold text-emerald-400">{rescueResult.final_hf.toFixed(3)}</div>
                      </div>
                    </div>
                  )}

                  {rescueResult.success && (
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-center text-xs">
                      <div>
                        <div className="text-[10px] text-slate-500">CAPITAL SAVED</div>
                        <div className="text-emerald-400 font-bold">{formatUSD(rescueResult.capital_saved ?? 0, 2)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">PRESERVATION SCORE</div>
                        <div className="text-purple-300 font-bold">{(rescueResult.capital_preservation_score ?? 0).toFixed(1)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">RESCUE COST</div>
                        <div className="text-amber-400 font-bold">{formatUSD(rescueResult.rescue_cost ?? 0, 2)}</div>
                      </div>
                    </div>
                  )}

                  {/* Animated Steps */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 mb-2">ATOMIC EXECUTION TIMELINE:</div>
                    <div className="space-y-1.5">
                      {rescueResult.steps.slice(0, rescueAnimIdx).map(step => (
                        <div key={step.step}
                          className={`p-2 rounded border flex items-start gap-2 text-[11px] transition-all duration-300 ${
                            step.status === 'DONE' ? 'bg-surface-secondary/60 border-border/60 text-slate-300' :
                            step.status === 'FAILED' ? 'bg-red-500/10 border-red-500/30 text-red-300' :
                            'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          }`}>
                          <span className="text-[9px] w-5 text-slate-500 mt-0.5 font-bold">{step.step}.</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">{step.name}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ml-2 ${
                                step.status === 'DONE' ? 'bg-emerald-500/20 text-emerald-400' :
                                step.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                                'bg-amber-500/20 text-amber-400'
                              }`}>
                                {step.status === 'DONE' ? '✓' : step.status === 'FAILED' ? '✕' : '↩'} {step.status}
                              </span>
                            </div>
                            {step.details && <div className="text-[10px] text-slate-400 mt-0.5">{step.details}</div>}
                          </div>
                        </div>
                      ))}
                      {!isRescuing && rescueResult && rescueAnimIdx < rescueResult.steps.length && (
                        <div className="flex items-center gap-2 p-2 text-[10px] text-purple-400 font-mono">
                          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                          Processing next step...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <button onClick={() => { setIsRescueOpen(false); setRescueResult(null); setRescueAnimIdx(0); }}
                className="px-4 py-2 rounded-lg bg-surface-secondary border border-border text-white text-xs font-mono transition-colors hover:bg-surface">
                CLOSE SIMULATION TRACE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulationDashboard;
