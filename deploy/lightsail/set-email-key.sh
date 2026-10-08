#!/bin/bash
# Run on the laptop by Anden:  bash deploy/lightsail/set-email-key.sh
# Prompts for the Resend API key without showing it, writes it into /opt/friesian/app.prod.env on the server
# (replacing any earlier value), sets the sender and optional reply-to, then recreates the app container.
set -euo pipefail
HOST=${DEPLOY_HOST:-ubuntu@52.41.160.250}
KEY=${DEPLOY_KEY:-$HOME/.ssh/edyka_lightsail}
read -rsp "Paste the Resend API key (re_...), then press Enter. Nothing will show: " RESEND
echo
case "$RESEND" in re_*) ;; *) echo "That doesn't look like a Resend key (should start with re_). Nothing changed." >&2; exit 1;; esac
read -rp "Reply-to email for customer replies (Enter to skip): " REPLY
printf '%s\n%s\n' "$RESEND" "$REPLY" | ssh -i "$KEY" "$HOST" 'set -e; cd /opt/friesian
  IFS= read -r K; IFS= read -r R
  umask 077
  grep -v -E "^(RESEND_API_KEY|EMAIL_FROM|EMAIL_REPLY_TO)=" app.prod.env > app.prod.env.new || true
  printf "RESEND_API_KEY=%s\nEMAIL_FROM=Friesian Ranchwear <orders@friesianranchwear.com>\n" "$K" >> app.prod.env.new
  if [ -n "$R" ]; then printf "EMAIL_REPLY_TO=%s\n" "$R" >> app.prod.env.new; fi
  mv app.prod.env.new app.prod.env; chmod 600 app.prod.env
  sudo docker compose up -d --force-recreate app >/dev/null 2>&1
  for i in $(seq 1 40); do s=$(sudo docker inspect -f "{{.State.Health.Status}}" $(sudo docker compose ps -q app)); [ "$s" = healthy ] && break; sleep 3; done
  echo "email settings saved; app health: $s"
  sudo docker compose exec -T app node -e "console.log(\"RESEND_API_KEY set:\", !!process.env.RESEND_API_KEY, \"| reply-to set:\", !!process.env.EMAIL_REPLY_TO)"'
unset RESEND REPLY
