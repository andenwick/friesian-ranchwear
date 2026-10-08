# AWS Lightsail deployment

Production has run on AWS since 2026-10-07. Railway (see `operations.md`) stays up as the rollback target during a 1-2 week soak.

## Topology
- Region `us-west-2`, zone `us-west-2a`.
- Lightsail instance `friesian-web` (Ubuntu 24.04, 2 GB + 2 GB swap), static IP `friesian-ip`, ports 22/80/443. New AWS accounts have a Lightsail container-service quota of 0, so the app runs on an instance with Docker instead.
- `/opt/friesian` on the instance: `docker-compose.yml` runs `app` (this image) behind `caddy` (automatic HTTPS). Files come from `deploy/lightsail/`.
- Lightsail managed PostgreSQL 17.11 `friesian-db` in the same zone, private endpoint, automatic backups. Connections use `sslmode=require`.
- Cloudflare stays in front of `friesianranchwear.com`. Caddy trusts Cloudflare's published ranges (`refresh-cloudflare-ips.sh`) so `X-Forwarded-For` keeps the visitor IP that `lib/rate-limit.js` reads. The pre-cutover staging host `staging.edykastudio.com` is no longer served (`Caddyfile.prod` answers only the store's domain).

## Image
`Dockerfile` builds on `node:24-bookworm-slim`. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is a build arg because Next.js inlines it into the client bundle. `DATABASE_URL`, `NEXTAUTH_SECRET` and `NEXTAUTH_URL` have build-only placeholders (same as CI). The container runs `npm run start` and never applies migrations.

## Secrets
Never in git or on the laptop. Production `app.prod.env` was built on the server by `railway-to-env.py` from Railway's variables (no values displayed), with a new database password and `NEXTAUTH_SECRET`. Add or rotate a value by editing that file on the server (mode 600) and recreating the app container. For a fresh environment, `deploy/lightsail/intake-secrets.sh` runs on the instance, prompts without echo, and writes `/opt/friesian/app.env` (mode 600) from `app.public.env` plus the pasted values. It generates `NEXTAUTH_SECRET` on the server and refuses a live Stripe key for staging (and a test key for production).

## Firewall
`firewall-cloudflare.sh` (systemd unit `friesian-firewall.service`, reapplied after reboots and Docker restarts) lets only Cloudflare's IPv4 ranges (from `cloudflare-ips.caddy`) reach the published web ports, via the `DOCKER-USER` chain, and drops IPv6 80/443. Requests straight to the instance IP time out; SSH is unchanged. After `refresh-cloudflare-ips.sh`, run `sudo systemctl restart friesian-firewall` so the firewall picks up new ranges. Container logs rotate at 10 MB x 5 files.

## Deploy
From a clean checkout of the commit to release: `bash deploy/lightsail/deploy.sh`. It packages tracked files and starts `release.sh` on the instance under `nohup`, so a dropped SSH connection cannot interrupt it. `release.sh` builds `friesian:prod-<sha>` with the live publishable key from `/opt/friesian/.pk_live`, points `APP_TAG` in `/opt/friesian/.env` at it, waits for the health check and switches back to the previous tag if the new container is unhealthy. `deploy.sh` follows `/opt/friesian/release.log` and prints the result and the one-line manual rollback.

## Data
`deploy/lightsail/migrate-db.sh` (on the instance) runs `pg_dump --format=custom` against Railway (read-only) and `pg_restore --no-owner --no-acl --clean` into Lightsail, then prints exact per-table row counts for both. Connection strings travel as container environment variables, not arguments. Migrations stay a separate approved step (`prisma migrate status`, then `prisma migrate deploy`) and run with the `dbmasteruser` URL built from `/opt/friesian/.dbpass`. The app itself connects as `friesian_app` (password in `/opt/friesian/.dbapp_pass`, mode 600): row read/write only, no DDL. Default privileges grant it access to tables that future migrations create.

## Cutover and rollback
Pause admin edits and checkout, run the final copy, deploy production secrets and the live publishable key, set `SITE_HOSTS` to the production hostnames, switch the Cloudflare records to the static IP (proxied; SSL Full today because Caddy uses `tls internal`, Full strict after an Origin CA cert), verify health, webhook delivery and admin login, then reopen. Rollback is pointing the Cloudflare record back to Railway; Railway stays up 1-2 weeks.

## Open
- Cloudflare Origin CA certificate on Caddy, then SSL mode Full (strict).
- CI-driven deploys (GitHub Actions over SSH) once the manual path is proven.
