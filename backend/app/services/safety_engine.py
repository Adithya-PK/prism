"""
PRISM Safety Engine — calculates the dynamic safety buffer
"""
import logging
from app.models.position import DeFiPosition
from app.models.risk import SafetyBuffer, PredictiveRisk
from app.models.wallet import DataSource

logger = logging.getLogger(__name__)

# Aave V3 liquidation boundary
LIQUIDATION_BOUNDARY = 1.0


class SafetyEngine:
    """
    Calculates dynamic safety buffer:
    base_buffer + volatility_adj + trend_adj + liquidity_adj = dynamic_safety_buffer
    target_health_factor = LIQUIDATION_BOUNDARY + dynamic_safety_buffer
    """

    def calculate(
        self,
        position: DeFiPosition,
        prediction: PredictiveRisk,
        volatility_map: dict = None,
        price_change_map: dict = None,
    ) -> SafetyBuffer:
        if volatility_map is None:
            volatility_map = {}
        if price_change_map is None:
            price_change_map = {}

        collateral = position.total_collateral_value_usd

        # -----------------------------------------------
        # 1. Base buffer (always maintained)
        # -----------------------------------------------
        base_buffer = 0.10  # 10% above liquidation boundary

        # -----------------------------------------------
        # 2. Volatility adjustment
        # -----------------------------------------------
        avg_vol = prediction.volatility_factor
        if avg_vol > 0.90:
            vol_adj = 0.15
        elif avg_vol > 0.70:
            vol_adj = 0.10
        elif avg_vol > 0.50:
            vol_adj = 0.05
        elif avg_vol > 0.30:
            vol_adj = 0.02
        else:
            vol_adj = 0.0

        # -----------------------------------------------
        # 3. Trend adjustment (negative trend -> more buffer)
        # -----------------------------------------------
        trend = prediction.trend_factor
        if trend < -0.05:
            trend_adj = 0.08
        elif trend < -0.02:
            trend_adj = 0.05
        elif trend < 0:
            trend_adj = 0.02
        elif trend > 0.03:
            trend_adj = -0.01  # Slight buffer reduction in strong uptrend
        else:
            trend_adj = 0.0

        # -----------------------------------------------
        # 4. Liquidity adjustment
        # -----------------------------------------------
        avg_liquidity = 0.0
        if position.collateral_assets and collateral > 0:
            for ca in position.collateral_assets:
                weight = ca.value_usd / collateral
                avg_liquidity += ca.liquidity_score * weight

        if avg_liquidity < 0.60:
            liquidity_adj = 0.08
        elif avg_liquidity < 0.75:
            liquidity_adj = 0.04
        elif avg_liquidity < 0.85:
            liquidity_adj = 0.02
        else:
            liquidity_adj = 0.0

        # -----------------------------------------------
        # 5. Dynamic buffer
        # -----------------------------------------------
        dynamic_buffer = base_buffer + vol_adj + trend_adj + liquidity_adj
        dynamic_buffer = max(dynamic_buffer, 0.05)  # never below 5%
        dynamic_buffer = round(dynamic_buffer, 4)
        target_hf = round(LIQUIDATION_BOUNDARY + dynamic_buffer, 4)

        # -----------------------------------------------
        # 6. Explanation
        # -----------------------------------------------
        reasons = []
        if vol_adj > 0:
            reasons.append(f"volatility is {avg_vol*100:.0f}% (annualized)")
        if trend_adj > 0:
            reasons.append(f"collateral is trending negative ({trend*100:.1f}% in 24h)")
        if liquidity_adj > 0:
            reasons.append(f"collateral liquidity score is below optimal")
        if trend_adj < 0:
            reasons.append(f"strong positive trend allows slight buffer reduction")

        if reasons:
            explanation = f"PRISM increased the safety buffer because {', and '.join(reasons)}. " \
                          f"The target Health Factor is set to {target_hf:.2f} to ensure the position " \
                          f"remains protected under current market conditions."
        else:
            explanation = f"Market conditions are stable. The base safety buffer of {base_buffer:.2f} is applied. " \
                          f"Target Health Factor: {target_hf:.2f}."

        return SafetyBuffer(
            base_buffer=base_buffer,
            volatility_adjustment=vol_adj,
            trend_adjustment=trend_adj,
            liquidity_adjustment=liquidity_adj,
            dynamic_safety_buffer=dynamic_buffer,
            liquidation_boundary=LIQUIDATION_BOUNDARY,
            target_health_factor=target_hf,
            explanation=explanation,
        )
