#!/bin/bash
# Builds /opt/friesian/app.env (mode 600) from app.public.env plus secrets delivered as files
# (.dbpass from AWS, optional .stripe_secret). Nothing is printed. Usage: bash build-env.sh staging|production
set -euo pipefail
MODE=${1:?usage: build-env.sh staging|production}
cd /opt/friesian
umask 077
[ -s .dbpass ] || { echo "missing .dbpass" >&2; exit 1; }
DB_HOST=ls-b8e26260b6e4c7731e6ca92e15e66816ee07c424.ctgem4seo93h.us-west-2.rds.amazonaws.com
DB_PASS_ENC=$(python3 -c 'import urllib.parse;print(urllib.parse.quote(open(".dbpass").read().strip(),safe=""),end="")')
TMP=$(mktemp)
{
  cat app.public.env
  echo "DATABASE_URL=postgresql://dbmasteruser:${DB_PASS_ENC}@${DB_HOST}:5432/dbfriesian?sslmode=require"
  if [ -s .nextauth_secret ]; then echo "NEXTAUTH_SECRET=$(cat .nextauth_secret)"; else S=$(openssl rand -base64 48 | tr -d '\n'); echo "$S" > .nextauth_secret; echo "NEXTAUTH_SECRET=$S"; fi
  if [ -s .stripe_secret ]; then echo "STRIPE_SECRET_KEY=$(cat .stripe_secret)"; fi
} > "$TMP"
mv "$TMP" app.env
chmod 600 app.env .nextauth_secret
if [ "$MODE" = production ] && ! grep -q '^STRIPE_SECRET_KEY=sk_live_' app.env; then echo "WARNING: production env has no live Stripe key" >&2; fi
echo "app.env written ($(grep -c '=' app.env) settings, mode 600)"
