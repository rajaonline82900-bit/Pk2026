# M11 CLUBE — Product Requirements Document

## Original Problem Statement
Build a complete, responsive Matka web application named **M11 CLUBE** with a full-featured Admin Panel. The platform supports 22+ Matka game variants, mobile-first UI with bottom navigation + sidebar drawer, and an end-to-end flow from market browsing → bidding → result declaration → automatic payout.

> User opted for the Emergent platform stack (React + FastAPI + MongoDB) instead of PHP/MySQL/Hostinger; deployment to Hostinger would require a backend re-write.

## Architecture
- **Backend**: FastAPI (port 8001), MongoDB via Motor, JWT auth (Bearer tokens), bcrypt MPIN hashing.
- **Frontend**: React 19 + React Router 7, Tailwind + Shadcn UI, Outfit + DM Sans typography, brand orange `#FF7A00` on white.
- **Auth**: User (mobile + 4-digit MPIN), Admin (email + password) — same `users` collection with `role` field.

## User Personas
1. **End user (player)** — browses live markets, places bids on 22 game types via mobile-first UI, manages wallet (deposit/withdraw), views passbook & bid history.
2. **Admin** — manages markets, declares results (auto-settles all pending bids + credits winners + sends notifications), approves payments, adjusts user wallets, broadcasts notices.

## Core Requirements (Static)
- Mobile + MPIN auth for users, Email + Password for admin
- Live market list with open/close timings, live results in `OPEN-JODI-CLOSE` format, dynamic Play/Closed buttons
- 22 game types with correct payout multipliers (Single Digit 9.5×, Jodi 95×, Single Pana 150×, Double Pana 300×, Triple Pana 800×, Half Sangam 1500×, Full Sangam 8000×, etc.)
- Bet Slip with session selection, multi-bid support, total preview
- Wallet & passbook with all transaction types (deposit/withdraw/bid/win/bonus/admin_adjust)
- Admin: market CRUD, result declaration (auto-settles via `evaluate_bid`), user block/credit, payment approval, settings (UPI, notice, game rates), broadcast notifications

## Implemented (2026-02-05)
- ✅ Full user auth flow (register, login, MPIN management) — JWT + bcrypt
- ✅ Mobile-first user app: Dashboard, Market list (12 seeded markets), Market detail, GameScreen (handles all 22 game types via input-type config), MyBids, Passbook, Funds (deposit/withdraw), Notifications, MPIN, Notice/Rules, Game Rates, Charts, Tutorials, Idea, Settings, Share, Support
- ✅ Sidebar drawer + 5-tab bottom navigation (right-inset to clear Emergent badge)
- ✅ Admin panel: Dashboard stats, Markets CRUD with dialog, Results declaration with auto-settlement, Users management (search/block/wallet adjust), Payments (approve/reject deposits & withdrawals), All Bids viewer, Settings (contact/UPI/rates/notice/broadcast)
- ✅ Bid placement → result declaration → auto-settlement → wallet credit → notification (end-to-end win flow tested 23/23 pytest)
- ✅ Seeded admin (`admin@m11clube.com / admin123`) + test user (`9999999999 / 1234`, 1000 pts)

## Test Coverage
- 23/23 backend pytest tests pass (auth, public catalog, bids, wallet, admin CRUD, end-to-end win flow)
- Frontend smoke tested via Playwright (login, dashboard, bottom-nav all tabs)

## Prioritized Backlog
### P1
- Real payment gateway (Razorpay / Stripe) instead of manual UPI/UTR
- Live Starline/Jackpot hourly markets (currently "coming soon" placeholder)
- Push notifications (FCM) + email/SMS for big wins
- Result history charts (panel chart, jodi chart)

### P2
- Video tutorials section (currently placeholder)
- Referral program with multi-level bonus tracking
- KYC verification flow for withdrawals
- Admin: bulk result import, scheduled result declaration
- Two-factor auth for admin

