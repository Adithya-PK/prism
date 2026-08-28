"""
Wallet data models
"""
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class DataSource(BaseModel):
    name: str
    type: str  # "LIVE", "ESTIMATED", "SIMULATED"
    provider: Optional[str] = None


class TokenBalance(BaseModel):
    symbol: str
    name: str
    contract_address: Optional[str] = None
    decimals: int = 18
    balance: float
    price_usd: Optional[float] = None
    value_usd: Optional[float] = None
    price_change_24h: Optional[float] = None
    allocation_pct: Optional[float] = None
    logo_url: Optional[str] = None
    is_native: bool = False
    source: DataSource = DataSource(name="Alchemy", type="LIVE", provider="Alchemy")


class WalletData(BaseModel):
    address: str
    network: str = "Ethereum Mainnet"
    chain_id: int = 1
    block_number: Optional[int] = None
    eth_balance: float = 0.0
    tokens: List[TokenBalance] = []
    total_portfolio_value_usd: float = 0.0
    nft_count: Optional[int] = None
    last_updated: Optional[str] = None
    source: DataSource = DataSource(name="Alchemy", type="LIVE", provider="Alchemy")


class WalletPortfolio(BaseModel):
    address: str
    total_value_usd: float
    tokens: List[TokenBalance]
    allocation_breakdown: dict = {}
    last_updated: str
    source: DataSource = DataSource(name="Alchemy + CoinGecko", type="LIVE", provider="Alchemy, CoinGecko")
