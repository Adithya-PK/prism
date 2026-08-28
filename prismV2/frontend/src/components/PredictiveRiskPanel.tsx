import React from 'react';
import { Eye, TrendingDown, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';
import { PredictiveRisk, RiskAssessment } from '../types';

interface PredictiveRiskPanelProps {
  prediction?: PredictiveRisk;
  risk?: RiskAssessment;
}

export const PredictiveRiskPanel: React.FC<PredictiveRiskPanelProps> = ({
  prediction,
  risk,
}) => {
  if (!prediction || !risk) return null;

  const isDeteriorating = prediction.predicted_health_factor < prediction.current_health_factor;

  return (
    <div className="card-prism">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-prism-purple-bright" />
          <h3 className="text-sm font-semibold text-white">PREDICTIVE RISK INTELLIGENCE</h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-secondary text-purple-300 border border-border">
          PRISM Risk Model
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 font-mono">
        <div className="card-prism-secondary">
          <span className="text-[10px] text-slate-400 block mb-0.5">CURRENT HF</span>
          <span className="text-lg font-bold text-white">{prediction.current_health_factor.toFixed(3)}</span>
        </div>
        <div className="card-prism-secondary">
          <span className="text-[10px] text-slate-400 block mb-0.5">PROJECTED HF ({prediction.prediction_horizon})</span>
          <span className={`text-lg font-bold ${isDeteriorating ? 'text-red-400' : 'text-emerald-400'}`}>
            {prediction.predicted_health_factor.toFixed(3)}
          </span>
        </div>
        <div className="card-prism-secondary">
          <span className="text-[10px] text-slate-400 block mb-0.5">LIQUIDATION PROBABILITY</span>
          <span className={`text-lg font-bold ${prediction.liquidation_probability > 0.5 ? 'text-red-400' : 'text-amber-400'}`}>
            {(prediction.liquidation_probability * 100).toFixed(1)}%
          </span>
          <span className="text-[9px] text-slate-400 block mt-0.5">PRISM Estimate</span>
        </div>
        <div className="card-prism-secondary">
          <span className="text-[10px] text-slate-400 block mb-0.5">MODEL CONFIDENCE</span>
          <span className="text-lg font-bold text-purple-300">{(prediction.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Scenario Breakdown */}
      <div className="p-3 rounded-lg bg-surface-secondary/70 border border-border/70 text-xs font-mono mb-3">
        <div className="text-slate-400 text-[11px] mb-1 font-semibold">SCENARIO PROJECTION:</div>
        <div className="text-slate-200">{prediction.scenario_description}</div>
      </div>

      {/* Risk Factors */}
      {risk.risk_factors.length > 0 && (
        <div>
          <div className="text-[11px] font-mono text-slate-400 mb-1.5 font-semibold">IDENTIFIED RISK DRIVERS:</div>
          <div className="flex flex-wrap gap-1.5">
            {risk.risk_factors.map((factor, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20"
              >
                <AlertTriangle className="w-3 h-3 text-red-400" />
                {factor}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
