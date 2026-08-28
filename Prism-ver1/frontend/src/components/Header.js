import React from 'react';
import { Shield } from 'lucide-react';
import { motion } from 'framer-motion';

const Header = ({ connected }) => (
  <motion.header
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 32px', borderBottom: '1px solid #252A3A', background: '#10131F'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Shield size={28} color="#fff" />
      </div>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: 2, color: '#F8FAFC', margin: 0 }}>PRISM</h1>
        <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, letterSpacing: 1 }}>PREDICTIVE RISK INTELLIGENCE & SMART PROTECTION</p>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 13, color: '#A78BFA', fontWeight: 600, letterSpacing: 1.5 }}>Predict. Protect. Preserve.</span>
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: connected ? '#22C55E' : '#EF4444',
        boxShadow: connected ? '0 0 8px #22C55E' : '0 0 8px #EF4444'
      }} />
    </div>
  </motion.header>
);

export default Header;
