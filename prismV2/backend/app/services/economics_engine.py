"""
PRISM Economics Engine — evaluates rescue viability
"""
import logging
from typing import List

from app.models.position import DeFiPosition
from app.models.risk import (
    Strategy, EconomicsResult, DecisionType, StrategyStatus
)

logger = logging.getLogger(__name__)

MIN_BENEFIT_COST_RATIO = 0.8


class EconomicsEngine:
    def evaluate(
        self,
        position: DeFiPosition,
        strategies: List[Strategy],
    ) -> EconomicsResult:
        debt = position.total_debt_value_usd
        liq_penalty = position.liquidation_penalty or 0.05

        selected = next(
            (s for s in strategies if s.is_selected or s.status == StrategyStatus.SELECTED),
            None
        )

        if not selected:
            return EconomicsResult(
                swap_fees_usd=0.0,
                slippage_cost_usd=0.0,
                estimated_gas_usd=0.0,
                liquidity_fee_usd=0.0,
                total_rescue_cost_usd=0.0,
                estimated_liquidation_loss_usd=0.0,
                potential_loss_avoided_usd=0.0,
                net_benefit_usd=0.0,
                economic_decision=DecisionType.ABORT,
                decision_reason="No viable rescue strategy found. PRISM cannot safely rescue this position under current conditions.",
            )

        gas_usd = selected.estimated_gas_usd
        slip_pct = selected.estimated_slippage_pct / 100.0
        capital = selected.required_capital_usd

        swap_fees = capital * 0.003 if selected.type in ["COLLATERAL_SWAP", "FLASH_RESCUE"] else 0.0
        slippage_cost = capital * slip_pct if capital > 0 else selected.estimated_cost_usd * slip_pct
        liquidity_fee = capital * 0.0005 if selected.type == "FLASH_RESCUE" else 0.0

        total_cost = selected.estimated_cost_usd

        # Estimated liquidation loss (Aave: up to 50% of debt liquidated per event, penalty on that)
        max_liquidatable = min(debt * 0.50, debt)
        liquidation_loss = max_liquidatable * liq_penalty
        liquidation_loss = round(liquidation_loss, 2)

        potential_loss_avoided = max(liquidation_loss - total_cost, 0.0)
        net_benefit = potential_loss_avoided

        if total_cost <= 0:
            decision = DecisionType.MONITOR
            reason = "No rescue cost. Monitoring position."
        elif liquidation_loss > 0 and total_cost < liquidation_loss * MIN_BENEFIT_COST_RATIO:
            decision = DecisionType.RESCUE
            reason = (
                f"Rescue cost (${total_cost:.2f}) is significantly less than "
                f"estimated liquidation loss (${liquidation_loss:.2f}). "
                f"Net benefit: ${net_benefit:.2f}. Rescue is economically justified."
            )
        elif liquidation_loss > 0:
            decision = DecisionType.ABORT
            reason = (
                f"Rescue cost (${total_cost:.2f}) approaches or exceeds "
                f"estimated liquidation loss (${liquidation_loss:.2f}). "
                f"Rescue is not economically justified at this time."
            )
        else:
            decision = DecisionType.MONITOR
            reason = "Insufficient data to determine liquidation loss. Monitoring."

        return EconomicsResult(
            swap_fees_usd=round(swap_fees, 2),
            slippage_cost_usd=round(slippage_cost, 2),
            estimated_gas_usd=round(gas_usd, 2),
            liquidity_fee_usd=round(liquidity_fee, 4),
            total_rescue_cost_usd=round(total_cost, 2),
            estimated_liquidation_loss_usd=liquidation_loss,
            potential_loss_avoided_usd=round(potential_loss_avoided, 2),
            net_benefit_usd=round(net_benefit, 2),
            economic_decision=decision,
            decision_reason=reason,
        )
