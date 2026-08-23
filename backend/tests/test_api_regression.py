import os

import pytest
import requests


BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")


@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def session_token(api_client):
    response = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "demo@constroifacil.app", "password": "senha123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == "demo@constroifacil.app"
    return data["session_token"]


def test_auth_me_and_projects(api_client, session_token):
    headers = {"Authorization": f"Bearer {session_token}"}
    me = api_client.get(f"{BASE_URL}/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["user"]["email"] == "demo@constroifacil.app"
    projects = api_client.get(f"{BASE_URL}/api/projects", headers=headers)
    assert projects.status_code == 200
    assert isinstance(projects.json(), list)


def test_create_project_and_estimate(api_client, session_token):
    headers = {"Authorization": f"Bearer {session_token}"}
    payload = {
        "name": "TEST_regression_project",
        "build_type": "Casa térrea",
        "width": 8,
        "length": 12,
        "rooms": [{"name": "Sala", "width": 4, "length": 4}],
        "cep": "01001000",
    }
    created = api_client.post(f"{BASE_URL}/api/projects", json=payload, headers=headers)
    assert created.status_code == 200
    assert created.json()["name"] == payload["name"]
    estimate = api_client.post(f"{BASE_URL}/api/estimate", json=payload, headers=headers)
    assert estimate.status_code == 200
    data = estimate.json()
    assert data["area"] == 96.0
    assert data["estimated_total"] > 0
    assert any(item["name"] == "Cimento 50kg" for item in data["materials"])


def test_offers_returns_structured_external_failure(api_client):
    response = api_client.get(f"{BASE_URL}/api/offers?q=cimento", timeout=20)
    assert response.status_code in (200, 502)
    if response.status_code == 502:
        assert response.json()["detail"] == "Não foi possível consultar as ofertas agora"
    else:
        assert isinstance(response.json()["offers"], list)