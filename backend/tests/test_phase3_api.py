"""Phase 3 tests: templates catalog, per_room estimate breakdown, and alerts CRUD regression."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://build-discount-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
EMAIL = "demo@constroifacil.app"
PASSWORD = "senha123"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["session_token"]


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---- Templates catalog ----
class TestTemplates:
    def test_templates_returns_four_templates(self):
        r = requests.get(f"{API}/templates", timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "templates" in body
        ids = [t["id"] for t in body["templates"]]
        for expected in ("kitnet_30", "edicula_25", "casa_60", "casa_90"):
            assert expected in ids, f"missing template id {expected}: {ids}"

    def test_templates_rooms_shape(self):
        r = requests.get(f"{API}/templates", timeout=15)
        templates = r.json()["templates"]
        kitnet = next(t for t in templates if t["id"] == "kitnet_30")
        assert len(kitnet["rooms"]) == 3
        for room in kitnet["rooms"]:
            for key in ("name", "width", "length", "x", "y"):
                assert key in room, f"missing key {key} in room {room}"
            assert room["width"] > 0 and room["length"] > 0


# ---- Estimate per-room breakdown ----
class TestEstimatePerRoom:
    project_payload = {
        "name": "TEST_phase3_perroom",
        "build_type": "Casa térrea",
        "width": 8.0,
        "length": 7.5,
        "rooms": [
            {"name": "Sala", "width": 4.0, "length": 4.0, "x": 0, "y": 0},
            {"name": "Cozinha", "width": 4.0, "length": 3.5, "x": 4.0, "y": 0},
            {"name": "Banheiro", "width": 2.0, "length": 2.0, "x": 0, "y": 4.0},
            {"name": "Quarto", "width": 3.0, "length": 3.5, "x": 2.0, "y": 4.0},
        ],
        "cep": "",
    }

    def test_estimate_per_room_present(self, auth):
        r = requests.post(f"{API}/estimate", json=self.project_payload, headers=auth, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "per_room" in data
        assert len(data["per_room"]) == 4
        first = data["per_room"][0]
        for key in ("name", "area", "cost", "cost_per_m2", "share"):
            assert key in first

    def test_per_room_costs_sum_to_total(self, auth):
        r = requests.post(f"{API}/estimate", json=self.project_payload, headers=auth, timeout=15)
        data = r.json()
        s = round(sum(item["cost"] for item in data["per_room"]), 2)
        # Allow tiny rounding drift from 2-decimal rounding of each item.
        assert abs(s - data["estimated_total"]) < 1.0, (s, data["estimated_total"])

    def test_wet_rooms_have_higher_cost_per_m2(self, auth):
        r = requests.post(f"{API}/estimate", json=self.project_payload, headers=auth, timeout=15)
        rooms = {item["name"]: item for item in r.json()["per_room"]}
        # Banheiro & Cozinha have 1.35 multiplier; Sala & Quarto have 1.0
        assert rooms["Banheiro"]["cost_per_m2"] > rooms["Sala"]["cost_per_m2"]
        assert rooms["Cozinha"]["cost_per_m2"] > rooms["Quarto"]["cost_per_m2"]

    def test_shares_sum_to_100(self, auth):
        r = requests.post(f"{API}/estimate", json=self.project_payload, headers=auth, timeout=15)
        total_share = round(sum(item["share"] for item in r.json()["per_room"]), 1)
        assert abs(total_share - 100.0) < 0.5


# ---- Alerts CRUD regression ----
class TestAlertsCRUD:
    created_id = None

    def test_create_alert(self, auth):
        r = requests.post(
            f"{API}/alerts",
            json={"query": "TEST_phase3_cimento", "target_price": 39.9},
            headers=auth,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["query"] == "TEST_phase3_cimento"
        assert body["target_price"] == 39.9
        assert "alert_id" in body
        TestAlertsCRUD.created_id = body["alert_id"]

    def test_list_alert_contains_created(self, auth):
        r = requests.get(f"{API}/alerts", headers=auth, timeout=15)
        assert r.status_code == 200
        ids = [a["alert_id"] for a in r.json()]
        assert TestAlertsCRUD.created_id in ids

    def test_delete_alert(self, auth):
        r = requests.delete(f"{API}/alerts/{TestAlertsCRUD.created_id}", headers=auth, timeout=15)
        assert r.status_code == 200
        # Verify removed from list
        r2 = requests.get(f"{API}/alerts", headers=auth, timeout=15)
        ids = [a["alert_id"] for a in r2.json()]
        assert TestAlertsCRUD.created_id not in ids
