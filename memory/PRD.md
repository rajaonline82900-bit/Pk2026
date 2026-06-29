# M11 CLUBE — Product Requirements (v3 — Pro Features)

## Original Problem Statement
Build "M11 CLUBE" — a Matka web app with Admin Panel, IMB Payment Gateway,
multi-language support, and Hostinger VPS deployment.

## ✅ COMPLETED

### Phase 1 — Initial Build
- React + FastAPI + MongoDB stack with mobile+password auth
- IMB Payment Gateway with overlay scanner
- Hostinger VPS deployed at https://m11cloube.com

### Phase 2 — Game Redesign (Feb 19)
- Removed all old game types
- 3 new games: Jodi (1:100), Haruf (1:10), Cross Bet (1:100)
- Admin: simplified result entry + new JANTRI Report
- Raj Shree style UI

### Phase 3 — Pro Features (Feb 19, continued)
- **Haruf Andar/Bahar SWAPPED**: Andar = pehla digit, Bahar = doosra digit (jodi 12 → Andar=1, Bahar=2)
- **How to Play modal**: 3 options (Play/Deposit/Withdraw) opens YouTube videos
- **Admin YouTube link inputs** in Settings → Tutorial Videos card
- **Refer & Earn** page: code generation, 10% first-deposit bonus, WhatsApp share, stats
- **Result History modal** on market chart icon click
- **TIME OUT** red gradient button (replaces "Closed" text)
- **Cross Bet** mode toggle: With Jodi (incl. 11,22,33) / Jod Cut (no pairs)
- **Admin Result by date**: date picker, declare for any past date
- **Admin Reverse Result**: now date-aware (already worked)
- **Colorful gradient UI**: Pink/teal/sky/orange action buttons, gradient market cards, gradient banners

### Phase 4 — UI Pulse (Feb 26)
- **Bottom Nav**: "Fund" → **Refer & Earn** icon
- **Top 4 Brand Actions**: Real-brand icons — Deposit (₹+ green), Withdrawal (₹↓ rose), Telegram (official paper-plane sky-blue #229ED9), WhatsApp (official glyph green #25D366)
- **Live Countdown Timer** above PLAY on every active market card: "CLOSES IN HH:MM:SS" — IST-aware, handles overnight markets (e.g. DESAWAR close 04:00 AM next day), updates every 1s


### Backend APIs added
- `GET /api/users/me/referral` — returns code + stats
- `GET /api/markets/{id}/result-history` — last 60 results (public)
- `POST /api/admin/markets/{id}/result` — now accepts `date` field
- `POST /api/auth/register` — now accepts `referral_code`
- IMB webhook → auto-credits referrer 10% on first deposit (idempotent)

### Frontend pages created/updated
- `pages/Dashboard.jsx` — gradient buttons, How-to-Play modal, chart icon → history modal, TIME OUT button
- `pages/ReferEarn.jsx` (new) — full refer & earn page
- `pages/Register.jsx` — `?ref=CODE` param + referral code input
- `pages/games/HarufPage.jsx` — Andar/Bahar swapped, colorful gradient headers
- `pages/games/CrossBetPage.jsx` — With Jodi / Jod Cut toggle
- `pages/admin/AdminResults.jsx` — date picker
- `pages/admin/AdminJantri.jsx` — JANTRI Report (Phase 2)
- `pages/admin/AdminSettings.jsx` — YouTube + Referral % cards
- `components/layout/MobileLayout.jsx` — drawer: "Refer & Earn"

### Backend files
- `server.py` — referral logic, result-history, date-aware result declaration, Haruf swap
- `game_logic.py` — Haruf swapped, docstring updated
- `seed.py` — new settings keys (youtube_*, referral_*)

## Test Credentials
See `/app/memory/test_credentials.md`

## Verified flows
- 5-bid mixed test → ₹8500 paid out correctly (math verified)
- Haruf logic: jodi 12 → haruf_andar=1 ✓, haruf_andar=2 ✗, haruf_bahar=2 ✓ (curl test)
- Referral code generation working (`M1111CDAF` example)
- Result history endpoint returns array
- Frontend screenshots verified: Dashboard, MarketDetail, Jodi grid, Haruf w/ swap, Refer & Earn page

## P0 / P1 / P2 Backlog
- **P1**: Push to GitHub + VPS redeploy
- **P1**: Admin sets YouTube links in `/admin/settings`
- **P1**: Admin sets IMB webhook URL to `https://m11cloube.com/api/webhooks/imb`
- **P2**: Custom game types add/delete via admin (currently 3 hardcoded — can extend)
- **P2**: Translation strings for new pages (Refer & Earn, How to Play)
- **P2**: Telegram bot notifications
- **P3**: Switch IMB STAGE → LIVE
