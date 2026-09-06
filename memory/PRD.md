# Raja Khaiwal (formerly M11 CLUBE) — PRD

## Original Problem Statement
Build a complete, responsive Matka Web Application with a powerful Admin Panel. Deploy to Hostinger Ubuntu VPS at `rajakhaiwal.in` (IP: 187.127.159.199).

**User's preferred language**: Hindi.

## Product Requirements
- Core: Dashboard, Market List, Sidebar Nav, Bottom Nav
- Bidding: Jodi Bet, Haruf (Andar/Bahar), Cross Bet
- Admin: Manage users, 6 markets, declare/reverse results, Jantri, payments, settings, Recently Joined Users
- Payment: IMB Gateway (`api.imbpay.in`)
- Auth: Mobile + password (Signup-first), 1-year token
- Aesthetics: Royal Blue + Gold premium casino theme, NFT-style market cards
- Branding: **RAJA KHAIWAL** (logo: gold crown on royal blue background)

## Tech Stack
- Frontend: React + CRA + Tailwind + shadcn/ui
- Backend: FastAPI + Motor + MongoDB
- Deployment: Hostinger VPS, Nginx, PM2, Certbot SSL, Cloudflare DNS

## Environment Variables (Backend)
- `JWT_SECRET` (required — NOT `SECRET_KEY`)
- `MONGO_URL`, `DB_NAME`
- `PUBLIC_APP_URL`, `CORS_ORIGINS`

## Deployment Status (as of Feb 2026)
- ✅ VPS setup complete on `rajakhaiwal.in`
- ✅ `JWT_SECRET` env var fixed (previously typoed as `SECRET_KEY`)
- ✅ Backend live at `https://rajakhaiwal.in/api/*` — HTTP 200
- ✅ Auth (signup/login) verified working via curl
- ✅ Frontend built & deployed (Emergent badge removed)
- ✅ Full rebrand: M11 CLUBE → RAJA KHAIWAL (all pages + meta tags)
- ✅ Login/Register pages redesigned — Royal Blue + Gold theme with pill toggle, glowing crown logo, Hindi CTA text

## Login/Register Redesign (Feb 2026)
- Dark royal blue radial gradient background with pattern grid + gold glow orb
- Circular Raja Khaiwal logo with yellow ring + gold shadow glow
- Brand title "RAJA KHAIWAL" + "ROYAL" pill + "Official Gaming & Bidding Network" tagline pill
- Pill toggle tabs: LOGIN / REGISTRATION (gold gradient active)
- Dark glass-morphism card with 4 rounded pill inputs (gold icons, dark bg, yellow focus)
- Gold gradient CTA buttons with drop-shadow glow
- Hindi footer: "खाता नहीं है? नया अकाउंट बनाएं" / "पहले से खाता है? लॉगिन करें"
- Green "Contact 24/7 Helpline" pill with pulse dot

## Files of Reference
- `/app/frontend/public/brand/raja-khaiwal-logo.png` — brand logo
- `/app/frontend/src/pages/Login.jsx` — redesigned auth
- `/app/frontend/src/pages/Register.jsx` — redesigned auth
- `/app/frontend/src/components/layout/MobileLayout.jsx` — header + drawer
- `/app/backend/server.py` — reads `JWT_SECRET` from env
- `/app/backend/seed.py` — market + admin seed

## Test Credentials
- Admin: `admin@m11clube.com` / `Vikram@2675` (VPS) or `admin123` (default seed)
- User: `7777777777` / `1234` OR `9999999911` / `1234`

## Backlog / Future
- APK source (Kotlin) URL update to `rajakhaiwal.in`
- Update admin email to `admin@rajakhaiwal.in`
- Update UPI payee name from "M11 CLUBE" → "Raja Khaiwal" in seed.py (currently frontend rebranded but backend seed still has old name for QR gen)
- Cleanup monolithic deployment scripts

## Known Recurring Fixes
- **502 on VPS after fresh deploy**: Always check `.env` has `JWT_SECRET=` (not `SECRET_KEY=`). Fix with:
  ```
  sed -i 's/^SECRET_KEY=/JWT_SECRET=/' /var/www/m11clube/backend/.env && pm2 restart m11-api --update-env
  ```
