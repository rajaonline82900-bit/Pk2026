from fastapi import FastAPI, APIRouter, HTTPException, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date
import random
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================
class SendOTPRequest(BaseModel):
    mobile: str

class VerifyOTPRequest(BaseModel):
    mobile: str
    otp: str

class AuthResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[str] = None
    mobile: Optional[str] = None
    name: Optional[str] = None

class Market(BaseModel):
    id: str
    name: str
    name_hindi: str
    open_time: str
    close_time: str
    is_active: bool = True

class Result(BaseModel):
    id: Optional[str] = None
    market_id: str
    market_name: str
    market_name_hindi: str
    date: str
    opening: Optional[str] = None
    closing: Optional[str] = None
    jodi: Optional[str] = None
    created_at: str

class GenerateResultRequest(BaseModel):
    market_id: str

class UpdateResultRequest(BaseModel):
    market_id: str
    opening: Optional[str] = None
    closing: Optional[str] = None
    jodi: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================
def generate_random_number(digits=2):
    """Generate random number with specified digits"""
    return str(random.randint(10**(digits-1), 10**digits - 1))

def generate_jodi():
    """Generate random jodi (2 digit number)"""
    return str(random.randint(10, 99))

async def init_markets():
    """Initialize default markets if not exists"""
    markets_data = [
        {"_id": "delhi", "name": "Delhi Bazaar", "name_hindi": "दिल्ली बाजार", "open_time": "10:00 AM", "close_time": "11:00 AM", "is_active": True},
        {"_id": "shriganesh", "name": "Shri Ganesh", "name_hindi": "श्रीगणेश", "open_time": "01:15 PM", "close_time": "02:45 PM", "is_active": True},
        {"_id": "faridabad", "name": "Faridabad", "name_hindi": "फरीदाबाद", "open_time": "04:00 PM", "close_time": "06:00 PM", "is_active": True},
        {"_id": "ghaziabad", "name": "Ghaziabad", "name_hindi": "गाजियाबाद", "open_time": "06:30 PM", "close_time": "08:30 PM", "is_active": True},
        {"_id": "kali", "name": "Kali", "name_hindi": "काली", "open_time": "09:00 PM", "close_time": "11:00 PM", "is_active": True},
        {"_id": "dishawar", "name": "Dishawar", "name_hindi": "दिशावर", "open_time": "05:00 AM", "close_time": "06:00 AM", "is_active": True},
    ]
    
    for market in markets_data:
        existing = await db.markets.find_one({"_id": market["_id"]})
        if not existing:
            await db.markets.insert_one(market)
            logger.info(f"Initialized market: {market['name']}")

# ==================== AUTH ENDPOINTS ====================
@api_router.post("/auth/send-otp", response_model=AuthResponse)
async def send_otp(request: SendOTPRequest):
    """
    Send OTP to mobile number (Demo: Always returns success)
    In production, integrate with SMS gateway
    """
    mobile = request.mobile.strip()
    
    if len(mobile) < 10:
        raise HTTPException(status_code=400, detail="Invalid mobile number")
    
    # For demo purposes, we'll use a fixed OTP: 123456
    # In production, generate random OTP and send via SMS
    demo_otp = "123456"
    
    # Store OTP in database (optional for demo)
    await db.otp_records.update_one(
        {"mobile": mobile},
        {"$set": {"mobile": mobile, "otp": demo_otp, "created_at": datetime.utcnow().isoformat()}},
        upsert=True
    )
    
    return AuthResponse(
        success=True,
        message=f"OTP sent successfully. Demo OTP: {demo_otp}"
    )

@api_router.post("/auth/verify-otp", response_model=AuthResponse)
async def verify_otp(request: VerifyOTPRequest):
    """
    Verify OTP and login user
    """
    mobile = request.mobile.strip()
    otp = request.otp.strip()
    
    # For demo, accept OTP: 123456
    if otp != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Find or create user
    user = await db.users.find_one({"mobile": mobile})
    
    if not user:
        # Create new user
        user = {
            "mobile": mobile,
            "name": f"User {mobile[-4:]}",
            "created_at": datetime.utcnow().isoformat(),
            "last_login": datetime.utcnow().isoformat()
        }
        result = await db.users.insert_one(user)
        user["_id"] = result.inserted_id
    else:
        # Update last login
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.utcnow().isoformat()}}
        )
    
    return AuthResponse(
        success=True,
        message="Login successful",
        user_id=str(user["_id"]),
        mobile=user["mobile"],
        name=user.get("name", "User")
    )

