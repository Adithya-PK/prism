"""
PRISM Risk Engine — deterministic risk scoring
"""
import logging
import math
from typing import List, Optional

from app.models.position import DeFiPosition
from app.models.risk import RiskAssessment, RiskLevel
from app.models.wallet import DataSource

logger = logging.getLogger(__name__)


class RiskEngine:
    """
    Deterministic PRISM Risk Engine.
    Inputs: position + market data
    Outputs: risk_score, risk_level, liquidation_probability, risk_factors
    """

    def analyze(self, position: DeFiPosition, volatility_map: dict = None) -> RiskAssessment:
        hf = position.health_factor
        collateral = position.total_collateral_value_usd
        debt = position.total_debt_value_usd
        lt = position.liquidation_threshold
        current_ltv = position.current_ltv

        if volatility_map is None:
            volatility_map = {}

        risk_factors = []

        # -------------------------
        # HF-based base risk score
        # -------------------------
        # HF >= 2.0 -> very safe; HF = 1.0 -> liquidation; HF < 1.0 -> already liquidatable
        if hf >= 2.5:
            hf_score = 0
        elif hf >= 2.0:
            hf_score = 10
        elif hf >= 1.5:
            hf_score = 20
            risk_factors.append("Health Factor below safe threshold")
        elif hf >= 1.3:
            hf_score = 40
            risk_factors.append("Health Factor in moderate risk zone")
        elif hf >= 1.15:
            hf_score = 60
            risk_factors.append("Health Factor approaching liquidation zone")
        elif hf >= 1.05:
            hf_score = 75
            risk_factors.append("Health Factor dangerously close to liquidation")
        elif hf >= 1.0:
            hf_score = 90
            risk_factors.append("Health Factor at critical liquidation boundary")
        else:
            hf_score = 100
            risk_factors.append("Position is below liquidation threshold")

        # -------------------------
        # Volatility component
        # -------------------------
        avg_volatility = 0.0
        if position.collateral_assets:
            vols = []
            for ca in position.collateral_assets:
                sym_vol = volatility_map.get(ca.symbol, ca.volatility_30d or 0.65)
                weight = ca.value_usd / collateral if collateral > 0 else 0
                vols.append(sym_vol * weight)
            avg_volatility = sum(vols)

        vol_score = min(avg_volatility * 60, 25)  # max 25 points
        if avg_volatility > 0.80:
            risk_factors.append("Elevated collateral volatility")
        elif avg_volatility > 0.60:
            risk_factors.append("Moderate collateral volatility")

        # -------------------------
        # Concentration risk
        # -------------------------
        concentration_score = 0
        if position.collateral_assets:
            max_alloc = max(ca.value_usd / collateral for ca in position.collateral_assets) if collateral > 0 else 0
            if max_alloc > 0.85:
                concentration_score = 10
                risk_factors.append("High collateral concentration in single asset")
            elif max_alloc > 0.70:
                concentration_score = 5

        # -------------------------
        # LTV proximity to max LTV
        # -------------------------
        ltv_score = 0
        if lt > 0 and current_ltv > 0:
            ltv_ratio = current_ltv / lt
            if ltv_ratio > 0.95:
                ltv_score = 10
                risk_factors.append("LTV exceeding liquidation threshold")
            elif ltv_ratio > 0.85:
                ltv_score = 5

        # -------------------------
        # Total risk score (0-100)
        # -------------------------
        raw_score = hf_score + vol_score + concentration_score + ltv_score
        risk_score = min(round(raw_score, 1), 100.0)

        # -------------------------
        # Risk Level
        # -------------------------
        if risk_score >= 80:
            risk_level = RiskLevel.CRITICAL
        elif risk_score >= 60:
            risk_level = RiskLevel.HIGH
        elif risk_score >= 40:
            risk_level = RiskLevel.MODERATE
        elif risk_score >= 20:
            risk_level = RiskLevel.LOW
        else:
            risk_level = RiskLevel.SAFE

        # -------------------------
        # Liquidation Probability (PRISM estimate)
        # -------------------------
        # Based on HF distance from 1.0, volatility, and position size
        if hf <= 1.0:
            liq_prob = 0.99
        else:
            # Distance from liquidation
            hf_margin = (hf - 1.0)
            # Approx: probability = 1 - (1 - vol)^(1/hf_margin)
            vol = max(avg_volatility, 0.01)
            # Sigmoid-like mapping
            liq_prob = 1.0 / (1.0 + math.exp(6 * (hf_margin - vol)))
            liq_prob = round(min(liq_prob, 0.99), 4)

        return RiskAssessment(
            risk_score=risk_score,
            risk_level=risk_level,
            liquidation_probability=liq_prob,
            risk_factors=risk_factors,
            health_factor=hf,
            collateral_value=collateral,
            debt_value=debt,
            liquidation_threshold=lt,
            current_ltv=current_ltv,
        )
