"""
Rescue simulation models
"""
from pydantic import BaseModel
from typing import Optional, List
from .risk import RescueStep, RescueResult, Strategy, SafetyGateResult
from .position import DeFiPosition


class RescueRequest(BaseModel):
    position: DeFiPosition
    selected_strategy: Strategy
    safety_gate: SafetyGateResult
    target_health_factor: float
    intervention_usd: float


class RescueSimulation(BaseModel):
    request: RescueRequest
    result: RescueResult
