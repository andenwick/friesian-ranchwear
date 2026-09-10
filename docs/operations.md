# Operations and incident runbook

Last verified: September 10, 2026

## Production topology

- Application: one Railway web service
- Database: one Railway PostgreSQL service
- Release source: GitHub `main`; active deployment is base commit `1282322...`
- Public domain: `https://friesianranchwear.com`
- Health endpoint: `GET /api/health`
- Current runtime: Node 20; reviewed candidate runtime: Node 24
- Current resilience: one app replica, one database member, no HA, PITR disabled,
  no backup schedule, and no wired PITR bucket

The application is stateless except for process-local rate-limit counters. Durable state lives in PostgreSQL, Stripe, Cloudinary, Google Sheets, and browser storage.

Railway production is linked directly to GitHub `main`, and its source configuration
currently has `checkSuites=false`. Railway's project-level `prDeploys`,
`botPrEnvironments`, and `focusedPrEnvironments` flags were all `false` when verified;
the only environment was non-ephemeral `production`. An isolated review branch or draft
pull request therefore does not create a Railway preview or target production under the
verified configuration. Recheck those flags before opening a later pull request. Merging
or pushing to `main` is deployment-sensitive and must not occur until the migration-first
release window is approved.

## Build and start

Railway reads both `railway.toml` and `nixpacks.toml`.

```text
npm ci
npx prisma generate
npm run build
npm run start
```

`npm run build` also runs `prisma generate`, so generation currently occurs twice in the Nixpacks build. This is harmless but redundant.

Railway does not apply migrations automatically. The checked-in baseline and additive
payment-integrity migration have been replayed on fresh and legacy-shaped disposable
PostgreSQL 17 databases. Baseline resolve and migration deploy are separate, explicitly
approved release actions that must finish before the schema-dependent application is
rolled out. Ordinary restarts must never apply pending financial migrations.

The September 10 read-only production export/local PostgreSQL 17 restore proved the
logical recovery and candidate migration path without mutating production. It did not
validate Railway's manual volume backup restore. The only unexpired manual backup seen
during review expires September 22, 2026. Establish scheduled recovery/PITR, a tested
provider restore cadence, documented RPO/RTO, and off-device recovery for encryption
material before treating backup operations as production-ready.

The application currently connects with a PostgreSQL superuser that can create roles,
databases, and replication state. Replace it with a least-privilege runtime role only
under a reviewed and separately approved privilege rollout.

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

## Credential exposure response

During the September 10 read-only audit, a Railway CLI inspection command unexpectedly
returned production secret values to the restricted task transcript. No values were
copied into this repository or the audit artifacts, and no configuration-output file was
intentionally created. Treat every secret returned by that command as exposed; do not
repeat the command or reproduce any value in tickets, commits, chat, or logs.

Rotation is a separate, explicitly approved production operation. Before release, the
incident owner should coordinate this sequence:

1. Inventory the affected credentials by service and assign an owner without recording
   their values.
2. Quiesce checkout or other mutations when a credential transition could create split
   behavior.
3. Rotate the database credential/URL, Stripe live secret and webhook signing secret,
   Google service-account key, NextAuth secret, Cloudinary secret, and every other secret
   returned by the audit command. Plan for active sessions to be invalidated when the
   NextAuth secret changes.
4. Update Railway variables in an order that keeps dependencies available, then release
   one exact reviewed build.
5. Verify health, authentication, signed webhook delivery, mailing-list integration, and
   image upload/delete using nonfinancial or otherwise explicitly authorized checks.
6. Revoke the prior credentials only after the new deployment and integrations are
   confirmed healthy.
7. Restrict or expire the affected transcript/log retention where supported, and record
   the incident owner, rotation time, verification evidence, and remaining exceptions.

Do not rotate or revoke credentials ad hoc during code review; an incomplete rotation can
cause checkout, webhook, authentication, database, image, or mailing-list outages.

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
- `npm run reconcile:report` against an authorized non-production release database
- review payment, inventory, auth, privacy, and data implications
- document any environment, webhook, or provider change
- obtain explicit approval of the exact visual/build candidate
- for payment or Tax changes, retain Stripe test-mode contract evidence for the
  exact pinned API/version before release; local mocks do not satisfy this gate

The current candidate's real Stripe sandbox run is deferred because normal access
requires Gustavo's MFA and no authorized test secret was available. Anden accepted
that limitation for a review branch and asked that Gustavo not be interrupted. Do not
use live keys. Complete the TEST-only evidence when ordinary authorized sandbox access
is available; do not describe the deferred check as permanently impossible.

