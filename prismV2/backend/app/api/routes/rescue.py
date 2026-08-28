"""
Rescue Simulation API Routes
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.models.position import DeFiPosition
from app.models.risk import Strategy, InterventionPlan, SafetyGateResult, RescueResult, SafetyBuffer
from app.services.rescue_simulator import RescueSimulator, SafetyGateEngine

router = APIRouter(prefix="/rescue", tags=["Rescue"])
gateEngine = SafetyGateEngine()
rescueSimulator = RescueSimulator()


class RescueRequest(BaseModel):
    position: DeFiPosition
    strategies: List[Strategy]
    intervention: InterventionPlan
    safety: SafetyBuffer
    force_abort: bool = False


@router.post("/simulate", response_model=RescueResult)
async def simulate_rescue(req: RescueRequest):
    """
    Run safety gate checks, then simulate atomic rescue.
    SIMULATED ONLY — no real transactions.
    """
    try:
        gate = gateEngine.run(
            position=req.position,
            intervention=req.intervention,
            strategies=req.strategies,
            safety=req.safety,
        )

        selected = next(
            (s for s in req.strategies if s.is_selected or s.status.value == "SELECTED"),
            None
        )

        if not selected:
            raise HTTPException(status_code=400, detail="No selected strategy found")

        result = rescueSimulator.simulate(
            position=req.position,
            strategy=selected,
            intervention=req.intervention,
            safety_gate=gate,
            force_abort=req.force_abort,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rescue simulation failed: {e}")


@router.post("/safety-gate")
async def run_safety_gate(req: RescueRequest):
    """Run safety gate checks without simulating rescue."""
    try:
        gate = gateEngine.run(
            position=req.position,
            intervention=req.intervention,
            strategies=req.strategies,
            safety=req.safety,
        )
        return gate
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Safety gate failed: {e}")
