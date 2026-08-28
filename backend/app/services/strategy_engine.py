"""
PRISM Strategy Engine — compares rescue strategies
"""
import logging
from typing import List

from app.models.position import DeFiPosition
from app.models.risk import (
    Strategy, StrategyStatus, InterventionPlan, SafetyBuffer
)

logger = logging.getLogger(__name__)

GAS_DIRECT_REPAY_USD = 12.0
GAS_COLLATERAL_SWAP_USD = 25.0
GAS_FLASH_RESCUE_USD = 45.0
FLASH_LOAN_FEE = 0.0005


class StrategyEngine:
    def evaluate(
        self,
        position: DeFiPosition,
        intervention: InterventionPlan,
        safety: SafetyBuffer,
        gas_price_gwei: float = 30.0,
    ) -> List[Strategy]:
        strategies = []

        target_hf = safety.target_health_factor
        min_intervention = intervention.minimum_intervention_usd
        post_hf = intervention.estimated_post_health_factor
        collateral = position.total_collateral_value_usd
        debt = position.total_debt_value_usd
        lt = position.liquidation_threshold

        gas_scale = max(gas_price_gwei / 30.0, 0.5)

        # Strategy 1: Direct Debt Repayment
        direct_slip_pct = 0.001
        direct_cost = (
            min_intervention * direct_slip_pct +
            GAS_DIRECT_REPAY_USD * gas_scale
        )
        direct_post_hf = post_hf
        strategies.append(Strategy(
            name="Direct Debt Repayment",
            type="DIRECT_REPAY",
            required_capital_usd=min_intervention,
            estimated_cost_usd=round(direct_cost, 2),
            estimated_slippage_pct=direct_slip_pct * 100,
            estimated_gas_usd=round(GAS_DIRECT_REPAY_USD * gas_scale, 2),
            post_health_factor=round(direct_post_hf, 4),
            risk_level="LOW",
            economic_benefit_usd=round(debt * 0.05, 2),
            status=StrategyStatus.VIABLE if direct_post_hf >= target_hf else StrategyStatus.UNSAFE,
        ))

        # Strategy 2: Collateral Swap
        swap_slip = 0.003
        swap_slippage_cost = min_intervention * swap_slip
        swap_cost = swap_slippage_cost + GAS_COLLATERAL_SWAP_USD * gas_scale
        swap_effective = min_intervention - swap_slippage_cost
        new_debt = debt - swap_effective
        if new_debt > 0 and collateral > 0:
            swap_post_hf = (collateral * lt) / new_debt
        else:
            swap_post_hf = 999.0
        swap_post_hf = round(max(swap_post_hf, 0.0), 4)

        strategies.append(Strategy(
            name="Collateral Swap",
            type="COLLATERAL_SWAP",
            required_capital_usd=0.0,
            estimated_cost_usd=round(swap_cost, 2),
            estimated_slippage_pct=swap_slip * 100,
            estimated_gas_usd=round(GAS_COLLATERAL_SWAP_USD * gas_scale, 2),
            post_health_factor=swap_post_hf,
            risk_level="LOW" if swap_post_hf >= target_hf else "MEDIUM",
            economic_benefit_usd=round(debt * 0.05, 2),
            status=StrategyStatus.VIABLE if swap_post_hf >= target_hf else StrategyStatus.UNSAFE,
        ))

        # Strategy 3: Flash Liquidity Rescue
        flash_fee = min_intervention * FLASH_LOAN_FEE
        flash_slip = 0.003
        flash_slip_cost = min_intervention * flash_slip
        flash_cost = flash_fee + flash_slip_cost + GAS_FLASH_RESCUE_USD * gas_scale
        flash_effective = min_intervention - flash_fee - flash_slip_cost
        new_debt_flash = debt - flash_effective
        if new_debt_flash > 0 and collateral > 0:
            flash_post_hf = (collateral * lt) / new_debt_flash
        else:
            flash_post_hf = 999.0
        flash_post_hf = round(max(flash_post_hf, 0.0), 4)

        strategies.append(Strategy(
            name="Flash Liquidity Rescue",
            type="FLASH_RESCUE",
            required_capital_usd=0.0,
            estimated_cost_usd=round(flash_cost, 2),
            estimated_slippage_pct=flash_slip * 100,
            estimated_gas_usd=round(GAS_FLASH_RESCUE_USD * gas_scale, 2),
            post_health_factor=flash_post_hf,
            risk_level="MEDIUM" if flash_post_hf >= target_hf else "HIGH",
            economic_benefit_usd=round(debt * 0.05 - flash_fee, 2),
            status=StrategyStatus.VIABLE if flash_post_hf >= target_hf else StrategyStatus.UNSAFE,
        ))

        # Strategy 4: No Action
        current_hf = position.health_factor
        no_action_status = StrategyStatus.UNSAFE if current_hf < target_hf else StrategyStatus.VIABLE

        strategies.append(Strategy(
            name="No Intervention",
            type="NO_ACTION",
            required_capital_usd=0.0,
            estimated_cost_usd=0.0,
            estimated_slippage_pct=0.0,
            estimated_gas_usd=0.0,
            post_health_factor=current_hf,
            risk_level="HIGH" if current_hf < target_hf else "LOW",
            economic_benefit_usd=0.0,
            status=no_action_status,
        ))

        # Select best viable strategy (lowest cost)
        viable = [s for s in strategies if s.status == StrategyStatus.VIABLE and s.type != "NO_ACTION"]
        if viable:
            best = min(viable, key=lambda s: s.estimated_cost_usd)
            best.status = StrategyStatus.SELECTED
            best.is_selected = True

        return strategies
