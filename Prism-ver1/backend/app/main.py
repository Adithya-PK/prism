from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv

from app.models import PRISMRequest, PRISMResult, UserPosition, CollateralAsset, DebtAsset, MarketConditions
from app.pipeline import PRISMPipeline

load_dotenv()

app = FastAPI(title="PRISM Risk Management System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline = PRISMPipeline()

@app.post("/api/analyze", response_model=PRISMResult)
async def analyze(request: PRISMRequest):
    return await pipeline.analyze(request)

@app.post("/api/whatif", response_model=PRISMResult)
async def whatif(request: PRISMRequest):
    return await pipeline.analyze(request)

@app.get("/api/demo", response_model=PRISMRequest)
async def demo():
    return PRISMRequest(
        position=UserPosition(
            collateral=[CollateralAsset(asset="ETH", amount=3.2, price=2650.0, volatility=0.6, liquidity_score=0.9)],
            debt=[DebtAsset(asset="USDC", amount=6500.0, price=1.0)]
        ),
        market=MarketConditions(
            price_change_24h=-0.12,
            volatility=0.72,
            trend="bearish",
            gas_price_gwei=45.0,
            network_congestion=0.7
        ),
        liquidation_threshold=0.825,
        liquidation_penalty=0.05
    )

@app.get("/api/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
