from app.models import PRISMRequest, PRISMResult
from app.engines.risk_engine import RiskEngine
from app.engines.safety_engine import SafetyEngine
from app.engines.intervention_engine import InterventionEngine
from app.engines.strategy_engine import StrategyEngine
from app.engines.economic_engine import EconomicEngine
from app.engines.safety_verification import SafetyVerificationEngine
from app.engines.execution_engine import ExecutionEngine
from app.engines.llm_engine import LLMExplainer

class PRISMPipeline:
    def __init__(self):
        self.risk_engine = RiskEngine()
        self.safety_engine = SafetyEngine()
        self.intervention_engine = InterventionEngine()
        self.strategy_engine = StrategyEngine()
        self.economic_engine = EconomicEngine()
        self.safety_verification_engine = SafetyVerificationEngine()
        self.execution_engine = ExecutionEngine()
        self.llm_engine = LLMExplainer()

    async def analyze(self, request: PRISMRequest) -> PRISMResult:
        result = PRISMResult()
        
        # 1. Risk Analysis
        result.risk = self.risk_engine.analyze(request.position, request.market, request.liquidation_threshold)
        
        # 2. Safety Analysis
        result.safety = self.safety_engine.analyze(request.market, result.risk.risk_score, request.user_target_hf)
        
        # 3. Intervention Planning
        total_debt = sum(d.amount * d.price for d in request.position.debt)
        if result.risk.risk_level in ['HIGH', 'CRITICAL'] and result.risk.health_factor < result.safety.target_health_factor:
            result.intervention = self.intervention_engine.analyze(
                result.risk.health_factor, 
                result.safety.target_health_factor, 
                request.position, 
                request.market, 
                request.liquidation_threshold
            )
        else:
            result.intervention = self.intervention_engine.analyze(
                result.risk.health_factor, 
                result.risk.health_factor, 
                request.position, 
                request.market, 
                request.liquidation_threshold
            )
            
        # 4. Strategy Comparison
        result.strategy_comparison = self.strategy_engine.evaluate_strategies(
            result.intervention, 
            request.position, 
            request.market, 
            result.safety.target_health_factor,
            result.risk.health_factor
        )
        
        selected_strategy = next((s for s in result.strategy_comparison.strategies if s.name == result.strategy_comparison.selected_strategy), None)
        
        # 5. Economic Analysis
        result.economics = self.economic_engine.evaluate(
            selected_strategy, 
            result.intervention, 
            request.position, 
            request.market, 
            request.liquidation_penalty
        )
        
        # 6. Override decision if not viable
        if not result.economics.is_economically_viable and result.intervention.intervention_required:
            result.economics.decision = "ABORT"
            
        # 7. Safety Verification
        result.safety_verification = self.safety_verification_engine.verify(
            hf_before=result.risk.health_factor,
            hf_after=selected_strategy.final_health_factor,
            target_hf=result.safety.target_health_factor,
            safety_buffer=result.safety.dynamic_safety_buffer,
            intervention=result.intervention,
            strategy=selected_strategy,
            total_debt=total_debt
        )
        
        # 8. Execution Simulation
        if result.safety_verification.safety_restored and result.economics.is_economically_viable:
            result.execution = self.execution_engine.simulate_rescue(result.intervention, selected_strategy.name, result.economics)
        elif result.intervention.intervention_required:
            result.execution = self.execution_engine.simulate_failed_rescue("Economics not viable or safety not restored")
        else:
            result.execution = self.execution_engine.simulate_rescue(result.intervention, "No Action", result.economics)
            
        # 9. Explanation
        result.explanation = await self.llm_engine.explain(result)
        
        return result
