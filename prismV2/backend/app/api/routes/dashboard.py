"""
Dashboard API Route — aggregates all PRISM engines into one fast response
Optimized with concurrent async execution & tight timeouts.
"""
import asyncio
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from eth_utils import is_address

from app.services.wallet_service import WalletService
from app.services.market_service import MarketService
from app.services.defi_service import DeFiService
from app.services.risk_engine import RiskEngine
from app.services.predictive_engine import PredictiveEngine
from app.services.safety_engine import SafetyEngine
from app.services.intervention_engine import InterventionEngine
from app.services.strategy_engine import StrategyEngine
from app.services.economics_engine import EconomicsEngine
from app.services.rescue_simulator import SafetyGateEngine
from app.services.llm_service import LLMService
from app.models.risk import DecisionType
from app.models.position import DeFiPosition, CollateralAsset, DebtAsset
from app.models.wallet import DataSource

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

wallet_service = WalletService()
market_service = MarketService()
defi_service = DeFiService()
risk_engine = RiskEngine()
predictive_engine = PredictiveEngine()
safety_engine = SafetyEngine()
intervention_engine = InterventionEngine()
strategy_engine = StrategyEngine()
economics_engine = EconomicsEngine()
gateEngine = SafetyGateEngine()
llm_service = LLMService()

ACTIVITY_LOG: list = []


def log_activity(msg: str):
    now = datetime.now(timezone.utc).strftime("%H:%M:%S")
    ACTIVITY_LOG.append({"time": now, "message": msg})
    if len(ACTIVITY_LOG) > 50:
        ACTIVITY_LOG.pop(0)


def get_demo_position(scenario: str = "SUCCESSFUL_RESCUE") -> DeFiPosition:
    """Return a controlled demo lending position for hackathon demonstration."""
    if scenario == "SAFE_ABORT":
        eth_price = 2500.0
        hf = 1.06
        eth_col = CollateralAsset(
            symbol="WETH", name="Wrapped Ether",
            contract_address="0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
            balance=1.0, price_usd=eth_price, value_usd=eth_price,
            liquidation_threshold=0.825, loan_to_value=0.80,
            liquidation_penalty=0.05, volatility_30d=0.85,
            liquidity_score=0.40,
        )
        usdc_debt = DebtAsset(
            symbol="USDC", name="USD Coin",
            contract_address="0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            balance=1900.0, price_usd=1.0, value_usd=1900.0,
        )
        return DeFiPosition(
            protocol="Aave V3",
            address="DEMO",
            collateral_assets=[eth_col],
            debt_assets=[usdc_debt],
            total_collateral_value_usd=eth_price,
            total_debt_value_usd=1900.0,
            net_value_usd=eth_price - 1900.0,
            health_factor=hf,
            current_ltv=1900.0 / eth_price,
            liquidation_threshold=0.825,
            max_ltv=0.80,
            liquidation_penalty=0.05,
            is_live=False,
            source=DataSource(name="PRISM Demo", type="SIMULATED", provider="PRISM"),
        )
    else:
        eth_price = 2800.0
        wbtc_price = 65000.0
        eth_col = CollateralAsset(
            symbol="WETH", name="Wrapped Ether",
            contract_address="0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
            balance=3.5, price_usd=eth_price, value_usd=3.5 * eth_price,
            liquidation_threshold=0.825, loan_to_value=0.80,
            liquidation_penalty=0.05, volatility_30d=0.65,
            liquidity_score=1.0,
        )
        wbtc_col = CollateralAsset(
            symbol="WBTC", name="Wrapped BTC",
            contract_address="0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
            balance=0.05, price_usd=wbtc_price, value_usd=0.05 * wbtc_price,
            liquidation_threshold=0.70, loan_to_value=0.65,
            liquidation_penalty=0.075, volatility_30d=0.60,
            liquidity_score=0.95,
        )
        usdc_debt = DebtAsset(
            symbol="USDC", name="USD Coin",
            contract_address="0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            balance=7200.0, price_usd=1.0, value_usd=7200.0,
        )
        dai_debt = DebtAsset(
            symbol="DAI", name="Dai Stablecoin",
            contract_address="0x6b175474e89094c44da98b954eedeac495271d0f",
            balance=1000.0, price_usd=1.0, value_usd=1000.0,
        )
        total_col = eth_col.value_usd + wbtc_col.value_usd
        total_debt = usdc_debt.value_usd + dai_debt.value_usd
        weighted_lt = (
            eth_col.value_usd * eth_col.liquidation_threshold +
            wbtc_col.value_usd * wbtc_col.liquidation_threshold
        ) / total_col
        hf = (total_col * weighted_lt) / total_debt

        return DeFiPosition(
            protocol="Aave V3",
            address="DEMO",
            collateral_assets=[eth_col, wbtc_col],
            debt_assets=[usdc_debt, dai_debt],
            total_collateral_value_usd=total_col,
            total_debt_value_usd=total_debt,
            net_value_usd=total_col - total_debt,
            health_factor=round(hf, 4),
            current_ltv=total_debt / total_col,
            liquidation_threshold=round(weighted_lt, 4),
            max_ltv=0.78,
            liquidation_penalty=0.05,
            is_live=False,
            source=DataSource(name="PRISM Demo", type="SIMULATED", provider="PRISM"),
        )


