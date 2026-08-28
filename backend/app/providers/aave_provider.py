"""
Aave V3 on-chain provider — reads position data directly from Aave contracts.
All calls are READ-ONLY view calls with non-blocking async execution.
"""
import asyncio
import logging
from typing import Optional, Dict, Any, List

from app.config import get_settings

logger = logging.getLogger(__name__)

# Aave V3 Ethereum Mainnet contract addresses
AAVE_V3_POOL_ADDRESS = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"
AAVE_V3_POOL_DATA_PROVIDER = "0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3"

POOL_ABI_GET_USER_DATA = [
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "getUserAccountData",
        "outputs": [
            {"internalType": "uint256", "name": "totalCollateralBase", "type": "uint256"},
            {"internalType": "uint256", "name": "totalDebtBase", "type": "uint256"},
            {"internalType": "uint256", "name": "availableBorrowsBase", "type": "uint256"},
            {"internalType": "uint256", "name": "currentLiquidationThreshold", "type": "uint256"},
            {"internalType": "uint256", "name": "ltv", "type": "uint256"},
            {"internalType": "uint256", "name": "healthFactor", "type": "uint256"},
        ],
        "stateMutability": "view",
        "type": "function",
    }
]

DATA_PROVIDER_ABI_USER = [
    {
        "inputs": [
            {"internalType": "address", "name": "asset", "type": "address"},
            {"internalType": "address", "name": "user", "type": "address"},
        ],
        "name": "getUserReserveData",
        "outputs": [
            {"internalType": "uint256", "name": "currentATokenBalance", "type": "uint256"},
            {"internalType": "uint256", "name": "currentStableDebt", "type": "uint256"},
            {"internalType": "uint256", "name": "currentVariableDebt", "type": "uint256"},
            {"internalType": "uint256", "name": "principalStableDebt", "type": "uint256"},
            {"internalType": "uint256", "name": "scaledVariableDebt", "type": "uint256"},
            {"internalType": "uint256", "name": "stableBorrowRate", "type": "uint256"},
            {"internalType": "uint256", "name": "liquidityRate", "type": "uint256"},
            {"internalType": "uint256", "name": "stableRateLastUpdated", "type": "uint256"},
            {"internalType": "bool", "name": "usageAsCollateralEnabled", "type": "bool"},
        ],
        "stateMutability": "view",
        "type": "function",
    }
]

RESERVE_CONFIG_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "asset", "type": "address"}],
        "name": "getReserveConfigurationData",
        "outputs": [
            {"internalType": "uint256", "name": "decimals", "type": "uint256"},
            {"internalType": "uint256", "name": "ltv", "type": "uint256"},
            {"internalType": "uint256", "name": "liquidationThreshold", "type": "uint256"},
            {"internalType": "uint256", "name": "liquidationBonus", "type": "uint256"},
            {"internalType": "uint256", "name": "reserveFactor", "type": "uint256"},
            {"internalType": "bool", "name": "usageAsCollateralEnabled", "type": "bool"},
            {"internalType": "bool", "name": "borrowingEnabled", "type": "bool"},
            {"internalType": "bool", "name": "stableBorrowRateEnabled", "type": "bool"},
            {"internalType": "bool", "name": "isActive", "type": "bool"},
            {"internalType": "bool", "name": "isFrozen", "type": "bool"},
        ],
        "stateMutability": "view",
        "type": "function",
    }
]


class AaveProvider:
    """
    Reads Aave V3 position data from Ethereum Mainnet contracts.
    All operations are view-only.
    """

    def __init__(self):
        self.settings = get_settings()
        self._web3 = None

    def _get_web3(self):
        if self._web3 is None:
            from web3 import Web3
            rpc = self.settings.alchemy_rpc_url if self.settings.has_alchemy else "https://eth.llamarpc.com"
            self._web3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 6}))
        return self._web3

    async def get_user_account_data(self, address: str) -> Optional[Dict[str, Any]]:
        """
        Calls getUserAccountData on Aave V3 Pool in background thread with timeout.
        """
        def _sync_call():
            w3 = self._get_web3()
            pool = w3.eth.contract(
                address=w3.to_checksum_address(AAVE_V3_POOL_ADDRESS),
                abi=POOL_ABI_GET_USER_DATA,
            )
            return pool.functions.getUserAccountData(
                w3.to_checksum_address(address)
            ).call()

        try:
            result = await asyncio.wait_for(asyncio.to_thread(_sync_call), timeout=4.0)

            total_collateral_base = result[0]
            total_debt_base = result[1]
            available_borrows_base = result[2]
            current_liquidation_threshold = result[3]
            ltv = result[4]
            health_factor = result[5]

            if total_collateral_base == 0:
                return None

            HF_MAX = 2**256 - 1
            if health_factor >= HF_MAX // 2:
                hf = 999.0
            else:
                hf = health_factor / 1e18

            return {
                "total_collateral_usd": total_collateral_base / 1e8,
                "total_debt_usd": total_debt_base / 1e8,
                "available_borrows_usd": available_borrows_base / 1e8,
                "liquidation_threshold": current_liquidation_threshold / 10000,
                "ltv": ltv / 10000,
                "health_factor": round(hf, 4),
                "has_position": total_debt_base > 0,
            }
        except Exception as e:
            logger.warning(f"Aave getUserAccountData lookup for {address}: {e}")
            return None

    async def get_user_reserve_data(
        self,
        asset_address: str,
        user_address: str,
    ) -> Optional[Dict[str, Any]]:
        """Get per-reserve balances for a user."""
        def _sync_call():
            w3 = self._get_web3()
            dp = w3.eth.contract(
                address=w3.to_checksum_address(AAVE_V3_POOL_DATA_PROVIDER),
                abi=DATA_PROVIDER_ABI_USER,
            )
            return dp.functions.getUserReserveData(
                w3.to_checksum_address(asset_address),
                w3.to_checksum_address(user_address),
            ).call()

        try:
            result = await asyncio.wait_for(asyncio.to_thread(_sync_call), timeout=2.5)
            return {
                "current_a_token_balance": result[0],
                "current_stable_debt": result[1],
                "current_variable_debt": result[2],
                "usage_as_collateral_enabled": result[8],
            }
        except Exception as e:
            logger.warning(f"getUserReserveData failed {asset_address}: {e}")
            return None
