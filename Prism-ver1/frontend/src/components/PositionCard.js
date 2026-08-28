import React from 'react';
import { motion } from 'framer-motion';
import { Coins, TrendingDown } from 'lucide-react';

const getHFColor = (hf) => {
  if (hf >= 1.5) return '#22C55E';
  if (hf >= 1.2) return '#F59E0B';
  if (hf >= 1.05) return '#F97316';
  return '#EF4444';
};

const PositionCard = ({ result, position }) => {
  const hf = result?.risk?.health_factor || 0;
  const collateralValue = position?.collateral?.reduce((s, c) => s + c.amount * c.price, 0) || 0;
  const debtValue = position?.debt?.reduce((s, d) => s + d.amount * d.price, 0) || 0;
  const hfColor = getHFColor(hf);
  const hfAngle = Math.min(Math.max((hf - 0.5) / 2, 0), 1) * 180;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      style={{ background: '#10131F', border: '1px solid #252A3A', borderRadius: 12, padding: 24 }}
    >
      <h3 style={{ fontSize: 14, color: '#94A3B8', marginBottom: 16, fontWeight: 600, letterSpacing: 1 }}>POSITION HEALTH</h3>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {/* HF Gauge */}
        <div style={{ position: 'relative', width: 140, height: 80 }}>
          <svg width="140" height="80" viewBox="0 0 140 80">
            <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke="#252A3A" strokeWidth="10" strokeLinecap="round" />
            <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke={hfColor} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${hfAngle * 1.05} 999`}
              style={{ filter: `drop-shadow(0 0 6px ${hfColor})`, transition: 'all 0.8s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', bottom: 0, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: hfColor }}>{hf.toFixed(3)}</div>
            <div style={{ fontSize: 10, color: '#94A3B8' }}>HEALTH FACTOR</div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {/* Collateral */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Coins size={16} color="#22C55E" />
              <span style={{ fontSize: 13, color: '#94A3B8' }}>Collateral</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#22C55E' }}>${collateralValue.toLocaleString()}</span>
          </div>
          {position?.collateral?.map((c, i) => (
            <div key={i} style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4, paddingLeft: 24 }}>
              {c.amount} {c.asset} @ ${c.price.toLocaleString()}
            </div>
          ))}
          
          {/* Debt */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingDown size={16} color="#EF4444" />
              <span style={{ fontSize: 13, color: '#94A3B8' }}>Debt</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#EF4444' }}>${debtValue.toLocaleString()}</span>
          </div>
          {position?.debt?.map((d, i) => (
            <div key={i} style={{ fontSize: 12, color: '#94A3B8', paddingLeft: 24 }}>
              {d.amount} {d.asset}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default PositionCard;
