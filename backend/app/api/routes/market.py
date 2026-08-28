"""
Market Data API Routes
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.services.market_service import MarketService

router = APIRouter(prefix="/market", tags=["Market"])
market_service = MarketService()


@router.get("/prices")
async def get_prices(
    symbols: Optional[str] = Query(None, description="Comma-separated list of symbols")
):
    """Get live market prices for tracked assets."""
    sym_list = [s.strip() for s in symbols.split(",")] if symbols else None
    try:
        data = await market_service.get_market_data(sym_list)
        return data
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Market data unavailable: {e}")


@router.get("/history/{asset}")
async def get_history(
    asset: str,
    days: int = Query(7, ge=1, le=90)
):
    """Get price history for a single asset."""
    try:
        history = await market_service.get_price_history(asset, days=days)
        return history
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Price history unavailable: {e}")
