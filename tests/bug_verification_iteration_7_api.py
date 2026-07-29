#!/usr/bin/env python3
"""Focused backend/API verification for Today's Winners ticker/admin CRUD."""
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import requests


ROOT = Path("/app")
FRONTEND_ENV = ROOT / "frontend" / ".env"
ARTIFACT = ROOT / "test_reports" / "iteration_7_api_artifact.json"


def read_backend_url():
    for line in FRONTEND_ENV.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip().strip('"')
    raise RuntimeError("REACT_APP_BACKEND_URL not found")


BASE = read_backend_url().rstrip("/") + "/api"
ADMIN = {"email": "admin@m11clube.com", "password": "admin123"}
USER = {"mobile": "9999999999", "password": "1234"}


def req(method, path, token=None, expected=None, **kwargs):
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.request(method, BASE + path, headers=headers, timeout=20, **kwargs)
    if expected is not None and r.status_code not in (expected if isinstance(expected, tuple) else (expected,)):
        raise AssertionError(f"{method} {path} expected {expected}, got {r.status_code}: {r.text[:500]}")
    return r


def main():
    created_winner_ids = []
    created_market_id = None
    wallet_restore_delta = 0
    checks = []

    def ok(name, detail):
        checks.append({"name": name, "ok": True, "detail": detail})
        print(f"PASS: {name} — {detail}")

    try:
        admin_login = req("POST", "/admin/auth/login", json=ADMIN, expected=200).json()
        admin_token = admin_login["token"]
        user_login = req("POST", "/auth/login", json=USER, expected=200).json()
        user_token = user_login["token"]
        user_id = user_login["user"]["id"]
        original_balance = int(user_login["user"].get("wallet_balance", 0))
        ok("auth", f"admin and user login worked; original user wallet={original_balance}")

        # Seed 4 visible fake winners for ticker auto-rotation UI test. Keep these for frontend verification.
        seed_names = [
            f"QA Rotate A {int(time.time())}",
            f"QA Rotate B {int(time.time())}",
            f"QA Rotate C {int(time.time())}",
            f"QA Rotate D {int(time.time())}",
        ]
        for idx, name in enumerate(seed_names):
            data = req(
                "POST",
                "/admin/showcase-winners",
                token=admin_token,
                json={"name": name, "amount": 1000 + idx * 111, "market_name": "GALI"},
                expected=200,
            ).json()
            assert data.get("ok") is True and data["winner"]["source"] == "fake"
            created_winner_ids.append(data["winner"]["id"])
        ok("seed_rotation_winners", f"created {len(seed_names)} fake winners for dashboard rotation")

        # Admin CRUD exact contract.
        crud_name = f"Test User API {int(time.time())}"
        add = req(
            "POST",
            "/admin/showcase-winners",
            token=admin_token,
            json={"name": crud_name, "amount": 5000, "market_name": "GALI"},
            expected=200,
        ).json()
        assert add.get("ok") is True
        winner = add["winner"]
        assert winner["name"] == crud_name and winner["amount"] == 5000 and winner["source"] == "fake"
        crud_id = winner["id"]
        admin_list = req("GET", "/admin/showcase-winners", token=admin_token, expected=200).json()
        assert any(w.get("id") == crud_id and w.get("source") == "fake" for w in admin_list)
        deleted = req("DELETE", f"/admin/showcase-winners/{crud_id}", token=admin_token, expected=200).json()
        assert deleted.get("ok") is True and deleted.get("deleted") == 1
        admin_list_after = req("GET", "/admin/showcase-winners", token=admin_token, expected=200).json()
        assert not any(w.get("id") == crud_id for w in admin_list_after)
        ok("admin_crud", "POST returned fake winner, GET included it, DELETE removed it")

        no_token = req("GET", "/admin/showcase-winners", expected=(401, 403))
        user_forbidden = req("POST", "/admin/showcase-winners", token=user_token, json={"name": "Nope", "amount": 1}, expected=(401, 403))
        ok("admin_auth_required", f"no-token={no_token.status_code}, user-token={user_forbidden.status_code}")

        public_winners = req("GET", "/showcase-winners?limit=50", expected=200).json()
        assert len(public_winners) >= 4
        leaked = [w for w in public_winners if "source" in w or "ref_bid_id" in w or "_id" in w]
        assert not leaked, f"public response leaked private fields: {leaked[:2]}"
        ok("public_privacy", f"{len(public_winners)} public winners returned without source/ref_bid_id/_id")

        # Auto-inject real winner regression: create always-open temp market, place winning haruf_andar bid, declare result 37.
        if original_balance < 100:
            topup = 100 - original_balance
            req("POST", "/admin/wallet/adjust", token=admin_token, json={"user_id": user_id, "amount": topup, "note": "QA temporary topup for winners auto-inject"}, expected=200)
            wallet_restore_delta -= topup
            ok("wallet_topup", f"credited temporary ₹{topup} so bid can be placed")

        market_payload = {
            "name": f"QA WIN MARKET {datetime.utcnow().strftime('%H%M%S')}",
            "open_time": "00:00",
            "close_time": "23:59",
            "status": "active",
            "days_active": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
        }
        market = req("POST", "/admin/markets", token=admin_token, json=market_payload, expected=200).json()
        created_market_id = market["id"]
        req("POST", "/bids", token=user_token, json={"market_id": created_market_id, "bids": [{"game_type": "haruf_andar", "session": None, "number": "3", "amount": 100}]}, expected=200)
        settled = req("POST", f"/admin/markets/{created_market_id}/result", token=admin_token, json={"result": "37"}, expected=200).json()
        assert settled["settled"] >= 1 and settled["won"] >= 1 and settled["payout_total"] >= 1000
        me_after = req("GET", "/auth/me", token=user_token, expected=200).json()
        after_balance = int(me_after.get("wallet_balance", 0))
        expected_balance = original_balance + 900 - wallet_restore_delta  # topup is represented as negative restore delta
        assert after_balance >= expected_balance, f"wallet did not reflect -100+1000; after={after_balance}, expected_at_least={expected_balance}"
        my_bids = req("GET", "/bids/me?limit=20", token=user_token, expected=200).json()
        auto_bid = next((b for b in my_bids if b.get("market_id") == created_market_id and b.get("number") == "3"), None)
        assert auto_bid and auto_bid.get("status") == "won" and auto_bid.get("win_amount") == 1000
        admin_winners = req("GET", "/admin/showcase-winners", token=admin_token, expected=200).json()
        real = next((w for w in admin_winners if w.get("source") == "real" and w.get("ref_bid_id") == auto_bid.get("id")), None)
        assert real and real.get("amount") == 1000 and "****9999" in real.get("name", "")
        public_after_real = req("GET", "/showcase-winners?limit=100", expected=200).json()
        public_real = next((w for w in public_after_real if w.get("id") == real.get("id")), None)
        assert public_real and "source" not in public_real and "ref_bid_id" not in public_real
        wallet_restore_delta -= 900  # remove net test gain after proof
        ok("auto_inject_real_win", f"bid {auto_bid['id']} won ₹1000; admin real winner {real['name']} inserted; public hides source/ref_bid_id")

        # Restore wallet to avoid leaving a large test gain; keep winner rows as proof/seed.
        if wallet_restore_delta != 0:
            req("POST", "/admin/wallet/adjust", token=admin_token, json={"user_id": user_id, "amount": wallet_restore_delta, "note": "QA restore wallet after winners auto-inject test"}, expected=200)
            ok("wallet_restore", f"applied restore delta {wallet_restore_delta}")

        artifact = {
            "base": BASE,
            "created_winner_ids_for_ui_rotation": created_winner_ids,
            "seed_names_for_ui_rotation": seed_names,
            "created_market_id": created_market_id,
            "checks": checks,
        }
        ARTIFACT.write_text(json.dumps(artifact, indent=2))
        print(json.dumps(artifact, indent=2))
        return 0
    except Exception as e:
        artifact = {
            "base": BASE,
            "created_winner_ids_for_ui_rotation": created_winner_ids,
            "created_market_id": created_market_id,
            "checks": checks,
            "error": str(e),
        }
        ARTIFACT.write_text(json.dumps(artifact, indent=2))
        print(f"FAIL: {e}", file=sys.stderr)
        print(json.dumps(artifact, indent=2), file=sys.stderr)
        return 1
    finally:
        # Clean up only the temporary market; keep seeded winners for the UI rotation test.
        if created_market_id:
            try:
                admin_token = req("POST", "/admin/auth/login", json=ADMIN, expected=200).json()["token"]
                req("DELETE", f"/admin/markets/{created_market_id}", token=admin_token, expected=(200, 404))
            except Exception as cleanup_error:
                print(f"WARN: temp market cleanup failed: {cleanup_error}", file=sys.stderr)


if __name__ == "__main__":
    raise SystemExit(main())