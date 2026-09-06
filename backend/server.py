"""M11 CLUBE — FastAPI backend.

Endpoints:
- /api/auth/*       user auth (mobile + MPIN)
- /api/admin/auth/* admin auth (email + password)
- /api/markets, /api/markets/{id}
- /api/games        list of game catalog
- /api/settings     public settings (whatsapp, notice, rates)
- /api/bids, /api/bids/me
- /api/wallet/*     deposit, withdraw, passbook
- /api/notifications
- /api/admin/*      admin CRUD endpoints
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta, time as dtime
from typing import Optional, List, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from game_logic import GAMES, evaluate_bid, default_game_rates
from seed import seed_all

# ---------- Config ----------
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
JWT_TTL_HOURS = 24 * 365  # 1 year (per user request — stay signed in)

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="M11 CLUBE API")
api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("m11clube")


# ---------- Helpers ----------
def hash_pw(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_pw(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def make_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_TTL_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def serialize(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    doc.pop("mpin_hash", None)
    doc.pop("password_hash", None)
    return doc


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("status") == "blocked":
        raise HTTPException(status_code=403, detail="Account blocked")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------- Pydantic Schemas ----------
class RegisterIn(BaseModel):
    mobile: str = Field(..., min_length=10, max_length=10)
    name: str = Field(..., min_length=2, max_length=60)
    password: Optional[str] = Field(None, min_length=4, max_length=60)
    mpin: Optional[str] = Field(None, min_length=4, max_length=60)  # legacy compat
    referral_code: Optional[str] = None


class LoginIn(BaseModel):
    mobile: str
    password: Optional[str] = None
    mpin: Optional[str] = None  # legacy compat


class ForgotOtpIn(BaseModel):
    mobile: str


class ResetPasswordIn(BaseModel):
    otp_id: str
    otp: str
    new_password: str = Field(..., min_length=4, max_length=60)


class AdminLoginIn(BaseModel):
    email: str
    password: str


class MarketIn(BaseModel):
    name: str
    open_time: str
    close_time: str
    status: str = "active"
    days_active: List[str] = ["mon", "tue", "wed", "thu", "fri", "sat"]


class MarketUpdate(BaseModel):
    name: Optional[str] = None
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    status: Optional[str] = None
    days_active: Optional[List[str]] = None


class ResultIn(BaseModel):
    # New M11 format: 2-digit jodi result e.g. "37"
    result: Optional[str] = None
    # Legacy compat (still accepted from older admin builds)
    open_pana: Optional[str] = None
    close_pana: Optional[str] = None
    # Optional: date to declare for (YYYY-MM-DD). Defaults to today (IST).
    date: Optional[str] = None


class BidItem(BaseModel):
    game_type: str
    session: Optional[str] = None  # "open" | "close" | None
    number: str
    amount: int


class BidPlace(BaseModel):
    market_id: str
    bids: List[BidItem]


class DepositIn(BaseModel):
    amount: int
    utr: Optional[str] = ""
    method: str = "upi"


class WithdrawIn(BaseModel):
    amount: int
    method: Literal["upi", "bank"] = "upi"
    # UPI
    upi_id: Optional[str] = None
    # Bank
    holder_name: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc: Optional[str] = None


class WalletAdjustIn(BaseModel):
    user_id: str
    amount: int  # positive=credit, negative=debit
    note: str = ""


class SettingsIn(BaseModel):
    whatsapp_number: Optional[str] = None
    whatsapp_country_code: Optional[str] = None
    telegram_url: Optional[str] = None
    notice_text: Optional[str] = None
    upi_id: Optional[str] = None
    upi_payee_name: Optional[str] = None
    qr_code_url: Optional[str] = None
    min_deposit: Optional[int] = None
    min_withdraw: Optional[int] = None
    withdraw_open_time: Optional[str] = None
    withdraw_close_time: Optional[str] = None
    result_api_url: Optional[str] = None
    sms_api_url: Optional[str] = None
    sms_api_key: Optional[str] = None
    sms_method: Optional[str] = None
    sms_payload: Optional[str] = None
    sms_sender_id: Optional[str] = None
    imb_user_token: Optional[str] = None
    imb_base_url: Optional[str] = None
    posters: Optional[List[dict]] = None
    game_rates: Optional[dict] = None
    # Tutorial videos (YouTube URL or direct MP4 URL — rendered inline)
    youtube_how_to_play: Optional[str] = None
    youtube_how_to_deposit: Optional[str] = None
    youtube_how_to_withdraw: Optional[str] = None
    # Deposit bonus: award X% extra if deposit amount >= threshold
    deposit_bonus_percent: Optional[int] = None
    deposit_bonus_threshold: Optional[int] = None


class IMBCreateOrderIn(BaseModel):
    amount: int


class TransactionApproveIn(BaseModel):
    transaction_id: str
    action: Literal["approve", "reject"]
    admin_note: str = ""


# ---------- Auth (User) ----------
@api.post("/auth/register")
async def register(payload: RegisterIn):
    pw = payload.password or payload.mpin
    if not pw:
        raise HTTPException(422, "password is required")
    if not payload.mobile.isdigit():
        raise HTTPException(400, "Mobile must be 10 digits")
    existing = await db.users.find_one({"mobile": payload.mobile})
    if existing:
        raise HTTPException(400, "Mobile already registered")
    user_id = str(uuid.uuid4())
    # Generate a unique 6-char referral code (M11 + 6 hex)
    ref_code = ("M11" + uuid.uuid4().hex[:6]).upper()
    # Ensure uniqueness (rare collision)
    while await db.users.find_one({"referral_code": ref_code}):
        ref_code = ("M11" + uuid.uuid4().hex[:6]).upper()

    referred_by_id = None
    if payload.referral_code:
        rcode = payload.referral_code.strip().upper()
        ref_user = await db.users.find_one({"referral_code": rcode})
        if ref_user:
            referred_by_id = ref_user.get("id")
        # invalid codes are silently ignored (no error)

    doc = {
        "id": user_id,
        "mobile": payload.mobile,
        "name": payload.name,
        "password_hash": hash_pw(pw),
        "role": "user",
        "wallet_balance": 0,
        "status": "active",
        "created_at": now_iso(),
        "referral_code": ref_code,
        "referred_by": referred_by_id,
        "first_deposit_completed": False,
    }
    await db.users.insert_one(doc)
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "bonus",
        "amount": 50,
        "status": "approved",
        "note": "Welcome bonus",
        "created_at": now_iso(),
    })
    token = make_token(user_id, "user")
    return {"token": token, "user": serialize(dict(doc))}


@api.post("/auth/login")
async def login(payload: LoginIn):
    pw = payload.password or payload.mpin
    if not pw:
        raise HTTPException(422, "password is required")
    user = await db.users.find_one({"mobile": payload.mobile, "role": "user"})
    if not user:
        raise HTTPException(401, "Invalid mobile or password")
    hashed = user.get("password_hash") or user.get("mpin_hash") or ""
    if not verify_pw(pw, hashed):
        raise HTTPException(401, "Invalid mobile or password")
    if user.get("status") == "blocked":
        raise HTTPException(403, "Account blocked. Contact support.")
    if not user.get("password_hash") and user.get("mpin_hash"):
        await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": user["mpin_hash"]}})
    token = make_token(user["id"], "user")
    return {"token": token, "user": serialize(dict(user))}


@api.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return serialize(dict(user))


@api.post("/auth/change-mpin")
async def change_mpin(
    body: dict,
    user: dict = Depends(get_current_user),
):
    """Legacy endpoint kept for compat. Use /auth/change-password instead."""
    old = body.get("old_mpin") or body.get("old_password") or ""
    new = body.get("new_mpin") or body.get("new_password") or ""
    hashed = user.get("password_hash") or user.get("mpin_hash") or ""
    if not verify_pw(old, hashed):
        raise HTTPException(400, "Old password is incorrect")
    if len(new) < 4:
        raise HTTPException(400, "Password must be at least 4 characters")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_pw(new)}})
    return {"ok": True}


@api.post("/auth/change-password")
async def change_password(body: dict, user: dict = Depends(get_current_user)):
    old = body.get("old_password", "")
    new = body.get("new_password", "")
    hashed = user.get("password_hash") or user.get("mpin_hash") or ""
    if not verify_pw(old, hashed):
        raise HTTPException(400, "Old password is incorrect")
    if len(new) < 4:
        raise HTTPException(400, "Password must be at least 4 characters")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_pw(new)}})
    return {"ok": True}


# ---------- Forgot password (OTP) ----------
import random as _random
import httpx as _httpx


async def _send_sms(mobile: str, message: str) -> tuple[bool, str]:
    """Send SMS via admin-configured provider. Returns (sent, info)."""
    s = await db.settings.find_one({"key": "global"}) or {}
    url = (s.get("sms_api_url") or "").strip()
    key = (s.get("sms_api_key") or "").strip()
    if not url or not key:
        return (False, "SMS provider not configured — running in demo mode")
    method = (s.get("sms_method") or "GET").upper()
    template = s.get("sms_payload") or "{}"
    # Replace placeholders
    payload_str = template.replace("{mobile}", mobile).replace("{message}", message).replace("{api_key}", key).replace("{sender}", s.get("sms_sender_id") or "M11CLB")
    try:
        async with _httpx.AsyncClient(timeout=10) as cli:
            if method == "POST":
                # If payload is JSON, send JSON
                try:
                    import json as _json
                    body = _json.loads(payload_str)
                    r = await cli.post(url, json=body, headers={"Authorization": f"Bearer {key}"})
                except Exception:
                    r = await cli.post(url, data=payload_str, headers={"Authorization": f"Bearer {key}"})
            else:
                target = url
                if payload_str and payload_str != "{}":
                    sep = "&" if "?" in url else "?"
                    target = url + sep + payload_str.lstrip("?&")
                r = await cli.get(target)
            return (200 <= r.status_code < 300, f"HTTP {r.status_code}")
    except Exception as e:
        return (False, str(e))


@api.post("/auth/forgot-otp")
async def forgot_otp(payload: ForgotOtpIn):
    user = await db.users.find_one({"mobile": payload.mobile, "role": "user"})
    if not user:
        raise HTTPException(404, "No account with this mobile")
    otp = f"{_random.randint(0, 999999):06d}"
    otp_id = str(uuid.uuid4())
    expires = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    await db.otps.insert_one({
        "id": otp_id,
        "mobile": payload.mobile,
        "otp_hash": hash_pw(otp),
        "expires_at": expires,
        "used": False,
        "created_at": now_iso(),
    })
    sent, info = await _send_sms(payload.mobile, f"Your M11 CLUBE OTP is {otp}. Valid for 10 minutes.")
    out = {"ok": True, "otp_id": otp_id, "sms_sent": sent, "sms_info": info}
    if not sent:
        # Demo mode: include OTP in response so admin can share manually / dev can test
        out["demo_otp"] = otp
    return out


@api.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordIn):
    row = await db.otps.find_one({"id": payload.otp_id, "used": False})
    if not row:
        raise HTTPException(400, "Invalid or expired OTP")
    if datetime.fromisoformat(row["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(400, "OTP expired")
    if not verify_pw(payload.otp, row["otp_hash"]):
        raise HTTPException(400, "Incorrect OTP")
    user = await db.users.find_one({"mobile": row["mobile"], "role": "user"})
    if not user:
        raise HTTPException(404, "User not found")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_pw(payload.new_password)}})
    await db.otps.update_one({"id": payload.otp_id}, {"$set": {"used": True}})
    token = make_token(user["id"], "user")
    return {"token": token, "user": serialize(dict(user))}


# ---------- Auth (Admin) ----------
@api.post("/admin/auth/login")
async def admin_login(payload: AdminLoginIn):
    admin = await db.users.find_one({"email": payload.email.lower(), "role": "admin"})
    if not admin or not verify_pw(payload.password, admin.get("password_hash", "")):
        raise HTTPException(401, "Invalid email or password")
    token = make_token(admin["id"] if "id" in admin else str(admin.get("_id")), "admin")
    return {"token": token, "admin": serialize(dict(admin))}


@api.get("/admin/auth/me")
async def admin_me(admin: dict = Depends(require_admin)):
    return serialize(dict(admin))


# ---------- Games / Settings (Public) ----------
@api.get("/games")
async def list_games():
    settings = await db.settings.find_one({"key": "global"}) or {}
    rates = settings.get("game_rates") or default_game_rates()
    out = []
    for k, cfg in GAMES.items():
        out.append({
            "key": k,
            "name": cfg["name"],
            "rate": rates.get(k, cfg["rate"]),
            "session": cfg["session"],
            "input": cfg["input"],
        })
    return out


@api.get("/settings")
async def get_settings():
    s = await db.settings.find_one({"key": "global"}) or {}
    s.pop("_id", None)
    return s


# ---------- Showcase Winners (public ticker) ----------
@api.get("/showcase-winners")
async def list_showcase_winners(limit: int = 30):
    """Public ticker of latest winners (real + fake, mixed). Only 'active' entries returned."""
    docs = await db.showcase_winners.find({"active": {"$ne": False}}).sort("created_at", -1).limit(min(limit, 100)).to_list(200)
    out = []
    for d in docs:
        d.pop("_id", None)
        d.pop("ref_bid_id", None)  # never leak bid ID publicly
        d.pop("source", None)       # hide real vs fake from public
        out.append(d)
    return out


# ---------- Daily Joined Users (public social proof) ----------
@api.get("/daily-joined-users")
async def list_daily_joined_users(limit: int = 30):
    """Public: masked list of today's new users + count. Shows first name + last 4 digits of mobile."""
    # Use rolling last-24-hours window (simpler than IST midnight boundary with UTC-stored timestamps)
    cutoff_utc = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    total_today = await db.users.count_documents({
        "role": {"$ne": "admin"},
        "created_at": {"$gte": cutoff_utc},
    })
    docs = await db.users.find({
        "role": {"$ne": "admin"},
        "created_at": {"$gte": cutoff_utc},
    }).sort("created_at", -1).limit(min(limit, 100)).to_list(100)
    users = []
    for d in docs:
        name = d.get("name") or "Player"
        mobile = d.get("mobile") or ""
        first = name.split()[0] if name else "Player"
        last4 = mobile[-4:] if mobile else "****"
        users.append({
            "id": d.get("id"),
            "name": f"{first} ****{last4}",
            "joined_at": d.get("created_at"),
        })
    return {"count": total_today, "users": users}


