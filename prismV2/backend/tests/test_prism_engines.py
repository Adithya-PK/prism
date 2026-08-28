"""
Unit and Integration Tests for PRISM Engines
"""
import pytest
from app.models.position import DeFiPosition, CollateralAsset, DebtAsset
from app.models.risk import RiskLevel, DecisionType, StrategyStatus
from app.services.risk_engine import RiskEngine
from app.services.predictive_engine import PredictiveEngine
from app.services.safety_engine import SafetyEngine
from app.services.intervention_engine import InterventionEngine
from app.services.strategy_engine import StrategyEngine
from app.services.economics_engine import EconomicsEngine
from app.services.rescue_simulator import SafetyGateEngine, RescueSimulator
from app.services.llm_service import LLMService
from eth_utils import is_address


def make_test_position(hf: float = 1.08, col_val: float = 10000.0, debt_val: float = 7638.88) -> DeFiPosition:
    eth_col = CollateralAsset(
        symbol="WETH",
        name="Wrapped Ether",
        contract_address="0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        balance=col_val / 2800.0,
        price_usd=2800.0,
        value_usd=col_val,
        liquidation_threshold=0.825,
        loan_to_value=0.80,
        liquidation_penalty=0.05,
        volatility_30d=0.65,
        liquidity_score=1.0,
    )
    usdc_debt = DebtAsset(
        symbol="USDC",
        name="USD Coin",
        contract_address="0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        balance=debt_val,
        price_usd=1.0,
        value_usd=debt_val,
    )
    return DeFiPosition(
        protocol="Aave V3",
        chain="Ethereum Mainnet",
        address="0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        collateral_assets=[eth_col],
        debt_assets=[usdc_debt],
        total_collateral_value_usd=col_val,
        total_debt_value_usd=debt_val,
        net_value_usd=col_val - debt_val,
        health_factor=hf,
        current_ltv=debt_val / col_val,
        liquidation_threshold=0.825,
        max_ltv=0.80,
        liquidation_penalty=0.05,
        is_live=False,
    )


def test_ethereum_address_validation():
    assert is_address("0x71C7656EC7ab88b098defB751B7401B5f6d8976F") is True
    assert is_address("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045") is True
    assert is_address("invalid_address") is False
    assert is_address("0x123") is False


def test_risk_engine_scoring():
    engine = RiskEngine()
    pos_high_risk = make_test_position(hf=1.08)
    assessment = engine.analyze(pos_high_risk, {"WETH": 0.65})
    assert assessment.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
    assert assessment.risk_score > 50
    assert assessment.liquidation_probability > 0.4
    assert len(assessment.risk_factors) > 0

    pos_safe = make_test_position(hf=2.5, debt_val=3300.0)
    assessment_safe = engine.analyze(pos_safe, {"WETH": 0.30})
    assert assessment_safe.risk_level in [RiskLevel.SAFE, RiskLevel.LOW]
    assert assessment_safe.risk_score < 40


def test_predictive_engine():
    engine = PredictiveEngine()
    pos = make_test_position(hf=1.12)
    pred = engine.predict(pos, {"WETH": 0.65}, {"WETH": -3.5}, horizon_hours=4)
    assert pred.predicted_health_factor <= pred.current_health_factor
    assert pred.confidence > 0.3
    assert pred.prediction_horizon == "Short-term (4h)"


def test_dynamic_safety_buffer():
    engine = SafetyEngine()
    pred_engine = PredictiveEngine()
    pos = make_test_position(hf=1.08)
    pred = pred_engine.predict(pos, {"WETH": 0.85}, {"WETH": -5.0}, horizon_hours=4)
    safety = engine.calculate(pos, pred)
    assert safety.dynamic_safety_buffer >= 0.10
    assert safety.target_health_factor > 1.10
    assert len(safety.explanation) > 10


def test_minimum_intervention_engine():
    pos = make_test_position(hf=1.08, col_val=10000.0, debt_val=7638.88)
    safety_engine = SafetyEngine()
    pred_engine = PredictiveEngine()
    pred = pred_engine.predict(pos)
    safety = safety_engine.calculate(pos, pred)
    
    engine = InterventionEngine()
    intervention = engine.calculate(pos, safety)
    assert intervention.required is True
    assert intervention.minimum_intervention_usd > 0
    assert intervention.estimated_post_health_factor >= safety.target_health_factor * 0.95
    assert len(intervention.collateral_candidates) > 0


