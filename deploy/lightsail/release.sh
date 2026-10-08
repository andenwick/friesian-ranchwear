#!/bin/bash
# Runs on the server, started by deploy.sh under nohup so a dropped SSH connection cannot interrupt it.
# Builds /opt/friesian/src as friesian:<tag>, points APP_TAG at it, waits for health, and switches back to the
# previous tag if the new container is not healthy. Output: /opt/friesian/release.log
set -euo pipefail
TAG=${1:?usage: release.sh <tag>}
cd /opt/friesian
echo "release $TAG started $(date -u +%FT%TZ)"
docker build -q --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$(cat .pk_live)" -t "friesian:$TAG" src
PREV=$(grep '^APP_TAG=' .env | cut -d= -f2)
sed -i "s/^APP_TAG=.*/APP_TAG=$TAG/" .env
docker compose up -d app
s=starting
for i in $(seq 1 40); do
  s=$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q app)")
  [ "$s" = healthy ] && break
  sleep 3
done
if [ "$s" != healthy ]; then
  echo "RELEASE FAILED: friesian:$TAG is $s; rolled back to $PREV"
  sed -i "s/^APP_TAG=.*/APP_TAG=$PREV/" .env
  docker compose up -d app
  exit 1
fi
echo "RELEASE OK: friesian:$TAG healthy (previous: $PREV)"
echo "Roll back: sed -i 's/^APP_TAG=.*/APP_TAG=$PREV/' /opt/friesian/.env && sudo docker compose -f /opt/friesian/docker-compose.yml up -d app"
