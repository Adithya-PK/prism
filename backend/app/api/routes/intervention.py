"""
Intervention Engine API Routes
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models.position import DeFiPosition
from app.models.risk import SafetyBuffer, InterventionPlan
from app.services.intervention_engine import InterventionEngine

router = APIRouter(prefix="/intervention", tags=["Intervention"])
engine = InterventionEngine()


class InterventionRequest(BaseModel):
    position: DeFiPosition
    safety: SafetyBuffer


@router.post("/calculate", response_model=InterventionPlan)
async def calculate_intervention(req: InterventionRequest):
    """Calculate minimum intervention to restore target Health Factor."""
    try:
        return engine.calculate(req.position, req.safety)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intervention calculation failed: {e}")
