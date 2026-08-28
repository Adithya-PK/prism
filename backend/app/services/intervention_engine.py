"""
PRISM Intervention Engine — calculates minimum intervention
"""
import logging
from typing import List, Optional

from app.models.position import DeFiPosition
from app.models.risk import (
    InterventionPlan, CollateralCandidate, SafetyBuffer
)
from app.models.wallet import DataSource

logger = logging.getLogger(__name__)

SLIPPAGE_ESTIMATES = {
    "USDC": 0.001, "USDT": 0.001, "DAI": 0.001, "GHO": 0.002,
    "ETH": 0.003, "WETH": 0.003, "WBTC": 0.004,
    "rETH": 0.005, "wstETH": 0.005, "cbETH": 0.006,
    "AAVE": 0.008, "LINK": 0.008, "UNI": 0.010,
    "MKR": 0.012, "CRV": 0.015, "BAL": 0.015,
}


class InterventionEngine:
    """
    Calculates the minimum capital needed to restore the target Health Factor.
    Uses closed-form formula: repay = debt - (collateral * lt) / target_hf
    """

    def calculate(
        self,
        position: DeFiPosition,
        safety: SafetyBuffer,
    ) -> InterventionPlan:
        hf = position.health_factor
        target_hf = safety.target_health_factor
        collateral = position.total_collateral_value_usd
        debt = position.total_debt_value_usd
        lt = position.liquidation_threshold

        if debt == 0:
            return InterventionPlan(
                required=False,
                minimum_intervention_usd=0.0,
                selected_asset="",
                selected_amount=0.0,
                selected_amount_usd=0.0,
                current_health_factor=hf,
                target_health_factor=target_hf,
                estimated_post_health_factor=hf,
                collateral_candidates=[],
            )

        # HF = (collateral * lt) / debt
        # target_hf = (collateral * lt) / (debt - repay)
        # repay = debt - (collateral * lt) / target_hf
        required_repay_usd = debt - (collateral * lt) / target_hf
        required_repay_usd = max(required_repay_usd, 0.0)
        required_repay_usd = round(required_repay_usd, 2)

        # Verify post-HF
        new_debt = debt - required_repay_usd
        if new_debt > 0 and collateral > 0:
            post_hf = (collateral * lt) / new_debt
        else:
            post_hf = 999.0
        post_hf = round(post_hf, 4)

        # Evaluate collateral candidates
        candidates = self._evaluate_candidates(
            position=position,
            intervention_usd=required_repay_usd,
            target_hf=target_hf,
        )

        selected = None
        if candidates:
            candidates.sort(key=lambda c: c.execution_score, reverse=True)
            selected = candidates[0]
            selected.selected = True

        if selected and selected.execution_score > 0:
            selected_asset = selected.symbol
            price = self._get_asset_price(position, selected.symbol)
            selected_amount = required_repay_usd / price if price > 0 else 0.0
            selected_amount_usd = required_repay_usd
            selected.reason = (
                f"Selected for highest execution score ({selected.execution_score:.1f}): "
                f"liquidity={selected.liquidity_score:.2f}, "
                f"volatility={selected.volatility:.2f}, "
                f"slippage={selected.estimated_slippage*100:.1f}%"
            )
        else:
            if position.debt_assets:
                da = position.debt_assets[0]
                selected_asset = da.symbol
                price = da.price_usd
                selected_amount = required_repay_usd / price if price > 0 else 0.0
                selected_amount_usd = required_repay_usd
            else:
                selected_asset = ""
                selected_amount = 0.0
                selected_amount_usd = 0.0

        return InterventionPlan(
            required=required_repay_usd > 0,
            minimum_intervention_usd=required_repay_usd,
            selected_asset=selected_asset,
            selected_amount=round(selected_amount, 6),
            selected_amount_usd=selected_amount_usd,
            current_health_factor=hf,
            target_health_factor=target_hf,
            estimated_post_health_factor=post_hf,
            collateral_candidates=candidates,
        )

    def _evaluate_candidates(
        self,
        position: DeFiPosition,
        intervention_usd: float,
        target_hf: float,
    ) -> List[CollateralCandidate]:
        candidates = []
        total_collateral = position.total_collateral_value_usd
        total_debt = position.total_debt_value_usd
        lt = position.liquidation_threshold

        for ca in position.collateral_assets:
            slip = SLIPPAGE_ESTIMATES.get(ca.symbol, 0.010)
            effective_value = intervention_usd * (1 - slip)
            capital_consumed = intervention_usd / (1 - slip) if slip < 1 else intervention_usd

            new_debt = total_debt - effective_value
            if new_debt > 0 and total_collateral > 0:
                est_post_hf = (total_collateral * lt) / new_debt
            else:
                est_post_hf = 999.0

            liq = ca.liquidity_score
            vol = ca.volatility_30d or 0.65
            concentration = ca.value_usd / total_collateral if total_collateral > 0 else 0

            if ca.value_usd < intervention_usd * 0.8:
                score = -1.0
            else:
                score = (liq * 40) + ((1 - vol) * 30) + ((1 - slip) * 20) + ((1 - concentration) * 10)

            candidates.append(CollateralCandidate(
                symbol=ca.symbol,
                value_usd=ca.value_usd,
                volatility=vol,
                liquidity_score=liq,
                estimated_slippage=slip,
                concentration_pct=round(concentration * 100, 1),
                execution_score=round(score, 2),
                estimated_post_hf=round(est_post_hf, 4),
                capital_consumed=round(capital_consumed, 2),
            ))

        return candidates

    def _get_asset_price(self, position: DeFiPosition, symbol: str) -> float:
        for ca in position.collateral_assets:
            if ca.symbol == symbol:
                return ca.price_usd
        for da in position.debt_assets:
            if da.symbol == symbol:
                return da.price_usd
        return 1.0
