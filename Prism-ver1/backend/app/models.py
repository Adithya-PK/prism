from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class CollateralAsset(BaseModel):
    asset: str
    amount: float
    price: float
    volatility: float = 0.5
    liquidity_score: float = 0.8

class DebtAsset(BaseModel):
    asset: str
    amount: float
    price: float

class UserPosition(BaseModel):
    collateral: List[CollateralAsset]
    debt: List[DebtAsset]

class MarketConditions(BaseModel):
    price_change_24h: float
    volatility: float
    trend: str = 'neutral' # 'bearish', 'bullish', 'neutral'
    gas_price_gwei: float
    network_congestion: float = 0.5

class RiskAnalysis(BaseModel):
    health_factor: float
    risk_level: str
    risk_score: float
    liquidation_probability: float
    predicted_health_factor: float
    estimated_liquidation_window: str
    risk_factors: Dict[str, float]

class SafetyAnalysis(BaseModel):
    liquidation_threshold: float
    base_safety_buffer: float
    volatility_adjustment: float
    target_health_factor: float
    dynamic_safety_buffer: float

class InterventionPlan(BaseModel):
    intervention_required: bool
    minimum_repayment: float
    selected_collateral: str
    collateral_amount: float
    expected_slippage: float
    expected_swap_output: float

class Strategy(BaseModel):
    name: str
    cost: float
    final_health_factor: float
    description: str
    is_selected: bool

class StrategyComparison(BaseModel):
    strategies: List[Strategy]
    selected_strategy: str
    selection_reason: str

class EconomicAnalysis(BaseModel):
    flash_loan_fee: float
    swap_fee: float
    slippage_cost: float
    gas_cost: float
    total_rescue_cost: float
    estimated_liquidation_loss: float
    potential_loss_avoided: float
    net_benefit: float
    is_economically_viable: bool
    decision: str

class SafetyVerification(BaseModel):
    hf_before: float
    hf_after: float
    target_hf: float
    safety_buffer: float
    excess_leverage_check: bool
    liquidity_check: bool
    slippage_check: bool
    capital_consumption_check: bool
    safety_restored: bool

class ExecutionStep(BaseModel):
    step_number: int
    action: str
    status: str
    details: str

class ExecutionResult(BaseModel):
    steps: List[ExecutionStep]
    transaction_status: str
    atomic_success: bool

class PRISMResult(BaseModel):
    risk: Optional[RiskAnalysis] = None
    safety: Optional[SafetyAnalysis] = None
    intervention: Optional[InterventionPlan] = None
    strategy_comparison: Optional[StrategyComparison] = None
    economics: Optional[EconomicAnalysis] = None
    safety_verification: Optional[SafetyVerification] = None
    execution: Optional[ExecutionResult] = None
    explanation: Optional[str] = None

class PRISMRequest(BaseModel):
    position: UserPosition
    market: MarketConditions
    liquidation_threshold: float = 0.825
    liquidation_penalty: float = 0.05
    user_target_hf: Optional[float] = None
