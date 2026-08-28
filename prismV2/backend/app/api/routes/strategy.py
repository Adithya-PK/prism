"""
Strategy Engine API Routes
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.models.position import DeFiPosition
from app.models.risk import InterventionPlan, SafetyBuffer
from app.services.strategy_engine import StrategyEngine

router = APIRouter(prefix="/strategy", tags=["Strategy"])
engine = StrategyEngine()


class StrategyRequest(BaseModel):
    position: DeFiPosition
    intervention: InterventionPlan
    safety: SafetyBuffer
    gas_price_gwei: Optional[float] = 30.0


@router.post("/evaluate")
async def evaluate_strategies(req: StrategyRequest):
    """Compare rescue strategies and select optimal."""
    try:
        strategies = engine.evaluate(
            req.position,
            req.intervention,
            req.safety,
            req.gas_price_gwei or 30.0,
        )
        return {"strategies": strategies}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Strategy evaluation failed: {e}")