# ==================== MARKET ENDPOINTS ====================
@api_router.get("/markets", response_model=List[Market])
async def get_markets():
    """
    Get all markets
    """
    markets = await db.markets.find({"is_active": True}).to_list(100)
    return [
        Market(
            id=str(m["_id"]),
            name=m["name"],
            name_hindi=m["name_hindi"],
            open_time=m["open_time"],
            close_time=m["close_time"],
            is_active=m.get("is_active", True)
        )
        for m in markets
    ]

# ==================== RESULT ENDPOINTS ====================
@api_router.get("/results/latest", response_model=List[Result])
async def get_latest_results():
    """
    Get latest results for all markets (today's date)
    """
    today = date.today().isoformat()
    results = []
    
    markets = await db.markets.find({"is_active": True}).to_list(100)
    
    for market in markets:
        result = await db.results.find_one(
            {"market_id": str(market["_id"]), "date": today},
            sort=[("created_at", -1)]
        )
        
        if result:
            results.append(Result(
                id=str(result["_id"]),
                market_id=result["market_id"],
                market_name=market["name"],
                market_name_hindi=market["name_hindi"],
                date=result["date"],
                opening=result.get("opening"),
                closing=result.get("closing"),
                jodi=result.get("jodi"),
                created_at=result["created_at"]
            ))
        else:
            # Return empty result for markets without data
            results.append(Result(
                market_id=str(market["_id"]),
                market_name=market["name"],
                market_name_hindi=market["name_hindi"],
                date=today,
                created_at=datetime.utcnow().isoformat()
            ))
    
    return results

@api_router.get("/results/history")
async def get_results_history(market_id: str, limit: int = 30):
    """
    Get historical results for a specific market
    """
    market = await db.markets.find_one({"_id": market_id})
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    
    results = await db.results.find(
        {"market_id": market_id}
    ).sort("date", -1).limit(limit).to_list(limit)
    
    return [
        Result(
            id=str(r["_id"]),
            market_id=r["market_id"],
            market_name=market["name"],
            market_name_hindi=market["name_hindi"],
            date=r["date"],
            opening=r.get("opening"),
            closing=r.get("closing"),
            jodi=r.get("jodi"),
            created_at=r["created_at"]
        )
        for r in results
    ]

@api_router.post("/admin/generate-result")
async def generate_result(request: GenerateResultRequest):
    """
    Generate random result for a market (Admin function)
    """
    market = await db.markets.find_one({"_id": request.market_id})
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    
    today = date.today().isoformat()
    
    # Generate random numbers
    opening = generate_random_number(2)
    closing = generate_random_number(2)
    jodi = generate_jodi()
    
    result = {
        "market_id": request.market_id,
        "date": today,
        "opening": opening,
        "closing": closing,
        "jodi": jodi,
        "created_at": datetime.utcnow().isoformat()
    }
    
    # Update if exists, insert if not
    await db.results.update_one(
        {"market_id": request.market_id, "date": today},
        {"$set": result},
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Result generated successfully",
        "result": result
    }

@api_router.post("/admin/update-result")
async def update_result(request: UpdateResultRequest):
    """
    Manually update result for a market (Admin function)
    """
    market = await db.markets.find_one({"_id": request.market_id})
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    
    today = date.today().isoformat()
    
    update_data = {"market_id": request.market_id, "date": today}
    
    if request.opening:
        update_data["opening"] = request.opening
    if request.closing:
        update_data["closing"] = request.closing
    if request.jodi:
        update_data["jodi"] = request.jodi
    
    update_data["created_at"] = datetime.utcnow().isoformat()
    
    await db.results.update_one(
        {"market_id": request.market_id, "date": today},
        {"$set": update_data},
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Result updated successfully"
    }

# ==================== UTILITY ENDPOINT ====================
@api_router.post("/admin/generate-all-results")
async def generate_all_results():
    """
    Generate random results for all markets (Quick demo setup)
    """
    markets = await db.markets.find({"is_active": True}).to_list(100)
    today = date.today().isoformat()
    
    for market in markets:
        opening = generate_random_number(2)
        closing = generate_random_number(2)
        jodi = generate_jodi()
        
        result = {
            "market_id": str(market["_id"]),
            "date": today,
            "opening": opening,
            "closing": closing,
            "jodi": jodi,
            "created_at": datetime.utcnow().isoformat()
        }
        
        await db.results.update_one(
            {"market_id": str(market["_id"]), "date": today},
            {"$set": result},
            upsert=True
        )
    
    return {
        "success": True,
        "message": f"Generated results for {len(markets)} markets"
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await init_markets()
    logger.info("FastAPI server started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