@api.get("/admin/showcase-winners")
async def admin_list_winners(admin: dict = Depends(require_admin)):
    docs = await db.showcase_winners.find({}).sort("created_at", -1).limit(200).to_list(200)
    for d in docs:
        d.pop("_id", None)
    return docs


@api.post("/admin/showcase-winners")
async def admin_add_winner(body: dict, admin: dict = Depends(require_admin)):
    name = (body.get("name") or "").strip()
    amount = int(body.get("amount") or 0)
    if not name or amount <= 0:
        raise HTTPException(400, "name and positive amount required")
    doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "amount": amount,
        "source": "fake",
        "market_name": (body.get("market_name") or "").strip() or None,
        "active": True,
        "created_at": now_iso(),
    }
    await db.showcase_winners.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "winner": doc}


@api.delete("/admin/showcase-winners/{winner_id}")
async def admin_delete_winner(winner_id: str, admin: dict = Depends(require_admin)):
    r = await db.showcase_winners.delete_one({"id": winner_id})
    return {"ok": True, "deleted": r.deleted_count}


# ---------- Markets (Public) ----------
def _market_open_status(m: dict, today_results: Optional[dict] = None) -> dict:
    """Add live open/close flags using IST time. `today_results` is an optional pre-fetched
    dict {market_id: {open_pana, close_pana}} used to render `live_result` for the day."""
    now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    today_str = now.strftime("%Y-%m-%d")
    open_t = m.get("open_time", "00:00")
    close_t = m.get("close_time", "23:59")
    try:
        oh, om = map(int, open_t.split(":"))
        ch, cm = map(int, close_t.split(":"))
        open_dt = now.replace(hour=oh, minute=om, second=0, microsecond=0)
        close_dt = now.replace(hour=ch, minute=cm, second=0, microsecond=0)
        # Overnight market handling: if close_time < open_time, close belongs to NEXT day
        if close_dt <= open_dt:
            close_dt = close_dt + timedelta(days=1)
        # If `now` is before today's open AND market wraps overnight, also accept yesterday's open window
        # (i.e. user playing the close-window between midnight and close_time)
        if now < open_dt and (ch, cm) < (oh, om):
            yesterday_open = open_dt - timedelta(days=1)
            yesterday_close = close_dt - timedelta(days=1)
            if yesterday_open <= now < yesterday_close:
                open_dt = yesterday_open
                close_dt = yesterday_close
        m["is_open_session_active"] = now < open_dt and m.get("status") == "active"
        m["is_close_session_active"] = now < close_dt and m.get("status") == "active"
        m["is_market_active"] = (open_dt <= now < close_dt) and m.get("status") == "active"
    except Exception:
        m["is_open_session_active"] = False
        m["is_close_session_active"] = False
        m["is_market_active"] = False

    # Live result for the day. New M11 format: result stored as 2-digit jodi "XY"
    # in both open_pana and close_pana for simplicity. Legacy 3-digit panas also supported.
    op = None
    cp = None
    if today_results is not None:
        r = today_results.get(m.get("id"))
        if r:
            op = r.get("open_pana")
            cp = r.get("close_pana")
    else:
        if m.get("result_date") == today_str:
            op = m.get("open_result")
            cp = m.get("close_result")

    def _digit_from(v):
        if not v:
            return None
        v = str(v).strip()
        if len(v) == 2 and v.isdigit():
            return None  # handled separately as jodi
        if len(v) == 3 and v.isdigit():
            return sum(int(c) for c in v) % 10
        return None

    today_jodi = None
    if op and len(str(op).strip()) == 2 and str(op).strip().isdigit():
        today_jodi = str(op).strip()
    elif op and cp:
        od = _digit_from(op)
        cd = _digit_from(cp)
        if od is not None and cd is not None:
            today_jodi = f"{od}{cd}"

    # Yesterday's result (for "Old" display)
    yesterday_jodi = None
    yr = m.get("_yesterday_result")
    if yr:
        if len(str(yr).strip()) == 2 and str(yr).strip().isdigit():
            yesterday_jodi = str(yr).strip()
        elif m.get("_yesterday_open") and m.get("_yesterday_close"):
            od = _digit_from(m.get("_yesterday_open"))
            cd = _digit_from(m.get("_yesterday_close"))
            if od is not None and cd is not None:
                yesterday_jodi = f"{od}{cd}"

    m["today_result"] = today_jodi  # "37" or None
    m["yesterday_result"] = yesterday_jodi  # "43" or None
    m["live_result"] = today_jodi or "**"
    m["result_date"] = today_str if today_jodi else None
    m["open_result"] = op
    m["close_result"] = cp
    m.pop("_yesterday_result", None)
    m.pop("_yesterday_open", None)
    m.pop("_yesterday_close", None)
    return m


