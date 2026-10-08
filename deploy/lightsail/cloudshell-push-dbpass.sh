#!/bin/bash
# Run in AWS CloudShell (us-west-2). Sends the friesian-db managed password to /opt/friesian/.dbpass
# on friesian-web using Lightsail's temporary SSH access. The password is never printed.
set -euo pipefail
W=$(mktemp -d); cd "$W"
aws lightsail get-instance-access-details --instance-name friesian-web --protocol ssh --output json > ad.json
python3 - <<'PY'
import json
d=json.load(open('ad.json'))['accessDetails']
open('k','w').write(d['privateKey']); open('k-cert.pub','w').write(d['certKey'])
open('who','w').write(d['ipAddress']+' '+d['username']+chr(10))
PY
chmod 600 k; read IP U < who
aws lightsail get-relational-database-master-user-password --relational-database-name friesian-db --password-version CURRENT --query masterUserPassword --output text \
 | ssh -i k -o CertificateFile=k-cert.pub -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=kh "$U@$IP" 'umask 077; cat > /opt/friesian/.dbpass; wc -c < /opt/friesian/.dbpass | xargs echo "dbpass bytes:"'
cd /; rm -rf "$W"
echo "done"
