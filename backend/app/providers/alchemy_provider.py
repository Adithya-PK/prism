"""
Alchemy Provider — fetches Ethereum wallet data via Alchemy JSON-RPC + REST APIs
With fast concurrent parallel public Ethereum RPC fallback support.
"""
import asyncio
import httpx
import logging
from typing import Optional, List, Dict, Any

from app.config import get_settings

logger = logging.getLogger(__name__)

# Resilient public RPC fallbacks if Alchemy key is not configured or fails
PUBLIC_FALLBACK_RPCS = [
    "https://cloudflare-eth.com",
    "https://eth.llamarpc.com",
    "https://rpc.ankr.com/eth",
]

# Known ERC-20 token contract addresses for fallback metadata & balance probing
KNOWN_TOKENS: Dict[str, Dict[str, Any]] = {
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": {"symbol": "USDC", "name": "USD Coin", "decimals": 6},
    "0xdac17f958d2ee523a2206206994597c13d831ec7": {"symbol": "USDT", "name": "Tether USD", "decimals": 6},
    "0x6b175474e89094c44da98b954eedeac495271d0f": {"symbol": "DAI", "name": "Dai Stablecoin", "decimals": 18},
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": {"symbol": "WBTC", "name": "Wrapped BTC", "decimals": 8},
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": {"symbol": "WETH", "name": "Wrapped Ether", "decimals": 18},
    "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9": {"symbol": "AAVE", "name": "Aave Token", "decimals": 18},
    "0x514910771af9ca656af840dff83e8264ecf986ca": {"symbol": "LINK", "name": "ChainLink Token", "decimals": 18},
    "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": {"symbol": "UNI", "name": "Uniswap", "decimals": 18},
    "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2": {"symbol": "MKR", "name": "Maker", "decimals": 18},
    "0xd533a949740bb3306d119cc777fa900ba034cd52": {"symbol": "CRV", "name": "Curve DAO Token", "decimals": 18},
    "0xba100000625a3754423978a60c9317c58a424e3d": {"symbol": "BAL", "name": "Balancer", "decimals": 18},
    "0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e": {"symbol": "YFI", "name": "yearn.finance", "decimals": 18},
    "0x4d224452801aced8b2f0aebe155379bb5d594381": {"symbol": "APE", "name": "ApeCoin", "decimals": 18},
    "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0": {"symbol": "MATIC", "name": "Polygon", "decimals": 18},
    "0xae78736cd615f374d3085123a210448e74fc6393": {"symbol": "rETH", "name": "Rocket Pool ETH", "decimals": 18},
    "0x5979d7b546e38e414f7e9822514be443a4800529": {"symbol": "wstETH", "name": "Wrapped stETH", "decimals": 18},
    "0xbe9895146f7af43049ca1c1ae358b0541ea49704": {"symbol": "cbETH", "name": "Coinbase Wrapped Staked ETH", "decimals": 18},
    "0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f": {"symbol": "GHO", "name": "GHO Stablecoin", "decimals": 18},
    "0x6c3ea9036406852006290770bedfcaba0e23a0e8": {"symbol": "PYUSD", "name": "PayPal USD", "decimals": 6},
    "0xcd5fe23c85820f7b72d0926fc9b05b43e359b7ee": {"symbol": "weETH", "name": "Wrapped eETH", "decimals": 18},
}


class AlchemyProvider:
    """
    Wraps Alchemy JSON-RPC and Alchemy-enhanced API calls.
    Includes automated concurrent public Ethereum RPC fallback.
    All calls are strictly READ-ONLY.
    """

    def __init__(self):
        self.settings = get_settings()
        self.rpc_url = self.settings.alchemy_rpc_url if self.settings.has_alchemy else PUBLIC_FALLBACK_RPCS[0]
        self.api_key = self.settings.alchemy_api_key

    def _get_active_rpc_urls(self) -> List[str]:
        urls = []
        if self.settings.has_alchemy:
            urls.append(self.settings.alchemy_rpc_url)
        urls.extend(PUBLIC_FALLBACK_RPCS)
        return urls

    async def _rpc_call(self, method: str, params: list, timeout: float = 3.5) -> Any:
        """Execute a JSON-RPC call against Alchemy or fallback RPC endpoints."""
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params,
        }
        
        last_err = None
        for endpoint in self._get_active_rpc_urls():
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.post(endpoint, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        if "error" in data:
                            raise ValueError(f"RPC error: {data['error']}")
                        return data.get("result")
            except Exception as e:
                last_err = e
                continue
                
        raise RuntimeError(f"Ethereum RPC error: {last_err}")

    async def get_block_number(self) -> int:
        result = await self._rpc_call("eth_blockNumber", [], timeout=3.0)
        return int(result, 16)

    async def get_eth_balance(self, address: str) -> float:
        """Returns native ETH balance in ETH (not wei)."""
        result = await self._rpc_call("eth_getBalance", [address, "latest"], timeout=3.0)
        wei = int(result, 16)
        return wei / 1e18

    async def get_token_balances(self, address: str) -> List[Dict[str, Any]]:
        """
        Uses alchemy_getTokenBalances if available (instant 1 call), 
        otherwise probes known tokens concurrently in parallel.
        """
        if self.settings.has_alchemy:
            try:
                result = await self._rpc_call(
                    "alchemy_getTokenBalances",
                    [address, "erc20"],
                    timeout=4.0
                )
                if result and "tokenBalances" in result:
                    return [
                        tb for tb in result["tokenBalances"]
                        if tb.get("tokenBalance") and tb["tokenBalance"] != "0x0000000000000000000000000000000000000000000000000000000000000000"
                    ]
            except Exception as e:
                logger.warning(f"alchemy_getTokenBalances error: {e}")

        # Concurrent parallel ERC-20 balanceOf probe
        padded_addr = address.lower().replace("0x", "").rjust(64, "0")
        balance_of_data = f"0x70a08231{padded_addr}"
        
        async def probe_single(contract_addr: str):
            try:
                call_param = {"to": contract_addr, "data": balance_of_data}
                res = await self._rpc_call("eth_call", [call_param, "latest"], timeout=2.0)
                if res and res != "0x" and int(res, 16) > 0:
                    return {
                        "contractAddress": contract_addr,
                        "tokenBalance": res
                    }
            except Exception:
                pass
            return None

        # Probe top 8 tokens concurrently in parallel
        top_contracts = list(KNOWN_TOKENS.keys())[:8]
        results = await asyncio.gather(*(probe_single(c) for c in top_contracts), return_exceptions=True)
        return [r for r in results if r and isinstance(r, dict)]

    async def get_token_metadata(self, contract_address: str) -> Dict[str, Any]:
        addr_lower = contract_address.lower()
        if addr_lower in KNOWN_TOKENS:
            return KNOWN_TOKENS[addr_lower]
        return {"symbol": "UNKNOWN", "name": "Unknown Token", "decimals": 18}

    async def get_nft_count(self, address: str) -> Optional[int]:
        return None

    async def get_gas_price(self) -> Optional[float]:
        try:
            result = await self._rpc_call("eth_gasPrice", [], timeout=2.0)
            gwei = int(result, 16) / 1e9
            return round(gwei, 2)
        except Exception:
            return 30.0
