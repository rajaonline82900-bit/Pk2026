#!/usr/bin/env bash
# =============================================================
# M11 CLUBE - One-Shot Hostinger VPS Deployment Script
# Target OS: Ubuntu 22.04 LTS (recommended) / 20.04
# Stack:    React (build) + FastAPI (PM2) + MongoDB 7 + Nginx
# =============================================================
# Usage (run as root on a FRESH or existing VPS):
#   curl -fsSL https://raw.githubusercontent.com/rajaonline82900-bit/Pk2026/conflict_060626_1334/deploy.sh -o /tmp/deploy.sh
#   bash /tmp/deploy.sh
# =============================================================
set -euo pipefail

# ---------- CONFIG (change here only if needed) -----------
REPO_URL="https://github.com/rajaonline82900-bit/Pk2026.git"
BRANCH="${BRANCH:-conflict_060626_1334}"
APP_DIR="/var/www/m11"
DOMAIN_OR_IP="${DOMAIN_OR_IP:-69.62.73.188}"
ADMIN_EMAIL="admin@m11clube.com"
ADMIN_PASSWORD="admin123"
IMB_API_KEY="1d5571c42caf9f8a312dd560b97d7ba5"
# ----------------------------------------------------------

log()  { echo -e "\n\033[1;33m==>\033[0m \033[1m$*\033[0m"; }
ok()   { echo -e "   \033[1;32m✓\033[0m $*"; }
fail() { echo -e "\n\033[1;31m✗ ERROR:\033[0m $*"; exit 1; }

[ "$EUID" -eq 0 ] || fail "Please run as root (sudo bash deploy.sh)"

export DEBIAN_FRONTEND=noninteractive

# 1. SYSTEM UPDATE
log "Step 1/10  System update"
apt-get update -y >/dev/null
apt-get install -y curl gnupg lsb-release software-properties-common ca-certificates ufw >/dev/null
ok "Base packages installed"

# 2. SWAP (only if RAM < 2GB and no swap exists)
log "Step 2/10  Configuring swap (helps with frontend build on low-RAM VPS)"
RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
SWAP_MB=$(free -m | awk '/^Swap:/{print $2}')
if [ "$RAM_MB" -lt 2048 ] && [ "$SWAP_MB" -lt 1024 ]; then
  if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    grep -q "/swapfile" /etc/fstab || echo "/swapfile none swap sw 0 0" >> /etc/fstab
    ok "2GB swap file created"
  fi
else
  ok "Sufficient RAM/Swap available — skipping"
fi

# 3. NODE.JS 20
log "Step 3/10  Installing Node.js 20 + Yarn + PM2"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1)" != "v20" ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  apt-get install -y nodejs >/dev/null
fi
npm install -g yarn pm2 >/dev/null
ok "Node $(node -v), Yarn $(yarn -v), PM2 installed"

# 4. PYTHON 3
log "Step 4/10  Installing Python 3 + venv + Nginx + Git"
apt-get install -y python3 python3-venv python3-pip python3-dev build-essential nginx git >/dev/null
ok "Python $(python3 --version | cut -d' ' -f2), Nginx, Git ready"

# 5. MONGODB 7
log "Step 5/10  Installing MongoDB 7"
if ! command -v mongod >/dev/null; then
  UBUNTU_CODENAME=$(lsb_release -cs)
  # Fallback to jammy if focal/older
  case "$UBUNTU_CODENAME" in
    jammy|focal) ;;
    *) UBUNTU_CODENAME="jammy" ;;
  esac
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
      gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor --yes
  echo "deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/ubuntu ${UBUNTU_CODENAME}/mongodb-org/7.0 multiverse" \
      > /etc/apt/sources.list.d/mongodb-org-7.0.list
  apt-get update -y >/dev/null
  apt-get install -y mongodb-org >/dev/null
fi
systemctl enable mongod >/dev/null 2>&1 || true
systemctl restart mongod
sleep 3
systemctl is-active --quiet mongod || fail "MongoDB failed to start. Run: journalctl -u mongod -n 50"
ok "MongoDB running on 127.0.0.1:27017"

# 6. CLONE / PULL REPO
log "Step 6/10  Cloning repository ($BRANCH branch)"
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git fetch --all --quiet
  git checkout "$BRANCH"
  git reset --hard "origin/$BRANCH"
  ok "Repo updated"
else
  rm -rf "$APP_DIR"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$APP_DIR" --quiet
  ok "Repo cloned to $APP_DIR"
