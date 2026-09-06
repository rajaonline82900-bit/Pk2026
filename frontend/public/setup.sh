#!/bin/bash
# M11 CLUBE — one-shot VPS setup for rajakhaiwal.in
set -e
export DEBIAN_FRONTEND=noninteractive

echo "🔄 [1/10] System update..."
apt-get update -qq && apt-get upgrade -y -qq

echo "📦 [2/10] Essentials..."
apt-get install -y -qq curl wget git build-essential nginx certbot python3-certbot-nginx ufw python3 python3-venv python3-pip

echo "🟢 [3/10] Node.js 20 + Yarn + PM2..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y -qq nodejs
npm install -g yarn pm2

echo "🍃 [4/10] MongoDB 7..."
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-7.0.list
apt-get update -qq
apt-get install -y -qq mongodb-org
systemctl enable --now mongod

echo "📥 [5/10] Cloning code from GitHub..."
mkdir -p /var/www
cd /var/www
[ -d m11clube ] && rm -rf m11clube
git clone https://github.com/rajaonline82900-bit/Pk2026.git m11clube
cd m11clube && git fetch --all
LATEST=$(git for-each-ref --sort=-committerdate refs/remotes/origin/ --format='%(refname:short)' | grep -v HEAD | head -1)
echo "📌 Using branch: $LATEST"
git checkout -B main $LATEST

echo "🔧 [6/10] Backend setup..."
cd /var/www/m11clube/backend
python3 -m venv venv
source venv/bin/activate
sed -i '/emergentintegrations/d' requirements.txt
pip install -q -r requirements.txt
SECRET=$(openssl rand -hex 32)
cat > .env << ENVEOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=m11clube
SECRET_KEY=$SECRET
CORS_ORIGINS=https://rajakhaiwal.in,https://www.rajakhaiwal.in
ADMIN_EMAIL=admin@m11clube.com
ADMIN_PASSWORD=admin123
PUBLIC_APP_URL=https://rajakhaiwal.in
ENVEOF
python seed.py || true
deactivate

echo "🎨 [7/10] Frontend build..."
cd /var/www/m11clube/frontend
rm -f tsconfig.json
echo "REACT_APP_BACKEND_URL=https://rajakhaiwal.in" > .env
yarn install
yarn build
sed -i '/assets\.emergent\.sh/d; /emergent-badge/d; /posthog/d' build/index.html

echo "🌐 [8/10] Nginx config..."
cat > /etc/nginx/sites-available/rajakhaiwal.in << 'NGINXEOF'
server {
    listen 80;
    server_name rajakhaiwal.in www.rajakhaiwal.in;
    root /var/www/m11clube/frontend/build;
    index index.html;
    client_max_body_size 25M;
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
    location / { try_files $uri $uri/ /index.html; add_header Cache-Control "no-cache, no-store, must-revalidate"; }
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ { expires 7d; add_header Cache-Control "public, immutable"; }
}
NGINXEOF
ln -sf /etc/nginx/sites-available/rajakhaiwal.in /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "🚀 [9/10] Start backend + SSL..."
cd /var/www/m11clube/backend
pm2 delete m11-api 2>/dev/null || true
pm2 start "venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001" --name m11-api
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true
certbot --nginx -d rajakhaiwal.in -d www.rajakhaiwal.in --non-interactive --agree-tos --email admin@rajakhaiwal.in --redirect
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "⚡ [10/10] Install 'deploy' shortcut..."
cat > /usr/local/bin/deploy << 'DEPLOYEOF'
#!/bin/bash
set -e
cd /var/www/m11clube
git fetch --all --prune
L=$(git for-each-ref --sort=-committerdate refs/remotes/origin/ --format='%(refname:short)' | grep -v HEAD | head -1)
echo "📌 Deploying from: $L"
git reset --hard $L
cd frontend && rm -f tsconfig.json && rm -rf build && yarn install && yarn build && sed -i '/assets\.emergent\.sh/d; /emergent-badge/d; /posthog/d' build/index.html
cd /var/www/m11clube/backend && source venv/bin/activate && sed -i '/emergentintegrations/d' requirements.txt && pip install -q -r requirements.txt && deactivate
pm2 reload m11-api --update-env
systemctl reload nginx
echo "🎉 DEPLOYED — https://rajakhaiwal.in"
DEPLOYEOF
chmod +x /usr/local/bin/deploy

echo ""
echo "═══════════════════════════════════════"
echo "🎉 M11 CLUBE FULLY DEPLOYED!"
echo "═══════════════════════════════════════"
echo "🌐 Website: https://rajakhaiwal.in"
echo "👤 Admin:   admin@m11clube.com / admin123"
echo "⚡ Update:  future me sirf 'deploy' type karo"
echo "═══════════════════════════════════════"
pm2 status
