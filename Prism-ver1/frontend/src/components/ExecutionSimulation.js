import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Play, Shield } from 'lucide-react';

const ExecutionSimulation = ({ execution, safetyVerification, onSimulate }) => {
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [simulating, setSimulating] = useState(false);

  const startSimulation = () => {
    setSimulating(true);
    setVisibleSteps(0);
  };

  useEffect(() => {
    if (simulating && execution?.steps) {
      const timer = setTimeout(() => {
        if (visibleSteps < execution.steps.length) {
          setVisibleSteps(v => v + 1);
        } else {
          setSimulating(false);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [simulating, visibleSteps, execution]);

  if (!execution) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
      style={{ background: '#10131F', border: '1px solid #252A3A', borderRadius: 12, padding: 24 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600, letterSpacing: 1, margin: 0 }}>SIMULATED ATOMIC EXECUTION</h3>
        <button
          onClick={startSimulation}
          style={{
            background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)', border: 'none', color: '#fff',
            padding: '8px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <Play size={14} /> Simulate Rescue
        </button>
      </div>

      {/* Execution Steps */}
      <div style={{ marginBottom: 20 }}>
        {execution.steps.map((step, i) => (
          <AnimatePresence key={i}>
            {(visibleSteps > i || !simulating) && (
              <motion.div
                initial={simulating ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  background: i % 2 === 0 ? '#161A29' : 'transparent', borderRadius: 8, marginBottom: 4
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step.status === 'success' ? '#22C55E20' : '#EF444420'
                }}>
                  {simulating && visibleSteps === i + 1 ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                      <Loader2 size={16} color="#A78BFA" />
                    </motion.div>
                  ) : step.status === 'success' ? (
                    <CheckCircle2 size={16} color="#22C55E" />
                  ) : (
                    <XCircle size={16} color="#EF4444" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#F8FAFC' }}>{step.action}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{step.details}</div>
                </div>
                <span style={{ fontSize: 11, color: step.status === 'success' ? '#22C55E' : '#EF4444', fontWeight: 600 }}>
                  {step.status.toUpperCase()}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {/* Result Banner */}
      {(!simulating || visibleSteps >= execution.steps.length) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          style={{
            background: execution.atomic_success ? 'linear-gradient(135deg, #22C55E10, #22C55E05)' : 'linear-gradient(135deg, #EF444410, #EF444405)',
            border: `1px solid ${execution.atomic_success ? '#22C55E40' : '#EF444440'}`,
            borderRadius: 10, padding: 20, textAlign: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <Shield size={24} color={execution.atomic_success ? '#22C55E' : '#EF4444'} />
            <span style={{ fontSize: 18, fontWeight: 800, color: execution.atomic_success ? '#22C55E' : '#EF4444' }}>
              {execution.atomic_success ? 'POSITION PROTECTED' : 'RESCUE ABORTED'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>
            Transaction: {execution.transaction_status} | Atomic: {execution.atomic_success ? 'SUCCESS' : 'REVERTED'}
          </div>
          {safetyVerification && execution.atomic_success && (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#EF4444' }}>{safetyVerification.hf_before.toFixed(3)}</span>
              <span style={{ fontSize: 16, color: '#A78BFA' }}>→</span>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#22C55E' }}>{safetyVerification.hf_after.toFixed(3)}</span>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default ExecutionSimulation;
