#!/bin/bash
# Rebuilds the trusted_proxies list from Cloudflare's published ranges.
set -euo pipefail
cd /opt/friesian
v4=$(curl -fsS https://www.cloudflare.com/ips-v4)
v6=$(curl -fsS https://www.cloudflare.com/ips-v6)
echo "trusted_proxies static $(echo $v4 $v6)" > cloudflare-ips.caddy
echo "trusted ranges: $(echo $v4 $v6 | wc -w)"
