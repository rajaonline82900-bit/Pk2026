# Raja Khaiwal — PRD

## Product
Full-stack Matka betting web + APK. Royal Blue + Gold theme. Hindi-first users. Live deployment: `rajakhaiwal.in` (Hostinger VPS 187.127.159.199).

## Core Features
- Dashboard with 5–6 live markets, NFT-style cards, gold spinning PLAY button, Chart badge
- Bidding: Jodi, Haruf (Andar/Bahar), Cross Bet
- Wallet: Deposit (IMB gateway) + Withdraw (UPI request → admin approve)
- Admin panel: Users, Markets, Results (declare + reverse), Jantri, Payments, Settings, Tutorial Videos, Deposit Bonus, Winners showcase
- Referral system + 24/7 helpline (WhatsApp)
- Static pages: How to Play, How to Deposit, How to Withdraw — with inline video tutorials
- SPA + PM2 + Nginx + Certbot SSL

## Tech Stack
- Frontend: React + CRA + Tailwind + shadcn/ui
- Backend: FastAPI + Motor + MongoDB (Python 3.11 env)
- Payment: IMB Gateway (`api.imbpay.in`), auto-credit via webhook
- Deployment: Ubuntu VPS + PM2 + Nginx

## Environment (Backend .env)
- `JWT_SECRET` (required)
- `MONGO_URL`, `DB_NAME`
- `ADMIN_EMAIL=rajakhaiwal@85`, `ADMIN_PASSWORD=rajakhaiwal@85`
- `PUBLIC_APP_URL=https://rajakhaiwal.in`
- `CORS_ORIGINS=https://rajakhaiwal.in,https://www.rajakhaiwal.in`

## Recent Changelog (Feb 2026)
### Session — Deposit Flow + Videos + Admin Rebrand
- ✅ Fixed icon labels (Deposit/Withdrawal/Telegram/WhatsApp) — now white on dark bg
- ✅ Chart button z-index + stopPropagation — opens result history sheet reliably
- ✅ "How to Play" now renders **inline video player** (YouTube iframe / MP4 `<video>`) instead of opening new tab — 3 topics: Play, Deposit, Withdraw
- ✅ **Deposit page redesigned**:
  - Royal Blue + Gold wallet balance card at top
  - "How to Deposit" video card with WATCH toggle
  - Quick amounts: 300, 500, 1000, 2000, 5000, 10000
  - Minimum deposit enforced at ₹300 (both frontend + backend)
  - `+5%` bonus badge on 2000/5000/10000 buttons
  - Live bonus banner + "Bonus applied!" strip when eligible
  - CTA shows `PROCEED TO PAY ₹2000 (+₹100)` with bonus
- ✅ **Deposit bonus logic (backend)**:
  - Settings: `deposit_bonus_percent` (default 5), `deposit_bonus_threshold` (default 2000)
  - Helper `_apply_deposit_bonus()` credits wallet + creates `deposit_bonus` txn
  - Wired into BOTH paths: manual admin approve + IMB auto-credit
- ✅ **Admin Settings — Video URL + Upload**:
  - "Tutorial Videos" card with URL field for each of Play/Deposit/Withdraw
  - Inline **file upload** button (≤25MB, uses `/api/admin/upload`)
  - New `GET /api/files/{id}/raw` endpoint streams raw bytes with proper Content-Type
  - Upload size limit raised from ~3MB → ~25MB
- ✅ **Admin login**: username changed to `rajakhaiwal@85` / `rajakhaiwal@85` (AdminLogin input is now `type="text"` — accepts non-email usernames)
- ✅ **Deposit Bonus admin card**: threshold + percent configurable with live example calculation
- ✅ **Seed auto-updates**: legacy `min_deposit < 300` gets patched to 300 on boot; admin password re-hashed on every restart

## Files of Reference
- `/app/backend/server.py` — SettingsIn (206–237), _apply_deposit_bonus (~1619), get_file_raw (~1457), admin_upload 25MB (~1430), min_deposit=300 checks (775, 1500)
- `/app/backend/seed.py` — admin creds sync + settings defaults
- `/app/frontend/src/pages/Login.jsx`, `Register.jsx` — royal blue + gold theme
- `/app/frontend/src/pages/Dashboard.jsx` — icon fix, chart button, VideoPlayer/VideoSection
- `/app/frontend/src/pages/DepositPage.jsx` — new quick amounts, bonus banner, video card
- `/app/frontend/src/pages/admin/AdminSettings.jsx` — VideoField + Deposit Bonus card

## Backend Test Verification (Self-tested this session)
- ✅ Admin login `rajakhaiwal@85` → 185-char JWT returned
- ✅ Settings shows `min_deposit=300, bonus%=5, threshold=2000`
- ✅ PATCH settings persists `youtube_how_to_play` + bonus fields
- ✅ Deposit of ₹99 rejected with `Minimum deposit is 300 points`
- ✅ File upload → raw endpoint returns `HTTP 200 | Content-Type: image/png | 68 bytes`
- ✅ Approve deposit ₹2000 → wallet 5210 → 7310 (2000 base + 100 bonus) + `deposit_bonus` txn record created

## Known Recurring Fixes
- **502 on VPS after fresh deploy**: check `.env` has `JWT_SECRET=` (not `SECRET_KEY=`):
  ```
  sed -i 's/^SECRET_KEY=/JWT_SECRET=/' /var/www/m11clube/backend/.env && pm2 restart m11-api --update-env
  ```

## Backlog / P1
- Refactor 1800-line `server.py` into modules (routes/auth, /wallet, /admin, /markets)
- Real object storage for video uploads (currently base64 in Mongo — fine ≤25MB, but bloats DB)
- APK source (Kotlin) URL update to `rajakhaiwal.in` — user needs new zip
- Add auto-brute-force lockout for admin login
- Real-time result push via WebSocket (currently poll every 30s)

## Backlog / P2
- Passbook: filter by transaction type (`deposit_bonus` chip filter)
- Admin: bulk market close at midnight cron
- SMS OTP as optional 2FA
