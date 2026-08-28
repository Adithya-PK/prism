"""
PRISM Configuration
"""
import os
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # Alchemy
    alchemy_rpc_url: str = ""

    # Gemini
    gemini_api_key: str = ""

    # CoinGecko (optional)
    coingecko_api_key: str = ""

    # Data refresh
    data_refresh_seconds: int = 10

    # Logging
    log_level: str = "INFO"

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # App
    app_name: str = "PRISM"
    app_version: str = "1.0.0"
    app_description: str = "Predictive Risk Intelligence & Smart Protection for DeFi"

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def has_alchemy(self) -> bool:
        return bool(self.alchemy_rpc_url and self.alchemy_rpc_url != "PASTE_YOUR_ALCHEMY_ENDPOINT_HERE")

    @property
    def has_gemini(self) -> bool:
        return bool(self.gemini_api_key and self.gemini_api_key != "PASTE_YOUR_GEMINI_API_KEY_HERE")

    @property
    def has_coingecko_key(self) -> bool:
        return bool(self.coingecko_api_key)

    @property
    def alchemy_api_key(self) -> str:
        """Extract the API key from the full RPC URL."""
        if self.has_alchemy:
            parts = self.alchemy_rpc_url.rstrip("/").split("/")
            return parts[-1]
        return ""


@lru_cache()
def get_settings() -> Settings:
    return Settings()
