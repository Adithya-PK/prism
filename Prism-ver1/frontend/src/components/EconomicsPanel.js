import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, ShieldAlert } from 'lucide-react';

const EconomicsPanel = ({ economics }) => {
  if (!economics) return null;
  const viable = economics.is_economically_viable;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
      style={{ background: '#10131F', border: '1px solid #252A3A', borderRadius: 12, padding: 24 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <DollarSign size={16} color="#A78BFA" /> ECONOMIC ANALYSIS
        </h3>
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: 'spring' }}
          style={{
            padding: '6px 16px', borderRadius: 8, fontWeight: 700, fontSize: 12, letterSpacing: 1,
            background: viable ? '#22C55E20' : '#EF444420',
            border: `1px solid ${viable ? '#22C55E' : '#EF4444'}`,
            color: viable ? '#22C55E' : '#EF4444'
          }}
        >
          {viable ? '✓ ECONOMICALLY VIABLE' : '✗ NOT VIABLE'}
        </motion.div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Rescue Cost */}
        <div style={{ background: '#161A29', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <ShieldAlert size={20} color="#F59E0B" style={{ marginBottom: 6 }} />
          <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>Total Rescue Cost</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#F59E0B' }}>${economics.total_rescue_cost.toFixed(2)}</div>
        </div>

        {/* Liquidation Loss */}
        <div style={{ background: '#161A29', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <TrendingUp size={20} color="#EF4444" style={{ marginBottom: 6 }} />
          <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>Est. Liquidation Loss</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#EF4444' }}>${economics.estimated_liquidation_loss.toFixed(2)}</div>
        </div>

        {/* Net Benefit */}
        <div style={{ background: viable ? '#22C55E10' : '#161A29', borderRadius: 10, padding: 16, textAlign: 'center', border: viable ? '1px solid #22C55E40' : 'none' }}>
          <DollarSign size={20} color="#22C55E" style={{ marginBottom: 6 }} />
          <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>Net Benefit</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#22C55E' }}>+${economics.net_benefit.toFixed(2)}</div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div style={{ background: '#161A29', borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 10, fontWeight: 600 }}>COST BREAKDOWN</div>
        {[
          { label: 'Flash Loan Fee', value: economics.flash_loan_fee, color: '#8B5CF6' },
          { label: 'Swap Fee', value: economics.swap_fee, color: '#A78BFA' },
          { label: 'Slippage Cost', value: economics.slippage_cost, color: '#F59E0B' },
          { label: 'Gas Cost', value: economics.gas_cost, color: '#F97316' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color }} />
              <span style={{ fontSize: 12, color: '#94A3B8' }}>{item.label}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#F8FAFC' }}>${item.value.toFixed(2)}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #252A3A', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>Total</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>${economics.total_rescue_cost.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: economics.decision === 'RESCUE' ? '#22C55E' : economics.decision === 'MONITOR' ? '#F59E0B' : '#EF4444' }}>
          PRISM Decision: {economics.decision}
        </span>
      </div>
    </motion.div>
  );
};

export default EconomicsPanel;
