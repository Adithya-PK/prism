"""
LLM Explanation API Routes
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, Optional
from app.services.llm_service import LLMService

router = APIRouter(prefix="/explanation", tags=["Explanation"])
llm_service = LLMService()


class ExplanationRequest(BaseModel):
    prism_result: Dict[str, Any]


@router.post("/generate")
async def generate_explanation(req: ExplanationRequest):
    """Generate a Gemini or deterministic explanation of PRISM results."""
    try:
        text, source = await llm_service.generate_explanation(req.prism_result)
        return {"explanation": text, "source": source}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explanation generation failed: {e}")
