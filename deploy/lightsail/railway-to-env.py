# Builds /opt/friesian/app.prod.env from Railway's exported service variables (.railway_env.json),
# with the new Lightsail DATABASE_URL and the server-generated NEXTAUTH_SECRET. Prints no values.
import json, urllib.parse, os
os.chdir("/opt/friesian")
os.umask(0o077)
NL = chr(10)
CR = chr(13)
LITERAL_NL = chr(92) + "n"  # backslash + n, which lib/sheets.js turns back into a newline
r = json.load(open(".railway_env.json"))
keep = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_SHEET_ID", "GOOGLE_PRIVATE_KEY"]
pw = urllib.parse.quote(open(".dbpass").read().strip(), safe="")
host = "ls-b8e26260b6e4c7731e6ca92e15e66816ee07c424.ctgem4seo93h.us-west-2.rds.amazonaws.com"
lines = ["NODE_ENV=production", "NEXT_TELEMETRY_DISABLED=1", "NEXTAUTH_URL=https://friesianranchwear.com",
         "DATABASE_URL=postgresql://dbmasteruser:%s@%s:5432/dbfriesian?sslmode=require" % (pw, host),
         "NEXTAUTH_SECRET=" + open(".nextauth_secret").read().strip()]
for k in keep:
    v = r.get(k, "")
    if not v:
        print("missing:", k)
        continue
    lines.append(k + "=" + v.replace(CR, "").replace(NL, LITERAL_NL))
body = NL.join(lines) + NL
open("app.prod.env", "w").write(body)
open(".pk_live", "w").write(r["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"].strip())
gk = r["GOOGLE_PRIVATE_KEY"].replace(LITERAL_NL, NL).strip()
print("app.prod.env lines:", body.count(NL), "(expected", len(lines), ")")
print("stripe secret live:", r["STRIPE_SECRET_KEY"].startswith("sk_live_"),
      "| publishable live:", r["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"].startswith("pk_live_"),
      "| webhook secret format ok:", r["STRIPE_WEBHOOK_SECRET"].startswith("whsec_"))
print("google key PEM ok:", gk.startswith("-----BEGIN") and gk.endswith("-----"))
