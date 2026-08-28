import React from 'react';
import { ShieldCheck, XCircle, CheckCircle2, AlertOctagon } from 'lucide-react';
import { SafetyGateResult } from '../types';

interface SafetyGateProps {
  safetyGate?: SafetyGateResult;
}

export const SafetyGate: React.FC<SafetyGateProps> = ({ safetyGate }) => {
  if (!safetyGate) return null;

  return (
    <div className="card-prism">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-prism-purple-bright" />
          <h3 className="text-sm font-semibold text-white">PRE-EXECUTION SAFETY GATE</h3>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
            safetyGate.all_passed
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}
        >
          {safetyGate.all_passed ? '✓ ALL CHECKS PASSED' : '✗ CHECKS FAILED — ABORT'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {safetyGate.checks.map((chk, i) => (
          <div
            key={i}
            className={`p-2.5 rounded-lg border font-mono text-xs flex items-start gap-2 ${
              chk.passed
                ? 'bg-surface-secondary/40 border-border/60 text-slate-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {chk.passed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className={`font-semibold text-[11px] ${chk.passed ? 'text-white' : 'text-red-400'}`}>
                {chk.name}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{chk.details}</div>
            </div>
          </div>
        ))}
      </div>

      {!safetyGate.all_passed && safetyGate.blocking_check && (
        <div className="mt-3 p-2.5 rounded bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-300 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 flex-shrink-0 text-red-400" />
          <span>Execution blocked by failed check: <strong>{safetyGate.blocking_check}</strong></span>
        </div>
      )}
    </div>
  );
};