async def _fetch_today_results() -> dict:
    today = datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%d")
    out = {}
    async for r in db.results.find({"date": today}):
        out[r["market_id"]] = {"open_pana": r.get("open_pana"), "close_pana": r.get("close_pana")}
    return out


async def _fetch_yesterday_results() -> dict:
    ist_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    yesterday = (ist_now - timedelta(days=1)).strftime("%Y-%m-%d")
    out = {}
    async for r in db.results.find({"date": yesterday}):
        out[r["market_id"]] = {"open_pana": r.get("open_pana"), "close_pana": r.get("close_pana")}
    return out


@api.get("/markets")
async def list_markets():
    today_results = await _fetch_today_results()
    yesterday_results = await _fetch_yesterday_results()
    out = []
    async for m in db.markets.find({}):
        m.pop("_id", None)
        yr = yesterday_results.get(m.get("id"))
        if yr:
            m["_yesterday_open"] = yr.get("open_pana")
            m["_yesterday_close"] = yr.get("close_pana")
            # Compatibility: if both pana fields contain same 2-digit jodi
            if yr.get("open_pana") and len(str(yr.get("open_pana"))) == 2:
                m["_yesterday_result"] = yr.get("open_pana")
        out.append(_market_open_status(m, today_results))
    out.sort(key=lambda x: x.get("open_time", "99:99"))
    return out


@api.get("/markets/{market_id}")
async def get_market(market_id: str):
    m = await db.markets.find_one({"id": market_id})
    if not m:
        raise HTTPException(404, "Market not found")
    m.pop("_id", None)
    today_results = await _fetch_today_results()
    return _market_open_status(m, today_results)


# ---------- Bids ----------
@api.post("/bids")
async def place_bid(payload: BidPlace, user: dict = Depends(get_current_user)):
    market = await db.markets.find_one({"id": payload.market_id})
    if not market:
        raise HTTPException(404, "Market not found")
    today_results = await _fetch_today_results()
    market = _market_open_status(market, today_results)
    if not market.get("is_market_active"):
        raise HTTPException(400, "Market is closed for today")
    if not payload.bids:
        raise HTTPException(400, "No bids provided")

    total = sum(b.amount for b in payload.bids)
    if total <= 0:
        raise HTTPException(400, "Total amount must be > 0")
    if user.get("wallet_balance", 0) < total:
        raise HTTPException(400, "Insufficient wallet balance")

    settings = await db.settings.find_one({"key": "global"}) or {}
    rates = settings.get("game_rates") or default_game_rates()
    today_ist = datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%d")

    bid_docs = []
    for b in payload.bids:
        cfg = GAMES.get(b.game_type)
        if not cfg:
            raise HTTPException(400, f"Unknown game type: {b.game_type}")
        if cfg["session"]:
            if b.session not in ("open", "close"):
                raise HTTPException(400, f"{cfg['name']} requires session (open/close)")
            if b.session == "open" and not market.get("is_open_session_active"):
                raise HTTPException(400, f"Open session closed for {market['name']}")
            if b.session == "close" and not market.get("is_close_session_active"):
                raise HTTPException(400, f"Close session closed for {market['name']}")
        if b.amount < 10:
            raise HTTPException(400, f"⚠️ Minimum bet ₹10 hai. Aapne ₹{b.amount} ki bet lagayi — kam se kam ₹10 ki bet lagao.")
        bid_docs.append({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "market_id": market["id"],
            "market_name": market["name"],
            "game_type": b.game_type,
            "game_name": cfg["name"],
            "session": b.session,
            "number": b.number,
            "amount": b.amount,
            "rate": rates.get(b.game_type, cfg["rate"]),
            "status": "pending",
            "win_amount": 0,
            "result_date": today_ist,
            "created_at": now_iso(),
        })

    await db.bids.insert_many(bid_docs)
    # Debit wallet
    await db.users.update_one({"id": user["id"]}, {"$inc": {"wallet_balance": -total}})
    # Transaction record
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "bid",
        "amount": -total,
        "status": "approved",
        "note": f"Placed {len(bid_docs)} bids on {market['name']}",
        "created_at": now_iso(),
    })
    return {"ok": True, "count": len(bid_docs), "debited": total}


@api.get("/bids/me")
async def my_bids(user: dict = Depends(get_current_user), limit: int = 100):
    out = []
    async for b in db.bids.find({"user_id": user["id"]}).sort("created_at", -1).limit(limit):
        b.pop("_id", None)
        out.append(b)
    return out


# ---------- Wallet / Transactions ----------
@api.get("/wallet/passbook")
async def passbook(user: dict = Depends(get_current_user), limit: int = 200):
    out = []
    async for t in db.transactions.find({"user_id": user["id"]}).sort("created_at", -1).limit(limit):
        t.pop("_id", None)
        out.append(t)
    return out


@api.post("/wallet/deposit")
async def request_deposit(payload: DepositIn, user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"key": "global"}) or {}
    min_d = settings.get("min_deposit", 300)
    if payload.amount < min_d:
        raise HTTPException(400, f"⚠️ Minimum deposit ₹{min_d} hai. Aapne ₹{payload.amount} daala — kam se kam ₹{min_d} daalo.")
    tid = str(uuid.uuid4())
    await db.transactions.insert_one({
        "id": tid,
        "user_id": user["id"],
        "user_mobile": user.get("mobile"),
        "user_name": user.get("name"),
        "type": "deposit",
        "amount": payload.amount,
        "method": payload.method,
        "utr": payload.utr,
        "status": "pending",
        "note": "Awaiting admin approval",
        "created_at": now_iso(),
    })
    return {"ok": True, "transaction_id": tid}