fi
cd "$APP_DIR"
[ -d backend ] && [ -d frontend ] || fail "backend/ or frontend/ folder missing in repo"

# 7. BACKEND SETUP
log "Step 7/10  Setting up FastAPI backend"
cd "$APP_DIR/backend"
python3 -m venv venv
# shellcheck disable=SC1091
source venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
# Build .env (preserve existing JWT_SECRET if present)
if [ -f .env ] && grep -q "^JWT_SECRET=" .env; then
  JWT_SECRET=$(grep "^JWT_SECRET=" .env | cut -d= -f2-)
else
  JWT_SECRET=$(openssl rand -hex 32)
fi
cat > .env <<EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=m11clube
JWT_SECRET=${JWT_SECRET}
CORS_ORIGINS=*
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
IMB_API_KEY=${IMB_API_KEY}
EOF
deactivate
ok "Backend dependencies installed, .env written"

# 8. FRONTEND BUILD
log "Step 8/10  Building React frontend (this may take 3-8 minutes)"
cd "$APP_DIR/frontend"
echo "REACT_APP_BACKEND_URL=http://${DOMAIN_OR_IP}" > .env
export NODE_OPTIONS="--max-old-space-size=1536"
export CI=false
yarn install --frozen-lockfile --silent 2>&1 | tail -5 || yarn install --silent 2>&1 | tail -5
yarn build 2>&1 | tail -10
[ -d build ] || fail "Frontend build failed — no build/ directory"
ok "Frontend build complete ($(du -sh build | cut -f1))"

# 9. PM2 START BACKEND
log "Step 9/10  Starting backend with PM2"
cd "$APP_DIR/backend"
pm2 delete m11-api >/dev/null 2>&1 || true
pm2 start "$APP_DIR/backend/venv/bin/uvicorn" \
  --name m11-api \
  --cwd "$APP_DIR/backend" \
  -- server:app --host 0.0.0.0 --port 8001
pm2 save >/dev/null
# Setup PM2 to auto-start on boot
pm2 startup systemd -u root --hp /root 2>&1 | grep "sudo env" | bash >/dev/null 2>&1 || true
sleep 4
curl -fsS http://127.0.0.1:8001/api/ >/dev/null || fail "Backend not responding on :8001 — check 'pm2 logs m11-api'"
ok "Backend live on 127.0.0.1:8001"

# 10. NGINX CONFIG
log "Step 10/10  Configuring Nginx reverse proxy"
cat > /etc/nginx/sites-available/m11 <<'NGX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/m11/frontend/build;
    index index.html;

    client_max_body_size 50M;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/javascript;

    # API + Webhooks → FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
    }

    # Static assets caching
    location ~* \.(?:js|css|woff2?|ttf|otf|svg|png|jpg|jpeg|gif|webp|ico)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
        try_files $uri =404;
    }

    # SPA fallback
    location / {
        try_files $uri /index.html;
    }
}
NGX
ln -sf /etc/nginx/sites-available/m11 /etc/nginx/sites-enabled/m11
rm -f /etc/nginx/sites-enabled/default
nginx -t >/dev/null
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx
ok "Nginx serving on port 80"

# FIREWALL
log "Configuring firewall"
ufw allow 22/tcp >/dev/null 2>&1 || true
ufw allow 80/tcp >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true
echo "y" | ufw enable >/dev/null 2>&1 || true
ok "Ports 22, 80, 443 open"

# FINAL HEALTH CHECK
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/")
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/api/")

echo ""
echo "============================================================"
echo -e "\033[1;32m✅  DEPLOYMENT COMPLETE!\033[0m"
echo "============================================================"
echo "🌐 Visit:        http://${DOMAIN_OR_IP}"
echo "🔐 Admin login:  admin@m11clube.com / admin123"
echo "👤 Test user:    9999999999 / 1234"
echo ""
echo "📊 Status:"
echo "   • Frontend HTTP:  $HTTP_CODE   (expected 200)"
echo "   • API HTTP:       $API_CODE   (expected 200)"
echo ""
echo "🛠  Useful commands:"
echo "   pm2 status                  # backend status"
echo "   pm2 logs m11-api            # backend logs"
echo "   systemctl status nginx      # nginx status"
echo "   systemctl status mongod     # mongo status"
echo "   tail -f /var/log/nginx/error.log"
echo "============================================================"

pm2 status
