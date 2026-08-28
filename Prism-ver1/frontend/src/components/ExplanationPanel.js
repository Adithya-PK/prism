import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

const ExplanationPanel = ({ explanation }) => {
  if (!explanation) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
      style={{ background: '#10131F', border: '1px solid #8B5CF640', borderRadius: 12, padding: 24, boxShadow: '0 0 30px #8B5CF610' }}
    >
      <h3 style={{ fontSize: 14, color: '#A78BFA', marginBottom: 16, fontWeight: 600, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <MessageSquare size={16} color="#A78BFA" /> WHY PRISM? — AI EXPLANATION
      </h3>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: '#CBD5E1' }}>
        {explanation.split('\n\n').map((para, i) => (
          <p key={i} style={{ marginBottom: 14 }}>{para}</p>
        ))}
      </div>
    </motion.div>
  );
};

export default ExplanationPanel;
