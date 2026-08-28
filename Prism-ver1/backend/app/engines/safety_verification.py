from app.models import SafetyVerification, InterventionPlan, Strategy

class SafetyVerificationEngine:
    def verify(self, hf_before: float, hf_after: float, target_hf: float, safety_buffer: float, intervention: InterventionPlan, strategy: Strategy, total_debt: float) -> SafetyVerification:
        excess_leverage_check = hf_after >= 1.0 
        liquidity_check = intervention.expected_slippage < 0.05
        slippage_check = intervention.expected_slippage < 0.03
        capital_check = intervention.minimum_repayment < total_debt * 0.5
        
        safety_restored = excess_leverage_check and hf_after >= target_hf and (not intervention.intervention_required or (liquidity_check and capital_check))
        
        return SafetyVerification(
            hf_before=hf_before,
            hf_after=hf_after,
            target_hf=target_hf,
            safety_buffer=safety_buffer,
            excess_leverage_check=excess_leverage_check,
            liquidity_check=liquidity_check,
            slippage_check=slippage_check,
            capital_consumption_check=capital_check,
            safety_restored=safety_restored
        )
