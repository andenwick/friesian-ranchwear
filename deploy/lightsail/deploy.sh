#!/bin/bash
# Deploys the current checkout to the Lightsail server: package -> copy -> release.sh on the server.
# Run from the repo root on the laptop:  bash deploy/lightsail/deploy.sh
# release.sh runs under nohup on the server (build, switch APP_TAG, health check, automatic rollback), so a dropped
# SSH connection cannot stop a release halfway. This script follows /opt/friesian/release.log until it finishes.
set -euo pipefail
HOST=${DEPLOY_HOST:-ubuntu@52.41.160.250}
KEY=${DEPLOY_KEY:-$HOME/.ssh/edyka_lightsail}
if [ -n "$(git status --porcelain)" ]; then echo "Refusing: commit or stash changes first so the tag matches the code." >&2; exit 1; fi
TAG=prod-$(git rev-parse --short HEAD)
TGZ=$(mktemp -u).tgz
git ls-files | tar -czf "$TGZ" -T -
scp -q -i "$KEY" "$TGZ" "$HOST:/opt/friesian/src.tgz"
scp -q -i "$KEY" deploy/lightsail/release.sh "$HOST:/opt/friesian/release.sh"
rm -f "$TGZ"
ssh -i "$KEY" "$HOST" "set -e; cd /opt/friesian; rm -rf src; mkdir src; tar -xzf src.tgz -C src; rm src.tgz
  sed -i 's/\r$//' release.sh; chmod 755 release.sh
  sudo nohup ./release.sh '$TAG' > release.log 2>&1 < /dev/null &
  echo 'release $TAG started on the server; following release.log'"
for i in $(seq 1 120); do
  sleep 15
  out=$(ssh -i "$KEY" -o ConnectTimeout=15 "$HOST" 'tail -3 /opt/friesian/release.log' 2>/dev/null || true)
  if echo "$out" | grep -q 'RELEASE OK\|RELEASE FAILED'; then echo "$out"; echo "$out" | grep -q 'RELEASE OK'; exit $?; fi
done
echo "Still running after 30 minutes; check /opt/friesian/release.log on the server." >&2
exit 1
