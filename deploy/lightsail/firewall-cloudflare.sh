#!/bin/bash
# Only Cloudflare may reach the web ports. Run on the server as root; installed as a systemd unit
# (friesian-firewall.service) so it reapplies after reboots and Docker restarts.
#
# Docker-published ports skip the INPUT chain for IPv4 (they are DNATed into FORWARD), so the IPv4 rules go
# in DOCKER-USER. IPv6 reaches docker-proxy through INPUT; Cloudflare connects over IPv4 (the zone has only
# A records), so IPv6 web traffic is dropped outright. SSH (22) is untouched.
#   Undo:  iptables -F DOCKER-USER && ip6tables -D INPUT -p tcp -m multiport --dports 80,443 -j DROP
set -euo pipefail
RANGES_FILE=/opt/friesian/cloudflare-ips.caddy
EXT_IF=$(ip -4 route show default | awk '{print $5; exit}')
V4=$(tr ' ' '\n' < "$RANGES_FILE" | grep -E '^[0-9]+\.[0-9.]+/[0-9]+$' || true)
COUNT=$(echo "$V4" | grep -c / || true)
if [ "$COUNT" -lt 10 ]; then echo "Refusing: only $COUNT Cloudflare IPv4 ranges in $RANGES_FILE" >&2; exit 1; fi

iptables -N DOCKER-USER 2>/dev/null || true
iptables -F DOCKER-USER
iptables -A DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
for range in $V4; do iptables -A DOCKER-USER -i "$EXT_IF" -s "$range" -j RETURN; done
iptables -A DOCKER-USER -i "$EXT_IF" -j DROP
iptables -A DOCKER-USER -j RETURN

ip6tables -D INPUT -p tcp -m multiport --dports 80,443 -j DROP 2>/dev/null || true
ip6tables -I INPUT -p tcp -m multiport --dports 80,443 -j DROP

echo "firewall: $COUNT Cloudflare IPv4 ranges allowed on $EXT_IF; other inbound to containers dropped; IPv6 80/443 dropped"