def test_strategy_engine_and_selection():
    pos = make_test_position(hf=1.08)
    pred = PredictiveEngine().predict(pos)
    safety = SafetyEngine().calculate(pos, pred)
    intervention = InterventionEngine().calculate(pos, safety)
    
    engine = StrategyEngine()
    strategies = engine.evaluate(pos, intervention, safety)
    assert len(strategies) == 4
    
    types = [s.type for s in strategies]
    assert "DIRECT_REPAY" in types
    assert "COLLATERAL_SWAP" in types
    assert "FLASH_RESCUE" in types
    assert "NO_ACTION" in types
    
    selected = [s for s in strategies if s.is_selected or s.status == StrategyStatus.SELECTED]
    assert len(selected) == 1


def test_economics_engine():
    pos = make_test_position(hf=1.08, debt_val=5000.0)
    pred = PredictiveEngine().predict(pos)
    safety = SafetyEngine().calculate(pos, pred)
    intervention = InterventionEngine().calculate(pos, safety)
    strategies = StrategyEngine().evaluate(pos, intervention, safety)
    
    econ_engine = EconomicsEngine()
    econ = econ_engine.evaluate(pos, strategies)
    assert econ.total_rescue_cost_usd > 0
    assert econ.estimated_liquidation_loss_usd > 0
    assert econ.economic_decision in [DecisionType.RESCUE, DecisionType.ABORT, DecisionType.MONITOR]


def test_safety_gate_and_atomic_rescue_success():
    pos = make_test_position(hf=1.08)
    pred = PredictiveEngine().predict(pos)
    safety = SafetyEngine().calculate(pos, pred)
    intervention = InterventionEngine().calculate(pos, safety)
    strategies = StrategyEngine().evaluate(pos, intervention, safety)
    
    gate_engine = SafetyGateEngine()
    gate = gate_engine.run(pos, intervention, strategies, safety)
    assert gate.all_passed is True
    assert len(gate.checks) >= 7
    
    selected_strat = next(s for s in strategies if s.is_selected)
    simulator = RescueSimulator()
    result = simulator.simulate(pos, selected_strat, intervention, gate)
    assert result.success is True
    assert result.simulated is True
    assert result.final_health_factor > result.original_health_factor
    assert result.position_changed is True
    assert result.rollback_triggered is False
    assert len(result.steps) == 9


def test_atomic_rescue_rollback_on_abort():
    pos = make_test_position(hf=1.08)
    pred = PredictiveEngine().predict(pos)
    safety = SafetyEngine().calculate(pos, pred)
    intervention = InterventionEngine().calculate(pos, safety)
    strategies = StrategyEngine().evaluate(pos, intervention, safety)
    gate = SafetyGateEngine().run(pos, intervention, strategies, safety)
    selected_strat = next(s for s in strategies if s.is_selected)

    simulator = RescueSimulator()
    result = simulator.simulate(pos, selected_strat, intervention, gate, force_abort=True)
    assert result.success is False
    assert result.position_changed is False
    assert result.rollback_triggered is True
    assert result.final_health_factor == result.original_health_factor
    assert "TRANSACTION REVERTED" in result.message


def test_deterministic_explanation_fallback():
    service = LLMService()
    prism_data = {
        "risk": {"health_factor": 1.08, "risk_level": "HIGH", "risk_score": 72, "liquidation_probability": 0.82, "risk_factors": ["High volatility"]},
        "prediction": {"predicted_health_factor": 0.98, "prediction_horizon": "Short-term (4h)", "confidence": 0.78},
        "safety": {"dynamic_safety_buffer": 0.20, "target_health_factor": 1.20, "explanation": "PRISM increased buffer due to elevated volatility."},
        "intervention": {"minimum_intervention_usd": 580.0, "selected_asset": "WETH"},
        "economics": {"total_rescue_cost_usd": 13.96, "potential_loss_avoided_usd": 836.04, "estimated_liquidation_loss_usd": 850.0},
        "decision": "RESCUE",
    }
    explanation = service._deterministic_explain(prism_data)
    assert "1.08" in explanation
    assert "580.00" in explanation
    assert "RESCUE" in explanation or "rescued" in explanation or "avoid" in explanation
