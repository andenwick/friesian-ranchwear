# Developer Runbook: Friesian Ranchwear

This runbook covers all operational aspects of the Friesian Ranchwear website. Use it to deploy, monitor, and maintain the site.

---

## Overview

**Project:** Friesian Ranchwear - Brand landing page for western/streetwear apparel
**Client:** Gustavo Lara
**Purpose:** Credibility site, email capture, funnel to TikTok Shop (no checkout on site)

### Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js (App Router, JavaScript) |
| Hosting | Railway (auto-deploy from `main`) |
| Email Capture | API route to Google Sheets |
| Product Data | Google Sheets with 1-hour cache |
| Error Monitoring | Sentry |
| Analytics | Google Analytics |
| Animations | GSAP with ScrollTrigger |

### Repository

GitHub: https://github.com/andenwick/friesian-ranchwear

---

## Environment Variables

All environment variables must be set in Railway for production. Reference `.env.example` for the template.

### Required Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google Cloud Console | Service account email from the JSON key file (looks like `name@project.iam.gserviceaccount.com`) |
| `GOOGLE_PRIVATE_KEY` | Google Cloud Console | Private key from the JSON key file. Keep the `\n` newlines intact. Wrap in quotes. |
| `GOOGLE_SHEET_ID` | Google Sheets URL | The ID from the sheet URL: `https://docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit` |
| `CACHE_BUST_KEY` | Self-generated | Secret key for clearing product cache. Generate with: `openssl rand -hex 32` |
| `SENTRY_DSN` | Sentry Dashboard | Server-side Sentry DSN for error tracking |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry Dashboard | Client-side Sentry DSN (same value as `SENTRY_DSN`) |

### Optional Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `SENTRY_ORG` | Sentry Dashboard | Sentry organization slug (for source maps) |
| `SENTRY_PROJECT` | Sentry Dashboard | Sentry project slug (for source maps) |
| `NEXT_PUBLIC_GA_ID` | Google Analytics | Google Analytics measurement ID (format: `G-XXXXXXXXXX`) |

---

## Cache Management

### Products Cache

The products API uses a 1-hour TTL cache to minimize Google Sheets API calls. This means after Gustavo updates the Products sheet, changes may take up to 1 hour to appear on the site.

**Cache behavior:**
- First request after cache expires fetches fresh data from Google Sheets
- Subsequent requests within 1 hour use cached data
- Cache is stored in memory (clears on server restart/redeploy)

### Busting the Cache

To force an immediate refresh after Gustavo updates products, use the cache-bust endpoint:

```bash
curl "https://YOUR_DOMAIN.com/api/products/refresh?key=YOUR_CACHE_BUST_KEY"
```

**Response on success:**
```json
{ "success": true, "message": "Products cache cleared" }
```

**Response on invalid/missing key:**
```json
{ "error": "Unauthorized" }
```
(Status: 401)

**When to bust the cache:**
- When Gustavo reports they updated products and wants them live immediately
- After adding new product images to the public folder
- During development/testing of product features

---

## Sentry Monitoring

### Accessing Sentry

1. Go to https://sentry.io
2. Log in with developer credentials
3. Navigate to the project (check `SENTRY_PROJECT` env var for name)

### What Errors to Watch For

| Error Type | Priority | Action |
|------------|----------|--------|
| Google Sheets API errors | High | Check credentials, quota, or sheet permissions |
| API route 500 errors | High | Check server logs in Railway for details |
| Client-side render errors | Medium | Often browser-specific; check stack trace |
| 404 errors | Low | Usually bot traffic or mistyped URLs |

### Investigating Errors

1. Click on the error in Sentry to see the full stack trace
2. Check "Additional Data" for request details
3. Look at "Breadcrumbs" to see what happened before the error
4. Check Railway logs for corresponding server-side logs

### Responding to Errors

1. **Google Sheets Auth Errors:** Verify service account credentials in Railway env vars. Check that the sheet is still shared with the service account email.

