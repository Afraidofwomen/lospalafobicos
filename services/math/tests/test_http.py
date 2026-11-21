from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_verify_equivalent_over_http():
    response = client.post(
        "/verify",
        json={"problem": r"(x+1)^{2}", "step": r"x^{2}+2x+1", "relation": "equivalent"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is True
    assert body["misconception"] is None
    assert "nextStepLatex" in body


def test_parse_error_is_422():
    response = client.post(
        "/verify",
        json={"problem": r"\notacommand{{{", "step": "x", "relation": "equivalent"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "parse_error"


def test_rejects_unknown_relation():
    response = client.post(
        "/verify",
        json={"problem": "x", "step": "x", "relation": "magic"},
    )
    assert response.status_code == 422
