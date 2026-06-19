# M11 CLUBE — Product Requirements (v2 — Simplified Game System)

## Original Problem Statement
Build "M11 CLUBE" — a Matka web app with Admin Panel, IMB Payment Gateway,
multi-language support, and Hostinger VPS deployment.

## ✅ COMPLETED

### Phase 1 — Initial Build (early Feb 2026)
- React + FastAPI + MongoDB stack
- Mobile + password auth with OTP
- Admin Panel (Users, Markets, Results, Payments, Settings)
- IMB Payment Gateway integration with overlay scanner
- 4-language i18n (Hindi/English/Punjabi/Urdu)
- Hostinger VPS deployment script (`/app/deploy.sh`)
- HTTPS via Let's Encrypt SSL
- Live at **https://m11cloube.com** (Hostinger VPS 69.62.73.188)

### Phase 2 — Game System Redesign (Feb 19, 2026)
**User requested**: Remove ALL old game types, keep only 3:

1. **Jodi Bet (00-99)** — Rate 1:100 (₹10 → ₹1000)
   - Multiple numbers selectable, different amounts per number
   - Grid UI: 5 cols × 20 rows, ₹ input per cell

2. **Haruf** — Rate 1:10 (₹100 → ₹1000)
   - Andar = last digit of result (0-9)
   - Bahar = first digit of result (0-9)
   - Both sides bettable in same submission

3. **Cross Bet** — Rate 1:100 (per generated jodi)
   - User selects multiple digits (e.g., 1, 2, 3)
   - Auto-generates: 11, 12, 13, 21, 22, 23, 31, 32, 33 (includes pairs)
   - Single amount × N jodis = total

**Result entry simplified**: Admin enters 2-digit jodi (e.g., "37").
Backward-compat with legacy 3-digit panas retained in game_logic.

### Phase 2 — Admin Panel Additions
- **AdminResults** simplified: single 2-digit jodi input per market
- **AdminJantri** (new): JANTRI BET Report
  - 10x10 grid for jodi/cross_bet (00-99)
  - 1x10 grid for haruf_andar / haruf_bahar (0-9)
  - Top-5 highest-risk numbers
  - Filters: market + date + game type
  - Endpoint: `GET /api/admin/jantri-report?market_id=&date=&game_type=`

### Phase 2 — UI Redesign (Raj Shree style)
- Teal/green header (`#0f7a6a`) + orange accents
- 4 circular action buttons: Withdraw, Add Money, Help (WhatsApp), Telegram
- Orange "How to Play" banner
- Teal "Fast Result" header
- Market cards: Old/New jodi result boxes + green PLAY button
- Open/Close times displayed
- Bottom nav: My Bids | Passbook | Home | Funds | Game Rate
- Sidebar drawer: Home, My Profile, Withdraw, Bid/Trx/Win History, Market Rate, Help, Share, Change Password, Logout

### Phase 2 — Default Markets Updated
- DESAWAR (06:00 → 04:00, overnight)
- DELHI BAZAR (06:00 → 15:00)
- SHREE GANESH (06:00 → 16:35)
- FARIDABAD (06:00 → 18:00)
- GHAZIABAD (06:00 → 20:30)
- GALI (06:00 → 23:30)

Overnight market timing logic added in `_market_open_status`.

### Phase 2 — Blank Page Fix
- Removed `<script src="https://assets.emergent.sh/scripts/emergent-main.js"></script>`
- Removed defensive Object.defineProperty title-locking script
- These were blocking React mount on VPS deployment

## Key Files

### Backend
- `backend/server.py` — FastAPI routes
- `backend/game_logic.py` — 3 game types + evaluate_bid
- `backend/seed.py` — Default markets + admin seed
- `backend/.env` — MongoDB + JWT + IMB credentials

### Frontend
- `frontend/src/App.js` — Routes (replaced GameScreen with 3 pages)
- `frontend/src/pages/Dashboard.jsx` — Raj Shree style
- `frontend/src/pages/MarketDetail.jsx` — 3 game type cards
- `frontend/src/pages/games/JodiBetPage.jsx`
- `frontend/src/pages/games/HarufPage.jsx`
- `frontend/src/pages/games/CrossBetPage.jsx`
- `frontend/src/pages/admin/AdminResults.jsx`
- `frontend/src/pages/admin/AdminJantri.jsx` (new)
- `frontend/src/components/layout/MobileLayout.jsx` (teal redesign)
- `frontend/src/components/layout/AdminLayout.jsx` (+Jantri nav item)
- `frontend/public/index.html` (defensive scripts removed)

### Deployment
- `/app/deploy.sh` — VPS one-shot installer
- VPS: Hostinger Ubuntu 24.04, IP 69.62.73.188
- Domain: m11cloube.com (Let's Encrypt SSL)

## Test Credentials
See `/app/memory/test_credentials.md`

## Verified API Flows (curl)
- Place 5 bids (mixed game types) → 5 settled, 4 won, ₹8500 paid
- JANTRI report: aggregates by number, top-5 risk view
- Market 'closed' for overnight markets fixed

## P0 / P1 / P2 Backlog
- **P1**: Redeploy to VPS m11cloube.com (push GitHub → run `bash /tmp/deploy.sh`)
- **P1**: Update IMB Partner Dashboard webhook URL to `https://m11cloube.com/api/webhooks/imb`
- **P2**: Switch IMB from STAGE to LIVE endpoint when ready for real payments
- **P2**: Telegram bot notifications (deposit/result alerts to admin)
- **P2**: Android APK wrapper with UPI intent
- **P3**: IMB integration via `integration_playbook_expert_v2` (proper compliance)
