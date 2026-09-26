#!/usr/bin/env bash
# Run as root on the app droplet (Ubuntu). Usage: ./setup-app-droplet.sh <git-repo-url> <load-droplet-private-ip>
set -euo pipefail
REPO="${1:?git repo url}"
LOAD_IP="${2:?load droplet private ip (for firewall)}"

curl -fsSL https://get.docker.com | sh
apt-get install -y ufw htop git

ufw default deny incoming
ufw allow 22/tcp
ufw allow 80/tcp
ufw --force enable

git clone "$REPO" /opt/loadlab || (cd /opt/loadlab && git pull)
cd /opt/loadlab
[ -f .env ] || { cp .env.example .env; sed -i "s/change-me-too/$(openssl rand -hex 16)/; s/change-me/$(openssl rand -hex 16)/" .env; }
docker compose up -d --build
echo "Up. Seed with: docker compose run --rm api node dist/seed.js 10000 50 20 5"
