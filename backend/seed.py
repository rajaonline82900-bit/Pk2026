"""Seed default markets, admin, and test user for M11 CLUBE."""
import os
import uuid
import bcrypt
from datetime import datetime, timezone

from game_logic import default_game_rates


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


DEFAULT_MARKETS = [
    {"name": "DESAWAR",      "open_time": "06:00", "close_time": "04:00"},
    {"name": "DELHI BAZAR",  "open_time": "06:00", "close_time": "15:00"},
    {"name": "SHREE GANESH", "open_time": "06:00", "close_time": "16:35"},
    {"name": "FARIDABAD",    "open_time": "06:00", "close_time": "18:00"},
    {"name": "GHAZIABAD",    "open_time": "06:00", "close_time": "20:30"},
    {"name": "GALI",         "open_time": "06:00", "close_time": "23:30"},
]


async def seed_all(db):
    # ----- Admin -----
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@m11clube.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "mobile": None,
            "wallet_balance": 0,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not existing.get("id"):
        await db.users.update_one({"email": admin_email}, {"$set": {"id": str(uuid.uuid4())}})

    # ----- Test user -----
    test_mobile = "9999999999"
    existing_user = await db.users.find_one({"mobile": test_mobile})
    if not existing_user:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "mobile": test_mobile,
            "name": "Test User",
            "password_hash": hash_password("1234"),
            "mpin_hash": hash_password("1234"),  # legacy compat
            "role": "user",
            "wallet_balance": 1000,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not existing_user.get("id"):
        await db.users.update_one({"mobile": test_mobile}, {"$set": {"id": str(uuid.uuid4())}})
    if existing_user and not existing_user.get("password_hash") and existing_user.get("mpin_hash"):
        await db.users.update_one({"mobile": test_mobile}, {"$set": {"password_hash": existing_user["mpin_hash"]}})

    # ----- Markets -----
    for m in DEFAULT_MARKETS:
        exists = await db.markets.find_one({"name": m["name"]})
        if not exists:
            await db.markets.insert_one({
                "id": str(uuid.uuid4()),
                **m,
                "status": "active",
                "days_active": ["mon", "tue", "wed", "thu", "fri", "sat"],
                "open_result": None,
                "close_result": None,
                "result_date": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

    # ----- Settings -----
    settings = await db.settings.find_one({"key": "global"})
    if not settings:
        await db.settings.insert_one({
            "key": "global",
            "whatsapp_number": "+919999999999",
            "whatsapp_country_code": "+91",
            "telegram_url": "https://t.me/m11clube",
            "notice_text": "Welcome to M11 CLUBE — India's most trusted online Matka platform. Play responsibly. Min deposit 100. 24/7 support available on WhatsApp.",
            "upi_id": "m11clube@upi",
            "upi_payee_name": "M11 CLUBE",
            "qr_code_url": "",
            "min_deposit": 100,
            "min_withdraw": 500,
            "withdraw_open_time": "08:00",
            "withdraw_close_time": "20:00",
            "result_api_url": "",
            "sms_api_url": "",
            "sms_api_key": "",
            "sms_method": "GET",
            "sms_payload": "mobile={mobile}&message={message}&sender={sender}&apikey={api_key}",
            "sms_sender_id": "M11CLB",
            "youtube_how_to_play": "",
            "youtube_how_to_deposit": "",
            "youtube_how_to_withdraw": "",
            "referral_first_deposit_percent": 10,
            "referral_enabled": True,
            "imb_user_token": "1d5571c42caf9f8a312dd560b97d7ba5",
            "imb_base_url": "https://secure-stage.imb.org.in/",
            "posters": [
                {"image_url": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=70&auto=format&fit=crop", "link": ""},
                {"image_url": "https://images.unsplash.com/photo-1517242810446-cc8951b2be40?w=800&q=70&auto=format&fit=crop", "link": ""},
                {"image_url": "https://images.unsplash.com/photo-1620207418302-439b387441b0?w=800&q=70&auto=format&fit=crop", "link": ""},
            ],
            "game_rates": default_game_rates(),
        })
    else:
        patch = {}
        # Force-update game_rates if they contain old game keys (post game-system migration)
        existing_rates = settings.get("game_rates") or {}
        new_rates = default_game_rates()
        if set(existing_rates.keys()) != set(new_rates.keys()):
            patch["game_rates"] = new_rates
        for k, v in [
            ("telegram_url", "https://t.me/m11clube"),
            ("withdraw_open_time", "08:00"),
            ("withdraw_close_time", "20:00"),
            ("result_api_url", ""),
            ("whatsapp_country_code", "+91"),
            ("upi_payee_name", "M11 CLUBE"),
            ("sms_api_url", ""),
            ("sms_api_key", ""),
            ("sms_method", "GET"),
            ("sms_payload", "mobile={mobile}&message={message}&sender={sender}&apikey={api_key}"),
            ("sms_sender_id", "M11CLB"),
            ("imb_user_token", "1d5571c42caf9f8a312dd560b97d7ba5"),
            ("imb_base_url", "https://secure-stage.imb.org.in/"),
            ("youtube_how_to_play", ""),
            ("youtube_how_to_deposit", ""),
            ("youtube_how_to_withdraw", ""),
            ("referral_first_deposit_percent", 10),
            ("referral_enabled", True),
            ("posters", [
                {"image_url": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=70&auto=format&fit=crop", "link": ""},
                {"image_url": "https://images.unsplash.com/photo-1517242810446-cc8951b2be40?w=800&q=70&auto=format&fit=crop", "link": ""},
                {"image_url": "https://images.unsplash.com/photo-1620207418302-439b387441b0?w=800&q=70&auto=format&fit=crop", "link": ""},
            ]),
        ]:
            if k not in settings:
                patch[k] = v
        if patch:
            await db.settings.update_one({"key": "global"}, {"$set": patch})
