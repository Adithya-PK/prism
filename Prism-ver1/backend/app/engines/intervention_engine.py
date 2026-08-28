from app.models import UserPosition, MarketConditions, InterventionPlan

class InterventionEngine:
    def calculate_minimum_repayment(self, current_hf: float, target_hf: float, position: UserPosition, liquidation_threshold: float) -> float:
        debt_value = sum(d.amount * d.price for d in position.debt)
        collateral_value = sum(c.amount * c.price for c in position.collateral)
        
        # We need HF = (collateral_value * lt) / (debt_value - repayment) >= target_hf
        if target_hf <= 0: return 0.0
        
        repayment = debt_value - (collateral_value * liquidation_threshold) / target_hf
        return max(0.0, repayment)

    def select_collateral(self, position: UserPosition, repayment_amount: float, market: MarketConditions) -> tuple[str, float, float, float]:
        if not position.collateral:
            return ("NONE", 0.0, 0.0, 0.0)
            
        best_c = sorted(position.collateral, key=lambda c: (c.liquidity_score, -c.volatility, c.amount*c.price), reverse=True)[0]
        
        slippage = 0.01 + (1.0 - best_c.liquidity_score) * 0.05 + market.volatility * 0.02
        amount_needed = (repayment_amount / best_c.price) * (1.0 + slippage)
        swap_output = amount_needed * best_c.price * (1.0 - slippage)
        
        return (best_c.asset, amount_needed, slippage, swap_output)

    def analyze(self, current_hf: float, target_hf: float, position: UserPosition, market: MarketConditions, liquidation_threshold: float) -> InterventionPlan:
        if current_hf >= target_hf:
            return InterventionPlan(
                intervention_required=False,
                minimum_repayment=0.0,
                selected_collateral="",
                collateral_amount=0.0,
                expected_slippage=0.0,
                expected_swap_output=0.0
            )
            
        repayment = self.calculate_minimum_repayment(current_hf, target_hf, position, liquidation_threshold)
        asset, amount, slippage, swap_out = self.select_collateral(position, repayment, market)
        
        return InterventionPlan(
            intervention_required=True,
            minimum_repayment=repayment,
            selected_collateral=asset,
            collateral_amount=amount,
            expected_slippage=slippage,
            expected_swap_output=swap_out
        )