@api.post("/wallet/withdraw")
async def request_withdraw(payload: WithdrawIn, user: dict = Depends(get_current_user)):
    settings_pre = await db.settings.find_one({"key": "global"}) or {}
    min_w = settings_pre.get("min_withdraw", 500)
    if payload.amount < min_w:
        raise HTTPException(400, f"⚠️ Minimum withdrawal ₹{min_w} hai. Aapne ₹{payload.amount} request kiya — kam se kam ₹{min_w} chahiye.")
    if user.get("wallet_balance", 0) < payload.amount:
        raise HTTPException(400, f"⚠️ Aapke wallet mein sirf ₹{user.get('wallet_balance', 0)} hai. ₹{payload.amount} withdraw karne ke liye paise kam hain.")
    # Validate per-method payload
    account_info = {}
    if payload.method == "upi":
        if not payload.upi_id:
            raise HTTPException(400, "upi_id is required for UPI withdrawal")
        account_info = {"upi_id": payload.upi_id}
    elif payload.method == "bank":
        missing = [k for k in ("holder_name", "bank_name", "account_number", "ifsc")
                   if not getattr(payload, k)]
        if missing:
            raise HTTPException(400, f"Missing bank field(s): {', '.join(missing)}")
        account_info = {
            "holder_name": payload.holder_name,
            "bank_name": payload.bank_name,
            "account_number": payload.account_number,
            "ifsc": payload.ifsc,
        }
    # Enforce withdrawal time window (IST) when both bounds are configured
    settings = await db.settings.find_one({"key": "global"}) or {}
    wo, wc = settings.get("withdraw_open_time"), settings.get("withdraw_close_time")
    if wo and wc:
        try:
            oh, om = map(int, wo.split(":"))
            ch, cm = map(int, wc.split(":"))
            now_ist = datetime.now(timezone(timedelta(hours=5, minutes=30)))
            cur = dtime(now_ist.hour, now_ist.minute)
            if not (dtime(oh, om) <= cur <= dtime(ch, cm)):
                raise HTTPException(400, f"⚠️ Withdrawal sirf {wo} se {wc} IST ke beech allowed hai. Abhi time se pehle/baad hai — please us window mein try karo.")
        except HTTPException:
            raise
        except Exception:
            pass
    # Hold the amount immediately
    await db.users.update_one({"id": user["id"]}, {"$inc": {"wallet_balance": -payload.amount}})
    tid = str(uuid.uuid4())
    await db.transactions.insert_one({
        "id": tid,
        "user_id": user["id"],
        "user_mobile": user.get("mobile"),
        "user_name": user.get("name"),
        "type": "withdraw",
        "amount": -payload.amount,
        "method": payload.method,
        "account_info": account_info,
        "status": "pending",
        "note": "Pending admin payout",
        "created_at": now_iso(),
    })
    return {"ok": True, "transaction_id": tid}


# ---------- Notifications ----------
@api.get("/notifications")
async def my_notifications(user: dict = Depends(get_current_user)):
    out = []
    async for n in db.notifications.find({"$or": [{"user_id": user["id"]}, {"user_id": None}]}).sort("created_at", -1).limit(50):
        n.pop("_id", None)
        out.append(n)
    return out


# =====================================================
# ============= ADMIN ENDPOINTS =======================
# =====================================================
@api.get("/admin/dashboard")
async def admin_dashboard(_: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({"role": "user"})
    total_bids = await db.bids.count_documents({})
    pending_with = await db.transactions.count_documents({"type": "withdraw", "status": "pending"})
    pending_dep = await db.transactions.count_documents({"type": "deposit", "status": "pending"})
    # live balance sum
    pipeline = [{"$match": {"role": "user"}}, {"$group": {"_id": None, "total": {"$sum": "$wallet_balance"}}}]
    live_balance = 0
    async for doc in db.users.aggregate(pipeline):
        live_balance = doc.get("total", 0)
    # today's collection (bids placed today)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_collection = 0
    async for b in db.bids.find({"created_at": {"$regex": f"^{today}"}}):
        today_collection += b.get("amount", 0)
    return {
        "total_users": total_users,
        "total_bids": total_bids,
        "live_balance": live_balance,
        "today_collection": today_collection,
        "pending_withdrawals": pending_with,
        "pending_deposits": pending_dep,
    }


@api.get("/admin/markets")
async def admin_list_markets(_: dict = Depends(require_admin)):
    today_results = await _fetch_today_results()
    yesterday_results = await _fetch_yesterday_results()
    out = []
    async for m in db.markets.find({}):
        m.pop("_id", None)
        yr = yesterday_results.get(m.get("id"))
        if yr:
            m["_yesterday_open"] = yr.get("open_pana")
            m["_yesterday_close"] = yr.get("close_pana")
            if yr.get("open_pana") and len(str(yr.get("open_pana"))) == 2:
                m["_yesterday_result"] = yr.get("open_pana")
        out.append(_market_open_status(m, today_results))
    out.sort(key=lambda x: x.get("open_time", "99:99"))
    return out


@api.post("/admin/markets")
async def admin_create_market(payload: MarketIn, _: dict = Depends(require_admin)):
    doc = {"id": str(uuid.uuid4()), **payload.model_dump(), "open_result": None, "close_result": None, "result_date": None, "created_at": now_iso()}
    await db.markets.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/admin/markets/{market_id}")
async def admin_update_market(market_id: str, payload: MarketUpdate, _: dict = Depends(require_admin)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    await db.markets.update_one({"id": market_id}, {"$set": update})
    m = await db.markets.find_one({"id": market_id})
    m.pop("_id", None)
    return m


@api.delete("/admin/markets/{market_id}")
async def admin_delete_market(market_id: str, _: dict = Depends(require_admin)):
    await db.markets.delete_one({"id": market_id})
    # Also clean up related results & bids (orphaned data)
    await db.results.delete_many({"market_id": market_id})
    return {"ok": True}


@api.post("/admin/markets/cleanup-defaults")
async def admin_cleanup_to_defaults(_: dict = Depends(require_admin)):
    """Removes all markets NOT in the current DEFAULT_MARKETS list.
    Useful after a market-list redesign to delete legacy markets.
    """
    from seed import DEFAULT_MARKETS
    keep_names = {m["name"].upper() for m in DEFAULT_MARKETS}
    deleted = 0
    async for m in db.markets.find({}):
        if str(m.get("name", "")).upper() not in keep_names:
            await db.markets.delete_one({"id": m["id"]})
            await db.results.delete_many({"market_id": m["id"]})
            deleted += 1
    return {"ok": True, "deleted": deleted, "kept": list(keep_names)}


@api.post("/admin/markets/{market_id}/result")
async def admin_declare_result(market_id: str, payload: ResultIn, _: dict = Depends(require_admin)):
    """Declare open and/or close pana for TODAY (IST). Auto-settles pending bids when ready.

    Each day's result is stored in `results` collection keyed by (market_id, date).
    The market document also caches the latest declared result for backwards compat.
    """
    market = await db.markets.find_one({"id": market_id})
    if not market:
        raise HTTPException(404, "Market not found")
    today_actual = datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%d")
    # Date-aware declare: admin can pick any date (past corrections, future-pre-declare disallowed)
    today = (payload.date or today_actual).strip()
    if not (len(today) == 10 and today[4] == "-" and today[7] == "-"):
        raise HTTPException(400, "date must be YYYY-MM-DD")
    if today > today_actual:
        raise HTTPException(400, "Cannot declare result for a future date")

    # Upsert today's row in results collection
    existing = await db.results.find_one({"market_id": market_id, "date": today})
    row = existing or {
        "id": str(uuid.uuid4()),
        "market_id": market_id,
        "market_name": market["name"],
        "date": today,
        "open_pana": None,
        "close_pana": None,
        "declared_at": now_iso(),
    }
    if payload.result:
        # New 2-digit jodi format ("37"). Store digits in both pana fields for back-compat.
        if not (payload.result.isdigit() and len(payload.result) == 2):
            raise HTTPException(400, "result must be a 2-digit jodi (e.g. 37)")
        row["open_pana"] = payload.result
        row["close_pana"] = payload.result
    if payload.open_pana and not payload.result:
        if not (payload.open_pana.isdigit() and 2 <= len(payload.open_pana) <= 3):
            raise HTTPException(400, "open_pana must be 2 or 3 digits")
        row["open_pana"] = payload.open_pana
    if payload.close_pana and not payload.result:
        if not (payload.close_pana.isdigit() and 2 <= len(payload.close_pana) <= 3):
            raise HTTPException(400, "close_pana must be 2 or 3 digits")
        row["close_pana"] = payload.close_pana
    row["declared_at"] = now_iso()
    if existing:
        await db.results.update_one({"market_id": market_id, "date": today}, {"$set": {"open_pana": row["open_pana"], "close_pana": row["close_pana"], "declared_at": row["declared_at"]}})
    else:
        await db.results.insert_one(row)

    # Cache the latest declared result on the market doc (for quick `live_result` rendering)
    market_update = {"result_date": today, "open_result": row["open_pana"], "close_result": row["close_pana"]}
    await db.markets.update_one({"id": market_id}, {"$set": market_update})

    open_p = row.get("open_pana")
    close_p = row.get("close_pana")

    # Settle pending bids placed TODAY only (so yesterday's stale bids don't accidentally settle)
    settled = 0
    won = 0
    payout_total = 0
    query = {"market_id": market_id, "status": "pending", "result_date": today}
    async for bid in db.bids.find(query):
        cfg = GAMES.get(bid["game_type"])
        if not cfg:
            continue
        if cfg["session"]:
            if bid["session"] == "open" and not open_p:
                continue
            if bid["session"] == "close" and not close_p:
                continue
        else:
            if not (open_p and close_p):
                continue
        win = evaluate_bid(bid["game_type"], bid.get("session"), bid["number"], open_p, close_p)
        win_amount = int(bid["amount"] * bid.get("rate", cfg["rate"])) if win else 0
        new_status = "won" if win else "lost"
        await db.bids.update_one(
            {"id": bid["id"]},
            {"$set": {"status": new_status, "win_amount": win_amount, "settled_at": now_iso()}},
        )
        if win:
            await db.users.update_one({"id": bid["user_id"]}, {"$inc": {"wallet_balance": win_amount}})
            await db.transactions.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": bid["user_id"],
                "type": "win",
                "amount": win_amount,
                "status": "approved",
                "note": f"Won bid on {bid['market_name']} ({bid['game_name']})",
                "ref_bid_id": bid["id"],
                "created_at": now_iso(),
            })
            # Auto-add to public winners ticker (real winner)
            winner_user = await db.users.find_one({"id": bid["user_id"]}, {"name": 1, "mobile": 1})
            display_name = (winner_user or {}).get("name") or "Player"
            mobile_last4 = ((winner_user or {}).get("mobile") or "")[-4:] or "****"
            await db.showcase_winners.insert_one({
                "id": str(uuid.uuid4()),
                "name": f"{display_name.split()[0]} ****{mobile_last4}",
                "amount": win_amount,
                "source": "real",
                "ref_bid_id": bid["id"],
                "market_name": bid.get("market_name"),
                "active": True,
                "created_at": now_iso(),
            })
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": bid["user_id"],
                "title": "Congratulations! You won",
                "body": f"Your bid of {bid['amount']} on {bid['game_name']} ({bid['market_name']}) won {win_amount} points.",
                "created_at": now_iso(),
            })
            won += 1
            payout_total += win_amount
        settled += 1
    market.pop("_id", None)
    return {"market": {**market, **market_update}, "settled": settled, "won": won, "payout_total": payout_total, "date": today}


