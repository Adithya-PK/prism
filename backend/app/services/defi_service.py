"""
DeFi Service — discovers and loads Aave V3 positions on Ethereum Mainnet
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from app.providers.aave_provider import AaveProvider
from app.providers.alchemy_provider import AlchemyProvider, KNOWN_TOKENS
from app.providers.coingecko_provider import CoinGeckoProvider
from app.models.position import DeFiPosition, CollateralAsset, DebtAsset, DataSource
from app.services.market_service import FALLBACK_VOLATILITY

logger = logging.getLogger(__name__)

# Known Aave V3 reserve addresses on Ethereum Mainnet with asset info
AAVE_V3_RESERVES: Dict[str, Dict[str, Any]] = {
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": {"symbol": "WETH", "name": "Wrapped Ether", "decimals": 18},
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": {"symbol": "WBTC", "name": "Wrapped BTC", "decimals": 8},
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": {"symbol": "USDC", "name": "USD Coin", "decimals": 6},
    "0xdac17f958d2ee523a2206206994597c13d831ec7": {"symbol": "USDT", "name": "Tether USD", "decimals": 6},
    "0x6b175474e89094c44da98b954eedeac495271d0f": {"symbol": "DAI", "name": "Dai Stablecoin", "decimals": 18},
    "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9": {"symbol": "AAVE", "name": "Aave Token", "decimals": 18},
    "0x514910771af9ca656af840dff83e8264ecf986ca": {"symbol": "LINK", "name": "ChainLink Token", "decimals": 18},
    "0xae78736cd615f374d3085123a210448e74fc6393": {"symbol": "rETH", "name": "Rocket Pool ETH", "decimals": 18},
    "0x5979d7b546e38e414f7e9822514be443a4800529": {"symbol": "wstETH", "name": "Wrapped stETH", "decimals": 18},
    "0xbe9895146f7af43049ca1c1ae358b0541ea49704": {"symbol": "cbETH", "name": "Coinbase Wrapped Staked ETH", "decimals": 18},
    "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": {"symbol": "UNI", "name": "Uniswap", "decimals": 18},
    "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2": {"symbol": "MKR", "name": "Maker", "decimals": 18},
    "0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f": {"symbol": "GHO", "name": "GHO Stablecoin", "decimals": 18},
    "0x6810e776880c02933d47db1b9fc05908e5386b96": {"symbol": "GNO", "name": "Gnosis Token", "decimals": 18},
    "0xd533a949740bb3306d119cc777fa900ba034cd52": {"symbol": "CRV", "name": "Curve DAO Token", "decimals": 18},
    "0xba100000625a3754423978a60c9317c58a424e3d": {"symbol": "BAL", "name": "Balancer", "decimals": 18},
    "0x83f20f44975d03b1b09e64809b757c47f942beea": {"symbol": "sDAI", "name": "Savings Dai", "decimals": 18},
    "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0": {"symbol": "wstETH", "name": "Wrapped stETH", "decimals": 18},
    "0xcd5fe23c85820f7b72d0926fc9b05b43e359b7ee": {"symbol": "weETH", "name": "Wrapped eETH", "decimals": 18},
    "0xa1290d69c65a6fe4df752f95823fae25cb99e5a7": {"symbol": "rsETH", "name": "KelpDAO Restaked ETH", "decimals": 18},
    "0xbf5495efe5db9ce00f80364c8b423567e58d2110": {"symbol": "ezETH", "name": "Renzo Restaked ETH", "decimals": 18},
    "0x6c3ea9036406852006290770bedfcaba0e23a0e8": {"symbol": "PYUSD", "name": "PayPal USD", "decimals": 6},
    "0x1ba4972f45d5c7f2cd2b6ee5f04de8b0f69c435d": {"symbol": "osETH", "name": "StakeWise Staked ETH", "decimals": 18},
}


class DeFiService:
    def __init__(self):
        self.aave = AaveProvider()
        self.alchemy = AlchemyProvider()
        self.coingecko = CoinGeckoProvider()

    async def discover_positions(self, address: str) -> Optional[DeFiPosition]:
        """
        Attempts to discover active Aave V3 positions for the given address.
        Returns None if no position found.
        """
        logger.info(f"Discovering DeFi positions for {address}")

        # 1. Check Aave V3 account data
        try:
            account_data = await self.aave.get_user_account_data(address)
        except Exception as e:
            logger.error(f"Aave position discovery failed: {e}")
            return None

        if not account_data:
            logger.info(f"No Aave V3 position for {address}")
            return None

        if not account_data.get("has_position", False):
            logger.info(f"Aave V3 account exists but no debt for {address}")
            return None

        # 2. Get per-reserve data to identify which assets are collateral/debt
        collateral_assets: List[CollateralAsset] = []
        debt_assets: List[DebtAsset] = []

        # Collect symbols for price lookup
        symbols_needed = []
        reserve_details = []

        for contract, asset_meta in AAVE_V3_RESERVES.items():
            symbol = asset_meta["symbol"]
            if symbol not in symbols_needed:
                symbols_needed.append(symbol)

        # Fetch all prices upfront
        try:
            prices = await self.coingecko.get_prices(symbols_needed)
        except Exception as e:
            logger.warning(f"Price fetch for Aave reserves failed: {e}")
            prices = {}

        # Check each reserve
        for contract, asset_meta in AAVE_V3_RESERVES.items():
            try:
                user_reserve = await self.aave.get_user_reserve_data(contract, address)
            except Exception:
                continue

            if not user_reserve:
                continue

            decimals = asset_meta["decimals"]
            symbol = asset_meta["symbol"]
            name = asset_meta["name"]

            a_balance = user_reserve["current_a_token_balance"] / (10 ** decimals)
            stable_debt = user_reserve["current_stable_debt"] / (10 ** decimals)
            var_debt = user_reserve["current_variable_debt"] / (10 ** decimals)
            total_debt = stable_debt + var_debt
            use_as_collateral = user_reserve["usage_as_collateral_enabled"]

            if a_balance < 1e-10 and total_debt < 1e-10:
                continue

            price_data = prices.get(symbol, {})
            price_usd = price_data.get("price_usd", 0.0)

            # Get reserve config for this asset
            reserve_config = None
            try:
                reserve_config = await self.aave.get_reserve_config(contract)
            except Exception:
                pass

            lt = reserve_config["liquidation_threshold"] if reserve_config else 0.825
            ltv = reserve_config["ltv"] if reserve_config else 0.80
            liq_bonus = reserve_config["liquidation_bonus"] if reserve_config else 0.05

            if a_balance > 1e-10 and use_as_collateral:
                value = a_balance * price_usd
                collateral_assets.append(CollateralAsset(
                    symbol=symbol,
                    name=name,
                    contract_address=contract,
                    balance=a_balance,
                    price_usd=price_usd,
                    value_usd=value,
                    liquidation_threshold=lt,
                    loan_to_value=ltv,
                    liquidation_penalty=liq_bonus,
                    volatility_30d=FALLBACK_VOLATILITY.get(symbol, 0.70),
                    liquidity_score=_liquidity_score(symbol),
                ))

            if total_debt > 1e-10:
                value = total_debt * price_usd
                debt_assets.append(DebtAsset(
                    symbol=symbol,
                    name=name,
                    contract_address=contract,
                    balance=total_debt,
                    price_usd=price_usd,
                    value_usd=value,
                ))

        if not collateral_assets and not debt_assets:
            return None

        total_collateral = sum(a.value_usd for a in collateral_assets)
        total_debt_val = sum(d.value_usd for d in debt_assets)

        # Use on-chain HF from account data (authoritative)
        hf = account_data["health_factor"]
        liq_threshold = account_data["liquidation_threshold"]
        ltv_overall = account_data["ltv"]
        current_ltv = total_debt_val / total_collateral if total_collateral > 0 else 0.0

        return DeFiPosition(
            protocol="Aave V3",
            chain="Ethereum Mainnet",
            chain_id=1,
            address=address,
            collateral_assets=collateral_assets,
            debt_assets=debt_assets,
            total_collateral_value_usd=total_collateral,
            total_debt_value_usd=total_debt_val,
            net_value_usd=total_collateral - total_debt_val,
            health_factor=hf,
            current_ltv=current_ltv,
            liquidation_threshold=liq_threshold,
            max_ltv=ltv_overall,
            liquidation_penalty=0.05,
            is_live=True,
            source=DataSource(name="Aave V3 on-chain", type="LIVE", provider="Alchemy, Aave V3"),
            last_updated=datetime.now(timezone.utc).isoformat(),
        )


def _liquidity_score(symbol: str) -> float:
    """Heuristic liquidity score 0-1 for common assets."""
    scores = {
        "ETH": 1.0, "WETH": 1.0, "WBTC": 0.95, "USDC": 1.0,
        "USDT": 0.98, "DAI": 0.97, "AAVE": 0.80, "LINK": 0.85,
        "UNI": 0.80, "MKR": 0.75, "CRV": 0.75, "rETH": 0.85,
        "wstETH": 0.88, "cbETH": 0.80,
    }
    return scores.get(symbol, 0.60)
