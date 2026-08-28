import React from 'react';
import { X, CheckCircle2, AlertTriangle, RotateCcw, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { RescueResult } from '../types';

interface RescueSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  result?: RescueResult;
  isExecuting: boolean;
}

export const RescueSimulationModal: React.FC<RescueSimulationModalProps> = ({
  isOpen,
  onClose,
  result,
  isExecuting,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="card-prism max-w-2xl w-full border-2 border-prism-purple/50 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-prism-purple/20 border border-prism-purple/40 flex items-center justify-center text-prism-purple-bright">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                SIMULATED ATOMIC RESCUE EXECUTION
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                READ-ONLY SANDBOX • ZERO REAL ON-CHAIN TRANSACTIONS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-surface-secondary text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 overflow-y-auto space-y-3 font-mono text-xs flex-1">
          {isExecuting && (
            <div className="py-8 text-center">
              <div className="w-10 h-10 border-3 border-prism-purple/30 border-t-prism-purple rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-300 font-semibold">Executing atomic simulation pipeline...</p>
              <p className="text-[11px] text-slate-500 mt-1">Simulating temporary liquidity, debt repayment, collateral swap, and verification</p>
            </div>
          )}

          {result && (
            <>
              {/* Execution Outcome Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center gap-3 ${
                  result.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                {result.success ? (
                  <ShieldCheck className="w-6 h-6 flex-shrink-0 text-emerald-400" />
                ) : (
                  <RotateCcw className="w-6 h-6 flex-shrink-0 text-red-400 animate-spin" />
                )}
                <div>
                  <div className="font-bold text-sm">
                    {result.success ? 'POSITION PROTECTED (SIMULATED)' : 'TRANSACTION REVERTED — ROLLBACK COMMITTED'}
                  </div>
                  <div className="text-[11px] text-slate-200 mt-0.5">{result.message}</div>
                </div>
              </div>

              {/* Health Factor Delta */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-surface-secondary border border-border/80 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 block">ORIGINAL HEALTH FACTOR</span>
                  <span className="text-lg font-bold text-red-400">{result.original_health_factor.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">POST-SIMULATION HEALTH FACTOR</span>
                  <span className={`text-lg font-bold ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {result.final_health_factor.toFixed(3)}
                  </span>
                </div>
              </div>

              {/* Step by Step Execution Trace */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-2">
                  ATOMIC TRANSACTION SEQUENCE ({result.steps.length} STEPS):
                </div>
                <div className="space-y-1.5">
                  {result.steps.map((st) => (
                    <div
                      key={st.step}
                      className={`p-2 rounded border flex items-start gap-2 text-[11px] ${
                        st.status === 'DONE'
                          ? 'bg-surface-secondary/40 border-border/60 text-slate-300'
                          : st.status === 'FAILED'
                          ? 'bg-red-500/10 border-red-500/30 text-red-300'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}
                    >
                      <div className="w-4 text-slate-500 font-bold">{st.step}.</div>
                      <div className="flex-1">
                        <div className="font-semibold text-white flex items-center justify-between">
                          <span>{st.name}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                              st.status === 'DONE'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : st.status === 'FAILED'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {st.status}
                          </span>
                        </div>
                        {st.details && <div className="text-[10px] text-slate-400 mt-0.5">{st.details}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface-secondary hover:bg-surface-secondary/80 border border-border text-white text-xs font-mono font-medium transition-colors"
          >
            CLOSE SIMULATION TRACE
          </button>
        </div>
      </div>
    </div>
  );
};
