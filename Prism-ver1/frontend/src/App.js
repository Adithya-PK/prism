import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Header from './components/Header';
import PositionCard from './components/PositionCard';
import RiskPanel from './components/RiskPanel';
import SafetyPanel from './components/SafetyPanel';
import InterventionPanel from './components/InterventionPanel';
import StrategyComparison from './components/StrategyComparison';
import EconomicsPanel from './components/EconomicsPanel';
import ExecutionSimulation from './components/ExecutionSimulation';
import WhatIfSimulator from './components/WhatIfSimulator';
import ExplanationPanel from './components/ExplanationPanel';

const API = 'http://localhost:8000';

function App() {
  const [result, setResult] = useState(null);
  const [demoRequest, setDemoRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState(null);

  // Fetch demo data on mount
  useEffect(() => {
    const init = async () => {
      try {
        const resp = await axios.get(`${API}/api/health`);
        if (resp.data.status === 'ok') {
          setConnected(true);
          const demoResp = await axios.get(`${API}/api/demo`);
          setDemoRequest(demoResp.data);
          // Auto-analyze
          setLoading(true);
          const analysisResp = await axios.post(`${API}/api/analyze`, demoResp.data);
          setResult(analysisResp.data);
          setLoading(false);
        }
      } catch (e) {
        setError('Cannot connect to PRISM backend. Make sure the server is running on port 8000.');
        setConnected(false);
      }
    };
    init();
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!demoRequest) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await axios.post(`${API}/api/analyze`, demoRequest);
      setResult(resp.data);
    } catch (e) {
      setError('Analysis failed. Check backend connection.');
    }
    setLoading(false);
  }, [demoRequest]);

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'whatif', label: '🔬 What-If Simulator' },
    { id: 'strategy', label: '⚡ Strategy Comparison' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#080A12' }}>
      <Header connected={connected} />

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 0, padding: '0 32px', background: '#10131F', borderBottom: '1px solid #252A3A' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: 'transparent',
              color: activeTab === tab.id ? '#A78BFA' : '#94A3B8',
              borderBottom: activeTab === tab.id ? '2px solid #8B5CF6' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={{
            margin: '6px 0', padding: '8px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: loading ? '#252A3A' : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
            color: '#fff', fontSize: 13, fontWeight: 600, transition: 'all 0.2s'
          }}
        >
          {loading ? '⏳ Analyzing...' : '🔍 Analyze Position'}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ margin: '16px 32px', padding: '12px 20px', background: '#EF444420', border: '1px solid #EF4444', borderRadius: 8, color: '#EF4444', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Main Content */}
      <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Row 1: Position + Risk */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <PositionCard result={result} position={demoRequest?.position} />
              <RiskPanel risk={result?.risk} />
            </div>

            {/* Row 2: Safety + Intervention */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <SafetyPanel safety={result?.safety} currentHF={result?.risk?.health_factor} />
              <InterventionPanel intervention={result?.intervention} safety={result?.safety} />
            </div>

            {/* Row 3: Economics */}
            <EconomicsPanel economics={result?.economics} />

            {/* Row 4: Execution */}
            <ExecutionSimulation execution={result?.execution} safetyVerification={result?.safety_verification} />

            {/* Row 5: Explanation */}
            <ExplanationPanel explanation={result?.explanation} />
          </div>
        )}

        {activeTab === 'whatif' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <WhatIfSimulator baseRequest={demoRequest} onResult={setResult} />
            {/* Show results below */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <RiskPanel risk={result?.risk} />
              <SafetyPanel safety={result?.safety} currentHF={result?.risk?.health_factor} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <InterventionPanel intervention={result?.intervention} safety={result?.safety} />
              <EconomicsPanel economics={result?.economics} />
            </div>
            <ExecutionSimulation execution={result?.execution} safetyVerification={result?.safety_verification} />
            <ExplanationPanel explanation={result?.explanation} />
          </div>
        )}

        {activeTab === 'strategy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <PositionCard result={result} position={demoRequest?.position} />
              <StrategyComparison strategyComparison={result?.strategy_comparison} />
            </div>
            <EconomicsPanel economics={result?.economics} />
            <ExplanationPanel explanation={result?.explanation} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '24px', borderTop: '1px solid #252A3A', marginTop: 40 }}>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>PRISM — Predictive Risk Intelligence & Smart Protection for DeFi</span>
        <span style={{ fontSize: 12, color: '#8B5CF6', marginLeft: 12 }}>Predict. Protect. Preserve.</span>
      </div>
    </div>
  );
}

export default App;
