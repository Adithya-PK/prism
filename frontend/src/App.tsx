import React, { useState, useEffect, useCallback, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { Shield, AlertTriangle, RefreshCw } from 'lucide-react';

// Import both dashboards
import SimulationDashboard from './components/SimulationDashboard';
import { Header } from './components/Header';
import { WalletInput } from './components/WalletInput';
import { TopMetrics } from './components/TopMetrics';
import { WalletPanel } from './components/WalletPanel';
import { DeFiPositionPanel } from './components/DeFiPositionPanel';
import { HealthFactorChart } from './components/HealthFactorChart';
import { PredictiveRiskPanel } from './components/PredictiveRiskPanel';
import { DynamicSafetyPanel } from './components/DynamicSafetyPanel';
import { InterventionPanel } from './components/InterventionPanel';
import { StrategyComparison } from './components/StrategyComparison';
import { EconomicsPanel } from './components/EconomicsPanel';
import { SafetyGate } from './components/SafetyGate';
import { PRISMDecision } from './components/PRISMDecision';
import { RescueSimulationModal } from './components/RescueSimulationModal';
import { ActivityTimeline } from './components/ActivityTimeline';
import { GeminiExplanationPanel } from './components/GeminiExplanationPanel';
import { MarketFeedPanel } from './components/MarketFeedPanel';
import { FlashVaultInspector } from './components/FlashVaultInspector';

import { fetchDashboard, simulateRescue } from './services/api';
import { DashboardResponse, RescueResult } from './types';
import { ArrowLeft, Sparkles } from 'lucide-react';

// ─── Error Boundary ──────────────────────────────────────────────────────────
interface ErrorBoundaryProps { children: ReactNode; fallbackText?: string; onReset?: () => void; }
interface ErrorBoundaryState { hasError: boolean; error?: Error; }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error('PRISM UI Error:', error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="card-prism max-w-lg mx-auto my-12 p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-2">Display Notice</h3>
          <p className="text-xs font-mono text-slate-300 mb-4">{this.props.fallbackText || 'A component encountered a rendering issue.'}</p>
          <button onClick={() => { this.setState({ hasError: false }); if (this.props.onReset) this.props.onReset(); }}
            className="px-4 py-2 rounded-lg bg-prism-purple text-white text-xs font-mono font-bold">
            Reset View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Main App Mode ────────────────────────────────────────────────────────────
type AppMode = 'SIMULATION' | 'WALLET';

export function App() {
  const [appMode, setAppMode] = useState<AppMode>('SIMULATION');
  const [activeAddress, setActiveAddress] = useState<string>('');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoScenario, setDemoScenario] = useState<string>('SUCCESSFUL_RESCUE');
  const [autonomousProtection, setAutonomousProtection] = useState<boolean>(false);

  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [isSimModalOpen, setIsSimModalOpen] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<RescueResult | undefined>(undefined);

  const lastAutonomousRunRef = useRef<string>('');

  // Load dashboard data
  const loadDashboard = useCallback(async (address: string, demo: boolean, scenario: string, isSilent = false) => {
    if (!address) return;
    if (!isSilent) setIsLoading(true); else setIsRefreshing(true);
    setErrorMessage('');
    try {
      const data = await fetchDashboard(address, demo, scenario, true);
      setDashboardData(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect to blockchain backend');
    } finally {
      setIsLoading(false); setIsRefreshing(false);
    }
  }, []);

  const handleLoadWallet = (address: string) => {
    setActiveAddress(address); setIsDemoMode(false); setAppMode('WALLET');
    loadDashboard(address, false, 'SUCCESSFUL_RESCUE');
  };

  const handleSelectDemo = (scenario: string) => {
    setActiveAddress('DEMO'); setIsDemoMode(true); setDemoScenario(scenario); setAppMode('WALLET');
    loadDashboard('DEMO', true, scenario);
  };

  useEffect(() => {
    if (!activeAddress || appMode !== 'WALLET') return;
    const interval = setInterval(() => loadDashboard(activeAddress, isDemoMode, demoScenario, true), 10000);
    return () => clearInterval(interval);
  }, [activeAddress, isDemoMode, demoScenario, loadDashboard, appMode]);

  const handleTriggerRescue = async (forceAbort = false) => {
    if (!dashboardData?.defi_position || !dashboardData?.intervention || !dashboardData?.safety) return;
    setIsSimModalOpen(true); setIsSimulating(true); setSimulationResult(undefined);
    try {
      const res = await simulateRescue(dashboardData.defi_position, dashboardData.strategies, dashboardData.intervention, dashboardData.safety, forceAbort || demoScenario === 'SAFE_ABORT');
      setSimulationResult(res);
    } catch (err: any) {
      setSimulationResult({
        success: false, simulated: true, steps: [],
        original_health_factor: dashboardData.defi_position.health_factor,
        final_health_factor: dashboardData.defi_position.health_factor,
        position_changed: false, rollback_triggered: true,
        rollback_reason: err.message || 'Simulation execution error',
        message: `Execution failed: ${err.message || 'Simulation error'}`,
      });
    } finally { setIsSimulating(false); }
  };

  useEffect(() => {
    if (!autonomousProtection || !dashboardData) return;
    if (dashboardData.decision === 'RESCUE' && dashboardData.safety_gate?.all_passed) {
      const runKey = `${dashboardData.timestamp}-${dashboardData.decision}`;
      if (lastAutonomousRunRef.current !== runKey && !isSimModalOpen) {
        lastAutonomousRunRef.current = runKey; handleTriggerRescue();
      }
    }
  }, [autonomousProtection, dashboardData, isSimModalOpen]);

  // ── SIMULATION MODE (primary default) ──
  if (appMode === 'SIMULATION') {
    return (
      <ErrorBoundary onReset={() => setAppMode('SIMULATION')}>
        <div className="relative">
          {/* Mode switcher overlay */}
          <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
            <button
              onClick={() => { setAppMode('WALLET'); setActiveAddress(''); setDashboardData(null); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-900/80 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold backdrop-blur-sm hover:bg-purple-800/80 transition-colors shadow-lg"
            >
              <Sparkles className="w-3.5 h-3.5" />
              LIVE WALLET MODE
            </button>
          </div>
          <SimulationDashboard />
        </div>
      </ErrorBoundary>
    );
  }

  // ── WALLET MODE (live blockchain) ──
  if (!activeAddress) {
    return (
      <div className="min-h-screen bg-background text-slate-100 flex flex-col justify-between">
        <Header
          mode="LIVE" network="Ethereum Mainnet" address=""
          autonomousProtection={autonomousProtection} onToggleAutonomous={setAutonomousProtection}
          lastUpdated="" isRefreshing={false} onManualRefresh={() => {}} dataSource="Alchemy / CoinGecko"
        />
        <main className="flex-1 flex flex-col items-center justify-center gap-4">
          <button onClick={() => setAppMode('SIMULATION')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-secondary border border-border text-slate-300 text-xs font-mono hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            BACK TO SIMULATION MODE
          </button>
          <WalletInput onLoadWallet={handleLoadWallet} onSelectDemo={handleSelectDemo} isLoading={isLoading} errorMessage={errorMessage} />
        </main>
        <footer className="border-t border-border/60 py-4 text-center text-xs font-mono text-slate-400">
          PRISM • Autonomous Liquidation Shield • Simulation Mode First
        </footer>
      </div>
    );
  }

  if (isLoading && !dashboardData) {
    return (
      <div className="min-h-screen bg-background text-slate-100 flex flex-col justify-between">
        <Header mode={isDemoMode ? 'DEMO' : 'LIVE'} network="Ethereum Mainnet" address={activeAddress}
          autonomousProtection={autonomousProtection} onToggleAutonomous={setAutonomousProtection}
          lastUpdated="" isRefreshing={true} onManualRefresh={() => {}} dataSource="Alchemy / CoinGecko" />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="card-prism glow-purple max-w-md w-full text-center py-10 px-6">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-prism-purple/30 animate-ping" />
              <div className="relative w-16 h-16 rounded-full bg-surface-secondary border-2 border-prism-purple flex items-center justify-center text-prism-purple-bright">
                <Shield className="w-8 h-8" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">DISCOVERING BLOCKCHAIN DATA</h3>
            <p className="text-xs font-mono text-slate-400">Scanning Ethereum for {(activeAddress || '').slice(0, 6)}...{(activeAddress || '').slice(-4)}</p>
          </div>
        </main>
      </div>
    );
  }

  const hf = dashboardData?.defi_position?.health_factor ?? 999;
  const predHf = dashboardData?.prediction?.predicted_health_factor ?? hf;
  const targetHf = dashboardData?.safety?.target_health_factor ?? 1.20;

  return (
    <ErrorBoundary onReset={() => setActiveAddress('')}>
      <div className="min-h-screen bg-background text-slate-100 flex flex-col justify-between">
        <Header mode={isDemoMode ? 'DEMO' : 'LIVE'} network="Ethereum Mainnet" address={activeAddress}
          autonomousProtection={autonomousProtection} onToggleAutonomous={setAutonomousProtection}
          lastUpdated={dashboardData?.timestamp || ''} isRefreshing={isRefreshing}
          onManualRefresh={() => loadDashboard(activeAddress, isDemoMode, demoScenario, true)}
          dataSource={dashboardData?.data_sources?.blockchain || 'Alchemy / CoinGecko'} />

        <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 w-full flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-border/80">
            <button onClick={() => { setActiveAddress(''); setDashboardData(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-secondary hover:bg-surface border border-border text-xs font-mono text-slate-300 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>CHANGE WALLET</span>
            </button>
            <button onClick={() => setAppMode('SIMULATION')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/50 border border-purple-500/40 text-xs font-mono text-purple-300 hover:text-white transition-colors">
              <Shield className="w-3.5 h-3.5" />
              SIMULATION MODE
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 hidden sm:inline">Demo Modes:</span>
              {(['SUCCESSFUL_RESCUE', 'SAFE_ABORT'] as const).map((s) => (
                <button key={s} onClick={() => handleSelectDemo(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors border ${isDemoMode && demoScenario === s ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold' : 'bg-surface-secondary text-slate-400 border-border hover:text-white'}`}>
                  {s === 'SUCCESSFUL_RESCUE' ? '1. Successful Rescue' : '2. Safe Abort'}
                </button>
              ))}
            </div>
          </div>

          <TopMetrics portfolioValue={dashboardData?.portfolio?.total_value_usd ?? 0} collateralValue={dashboardData?.defi_position?.total_collateral_value_usd ?? 0} debtValue={dashboardData?.defi_position?.total_debt_value_usd ?? 0} healthFactor={hf} riskLevel={dashboardData?.risk?.risk_level} riskScore={dashboardData?.risk?.risk_score} hasPosition={dashboardData?.has_position ?? false} />
          <PRISMDecision decision={dashboardData?.decision ?? 'MONITOR'} onTriggerRescue={() => handleTriggerRescue()} isSimulating={isSimulating} autonomousProtection={autonomousProtection} hasPosition={dashboardData?.has_position ?? false} />

          {dashboardData?.market && (<div className="mb-6"><MarketFeedPanel market={dashboardData.market} /></div>)}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            <div className="lg:col-span-7 space-y-6">
              {dashboardData?.has_position && (<HealthFactorChart currentHf={hf} predictedHf={predHf} targetHf={targetHf} liquidationBoundary={1.0} />)}
              <DeFiPositionPanel position={dashboardData?.defi_position} onLoadDemo={handleSelectDemo} positionSource={dashboardData?.defi_position_source ?? 'N/A'} />
              {dashboardData?.has_position && (<PredictiveRiskPanel prediction={dashboardData?.prediction} risk={dashboardData?.risk} />)}
              {dashboardData?.has_position && (<DynamicSafetyPanel safety={dashboardData?.safety} currentHf={hf} />)}
            </div>
            <div className="lg:col-span-5 space-y-6">
              <GeminiExplanationPanel explanation={dashboardData?.explanation} source={dashboardData?.explanation_source} isLoading={isLoading} />
              <WalletPanel tokens={dashboardData?.wallet?.tokens ?? []} totalValue={dashboardData?.portfolio?.total_value_usd ?? 0} ethBalance={dashboardData?.wallet?.eth_balance ?? 0} source={dashboardData?.wallet?.source?.name ?? 'Alchemy / Ethereum'} />
              {dashboardData?.has_position && (<InterventionPanel intervention={dashboardData?.intervention} />)}
              {dashboardData?.has_position && (<SafetyGate safetyGate={dashboardData?.safety_gate} />)}
              <ActivityTimeline activities={dashboardData?.activity ?? []} />
            </div>
          </div>

          {dashboardData?.has_position && (<div className="mb-6"><FlashVaultInspector intervention={dashboardData?.intervention} selectedStrategy={dashboardData?.strategies?.find((s) => s.is_selected)} borrowerAddress={activeAddress} /></div>)}
          {dashboardData?.has_position && (<div className="space-y-6 mb-6"><StrategyComparison strategies={dashboardData?.strategies ?? []} /><EconomicsPanel economics={dashboardData?.economics} /></div>)}
        </main>

        <RescueSimulationModal isOpen={isSimModalOpen} onClose={() => setIsSimModalOpen(false)} result={simulationResult} isExecuting={isSimulating} />

        <footer className="border-t border-border/80 py-4 px-4 text-center text-xs font-mono text-slate-400 bg-surface/50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>PRISM — Autonomous Liquidation Shield</span>
            <span className="text-purple-400">READ-ONLY • SIMULATED ATOMIC RESCUE • ZERO ASSET RISKS</span>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