Before the first production migration:

1. Enter a short approved maintenance window and quiesce the old checkout path.
   Preserve incoming Stripe events for retry; do not disable or discard provider
   delivery history.
2. Recheck production for pending/unknown orders and unresolved provider activity.
   The September 10 snapshot had four cancelled and zero pending orders, but that is
   not a release-time guarantee.
3. Create a fresh provider backup or `pg_dump --format=custom` artifact in an
   access-controlled location. Do not place it in this repository or logs.
4. Restore that exact artifact to a disposable local PostgreSQL database whose
   name ends in `_restore_test`.
5. Create a non-sensitive JSON manifest such as
   `{"counts":{"User":12,"Product":8,"ProductVariant":24,"Order":40,"OrderItem":55}}`
   from the source backup transaction, then run
   `BACKUP_INPUT=... RESTORE_MANIFEST=... RESTORE_DATABASE_URL=... BASELINE_SHADOW_DATABASE_URL=... npm run verify:restore`.
   The guarded
   script restores only to a local database ending `_restore_test`, baselines a
   legacy snapshot when necessary, deploys pending migrations, and verifies the
   resulting schema, row-count manifest, and core integrity invariants. Retain its
   output as local rehearsal evidence; it does not prove provider backup scheduling,
   retention, or production RTO/RPO.
6. Record recovery owner, backup timestamp, artifact retention, PostgreSQL version,
   and tested restore duration.
7. Stop if the restore, migration history, table checks, or application verification fails.
8. With separate authorization for the exact production connection and SQL, mark only
   `0_init` applied, run `prisma migrate status`, apply `prisma migrate deploy`, verify
   the schema, and only then release the exact matching application candidate.
9. Reconcile any legacy pending/unknown payment work, confirm webhook processing, and
   reopen checkout only after the hardened build and schema are both healthy.

After the separately approved migration and merge:

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

- The migration is additive; prefer rolling forward with a corrective migration.
- The older binary can write core tables but does not understand the new durable
  checkout/payment records, so it is not a safe operational rollback while checkout
  remains enabled.
- Prefer a corrected compatible build and roll forward. If an incompatible old binary
  must run, keep all payment processing quiescent—not only the checkout UI. Prevent that
  binary's webhook and admin cleanup paths from mutating reservations while preserving
  Stripe deliveries for later retry, then reconcile before reopening payment processing.
- Restore a database backup only after incident-owner approval and only when the
  recovery point/data-loss implications are understood.

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

1. Run `npm run reconcile:report` and retain its redacted JSON output.
2. Find the PaymentIntent in Stripe and confirm live payment state.
3. Inspect webhook deliveries and the matching `StripeEvent`/`FinancialOperation` IDs.
4. Verify the order amount, currency, payment state, and Tax transaction state.
5. Retry the original failed Stripe webhook only when the application is healthy.
6. Never replay a `RECONCILE` provider operation until its remote result is known.
7. Reconcile inventory before making any manual order change.

A manual admin status change does not perform a Stripe action and is not a substitute for webhook recovery.

## Incident: inventory is reserved by abandoned checkouts

Expired reservation cleanup runs during a new checkout or admin order-list request.

1. Load the admin orders view to trigger cleanup.
2. Review pending orders and Stripe PaymentIntent states.
3. Confirm canceled orders restored inventory once.
4. Do not bulk-increment stock without matching each order and payment state.

The read-only reconciliation report exposes stale durable checkout attempts. A
scheduled invocation and alert destination remain a production operations prerequisite.

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

Implemented signals:

- Railway deploy, application, HTTP, and database logs
- database-backed health check
- Stripe webhook delivery history
- optional Sentry code paths with request/body/secret scrubbing and no session replay
- structured payment and webhook events with stable identifiers and safe error codes
- read-only unresolved-operation report with a nonzero actionable exit code

Missing controls:

- no guaranteed production Sentry configuration;
- no alert policy documented;
- no scheduled payment/order reconciliation alert;
- no reservation-age or inventory-adjustment metric;
- no synthetic checkout monitor;
- no end-to-end HTTP request correlation ID outside payment/webhook identifiers.
- production PostgreSQL still uses an over-privileged runtime role;
- no HA, PITR, scheduled backup, or documented provider-restore cadence.

When telemetry is added, avoid recording payment details, passwords, addresses, private keys, or full customer payloads.
