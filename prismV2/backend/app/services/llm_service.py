"""
PRISM LLM Service — Gemini explainability layer & fine-tuned synthesis
"""
import logging
from typing import Optional, Dict, Any

from app.config import get_settings

logger = logging.getLogger(__name__)


class LLMService:
    """
    Sends structured PRISM mathematical results to Gemini for human-readable synthesis.
    Falls back to deterministic template if Gemini is unavailable or rate-limited.
    """

    def __init__(self):
        self.settings = get_settings()
        self._model = None

    def _get_model(self):
        if self._model is None:
            if not self.settings.has_gemini:
                return None
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.settings.gemini_api_key)
                for model_name in ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-pro"]:
                    try:
                        self._model = genai.GenerativeModel(model_name)
                        break
                    except Exception:
                        continue
            except Exception as e:
                logger.warning(f"Gemini initialization failed: {e}")
                return None
        return self._model

    async def generate_explanation(self, prism_result: Dict[str, Any]) -> tuple[str, str]:
        """
        Returns (explanation_text, source)
        source = 'Gemini' or 'PRISM Deterministic'
        """
        model = self._get_model()

        if model:
            try:
                explanation = self._gemini_explain(model, prism_result)
                if explanation and len(explanation) > 20:
                    return explanation, "Gemini"
            except Exception as e:
                logger.warning(f"Gemini explanation notice: {e}")

        return self._deterministic_explain(prism_result), "PRISM Deterministic"

    def _gemini_explain(self, model, result: Dict[str, Any]) -> str:
        prompt = self._build_prompt(result)
        response = model.generate_content(prompt)
        text = response.text.strip()
        if not text:
            raise ValueError("Empty Gemini response")
        return text

    def _build_prompt(self, result: Dict[str, Any]) -> str:
        risk = result.get("risk", {})
        prediction = result.get("prediction", {})
        safety = result.get("safety", {})
        intervention = result.get("intervention", {})
        economics = result.get("economics", {})
        decision = result.get("decision", "MONITOR")
        strategies = result.get("strategies", [])

        selected_strategy = next((s for s in strategies if s.get("is_selected")), None)

        hf = risk.get("health_factor", 0)
        projected_hf = prediction.get("predicted_health_factor", hf)
        risk_level = risk.get("risk_level", "UNKNOWN")
        liq_prob = risk.get("liquidation_probability", 0)
        risk_factors = risk.get("risk_factors", [])
        target_hf = safety.get("target_health_factor", 1.10)
        buffer = safety.get("dynamic_safety_buffer", 0)
        min_intervention = intervention.get("minimum_intervention_usd", 0)
        selected_asset = intervention.get("selected_asset", "N/A")
        rescue_cost = economics.get("total_rescue_cost_usd", 0)
        loss_avoided = economics.get("potential_loss_avoided_usd", 0)
        horizon = prediction.get("prediction_horizon", "Short-term")
        confidence = prediction.get("confidence", 0)

        prompt = f"""You are PRISM (Predictive Risk Intelligence & Smart Protection for DeFi), an autonomous institutional-grade risk terminal.
Explain the following position risk analysis and autonomous decision concisely in 4-5 high-impact sentences for a DeFi user or hackathon judge.

CRITICAL INSTRUCTIONS:
- Do NOT use filler or repetitive introductory phrases like "I detected", "As an AI", or "PRISM detected" in every sentence.
- Do NOT invent or alter any numerical values. Only cite the exact numbers provided below.
- Highlight the relationship between volatility/trend, the dynamic safety buffer, the minimum capital intervention, and the economic justification (rescue cost vs liquidation penalty avoided).

DATA SUMMARY:
• Current Health Factor: {hf:.3f} (Liquidation boundary is 1.000)
• Risk Level: {risk_level} | Model Liquidation Probability: {liq_prob*100:.1f}%
• Active Risk Drivers: {', '.join(risk_factors) if risk_factors else 'None'}
• Short-term Projection ({horizon}): Health Factor will move to {projected_hf:.3f} (Confidence: {confidence*100:.0f}%)
• Adaptive Safety Buffer: Dynamic buffer of +{buffer:.3f} sets Target Health Factor at {target_hf:.3f}
• Capital Optimization: Minimum intervention required is ${min_intervention:.2f} using {selected_asset}
• Selected Strategy: {selected_strategy.get('name', 'N/A') if selected_strategy else 'None'}
• Economics: Rescue execution cost is ${rescue_cost:.2f} vs potential liquidation loss of ${loss_avoided + rescue_cost:.2f} (Net preserved: ${loss_avoided:.2f})
• Final Autonomous Recommendation: {decision}

Deliver a crisp, professional, human-readable summary of this decision:"""
        return prompt

    def _deterministic_explain(self, result: Dict[str, Any]) -> str:
        risk = result.get("risk", {})
        prediction = result.get("prediction", {})
        safety = result.get("safety", {})
        intervention = result.get("intervention", {})
        economics = result.get("economics", {})
        decision = result.get("decision", "MONITOR")
        strategies = result.get("strategies", [])

        selected_strategy = next((s for s in strategies if s.get("is_selected")), None)

        hf = risk.get("health_factor", 0)
        risk_level = risk.get("risk_level", "UNKNOWN")
        projected_hf = prediction.get("predicted_health_factor", hf)
        target_hf = safety.get("target_health_factor", 1.10)
        buffer = safety.get("dynamic_safety_buffer", 0)
        min_intervention = intervention.get("minimum_intervention_usd", 0)
        selected_asset = intervention.get("selected_asset", "")
        rescue_cost = economics.get("total_rescue_cost_usd", 0)
        loss_avoided = economics.get("potential_loss_avoided_usd", 0)
        liq_loss = economics.get("estimated_liquidation_loss_usd", 0)
        risk_factors = risk.get("risk_factors", [])
        safety_explanation = safety.get("explanation", "")

        lines = []

        if risk_level in ["HIGH", "CRITICAL"]:
            lines.append(
                f"Position Health Factor ({hf:.3f}) is in the {risk_level.lower()} risk zone near the 1.000 liquidation boundary."
            )
        elif risk_level == "MODERATE":
            lines.append(
                f"Current Health Factor ({hf:.3f}) exhibits moderate risk with heightened sensitivity to market turbulence."
            )
        else:
            lines.append(
                f"Current Health Factor ({hf:.3f}) is comfortably within safe parameters."
            )

        if risk_factors:
            lines.append(f"Key market drivers: {'; '.join(risk_factors)}.")

        if projected_hf < hf:
            lines.append(
                f"PRISM predictive engine projects Health Factor deterioration to {projected_hf:.3f} over the short-term horizon due to collateral volatility and downside momentum."
            )

        if safety_explanation:
            lines.append(safety_explanation)
        else:
            lines.append(
                f"PRISM applied a dynamic safety buffer of +{buffer:.3f}, establishing a target Health Factor of {target_hf:.3f}."
            )

        if decision == "RESCUE" and min_intervention > 0:
            strat_name = selected_strategy.get('name', 'optimal rescue') if selected_strategy else 'optimal rescue'
            lines.append(
                f"Rather than arbitrary fixed repayments, PRISM solved the minimum effective capital needed (${min_intervention:.2f} in {selected_asset}) via {strat_name}. "
                f"With a simulated execution cost of ${rescue_cost:.2f} avoiding ${liq_loss:.2f} in liquidation penalties, net value preserved is ${loss_avoided:.2f}."
            )
        elif decision == "ABORT":
            lines.append(
                f"PRISM aborted simulated intervention because pre-execution safety gate checks failed or the rescue cost (${rescue_cost:.2f}) does not justify the expected risk benefit (${liq_loss:.2f})."
            )
        else:
            lines.append(
                "PRISM is continuously monitoring on-chain block events and market conditions. No capital intervention is currently required."
            )

        return " ".join(lines)
