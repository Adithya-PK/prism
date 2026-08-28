"""
PRISM Simulated Atomic Rescue Engine
"""
import logging
import copy
from typing import List

from app.models.position import DeFiPosition
from app.models.risk import (
    RescueResult, RescueStep, Strategy, InterventionPlan,
    SafetyGateResult, SafetyCheck, StrategyStatus
)

logger = logging.getLogger(__name__)

STEPS = [
    "Evaluate position",
    "Select minimum intervention",
    "Simulate temporary liquidity acquisition",
    "Simulate debt repayment",
    "Simulate collateral release",
    "Simulate collateral swap",
    "Simulate liquidity repayment",
    "Verify final Health Factor",
    "Commit simulated state",
]


class SafetyGateEngine:
    def run(
        self,
        position: DeFiPosition,
        intervention: InterventionPlan,
        strategies: List[Strategy],
        safety,
    ) -> SafetyGateResult:
        checks = []

        target_hf = safety.target_health_factor
        selected = next((s for s in strategies if s.is_selected or s.status == StrategyStatus.SELECTED), None)
        cost_ratio = 0.0

        # Check 1: Target HF achievable
        checks.append(SafetyCheck(
            name="Target HF achievable",
            passed=intervention.estimated_post_health_factor >= target_hf * 0.95,
            details=f"Post-rescue HF {intervention.estimated_post_health_factor:.3f} vs target {target_hf:.3f}",
        ))

        # Check 2: Minimum intervention calculated
        checks.append(SafetyCheck(
            name="Minimum intervention calculated",
            passed=intervention.minimum_intervention_usd > 0,
            details=f"Minimum intervention: ${intervention.minimum_intervention_usd:.2f}",
        ))

        # Check 3: Sufficient liquidity
        avg_liquidity = 0.0
        if position.collateral_assets and position.total_collateral_value_usd > 0:
            for ca in position.collateral_assets:
                avg_liquidity += ca.liquidity_score * (ca.value_usd / position.total_collateral_value_usd)
        checks.append(SafetyCheck(
            name="Sufficient liquidity",
            passed=avg_liquidity >= 0.5,
            details=f"Average collateral liquidity score: {avg_liquidity:.2f}",
        ))

        # Check 4: Slippage acceptable
        max_slip = max((s.estimated_slippage_pct for s in strategies if s.is_selected), default=0)
        checks.append(SafetyCheck(
            name="Slippage acceptable",
            passed=max_slip <= 5.0,
            details=f"Max strategy slippage: {max_slip:.2f}%",
        ))

        # Check 5: Rescue cost acceptable (< 10% of total debt)
        if selected and position.total_debt_value_usd > 0:
            cost_ratio = selected.estimated_cost_usd / position.total_debt_value_usd
            cost_ok = cost_ratio < 0.10
        else:
            cost_ok = False
        checks.append(SafetyCheck(
            name="Rescue cost acceptable",
            passed=cost_ok,
            details=f"Rescue cost ratio: {cost_ratio*100:.2f}% of debt" if selected else "No strategy selected",
        ))

        # Check 6: Safety buffer maintained
        checks.append(SafetyCheck(
            name="Safety buffer maintained",
            passed=target_hf > 1.0,
            details=f"Target HF {target_hf:.3f} includes safety buffer above liquidation boundary 1.0",
        ))

        # Check 7: Post-rescue HF safe
        checks.append(SafetyCheck(
            name="Post-rescue HF safe",
            passed=intervention.estimated_post_health_factor > 1.0,
            details=f"Post-rescue HF: {intervention.estimated_post_health_factor:.3f}",
        ))

        # Check 8: No excessive leverage
        current_ltv = position.current_ltv
        max_ltv = position.max_ltv or 0.80
        checks.append(SafetyCheck(
            name="No excessive leverage",
            passed=current_ltv <= max_ltv * 1.1,
            details=f"Current LTV: {current_ltv*100:.1f}%, Max LTV: {max_ltv*100:.0f}%",
        ))

        # Check 9: Simulation parameters valid
        checks.append(SafetyCheck(
            name="Simulation parameters valid",
            passed=selected is not None,
            details="Selected strategy available" if selected else "No strategy selected",
        ))

        all_passed = all(c.passed for c in checks)
        blocking = next((c.name for c in checks if not c.passed), None)

        return SafetyGateResult(
            all_passed=all_passed,
            checks=checks,
            blocking_check=blocking,
        )