@router.get("/{address}")
async def get_dashboard(
    address: str,
    demo: bool = Query(False, description="Use demo position"),
    scenario: str = Query("SUCCESSFUL_RESCUE", description="Demo scenario: SUCCESSFUL_RESCUE or SAFE_ABORT"),
    include_explanation: bool = Query(True, description="Generate Gemini explanation"),
):
    """
    Aggregated PRISM dashboard with concurrent async data fetching.
    """
    if not is_address(address) and address.upper() != "DEMO":
        raise HTTPException(status_code=400, detail=f"Invalid Ethereum address: {address}")

    try:
        log_activity("Dashboard refresh initiated")
        mode = "DEMO" if demo or address.upper() == "DEMO" else "LIVE"

        market_symbols = ["ETH", "WBTC", "WETH", "USDC", "USDT", "DAI", "AAVE", "LINK"]

        # Run Wallet, Market, and DeFi discovery concurrently
        async def fetch_wallet_task():
            if mode == "LIVE":
                try:
                    return await asyncio.wait_for(wallet_service.get_wallet_data(address), timeout=5.0)
                except Exception as e:
                    logger.warning(f"Wallet fetch error: {e}")
                    return None
            return None

        async def fetch_market_task():
            try:
                return await asyncio.wait_for(market_service.get_market_data(market_symbols), timeout=4.0)
            except Exception as e:
                logger.warning(f"Market fetch error: {e}")
                return None

        async def fetch_defi_task():
            if mode == "DEMO":
                return get_demo_position(scenario)
            else:
                try:
                    return await asyncio.wait_for(defi_service.discover_positions(address), timeout=4.5)
                except Exception as e:
                    logger.warning(f"DeFi position lookup error: {e}")
                    return None

        wallet_res, market_data, position = await asyncio.gather(
            fetch_wallet_task(),
            fetch_market_task(),
            fetch_defi_task(),
        )

        wallet_data = wallet_res
        position_source = "DEMO" if mode == "DEMO" else "LIVE"

        # Update demo position prices with live market data if available
        if mode == "DEMO" and position and market_data:
            eth_price = market_data.prices.get("ETH") or market_data.prices.get("WETH")
            wbtc_price = market_data.prices.get("WBTC")
            for ca in position.collateral_assets:
                if ca.symbol in ["ETH", "WETH"] and eth_price:
                    ca.price_usd = eth_price.price_usd
                    ca.value_usd = ca.balance * ca.price_usd
                elif ca.symbol == "WBTC" and wbtc_price:
                    ca.price_usd = wbtc_price.price_usd
                    ca.value_usd = ca.balance * ca.price_usd
            position.total_collateral_value_usd = sum(a.value_usd for a in position.collateral_assets)
            position.net_value_usd = position.total_collateral_value_usd - position.total_debt_value_usd
            if position.total_debt_value_usd > 0:
                position.health_factor = round(
                    (position.total_collateral_value_usd * position.liquidation_threshold) /
                    position.total_debt_value_usd, 4
                )

        price_change_map = {}
        volatility_map = {}
        if market_data:
            for sym, ap in market_data.prices.items():
                if ap.price_change_24h is not None:
                    price_change_map[sym] = ap.price_change_24h
                if ap.volatility_30d is not None:
                    volatility_map[sym] = ap.volatility_30d

        # Run PRISM Engines if position exists
        risk = None
        prediction = None
        safety = None
        intervention = None
        strategies = []
        economics = None
        safety_gate = None
        final_decision = DecisionType.MONITOR
        explanation = None
        explanation_source = "PRISM Deterministic"

        if position:
            risk = risk_engine.analyze(position, volatility_map)
            prediction = predictive_engine.predict(position, volatility_map, price_change_map, horizon_hours=4)
            safety = safety_engine.calculate(position, prediction, volatility_map, price_change_map)
            intervention = intervention_engine.calculate(position, safety)

            gas_price = 30.0
            if market_data and market_data.network_gas_price_gwei:
                gas_price = market_data.network_gas_price_gwei

            strategies = strategy_engine.evaluate(position, intervention, safety, gas_price)
            economics = economics_engine.evaluate(position, strategies)
            safety_gate = gateEngine.run(position, intervention, strategies, safety)

            if not intervention.required or risk.risk_level.value in ["SAFE", "LOW"]:
                final_decision = DecisionType.MONITOR
            elif safety_gate.all_passed and economics.economic_decision == DecisionType.RESCUE:
                final_decision = DecisionType.RESCUE
            elif not safety_gate.all_passed:
                final_decision = DecisionType.ABORT
            else:
                final_decision = economics.economic_decision

            log_activity(f"PRISM decision: {final_decision.value}")

            if include_explanation:
                try:
                    prism_result = {
                        "risk": risk.model_dump() if risk else {},
                        "prediction": prediction.model_dump() if prediction else {},
                        "safety": safety.model_dump() if safety else {},
                        "intervention": intervention.model_dump() if intervention else {},
                        "economics": economics.model_dump() if economics else {},
                        "decision": final_decision.value,
                        "strategies": [s.model_dump() for s in strategies],
                    }
                    # Fast timeout for explanation so response never hangs
                    explanation, explanation_source = await asyncio.wait_for(
                        llm_service.generate_explanation(prism_result),
                        timeout=2.5
                    )
                except Exception:
                    explanation, explanation_source = llm_service._deterministic_explain(prism_result), "PRISM Deterministic"

        return {
            "mode": mode,
            "network": "Ethereum Mainnet",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "wallet": wallet_data.model_dump() if wallet_data else None,
            "wallet_error": None,
            "portfolio": {
                "total_value_usd": wallet_data.total_portfolio_value_usd if wallet_data else 0.0,
                "token_count": len(wallet_data.tokens) if wallet_data else 0,
            } if wallet_data else None,
            "market": market_data.model_dump() if market_data else None,
            "defi_position": position.model_dump() if position else None,
            "defi_position_source": position_source,
            "defi_error": None,
            "has_position": position is not None,
            "risk": risk.model_dump() if risk else None,
            "prediction": prediction.model_dump() if prediction else None,
            "safety": safety.model_dump() if safety else None,
            "intervention": intervention.model_dump() if intervention else None,
            "strategies": [s.model_dump() for s in strategies],
            "economics": economics.model_dump() if economics else None,
            "safety_gate": safety_gate.model_dump() if safety_gate else None,
            "decision": final_decision.value,
            "explanation": explanation,
            "explanation_source": explanation_source,
            "activity": list(reversed(ACTIVITY_LOG[-20:])),
            "data_sources": {
                "blockchain": "Alchemy / Ethereum" if mode == "LIVE" else "N/A",
                "market": "CoinGecko",
                "defi": "Aave V3 on-chain" if (position and position.is_live) else "PRISM Demo",
                "risk": "PRISM Risk Model",
                "prediction": "PRISM Predictive Risk Model",
                "explanation": explanation_source or "N/A",
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Dashboard failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Dashboard aggregation failed: {e}")
