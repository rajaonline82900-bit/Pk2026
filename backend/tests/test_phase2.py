"""Phase-2 enhancement tests: withdrawal UPI/Bank, settings new fields, date-aware results,
reverse-result, auto-fetch stub, user detail endpoint."""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://clube-matka-games.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@m11clube.com"
ADMIN_PASSWORD = "admin123"
TEST_MOBILE = "9999999999"
TEST_MPIN = "1234"


def uh(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{API}/admin/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="module")
def user_token(s):
    r = s.post(f"{API}/auth/login", json={"mobile": TEST_MOBILE, "mpin": TEST_MPIN})
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="module", autouse=True)
def widen_withdraw_window(s, admin_token):
    """Set 24h window so withdraw tests run irrespective of clock."""
    s.patch(f"{API}/admin/settings", headers=uh(admin_token),
            json={"withdraw_open_time": "00:00", "withdraw_close_time": "23:59"})
    yield


# ---------- Settings new fields ----------
class TestSettingsNewFields:
    def test_get_settings_has_new_keys(self, s):
        r = s.get(f"{API}/settings")
        assert r.status_code == 200
        data = r.json()
        for k in ("telegram_url", "withdraw_open_time", "withdraw_close_time", "result_api_url", "posters"):
            assert k in data, f"missing key {k} in settings"
        assert isinstance(data["posters"], list)

    def test_admin_update_posters(self, s, admin_token):
        posters = [
            {"image_url": "https://example.com/a.png", "link": "https://a"},
            {"image_url": "https://example.com/b.png", "link": ""},
        ]
        r = s.patch(f"{API}/admin/settings", headers=uh(admin_token), json={"posters": posters})
        assert r.status_code == 200
        data = r.json()
        assert data.get("posters") == posters
        # verify persists via public GET
        g = s.get(f"{API}/settings").json()
        assert g["posters"] == posters


# ---------- Withdrawal validation ----------
class TestWithdrawValidation:
    def test_withdraw_upi_success(self, s, admin_token, user_token):
        # Top-up wallet first via admin adjust to have funds
        users = s.get(f"{API}/admin/users", headers=uh(admin_token)).json()
        u = next(x for x in users if x.get("mobile") == TEST_MOBILE)
        s.post(f"{API}/admin/wallet/adjust", headers=uh(admin_token),
               json={"user_id": u["id"], "amount": 1000, "note": "TEST_topup"})
        r = s.post(f"{API}/wallet/withdraw", headers=uh(user_token),
                   json={"amount": 500, "method": "upi", "upi_id": "test@upi"})
        assert r.status_code == 200, f"withdraw upi failed: {r.text}"
        tid = r.json().get("transaction_id")
        assert tid
        # reject to refund
        s.post(f"{API}/admin/transactions/action", headers=uh(admin_token),
               json={"transaction_id": tid, "action": "reject", "admin_note": "TEST_refund"})

    def test_withdraw_bank_requires_all_fields(self, s, user_token):
        # missing fields
        for missing in ("holder_name", "bank_name", "account_number", "ifsc"):
            payload = {"amount": 500, "method": "bank",
                       "holder_name": "X", "bank_name": "Y",
                       "account_number": "12345", "ifsc": "ABCD0001"}
            payload.pop(missing)
            r = s.post(f"{API}/wallet/withdraw", headers=uh(user_token), json=payload)
            assert r.status_code == 400, f"expected 400 when {missing} missing, got {r.status_code}: {r.text}"

    def test_withdraw_bank_success(self, s, admin_token, user_token):
        r = s.post(f"{API}/wallet/withdraw", headers=uh(user_token),
                   json={"amount": 500, "method": "bank",
                         "holder_name": "Test", "bank_name": "HDFC",
                         "account_number": "1234567890", "ifsc": "HDFC0000123"})
        assert r.status_code == 200, f"withdraw bank failed: {r.text}"
        tid = r.json().get("transaction_id")
        # refund
        s.post(f"{API}/admin/transactions/action", headers=uh(admin_token),
               json={"transaction_id": tid, "action": "reject", "admin_note": "TEST_refund"})


# ---------- Date-aware results ----------
class TestDateAwareResults:
    def test_declare_writes_to_results_collection(self, s, admin_token):
        markets = s.get(f"{API}/markets").json()
        # use any market; declare won't settle bids if not active
        m = markets[0]
        r = s.post(f"{API}/admin/markets/{m['id']}/result", headers=uh(admin_token),
                   json={"open_pana": "123"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "date" in body
        # GET history via public endpoint
        h = s.get(f"{API}/results/{m['id']}")
        assert h.status_code == 200
        rows = h.json()
        assert isinstance(rows, list) and len(rows) >= 1
        latest = rows[0]
        assert latest.get("open_pana") == "123"

    def test_reverse_result(self, s, admin_token):
        markets = s.get(f"{API}/markets").json()
        m = markets[0]
        # declare a result first
        s.post(f"{API}/admin/markets/{m['id']}/result", headers=uh(admin_token),
               json={"open_pana": "456"})
        r = s.post(f"{API}/admin/markets/{m['id']}/reverse-result",
                   headers=uh(admin_token), json={})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        # Now history for today should be empty for that market
        h = s.get(f"{API}/results/{m['id']}").json()
        # today's row should be deleted
        from datetime import datetime, timezone, timedelta
        today = datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%d")
        assert not any(row.get("date") == today for row in h)


# ---------- Auto-fetch endpoint ----------
class TestAutoFetch:
    def test_fetch_returns_501_when_url_empty(self, s, admin_token):
        # ensure url empty
        s.patch(f"{API}/admin/settings", headers=uh(admin_token), json={"result_api_url": ""})
        r = s.post(f"{API}/admin/results/fetch", headers=uh(admin_token), json={})
        assert r.status_code == 501, r.text


# ---------- User detail endpoint ----------
class TestUserDetail:
    def test_user_detail(self, s, admin_token):
        users = s.get(f"{API}/admin/users", headers=uh(admin_token)).json()
        u = next(x for x in users if x.get("mobile") == TEST_MOBILE)
        r = s.get(f"{API}/admin/users/{u['id']}/detail", headers=uh(admin_token))
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("user", "bids", "deposits", "withdrawals", "transactions", "summary"):
            assert k in data
        s = data["summary"]
        for k in ("total_deposit", "total_withdraw", "total_bid", "total_won", "open_bids"):
            assert k in s