2. **API Quota Errors:** Google Sheets API has limits. The 1-hour cache should prevent hitting these. If you see quota errors, check for cache bugs.

3. **Deployment Errors:** If errors started after a deploy, check Railway for the deploy that caused it and consider rollback.

---

## Deployment Process

### Automatic Deployment

Railway auto-deploys from the `main` branch. Every push to `main` triggers a new deployment.

**Deploy workflow:**
1. Push code to `main`
2. Railway detects the push and starts building
3. Build completes (usually 1-3 minutes)
4. New version goes live automatically
5. Old version is replaced

### Triggering Manual Deploy

If auto-deploy fails or you need to redeploy without code changes:

1. Go to Railway dashboard
2. Select the Friesian Ranchwear project
3. Go to "Deployments" tab
4. Click "Redeploy" on the latest deployment

Or trigger via Railway CLI:
```bash
railway up
```

### Rollback Procedure

If a deployment causes issues:

1. Go to Railway dashboard > Deployments
2. Find the last working deployment
3. Click on it and select "Rollback"
4. Railway will redeploy that version

**Important:** Rollback only affects code. Environment variables stay as-is.

---

## Common Issues and Solutions

### Google Sheets API Errors

**Symptom:** Products not loading, API returns 500 error

**Check:**
1. Service account credentials are correct in Railway
2. Sheet is still shared with service account email
3. Sheet ID is correct
4. "Products" tab exists in the sheet with correct column structure

**Solution:**
- Verify all credentials in Railway environment variables
- Re-share the sheet with the service account email (Editor access)
- Check Google Cloud Console for API quota issues

### Cache Not Updating

**Symptom:** Gustavo updated products but site shows old data

**Check:**
1. Has 1 hour passed since the change?
2. Has there been a new deployment? (deploys clear the cache)

**Solution:**
1. Bust the cache: `curl "https://YOUR_DOMAIN.com/api/products/refresh?key=YOUR_KEY"`
2. Or wait up to 1 hour for natural expiry
3. Or deploy to Railway (clears in-memory cache)

### Environment Variable Issues

**Symptom:** Site crashes on start or API routes fail

**Check:**
1. All required variables are set in Railway
2. `GOOGLE_PRIVATE_KEY` has proper formatting (newlines intact, quoted)
3. No trailing whitespace in values

**Solution:**
1. Go to Railway > Variables
2. Compare against `.env.example`
3. For `GOOGLE_PRIVATE_KEY`, copy directly from JSON file including the `-----BEGIN/END-----` markers

### Products Not Showing

**Symptom:** ProductShowcase shows "No products available"

**Check:**
1. Products exist in the "Products" tab
2. Products have `active` column set to `TRUE` (exact, case-sensitive)
3. API endpoint returns data: visit `/api/products` directly

**Solution:**
1. Check the Google Sheet "Products" tab
2. Ensure column E (active) is exactly `TRUE` for visible products
3. Bust cache if changes were recent

---

## Local Development

```bash
# Navigate to site folder
cd site

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Then fill in values in .env.local

# Start development server
npm run dev
# Site runs at http://localhost:3000

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Build for production (to verify build works)
npm run build
```

---

## Google Sheet Structure

The Google Sheet has two tabs:

### Emails Tab
| Column | Content |
|--------|---------|
| A | email |
| B | name |
| C | timestamp |

### Products Tab
| Column | Content | Example |
|--------|---------|---------|
| A | name | "Western Tee" |
| B | price | "$45" |
| C | color | "#8B4513" |
| D | imageUrl | "/products/tee.jpg" |
| E | active | TRUE |

**Important:** Row 1 is headers. Data starts at row 2.

---

## Contacts

- **Client:** Gustavo Lara
- **Repository:** https://github.com/andenwick/friesian-ranchwear
- **Railway Project:** (check Railway dashboard)
- **Sentry Project:** (check `SENTRY_PROJECT` env var)
