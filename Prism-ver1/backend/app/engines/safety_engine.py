from app.models import MarketConditions, SafetyAnalysis

class SafetyEngine:
    def calculate_dynamic_buffer(self, market: MarketConditions, risk_score: float) -> tuple[float, float, float]:
        base_buffer = 0.10
        volatility_adj = market.volatility * 0.15
        trend_adj = 0.05 if market.trend == 'bearish' else 0.0 if market.trend == 'neutral' else -0.03
        risk_adj = risk_score * 0.002
        
        total_buffer = base_buffer + volatility_adj + trend_adj + risk_adj
        total_buffer = max(0.08, min(0.40, total_buffer))
        
        return (base_buffer, volatility_adj + trend_adj + risk_adj, total_buffer)

    def calculate_target_hf(self, liquidation_threshold_as_hf: float, buffer: float, user_target: float = None) -> float:
        target = liquidation_threshold_as_hf + buffer
        if user_target and user_target > target:
            return user_target
        return target

    def analyze(self, market: MarketConditions, risk_score: float, user_target_hf: float = None) -> SafetyAnalysis:
        base_buffer, vol_adj, total_buffer = self.calculate_dynamic_buffer(market, risk_score)
        target_hf = self.calculate_target_hf(1.0, total_buffer, user_target_hf)
        
        return SafetyAnalysis(
            liquidation_threshold=1.0,
            base_safety_buffer=base_buffer,
            volatility_adjustment=vol_adj,
            target_health_factor=target_hf,
            dynamic_safety_buffer=total_buffer
        )
