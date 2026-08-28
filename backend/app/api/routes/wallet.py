"""
Wallet API Routes
"""
from fastapi import APIRouter, HTTPException
from app.services.wallet_service import WalletService
from app.models.wallet import WalletData
from eth_utils import is_address

router = APIRouter(prefix="/wallet", tags=["Wallet"])
wallet_service = WalletService()


def validate_address(address: str) -> str:
    if not is_address(address):
        raise HTTPException(status_code=400, detail=f"Invalid Ethereum address: {address}")
    return address


@router.get("/{address}", response_model=WalletData)
async def get_wallet(address: str):
    """Get wallet data including ETH + ERC-20 balances."""
    address = validate_address(address)
    try:
        return await wallet_service.get_wallet_data(address)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Wallet fetch failed: {e}")


@router.get("/{address}/portfolio")
async def get_portfolio(address: str):
    """Get portfolio breakdown with USD values."""
    address = validate_address(address)
    try:
        wallet = await wallet_service.get_wallet_data(address)
        return {
            "address": wallet.address,
            "total_value_usd": wallet.total_portfolio_value_usd,
            "tokens": wallet.tokens,
            "last_updated": wallet.last_updated,
            "source": wallet.source,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
