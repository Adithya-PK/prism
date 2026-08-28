"""
Risk Analysis API Routes
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict

from app.models.position import DeFiPosition
from app.models.risk import RiskAssessment, PredictiveRisk
from app.services.risk_engine import RiskEngine
from app.services.predictive_engine import PredictiveEngine

router = APIRouter(prefix="/risk", tags=["Risk"])
risk_engine = RiskEngine()
predictive_engine = PredictiveEngine()


class RiskAnalysisRequest(BaseModel):
    position: DeFiPosition
    volatility_map: Optional[Dict[str, float]] = None


class PredictiveRiskRequest(BaseModel):
    position: DeFiPosition
    volatility_map: Optional[Dict[str, float]] = None
    price_change_map: Optional[Dict[str, float]] = None
    horizon_hours: int = 4


@router.post("/analyze", response_model=RiskAssessment)
async def analyze_risk(req: RiskAnalysisRequest):
    """Run deterministic PRISM risk analysis on a DeFi position."""
    try:
        return risk_engine.analyze(req.position, req.volatility_map or {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk analysis failed: {e}")


@router.post("/predict", response_model=PredictiveRisk)
async def predict_risk(req: PredictiveRiskRequest):
    """Run PRISM predictive risk model."""
    try:
        return predictive_engine.predict(
            req.position,
            req.volatility_map or {},
            req.price_change_map or {},
            req.horizon_hours,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Predictive risk failed: {e}")
