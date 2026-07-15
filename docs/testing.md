# Testing and release verification

Last verified: July 15, 2026

## Current baseline

| Suite | Result | Scope |
| --- | --- | --- |
| Vitest | 28 passing tests in 6 files | Email normalization, image storage, rating encoding, payment-status classification, basic validation |
| Playwright | 13 passing, 1 intentionally skipped | Homepage, responsive overflow, policy pages, mocked signup success, invalid subscription API requests |
| Production build | Passing on Next.js 16.2.10 | Route compilation and static generation |
| Production dependency audit | Passes at high severity | Low and moderate transitive advisories remain |

The counts are evidence of a working baseline, not broad domain coverage.

## Commands

```bash
npm test
npm run test:watch
npm run test:e2e
npm run test:e2e:ui
npm run audit:prod
npm run build
npm run check
```

`npm run check` runs unit tests, the high-severity production dependency audit, and the production build. It expects the normal application environment to exist.

## CI environment

GitHub Actions runs two jobs:

1. unit tests, production dependency audit, and production build;
2. Playwright Chromium tests.

CI uses a syntactically valid, unreachable PostgreSQL URL. Existing tests do not require database queries. The catalog response is mocked in homepage tests, and subscription tests stop at validation before Google Sheets access.

If a test starts querying PostgreSQL, it must use an explicit test database service and isolated fixtures. Do not point CI at production.

## What is actually covered

Good isolated coverage:

- Cloudinary configuration, validation, upload normalization, error safety, and deletion
- half-star rating encoding
- subscriber email normalization and duplicate comparison
- basic email validation
- Stripe PaymentIntent status classification and cancel/success race reread

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

- checkout request validation and server-side price authority
- atomic stock reservation and order creation
- insufficient aggregate stock for duplicate cart lines
- PaymentIntent cancellation when the database transaction fails
- webhook signature rejection
- succeeded, failed, canceled, repeated, and out-of-order webhook behavior
- full refund projection
- expired reservation cleanup with real transaction behavior
- admin authorization across every protected route
- public order lookup response privacy

### P1

- product creation and update validation
- sold-variant and sold-product deletion guards
- image cleanup after product updates
- verified-purchaser review rules
- account order ownership
- status query validation
- signup normalization, limits, and duplicate handling
- cookie consent and analytics loading
- accessibility checks with axe or equivalent

### P2

- visual regression for the storefront and admin
- cross-browser coverage beyond Chromium
- load or concurrency tests for checkout and subscriptions
- provider contract tests in test mode

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
