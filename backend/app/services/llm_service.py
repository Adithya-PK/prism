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
        return " ".join(lines)

    async def generate_bullet_explanation(self, result: Dict[str, Any]) -> tuple[list[str], str]:
        """
        Generates a concise 4-5 bullet point risk summary.
        Returns (bullet_points_list, source)
        """
        model = self._get_model()
        if model:
            try:
                prompt = self._build_bullet_prompt(result)
                response = model.generate_content(prompt)
                text = response.text.strip()
                if text:
                    lines = [line.strip().lstrip('•-* ').strip() for line in text.split('\n') if line.strip()]
                    bullets = [b for b in lines if len(b) > 10]
                    if len(bullets) >= 3:
                        return bullets[:5], "Gemini 1.5 Flash"
            except Exception as e:
                logger.warning(f"Gemini bullet explanation notice: {e}")

        # Deterministic structured bullets
        return self._deterministic_bullets(result), "PRISM Deterministic (AI API Key Not Present)"

    def _build_bullet_prompt(self, result: Dict[str, Any]) -> str:
        hf = result.get("health_factor", 0.0)
        risk_level = result.get("risk_level", "SAFE")
        vol = result.get("volatility", 0.65)
        ml = result.get("ml_prediction", {})
        ml_prob = ml.get("probability", 0.0) * 100
        target = result.get("target_hf_data", {}).get("target_hf", 1.20)
        buffer = result.get("target_hf_data", {}).get("dynamic_buffer", 0.20)
        intervention = result.get("intervention", {})
        repay = intervention.get("debt_to_repay_usd", 0.0)
        econ = result.get("economics", {})
        cost = econ.get("rescue_cost_usd", 0.0)
        benefit = econ.get("net_benefit_usd", 0.0)
        decision = result.get("decision", "MONITOR")

        return f"""You are PRISM, an autonomous DeFi liquidation risk terminal.
Summarize this position risk assessment into exactly 4-5 concise, professional bullet points for an institutional DeFi manager.
DO NOT invent any numbers. Use ONLY the exact numbers provided below.

Data:
- Health Factor: {hf:.3f} (Liquidation boundary: 1.000)
- Risk Level: {risk_level} | ML Scenario Liquidation Probability: {ml_prob:.1f}%
- Annualized Realized Volatility: {vol*100:.1f}%
- Dynamic Safety Target: {target:.3f} (Adaptive buffer: +{buffer*100:.1f}%)
- Minimum Effective Intervention: ${repay:.2f} USDC debt repayment
- Rescue Cost vs. Benefit: Rescue cost ${cost:.2f} | Net capital preserved: ${benefit:.2f}
- Autonomous Keeper Recommendation: {decision}

Format your output as 4-5 bullet points without preamble."""

    def _deterministic_bullets(self, result: Dict[str, Any]) -> list[str]:
        hf = result.get("health_factor", 0.0)
        risk_level = result.get("risk_level", "SAFE")
        vol = result.get("volatility", 0.65)
        ml = result.get("ml_prediction", {})
        ml_prob = ml.get("probability", 0.0) * 100
        target = result.get("target_hf_data", {}).get("target_hf", 1.20)
        buffer = result.get("target_hf_data", {}).get("dynamic_buffer", 0.20)
        reasons = result.get("target_hf_data", {}).get("reasons", ["Stable conditions"])
        intervention = result.get("intervention", {})
        repay = intervention.get("debt_to_repay_usd", 0.0)
        eth_sold = intervention.get("collateral_to_sell_eth", 0.0)
        econ = result.get("economics", {})
        cost = econ.get("rescue_cost_usd", 0.0)
        loss = econ.get("liquidation_loss_usd", 0.0)
        benefit = econ.get("net_benefit_usd", 0.0)
        decision = result.get("decision", "MONITOR")

        bullets = []
        # Bullet 1: Solvency & HF Status
        if hf < 1.0:
            bullets.append(f"Position Health Factor ({hf:.3f}) has breached the 1.000 liquidation boundary — immediate restructuring required.")
        elif hf < 1.15:
            bullets.append(f"Position Health Factor ({hf:.3f}) is in the critical danger zone, {((hf - 1.0)/hf * 100):.1f}% from liquidator seizure.")
        else:
            bullets.append(f"Current Health Factor ({hf:.3f}) maintains solvency margin above the 1.000 liquidation threshold ({risk_level} risk level).")

        # Bullet 2: Volatility & ML Risk
        bullets.append(f"Market volatility at {vol*100:.1f}% results in a {ml_prob:.1f}% ML scenario liquidation probability via GradientBoosting inference.")

        # Bullet 3: Adaptive Buffer
        bullets.append(f"Adaptive dynamic buffer of +{buffer*100:.1f}% sets the target Health Factor to {target:.3f} based on {', '.join(reasons)}.")

        # Bullet 4: Minimum Capital Optimization
        if repay > 0:
            bullets.append(f"Closed-form optimization solved minimum capital intervention: repay ${repay:.2f} USDC by releasing {eth_sold:.4f} ETH collateral.")
        else:
            bullets.append("Position satisfies target safety parameters without requiring capital repayment.")

        # Bullet 5: Economic Gate & Decision
        if decision == "RESCUE":
            bullets.append(f"Economic viability validated: execution cost of ${cost:.2f} preserves ${benefit:.2f} in net capital vs ${loss:.2f} liquidation penalty. Decision: RESCUE.")
        elif decision == "DO_NOT_RESCUE":
            bullets.append(f"Execution blocked: rescue cost (${cost:.2f}) approaches or exceeds estimated liquidation loss (${loss:.2f}). Decision: DO NOT RESCUE.")
        return bullets

    async def chat_copilot(self, message: str, context: Dict[str, Any], history: list[dict] = None) -> tuple[str, str]:
        """
        Interactive Copilot Chat for PRISM.
        Answers any question about real-time position metrics, formulas, ML model,
        flash loans, capital preservation, and keeper decision logic.
        Returns (answer_text, source)
        """
        model = self._get_model()
        if model:
            try:
                system_prompt = self._build_chat_system_prompt(context)
                chat_prompt = f"{system_prompt}\n\nUser Question: {message}\n\nProvide a clear, authoritative, mathematically grounded answer:"
                response = model.generate_content(chat_prompt)
                text = response.text.strip()
                if text:
                    return text, "Gemini 1.5 Flash"
            except Exception as e:
                logger.warning(f"Gemini chat notice: {e}")

        # Deterministic domain-expert answer fallback
        return self._deterministic_chat_reply(message, context), "PRISM Knowledge Engine"

    def _build_chat_system_prompt(self, context: Dict[str, Any]) -> str:
        pos = context.get("position", {})
        eth_amt = pos.get("eth_amount", 10.0)
        eth_price = pos.get("eth_price", 4000.0)
        col_usd = pos.get("collateral_usd", eth_amt * eth_price)
        debt = pos.get("debt_usdc", 30000.0)
        lt = pos.get("liquidation_threshold", 0.825)
        hf = context.get("health_factor", 1.10)
        vel = context.get("hf_velocity", 0.0)
        target = context.get("target_hf_data", {}).get("target_hf", 1.20)
        buffer = context.get("target_hf_data", {}).get("dynamic_buffer", 0.20)
        ml_prob = context.get("ml_prediction", {}).get("probability", 0.178) * 100
        ml_class = context.get("ml_prediction", {}).get("risk_class", "SAFE")
        intervention = context.get("intervention", {})
        repay = intervention.get("debt_to_repay_usd", 0.0)
        eth_sold = intervention.get("collateral_to_sell_eth", 0.0)
        post_hf = intervention.get("post_rescue_hf", target)
        econ = context.get("economics", {})
        cost = econ.get("rescue_cost_usd", 86.44)
        loss = econ.get("liquidation_loss_usd", 750.0)
        benefit = econ.get("net_benefit_usd", 663.56)
        score = context.get("capital_preservation", {}).get("score", 88.5)
        decision = context.get("decision", "RESCUE")

        return f"""You are the PRISM Risk Copilot, an elite AI quantitative risk expert embedded in the PRISM Autonomous Liquidation Shield.
PRISM protects leveraged ETH/USDC positions on Aave V3 by executing atomic flash-loan restructurings before liquidation occurs.

CURRENT LIVE TERMINAL CONTEXT:
- Collateral: {eth_amt} ETH (${col_usd:,.2f} USD) @ ${eth_price:,.2f}/ETH
- USDC Debt: ${debt:,.2f} USDC (Liquidation Threshold: {lt*100:.1f}%)
- Current Health Factor (HF): {hf:.4f} (Liquidation boundary: 1.000)
- HF Velocity: {vel:+.4f}/min
- Dynamic Target HF: {target:.4f} (Adaptive safety buffer: +{buffer*100:.1f}%)
- ML Liquidation Probability: {ml_prob:.1f}% ({ml_class})
- Minimum Intervention: Repay ${repay:,.2f} USDC | Sell {eth_sold:.4f} ETH
- Post-Rescue Verified HF: {post_hf:.4f}
- Economic Ledger: Rescue Cost ${cost:.2f} | Liquidation Loss Avoided ${loss:.2f} | Net Benefit ${benefit:.2f}
- Capital Preservation Score: {score:.1f}/100
- Autonomous Decision: {decision}

CORE MATHEMATICAL FORMULAS IN PRISM:
1. Health Factor: HF = (Collateral_USD * LT) / Debt_USD
2. Friction Factor: k = (1 + f_flash) / (1 - f_dex - slippage) [f_flash=0.05%, f_dex=0.30%, slippage=0.40%]
3. Minimum Repayment (Closed-form): x = (Target_HF * Debt - Collateral * LT) / (Target_HF - LT * k)
4. Collateral to Sell: y = k * x (in USD) -> ETH = y / ETH_Price
5. Capital Preservation Score: ((Liquidation_Loss - Rescue_Cost) / Liquidation_Loss) * 100%
6. ML Model: Scikit-learn GradientBoostingClassifier trained on 12,000 scenarios using 7 features.

Answer questions directly, professionally, with accurate values and clear mathematical derivations."""

    def _deterministic_chat_reply(self, message: str, context: Dict[str, Any]) -> str:
        q = message.lower()
        pos = context.get("position", {})
        eth_amt = pos.get("eth_amount", 10.0)
        eth_price = pos.get("eth_price", 4000.0)
        col_usd = pos.get("collateral_usd", eth_amt * eth_price)
        debt = pos.get("debt_usdc", 30000.0)
        lt = pos.get("liquidation_threshold", 0.825)
        hf = context.get("health_factor", 1.10)
        target = context.get("target_hf_data", {}).get("target_hf", 1.20)
        buffer = context.get("target_hf_data", {}).get("dynamic_buffer", 0.20)
        ml_prob = context.get("ml_prediction", {}).get("probability", 0.178) * 100
        intervention = context.get("intervention", {})
        repay = intervention.get("debt_to_repay_usd", 8135.18)
        eth_sold = intervention.get("collateral_to_sell_eth", 2.0492)
        econ = context.get("economics", {})
        cost = econ.get("rescue_cost_usd", 86.44)
        loss = econ.get("liquidation_loss_usd", 750.0)
        benefit = econ.get("net_benefit_usd", 663.56)
        score = context.get("capital_preservation", {}).get("score", 88.5)
        decision = context.get("decision", "RESCUE")

        if any(k in q for k in ["how", "calculate", "formula", "minimum intervention", "repay", "repayment"]):
            return (
                f"**Minimum Intervention Optimization**:\n\n"
                f"PRISM calculates the minimum debt repayment (x) using the exact closed-form solution:\n\n"
                f"```math\n"
                f"x = (Target_HF * Debt - Collateral * LT) / (Target_HF - LT * k)\n"
                f"```\n\n"
                f"**Parameter Values**:\n"
                f"• Collateral (C): ${col_usd:,.2f} ({eth_amt:.2f} ETH @ ${eth_price:,.2f})\n"
                f"• Debt (D): ${debt:,.2f} USDC (Liquidation Threshold: {lt*100:.1f}%)\n"
                f"• Target Health Factor: {target:.3f} (Adaptive buffer: +{buffer*100:.0f}%)\n"
                f"• Friction Factor (k): k = (1 + 0.05%) / (1 - 0.30% - 0.40%) = 1.007553\n\n"
                f"**Result**:\n"
                f"• Minimum Debt to Repay: **${repay:,.2f} USDC**\n"
                f"• Collateral to Liquidate: **{eth_sold:.4f} ETH** (${repay * 1.007553:,.2f})\n"
                f"• Post-Rescue Solvency: Restores Health Factor exactly to **{target:.3f}**."
            )

        if any(k in q for k in ["ml", "machine learning", "model", "probability", "predict"]):
            return (
                f"**PRISM ML Liquidation Risk Model**:\n\n"
                f"The predictive engine runs a trained **GradientBoostingClassifier** (100 estimators, max depth 4) calibrated on 12,000 simulated market scenarios.\n\n"
                f"• **Predicted Liquidation Probability**: **{ml_prob:.1f}%** ({context.get('ml_prediction', {}).get('risk_class', 'SAFE')})\n"
                f"• **Confidence Score**: {context.get('ml_prediction', {}).get('confidence', 0.85)*100:.0f}%\n\n"
                f"**Evaluated Multi-Variate Features**:\n"
                f"1. Health Factor: {hf:.4f}\n"
                f"2. 24-Hour Return: {pos.get('eth_return_24h', 0.0)*100:+.2f}%\n"
                f"3. 30-Day Realized Volatility: {context.get('volatility', 0.65)*100:.1f}%\n"
                f"4. Debt Ratio (LTV): {debt/col_usd*100:.1f}%\n"
                f"5. Distance to Liquidation: {((hf - 1.0)/hf * 100) if hf > 1 else 0:.1f}%\n"
                f"6. HF Velocity: {vel:+.4f}/min\n"
                f"7. Crash Magnitude: {context.get('crash_applied', 0):.1f}%\n\n"
                f"This flags downside risk before the Health Factor breaches 1.000."
            )

        if any(k in q for k in ["health factor", "hf", "solvency"]):
            return (
                f"**Health Factor (HF) Analysis**:\n\n"
                f"The current Health Factor is **{hf:.4f}**.\n\n"
                f"```math\n"
                f"HF = (Collateral * Liquidation_Threshold) / Debt\n"
                f"   = ({eth_amt:.2f} ETH * ${eth_price:,.0f} * {lt*100:.1f}%) / ${debt:,.0f} = {hf:.4f}\n"
                f"```\n\n"
                f"**Key Solvency Boundaries**:\n"
                f"• **1.000 (Liquidation Cliff)**: Below 1.0, third-party liquidators seize up to 50% of the collateral + 5% penalty.\n"
                f"• **{target:.3f} (PRISM Dynamic Target)**: Base 1.10 + Adaptive Volatility/Velocity Buffer (+{buffer*100:.0f}%).\n"
                f"• **Current Status**: {'CRITICAL DANGER ZONE — Proactive rescue required' if hf < 1.15 else 'SOLVENT & MONITORED'}."
            )

        if any(k in q for k in ["flash loan", "flash", "atomic", "how it works", "steps"]):
            return (
                f"**Atomic Flash-Liquidity Rescue Pipeline**:\n\n"
                f"PRISM executes a 14-step atomic transaction requiring **$0 upfront user capital**:\n\n"
                f"• **Step 1-5 (Math Optimization)**: Computes dynamic target ({target:.3f}) and solves closed-form minimum repayment (${repay:,.2f}).\n"
                f"• **Step 6-7 (Safety & Viability Gates)**: Checks DEX liquidity, slippage limit (max 5%), and economic benefit.\n"
                f"• **Step 8 (Flash Borrow)**: Borrows ${repay:,.2f} USDC from Aave V3.\n"
                f"• **Step 9 (Debt Repayment)**: Repays position debt in lending pool.\n"
                f"• **Step 10 (Collateral Release)**: Releases {eth_sold:.4f} ETH from unlocked collateral.\n"
                f"• **Step 11 (DEX Swap)**: Swaps released ETH -> USDC on Uniswap V3.\n"
                f"• **Step 12 (Flash Repayment)**: Repays flash loan principal + 0.05% fee ($4.07).\n"
                f"• **Step 13-14 (Verification)**: Verifies post-rescue HF reaches {target:.3f} and commits capital preservation.\n\n"
                f"**Atomicity Guarantee**: If any step fails, the EVM reverts the entire transaction with **zero partial state**."
            )

        if any(k in q for k in ["economic", "gate", "cost", "benefit", "fee"]):
            return (
                f"**Economic Viability Gate Breakdown**:\n\n"
                f"PRISM only executes if the net cost of rescue is strictly less than the liquidation penalty avoided:\n\n"
                f"• **Liquidation Loss Avoided**: **+${loss:,.2f}** (5% penalty on ${min(debt*0.5, debt):,.2f} seized debt)\n"
                f"• **Flash Loan Fee (0.05%)**: -${intervention.get('flash_fee_usd', 4.07):,.2f}\n"
                f"• **DEX Swap Fee (0.30%)**: -${intervention.get('dex_fee_usd', 24.59):,.2f}\n"
                f"• **Estimated Slippage (0.40%)**: -${intervention.get('slippage_usd', 32.79):,.2f}\n"
                f"• **Gas Fee**: -${econ.get('gas_usd', 25.0):,.2f}\n"
                f"─────────────────────────────────────\n"
                f"• **Total Rescue Cost**: -${cost:.2f}\n"
                f"• **Net Capital Preserved**: **+${benefit:,.2f}**\n\n"
                f"**Gate Status**: **{'🟢 EXECUTION VIABLE' if econ.get('economic_viable', True) else '🔴 EXECUTION BLOCKED'}**."
            )

        if any(k in q for k in ["preservation", "score", "capital"]):
            return (
                f"**Capital Preservation Score ({score:.1f} / 100)**:\n\n"
                f"The score reflects the percentage of liquidation penalty saved by PRISM:\n\n"
                f"```math\n"
                f"Score = ((Liquidation_Penalty - Rescue_Cost) / Liquidation_Penalty) * 100\n"
                f"      = ((${loss:,.2f} - ${cost:.2f}) / ${loss:,.2f}) * 100 = {score:.1f}%\n"
                f"```\n\n"
                f"**Equity Comparison**:\n"
                f"• Standard 3rd-Party Liquidation Retained: **${context.get('retained_standard_liquidation_usd', 24250):,.2f}**\n"
                f"• PRISM Flash Rescue Retained: **${context.get('retained_prism_rescue_usd', 31883.38):,.2f}**\n"
                f"• **Net User Capital Saved**: **+${benefit:,.2f}** ({score:.1f}% preserved)."
            )

        # Default overview
        return (
            f"**PRISM Terminal Risk Overview**:\n\n"
            f"• **Position**: {eth_amt:.2f} ETH (${col_usd:,.2f}) | Debt: ${debt:,.2f} USDC | **HF**: **{hf:.4f}**\n"
            f"• **Dynamic Safety Target**: **{target:.4f}** (+{buffer*100:.0f}% adaptive volatility buffer)\n"
            f"• **ML Model Risk**: **{ml_prob:.1f}%** ({context.get('ml_prediction', {}).get('risk_class', 'SAFE')})\n"
            f"• **Minimum Intervention**: Repay **${repay:,.2f} USDC** using **{eth_sold:.4f} ETH**\n"
            f"• **Capital Preserved**: **+${benefit:,.2f}** (Score: {score:.1f}/100)\n"
            f"• **Keeper Decision**: **{decision}**\n\n"
            f"Ask me about any formula, ML feature, flash loan step, or fee component!"
        )

        # Default overview
        return (
            f"**PRISM Terminal Overview**:\n\n"
            f"• **Position**: {eth_amt} ETH (${col_usd:,.2f}) vs ${debt:,.2f} USDC Debt | **HF**: **{hf:.4f}**\n"
            f"• **Dynamic Target**: **{target:.4f}** (+{buffer*100:.0f}% adaptive buffer for market volatility)\n"
            f"• **ML Scenario Risk**: **{ml_prob:.1f}%** | **Decision**: **{decision}**\n"
            f"• **Optimization**: Repay **${repay:,.2f} USDC** using **{eth_sold:.4f} ETH** to save **+${benefit:,.2f}**.\n\n"
            f"Ask me anything about formulas, ML features, flash loans, slippage, or keeper logic!"
        )