### P3
- Native mobile apps (React Native) sharing the same API
- Analytics dashboard (DAU, retention, ARPU)
- A/B testing for promo banners

## Files of Interest
- `/app/backend/server.py` — all API routes
- `/app/backend/game_logic.py` — game catalog + payout evaluation
- `/app/backend/seed.py` — seeds admin, test user, markets, settings
- `/app/frontend/src/App.js` — route map
- `/app/frontend/src/lib/auth.jsx` — AuthProvider (user + admin)
- `/app/frontend/src/pages/*` — user app pages
- `/app/frontend/src/pages/admin/*` — admin panel pages
- `/app/memory/test_credentials.md` — admin & test user credentials

## Phase 2 — User Feedback (2026-02-05)
- ✅ Admin user-row clickable → new `/admin/users/:id` detail page with stat cards + 4 tabs (Bids / Deposits / Withdrawals / All Transactions), Adjust Wallet + Block actions
- ✅ Dashboard top: poster carousel (auto-rotate, admin-editable up to 5 posters) + 4 round quick-action icons (Deposit / Withdraw / Telegram / WhatsApp)
- ✅ Withdrawal supports BOTH **UPI** and **Bank Transfer** (holder name, bank name, account#, IFSC)
- ✅ Withdrawal time-window (admin sets open/close IST times — out-of-window requests rejected)
- ✅ Admin payments page: status filter chips (Pending / Approved / Rejected), Copy buttons for UPI ID / mobile / bank fields, structured display of bank details, Approve / Reject inline with optional note
- ✅ Date-aware results — new `results` collection keyed by (market_id, date); each new day starts fresh; reverse-result endpoint refunds wallet credits + resets bids to pending + sends notifications
- ✅ Result API URL hook + Fetch From API button (admin can wire their own provider)
- ✅ Emergent platform badge hidden site-wide via CSS
- ✅ Market detail page now shows 22 game cards with colored gradient Lucide icons
- ✅ Backend test suite expanded to 32/32 passing (9 new tests for Phase 2 features)

### Known minor gaps
- Auto-Result-Fetch returns a stub 501 until user provides their own API URL
- Posters: admin can add/remove URLs but no built-in upload (paste URL only)


## Phase 3 (2026-02-05)
- ✅ MPIN → Password (4+ chars). Backend accepts both `password` (new) and `mpin` (legacy) for backward compat. Existing users auto-migrated on next login.
- ✅ Auto-login after Register; **1-year JWT** (effectively no auto-logout)
- ✅ Forgot Password via OTP — `POST /auth/forgot-otp` returns demo OTP when SMS provider not configured, real SMS when admin wires their gateway
- ✅ Admin Settings → **SMS / OTP Provider** config: URL, API key, GET/POST, sender ID, payload template with `{mobile} {message} {api_key} {sender}` placeholders
- ✅ **UPI Intent** deposits: 5 app buttons (PhonePe / GPay / Paytm / BHIM / Any UPI) that open the chosen app pre-filled with amount + merchant info via `upi://pay?…` deep links
- ✅ Quick-amount chips: 100 / 200 / 500 / 1K / 10K / 20K / 50K on deposit + withdraw
- ✅ Removed King Starline / King Jackpot tiles
- ✅ WhatsApp icon now uses authentic SVG glyph; admin can set country code separately
- ✅ Telegram channel URL in admin settings, linked from home quick-icon
- ✅ Quick icons split: Deposit → /funds?tab=deposit, Withdraw → /funds?tab=withdraw (each opens the right tab)
- ✅ GameScreen **sticky Place Bids bar** with running total + bid count
- ✅ Settings page **Language switcher** (English / Hindi / Punjabi / Urdu) with RTL for Urdu
- ✅ Admin Settings **poster file upload** (base64, max 3MB) — tap the thumbnail to upload from device
- ✅ Backend tests: 49/49 passing (32 legacy + 17 new for Phase 3)
