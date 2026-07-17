# Operations and incident runbook

Last verified: July 15, 2026

## Production topology

- Application: one Railway web service
- Database: one Railway PostgreSQL service
- Release source: GitHub `main`
- Public domain: `https://friesianranchwear.com`
- Health endpoint: `GET /api/health`
- Region and replica count: managed in Railway, not declared in this repository

The application is stateless except for process-local rate-limit counters. Durable state lives in PostgreSQL, Stripe, Cloudinary, Google Sheets, and browser storage.

## Build and start

Railway reads both `railway.toml` and `nixpacks.toml`.

```text
npm ci
npx prisma generate
npm run build
npm run start
```

`npm run build` also runs `prisma generate`, so generation currently occurs twice in the Nixpacks build. This is harmless but redundant.

No production schema migration command runs during deploy. Do not add one until a reviewed Prisma migration baseline exists.

## Configuration

Never place real values in documentation, commits, test fixtures, CI variables, or logs.

### Core production

| Variable | Purpose | Failure when missing |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection | App routes importing Prisma fail; health is unavailable |
| `NEXTAUTH_SECRET` | JWT signing | Authentication is unsafe or unavailable |
| `NEXTAUTH_URL` | Auth callback origin | Sign-in and callbacks can fail |
| `STRIPE_SECRET_KEY` | Tax and PaymentIntent server API | Checkout fails |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js | Payment Element cannot initialize |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | Payment state cannot synchronize |

### Feature-required

| Variable | Feature |
| --- | --- |
| `CLOUDINARY_CLOUD_NAME` | Admin image upload and cleanup |
| `CLOUDINARY_API_KEY` | Admin image upload and cleanup |
| `CLOUDINARY_API_SECRET` | Admin image upload and cleanup |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Mailing-list reads and writes |
| `GOOGLE_PRIVATE_KEY` | Mailing-list reads and writes |
| `GOOGLE_SHEET_ID` | Mailing-list reads and writes |

### Optional

| Variable | Default or behavior |
| --- | --- |
| `CHECKOUT_PENDING_TTL_MINUTES` | Defaults to 30 minutes |
| `SENTRY_DSN` | Server telemetry disabled when absent |
| `NEXT_PUBLIC_SENTRY_DSN` | Client telemetry disabled when absent |
| `SENTRY_ORG` | Required only for configured Sentry build integration |
| `SENTRY_PROJECT` | Required only for configured Sentry build integration |
| `NEXT_PUBLIC_GA_ID` | Analytics disabled when absent; consent required when present |

## Stripe configuration

The live webhook endpoint is:

```text
https://friesianranchwear.com/api/webhooks/stripe
```

Required live events:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `charge.refunded`

After changing webhook code or environment values:

1. Confirm the Railway deploy is active.
2. Confirm `/api/health` returns 200.
3. Confirm the endpoint is enabled in Stripe live mode with the four events above.
4. Send a signed non-mutating smoke event only when the webhook secret is already authorized for operational testing.
5. Confirm a 2xx response and inspect logs for processing failures.
6. Never create a live charge as a deployment smoke test.

## Release checklist

Before merge:

- `npm test`
- `npm run test:integration` for payment, inventory, order-lifecycle, or Prisma query changes
- `npm run audit:prod`
- `npm run build`
- `npm run test:e2e` when browser behavior changes
- review payment, inventory, auth, privacy, and data implications
- document any environment, webhook, or provider change

After merge:

1. Confirm the exact commit is building in Railway.
2. Wait for the exact deployment to become Active.
3. Confirm startup logs show the expected Next.js version and Ready state.
4. Check `/api/health` for 200 and `{"status":"ok"}`.
5. Check the changed public or admin flow.
6. Confirm protected admin APIs return 401 without a session.
7. For checkout changes, test cart and navigation without submitting a real payment.
8. For webhook changes, verify endpoint configuration and signed delivery behavior.

## Rollback

Application-only rollback:

1. Identify the last known-good Railway deployment and Git commit.
2. Roll back or redeploy that commit through Railway.
3. Verify health and the affected flow.
4. Check whether any provider configuration changed separately and restore it intentionally.

Database rollback:

- There is currently no migration history or tested rollback path.
- Do not reverse schema or data manually under incident pressure.
- Stabilize the application first, preserve data, and create a reviewed recovery plan from a backup or explicit corrective migration.

Provider configuration is outside Git. A code rollback does not revert Stripe events, Railway variables, Cloudinary settings, Google credentials, or analytics configuration.

## Incident: checkout fails before card entry

Check in order:

1. `/api/health` and Railway database status.
2. Application logs for `Checkout error` or `Stripe Tax calculation failed`.
3. Stripe account capability and API errors.
4. Whether the submitted variant is active and in stock.
5. Production variables for Stripe and database connectivity.

Do not lower validation, trust client prices, or skip tax as an emergency fix.

## Incident: paid customer has a pending order

1. Find the PaymentIntent in Stripe and confirm live payment state.
2. Inspect webhook deliveries and response codes.
3. Verify the order's `stripePaymentId` and current status.
4. Retry the failed Stripe webhook when the application is healthy.
5. Reconcile inventory before making any manual order change.

A manual admin status change does not perform a Stripe action and is not a substitute for webhook recovery.

## Incident: inventory is reserved by abandoned checkouts

Expired reservation cleanup runs only during a new checkout or admin order-list request.

1. Load the admin orders view to trigger cleanup.
2. Review pending orders and Stripe PaymentIntent states.
3. Confirm canceled orders restored inventory once.
4. Do not bulk-increment stock without matching each order and payment state.

The durable fix is a scheduled cleanup job with reconciliation metrics.

## Incident: product image upload fails

1. Confirm all three Cloudinary variables exist in the application service.
2. Inspect safe image-storage error codes in Railway logs.
3. Verify file type and the 10 MB limit.
4. Confirm Cloudinary account availability and credentials.
5. After recovery, test one upload and delete, then remove the test asset.

Do not fall back to Railway's ephemeral filesystem.

## Incident: order lookup exposes too much data

The public lookup response must not include customer names or shipping addresses. Treat any regression as a privacy incident:

1. Disable or patch the endpoint.
2. Verify the response with a controlled existing order without printing customer data.
3. Review logs and telemetry for accidental payload capture.
4. Document scope and corrective action.

## Observability state

Current signals:

- Railway deploy, application, HTTP, and database logs
- database-backed health check
- Stripe webhook delivery history
- optional Sentry code paths

Missing controls:

- no guaranteed production Sentry configuration;
- no alert policy documented;
- no payment/order reconciliation metric;
- no reservation-age or inventory-adjustment metric;
- no synthetic checkout monitor;
- no structured request or correlation IDs.

When telemetry is added, avoid recording payment details, passwords, addresses, private keys, or full customer payloads.