@api.post("/admin/markets/{market_id}/reverse-result")
async def admin_reverse_result(market_id: str, body: dict, _: dict = Depends(require_admin)):
    """Undo today's (or given date's) result: revert won credits, set bids back to pending,
    clear declared open/close pana. Bids from that date are reset.
    """
    market = await db.markets.find_one({"id": market_id})
    if not market:
        raise HTTPException(404, "Market not found")
    date = body.get("date") or datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%d")

    reverted = 0
    refunded = 0
    # Revert all settled bids for this market on this date
    async for bid in db.bids.find({"market_id": market_id, "result_date": date, "status": {"$in": ["won", "lost"]}}):
        if bid.get("status") == "won":
            win_amount = bid.get("win_amount", 0)
            # Debit the win amount back from the user
            await db.users.update_one({"id": bid["user_id"]}, {"$inc": {"wallet_balance": -win_amount}})
            refunded += win_amount
            await db.transactions.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": bid["user_id"],
                "type": "reverse",
                "amount": -win_amount,
                "status": "approved",
                "note": f"Result reversed for {bid['market_name']} — winning credit reverted",
                "ref_bid_id": bid["id"],
                "created_at": now_iso(),
            })
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": bid["user_id"],
                "title": "Result reversed",
                "body": f"Result for {bid['market_name']} was reversed by admin. Your winning of {win_amount} points has been reverted.",
                "created_at": now_iso(),
            })
        await db.bids.update_one({"id": bid["id"]}, {"$set": {"status": "pending", "win_amount": 0}, "$unset": {"settled_at": ""}})
        reverted += 1

    await db.results.delete_one({"market_id": market_id, "date": date})
    # Clear cache on market doc if it referenced this date
    if market.get("result_date") == date:
        await db.markets.update_one({"id": market_id}, {"$set": {"open_result": None, "close_result": None, "result_date": None}})

    return {"ok": True, "reverted_bids": reverted, "refunded": refunded, "date": date}


@api.get("/admin/markets/{market_id}/results")
async def admin_list_market_results(market_id: str, _: dict = Depends(require_admin), limit: int = 60):
    out = []
    async for r in db.results.find({"market_id": market_id}).sort("date", -1).limit(limit):
        r.pop("_id", None)
        out.append(r)
    return out


@api.get("/admin/jantri-report")
async def admin_jantri_report(
    market_id: str,
    date: Optional[str] = None,
    game_type: str = "jodi",
    _: dict = Depends(require_admin),
):
    """JANTRI BET Report — aggregated bet totals per number (00-99) for a market on a date.

    Returns:
      - grid: 10x10 2D array [[{"number":"00","total":int,"count":int}, ...], ...]
      - totals: {"total_amount":int, "total_bids":int, "unique_numbers":int}
      - top: list of top-5 numbers by amount (for quick risk view)
    """
    market = await db.markets.find_one({"id": market_id})
    if not market:
        raise HTTPException(404, "Market not found")
    if not date:
        date = datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%d")

    # Build filter: for jodi mode include both 'jodi' and 'cross_bet' (both bet on 00-99)
    game_types_filter = [game_type]
    if game_type == "jodi":
        game_types_filter = ["jodi", "cross_bet"]
    elif game_type in ("haruf_andar", "haruf_bahar"):
        # For haruf we return a 1x10 grid (digits 0-9)
        pass

    # Aggregate bets grouped by number
    pipeline = [
        {"$match": {
            "market_id": market_id,
            "result_date": date,
            "game_type": {"$in": game_types_filter},
        }},
        {"$group": {
            "_id": "$number",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1},
        }},
    ]
    agg = {}
    async for row in db.bids.aggregate(pipeline):
        agg[str(row["_id"]).zfill(2)] = {"total": row["total"], "count": row["count"]}

    if game_type in ("haruf_andar", "haruf_bahar"):
        # 1D grid: digits 0-9
        grid = []
        for d in range(10):
            key = str(d)
            entry = agg.get(key) or agg.get(str(d).zfill(2)) or {"total": 0, "count": 0}
            grid.append({"number": str(d), "total": entry["total"], "count": entry["count"]})
        total_amount = sum(c["total"] for c in grid)
        total_bids = sum(c["count"] for c in grid)
        unique = sum(1 for c in grid if c["total"] > 0)
        top = sorted([c for c in grid if c["total"] > 0], key=lambda x: -x["total"])[:5]
        return {
            "market_id": market_id,
            "market_name": market.get("name"),
            "date": date,
            "game_type": game_type,
            "shape": "1x10",
            "grid_1d": grid,
            "totals": {"total_amount": total_amount, "total_bids": total_bids, "unique_numbers": unique},
            "top": top,
        }

    # Default: 10x10 grid for jodi (00-99)
    grid = []
    for row in range(10):
        row_arr = []
        for col in range(10):
            num = f"{row}{col}"
            entry = agg.get(num) or {"total": 0, "count": 0}
            row_arr.append({"number": num, "total": entry["total"], "count": entry["count"]})
        grid.append(row_arr)

    total_amount = sum(c["total"] for r in grid for c in r)
    total_bids = sum(c["count"] for r in grid for c in r)
    unique = sum(1 for r in grid for c in r if c["total"] > 0)
    flat = [c for r in grid for c in r if c["total"] > 0]
    top = sorted(flat, key=lambda x: -x["total"])[:5]

    return {
        "market_id": market_id,
        "market_name": market.get("name"),
        "date": date,
        "game_type": game_type,
        "shape": "10x10",
        "grid": grid,
        "totals": {"total_amount": total_amount, "total_bids": total_bids, "unique_numbers": unique},
        "top": top,
    }


