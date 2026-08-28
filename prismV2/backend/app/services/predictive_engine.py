"""
PRISM Predictive Risk Engine — projects future Health Factor
"""
import math
import logging
from typing import Optional

from app.models.position import DeFiPosition
from app.models.risk import PredictiveRisk
from app.models.wallet import DataSource

logger = logging.getLogger(__name__)


class PredictiveEngine:
    """
    Projects future Health Factor using:
    - current HF
    - collateral asset volatility
    - 24h price trend
    - scenario projection

    This is a deterministic statistical model, NOT a trained ML model.
    Label outputs as: PRISM Predictive Risk Model
    """

    def predict(
        self,
        position: DeFiPosition,
        volatility_map: dict = None,
        price_change_map: dict = None,
        horizon_hours: int = 4,
    ) -> PredictiveRisk:
        if volatility_map is None:
            volatility_map = {}
        if price_change_map is None:
            price_change_map = {}

        hf = position.health_factor
        collateral = position.total_collateral_value_usd
        debt = position.total_debt_value_usd
        lt = position.liquidation_threshold

        # -----------------------------------------------
        # 1. Weighted average volatility of collateral
        # -----------------------------------------------
        avg_volatility = 0.0
        if position.collateral_assets and collateral > 0:
            for ca in position.collateral_assets:
                vol = volatility_map.get(ca.symbol, ca.volatility_30d or 0.65)
                weight = ca.value_usd / collateral
                avg_volatility += vol * weight

        # -----------------------------------------------
        # 2. Weighted 24h price trend for collateral
        # -----------------------------------------------
        avg_price_change = 0.0
        if position.collateral_assets and collateral > 0:
            for ca in position.collateral_assets:
                pct_change = price_change_map.get(ca.symbol, 0.0)
                if pct_change is None:
                    pct_change = 0.0
                weight = ca.value_usd / collateral
                avg_price_change += (pct_change / 100.0) * weight

        # -----------------------------------------------
        # 3. Project collateral value change over horizon
        # -----------------------------------------------
        # Scale daily volatility to horizon
        daily_vol = avg_volatility / math.sqrt(365)
        horizon_vol = daily_vol * math.sqrt(horizon_hours / 24)

        # Expected collateral change: continuation of current trend + volatility downside
        # Use 1-std downside scenario as the projected case
        trend_factor = avg_price_change * (horizon_hours / 24)
        # Downside: trend minus 1 sigma
        projected_collateral_change = trend_factor - horizon_vol
        projected_collateral = collateral * (1 + projected_collateral_change)
        projected_collateral = max(projected_collateral, 0.0)

        # -----------------------------------------------
        # 4. Calculate projected Health Factor
        # -----------------------------------------------
        if debt > 0 and projected_collateral > 0:
            projected_hf = (projected_collateral * lt) / debt
        elif debt == 0:
            projected_hf = 999.0
        else:
            projected_hf = 0.0

        projected_hf = round(max(projected_hf, 0.0), 4)

        # -----------------------------------------------
        # 5. Projected liquidation probability
        # -----------------------------------------------
        if projected_hf <= 1.0:
            liq_prob = 0.99
        else:
            hf_margin = projected_hf - 1.0
            vol = max(avg_volatility, 0.01)
            liq_prob = 1.0 / (1.0 + math.exp(6 * (hf_margin - vol)))
            liq_prob = round(min(liq_prob, 0.99), 4)

        # -----------------------------------------------
        # 6. Confidence
        # -----------------------------------------------
        # Lower confidence for longer horizons and higher volatility
        confidence = max(0.4, 0.9 - avg_volatility * 0.3 - (horizon_hours / 24) * 0.05)
        confidence = round(confidence, 2)

        # -----------------------------------------------
        # 7. Scenario description
        # -----------------------------------------------
        if avg_price_change < -0.03:
            scenario_desc = f"Bearish continuation: collateral assets trending down {avg_price_change*100:.1f}% in last 24h."
        elif avg_price_change < 0:
            scenario_desc = f"Slightly negative market: collateral drifting lower."
        elif avg_price_change > 0.03:
            scenario_desc = f"Bullish market: collateral assets up {avg_price_change*100:.1f}% however volatility remains elevated."
        else:
            scenario_desc = f"Neutral market conditions: risk driven by volatility."

        horizon_str = f"Short-term ({horizon_hours}h)"

        return PredictiveRisk(
            current_health_factor=hf,
            predicted_health_factor=projected_hf,
            liquidation_probability=liq_prob,
            prediction_horizon=horizon_str,
            confidence=confidence,
            scenario_description=scenario_desc,
            volatility_factor=round(avg_volatility, 4),
            trend_factor=round(avg_price_change, 4),
        )
