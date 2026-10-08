#!/bin/bash
# Run on the server by Anden. Prompts for secrets without echoing and writes /opt/friesian/app.env (mode 600).
# Non-secret settings come from /opt/friesian/app.public.env.
# Usage: sudo bash intake-secrets.sh staging|production
set -euo pipefail
MODE=${1:?usage: intake-secrets.sh staging|production}
cd /opt/friesian
umask 077
ask() { local v; read -rsp "$1: " v; echo >&2; printf '%s' "$v"; }
echo "Paste each value and press Enter. Nothing shows while you paste." >&2
DB_PASS=$(ask "Lightsail database password (Lightsail > Databases > friesian-db > Connect > Show)")
DB_HOST=ls-b8e26260b6e4c7731e6ca92e15e66816ee07c424.ctgem4seo93h.us-west-2.rds.amazonaws.com
DB_PASS_ENC=$(printf '%s' "$DB_PASS" | python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.stdin.read(),safe=""),end="")')
if [ "$MODE" = staging ]; then KEYHINT="sk_test_..."; else KEYHINT="sk_live_..."; fi
STRIPE_SECRET=$(ask "Stripe secret key for $MODE ($KEYHINT)$( [ "$MODE" = staging ] && echo ', or Enter to run staging without payments')")
case "$STRIPE_SECRET" in sk_test_*) [ "$MODE" = staging ] || { echo "Refusing: production needs a live key." >&2; exit 1; };;
  sk_live_*) [ "$MODE" = production ] || { echo "Refusing: staging must use a test key." >&2; exit 1; };;
  "") [ "$MODE" = staging ] || { echo "Refusing: production needs a Stripe key." >&2; exit 1; }
      echo "Staging will run without Stripe; checkout will not work there." >&2;;
  *) echo "That doesn't look like a Stripe secret key." >&2; exit 1;; esac
STRIPE_WEBHOOK=$(ask "Stripe webhook signing secret (whsec_...), or Enter to leave blank for now")
CLD_KEY=$(ask "Cloudinary API key, or Enter to skip")
CLD_SECRET=$(ask "Cloudinary API secret, or Enter to skip")
TMP=$(mktemp)
{
  cat app.public.env
  echo "DATABASE_URL=postgresql://dbmasteruser:${DB_PASS_ENC}@${DB_HOST}:5432/dbfriesian?sslmode=require"
  echo "NEXTAUTH_SECRET=$(openssl rand -base64 48 | tr -d '\n')"
  if [ -n "$STRIPE_SECRET" ]; then echo "STRIPE_SECRET_KEY=${STRIPE_SECRET}"; fi
  if [ -n "$STRIPE_WEBHOOK" ]; then echo "STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK}"; fi
  if [ -n "$CLD_KEY" ]; then echo "CLOUDINARY_API_KEY=${CLD_KEY}"; fi
  if [ -n "$CLD_SECRET" ]; then echo "CLOUDINARY_API_SECRET=${CLD_SECRET}"; fi
} > "$TMP"
mv "$TMP" app.env
chmod 600 app.env
unset DB_PASS DB_PASS_ENC STRIPE_SECRET STRIPE_WEBHOOK CLD_KEY CLD_SECRET
echo "Wrote /opt/friesian/app.env ($(grep -c '=' app.env) settings, mode 600). Values were not displayed." >&2