@api.post("/admin/results/fetch")
async def admin_fetch_results(body: dict, _: dict = Depends(require_admin)):
    """Stub for auto-result fetching. Calls the configured result_api_url with optional
    market_id+date params and expects JSON like [{market_id, date, open_pana, close_pana}].
    For now returns a 501 if not configured so the admin can wire their own API later.
    """
    settings = await db.settings.find_one({"key": "global"}) or {}
    url = settings.get("result_api_url")
    if not url:
        raise HTTPException(501, "Result API URL not configured. Set it in System Settings first.")
    return {"ok": False, "message": "Auto-fetch wired but no external call implemented yet. Provide a webhook that returns market results and we'll plug it in."}


@api.get("/results/{market_id}")
async def public_market_results(market_id: str, limit: int = 30):
    """Public endpoint: chart-style history of declared results for a market."""
    out = []
    async for r in db.results.find({"market_id": market_id}).sort("date", -1).limit(limit):
        r.pop("_id", None)
        out.append(r)
    return out


@api.get("/admin/users/{user_id}/detail")
async def admin_user_detail(user_id: str, _: dict = Depends(require_admin)):
    u = await db.users.find_one({"id": user_id})
    if not u:
        raise HTTPException(404, "User not found")
    u.pop("_id", None)
    u.pop("mpin_hash", None)
    u.pop("password_hash", None)

    bids = []
    async for b in db.bids.find({"user_id": user_id}).sort("created_at", -1).limit(200):
        b.pop("_id", None)
        bids.append(b)

    deposits = []
    async for t in db.transactions.find({"user_id": user_id, "type": "deposit"}).sort("created_at", -1).limit(100):
        t.pop("_id", None)
        deposits.append(t)

    withdrawals = []
    async for t in db.transactions.find({"user_id": user_id, "type": "withdraw"}).sort("created_at", -1).limit(100):
        t.pop("_id", None)
        withdrawals.append(t)

    transactions = []
    async for t in db.transactions.find({"user_id": user_id}).sort("created_at", -1).limit(300):
        t.pop("_id", None)
        transactions.append(t)

    # Aggregates
    total_dep = sum(t["amount"] for t in deposits if t.get("status") == "approved")
    total_wd = sum(abs(t["amount"]) for t in withdrawals if t.get("status") == "approved")
    total_bid = sum(b["amount"] for b in bids)
    total_won = sum(b.get("win_amount", 0) for b in bids if b.get("status") == "won")

    return {
        "user": u,
        "bids": bids,
        "deposits": deposits,
        "withdrawals": withdrawals,
        "transactions": transactions,
        "summary": {
            "total_deposit": total_dep,
            "total_withdraw": total_wd,
            "total_bid": total_bid,
            "total_won": total_won,
            "open_bids": sum(1 for b in bids if b["status"] == "pending"),
        },
    }


@api.get("/admin/users")
async def admin_list_users(_: dict = Depends(require_admin), q: str = ""):
    query = {"role": "user"}
    if q:
        query["$or"] = [{"mobile": {"$regex": q}}, {"name": {"$regex": q, "$options": "i"}}]
    out = []
    async for u in db.users.find(query).sort("created_at", -1).limit(500):
        u.pop("_id", None)
        u.pop("mpin_hash", None)
        out.append(u)
    return out


@api.post("/admin/users/{user_id}/toggle-block")
async def admin_toggle_block(user_id: str, _: dict = Depends(require_admin)):
    u = await db.users.find_one({"id": user_id})
    if not u:
        raise HTTPException(404, "User not found")
    new = "active" if u.get("status") == "blocked" else "blocked"
    await db.users.update_one({"id": user_id}, {"$set": {"status": new}})
    return {"ok": True, "status": new}


@api.post("/admin/wallet/adjust")
async def admin_wallet_adjust(payload: WalletAdjustIn, _: dict = Depends(require_admin)):
    u = await db.users.find_one({"id": payload.user_id})
    if not u:
        raise HTTPException(404, "User not found")
    new_balance = u.get("wallet_balance", 0) + payload.amount
    if new_balance < 0:
        raise HTTPException(400, "Balance would be negative")
    await db.users.update_one({"id": payload.user_id}, {"$set": {"wallet_balance": new_balance}})
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": payload.user_id,
        "type": "admin_adjust",
        "amount": payload.amount,
        "status": "approved",
        "note": payload.note or ("Admin credit" if payload.amount >= 0 else "Admin debit"),
        "created_at": now_iso(),
    })
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": payload.user_id,
        "title": "Wallet updated by admin",
        "body": f"{payload.amount:+d} points. {payload.note}",
        "created_at": now_iso(),
    })
    return {"ok": True, "new_balance": new_balance}


@api.get("/admin/transactions")
async def admin_transactions(_: dict = Depends(require_admin), type: Optional[str] = None, status_f: Optional[str] = None):
    query = {}
    if type:
        query["type"] = type
    if status_f:
        query["status"] = status_f
    out = []
    async for t in db.transactions.find(query).sort("created_at", -1).limit(500):
        t.pop("_id", None)
        out.append(t)
    return out


@api.post("/admin/transactions/action")
async def admin_transaction_action(payload: TransactionApproveIn, _: dict = Depends(require_admin)):
    t = await db.transactions.find_one({"id": payload.transaction_id})
    if not t:
        raise HTTPException(404, "Transaction not found")
    if t.get("status") != "pending":
        raise HTTPException(400, "Already processed")

    if t["type"] == "deposit":
        if payload.action == "approve":
            await db.users.update_one({"id": t["user_id"]}, {"$inc": {"wallet_balance": t["amount"]}})
            await db.transactions.update_one({"id": payload.transaction_id}, {"$set": {"status": "approved", "admin_note": payload.admin_note}})
            await db.notifications.insert_one({"id": str(uuid.uuid4()), "user_id": t["user_id"], "title": "Deposit approved", "body": f"{t['amount']} points added to your wallet.", "created_at": now_iso()})
            # Apply deposit bonus if applicable
            try:
                await _apply_deposit_bonus(t["user_id"], int(t["amount"]), t["id"])
            except Exception:
                pass
        else:
            await db.transactions.update_one({"id": payload.transaction_id}, {"$set": {"status": "rejected", "admin_note": payload.admin_note}})
            await db.notifications.insert_one({"id": str(uuid.uuid4()), "user_id": t["user_id"], "title": "Deposit rejected", "body": payload.admin_note or "Your deposit was rejected.", "created_at": now_iso()})
    elif t["type"] == "withdraw":
        if payload.action == "approve":
            await db.transactions.update_one({"id": payload.transaction_id}, {"$set": {"status": "approved", "admin_note": payload.admin_note}})
            await db.notifications.insert_one({"id": str(uuid.uuid4()), "user_id": t["user_id"], "title": "Withdrawal sent", "body": f"{abs(t['amount'])} points paid out.", "created_at": now_iso()})
        else:
            # refund
            await db.users.update_one({"id": t["user_id"]}, {"$inc": {"wallet_balance": abs(t["amount"])}})
            await db.transactions.update_one({"id": payload.transaction_id}, {"$set": {"status": "rejected", "admin_note": payload.admin_note}})
            await db.notifications.insert_one({"id": str(uuid.uuid4()), "user_id": t["user_id"], "title": "Withdrawal rejected", "body": "Amount refunded to your wallet.", "created_at": now_iso()})
    else:
        raise HTTPException(400, "Unsupported transaction type")
    return {"ok": True}


@api.get("/admin/bids")
async def admin_all_bids(_: dict = Depends(require_admin), limit: int = 200):
    out = []
    async for b in db.bids.find({}).sort("created_at", -1).limit(limit):
        b.pop("_id", None)
        out.append(b)
    return out


