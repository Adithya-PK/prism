import React from 'react';
import { Bot, Sparkles, AlertCircle } from 'lucide-react';

interface GeminiExplanationPanelProps {
  explanation?: string;
  source?: string;
  isLoading?: boolean;
}

export const GeminiExplanationPanel: React.FC<GeminiExplanationPanelProps> = ({
  explanation,
  source = 'Gemini',
  isLoading = false,
}) => {
  return (
    <div className="card-prism border-prism-purple/40 glow-purple">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-prism-purple/20 flex items-center justify-center text-prism-purple-bright">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-semibold text-white">WHY PRISM? (EXPLAINABILITY LAYER)</h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-secondary text-purple-300 border border-border">
          {source} Explainer
        </span>
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-xs font-mono text-slate-400">
          <div className="w-5 h-5 border-2 border-prism-purple/30 border-t-prism-purple rounded-full animate-spin mx-auto mb-2" />
          Generating AI risk explanation from deterministic backend decisions...
        </div>
      ) : explanation ? (
        <div className="p-3.5 rounded-lg bg-surface-secondary/70 border border-border/80 text-xs font-mono text-slate-200 leading-relaxed">
          {explanation}
        </div>
      ) : (
        <div className="py-4 text-center text-slate-500 text-xs font-mono">
          Explanation will generate when risk analysis completes.
        </div>
      )}

      <div className="mt-2 text-[10px] font-mono text-slate-500 flex items-center justify-between">
        <span>Architecture: Deterministic Backend Engines → Structured Result → LLM Synthesis</span>
        <span className="text-purple-400">Read-Only Decision System</span>
      </div>
    </div>
  );
};
