import os
from app.models import PRISMResult

class LLMExplainer:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = None
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
            except Exception:
                pass

    async def explain(self, result: PRISMResult) -> str:
        risk = result.risk
        safety = result.safety
        intervention = result.intervention
        economics = result.economics
        strategy = result.strategy_comparison

        prompt = f"""You are PRISM, an autonomous DeFi risk management system. Explain the following analysis results to a user in a clear, professional tone. Use 4-6 short paragraphs. Be specific with numbers. Do NOT use markdown headers or bullet points — just flowing paragraphs.

RISK ANALYSIS:
- Health Factor: {risk.health_factor:.3f}
- Risk Level: {risk.risk_level} (Score: {risk.risk_score:.1f}/100)
- Liquidation Probability: {risk.liquidation_probability:.1%}
- Predicted Health Factor: {risk.predicted_health_factor:.3f}
- Estimated Liquidation Window: {risk.estimated_liquidation_window}

SAFETY ANALYSIS:
- Dynamic Safety Buffer: {safety.dynamic_safety_buffer:.3f}
- Target Health Factor: {safety.target_health_factor:.3f}
- Volatility Adjustment: {safety.volatility_adjustment:.3f}

INTERVENTION:
- Required: {intervention.intervention_required}
- Minimum Repayment: ${intervention.minimum_repayment:.2f}
- Selected Collateral: {intervention.selected_collateral}
- Collateral Amount: {intervention.collateral_amount:.4f}
- Expected Slippage: {intervention.expected_slippage:.2%}

STRATEGY:
- Selected: {strategy.selected_strategy}
- Reason: {strategy.selection_reason}

ECONOMICS:
- Total Rescue Cost: ${economics.total_rescue_cost:.2f}
- Estimated Liquidation Loss: ${economics.estimated_liquidation_loss:.2f}
- Net Benefit: ${economics.net_benefit:.2f}
- Decision: {economics.decision}

Explain:
1. Why the position is at risk
2. How PRISM determined the safety buffer
3. Why this specific intervention amount was chosen
4. Why this strategy was selected over alternatives
5. Whether the rescue is economically justified
6. What the outcome means for the user
"""

        if self.client:
            try:
                response = self.client.models.generate_content(
                    model='gemini-2.0-flash',
                    contents=prompt,
                )
                return response.text
            except Exception as e:
                print(f"LLM Error: {e}")

        # Rich template fallback
        return self._generate_template_explanation(result)

    def _generate_template_explanation(self, result: PRISMResult) -> str:
        risk = result.risk
        safety = result.safety
        intervention = result.intervention
        economics = result.economics
        strategy = result.strategy_comparison

        risk_desc = {
            "LOW": "within safe parameters",
            "MODERATE": "showing early signs of stress",
            "HIGH": "approaching dangerous levels",
            "CRITICAL": "at critical risk of liquidation"
        }.get(risk.risk_level, "under evaluation")

        paragraphs = []

        # Paragraph 1: Risk assessment
        paragraphs.append(
            f"Your position is currently {risk_desc} with a Health Factor of {risk.health_factor:.3f}. "
            f"PRISM's multi-factor risk analysis assigns a risk score of {risk.risk_score:.1f}/100, "
            f"placing it at the {risk.risk_level} level. Based on current market conditions — including "
            f"price trajectory and volatility — the predicted Health Factor could decline to "
            f"{risk.predicted_health_factor:.3f}, with an estimated liquidation probability of "
            f"{risk.liquidation_probability:.1%}."
        )

        # Paragraph 2: Safety buffer
        paragraphs.append(
            f"PRISM has dynamically calculated a safety buffer of {safety.dynamic_safety_buffer:.3f} "
            f"above the liquidation threshold. This buffer accounts for current market volatility "
            f"(adjustment: {safety.volatility_adjustment:.3f}) and the overall risk profile. "
            f"The resulting target Health Factor is {safety.target_health_factor:.3f}, which provides "
            f"adequate protection against continued adverse market movement."
        )

        if intervention.intervention_required:
            # Paragraph 3: Intervention
            paragraphs.append(
                f"To restore your position to the target safety level, PRISM has determined that a minimum "
                f"intervention of ${intervention.minimum_repayment:.2f} is required. This is the smallest "
                f"amount needed — not a fixed percentage — calculated to bring your Health Factor above "
                f"{safety.target_health_factor:.3f}. The intervention uses {intervention.collateral_amount:.4f} "
                f"{intervention.selected_collateral} as collateral, with an expected slippage of "
                f"{intervention.expected_slippage:.2%}."
            )

            # Paragraph 4: Strategy
            paragraphs.append(
                f"Among the evaluated strategies, PRISM selected \"{strategy.selected_strategy}\" as the "
                f"optimal approach. {strategy.selection_reason} Direct repayment would cost "
                f"${intervention.minimum_repayment:.2f} in user capital, while the selected automated strategy "
                f"costs only ${economics.total_rescue_cost:.2f} in execution fees."
            )

            # Paragraph 5: Economics
            if economics.is_economically_viable:
                paragraphs.append(
                    f"The rescue is economically justified. The total execution cost is ${economics.total_rescue_cost:.2f} "
                    f"(flash loan: ${economics.flash_loan_fee:.2f}, swap: ${economics.swap_fee:.2f}, "
                    f"slippage: ${economics.slippage_cost:.2f}, gas: ${economics.gas_cost:.2f}), compared to an "
                    f"estimated liquidation loss of ${economics.estimated_liquidation_loss:.2f}. This produces a "
                    f"net benefit of ${economics.net_benefit:.2f}, making the intervention clearly worthwhile."
                )
            else:
                paragraphs.append(
                    f"However, PRISM has determined that the rescue is NOT economically justified at this time. "
                    f"The total rescue cost of ${economics.total_rescue_cost:.2f} does not provide sufficient "
                    f"benefit relative to the estimated liquidation loss of ${economics.estimated_liquidation_loss:.2f}. "
                    f"PRISM recommends monitoring the position and re-evaluating if conditions change."
                )
        else:
            paragraphs.append(
                f"No intervention is currently required. Your position's Health Factor of {risk.health_factor:.3f} "
                f"is above the target threshold of {safety.target_health_factor:.3f}. PRISM will continue "
                f"monitoring your position and will recommend action if market conditions deteriorate."
            )

        # Final paragraph
        if result.safety_verification and result.safety_verification.safety_restored:
            paragraphs.append(
                f"After the simulated rescue execution, your Health Factor would be restored from "
                f"{result.safety_verification.hf_before:.3f} to {result.safety_verification.hf_after:.3f}. "
                f"All safety checks have passed: leverage, liquidity, slippage, and capital consumption "
                f"are within acceptable limits. Your position would be safely protected."
            )

        return "\n\n".join(paragraphs)
