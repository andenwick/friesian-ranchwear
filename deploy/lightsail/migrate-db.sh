#!/bin/bash
# Copies the Railway database into the Lightsail database. Read-only on Railway.
# Run on the server by Anden: sudo bash migrate-db.sh
# Connection strings are passed to containers as environment variables, never as command-line arguments.
set -euo pipefail
cd /opt/friesian
if [ -s .railway_url ]; then SRC=$(cat .railway_url); else read -rsp "Railway DATABASE_PUBLIC_URL (Railway > Postgres > Variables): " SRC; echo >&2; fi
TGT=$(grep '^DATABASE_URL=' app.env | cut -d= -f2-)
export SRC TGT
pg() { docker run --rm -i -e SRC -e TGT -e CNT -e PGCONNECT_TIMEOUT=15 postgres:17 sh -c "$1"; }
echo "== server versions (source, target)" >&2
pg 'psql "$SRC" -Atc "show server_version"; psql "$TGT" -Atc "show server_version"' >&2
echo "== dump (read-only on source) -> restore (target)" >&2
LOG=/opt/friesian/restore-$(date +%Y%m%d-%H%M%S).log
pg 'pg_dump "$SRC" --format=custom --no-owner --no-acl > /tmp/d && pg_restore --no-owner --no-acl --clean --if-exists -d "$TGT" /tmp/d' > "$LOG" 2>&1 || true
echo "restore log: $LOG ($(grep -ci 'error' "$LOG") error lines)" >&2
grep -i 'error' "$LOG" | head -10 >&2 || true
echo "== exact row counts per table (source | target)" >&2
CNT="select table_name || ' ' || (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1"
export CNT
paste <(pg 'psql "$SRC" -Atc "$CNT"' ) <(pg 'psql "$TGT" -Atc "$CNT"') >&2
unset SRC TGT
rm -f .railway_url
