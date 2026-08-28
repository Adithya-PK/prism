"""
Wallet Service — aggregates blockchain data into normalized WalletData model
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from app.providers.alchemy_provider import AlchemyProvider
from app.providers.coingecko_provider import CoinGeckoProvider
from app.models.wallet import WalletData, TokenBalance, DataSource
from app.config import get_settings

logger = logging.getLogger(__name__)

# Minimum USD value to include in portfolio
MIN_TOKEN_VALUE_USD = 0.10


class WalletService:
    def __init__(self):
        self.alchemy = AlchemyProvider()
        self.coingecko = CoinGeckoProvider()
        self.settings = get_settings()

    async def get_wallet_data(self, address: str) -> WalletData:
        """
        Fetches complete wallet data: ETH + ERC-20 balances with USD prices.
        """
        from eth_utils import to_checksum_address
        try:
            address = to_checksum_address(address)
        except Exception:
            raise ValueError(f"Invalid Ethereum address: {address}")

        # 1. Get block number
        try:
            block_number = await self.alchemy.get_block_number()
        except Exception as e:
            logger.error(f"Block number failed: {e}")
            block_number = None

        # 2. Get native ETH balance
        try:
            eth_balance = await self.alchemy.get_eth_balance(address)
        except Exception as e:
            logger.error(f"ETH balance failed: {e}")
            raise RuntimeError(f"Cannot fetch wallet data: {e}")

        # 3. Get ERC-20 balances
        try:
            raw_token_balances = await self.alchemy.get_token_balances(address)
        except Exception as e:
            logger.warning(f"Token balance fetch failed: {e}")
            raw_token_balances = []

        # 4. Collect all symbols for price lookup
        token_data: List[Dict[str, Any]] = []
        symbols_needed = ["ETH"]

        for tb in raw_token_balances:
            contract = tb.get("contractAddress", "")
            raw_balance = tb.get("tokenBalance", "0x0")
            try:
                raw_int = int(raw_balance, 16) if raw_balance.startswith("0x") else int(raw_balance)
            except:
                continue
            if raw_int == 0:
                continue

            try:
                meta = await self.alchemy.get_token_metadata(contract)
            except:
                meta = {"symbol": "UNKNOWN", "name": "Unknown Token", "decimals": 18}

            decimals = meta.get("decimals", 18) or 18
            balance = raw_int / (10 ** decimals)
            if balance < 1e-12:
                continue

            symbol = meta.get("symbol", "UNKNOWN")
            token_data.append({
                "symbol": symbol,
                "name": meta.get("name", symbol),
                "contract": contract,
                "decimals": decimals,
                "balance": balance,
                "logo": meta.get("logo"),
            })
            if symbol not in symbols_needed and symbol != "UNKNOWN":
                symbols_needed.append(symbol)

        # 5. Fetch prices for all tokens at once
        try:
            prices = await self.coingecko.get_prices(symbols_needed)
        except Exception as e:
            logger.warning(f"Price fetch failed: {e}")
            prices = {}

        # 6. Build ETH token entry
        eth_price_data = prices.get("ETH", {})
        eth_price = eth_price_data.get("price_usd", 0.0)
        eth_value = eth_balance * eth_price

        tokens: List[TokenBalance] = []
        if eth_balance > 0:
            tokens.append(TokenBalance(
                symbol="ETH",
                name="Ether",
                decimals=18,
                balance=eth_balance,
                price_usd=eth_price if eth_price else None,
                value_usd=eth_value if eth_price else None,
                price_change_24h=eth_price_data.get("change_24h"),
                is_native=True,
                source=DataSource(name="Alchemy + CoinGecko", type="LIVE", provider="Alchemy, CoinGecko"),
            ))

        # 7. Build ERC-20 entries
        for td in token_data:
            sym = td["symbol"]
            price_data = prices.get(sym, {})
            price = price_data.get("price_usd", 0.0)
            value = td["balance"] * price if price else 0.0

            if price and value < MIN_TOKEN_VALUE_USD:
                continue  # Skip dust

            tokens.append(TokenBalance(
                symbol=sym,
                name=td["name"],
                contract_address=td["contract"],
                decimals=td["decimals"],
                balance=td["balance"],
                price_usd=price if price else None,
                value_usd=value if price else None,
                price_change_24h=price_data.get("change_24h"),
                logo_url=td.get("logo"),
                source=DataSource(name="Alchemy + CoinGecko", type="LIVE", provider="Alchemy, CoinGecko"),
            ))

        # 8. Calculate total portfolio value
        total_value = sum(t.value_usd for t in tokens if t.value_usd)

        # 9. Calculate allocation %
        if total_value > 0:
            for t in tokens:
                if t.value_usd:
                    t.allocation_pct = round(t.value_usd / total_value * 100, 2)

        # 10. Sort by value descending
        tokens.sort(key=lambda t: t.value_usd or 0, reverse=True)

        # 11. NFT count (optional)
        try:
            nft_count = await self.alchemy.get_nft_count(address)
        except:
            nft_count = None

        return WalletData(
            address=address,
            network="Ethereum Mainnet",
            chain_id=1,
            block_number=block_number,
            eth_balance=eth_balance,
            tokens=tokens,
            total_portfolio_value_usd=total_value,
            nft_count=nft_count,
            last_updated=datetime.now(timezone.utc).isoformat(),
        )
