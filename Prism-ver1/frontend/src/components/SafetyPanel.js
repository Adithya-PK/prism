import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

const SafetyPanel = ({ safety, currentHF }) => {
  if (!safety) return null;
  const hf = currentHF || 1.0;
  const min = 0.8, max = 2.0;
  const range = max - min;
  const liqPos = ((1.0 - min) / range) * 100;
  const targetPos = ((safety.target_health_factor - min) / range) * 100;
  const currentPos = ((Math.min(hf, max) - min) / range) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      style={{ background: '#10131F', border: '1px solid #252A3A', borderRadius: 12, padding: 24 }}
    >
      <h3 style={{ fontSize: 14, color: '#94A3B8', marginBottom: 16, fontWeight: 600, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldCheck size={16} color="#A78BFA" /> DYNAMIC SAFETY BUFFER
      </h3>

      {/* Visual Bar */}
      <div style={{ position: 'relative', height: 50, marginBottom: 24, marginTop: 30 }}>
        <div style={{ position: 'absolute', top: 15, left: 0, right: 0, height: 20, borderRadius: 10, overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${liqPos}%`, background: '#EF444440' }} />
          <div style={{ width: `${targetPos - liqPos}%`, background: '#F59E0B30' }} />
          <div style={{ flex: 1, background: '#22C55E20' }} />
        </div>
        {/* Liquidation line */}
        <div style={{ position: 'absolute', top: 8, left: `${liqPos}%`, width: 2, height: 34, background: '#EF4444' }}>
          <div style={{ position: 'absolute', top: -18, left: -20, fontSize: 10, color: '#EF4444', whiteSpace: 'nowrap' }}>LIQ 1.00</div>
        </div>
        {/* Target line */}
        <div style={{ position: 'absolute', top: 8, left: `${targetPos}%`, width: 2, height: 34, background: '#22C55E' }}>
          <div style={{ position: 'absolute', top: -18, left: -25, fontSize: 10, color: '#22C55E', whiteSpace: 'nowrap' }}>TARGET {safety.target_health_factor.toFixed(2)}</div>
        </div>
        {/* Current position */}
        <motion.div
          initial={{ left: 0 }} animate={{ left: `${currentPos}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ position: 'absolute', top: 10, width: 16, height: 16, borderRadius: '50%', background: '#A78BFA', border: '3px solid #8B5CF6', boxShadow: '0 0 12px #8B5CF6', marginLeft: -8, zIndex: 2 }}
        />
        {/* Current label */}
        <motion.div
          initial={{ left: 0 }} animate={{ left: `${currentPos}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ position: 'absolute', bottom: -8, fontSize: 10, color: '#A78BFA', whiteSpace: 'nowrap', marginLeft: -20, fontWeight: 600 }}
        >
          NOW {hf.toFixed(3)}
        </motion.div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div style={{ background: '#161A29', borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>Base Buffer</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>{safety.base_safety_buffer.toFixed(3)}</div>
        </div>
        <div style={{ background: '#161A29', borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>Vol. Adjustment</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#F59E0B' }}>+{safety.volatility_adjustment.toFixed(3)}</div>
        </div>
        <div style={{ background: '#161A29', borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>Dynamic Buffer</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#A78BFA' }}>{safety.dynamic_safety_buffer.toFixed(3)}</div>
        </div>
      </div>
    </motion.div>
  );
};

export default SafetyPanel;
