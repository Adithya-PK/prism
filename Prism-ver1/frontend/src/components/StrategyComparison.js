import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Check, X } from 'lucide-react';

const StrategyComparison = ({ strategyComparison }) => {
  if (!strategyComparison) return null;
  const maxCost = Math.max(...strategyComparison.strategies.map(s => s.cost), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      style={{ background: '#10131F', border: '1px solid #252A3A', borderRadius: 12, padding: 24 }}
    >
      <h3 style={{ fontSize: 14, color: '#94A3B8', marginBottom: 16, fontWeight: 600, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <BarChart3 size={16} color="#A78BFA" /> STRATEGY COMPARISON
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {strategyComparison.strategies.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            style={{
              background: s.is_selected ? '#8B5CF610' : '#161A29',
              border: s.is_selected ? '1px solid #8B5CF6' : '1px solid #252A3A',
              borderRadius: 10, padding: 14, position: 'relative', overflow: 'hidden',
              boxShadow: s.is_selected ? '0 0 20px #8B5CF620' : 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {s.is_selected ? (
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={13} color="#fff" />
                  </div>
                ) : (
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#252A3A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={13} color="#94A3B8" />
                  </div>
                )}
                <span style={{ fontSize: 14, fontWeight: 600, color: s.is_selected ? '#A78BFA' : '#F8FAFC' }}>{s.name}</span>
                {s.is_selected && <span style={{ fontSize: 10, background: '#8B5CF6', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>SELECTED</span>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.is_selected ? '#22C55E' : '#F8FAFC' }}>${s.cost.toFixed(2)}</div>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>HF → {s.final_health_factor.toFixed(3)}</div>
              </div>
            </div>
            {/* Cost bar */}
            <div style={{ height: 4, background: '#252A3A', borderRadius: 2, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${(s.cost / maxCost) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.6 + i * 0.1 }}
                style={{ height: '100%', background: s.is_selected ? '#8B5CF6' : '#94A3B8', borderRadius: 2 }}
              />
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>{s.description}</div>
          </motion.div>
        ))}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: '#A78BFA', fontStyle: 'italic' }}>
        {strategyComparison.selection_reason}
      </div>
    </motion.div>
  );
};

export default StrategyComparison;
