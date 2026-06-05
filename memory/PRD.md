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
