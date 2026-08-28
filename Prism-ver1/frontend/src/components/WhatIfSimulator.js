import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sliders, TrendingDown, Gauge, Fuel } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:8000';

const WhatIfSimulator = ({ baseRequest, onResult }) => {
  const [ethPrice, setEthPrice] = useState(baseRequest?.position?.collateral?.[0]?.price || 3000);
  const [volatility, setVolatility] = useState(baseRequest?.market?.volatility || 0.65);
  const [trend, setTrend] = useState(baseRequest?.market?.trend || 'bearish');
  const [gasPrice, setGasPrice] = useState(baseRequest?.market?.gas_price_gwei || 45);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runWhatIf = useCallback(async () => {
    if (!baseRequest) return;
    setLoading(true);
    try {
      const req = {
        ...baseRequest,
        position: {
          ...baseRequest.position,
          collateral: baseRequest.position.collateral.map(c => ({ ...c, price: ethPrice }))
        },
        market: { ...baseRequest.market, volatility, trend, gas_price_gwei: gasPrice }
      };
      const resp = await axios.post(`${API}/api/whatif`, req);
      setResult(resp.data);
      if (onResult) onResult(resp.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [ethPrice, volatility, trend, gasPrice, baseRequest, onResult]);

  useEffect(() => {
    const timer = setTimeout(runWhatIf, 400);
    return () => clearTimeout(timer);
  }, [runWhatIf]);

  const riskColors = { LOW: '#22C55E', MODERATE: '#F59E0B', HIGH: '#F97316', CRITICAL: '#EF4444' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#10131F', border: '1px solid #252A3A', borderRadius: 12, padding: 24 }}
    >
      <h3 style={{ fontSize: 14, color: '#94A3B8', marginBottom: 20, fontWeight: 600, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sliders size={16} color="#A78BFA" /> WHAT-IF SCENARIO SIMULATOR
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* ETH Price */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}><TrendingDown size={12} /> ETH Price</label>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>${ethPrice}</span>
          </div>
          <input type="range" min="1000" max="5000" step="50" value={ethPrice} onChange={e => setEthPrice(+e.target.value)}
            style={{ width: '100%', accentColor: '#8B5CF6' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94A3B8' }}>
            <span>$1,000</span><span>$5,000</span>
          </div>
        </div>

        {/* Volatility */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}><Gauge size={12} /> Volatility</label>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>{(volatility * 100).toFixed(0)}%</span>
          </div>
          <input type="range" min="0" max="1" step="0.05" value={volatility} onChange={e => setVolatility(+e.target.value)}
            style={{ width: '100%', accentColor: '#8B5CF6' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94A3B8' }}>
            <span>0%</span><span>100%</span>
          </div>
        </div>

        {/* Trend */}
        <div>
          <label style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6, display: 'block' }}>Market Trend</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['bearish', 'neutral', 'bullish'].map(t => (
              <button key={t} onClick={() => setTrend(t)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: trend === t ? '#8B5CF6' : '#161A29', color: trend === t ? '#fff' : '#94A3B8',
                  transition: 'all 0.2s'
                }}
              >
                {t === 'bearish' ? '🐻 Bearish' : t === 'neutral' ? '➡️ Neutral' : '🐂 Bullish'}
              </button>
            ))}
          </div>
        </div>

        {/* Gas */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}><Fuel size={12} /> Gas Price</label>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>{gasPrice} gwei</span>
          </div>
          <input type="range" min="10" max="200" step="5" value={gasPrice} onChange={e => setGasPrice(+e.target.value)}
            style={{ width: '100%', accentColor: '#8B5CF6' }} />
        </div>
      </div>

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, borderTop: '1px solid #252A3A', paddingTop: 16 }}
        >
          <div style={{ background: '#161A29', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#94A3B8' }}>Risk Level</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: riskColors[result.risk?.risk_level] || '#fff' }}>
              {result.risk?.risk_level}
            </div>
          </div>
          <div style={{ background: '#161A29', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#94A3B8' }}>Health Factor</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>{result.risk?.health_factor?.toFixed(3)}</div>
          </div>
          <div style={{ background: '#161A29', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#94A3B8' }}>Intervention</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#F59E0B' }}>
              {result.intervention?.intervention_required ? `$${result.intervention.minimum_repayment.toFixed(0)}` : 'None'}
            </div>
          </div>
          <div style={{ background: '#161A29', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#94A3B8' }}>Decision</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: result.economics?.decision === 'RESCUE' ? '#22C55E' : result.economics?.decision === 'MONITOR' ? '#F59E0B' : '#EF4444' }}>
              {result.economics?.decision}
            </div>
          </div>
        </motion.div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 8, fontSize: 12, color: '#A78BFA' }}>Recalculating...</div>
      )}
    </motion.div>
  );
};

export default WhatIfSimulator;
