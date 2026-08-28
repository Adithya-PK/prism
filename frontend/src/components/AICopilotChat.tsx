import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Trash2, Shield, Zap, Calculator, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  source?: string;
  timestamp: string;
}

interface AICopilotChatProps {
  contextData: any;
}

const QUICK_PROMPTS = [
  'How is the exact minimum repayment calculated?',
  'Explain the ML liquidation risk prediction & features',
  'How does the 14-step flash loan rescue work?',
  'Why is the Economic Viability Gate approved?',
  'Explain the Health Factor formula and liquidation boundaries',
];

// Rich text formatter for formatted math, code blocks, bold text, and bullets
const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  // Split content into blocks (code blocks vs text blocks)
  const blocks = content.split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$)/g);

  return (
    <div className="space-y-2 text-xs font-mono leading-relaxed">
      {blocks.map((block, idx) => {
        if (!block) return null;

        // Math block ```math ... ``` or $$ ... $$
        if (block.startsWith('```math') || block.startsWith('```') || block.startsWith('$$')) {
          const rawFormula = block
            .replace(/^```math\n?/, '')
            .replace(/^```\n?/, '')
            .replace(/\n?```$/, '')
            .replace(/^\$\$\n?/, '')
            .replace(/\n?\$\$$/, '')
            .trim();

          return (
            <div
              key={idx}
              className="my-2 p-3 rounded-lg bg-slate-900/90 border border-purple-500/40 text-purple-200 shadow-inner font-mono text-[11px] overflow-x-auto"
            >
              <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-purple-400 font-bold mb-1.5 pb-1 border-b border-purple-500/20">
                <Calculator className="w-3 h-3 text-purple-400" />
                <span>FORMULA & SOLVER DERIVATION</span>
              </div>
              <pre className="whitespace-pre font-mono text-emerald-300 leading-normal">{rawFormula}</pre>
            </div>
          );
        }

        // Regular text block - process lines
        const lines = block.split('\n');
        return (
          <div key={idx} className="space-y-1">
            {lines.map((line, lineIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lineIdx} className="h-1" />;

              // Bullet points
              if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('* ')) {
                const bulletContent = trimmed.replace(/^[•\-\*]\s*/, '');
                return (
                  <div key={lineIdx} className="flex items-start gap-2 pl-1 py-0.5">
                    <span className="text-purple-400 font-bold mt-0.5 select-none">•</span>
                    <span className="text-slate-200 flex-1">{renderInlineText(bulletContent)}</span>
                  </div>
                );
              }

              // Horizontal divider
              if (trimmed.startsWith('────') || trimmed.startsWith('---')) {
                return <hr key={lineIdx} className="border-border/60 my-1.5" />;
              }

              // Regular paragraph
              return (
                <p key={lineIdx} className="text-slate-200">
                  {renderInlineText(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// Helper to format inline bold, numbers, highlights
function renderInlineText(text: string): React.ReactNode[] {
  // Regex to split by **bold**, `code`, and currency/percent highlights
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      return (
        <strong key={i} className="text-white font-bold font-mono">
          {inner}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      const inner = part.slice(1, -1);
      return (
        <code key={i} className="px-1 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[10px]">
          {inner}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export const AICopilotChat: React.FC<AICopilotChatProps> = ({ contextData }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am the **PRISM Risk Copilot**. I have full real-time telemetry on your position, ML features, closed-form formulas, and flash loan mechanics. Ask me anything about this position or how PRISM protects capital!",
      source: 'PRISM Knowledge Engine',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/simulation/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          context: contextData || {},
          history: messages.slice(-6).map(m => ({ sender: m.sender, text: m.text })),
        }),
      });

      if (!res.ok) throw new Error('Chat request failed');
      const data = await res.json();

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'Analysis completed.',
        source: data.source || 'PRISM AI Layer',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sender: 'assistant',
        text: "PRISM Risk Copilot: Health Factor is currently monitored. For the current position, PRISM calculates minimum debt repayment using closed-form algebra to restore target solvency while avoiding liquidation penalties.",
        source: 'PRISM Offline Fallback',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: "Chat cleared. What would you like to analyze about the current position, formulas, or execution pipeline?",
        source: 'PRISM Knowledge Engine',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="card-prism p-4 border-purple-500/40 flex flex-col h-[480px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shadow-md shadow-purple-500/20">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white tracking-wide">PRISM RISK COPILOT</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300">
                AI REASONING
              </span>
            </div>
            <p className="text-[9px] font-mono text-slate-400">Context-Aware DeFi Quantitative Assistant</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClear}
          title="Clear Conversation"
          className="p-1.5 rounded-lg bg-surface-secondary hover:bg-slate-800 border border-border text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
        {QUICK_PROMPTS.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSend(p)}
            className="text-[10px] font-mono whitespace-nowrap px-2.5 py-1 rounded-full bg-surface-secondary/80 hover:bg-purple-900/30 border border-border hover:border-purple-500/50 text-slate-300 hover:text-purple-200 transition-all cursor-pointer flex-shrink-0"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 font-mono text-xs">
        {messages.map(m => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1">
              {m.sender === 'user' ? (
                <>
                  <span className="text-[9px] text-slate-500">{m.timestamp}</span>
                  <span className="text-[10px] text-purple-300 font-bold">You</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span className="text-[10px] text-purple-300 font-bold">PRISM Copilot</span>
                  {m.source && (
                    <span className="text-[8px] px-1.5 py-0.2 rounded bg-surface-secondary text-slate-400 border border-border/60">
                      {m.source}
                    </span>
                  )}
                  <span className="text-[9px] text-slate-500">{m.timestamp}</span>
                </>
              )}
            </div>

            <div
              className={`p-3 rounded-xl max-w-[95%] leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-purple-600 text-white rounded-tr-none shadow-md shadow-purple-600/20'
                  : 'bg-surface-secondary border border-border/80 text-slate-200 rounded-tl-none shadow-inner'
              }`}
            >
              {m.sender === 'user' ? (
                <div className="font-mono text-xs whitespace-pre-wrap">{m.text}</div>
              ) : (
                <FormattedMessage content={m.text} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <Sparkles className="w-3 h-3 text-purple-400 animate-spin" />
              <span className="text-[10px] text-purple-300 font-bold">PRISM Copilot is calculating...</span>
            </div>
            <div className="p-3 rounded-xl bg-surface-secondary border border-border/80 text-slate-400 rounded-tl-none flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-[10px] text-slate-400 ml-1">Deriving formulas and analyzing live telemetry...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSend();
        }}
        className="mt-3 pt-2 border-t border-border/60 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask anything about formulas, ML risk, flash loans, or economic gate..."
          className="flex-1 bg-surface-secondary border border-border rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white text-xs font-mono font-bold transition-all shadow-md shadow-purple-600/20 cursor-pointer flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ASK</span>
        </button>
      </form>
    </div>
  );
};