@api.patch("/admin/settings")
async def admin_update_settings(payload: SettingsIn, _: dict = Depends(require_admin)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    await db.settings.update_one({"key": "global"}, {"$set": update}, upsert=True)
    s = await db.settings.find_one({"key": "global"})
    s.pop("_id", None)
    return s


@api.post("/admin/notice/broadcast")
async def admin_broadcast(body: dict, _: dict = Depends(require_admin)):
    title = body.get("title", "Announcement")
    text = body.get("body", "")
    await db.notifications.insert_one({"id": str(uuid.uuid4()), "user_id": None, "title": title, "body": text, "created_at": now_iso()})
    return {"ok": True}


# ---------- File upload (base64 -> id) ----------
class UploadIn(BaseModel):
    data_url: str  # "data:image/png;base64,...." or raw base64
    filename: Optional[str] = None


@api.post("/admin/upload")
async def admin_upload(payload: UploadIn, _: dict = Depends(require_admin)):
    data = payload.data_url
    if not data:
        raise HTTPException(400, "Empty payload")
    # Accept ~25MB max (data URL base64 is ~1.37× the raw file size)
    if len(data) > 35_000_000:
        raise HTTPException(413, "File too large (max ~25MB)")
    fid = str(uuid.uuid4())
    await db.files.insert_one({
        "id": fid,
        "filename": payload.filename or f"upload-{fid}",
        "data_url": data,
        "created_at": now_iso(),
    })
    return {"id": fid, "url": f"/api/files/{fid}"}


@api.get("/files/{file_id}")
async def get_file_redirect(file_id: str):
    """Return the stored data URL directly as JSON so the frontend can use it as src."""
    f = await db.files.find_one({"id": file_id})
    if not f:
        raise HTTPException(404, "File not found")
    return {"id": file_id, "data_url": f["data_url"], "filename": f.get("filename")}


@api.get("/files/{file_id}/raw")
async def get_file_raw(file_id: str):
    """Return the file bytes directly with proper Content-Type (usable as <video src>, <img src>)."""
    import base64
    from fastapi.responses import Response
    f = await db.files.find_one({"id": file_id})
    if not f:
        raise HTTPException(404, "File not found")
    data_url = f.get("data_url", "")
    # Expect format: data:<mime>;base64,<payload>
    try:
        header, payload = data_url.split(",", 1)
        mime = header.split(":")[1].split(";")[0] if ":" in header else "application/octet-stream"
        raw = base64.b64decode(payload)
    except Exception:
        raise HTTPException(500, "Invalid file storage format")
    return Response(content=raw, media_type=mime, headers={"Cache-Control": "public, max-age=604800"})


# ---------- UPI Intent / Deposit helper ----------
@api.get("/wallet/upi-intent")
async def upi_intent(amount: int, user: dict = Depends(get_current_user)):
    """Build a UPI intent URL the frontend can put into a <a href>. Works with any UPI app
    (Paytm, PhonePe, GPay, BharatPe, Amazon Pay, etc.)."""
    s = await db.settings.find_one({"key": "global"}) or {}
    upi_id = s.get("upi_id") or "m11clube@upi"
    payee = s.get("upi_payee_name") or "M11 CLUBE"
    note = f"Deposit-{user.get('mobile', '')}-{amount}"
    from urllib.parse import quote
    href = f"upi://pay?pa={quote(upi_id)}&pn={quote(payee)}&am={amount}&cu=INR&tn={quote(note)}"
    return {"upi_url": href, "upi_id": upi_id, "payee": payee, "amount": amount, "note": note}


# ---------- IMB Payment Gateway integration ----------
@api.post("/wallet/deposit/imb-create")
async def imb_create_order(payload: IMBCreateOrderIn, user: dict = Depends(get_current_user)):
    """Create an order with IMB Payment Gateway. Returns payment_url + UPI deep links
    that the frontend can use to launch the payment flow. Creates a `pending` deposit
    transaction tagged with the IMB order_id; the webhook auto-credits the wallet on success."""
    s = await db.settings.find_one({"key": "global"}) or {}
    base = (s.get("imb_base_url") or "https://api.imbpay.in").rstrip("/")
    token = (s.get("imb_user_token") or "").strip()
    if not token:
        raise HTTPException(503, "Payment gateway not configured. Ask admin to set IMB API key.")
    min_d = s.get("min_deposit", 300)
    if payload.amount < min_d:
        raise HTTPException(400, f"Minimum deposit is {min_d} points")

    order_id = f"RK{int(datetime.now(timezone.utc).timestamp())}{uuid.uuid4().hex[:6].upper()}"
    redirect_url = os.environ.get("PUBLIC_APP_URL", "https://m11clube.app") + "/funds?paid=1"
    body = {
        "customer_mobile": user.get("mobile") or "9999999999",
        "user_token": token,
        "amount": str(payload.amount),
        "order_id": order_id,
        "redirect_url": redirect_url,
        "remark1": f"M11 Deposit - {user.get('name', '')}",
        "remark2": f"user_id={user['id']}",
    }
    try:
        async with _httpx.AsyncClient(timeout=20) as cli:
            r = await cli.post(f"{base}/api/create-order", data=body)
            data = r.json()
    except Exception as e:
        raise HTTPException(502, f"Payment gateway error: {e}")

    if not data.get("status"):
        raise HTTPException(400, data.get("message") or "Failed to create order")

    result = data.get("result") or {}
    # Persist pending transaction so webhook can credit later
    tid = str(uuid.uuid4())
    await db.transactions.insert_one({
        "id": tid,
        "user_id": user["id"],
        "user_mobile": user.get("mobile"),
        "user_name": user.get("name"),
        "type": "deposit",
        "amount": payload.amount,
        "method": "imb",
        "imb_order_id": order_id,
        "imb_check_link": result.get("check_link"),
        "imb_payment_url": result.get("payment_url"),
        "status": "pending",
        "note": "Awaiting IMB payment",
        "created_at": now_iso(),
    })
    return {
        "ok": True,
        "transaction_id": tid,
        "order_id": order_id,
        "amount": payload.amount,
        **result,
    }


@api.post("/wallet/deposit/imb-status")
async def imb_check_status(body: dict, user: dict = Depends(get_current_user)):
    order_id = body.get("order_id")
    if not order_id:
        raise HTTPException(400, "order_id required")
    s = await db.settings.find_one({"key": "global"}) or {}
    base = (s.get("imb_base_url") or "https://api.imbpay.in").rstrip("/")
    token = (s.get("imb_user_token") or "").strip()
    if not token:
        raise HTTPException(503, "Payment gateway not configured")
    try:
        async with _httpx.AsyncClient(timeout=10) as cli:
            r = await cli.post(f"{base}/api/check-order-status", data={"user_token": token, "order_id": order_id})
            data = r.json()
    except Exception as e:
        raise HTTPException(502, f"Status check failed: {e}")
    order_status = (data.get("status") or "").upper()
    # If completed and not yet credited, credit now
    if order_status in ("COMPLETED", "SUCCESS") and (data.get("result") or {}).get("txnStatus") == "COMPLETED":
        await _imb_credit_if_pending(order_id, data)
    # Reflect updated wallet/status to caller
    txn = await db.transactions.find_one({"imb_order_id": order_id})
    if txn:
        txn.pop("_id", None)
    return {"gateway": data, "transaction": txn}


async def _credit_referrer_if_first_deposit(user_id: str, deposit_amount: int):
    """If this user was referred and this is their first deposit, credit the referrer
    with referral_first_deposit_percent% of the deposit. Idempotent."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        return
    if user.get("first_deposit_completed"):
        return  # already credited (or no referrer)
    referrer_id = user.get("referred_by")
    # Mark first deposit done regardless (no double-credit even if referrer is gone)
    await db.users.update_one({"id": user_id}, {"$set": {"first_deposit_completed": True}})
    if not referrer_id:
        return
    settings = await db.settings.find_one({"key": "global"}) or {}
    if not settings.get("referral_enabled", True):
        return
    pct = int(settings.get("referral_first_deposit_percent", 10))
    bonus = int(deposit_amount * pct / 100)
    if bonus <= 0:
        return
    await db.users.update_one({"id": referrer_id}, {"$inc": {"wallet_balance": bonus}})
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": referrer_id,
        "type": "referral_bonus",
        "amount": bonus,
        "status": "approved",
        "note": f"Referral bonus ({pct}%) — referee mobile *****{user.get('mobile','')[-4:]} deposited {deposit_amount}",
        "referred_user_id": user_id,
        "created_at": now_iso(),
    })
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": referrer_id,
        "title": "Referral Bonus 🎉",
        "body": f"You earned {bonus} pts from your referral's first deposit!",
        "created_at": now_iso(),
    })


async def _apply_deposit_bonus(user_id: str, deposit_amount: int, source_txn_id: str) -> int:
    """If deposit_amount >= threshold, credit `deposit_bonus_percent`% extra to wallet
    and record a `deposit_bonus` transaction. Returns bonus credited (0 if none)."""
    settings = await db.settings.find_one({"key": "global"}) or {}
    threshold = int(settings.get("deposit_bonus_threshold") or 0)
    pct = int(settings.get("deposit_bonus_percent") or 0)
    if threshold <= 0 or pct <= 0 or deposit_amount < threshold:
        return 0
    bonus = int(deposit_amount * pct / 100)
    if bonus <= 0:
        return 0
    await db.users.update_one({"id": user_id}, {"$inc": {"wallet_balance": bonus}})
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "deposit_bonus",
        "amount": bonus,
        "status": "approved",
        "note": f"Deposit bonus ({pct}%) on ₹{deposit_amount} deposit",
        "source_transaction_id": source_txn_id,
        "created_at": now_iso(),
    })
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": "🎁 Deposit Bonus!",
        "body": f"You got {bonus} pts extra ({pct}% bonus) on ₹{deposit_amount} deposit.",
        "created_at": now_iso(),
    })
    return bonus


async def _imb_credit_if_pending(order_id: str, gw_payload: dict):
    """Idempotently credit the user wallet for a completed IMB order."""
    t = await db.transactions.find_one({"imb_order_id": order_id})
    if not t or t.get("status") != "pending":
        return
    amount = int(t["amount"])
    await db.users.update_one({"id": t["user_id"]}, {"$inc": {"wallet_balance": amount}})
    await db.transactions.update_one(
        {"id": t["id"]},
        {"$set": {"status": "approved", "note": "Auto-credited via IMB Payment Gateway", "imb_gateway_payload": gw_payload, "settled_at": now_iso()}},
    )
    # Award referral bonus on first deposit
    try:
        await _credit_referrer_if_first_deposit(t["user_id"], amount)
    except Exception:
        pass
    # Award deposit bonus if amount >= configured threshold
    try:
        await _apply_deposit_bonus(t["user_id"], amount, t["id"])
    except Exception:
        pass
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": t["user_id"],
        "title": "Deposit successful",
        "body": f"{amount} pts credited to your wallet.",
        "created_at": now_iso(),
    })


@api.post("/webhooks/imb")
async def imb_webhook(req: Request):
    """IMB calls this on payment status update. Form-encoded or JSON. Tolerant of various field names."""
    try:
        form = await req.form()
        payload = {k: form.get(k) for k in form.keys()}
        if not payload:
            payload = await req.json()
    except Exception:
        try:
            payload = await req.json()
        except Exception:
            raise HTTPException(400, "Invalid payload")
    # Tolerant order_id extraction (IMB sometimes uses different field names)
    order_id = (
        payload.get("order_id")
        or payload.get("orderId")
        or payload.get("orderid")
        or payload.get("merchant_order_id")
        or payload.get("client_order_id")
        or payload.get("txnid")
    )
    # Status normalisation
    raw_status = str(payload.get("status") or payload.get("txnStatus") or payload.get("payment_status") or "").upper()
    if not order_id:
        # Try to log the raw payload to a debug collection so admin can investigate
        try:
            await db.imb_webhook_logs.insert_one({"id": str(uuid.uuid4()), "payload": payload, "received_at": now_iso(), "result": "missing_order_id"})
        except Exception:
            pass
        return {"ok": False, "message": "missing order_id", "received_keys": list(payload.keys())}
    success_states = ("SUCCESS", "TRUE", "COMPLETED", "PAID", "OK", "1")
    fail_states = ("FAILD", "FAIL", "FALSE", "FAILED", "REJECTED", "0")
    if raw_status in success_states:
        await _imb_credit_if_pending(order_id, payload)
    elif raw_status in fail_states:
        await db.transactions.update_one({"imb_order_id": order_id, "status": "pending"}, {"$set": {"status": "rejected", "note": "IMB reported failed payment", "imb_gateway_payload": payload}})
    # Log for audit
    try:
        await db.imb_webhook_logs.insert_one({"id": str(uuid.uuid4()), "order_id": order_id, "status": raw_status, "payload": payload, "received_at": now_iso()})
    except Exception:
        pass
    return {"ok": True}


@api.post("/admin/payments/retry-imb/{order_id}")
async def admin_retry_imb(order_id: str, _: dict = Depends(require_admin)):
    """Admin: force-check IMB for a stuck pending deposit and credit if successful."""
    s = await db.settings.find_one({"key": "global"}) or {}
    base = (s.get("imb_base_url") or "https://api.imbpay.in").rstrip("/")
    token = (s.get("imb_user_token") or "").strip()
    if not token:
        raise HTTPException(503, "Payment gateway not configured")
    try:
        async with _httpx.AsyncClient(timeout=15) as cli:
            r = await cli.post(f"{base}/api/check-order-status", data={"user_token": token, "order_id": order_id})
            data = r.json()
    except Exception as e:
        raise HTTPException(502, f"Status check failed: {e}")
    status_norm = (data.get("status") or "").upper()
    result_status = ((data.get("result") or {}).get("txnStatus") or "").upper()
    credited = False
    if status_norm in ("COMPLETED", "SUCCESS") and result_status in ("COMPLETED", "SUCCESS", ""):
        await _imb_credit_if_pending(order_id, data)
        credited = True
    txn = await db.transactions.find_one({"imb_order_id": order_id})
    if txn:
        txn.pop("_id", None)
    return {"ok": True, "credited": credited, "gateway": data, "transaction": txn}


# ---------- Refer & Earn ----------
@api.get("/users/me/referral")
async def my_referral(user: dict = Depends(get_current_user)):
    """Returns user's referral code + stats."""
    code = user.get("referral_code")
    if not code:
        code = ("M11" + uuid.uuid4().hex[:6]).upper()
        while await db.users.find_one({"referral_code": code}):
            code = ("M11" + uuid.uuid4().hex[:6]).upper()
        await db.users.update_one({"id": user["id"]}, {"$set": {"referral_code": code}})

    settings = await db.settings.find_one({"key": "global"}) or {}
    pct = int(settings.get("referral_first_deposit_percent", 10))
    enabled = bool(settings.get("referral_enabled", True))

    referred_count = await db.users.count_documents({"referred_by": user["id"]})
    converted_count = await db.users.count_documents({"referred_by": user["id"], "first_deposit_completed": True})

    total_earned = 0
    async for tx in db.transactions.find({"user_id": user["id"], "type": "referral_bonus", "status": "approved"}):
        total_earned += int(tx.get("amount") or 0)

    return {
        "referral_code": code,
        "percent": pct,
        "enabled": enabled,
        "referred_count": referred_count,
        "converted_count": converted_count,
        "total_earned": total_earned,
    }


# ---------- Market result history (public) ----------
@api.get("/markets/{market_id}/result-history")
async def market_result_history(market_id: str, limit: int = 60):
    market = await db.markets.find_one({"id": market_id})
    if not market:
        raise HTTPException(404, "Market not found")
    rows = []
    async for r in db.results.find({"market_id": market_id}).sort("date", -1).limit(limit):
        r.pop("_id", None)
        op = (r.get("open_pana") or "").strip()
        cp = (r.get("close_pana") or "").strip()
        jodi = None
        if len(op) == 2 and op.isdigit():
            jodi = op
        elif len(op) == 3 and len(cp) == 3:
            try:
                jodi = f"{sum(int(c) for c in op) % 10}{sum(int(c) for c in cp) % 10}"
            except Exception:
                jodi = None
        rows.append({"date": r.get("date"), "result": jodi or "**", "open_pana": op, "close_pana": cp})
    return {"market_id": market_id, "market_name": market.get("name"), "history": rows}


# ---------- Health ----------
@api.get("/")
async def root():
    return {"app": "M11 CLUBE", "status": "ok"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("mobile")
    await db.users.create_index("email")
    await db.markets.create_index("name")
    await db.bids.create_index("user_id")
    await db.transactions.create_index("user_id")
    await db.results.create_index([("market_id", 1), ("date", 1)], unique=True)
    await db.otps.create_index("mobile")
    await seed_all(db)
    logger.info("M11 CLUBE seed complete.")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
