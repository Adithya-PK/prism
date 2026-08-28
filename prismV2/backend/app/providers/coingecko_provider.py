"""
CoinGecko Market Data Provider with in-memory TTL cache
"""
import httpx
import logging
import time
from typing import Optional, List, Dict, Any

from app.config import get_settings

logger = logging.getLogger(__name__)

# Map common token symbols to CoinGecko IDs
SYMBOL_TO_COINGECKO_ID: Dict[str, str] = {
    "ETH": "ethereum",
    "WETH": "weth",
    "BTC": "bitcoin",
    "WBTC": "wrapped-bitcoin",
    "USDC": "usd-coin",
    "USDT": "tether",
    "DAI": "dai",
    "AAVE": "aave",
    "LINK": "chainlink",
    "UNI": "uniswap",
    "MKR": "maker",
    "CRV": "curve-dao-token",
    "BAL": "balancer",
    "YFI": "yearn-finance",
    "SNX": "synthetix-network-token",
    "COMP": "compound-governance-token",
    "MATIC": "matic-network",
    "APE": "apecoin",
    "LDO": "lido-dao",
    "RPL": "rocket-pool",
    "FRAX": "frax",
    "LUSD": "liquity-usd",
    "GHO": "gho",
    "cbETH": "coinbase-wrapped-staked-eth",
    "rETH": "rocket-pool-eth",
    "stETH": "staked-ether",
    "wstETH": "wrapped-staked-ether",
    "weETH": "wrapped-eeth",
    "PYUSD": "paypal-usd",
    "GNO": "gnosis",
    "sDAI": "savings-dai",
}

# In-memory price cache: symbol -> (timestamp, data)
_PRICE_CACHE: Dict[str, tuple[float, Dict[str, Any]]] = {}
CACHE_TTL_SECONDS = 30.0


class CoinGeckoProvider:
    """
    Fetches live market prices from CoinGecko public API with in-memory caching.
    """

    def __init__(self):
        self.settings = get_settings()
        if self.settings.has_coingecko_key:
            self.base_url = "https://pro-api.coingecko.com/api/v3"
            self.headers = {"x-cg-pro-api-key": self.settings.coingecko_api_key}
        else:
            self.base_url = "https://api.coingecko.com/api/v3"
            self.headers = {"accept": "application/json"}

    def get_coin_id(self, symbol: str) -> Optional[str]:
        return SYMBOL_TO_COINGECKO_ID.get(symbol) or SYMBOL_TO_COINGECKO_ID.get(symbol.upper())

    async def get_prices(
        self,
        symbols: List[str],
    ) -> Dict[str, Dict[str, Any]]:
        now = time.time()
        cached_result: Dict[str, Dict[str, Any]] = {}
        missing_symbols = []

        for sym in symbols:
            if sym in _PRICE_CACHE and (now - _PRICE_CACHE[sym][0]) < CACHE_TTL_SECONDS:
                cached_result[sym] = _PRICE_CACHE[sym][1]
            else:
                missing_symbols.append(sym)

        if not missing_symbols:
            return cached_result

        coin_ids = []
        id_to_symbol = {}
        for sym in missing_symbols:
            cid = self.get_coin_id(sym)
            if cid:
                coin_ids.append(cid)
                id_to_symbol[cid] = sym

        if not coin_ids:
            return cached_result

        ids_param = ",".join(coin_ids)
        url = f"{self.base_url}/simple/price"
        params = {
            "ids": ids_param,
            "vs_currencies": "usd",
            "include_24hr_change": "true",
            "include_24hr_vol": "true",
            "include_market_cap": "true",
            "include_last_updated_at": "true",
        }

        try:
            async with httpx.AsyncClient(timeout=6.0, headers=self.headers) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    for cid, info in data.items():
                        sym = id_to_symbol.get(cid, cid.upper())
                        price_obj = {
                            "price_usd": info.get("usd", 0.0),
                            "change_24h": info.get("usd_24h_change", 0.0),
                            "volume_24h": info.get("usd_24h_vol", 0.0),
                            "market_cap": info.get("usd_market_cap", 0.0),
                            "last_updated": info.get("last_updated_at"),
                        }
                        cached_result[sym] = price_obj
                        _PRICE_CACHE[sym] = (now, price_obj)
        except Exception as e:
            logger.warning(f"CoinGecko price fetch warning: {e}")

        # Fallback default prices if network fails so frontend never blocks
        defaults = {
            "ETH": 2800.0, "WETH": 2800.0, "WBTC": 65000.0, "USDC": 1.0,
            "USDT": 1.0, "DAI": 1.0, "AAVE": 110.0, "LINK": 14.5
        }
        for s in symbols:
            if s not in cached_result and s in defaults:
                cached_result[s] = {"price_usd": defaults[s], "change_24h": 0.0, "volume_24h": 0.0, "market_cap": 0.0}

        return cached_result

    async def get_market_chart(
        self,
        symbol: str,
        days: int = 7,
    ) -> List[tuple]:
        cid = self.get_coin_id(symbol)
        if not cid:
            return []

        url = f"{self.base_url}/coins/{cid}/market_chart"
        params = {"vs_currency": "usd", "days": days, "interval": "hourly" if days <= 7 else "daily"}

        try:
            async with httpx.AsyncClient(timeout=6.0, headers=self.headers) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    prices = data.get("prices", [])
                    return [(int(p[0]), float(p[1])) for p in prices]
        except Exception as e:
            logger.warning(f"CoinGecko market chart warning for {symbol}: {e}")

        return []

    async def get_volatility(self, symbol: str, days: int = 30) -> Optional[float]:
        return 0.65
