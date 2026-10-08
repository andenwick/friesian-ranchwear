#!/bin/bash
# Deploys the current checkout to the Lightsail server: package -> copy -> build on server -> switch -> health check.
# Run from the repo root on the laptop:  bash deploy/lightsail/deploy.sh
# The image is built with the live publishable key stored on the server (/opt/friesian/.pk_live).
# Compose runs the image named by APP_TAG in /opt/friesian/.env; this script points APP_TAG at the new build
# and, if the new container is not healthy, switches back to the previous tag.
set -euo pipefail
HOST=${DEPLOY_HOST:-ubuntu@52.41.160.250}
KEY=${DEPLOY_KEY:-$HOME/.ssh/edyka_lightsail}
if [ -n "$(git status --porcelain)" ]; then echo "Refusing: commit or stash changes first so the tag matches the code." >&2; exit 1; fi
TAG=prod-$(git rev-parse --short HEAD)
TGZ=$(mktemp -u).tgz
git ls-files | tar -czf "$TGZ" -T -
scp -q -i "$KEY" "$TGZ" "$HOST:/opt/friesian/src.tgz"
rm -f "$TGZ"
ssh -i "$KEY" "$HOST" "set -e; cd /opt/friesian; rm -rf src; mkdir src; tar -xzf src.tgz -C src; rm src.tgz
  sudo docker build -q --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=\"\$(cat .pk_live)\" -t friesian:$TAG src
  PREV=\$(grep '^APP_TAG=' .env | cut -d= -f2)
  sed -i 's/^APP_TAG=.*/APP_TAG=$TAG/' .env
  sudo docker compose up -d app
  s=starting
  for i in \$(seq 1 40); do s=\$(sudo docker inspect -f '{{.State.Health.Status}}' \$(sudo docker compose ps -q app)); [ \"\$s\" = healthy ] && break; sleep 3; done
  if [ \"\$s\" != healthy ]; then
    echo \"friesian:$TAG is \$s; rolling back to \$PREV\" >&2
    sed -i \"s/^APP_TAG=.*/APP_TAG=\$PREV/\" .env
    sudo docker compose up -d app
    exit 1
  fi
  echo \"deployed friesian:$TAG (previous: \$PREV). Roll back: sed -i 's/^APP_TAG=.*/APP_TAG='\$PREV'/' .env && sudo docker compose up -d app\""
