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
JWT_TTL_HOURS = 24 * 7  # 7 days for convenience

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
    mpin: str = Field(..., min_length=4, max_length=4)


class LoginIn(BaseModel):
    mobile: str
    mpin: str


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
    open_pana: Optional[str] = None
    close_pana: Optional[str] = None


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
    utr: str
    method: str = "upi"


class WithdrawIn(BaseModel):
    amount: int
    account_info: str  # UPI ID or bank text


class WalletAdjustIn(BaseModel):
    user_id: str
    amount: int  # positive=credit, negative=debit
    note: str = ""


class SettingsIn(BaseModel):
    whatsapp_number: Optional[str] = None
    notice_text: Optional[str] = None
    upi_id: Optional[str] = None
    qr_code_url: Optional[str] = None
    min_deposit: Optional[int] = None
    min_withdraw: Optional[int] = None
    game_rates: Optional[dict] = None


class TransactionApproveIn(BaseModel):
    transaction_id: str
    action: Literal["approve", "reject"]
    admin_note: str = ""


# ---------- Auth (User) ----------
@api.post("/auth/register")
async def register(payload: RegisterIn):
    if not payload.mobile.isdigit() or not payload.mpin.isdigit():
        raise HTTPException(400, "Mobile and MPIN must be numeric")
    existing = await db.users.find_one({"mobile": payload.mobile})
    if existing:
        raise HTTPException(400, "Mobile already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "mobile": payload.mobile,
        "name": payload.name,
        "mpin_hash": hash_pw(payload.mpin),
        "role": "user",
        "wallet_balance": 50,  # welcome bonus
        "status": "active",
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    # welcome transaction
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
    user = await db.users.find_one({"mobile": payload.mobile, "role": "user"})
    if not user or not verify_pw(payload.mpin, user.get("mpin_hash", "")):
        raise HTTPException(401, "Invalid mobile or MPIN")
    if user.get("status") == "blocked":
        raise HTTPException(403, "Account blocked. Contact support.")
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
    old = body.get("old_mpin", "")
    new = body.get("new_mpin", "")
    if not verify_pw(old, user.get("mpin_hash", "")):
        raise HTTPException(400, "Old MPIN is incorrect")
    if not (new.isdigit() and len(new) == 4):
        raise HTTPException(400, "MPIN must be 4 digits")
    await db.users.update_one({"id": user["id"]}, {"$set": {"mpin_hash": hash_pw(new)}})
    return {"ok": True}


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


# ---------- Markets (Public) ----------
def _market_open_status(m: dict) -> dict:
    """Add live open/close flags using IST time."""
    now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    today_str = now.strftime("%Y-%m-%d")
    open_t = m.get("open_time", "00:00")
    close_t = m.get("close_time", "23:59")
    try:
        oh, om = map(int, open_t.split(":"))
        ch, cm = map(int, close_t.split(":"))
        open_dt = now.replace(hour=oh, minute=om, second=0, microsecond=0)
        close_dt = now.replace(hour=ch, minute=cm, second=0, microsecond=0)
        # Open session closes 15 min before open_time? Standard matka: bids close at open_time
        m["is_open_session_active"] = now < open_dt and m.get("status") == "active"
        m["is_close_session_active"] = now < close_dt and m.get("status") == "active"
        m["is_market_active"] = (now < close_dt) and m.get("status") == "active"
    except Exception:
        m["is_open_session_active"] = False
        m["is_close_session_active"] = False
        m["is_market_active"] = False

    # Live result string from today's declared results
    op = m.get("open_result") if m.get("result_date") == today_str else None
    cp = m.get("close_result") if m.get("result_date") == today_str else None
    open_digit = sum(int(c) for c in op) % 10 if op else None
    close_digit = sum(int(c) for c in cp) % 10 if cp else None
    if op and cp and open_digit is not None and close_digit is not None:
        m["live_result"] = f"{op}-{open_digit}{close_digit}-{cp}"
    elif op and open_digit is not None:
        m["live_result"] = f"{op}-{open_digit}*-***"
    else:
        m["live_result"] = "***-**-***"
    return m


@api.get("/markets")
async def list_markets():
    out = []
    async for m in db.markets.find({}):
        m.pop("_id", None)
        out.append(_market_open_status(m))
    # sort by open_time
    out.sort(key=lambda x: x.get("open_time", "99:99"))
    return out


@api.get("/markets/{market_id}")
async def get_market(market_id: str):
    m = await db.markets.find_one({"id": market_id})
    if not m:
        raise HTTPException(404, "Market not found")
    m.pop("_id", None)
    return _market_open_status(m)


# ---------- Bids ----------
@api.post("/bids")
async def place_bid(payload: BidPlace, user: dict = Depends(get_current_user)):
    market = await db.markets.find_one({"id": payload.market_id})
    if not market:
        raise HTTPException(404, "Market not found")
    market = _market_open_status(market)
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
            raise HTTPException(400, "Minimum bid amount is 10 points")
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
    if payload.amount < 100:
        raise HTTPException(400, "Minimum deposit is 100 points")
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
    if payload.amount < 500:
        raise HTTPException(400, "Minimum withdrawal is 500 points")
    if user.get("wallet_balance", 0) < payload.amount:
        raise HTTPException(400, "Insufficient balance")
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
        "account_info": payload.account_info,
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
    out = []
    async for m in db.markets.find({}):
        m.pop("_id", None)
        out.append(m)
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
    return {"ok": True}


@api.post("/admin/markets/{market_id}/result")
async def admin_declare_result(market_id: str, payload: ResultIn, _: dict = Depends(require_admin)):
    """Declare open and/or close pana. Auto-settles pending bids when ready."""
    market = await db.markets.find_one({"id": market_id})
    if not market:
        raise HTTPException(404, "Market not found")
    today = datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%d")
    update = {"result_date": today}
    if payload.open_pana:
        if not (payload.open_pana.isdigit() and len(payload.open_pana) == 3):
            raise HTTPException(400, "open_pana must be 3 digits")
        update["open_result"] = payload.open_pana
    if payload.close_pana:
        if not (payload.close_pana.isdigit() and len(payload.close_pana) == 3):
            raise HTTPException(400, "close_pana must be 3 digits")
        update["close_result"] = payload.close_pana
    await db.markets.update_one({"id": market_id}, {"$set": update})

    market = await db.markets.find_one({"id": market_id})
    open_p = market.get("open_result")
    close_p = market.get("close_result")

    # Settle pending bids
    settled = 0
    won = 0
    payout_total = 0
    async for bid in db.bids.find({"market_id": market_id, "status": "pending"}):
        cfg = GAMES.get(bid["game_type"])
        if not cfg:
            continue
        # Only settle if relevant results are available
        if cfg["session"]:
            if bid["session"] == "open" and not open_p:
                continue
            if bid["session"] == "close" and not close_p:
                continue
        else:
            # jodi/sangam need both
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
                "created_at": now_iso(),
            })
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": bid["user_id"],
                "title": "Congratulations! You won 🎉",
                "body": f"Your bid of {bid['amount']} on {bid['game_name']} ({bid['market_name']}) won {win_amount} points.",
                "created_at": now_iso(),
            })
            won += 1
            payout_total += win_amount
        settled += 1
    market.pop("_id", None)
    return {"market": market, "settled": settled, "won": won, "payout_total": payout_total}


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
    await seed_all(db)
    logger.info("M11 CLUBE seed complete.")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
