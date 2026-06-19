# M11 CLUBE — Product Requirements & Deployment Status

## Original Problem Statement
Build a complete, responsive Matka Web Application "M11 CLUBE" with Admin Panel,
multi-language support (Hindi/English/Punjabi/Urdu), bidding engine, IMB Payment Gateway,
and full VPS deployment on Hostinger Ubuntu 24.04.

## ✅ COMPLETED (as of Feb 6, 2026)

### Core App Features
- React + FastAPI + MongoDB full-stack
- Mobile + password authentication with OTP
- Matka bidding engine: Single Digit, Jodi, Pana, Sangam
- Markets, Results, Reverse Results
- Admin Panel: Users, Markets, Results, Payments, Settings
- 4-language i18n (Hindi/English/Punjabi/Urdu)
- IMB Payment Gateway with custom Hindi warning overlay
- UPI intent links for Android wrapper
- All Emergent branding scrubbed
- Wallet, deposits, withdrawals

### Deployment (Feb 6, 2026)
- **Live URL**: https://m11cloube.com (and www.m11cloube.com)
- **VPS**: Hostinger Ubuntu 24.04, IP 69.62.73.188
- **Stack**: Nginx + PM2 + MongoDB 7 + Python 3.11 + Node.js 20
- **SSL**: Let's Encrypt certificate (auto-renewal)
- **Code repo**: github.com/rajaonline82900-bit/Pk2026 (branch: conflict_060626_1334)
- **Deploy script**: `/app/deploy.sh` (idempotent, one-command deploy)

### Key Files
- `/app/deploy.sh` — Production VPS deployment automation
- `/app/backend/server.py` — FastAPI core
- `/app/backend/seed.py` — Initial DB seeding (admin, settings, IMB token)
- `/app/frontend/src/pages/DepositPage.jsx` — IMB scanner overlay
- `/app/frontend/public/index.html` — Defensive anti-branding scripts

### Test Credentials
- Admin: `admin@m11clube.com` / `admin123`
- User: Mobile `9999999999` / Password `1234`

## 🟡 Pending / Future Tasks

- Update IMB Partner Dashboard webhook URL to `https://m11cloube.com/api/webhooks/imb`
- Switch IMB from STAGE (`secure-stage.imb.org.in`) to LIVE endpoint when ready
- "Continue Playing" CTA after successful deposit (P2)
- Telegram bot notifications for admin (deposit/result events)
- Mobile app wrapper (Android APK with UPI intent)

## Tech Stack
- Frontend: React 18 (CRA build), Tailwind, Shadcn/UI
- Backend: FastAPI, motor (async MongoDB), bcrypt, JWT
- Database: MongoDB 7
- Hosting: Hostinger VPS (Ubuntu 24.04)
- Reverse Proxy: Nginx
- Process Manager: PM2 (--interpreter none for Python uvicorn)
- SSL: Let's Encrypt via Certbot (--nginx plugin)

## Deployment Architecture
```
[Internet]
   |
   ▼ HTTPS (443)
[Nginx] — m11cloube.com / www.m11cloube.com
   ├── /api/  →  PM2 → uvicorn → FastAPI :8001
   └── /*     →  /var/www/m11/frontend/build (React)
                              |
                              ▼
                       [MongoDB :27017]
```

## Critical Deployment Lessons (for future agents)
1. Ubuntu 24.04 ships Python 3.12 — but `emergentintegrations==0.2.0` needs Python ≤3.11.
   Install Python 3.11 via deadsnakes PPA.
2. PM2 + Python: Must use `--interpreter none` flag or PM2 tries to run with Node.
3. emergentintegrations: install with `--extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/`
4. Frontend build needs `NODE_OPTIONS="--max-old-space-size=1536"` on low-RAM VPS.
5. Defensive anti-Emergent scripts in `index.html` can break React mount — strip them from `build/index.html` post-build.
6. Nginx must serve from `/var/www/...` not `/root/...` (root inaccessible to nginx user).
7. MongoDB settings collection seeded only on FIRST run — manually `db.settings.updateOne` for IMB token if missing.

## Useful Commands
```bash
# VPS Maintenance
pm2 status
pm2 logs m11-api --lines 50
systemctl reload nginx
certbot renew --dry-run

# Update deployed code
cd /var/www/m11 && git pull && cd frontend && \
  NODE_OPTIONS="--max-old-space-size=1536" yarn build && \
  systemctl reload nginx && pm2 restart m11-api
```
