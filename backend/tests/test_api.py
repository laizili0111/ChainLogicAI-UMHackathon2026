import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_analyze_crisis_no_sku():
    response = client.post("/api/analyze-crisis", json={"trigger_text": "This email has no valid part number."})
    assert response.status_code == 200
    data = response.json()
    assert "error" in data
    assert "Z.AI could not identify a valid component SKU" in data["error"]

def test_analyze_crisis_safe_state():
    # 'BRK-PAD-99' has 850 stock and requires 300. This triggers SAFE state logic.
    response = client.post("/api/analyze-crisis", json={"trigger_text": "We have an issue with BRK-PAD-99."})
    assert response.status_code == 200
    data = response.json()
    assert "crisis_analysis" in data
    assert data["crisis_analysis"]["status"] == "SAFE"
    assert "confidence_score" in data["glm_recommendation"]
    assert data["glm_recommendation"]["confidence_score"] == 1.0

def test_analyze_crisis_critical_state():
    # 'AE-V8-SENS' has 12 stock but needs 40. This triggers AI or Fallback logic.
    response = client.post("/api/analyze-crisis", json={"trigger_text": "Customs hold for AE-V8-SENS."})
    assert response.status_code == 200
    data = response.json()
    
    if "error" in data:
        pytest.fail(f"Endpoint returned error: {data['error']}")
        
    assert "crisis_analysis" in data
    assert data["crisis_analysis"]["status"] == "CRITICAL"
    assert "trade_off_options" in data
    assert len(data["trade_off_options"]) > 0
    
    # Verify our new Confidence Score and Source Attribution logic works
    assert "confidence_score" in data["glm_recommendation"]
    assert "computation_breakdown" in data["trade_off_options"][0]
    assert "source_attribution" in data["trade_off_options"][0]["computation_breakdown"]

def test_execute_decision_invalid_sku():
    response = client.post("/api/execute-decision", json={"sku": "", "option_id": "A", "action": "Test"})
    assert response.status_code == 400
