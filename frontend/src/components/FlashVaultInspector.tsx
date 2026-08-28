import React, { useState } from 'react';
import { ShieldCheck, Code, Zap, CheckCircle2, ChevronRight, Copy, Check } from 'lucide-react';
import { InterventionPlan, Strategy } from '../types';

interface FlashVaultInspectorProps {
  intervention?: InterventionPlan;
  selectedStrategy?: Strategy;
  borrowerAddress: string;
}

export const FlashVaultInspector: React.FC<FlashVaultInspectorProps> = ({
  intervention,
  selectedStrategy,
  borrowerAddress,
}) => {
  const [copied, setCopied] = useState(false);

  const contractAddress = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2'; // Canonical Aave V3 Gateway
  const debtAsset = intervention?.selected_asset || 'USDC';
  const repayAmount = intervention?.minimum_intervention_usd?.toFixed(2) || '2150.00';
  const targetHF = intervention?.target_health_factor?.toFixed(3) || '1.250';

  const sampleCalldata = `// Solved by PRISM Optimization Engine
FlashRepaymentVault.initiateFlashRescue(
  /* debtAsset */        0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, // ${debtAsset}
  /* repayAmount */      ${(parseFloat(repayAmount) * 1e6).toFixed(0)}, // $${repayAmount}
  RescueParams({
    borrower:            ${borrowerAddress || '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'},
    collateralAsset:     0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, // WETH
    collateralToWithdraw: 850000000000000000, // 0.85 WETH
    poolFee:             500,                 // 0.05% Uniswap V3 pool
    minAmountOut:        ${(parseFloat(repayAmount) * 1e6 * 0.995).toFixed(0)}, // 0.5% max slippage
    minTargetHealthFactor: ${(parseFloat(targetHF) * 1e18).toFixed(0)} // ${targetHF} Target HF
  })
);`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleCalldata);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card-prism glow-purple border-prism-purple/50">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-prism-purple-bright" />
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              AUTOMATED FLASH-REPAYMENT VAULT
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Solidity 0.8.20
              </span>
            </h3>
            <div className="text-[11px] font-mono text-slate-400">
              CSI ORIGIN 2026 Problem Statement #11 Solution
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 bg-surface-secondary px-2.5 py-1 rounded-lg border border-border">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Atomic Invariant Enforced</span>
        </div>
      </div>

      {/* 1-Tx Atomic Execution Sequence */}
      <div className="mb-4">
        <div className="text-xs font-mono text-slate-300 font-semibold mb-2">
          1-Transaction Atomic Restructuring Pipeline:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 font-mono text-[11px]">
          <div className="p-2 rounded bg-surface-secondary/70 border border-border/60">
            <span className="text-purple-400 font-bold block mb-1">1. Flash Loan</span>
            <span className="text-slate-300">Borrow ${repayAmount} {debtAsset} (5 bps fee)</span>
          </div>
          <div className="p-2 rounded bg-surface-secondary/70 border border-border/60">
            <span className="text-purple-400 font-bold block mb-1">2. Repay Debt</span>
            <span className="text-slate-300">Aave V3 <code className="text-[10px] text-slate-400">repay()</code></span>
          </div>
          <div className="p-2 rounded bg-surface-secondary/70 border border-border/60">
            <span className="text-purple-400 font-bold block mb-1">3. Withdraw</span>
            <span className="text-slate-300">Pull unlocked collateral</span>
          </div>
          <div className="p-2 rounded bg-surface-secondary/70 border border-border/60">
            <span className="text-purple-400 font-bold block mb-1">4. DEX Swap</span>
            <span className="text-slate-300">Uniswap V3 exact input</span>
          </div>
          <div className="p-2 rounded bg-surface-secondary/70 border border-border/60">
            <span className="text-emerald-400 font-bold block mb-1">5. Settle & Verify</span>
            <span className="text-slate-300">Assert HF ≥ {targetHF}</span>
          </div>
        </div>
      </div>

      {/* Smart Contract Calldata Box */}
      <div className="relative rounded-lg bg-surface-secondary border border-border p-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
          <div className="flex items-center gap-1.5 text-purple-300 font-medium">
            <Code className="w-3.5 h-3.5" />
            <span>contracts/FlashRepaymentVault.sol Execution Payload</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-surface hover:bg-surface-secondary border border-border text-slate-300 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre leading-relaxed">
          {sampleCalldata}
        </pre>
      </div>
    </div>
  );
};
