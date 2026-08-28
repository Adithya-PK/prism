import math
from app.models import UserPosition, MarketConditions, RiskAnalysis

class RiskEngine:
    def calculate_health_factor(self, position: UserPosition, liquidation_threshold: float) -> float:
        collateral_value = sum(c.amount * c.price for c in position.collateral)
        debt_value = sum(d.amount * d.price for d in position.debt)
        if debt_value <= 0:
            return 999.0
        return (collateral_value * liquidation_threshold) / debt_value

    def calculate_risk_score(self, hf: float, market: MarketConditions, position: UserPosition) -> float:
        hf_risk = max(0.0, min(40.0, (1.5 - hf) * 40.0))
        volatility_risk = market.volatility * 25.0
        trend_risk = 15.0 if market.trend == 'bearish' else 5.0 if market.trend == 'neutral' else 0.0
        
        avg_liquidity = sum(c.liquidity_score for c in position.collateral) / len(position.collateral) if position.collateral else 1.0
        liquidity_risk = (1.0 - avg_liquidity) * 20.0
        
        score = hf_risk + volatility_risk + trend_risk + liquidity_risk
        return max(0.0, min(100.0, score))

    def get_risk_level(self, score: float) -> str:
        if score < 25: return "LOW"
        if score < 50: return "MODERATE"
        if score < 75: return "HIGH"
        return "CRITICAL"

    def predict_health_factor(self, current_hf: float, market: MarketConditions) -> float:
        predicted_change = market.price_change_24h * (1 + market.volatility) * 0.5
        return current_hf * (1 + predicted_change)

    def calculate_liquidation_probability(self, hf: float, predicted_hf: float, risk_score: float) -> float:
        if hf >= 2.0:
            base_prob = 0.0
        elif hf <= 1.0:
            base_prob = 1.0
        else:
            base_prob = math.exp(-3.0 * (hf - 1.0))
            
        prob = base_prob + (risk_score / 100.0) * 0.2
        if predicted_hf < 1.0:
            prob += 0.2
            
        return max(0.0, min(1.0, prob))

    def estimate_liquidation_window(self, hf: float, predicted_hf: float, market: MarketConditions) -> str:
        if hf <= 1.0: return "0 blocks (IMMEDIATE)"
        decline = hf - predicted_hf
        if decline <= 0: return "> 7200 blocks (SAFE)"
        blocks_to_liq = int(((hf - 1.0) / decline) * 7200) # Assuming 1 day = 7200 blocks
        if blocks_to_liq < 50: return f"{blocks_to_liq} blocks (CRITICAL)"
        return f"~{blocks_to_liq} blocks"

    def analyze(self, position: UserPosition, market: MarketConditions, liquidation_threshold: float) -> RiskAnalysis:
        hf = self.calculate_health_factor(position, liquidation_threshold)
        score = self.calculate_risk_score(hf, market, position)
        level = self.get_risk_level(score)
        predicted_hf = self.predict_health_factor(hf, market)
        prob = self.calculate_liquidation_probability(hf, predicted_hf, score)
        window = self.estimate_liquidation_window(hf, predicted_hf, market)
        
        return RiskAnalysis(
            health_factor=hf,
            risk_level=level,
            risk_score=score,
            liquidation_probability=prob,
            predicted_health_factor=predicted_hf,
            estimated_liquidation_window=window,
            risk_factors={
                "health_factor": hf,
                "volatility": market.volatility,
                "trend": 1.0 if market.trend == 'bearish' else 0.5,
                "liquidity": 1.0 # simplified
            }
        )
