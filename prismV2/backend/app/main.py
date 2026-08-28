"""
PRISM Backend — FastAPI Main Application
Predictive Risk Intelligence & Smart Protection for DeFi
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.api.routes import wallet, market, defi, risk, intervention, strategy, economics, rescue, explanation, dashboard, ml, simulation

# Configure logging
settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────
# Modern FastAPI Lifespan Handler
# ─────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    cfg = get_settings()
    logger.info("=" * 60)
    logger.info("PRISM — Predictive Risk Intelligence & Smart Protection for DeFi")
    logger.info("Predict. Protect. Preserve.")
    logger.info("=" * 60)
    logger.info(f"Alchemy configured: {cfg.has_alchemy}")
    logger.info(f"Gemini configured: {cfg.has_gemini}")
    logger.info(f"Data refresh: {cfg.data_refresh_seconds}s")
    logger.info("READ-ONLY mode. No transactions will be executed.")
    logger.info("=" * 60)
    yield


# ─────────────────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────────────────
app = FastAPI(
    title="PRISM",
    description="Predictive Risk Intelligence & Smart Protection for DeFi",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─────────────────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(wallet.router, prefix=API_PREFIX)
app.include_router(market.router, prefix=API_PREFIX)
app.include_router(defi.router, prefix=API_PREFIX)
app.include_router(risk.router, prefix=API_PREFIX)
app.include_router(intervention.router, prefix=API_PREFIX)
app.include_router(strategy.router, prefix=API_PREFIX)
app.include_router(economics.router, prefix=API_PREFIX)
app.include_router(rescue.router, prefix=API_PREFIX)
app.include_router(explanation.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(ml.router, prefix=API_PREFIX)
app.include_router(simulation.router, prefix=API_PREFIX)


# ─────────────────────────────────────────────────────────
# Root
# ─────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {
        "name": "PRISM",
        "full_name": "Predictive Risk Intelligence & Smart Protection for DeFi",
        "tagline": "Predict. Protect. Preserve.",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
        "api": "/api/v1",
    }


@app.get("/health", tags=["Health"])
async def health():
    cfg = get_settings()
    return {
        "status": "healthy",
        "alchemy_configured": cfg.has_alchemy,
        "gemini_configured": cfg.has_gemini,
        "coingecko_key": cfg.has_coingecko_key,
        "refresh_seconds": cfg.data_refresh_seconds,
    }
