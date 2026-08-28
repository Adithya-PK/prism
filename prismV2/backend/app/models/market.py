"""
Market data models
"""
from pydantic import BaseModel
from typing import Optional, List
from .wallet import DataSource


class AssetPrice(BaseModel):
    symbol: str
    name: Optional[str] = None
    price_usd: float
    price_change_24h: Optional[float] = None
    price_change_7d: Optional[float] = None
    volume_24h_usd: Optional[float] = None
    market_cap_usd: Optional[float] = None
    volatility_30d: Optional[float] = None  # annualized
    trend: Optional[str] = None  # "BULLISH", "BEARISH", "NEUTRAL"
    last_updated: Optional[str] = None
    source: DataSource = DataSource(name="CoinGecko", type="LIVE", provider="CoinGecko")


class MarketData(BaseModel):
    prices: dict[str, AssetPrice] = {}  # symbol -> price
    network_gas_price_gwei: Optional[float] = None
    eth_block_number: Optional[int] = None
    last_updated: Optional[str] = None
    source: DataSource = DataSource(name="CoinGecko", type="LIVE", provider="CoinGecko")


class PriceHistory(BaseModel):
    symbol: str
    prices: List[tuple[int, float]]  # [(timestamp_ms, price), ...]
    source: DataSource = DataSource(name="CoinGecko", type="LIVE", provider="CoinGecko")
