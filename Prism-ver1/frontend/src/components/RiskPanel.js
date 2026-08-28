import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Activity } from 'lucide-react';

const riskColors = { LOW: '#22C55E', MODERATE: '#F59E0B', HIGH: '#F97316', CRITICAL: '#EF4444' };

const RiskPanel = ({ risk }) => {
  if (!risk) return null;
  const color = riskColors[risk.risk_level] || '#94A3B8';
  const isCritical = risk.risk_level === 'HIGH' || risk.risk_level === 'CRITICAL';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      style={{ background: '#10131F', border: '1px solid #252A3A', borderRadius: 12, padding: 24 }}
    >
      <h3 style={{ fontSize: 14, color: '#94A3B8', marginBottom: 16, fontWeight: 600, letterSpacing: 1 }}>RISK ANALYSIS</h3>
      
      {/* Risk Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <motion.div
          animate={isCritical ? { scale: [1, 1.15, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
          style={{
            padding: '6px 16px', borderRadius: 8, background: `${color}20`,
            border: `1px solid ${color}`, color, fontSize: 13, fontWeight: 700, letterSpacing: 1,
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <AlertTriangle size={14} /> {risk.risk_level}
        </motion.div>
        <span style={{ fontSize: 24, fontWeight: 700, color }}>{risk.risk_score.toFixed(1)}<span style={{ fontSize: 13, color: '#94A3B8' }}>/100</span></span>
      </div>

      {/* Risk Score Bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ height: 8, background: '#252A3A', borderRadius: 4, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${risk.risk_score}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ height: '100%', background: `linear-gradient(90deg, #22C55E, #F59E0B, #EF4444)`, borderRadius: 4 }}
          />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: '#161A29', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>Liquidation Probability</div>
          <div style={{ fontSize: 20, fontWeight: 700, color }}>{(risk.liquidation_probability * 100).toFixed(1)}%</div>
        </div>
        <div style={{ background: '#161A29', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>Predicted HF</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: risk.predicted_health_factor < 1.1 ? '#EF4444' : '#F59E0B' }}>
            {risk.predicted_health_factor.toFixed(3)}
          </div>
        </div>
        <div style={{ background: '#161A29', borderRadius: 8, padding: 12, gridColumn: '1/3' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={14} color="#A78BFA" />
            <span style={{ fontSize: 11, color: '#94A3B8' }}>Estimated Liquidation Window</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#F8FAFC', marginTop: 4 }}>{risk.estimated_liquidation_window}</div>
        </div>
      </div>
    </motion.div>
  );
};

export default RiskPanel;
