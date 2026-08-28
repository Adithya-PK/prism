"""
Economics Engine API Routes
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from app.models.position import DeFiPosition
from app.models.risk import Strategy, EconomicsResult
from app.services.economics_engine import EconomicsEngine

router = APIRouter(prefix="/economics", tags=["Economics"])
engine = EconomicsEngine()


class EconomicsRequest(BaseModel):
    position: DeFiPosition
    strategies: List[Strategy]


@router.post("/evaluate", response_model=EconomicsResult)
async def evaluate_economics(req: EconomicsRequest):
    """Evaluate economic viability of rescue."""
    try:
        return engine.evaluate(req.position, req.strategies)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Economics evaluation failed: {e}")
