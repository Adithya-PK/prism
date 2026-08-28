"""
Market Service — fetches and caches live market data
"""
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional

from app.providers.coingecko_provider import CoinGeckoProvider
from app.providers.alchemy_provider import AlchemyProvider
from app.models.market import MarketData, AssetPrice, PriceHistory, DataSource

logger = logging.getLogger(__name__)

DEFAULT_TRACKED_SYMBOLS = [
    "ETH", "WBTC", "WETH", "USDC", "USDT", "DAI",
    "AAVE", "LINK", "UNI", "MKR", "CRV",
]

# Fallback volatility estimates if CoinGecko is unavailable
FALLBACK_VOLATILITY = {
    "ETH": 0.65, "WBTC": 0.60, "WETH": 0.65,
    "USDC": 0.01, "USDT": 0.01, "DAI": 0.01,
    "AAVE": 0.85, "LINK": 0.80, "UNI": 0.80, "MKR": 0.75,
    "CRV": 0.90, "BAL": 0.85,
}


class MarketService:
    def __init__(self):
        self.coingecko = CoinGeckoProvider()
        self.alchemy = AlchemyProvider()

    async def get_market_data(
        self,
        symbols: Optional[List[str]] = None,
    ) -> MarketData:
        if not symbols:
            symbols = DEFAULT_TRACKED_SYMBOLS

        # Get prices
        try:
            raw_prices = await self.coingecko.get_prices(symbols)
        except Exception as e:
            logger.error(f"Market data fetch failed: {e}")
            raw_prices = {}

        # Get gas price
        try:
            gas_gwei = await self.alchemy.get_gas_price()
        except:
            gas_gwei = None

        # Get block number
        try:
            block_number = await self.alchemy.get_block_number()
        except:
            block_number = None

        # Build AssetPrice objects
        prices: Dict[str, AssetPrice] = {}
        for sym in symbols:
            pd = raw_prices.get(sym, {})
            if not pd:
                continue

            price = pd.get("price_usd", 0.0)
            change_24h = pd.get("change_24h", 0.0)

            # Determine trend
            if change_24h is not None:
                if change_24h > 2.0:
                    trend = "BULLISH"
                elif change_24h < -2.0:
                    trend = "BEARISH"
                else:
                    trend = "NEUTRAL"
            else:
                trend = "NEUTRAL"

            # Get volatility (30d) — use fallback if needed
            vol = FALLBACK_VOLATILITY.get(sym, 0.70)

            prices[sym] = AssetPrice(
                symbol=sym,
                price_usd=price,
                price_change_24h=change_24h,
                volume_24h_usd=pd.get("volume_24h"),
                market_cap_usd=pd.get("market_cap"),
                volatility_30d=vol,
                trend=trend,
                last_updated=datetime.now(timezone.utc).isoformat(),
            )

        return MarketData(
            prices=prices,
            network_gas_price_gwei=gas_gwei,
            eth_block_number=block_number,
            last_updated=datetime.now(timezone.utc).isoformat(),
        )

    async def get_price_history(self, symbol: str, days: int = 7) -> PriceHistory:
        try:
            data = await self.coingecko.get_market_chart(symbol, days=days)
            return PriceHistory(symbol=symbol, prices=data)
        except Exception as e:
            logger.error(f"Price history failed for {symbol}: {e}")
            return PriceHistory(symbol=symbol, prices=[])

    async def get_volatility(self, symbol: str) -> float:
        fallback = FALLBACK_VOLATILITY.get(symbol.upper(), 0.70)
        try:
            vol = await self.coingecko.get_volatility(symbol)
            return vol if vol is not None else fallback
        except:
            return fallback
