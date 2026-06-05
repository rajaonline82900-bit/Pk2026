"""Phase-3 backend tests: password+mpin compat, forgot-OTP+reset, file upload, UPI intent, 1-year JWT."""
import os
import base64
import time
from datetime import datetime, timezone
import jwt as pyjwt
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://clube-matka-games.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@m11clube.com"
ADMIN_PASSWORD = "admin123"
TEST_MOBILE = "9999999999"
TEST_PASSWORD = "1234"


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


# ---------- Login backward compat ----------
class TestLoginCompat:
    def test_login_with_password(self, s):
        r = s.post(f"{API}/auth/login", json={"mobile": TEST_MOBILE, "password": TEST_PASSWORD})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data
        assert data["user"]["mobile"] == TEST_MOBILE

    def test_login_with_legacy_mpin(self, s):
        r = s.post(f"{API}/auth/login", json={"mobile": TEST_MOBILE, "mpin": TEST_PASSWORD})
        assert r.status_code == 200, r.text
        assert "token" in r.json()

    def test_login_missing_credential(self, s):
        r = s.post(f"{API}/auth/login", json={"mobile": TEST_MOBILE})
        assert r.status_code == 422

    def test_register_with_password_only(self, s):
        mobile = f"7{int(time.time()) % 1000000000:09d}"
        r = s.post(f"{API}/auth/register", json={"mobile": mobile, "name": "TEST_P3", "password": "abcd"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data
        # Auto-login: verify token works with /auth/me
        me = s.get(f"{API}/auth/me", headers=uh(data["token"]))
        assert me.status_code == 200
        assert me.json()["mobile"] == mobile


# ---------- JWT 1-year TTL ----------
class TestJwtTtl:
    def test_token_exp_is_about_one_year(self, s):
        r = s.post(f"{API}/auth/login", json={"mobile": TEST_MOBILE, "password": TEST_PASSWORD})
        assert r.status_code == 200
        token = r.json()["token"]
        # decode without verify (we just want exp)
        payload = pyjwt.decode(token, options={"verify_signature": False})
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)
        delta_days = (exp - now).days
        # 1 year ~ 365 days. Allow slack ±2 days. Spec requires > 11 months (>330 days).
        assert delta_days > 330, f"JWT exp only {delta_days} days from now, expected ~365"
        assert delta_days <= 366


# ---------- Forgot OTP + Reset password ----------
class TestForgotOtp:
    def test_forgot_otp_demo_mode_returns_otp(self, s, admin_token):
        # Ensure SMS provider is unconfigured -> demo mode
        s.patch(f"{API}/admin/settings", headers=uh(admin_token),
                json={"sms_api_url": "", "sms_api_key": ""})
        r = s.post(f"{API}/auth/forgot-otp", json={"mobile": TEST_MOBILE})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert "otp_id" in data
        assert "demo_otp" in data, "expected demo_otp in response when SMS provider not configured"
        assert len(data["demo_otp"]) == 6 and data["demo_otp"].isdigit()

    def test_forgot_otp_unknown_mobile(self, s):
        r = s.post(f"{API}/auth/forgot-otp", json={"mobile": "1234567890"})
        assert r.status_code == 404

    def test_reset_password_flow(self, s, admin_token):
        # Request OTP
        r = s.post(f"{API}/auth/forgot-otp", json={"mobile": TEST_MOBILE})
        assert r.status_code == 200
        data = r.json()
        otp_id = data["otp_id"]
        otp = data["demo_otp"]

        # Wrong OTP -> 400
        bad = s.post(f"{API}/auth/reset-password",
                     json={"otp_id": otp_id, "otp": "000000", "new_password": "newpass"})
        assert bad.status_code == 400

        # Reset to a new password (NEWPW) — token returned
        new_pw = "NEW1"
        r = s.post(f"{API}/auth/reset-password",
                   json={"otp_id": otp_id, "otp": otp, "new_password": new_pw})
        assert r.status_code == 200, r.text
        out = r.json()
        assert "token" in out
        assert out["user"]["mobile"] == TEST_MOBILE

        # Verify can log in with new password
        login_new = s.post(f"{API}/auth/login", json={"mobile": TEST_MOBILE, "password": new_pw})
        assert login_new.status_code == 200, "new password login failed"

        # Restore original password "1234" via the same flow so other tests keep working
        r2 = s.post(f"{API}/auth/forgot-otp", json={"mobile": TEST_MOBILE})
        d2 = r2.json()
        rst = s.post(f"{API}/auth/reset-password",
                     json={"otp_id": d2["otp_id"], "otp": d2["demo_otp"], "new_password": TEST_PASSWORD})
        assert rst.status_code == 200

    def test_reset_password_otp_cannot_be_reused(self, s):
        r = s.post(f"{API}/auth/forgot-otp", json={"mobile": TEST_MOBILE})
        d = r.json()
        # Use once
        u1 = s.post(f"{API}/auth/reset-password",
                    json={"otp_id": d["otp_id"], "otp": d["demo_otp"], "new_password": TEST_PASSWORD})
        assert u1.status_code == 200
        # Re-use same OTP -> should fail
        u2 = s.post(f"{API}/auth/reset-password",
                    json={"otp_id": d["otp_id"], "otp": d["demo_otp"], "new_password": TEST_PASSWORD})
        assert u2.status_code == 400


# ---------- Admin file upload + /files/{id} ----------
class TestFileUpload:
    def test_upload_and_fetch(self, s, admin_token):
        # 1x1 transparent png
        png = base64.b64encode(bytes.fromhex(
            "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082"
        )).decode()
        data_url = f"data:image/png;base64,{png}"
        r = s.post(f"{API}/admin/upload", headers=uh(admin_token),
                   json={"data_url": data_url, "filename": "TEST_pixel.png"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "id" in body and "url" in body
        fid = body["id"]

        # Fetch via /files/{id}
        f = s.get(f"{API}/files/{fid}")
        assert f.status_code == 200, f.text
        fdata = f.json()
        assert fdata["id"] == fid
        assert fdata["data_url"] == data_url
        assert fdata["filename"] == "TEST_pixel.png"

    def test_upload_requires_admin(self, s):
        r = s.post(f"{API}/admin/upload", json={"data_url": "data:image/png;base64,xxx"})
        assert r.status_code == 401

    def test_upload_empty_payload(self, s, admin_token):
        r = s.post(f"{API}/admin/upload", headers=uh(admin_token), json={"data_url": ""})
        assert r.status_code == 400

    def test_fetch_unknown_file(self, s):
        r = s.get(f"{API}/files/nonexistent-id-xyz")
        assert r.status_code == 404


# ---------- UPI intent ----------
class TestUpiIntent:
    def test_upi_intent_returns_url(self, s):
        # need a user token
        login = s.post(f"{API}/auth/login", json={"mobile": TEST_MOBILE, "password": TEST_PASSWORD})
        token = login.json()["token"]
        r = s.get(f"{API}/wallet/upi-intent?amount=500", headers=uh(token))
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["amount"] == 500
        assert data["upi_url"].startswith("upi://pay?")
        assert "pa=" in data["upi_url"]
        assert "am=500" in data["upi_url"]
        assert "cu=INR" in data["upi_url"]
        assert data["upi_id"]
        assert data["payee"]

    def test_upi_intent_requires_auth(self, s):
        r = s.get(f"{API}/wallet/upi-intent?amount=500")
        assert r.status_code == 401


# ---------- Settings: new SMS keys + whatsapp_country_code ----------
class TestSmsSettings:
    def test_settings_exposes_sms_and_country_code(self, s):
        r = s.get(f"{API}/settings")
        assert r.status_code == 200
        d = r.json()
        for k in ("whatsapp_country_code", "upi_payee_name", "sms_api_url",
                  "sms_api_key", "sms_method", "sms_sender_id", "sms_payload"):
            assert k in d, f"missing settings key {k}"

    def test_admin_can_update_sms_provider(self, s, admin_token):
        r = s.patch(f"{API}/admin/settings", headers=uh(admin_token),
                    json={"sms_api_url": "https://example.com/sms",
                          "sms_api_key": "TESTKEY",
                          "sms_method": "POST",
                          "sms_sender_id": "M11TST",
                          "sms_payload": '{"to":"{mobile}","msg":"{message}"}'})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["sms_api_url"] == "https://example.com/sms"
        assert d["sms_method"] == "POST"
        # cleanup -> empty so forgot-otp stays in demo mode for other tests
        s.patch(f"{API}/admin/settings", headers=uh(admin_token),
                json={"sms_api_url": "", "sms_api_key": ""})
