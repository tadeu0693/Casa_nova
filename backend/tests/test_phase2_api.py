"""Phase 2 backend regression: CEP, project PUT, multi-store offers, cart, alerts."""
import os
import uuid

import pytest
import requests

BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL") or "").rstrip("/")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL must be set"


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth(api_client):
    r = api_client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": "demo@constroifacil.app", "password": "senha123"}, timeout=15)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['session_token']}"}


# ---------- CEP lookup ----------
class TestCep:
    def test_valid_cep_sao_paulo(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/cep/01310100", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["cep"] == "01310100"
        assert data["uf"] == "SP"
        assert "São Paulo" in data["city"] or data["city"]
        assert data["freight_base"] == 18.0
        assert data["freight_days"] == 2

    def test_cep_formatted_with_dash(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/cep/01310-100", timeout=15)
        assert r.status_code == 200
        assert r.json()["uf"] == "SP"

    def test_invalid_cep_length(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/cep/123", timeout=10)
        assert r.status_code == 400

    def test_cep_not_found(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/cep/00000000", timeout=15)
        assert r.status_code == 404


# ---------- Project update (Phase 2 new PUT) ----------
class TestProjectUpdate:
    def test_put_persists_layout(self, api_client, auth):
        payload = {"name": "TEST_phase2_layout", "build_type": "Casa térrea",
                   "width": 10, "length": 8,
                   "rooms": [{"name": "Sala", "width": 4, "length": 4, "x": 0, "y": 0}],
                   "cep": "01310100"}
        created = api_client.post(f"{BASE_URL}/api/projects", json=payload, headers=auth, timeout=15)
        assert created.status_code == 200
        pid = created.json()["project_id"]
        updated_rooms = [{"name": "Sala", "width": 5.5, "length": 4.5, "x": 1.5, "y": 2.0}]
        payload["rooms"] = updated_rooms
        upd = api_client.put(f"{BASE_URL}/api/projects/{pid}", json=payload, headers=auth, timeout=15)
        assert upd.status_code == 200, upd.text
        got = upd.json()
        assert got["project_id"] == pid
        room = got["rooms"][0]
        assert room["x"] == 1.5 and room["y"] == 2.0
        assert room["width"] == 5.5 and room["length"] == 4.5

        # GET to verify persistence
        listing = api_client.get(f"{BASE_URL}/api/projects", headers=auth, timeout=15)
        assert listing.status_code == 200
        found = [p for p in listing.json() if p.get("project_id") == pid]
        assert found, "created project not in list"
        assert found[0]["rooms"][0]["x"] == 1.5

    def test_put_unknown_returns_404(self, api_client, auth):
        payload = {"name": "x", "build_type": "Casa térrea", "width": 5, "length": 5,
                   "rooms": [], "cep": ""}
        r = api_client.put(f"{BASE_URL}/api/projects/project_missing_123",
                           json=payload, headers=auth, timeout=15)
        assert r.status_code == 404


# ---------- Multi-store offers ----------
class TestOffers:
    def test_offers_partner_stores_and_freight(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/offers", params={"q": "cimento", "uf": "SP", "cep": "01310100"},
                           timeout=25)
        # ML may 403/502; server handles that and returns 200 with error string
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["uf"] == "SP"
        stores = {p["store"] for p in data["partner_stores"]}
        assert "Leroy Merlin" in stores
        assert any("C&C" in s for s in stores)
        assert "Telhanorte" in stores
        for p in data["partner_stores"]:
            assert p["url"].startswith("http")
        # freight computed when uf provided (if ML returned offers)
        if data["offers"]:
            assert data["offers"][0]["freight"] > 0


# ---------- Cart ----------
class TestCart:
    offer_id = f"TEST_offer_{uuid.uuid4().hex[:8]}"

    def test_full_cart_flow(self, api_client, auth):
        # start clean
        api_client.delete(f"{BASE_URL}/api/cart/{self.offer_id}", headers=auth, timeout=10)

        payload = {"offer_id": self.offer_id, "title": "TEST_cimento", "price": 42.5,
                   "store": "Mercado Livre", "url": "https://x", "thumbnail": "",
                   "freight": 18.0, "quantity": 1}
        add = api_client.post(f"{BASE_URL}/api/cart", json=payload, headers=auth, timeout=10)
        assert add.status_code == 200

        listing = api_client.get(f"{BASE_URL}/api/cart", headers=auth, timeout=10)
        assert listing.status_code == 200
        data = listing.json()
        found = [i for i in data["items"] if i["offer_id"] == self.offer_id]
        assert found, "added item not found"
        assert data["grand_total"] >= 42.5 + 18.0

        rm = api_client.delete(f"{BASE_URL}/api/cart/{self.offer_id}", headers=auth, timeout=10)
        assert rm.status_code == 200
        listing2 = api_client.get(f"{BASE_URL}/api/cart", headers=auth, timeout=10)
        assert not any(i["offer_id"] == self.offer_id for i in listing2.json()["items"])

    def test_cart_requires_auth(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/cart", timeout=10)
        assert r.status_code == 401


# ---------- Alerts ----------
class TestAlerts:
    def test_full_alerts_flow(self, api_client, auth):
        payload = {"query": f"TEST_areia_{uuid.uuid4().hex[:6]}", "target_price": 55.0}
        c = api_client.post(f"{BASE_URL}/api/alerts", json=payload, headers=auth, timeout=10)
        assert c.status_code == 200
        alert_id = c.json()["alert_id"]
        assert alert_id.startswith("alert_")

        lst = api_client.get(f"{BASE_URL}/api/alerts", headers=auth, timeout=10)
        assert lst.status_code == 200
        assert any(a["alert_id"] == alert_id for a in lst.json())

        d = api_client.delete(f"{BASE_URL}/api/alerts/{alert_id}", headers=auth, timeout=10)
        assert d.status_code == 200

        lst2 = api_client.get(f"{BASE_URL}/api/alerts", headers=auth, timeout=10)
        assert not any(a["alert_id"] == alert_id for a in lst2.json())

    def test_alerts_requires_auth(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/alerts", timeout=10)
        assert r.status_code == 401
