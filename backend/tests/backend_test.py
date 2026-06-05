"""M11 CLUBE Backend Tests — covers auth, markets, bids, wallet, admin, win flow."""
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


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def user_token(s):
    r = s.post(f"{API}/auth/login", json={"mobile": TEST_MOBILE, "mpin": TEST_MPIN})
    assert r.status_code == 200, f"user login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/admin/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.text}"
    return r.json()["token"]


def uh(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- Health ----------
def test_health(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# ---------- Auth ----------
class TestAuth:
    def test_user_login(self, s):
        r = s.post(f"{API}/auth/login", json={"mobile": TEST_MOBILE, "mpin": TEST_MPIN})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and data["user"]["mobile"] == TEST_MOBILE

    def test_user_login_invalid(self, s):
        r = s.post(f"{API}/auth/login", json={"mobile": TEST_MOBILE, "mpin": "0000"})
        assert r.status_code == 401

    def test_register_new_user(self, s):
        mobile = f"8{int(time.time()) % 1000000000:09d}"
        r = s.post(f"{API}/auth/register", json={"mobile": mobile, "name": "TEST_User", "mpin": "1111"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["wallet_balance"] == 50
        assert "token" in data

    def test_register_duplicate(self, s):
        r = s.post(f"{API}/auth/register", json={"mobile": TEST_MOBILE, "name": "Dup", "mpin": "1234"})
        assert r.status_code == 400

    def test_auth_me(self, s, user_token):
        r = s.get(f"{API}/auth/me", headers=uh(user_token))
        assert r.status_code == 200
        assert r.json()["mobile"] == TEST_MOBILE

    def test_admin_login(self, s):
        r = s.post(f"{API}/admin/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        assert "token" in r.json()

    def test_admin_login_invalid(self, s):
        r = s.post(f"{API}/admin/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401


# ---------- Public catalog ----------
class TestPublic:
    def test_list_games(self, s):
        r = s.get(f"{API}/games")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 20
        keys = {g["key"] for g in data}
        assert "single_digit" in keys and "jodi" in keys

    def test_settings(self, s):
        r = s.get(f"{API}/settings")
        assert r.status_code == 200
        assert "upi_id" in r.json()

    def test_list_markets(self, s):
        r = s.get(f"{API}/markets")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 12
        m = data[0]
        for k in ("id", "name", "open_time", "close_time", "is_market_active", "live_result"):
            assert k in m


# ---------- Bids / Wallet ----------
class TestBidsWallet:
    def test_passbook(self, s, user_token):
        r = s.get(f"{API}/wallet/passbook", headers=uh(user_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_bid_requires_auth(self, s):
        r = s.post(f"{API}/bids", json={"market_id": "x", "bids": []})
        assert r.status_code == 401

    def test_deposit_min_validation(self, s, user_token):
        r = s.post(f"{API}/wallet/deposit", headers=uh(user_token), json={"amount": 10, "utr": "abc"})
        assert r.status_code == 400

    def test_deposit_create(self, s, user_token):
        r = s.post(f"{API}/wallet/deposit", headers=uh(user_token), json={"amount": 100, "utr": "TEST_UTR_001"})
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_withdraw_min_validation(self, s, user_token):
        r = s.post(f"{API}/wallet/withdraw", headers=uh(user_token), json={"amount": 100, "account_info": "x"})
        assert r.status_code == 400


# ---------- Admin ----------
class TestAdmin:
    def test_dashboard(self, s, admin_token):
        r = s.get(f"{API}/admin/dashboard", headers=uh(admin_token))
        assert r.status_code == 200
        d = r.json()
        for k in ("total_users", "total_bids", "live_balance", "today_collection",
                  "pending_withdrawals", "pending_deposits"):
            assert k in d

    def test_users_list(self, s, admin_token):
        r = s.get(f"{API}/admin/users", headers=uh(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_bids_list(self, s, admin_token):
        r = s.get(f"{API}/admin/bids", headers=uh(admin_token))
        assert r.status_code == 200

    def test_admin_markets_crud(self, s, admin_token):
        # CREATE
        payload = {"name": "TEST_MARKET", "open_time": "23:50", "close_time": "23:59", "status": "active"}
        r = s.post(f"{API}/admin/markets", headers=uh(admin_token), json=payload)
        assert r.status_code == 200, r.text
        m = r.json()
        mid = m["id"]
        assert m["name"] == "TEST_MARKET"

        # UPDATE
        r = s.patch(f"{API}/admin/markets/{mid}", headers=uh(admin_token), json={"name": "TEST_MARKET_UPD"})
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_MARKET_UPD"

        # DELETE
        r = s.delete(f"{API}/admin/markets/{mid}", headers=uh(admin_token))
        assert r.status_code == 200

    def test_admin_settings_update(self, s, admin_token):
        r = s.patch(f"{API}/admin/settings", headers=uh(admin_token), json={"min_deposit": 100})
        assert r.status_code == 200
        assert r.json().get("min_deposit") == 100

    def test_wallet_adjust(self, s, admin_token):
        # find test user
        users = s.get(f"{API}/admin/users", headers=uh(admin_token)).json()
        u = next((u for u in users if u.get("mobile") == TEST_MOBILE), None)
        assert u is not None
        before = u["wallet_balance"]
        r = s.post(f"{API}/admin/wallet/adjust", headers=uh(admin_token),
                   json={"user_id": u["id"], "amount": 25, "note": "TEST_credit"})
        assert r.status_code == 200
        assert r.json()["new_balance"] == before + 25
        # reverse
        s.post(f"{API}/admin/wallet/adjust", headers=uh(admin_token),
               json={"user_id": u["id"], "amount": -25, "note": "TEST_reverse"})


# ---------- End-to-End Win flow ----------
class TestWinFlow:
    def test_full_win_flow(self, s, user_token, admin_token):
        # 1. Find an active market
        markets = s.get(f"{API}/markets").json()
        active = [m for m in markets if m.get("is_open_session_active")]
        if not active:
            pytest.skip("No active OPEN session markets at this time of day")
        market = active[-1]  # latest closing one

        # 2. Get wallet balance before
        me_before = s.get(f"{API}/auth/me", headers=uh(user_token)).json()
        bal_before = me_before["wallet_balance"]

        # 3. Place bid: single_digit OPEN with number=0, amount=10
        bid_payload = {
            "market_id": market["id"],
            "bids": [{"game_type": "single_digit", "session": "open", "number": "0", "amount": 10}],
        }
        r = s.post(f"{API}/bids", headers=uh(user_token), json=bid_payload)
        assert r.status_code == 200, f"bid place failed: {r.text}"
        assert r.json()["count"] == 1

        # Verify wallet debited
        me_after_bid = s.get(f"{API}/auth/me", headers=uh(user_token)).json()
        assert me_after_bid["wallet_balance"] == bal_before - 10

        # 4. Admin declares open_pana = 550 (digit_sum=10 -> %10=0) — bid number=0 should win
        r = s.post(f"{API}/admin/markets/{market['id']}/result",
                   headers=uh(admin_token), json={"open_pana": "550"})
        assert r.status_code == 200, r.text
        result = r.json()
        assert result["settled"] >= 1
        assert result["won"] >= 1

        # 5. Verify bid status is "won" and wallet credited by amount*9.5 = 95
        bids = s.get(f"{API}/bids/me", headers=uh(user_token)).json()
        won_bid = next((b for b in bids if b["market_id"] == market["id"]
                        and b["game_type"] == "single_digit" and b["number"] == "0"), None)
        assert won_bid is not None
        assert won_bid["status"] == "won", f"expected won, got {won_bid['status']}"
        assert won_bid["win_amount"] == 95

        me_after_win = s.get(f"{API}/auth/me", headers=uh(user_token)).json()
        # Net change: -10 (bid) + 95 (win) = +85
        assert me_after_win["wallet_balance"] == bal_before + 85

        # 6. Verify "You won" notification exists
        notifs = s.get(f"{API}/notifications", headers=uh(user_token)).json()
        assert any("won" in (n.get("title", "") + n.get("body", "")).lower() for n in notifs)
