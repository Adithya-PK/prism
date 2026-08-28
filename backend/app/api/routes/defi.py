"""
DeFi Position API Routes
"""
from fastapi import APIRouter, HTTPException
from app.services.defi_service import DeFiService
from eth_utils import is_address

router = APIRouter(prefix="/defi", tags=["DeFi"])
defi_service = DeFiService()


@router.get("/positions/{address}")
async def get_positions(address: str):
    """Discover and return DeFi lending positions for an address."""
    if not is_address(address):
        raise HTTPException(status_code=400, detail=f"Invalid Ethereum address: {address}")
    try:
        position = await defi_service.discover_positions(address)
        if position is None:
            return {
                "has_position": False,
                "position": None,
                "message": "No supported DeFi lending position detected. Load a demo position to explore PRISM features."
            }
        return {
            "has_position": True,
            "position": position,
            "message": f"Active {position.protocol} position detected on {position.chain}."
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"DeFi position discovery failed: {e}")
