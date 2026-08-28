import React from 'react';
import { ShieldCheck, ShieldAlert, AlertOctagon, Play, Sparkles } from 'lucide-react';
import { DecisionType } from '../types';

interface PRISMDecisionProps {
  decision: DecisionType;
  onTriggerRescue: () => void;
  isSimulating: boolean;
  autonomousProtection: boolean;
  hasPosition: boolean;
}

export const PRISMDecision: React.FC<PRISMDecisionProps> = ({
  decision,
  onTriggerRescue,
  isSimulating,
  autonomousProtection,
  hasPosition,
}) => {
  if (!hasPosition) return null;

  const getDecisionConfig = () => {
    switch (decision) {
      case 'RESCUE':
        return {
          title: 'PRISM RECOMMENDATION: SIMULATE RESCUE',
          subtitle: 'Position projected to enter liquidation boundary. Selected rescue strategy is economically viable and safety checks pass.',
          badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40',
          borderColor: 'border-red-500/40 glow-danger',
          icon: <ShieldAlert className="w-8 h-8 text-red-400" />,
          actionButton: true,
          buttonText: 'EXECUTE SIMULATED ATOMIC RESCUE',
          buttonClass: 'bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white',
        };
      case 'ABORT':
        return {
          title: 'PRISM RECOMMENDATION: ABORT RESCUE',
          subtitle: 'Rescue is not economically justified or safety constraints failed. PRISM will not execute simulated rescue.',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          borderColor: 'border-amber-500/40',
          icon: <AlertOctagon className="w-8 h-8 text-amber-400" />,
          actionButton: false,
          buttonText: 'RESCUE ABORTED BY SAFETY ENGINE',
          buttonClass: 'bg-slate-800 text-slate-500 cursor-not-allowed',
        };
      case 'MONITOR':
      default:
        return {
          title: 'PRISM DECISION: CONTINUOUS MONITORING',
          subtitle: 'Position operates comfortably within safe buffer parameters. Continuous real-time blockchain monitoring active.',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          borderColor: 'border-emerald-500/40 glow-safe',
          icon: <ShieldCheck className="w-8 h-8 text-emerald-400" />,
          actionButton: false,
          buttonText: 'POSITION SAFE — MONITORING',
          buttonClass: 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 cursor-default',
        };
    }
  };

  const cfg = getDecisionConfig();

  return (
    <div className={`card-prism border-2 ${cfg.borderColor} mb-6`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-surface-secondary border border-border/80 flex-shrink-0">
            {cfg.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase ${cfg.badgeBg}`}>
                DECISION: {decision}
              </span>
              {autonomousProtection && decision === 'RESCUE' && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  ⚡ Autonomous Trigger Ready
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">{cfg.title}</h3>
            <p className="text-xs font-mono text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {cfg.subtitle}
            </p>
          </div>
        </div>

        {/* Action Button */}
        {cfg.actionButton && (
          <div className="flex-shrink-0">
            <button
              onClick={onTriggerRescue}
              disabled={isSimulating}
              className={`w-full md:w-auto px-6 py-3 rounded-xl font-mono text-xs font-bold tracking-wider transition-all duration-200 shadow-lg flex items-center justify-center gap-2 ${cfg.buttonClass}`}
            >
              {isSimulating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>SIMULATING RESCUE STEPS...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>{cfg.buttonText}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
