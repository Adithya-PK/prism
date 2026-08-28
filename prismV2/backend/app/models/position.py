"""
DeFi position models
"""
from pydantic import BaseModel
from typing import Optional, List
from .wallet import DataSource


class CollateralAsset(BaseModel):
    symbol: str
    name: str
    contract_address: Optional[str] = None
    balance: float
    price_usd: float
    value_usd: float
    liquidation_threshold: float  # e.g. 0.825 for ETH on Aave V3
    loan_to_value: float  # max LTV, e.g. 0.80
    liquidation_penalty: float  # e.g. 0.05
    volatility_30d: Optional[float] = None
    liquidity_score: float = 0.8  # 0-1
    can_be_collateral: bool = True


class DebtAsset(BaseModel):
    symbol: str
    name: str
    contract_address: Optional[str] = None
    balance: float
    price_usd: float
    value_usd: float
    borrow_rate: Optional[float] = None  # APY


class DeFiPosition(BaseModel):
    protocol: str  # "Aave V3"
    chain: str = "Ethereum Mainnet"
    chain_id: int = 1
    address: str
    collateral_assets: List[CollateralAsset] = []
    debt_assets: List[DebtAsset] = []
    total_collateral_value_usd: float = 0.0
    total_debt_value_usd: float = 0.0
    net_value_usd: float = 0.0
    health_factor: float = 0.0
    current_ltv: float = 0.0
    liquidation_threshold: float = 0.0  # weighted average
    max_ltv: float = 0.0  # weighted average
    liquidation_penalty: float = 0.05
    is_live: bool = True  # False = demo
    source: DataSource = DataSource(name="Aave V3", type="LIVE", provider="Aave on-chain")
    last_updated: Optional[str] = None


class DemoMode(BaseModel):
    enabled: bool = False
    scenario: Optional[str] = None  # "SUCCESSFUL_RESCUE", "SAFE_ABORT"
