# Testing and release verification

Last verified: September 10, 2026

## Current baseline

| Suite | Result | Scope |
| --- | --- | --- |
| Vitest | 89 passing tests in 19 files | Route/domain contracts, checkout replay and leases, confirmed-cancellation restart, authorization/privacy, telemetry scrubbing, admin concurrency, validation and adapters |
| PostgreSQL integration | 26 passing tests in 1 file | Migrations, reservation/payment/refund transactions, concurrent event delivery, Tax operation fencing, rollback and stale inventory edits |
| Playwright | 13 passing, 1 intentionally skipped | Homepage, responsive overflow, policy pages, mocked signup success, invalid subscription API requests |
| Production build | Passing on Node 24.21.0 and Next.js 16.3.4 | Route compilation and static generation |
| Production dependency audit | Passing | Deployed install tree; Auth core override pins the fixed 0.41.3 optional peer |
| Production logical recovery | Passing | Read-only export restored to isolated local PostgreSQL 17; baseline match, candidate migration, preserved counts, zero core integrity findings |
| Stripe sandbox contract | Not run; accepted review limitation | Available access required Gustavo MFA and no authorized test secret existed; no live key was used |

The counts are evidence of a working baseline, not broad domain coverage.

## Commands

```bash
npm test
npm run test:watch
npm run test:integration
npm run test:e2e
npm run test:e2e:ui
npm run audit:prod
npm run build
npm run check
```

`npm run check` runs unit tests, the high-severity production dependency audit, and the production build. It expects the normal application environment to exist.

## PostgreSQL integration tests

`npm run test:integration` requires `DATABASE_URL` to target PostgreSQL on `localhost`, `127.0.0.1`, or `::1`, with the database name exactly `friesian_test`. The runner rejects libpq host/service/database overrides and every query parameter except a public schema and numeric connection limit before invoking Prisma. It resets and replays checked-in migrations against that disposable database, then executes the integration configuration serially.

The suite owns the entire `friesian_test` database and deletes application records between tests. Do not use a shared development database. This harness does not establish or validate the production migration baseline.

## CI environment

GitHub Actions runs three jobs:

1. unit tests, production dependency audit, and production build;
2. PostgreSQL 17 integration tests against an isolated service container;
3. Playwright Chromium tests.

The unit/build and browser jobs use a syntactically valid, unreachable PostgreSQL URL because those suites do not query the database. The catalog response is mocked in homepage tests, and subscription tests stop at validation before Google Sheets access.

The database job overrides that placeholder with its isolated `friesian_test` service. Its static credentials exist only inside the disposable CI job.

If a test starts querying PostgreSQL, it must use an explicit test database service and isolated fixtures. Do not point CI at production.

## What is actually covered

Good isolated coverage:

- Cloudinary configuration, validation, upload normalization, error safety, and deletion
- half-star rating encoding
- subscriber email normalization and duplicate comparison
- basic email validation
- Stripe PaymentIntent status classification and cancel/success race reread
- checkout shipping validation before database/provider work
- server-authoritative checkout price, product snapshot, tax input, and PaymentIntent amount
- tax-failure short circuit, reservation-before-PaymentIntent ordering, and replay-safe
  recovery when the provider result is uncertain
- webhook signature rejection, retryable failed-payment handling, Stripe event mapping, and retry response on processing failure
- guest-only, 30-day single-order capabilities and authenticated user-ID ownership
- checkout browser continuity without persisted PII and pending/cancelled cart preservation
- Sentry request, header, URL, referrer, and breadcrumb secret scrubbing
- database-backed admin role recheck and optimistic product edit conflict responses
- subscriber writes use literal Sheets values instead of formula-parsed input

Good PostgreSQL coverage:

- atomic stock decrement and pending-order creation
- rollback when a later cart item is unavailable
- concurrent reservation of the final stock unit
- aggregate stock protection across duplicate cart lines
- concurrent and repeated cancellation without double restocking
- paid-order protection from later cancellation
- successful-payment conflict with an already-cancelled order
- full-refund state projection without inventory mutation
- expired reservation cancellation and paid-payment preservation
- durable event deduplication under concurrent delivery and unknown-order retry
- partial/full refund projection and ordered Tax commit/reversal operations
- first-call replay cutoffs, expired lease recovery, and stale completion fencing
- stale admin inventory write rollback while preserving a racing checkout decrement

Good browser smoke coverage:

- current homepage structure
- product-card destination
- policy and social links
- newsletter form validation and mocked success
- horizontal overflow at mobile, tablet, and desktop widths
- keyboard focus reaches an interactive element
- Privacy and Terms routes render

## Misleading or shallow coverage

`tests/unit/product-showcase.test.js` does not render `ProductShowcase`. It tests mock data and hand-built state objects. It should be replaced by a real component test or removed when a component test environment is added.

The Playwright homepage uses a mocked product response. This is correct for deterministic UI coverage but does not prove the database-backed catalog route works.

The skipped successful subscription test would write to a real sheet if enabled. It needs a fake adapter or isolated test sheet before it can become a normal test.

## Critical missing tests

### P0

- authorization matrix across every protected admin route (representative order/product routes are covered)
- combined HTTP route-plus-PostgreSQL checkout with a Stripe test adapter
- realistic Stripe-signed fixture verification beyond mocked signature construction
- provider-managed Railway snapshot/PITR restore and documented production RPO/RTO
- nonzero-tax Stripe TEST-mode commit/partial-reversal evidence plus locally signed webhook-to-ledger evidence

### P1

- product creation and update validation
- sold-variant and sold-product deletion guards
- image cleanup after product updates
- verified-purchaser review rules
- status query validation
- signup normalization, limits, and duplicate handling
- cookie consent and analytics loading
- accessibility checks with axe or equivalent

### P2

- visual regression for the storefront and admin
- cross-browser coverage beyond Chromium
- load or concurrency tests for checkout and subscriptions
- broader provider contract cases beyond the deferred critical payment/Tax path

## Target test shape

Keep the pyramid practical:

- Pure domain tests for money, state transitions, validation, and inventory decisions.
- Service tests with injected fake Prisma and provider adapters.
- PostgreSQL integration tests for transactions, uniqueness, and query ownership.
- Route tests for HTTP status, authorization, and response privacy.
- A small Playwright suite for the highest-value customer and admin journeys.
- Provider smoke tests only in explicit test environments.

Do not make browser tests carry all business correctness. Payment and inventory behavior belongs below the UI.

## Change matrix

| Change | Minimum verification |
| --- | --- |
| Copy or static policy | Build and relevant browser test |
| CSS or component layout | Build, responsive browser tests, keyboard check |
| Public API | Unit or route test, build, consumer test |
| Admin write | Authorization, validation, failure path, build |
| Checkout or inventory | Domain and transaction tests, webhook regression tests, build, no-charge browser smoke |
| Auth | Unauthorized and authorized route tests, session behavior, build |
| Prisma schema | Reviewed migration, integration test, deploy and rollback plan |
| Provider config | Adapter test, safe logging test, test-mode or non-mutating smoke |

## Release evidence

Record commands and exact results in the pull request. A green build does not replace behavioral tests. A successful local test does not replace watching the exact Railway deployment become active.

The prepared TEST-only Stripe harness is intentionally external to the application
candidate and rejects missing, non-test, live, and connected-account inputs. Publishing
a review branch does not claim it ran. Execute it later through normal authorized
sandbox access without asking Gustavo to interrupt an MFA session for this review.
