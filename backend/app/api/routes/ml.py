"""
PRISM ML Prediction Endpoint
"""
import logging
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/ml', tags=['ML'])


class MLPredictRequest(BaseModel):
    health_factor: float
    eth_return_24h: float = 0.0
    volatility_30d: float = 0.65
    debt_ratio: float = 0.75
    distance_to_liquidation: float = 0.0
    hf_velocity: float = 0.0
    crash_magnitude: float = 0.0


@router.post('/predict')
async def predict_risk(req: MLPredictRequest):
    """Run PRISM ML liquidation probability prediction."""
    try:
        from app.ml.model import predict
        result = predict(
            health_factor=req.health_factor,
            eth_return_24h=req.eth_return_24h,
            volatility_30d=req.volatility_30d,
            debt_ratio=req.debt_ratio,
            distance_to_liquidation=max(req.distance_to_liquidation, (req.health_factor - 1.0) / req.health_factor),
            hf_velocity=req.hf_velocity,
            crash_magnitude=req.crash_magnitude,
        )
        return result
    except Exception as e:
        logger.error(f'ML predict endpoint error: {e}')
        return {'probability': 0.5, 'risk_class': 'MODERATE', 'model_type': 'error_fallback', 'confidence': 0.5}
