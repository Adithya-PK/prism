import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowDown } from 'lucide-react';

const InterventionPanel = ({ intervention, safety }) => {
  if (!intervention) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
      style={{ background: '#10131F', border: '1px solid #252A3A', borderRadius: 12, padding: 24 }}
    >
      <h3 style={{ fontSize: 14, color: '#94A3B8', marginBottom: 16, fontWeight: 600, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Zap size={16} color="#A78BFA" /> MINIMUM INTERVENTION
      </h3>

      {intervention.intervention_required ? (
        <>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>Minimum Required Repayment</div>
            <motion.div
              initial={{ scale: 0.5 }} animate={{ scale: 1 }}
              style={{ fontSize: 36, fontWeight: 800, color: '#F59E0B' }}
            >
              ${intervention.minimum_repayment.toFixed(2)}
            </motion.div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#161A29', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 10, color: '#94A3B8' }}>Selected Collateral</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ArrowDown size={14} color="#A78BFA" /> {intervention.collateral_amount.toFixed(4)} {intervention.selected_collateral}
              </div>
            </div>
            <div style={{ background: '#161A29', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 10, color: '#94A3B8' }}>Expected Slippage</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: intervention.expected_slippage > 0.02 ? '#F59E0B' : '#22C55E' }}>
                {(intervention.expected_slippage * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, background: '#161A29', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 10, color: '#94A3B8' }}>Target Health Factor</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#22C55E' }}>
              {safety?.target_health_factor?.toFixed(3) || '—'}
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#22C55E' }}>No Intervention Required</div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Position is within safe parameters</div>
        </div>
      )}
    </motion.div>
  );
};

export default InterventionPanel;
