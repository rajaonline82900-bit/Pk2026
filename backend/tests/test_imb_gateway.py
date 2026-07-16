"""Backend tests for IMB Payment Gateway (imbpay.in) integration.

Verifies:
  1) GET /api/settings returns updated imb_base_url and imb_user_token
  2) POST /api/wallet/deposit/imb-create returns valid gateway response + persists a pending txn
  3) POST /api/wallet/deposit/imb-status returns the pending transaction
  4) Regression - haruf_andar bid credits correctly on matching result declaration

Note: This runs against a LIVE gateway. DO NOT hit payment_url. Only validates fields.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://clube-matka-games.preview.emergentagent.com").rstrip("/")

USER_MOBILE = "9999999999"
USER_PASSWORD = "1234"
ADMIN_EMAIL = "admin@m11clube.com"
ADMIN_PASSWORD = "admin123"


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def user_token(api):
    r = api.post(f"{BASE_URL}/api/auth/login", json={"mobile": USER_MOBILE, "password": USER_PASSWORD})
    assert r.status_code == 200, f"user login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok, f"no token in login response: {r.json()}"
    return tok


@pytest.fixture(scope="module")
def user_headers(user_token):
    return {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_token(api):
    r = api.post(f"{BASE_URL}/api/admin/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------- Settings ----------
class TestSettings:
    def test_settings_public_returns_imb_config(self):
        r = requests.get(f"{BASE_URL}/api/settings")
        assert r.status_code == 200
        data = r.json()
        assert data.get("imb_base_url") == "https://api.imbpay.in", f"got {data.get('imb_base_url')}"
        assert data.get("imb_user_token") == "d4d55d42e4f941876ece095ce8afe50c", f"got {data.get('imb_user_token')}"


# ---------- IMB Create Order ----------
class TestIMBCreateOrder:
    order_id_holder: dict = {}

    def test_imb_create_order_success(self, user_headers):
        r = requests.post(
            f"{BASE_URL}/api/wallet/deposit/imb-create",
            headers=user_headers,
            json={"amount": 100},
        )
        assert r.status_code == 200, f"expected 200 got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True, f"ok not True: {data}"
        assert "order_id" in data and data["order_id"].startswith("M11"), f"order_id invalid: {data.get('order_id')}"
        assert data.get("amount") == 100
        # gateway result fields
        payment_url = data.get("payment_url", "")
        assert payment_url.startswith("https://v2-api.newqr.info/") or "newqr.info" in payment_url, f"payment_url unexpected: {payment_url}"
        assert data.get("paytm_link", "").startswith("paytmmp://"), f"paytm_link invalid: {data.get('paytm_link')}"
        assert data.get("bhim_link", "").startswith("upi://pay?"), f"bhim_link invalid: {data.get('bhim_link')}"
        assert data.get("check_link"), "check_link missing"
        # save for downstream test
        TestIMBCreateOrder.order_id_holder["order_id"] = data["order_id"]
        TestIMBCreateOrder.order_id_holder["transaction_id"] = data.get("transaction_id")

    def test_pending_transaction_created(self, user_headers):
        oid = TestIMBCreateOrder.order_id_holder.get("order_id")
        assert oid, "prior create test must run first"
        # fetch user transactions via passbook
        r = requests.get(f"{BASE_URL}/api/wallet/passbook", headers=user_headers)
        assert r.status_code == 200, f"passbook fetch failed: {r.status_code} {r.text}"
        txns = r.json()
        if isinstance(txns, dict):
            txns = txns.get("transactions") or txns.get("items") or txns.get("passbook") or []
        match = [t for t in txns if t.get("imb_order_id") == oid]
        assert match, f"no txn with imb_order_id={oid} in first {len(txns)} txns"
        t = match[0]
        assert t.get("type") == "deposit"
        assert t.get("method") == "imb"
        assert t.get("status") == "pending"
        assert int(t.get("amount", 0)) == 100

    def test_imb_create_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/wallet/deposit/imb-create", json={"amount": 100})
        assert r.status_code in (401, 403), f"expected auth error got {r.status_code}"

    def test_imb_create_min_deposit_enforced(self, user_headers):
        r = requests.post(
            f"{BASE_URL}/api/wallet/deposit/imb-create",
            headers=user_headers,
            json={"amount": 10},
        )
        assert r.status_code == 400, f"expected 400 for below min got {r.status_code}: {r.text}"


# ---------- IMB Status Check ----------
class TestIMBStatus:
    def test_status_check_returns_gateway_and_txn(self, user_headers):
        oid = TestIMBCreateOrder.order_id_holder.get("order_id")
        assert oid, "create-order test must run first"
        r = requests.post(
            f"{BASE_URL}/api/wallet/deposit/imb-status",
            headers=user_headers,
            json={"order_id": oid},
        )
        assert r.status_code == 200, f"expected 200 got {r.status_code}: {r.text}"
        data = r.json()
        assert "gateway" in data, f"gateway key missing: {data}"
        assert "transaction" in data, f"transaction key missing: {data}"
        txn = data["transaction"]
        assert txn is not None, "transaction is None"
        assert txn.get("imb_order_id") == oid
        # not yet paid -> still pending
        assert txn.get("status") == "pending", f"unexpected status: {txn.get('status')}"
        # no mongo _id leakage
        assert "_id" not in txn

    def test_status_requires_order_id(self, user_headers):
        r = requests.post(f"{BASE_URL}/api/wallet/deposit/imb-status", headers=user_headers, json={})
        assert r.status_code == 400


# ---------- Regression: haruf_andar credit ----------
class TestHarufRegression:
    """Places a small haruf_andar bid then admin declares matching result and asserts credit."""

    def test_haruf_andar_credit(self, user_headers, admin_headers):
        # find an OPEN market that we can place a bid on
        r = requests.get(f"{BASE_URL}/api/markets", headers=user_headers)
        assert r.status_code == 200, f"markets fetch failed: {r.status_code}"
        markets = r.json()
        # pick a market that is open (status open) — fallback to any market and hope admin can open it
        open_markets = [m for m in markets if m.get("status") in ("open", "OPEN", "active")]
        target = open_markets[0] if open_markets else None
        if not target:
            pytest.skip(f"no open markets available for regression test. all statuses: {[m.get('status') for m in markets]}")

        market_id = target.get("id") or target.get("_id")
        market_name = target.get("name")

        # Get user's wallet before
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=user_headers)
        assert r.status_code == 200
        me = r.json()
        wallet_before = int(me.get("wallet_balance", 0))
        user_id = me.get("id")

        # Ensure user has some balance to bid; if not, skip
        bid_amount = 10
        if wallet_before < bid_amount:
            pytest.skip(f"wallet balance {wallet_before} too low for regression bid")

        # Place haruf_andar bid on digit=3 (bid on jodi starting with 3)
        digit = 3
        bid_body = {
            "market_id": market_id,
            "bids": [{"game_type": "haruf_andar", "number": str(digit), "amount": bid_amount}],
        }
        r = requests.post(f"{BASE_URL}/api/bids", headers=user_headers, json=bid_body)
        if r.status_code != 200 and r.status_code != 201:
            pytest.skip(f"could not place haruf_andar bid: {r.status_code} {r.text}")

        # Admin declares result "37" for that market -> andar digit=3 wins
        # First check current result; if already declared, we may need to reverse
        result_body = {"result": "37"}
        r = requests.post(f"{BASE_URL}/api/admin/markets/{market_id}/result", headers=admin_headers, json=result_body)
        if r.status_code not in (200, 201):
            pytest.skip(f"could not declare result: {r.status_code} {r.text} on market {market_name}")

        # Check user's wallet after: expected += bid_amount * 10
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=user_headers)
        assert r.status_code == 200
        wallet_after = int(r.json().get("wallet_balance", 0))
        expected_gain = bid_amount * 10  # haruf 1:10 -> bid 10 => 100 credited (net = bid*10 minus original bid deducted)
        # Note: bid amount is already deducted when placed. Winning returns bid*10.
        # net change = bid*10 - bid = bid*9
        # Winning haruf_andar: rate 1:10 -> bid deducted (10) then credited (100). Net gain per bid = 90.
        # (There may be additional pre-existing matching bids that also got settled; assert >= min expected.)
        wallet_change = wallet_after - wallet_before
        assert wallet_change >= (bid_amount * 10 - bid_amount), (
            f"wallet change {wallet_change} < expected >= {bid_amount * 10 - bid_amount} "
            f"(before={wallet_before}, after={wallet_after})"
        )