class RescueSimulator:
    """
    Simulates an atomic rescue execution with rollback support.
    All operations are SIMULATED — no real blockchain transactions.
    """

    def simulate(
        self,
        position: DeFiPosition,
        strategy: Strategy,
        intervention: InterventionPlan,
        safety_gate: SafetyGateResult,
        force_abort: bool = False,
    ) -> RescueResult:
        original_hf = position.health_factor
        target_hf = intervention.target_health_factor
        debt = position.total_debt_value_usd
        collateral = position.total_collateral_value_usd
        lt = position.liquidation_threshold

        steps: List[RescueStep] = []

        def add_step(idx, name, status, details=None):
            steps.append(RescueStep(step=idx+1, name=name, status=status, details=details))

        # Safety gate must pass
        if not safety_gate.all_passed:
            for i, name in enumerate(STEPS):
                add_step(i, name, "FAILED" if i == 0 else "ROLLED_BACK",
                         f"Blocked by safety gate: {safety_gate.blocking_check}" if i == 0 else None)
            return RescueResult(
                success=False,
                simulated=True,
                steps=steps,
                original_health_factor=original_hf,
                final_health_factor=original_hf,
                position_changed=False,
                rollback_triggered=True,
                rollback_reason=f"Safety gate failed: {safety_gate.blocking_check}",
                message=f"TRANSACTION REVERTED. POSITION UNCHANGED. Safety gate check failed: {safety_gate.blocking_check}",
            )

        if force_abort:
            add_step(0, STEPS[0], "DONE", f"Position evaluated: HF={original_hf:.3f}")
            add_step(1, STEPS[1], "DONE", f"Intervention: ${intervention.minimum_intervention_usd:.2f}")
            add_step(2, STEPS[2], "FAILED", "Forced abort: liquidity/slippage conditions became unacceptable")
            for i in range(3, len(STEPS)):
                add_step(i, STEPS[i], "ROLLED_BACK")
            return RescueResult(
                success=False,
                simulated=True,
                steps=steps,
                original_health_factor=original_hf,
                final_health_factor=original_hf,
                position_changed=False,
                rollback_triggered=True,
                rollback_reason="Forced abort: conditions became unacceptable during simulation",
                message="TRANSACTION REVERTED. POSITION UNCHANGED. PRISM aborted rescue due to unacceptable conditions.",
            )

        # Execute simulation steps
        add_step(0, STEPS[0], "DONE", f"Position: HF={original_hf:.3f}, Collateral=${collateral:.2f}, Debt=${debt:.2f}")
        add_step(1, STEPS[1], "DONE", f"Min intervention: ${intervention.minimum_intervention_usd:.2f} via {intervention.selected_asset}")

        if strategy.type == "FLASH_RESCUE":
            add_step(2, STEPS[2], "DONE", f"Simulated flash loan: ${intervention.minimum_intervention_usd:.2f} acquired (Aave V3 flash loan)")
        elif strategy.type == "COLLATERAL_SWAP":
            add_step(2, STEPS[2], "DONE", f"Using own collateral ({intervention.selected_asset}) as liquidity source")
        else:
            add_step(2, STEPS[2], "DONE", "Direct repayment — no temporary liquidity required")

        repay_amt = intervention.minimum_intervention_usd
        slip = strategy.estimated_slippage_pct / 100.0
        effective_repay = repay_amt * (1 - slip)
        add_step(3, STEPS[3], "DONE", f"Simulated debt repayment: ${effective_repay:.2f} (after {slip*100:.1f}% slippage)")

        if strategy.type in ["FLASH_RESCUE", "COLLATERAL_SWAP"]:
            add_step(4, STEPS[4], "DONE", f"Simulated collateral release: {intervention.selected_asset} ${repay_amt:.2f}")
        else:
            add_step(4, STEPS[4], "DONE", "Collateral unchanged (direct repayment)")

        if strategy.type in ["FLASH_RESCUE", "COLLATERAL_SWAP"]:
            add_step(5, STEPS[5], "DONE", f"Simulated swap: {intervention.selected_asset} → debt token at market rate")
        else:
            add_step(5, STEPS[5], "DONE", "No swap required (direct repayment)")

        if strategy.type == "FLASH_RESCUE":
            flash_fee = repay_amt * 0.0005
            add_step(6, STEPS[6], "DONE", f"Simulated flash loan repayment: ${repay_amt:.2f} + fee ${flash_fee:.4f}")
        else:
            add_step(6, STEPS[6], "DONE", "No flash loan to repay")

        final_hf = intervention.estimated_post_health_factor
        hf_ok = final_hf >= target_hf * 0.95
        add_step(7, STEPS[7], "DONE" if hf_ok else "FAILED",
                 f"Simulated Health Factor: {original_hf:.3f} → {final_hf:.3f} (target: {target_hf:.3f})")

        if not hf_ok:
            add_step(8, STEPS[8], "ROLLED_BACK", "HF verification failed. Rollback triggered.")
            return RescueResult(
                success=False,
                simulated=True,
                steps=steps,
                original_health_factor=original_hf,
                final_health_factor=original_hf,
                position_changed=False,
                rollback_triggered=True,
                rollback_reason="Post-rescue Health Factor verification failed",
                message="TRANSACTION REVERTED. POSITION UNCHANGED.",
            )

        add_step(8, STEPS[8], "DONE", f"Simulated state committed. New HF: {final_hf:.3f}. Position PROTECTED.")

        return RescueResult(
            success=True,
            simulated=True,
            steps=steps,
            original_health_factor=original_hf,
            final_health_factor=final_hf,
            position_changed=True,
            rollback_triggered=False,
            message=f"POSITION PROTECTED (SIMULATED). Health Factor: {original_hf:.3f} → {final_hf:.3f}. SAFETY RESTORED.",
        )
