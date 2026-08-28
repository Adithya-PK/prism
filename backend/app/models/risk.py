"""
Risk, prediction, safety, intervention, strategy, economics models
"""
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum
from .wallet import DataSource


class RiskLevel(str, Enum):
    SAFE = "SAFE"
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class DecisionType(str, Enum):
    MONITOR = "MONITOR"
    RESCUE = "RESCUE"
    ABORT = "ABORT"


class RiskAssessment(BaseModel):
    risk_score: float  # 0-100
    risk_level: RiskLevel
    liquidation_probability: float  # 0-1, PRISM estimate
    risk_factors: List[str] = []
    health_factor: float
    collateral_value: float
    debt_value: float
    liquidation_threshold: float
    current_ltv: float
    source: DataSource = DataSource(name="PRISM Risk Model", type="ESTIMATED", provider="PRISM")


class PredictiveRisk(BaseModel):
    current_health_factor: float
    predicted_health_factor: float
    liquidation_probability: float  # PRISM estimate
    prediction_horizon: str  # "Short-term (1-4h)"
    confidence: float  # 0-1
    scenario_description: str
    volatility_factor: float
    trend_factor: float
    source: DataSource = DataSource(name="PRISM Predictive Risk Model", type="ESTIMATED", provider="PRISM")


class SafetyBuffer(BaseModel):
    base_buffer: float
    volatility_adjustment: float
    trend_adjustment: float
    liquidity_adjustment: float
    dynamic_safety_buffer: float
    liquidation_boundary: float  # 1.0 for Aave
    target_health_factor: float
    explanation: str
    source: DataSource = DataSource(name="PRISM Safety Engine", type="ESTIMATED", provider="PRISM")


class CollateralCandidate(BaseModel):
    symbol: str
    value_usd: float
    volatility: float
    liquidity_score: float
    estimated_slippage: float
    concentration_pct: float
    execution_score: float  # higher = better
    estimated_post_hf: Optional[float] = None
    capital_consumed: Optional[float] = None
    selected: bool = False
    reason: Optional[str] = None


class InterventionPlan(BaseModel):
    required: bool
    minimum_intervention_usd: float
    selected_asset: str
    selected_amount: float  # in asset units
    selected_amount_usd: float
    current_health_factor: float
    target_health_factor: float
    estimated_post_health_factor: float
    collateral_candidates: List[CollateralCandidate] = []
    source: DataSource = DataSource(name="PRISM Intervention Engine", type="ESTIMATED", provider="PRISM")


class StrategyStatus(str, Enum):
    VIABLE = "VIABLE"
    UNSAFE = "UNSAFE"
    INSUFFICIENT_LIQUIDITY = "INSUFFICIENT_LIQUIDITY"
    UNECONOMICAL = "UNECONOMICAL"
    SELECTED = "SELECTED"


class Strategy(BaseModel):
    name: str
    type: str  # "DIRECT_REPAY", "COLLATERAL_SWAP", "FLASH_RESCUE", "NO_ACTION"
    required_capital_usd: float
    estimated_cost_usd: float
    estimated_slippage_pct: float
    estimated_gas_usd: float
    post_health_factor: float
    risk_level: str
    economic_benefit_usd: float
    status: StrategyStatus
    is_selected: bool = False


class EconomicsResult(BaseModel):
    swap_fees_usd: float
    slippage_cost_usd: float
    estimated_gas_usd: float
    liquidity_fee_usd: float
    total_rescue_cost_usd: float
    estimated_liquidation_loss_usd: float
    potential_loss_avoided_usd: float
    net_benefit_usd: float
    economic_decision: DecisionType
    decision_reason: str
    source: DataSource = DataSource(name="PRISM Economics Engine", type="ESTIMATED", provider="PRISM")


class SafetyCheck(BaseModel):
    name: str
    passed: bool
    details: str


class SafetyGateResult(BaseModel):
    all_passed: bool
    checks: List[SafetyCheck] = []
    blocking_check: Optional[str] = None


class RescueStep(BaseModel):
    step: int
    name: str
    status: str  # "PENDING", "RUNNING", "DONE", "FAILED", "ROLLED_BACK"
    details: Optional[str] = None


class RescueResult(BaseModel):
    success: bool
    simulated: bool = True
    steps: List[RescueStep] = []
    original_health_factor: float
    final_health_factor: float
    position_changed: bool
    rollback_triggered: bool = False
    rollback_reason: Optional[str] = None
    message: str


class PRISMDecision(BaseModel):
    decision: DecisionType
    reason: str
    risk: RiskAssessment
    prediction: PredictiveRisk
    safety: SafetyBuffer
    intervention: Optional[InterventionPlan] = None
    strategies: List[Strategy] = []
    economics: Optional[EconomicsResult] = None
    safety_gate: Optional[SafetyGateResult] = None
    explanation: Optional[str] = None
    explanation_source: str = "Gemini"  # or "PRISM Deterministic"
