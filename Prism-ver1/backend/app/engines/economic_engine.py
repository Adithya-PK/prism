from app.models import InterventionPlan, MarketConditions, UserPosition, Strategy, EconomicAnalysis

class EconomicEngine:
    def calculate_rescue_cost(self, strategy: Strategy, intervention: InterventionPlan, market: MarketConditions, position: UserPosition) -> dict:
        if strategy.name == "No Action":
            return {"flash_loan_fee": 0.0, "swap_fee": 0.0, "slippage_cost": 0.0, "gas_cost": 0.0, "total": 0.0}
            
        eth_price = 3000.0 # simplified
        for c in position.collateral:
            if c.asset in ['WETH', 'ETH']:
                eth_price = c.price
                
        repay = intervention.minimum_repayment
        
        flash_fee = repay * 0.0009 if strategy.name == "Flash Rescue" else 0.0
        swap_fee = repay * 0.003
        slippage = repay * intervention.expected_slippage
        gas_cost = market.gas_price_gwei * 350000 * 0.000000001 * eth_price if strategy.name == "Flash Rescue" else market.gas_price_gwei * 150000 * 0.000000001 * eth_price
        
        return {
            "flash_loan_fee": flash_fee,
            "swap_fee": swap_fee,
            "slippage_cost": slippage,
            "gas_cost": gas_cost,
            "total": flash_fee + swap_fee + slippage + gas_cost
        }

    def estimate_liquidation_loss(self, position: UserPosition, liquidation_penalty: float) -> float:
        collateral_value = sum(c.amount * c.price for c in position.collateral)
        return collateral_value * liquidation_penalty

    def evaluate(self, strategy: Strategy, intervention: InterventionPlan, position: UserPosition, market: MarketConditions, liquidation_penalty: float) -> EconomicAnalysis:
        costs = self.calculate_rescue_cost(strategy, intervention, market, position)
        total_cost = costs['total']
        
        liq_loss = self.estimate_liquidation_loss(position, liquidation_penalty)
        loss_avoided = liq_loss - total_cost
        is_viable = loss_avoided > 0 and intervention.intervention_required
        
        decision = "RESCUE" if is_viable else "ABORT" if intervention.intervention_required else "MONITOR"

        return EconomicAnalysis(
            flash_loan_fee=costs['flash_loan_fee'],
            swap_fee=costs['swap_fee'],
            slippage_cost=costs['slippage_cost'],
            gas_cost=costs['gas_cost'],
            total_rescue_cost=total_cost,
            estimated_liquidation_loss=liq_loss,
            potential_loss_avoided=loss_avoided,
            net_benefit=loss_avoided if loss_avoided > 0 else 0,
            is_economically_viable=is_viable,
            decision=decision
        )
