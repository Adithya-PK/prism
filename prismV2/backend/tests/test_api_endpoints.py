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
