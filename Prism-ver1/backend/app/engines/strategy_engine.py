from app.models import InterventionPlan, UserPosition, MarketConditions, Strategy, StrategyComparison

class StrategyEngine:
    def evaluate_strategies(self, intervention: InterventionPlan, position: UserPosition, market: MarketConditions, target_hf: float, current_hf: float) -> StrategyComparison:
        strategies = []
        
        if not intervention.intervention_required:
            no_action = Strategy(
                name="No Action",
                cost=0.0,
                final_health_factor=current_hf,
                description="No intervention required, position is safe.",
                is_selected=True
            )
            strategies.append(no_action)
            return StrategyComparison(strategies=strategies, selected_strategy="No Action", selection_reason="Position is safe.")

        # a) Direct Repayment
        direct_repayment = Strategy(
            name="Direct Repayment",
            cost=intervention.minimum_repayment, # cost is the capital used
            final_health_factor=target_hf,
            description="Repay debt using external funds from wallet.",
            is_selected=False
        )
        strategies.append(direct_repayment)

        # b) Collateral Swap
        swap_cost = intervention.minimum_repayment * (0.003 + intervention.expected_slippage)
        collateral_swap = Strategy(
            name="Collateral Swap",
            cost=swap_cost,
            final_health_factor=target_hf + 0.01,
            description="Swap collateral to repay debt.",
            is_selected=False
        )
        strategies.append(collateral_swap)

        # c) Flash Rescue
        gas_cost = market.gas_price_gwei * 350000 * 0.000000001 * 3000 # Approx ETH price
        flash_cost = intervention.minimum_repayment * 0.0009 + swap_cost + gas_cost
        flash_rescue = Strategy(
            name="Flash Rescue",
            cost=flash_cost,
            final_health_factor=target_hf + 0.02,
            description="Use flash loan to rescue position automatically.",
            is_selected=False
        )
        strategies.append(flash_rescue)

        # Select the one with lowest cost (excluding direct repayment which uses actual capital)
        best_strat = min([collateral_swap, flash_rescue], key=lambda x: x.cost)
        best_strat.is_selected = True

        return StrategyComparison(
            strategies=strategies,
            selected_strategy=best_strat.name,
            selection_reason=f"Selected {best_strat.name} as it is the most cost-effective automated rescue strategy."
        )
