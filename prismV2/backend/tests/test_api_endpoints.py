"""
API Endpoints Integration Tests
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "PRISM"
    assert data["status"] == "running"


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "refresh_seconds" in data


def test_dashboard_demo_successful_rescue():
    response = client.get("/api/v1/dashboard/DEMO?demo=true&scenario=SUCCESSFUL_RESCUE")
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "DEMO"
    assert data["has_position"] is True
    assert data["defi_position"] is not None
    assert data["risk"] is not None
    assert data["prediction"] is not None
    assert data["safety"] is not None
    assert data["intervention"] is not None
    assert len(data["strategies"]) == 4
    assert data["economics"] is not None
    assert data["decision"] in ["RESCUE", "MONITOR", "ABORT"]
    assert "explanation" in data


def test_dashboard_demo_safe_abort():
    response = client.get("/api/v1/dashboard/DEMO?demo=true&scenario=SAFE_ABORT")
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "DEMO"
    assert data["has_position"] is True
    assert data["decision"] in ["ABORT", "MONITOR"]


def test_rescue_simulation_endpoint():
    dash_res = client.get("/api/v1/dashboard/DEMO?demo=true&scenario=SUCCESSFUL_RESCUE")
    dash = dash_res.json()
    
    payload = {
        "position": dash["defi_position"],
        "strategies": dash["strategies"],
        "intervention": dash["intervention"],
        "safety": dash["safety"],
        "force_abort": False
    }
    response = client.post("/api/v1/rescue/simulate", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert result["simulated"] is True
    assert "steps" in result
    assert len(result["steps"]) == 9
    assert result["final_health_factor"] >= result["original_health_factor"]


def test_ml_predict_endpoint():
    payload = {
        "health_factor": 1.05,
        "eth_return_24h": -0.10,
        "volatility_30d": 0.85,
        "debt_ratio": 0.75,
        "distance_to_liquidation": 0.047,
        "hf_velocity": -0.05,
        "crash_magnitude": 0.10,
    }
    response = client.post("/api/v1/ml/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "probability" in data
    assert 0.0 <= data["probability"] <= 1.0
    assert data["risk_class"] in ["CRITICAL", "HIGH", "MODERATE", "LOW", "SAFE"]
    assert "confidence" in data


def test_simulation_calculate_endpoint():
    payload = {
        "eth_amount": 10.0,
        "eth_price": 4000.0,
        "debt_usdc": 30000.0,
        "liquidation_threshold": 0.825,
        "flash_fee": 0.0005,
        "dex_fee": 0.003,
        "slippage": 0.004,
        "gas_usd": 25.0,
    }
    response = client.post("/api/v1/simulation/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "SIMULATION"
    assert data["health_factor"] == 1.10
    assert "target_hf_data" in data
    assert "ml_prediction" in data
    assert "intervention" in data
    assert "capital_preservation" in data
    assert data["decision"] in ["RESCUE", "ALREADY_SAFE", "DO_NOT_RESCUE", "EXECUTION_UNSAFE"]


def test_simulation_crash_endpoint():
    payload = {
        "position": {
            "eth_amount": 10.0,
            "eth_price": 4000.0,
            "debt_usdc": 30000.0,
            "liquidation_threshold": 0.825,
            "flash_fee": 0.0005,
            "dex_fee": 0.003,
            "slippage": 0.004,
            "gas_usd": 25.0,
        },
        "crash_pct": -15.0,
    }
    response = client.post("/api/v1/simulation/crash", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["crash_applied"] == -15.0
    assert data["new_eth_price"] == 3400.0
    assert data["health_factor"] < 1.0  # (10 * 3400 * 0.825) / 30000 = 0.935
    assert data["risk_level"] in ["CRITICAL", "LIQUIDATABLE"]
    assert data["ml_prediction"]["probability"] > 0.60


def test_simulation_rescue_endpoint():
    payload = {
        "eth_amount": 10.0,
        "eth_price": 3400.0,
        "debt_usdc": 30000.0,
        "liquidation_threshold": 0.825,
        "flash_fee": 0.0005,
        "dex_fee": 0.003,
        "slippage": 0.004,
        "gas_usd": 25.0,
    }
    response = client.post("/api/v1/simulation/rescue", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["steps"]) == 14
    assert data["final_hf"] >= data["original_hf"]
    assert "capital_saved" in data
    assert "capital_preservation_score" in data
