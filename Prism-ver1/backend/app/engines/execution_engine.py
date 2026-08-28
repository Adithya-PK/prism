from app.models import ExecutionResult, ExecutionStep, InterventionPlan, EconomicAnalysis

class ExecutionEngine:
    def simulate_rescue(self, intervention: InterventionPlan, strategy_name: str, economics: EconomicAnalysis) -> ExecutionResult:
        steps = []
        if strategy_name == "Flash Rescue":
            steps = [
                ExecutionStep(step_number=1, action="Obtain Temporary Liquidity", status="success", details="Flash loan executed"),
                ExecutionStep(step_number=2, action=f"Repay Debt (${intervention.minimum_repayment:.2f})", status="success", details="Debt repaid"),
                ExecutionStep(step_number=3, action="Unlock Collateral", status="success", details=f"Unlocked {intervention.selected_collateral}"),
                ExecutionStep(step_number=4, action="Swap Collateral to Debt Asset", status="success", details="Swap executed"),
                ExecutionStep(step_number=5, action="Repay Temporary Liquidity + Fee", status="success", details="Flash loan repaid"),
                ExecutionStep(step_number=6, action="Verify Health Factor", status="success", details="Target HF achieved")
            ]
        elif strategy_name == "Collateral Swap":
             steps = [
                ExecutionStep(step_number=1, action="Withdraw Collateral", status="success", details="Collateral withdrawn"),
                ExecutionStep(step_number=2, action="Swap Collateral", status="success", details="Swap executed"),
                ExecutionStep(step_number=3, action=f"Repay Debt (${intervention.minimum_repayment:.2f})", status="success", details="Debt repaid"),
                ExecutionStep(step_number=4, action="Verify Health Factor", status="success", details="Target HF achieved")
            ]
        else:
            steps = [ExecutionStep(step_number=1, action="No action required", status="success", details="")]
            
        return ExecutionResult(
            steps=steps,
            transaction_status='COMMITTED',
            atomic_success=True
        )

    def simulate_failed_rescue(self, reason: str) -> ExecutionResult:
        return ExecutionResult(
            steps=[
                ExecutionStep(step_number=1, action="Initial Verification", status="success", details=""),
                ExecutionStep(step_number=2, action="Pre-flight checks", status="failed", details=reason)
            ],
            transaction_status='REVERTED',
            atomic_success=False
        )
