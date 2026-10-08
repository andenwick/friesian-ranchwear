#!/bin/bash
# Run on the server after the final migrate-db.sh. Switches compose to the production image, env and Caddy config,
# then checks the app locally through Caddy before any DNS change.
set -euo pipefail
cd /opt/friesian
TAG=${1:?usage: switch-to-production.sh <image tag>}
cp .env .env.staging.bak
cat > .env <<EOT
APP_TAG=$TAG
APP_ENV_FILE=app.prod.env
CADDYFILE=Caddyfile.prod
SITE_HOSTS=friesianranchwear.com
STAGING_NOINDEX=0
EOT
sudo docker compose up -d 2>&1 | tail -3
for i in $(seq 1 40); do s=$(sudo docker inspect -f '{{.State.Health.Status}}' "$(sudo docker compose ps -q app)" 2>/dev/null || true); [ "$s" = healthy ] && break; sleep 3; done
echo "app health: $s"
R="--resolve friesianranchwear.com:443:127.0.0.1 --resolve www.friesianranchwear.com:443:127.0.0.1 -k -s -m 20"
echo "local /api/health: $(curl $R https://friesianranchwear.com/api/health)"
echo "local home: $(curl $R -o /dev/null -w '%{http_code}' https://friesianranchwear.com/)"
echo "local www: $(curl $R -o /dev/null -w '%{http_code} -> %{redirect_url}' https://www.friesianranchwear.com/products)"
echo "products md5 local:   $(curl $R https://friesianranchwear.com/api/products | md5sum | cut -c1-12)"
echo "products md5 railway: $(curl -s -m 20 https://isut0ca0.up.railway.app/api/products | md5sum | cut -c1-12)"
