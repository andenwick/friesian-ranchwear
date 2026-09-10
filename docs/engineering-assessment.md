# Engineering assessment

**Assessment date:** July 15, 2026

**Progress updated:** July 16, 2026

**Scope:** application code, data model, external integrations, tests, delivery workflow, operations, and design documentation

**System reviewed:** Friesian Ranchwear at production `main` commit `2d67652`

> Historical assessment: this document records the July baseline. The September 10,
> 2026 remediation candidate adds migration history, durable checkout/webhook/Tax
> operations, separated payment projection, partial refunds, capability-based guest
> access, constrained audited admin fulfillment, Node 24 CI/runtime declarations,
> privacy-safe telemetry, and substantially expanded PostgreSQL tests. Production
> logical production export/local PostgreSQL restore proof is complete; Railway snapshot
> restore/PITR, baseline adoption, scheduled reconciliation alerts, branch protection,
> and release of the exact candidate remain external gates. See
> `payment-operations.md`, `database-migrations.md`, and `operations.md` for current truth.

## Executive assessment

Friesian Ranchwear is a working production application with several sound commerce invariants, but it has been operating as an early-stage codebase rather than a complete engineering system. The correct direction is to strengthen the existing modular monolith—not rewrite it or divide it into services.

The application already treats server-side prices and inventory as authoritative, creates an order and reserves stock in one database transaction, protects administrative API routes on the server, and compensates inventory when payment fails. Those are meaningful strengths. The highest risks sit around the application: the production schema has no migration history, core checkout and webhook behavior lacks database-backed integration tests, financial and fulfillment state are conflated, and recovery depends too heavily on manual observation.

This documentation and CI foundation improves the safety of future changes. It does not, by itself, close the runtime risks identified below.

## Maturity snapshot

Scores describe the repository after this engineering-foundation change. A score of 3 means a workable system with known gaps; 5 means the area is deliberately designed, tested, operated, and recoverable.

| Area | Score | Evidence |
| --- | ---: | --- |
| Runtime architecture | 3/5 | Appropriate modular monolith and clear external adapters; route handlers still mix transport, policy, and persistence. |
| Domain integrity | 3/5 | Strong price, stock, and reservation invariants; payment and fulfillment state need separate models. |
| Delivery and CI | 3/5 | Repeatable install, test, audit, build, and browser checks now run in GitHub Actions; no deployment gate or preview environment. |
| Test confidence | 2/5 | Useful unit and smoke coverage exists, but the money path is not tested against PostgreSQL and Stripe-shaped events. |
| Data evolution | 1/5 | Prisma describes the current schema, but there is no committed migration history or proven production restore procedure. |
| Operations | 2/5 | Health endpoint and deployment platform exist; scheduled recovery, reconciliation, alerting, and runbooks were incomplete. |
| Security and privacy | 2.5/5 | Server-side admin guards and reduced tracking response are good; public order lookup and process-local throttling remain weak. |
| Design system | 3/5 | Coherent visual tokens and brand direction; large page-specific styles and inconsistent component placement limit reuse. |
| Documentation | 3.5/5 | Architecture, domain, operations, testing, design, contribution, and decision guidance now live with the code. |

## What should be preserved

- Keep the single Next.js application and PostgreSQL database. The present traffic and team do not justify microservices.
- Keep server authority over catalog price, stock, discounts, tax inputs, and order totals.
- Keep stock reservation and order creation in one Prisma transaction.
- Keep Stripe webhooks as the authority for asynchronous payment outcomes.
- Keep external storage and messaging concerns behind small adapters rather than spreading vendor SDK calls through UI code.
- Keep administrative authorization in server routes even when the client also hides protected screens.

## Principal risks

### 1. Production schema changes are not reproducible

There is no `prisma/migrations` history. `prisma db push` can make a local database match the model, but it is not a reviewable or recoverable production migration strategy. Any new schema-dependent feature can drift from production or require an unsafe manual correction.

### 2. The critical transaction path has shallow automated evidence

Unit and browser smoke tests pass, but checkout, reservation expiry, webhook idempotency, refund/restock behavior, and concurrent stock changes are not exercised against a real PostgreSQL test database. The existing product showcase test also tests a hand-built state model rather than the rendered component.

### 3. Financial truth and fulfillment workflow share one status

One order enum represents payment and operational states. That makes it possible for an administrative label change to look like a financial action even though no Stripe refund, capture, or cancellation occurred. It also limits partial refunds and future fulfillment states.

### 4. Recovery is opportunistic

Expired reservations are released only when particular application paths run. There is no scheduled worker or platform job, no Stripe-to-database reconciliation process, and no durable webhook event ledger. Quiet periods and missed webhooks can therefore leave stale state until a person notices.

### 5. Public tracking uses weak proof of identity

Email-only lookup avoids exposing some sensitive fields, but knowledge of an address is still enough to enumerate that customer's recent order history. A signed tracking link or order number plus email provides a more appropriate boundary.

### 6. Shared operational controls are process-local

The rate limiter resides in application memory. Multiple Railway instances, restarts, or serverless-style execution do not share that state. Environment requirements are also discovered at use time instead of being validated once at startup.

## Prioritized roadmap

### P0 — before the next payment or schema feature

1. **Establish a Prisma migration baseline.** Compare the Prisma model with a fresh production-schema export, take and test a database backup, create a reviewed baseline, and make `prisma migrate deploy` the production path. Do not guess that the checked-in model perfectly matches production.
2. **Extend the critical-path test harness.** PostgreSQL now proves reservation/order atomicity, rollback, duplicate-line and last-unit concurrency, lifecycle idempotence, refund projection, and expired cleanup. Route contracts prove server-authoritative pricing, PaymentIntent compensation, webhook signature handling/event routing, and retry responses. Add combined route-plus-database coverage, realistic signed webhook fixtures, admin authorization coverage, and public lookup privacy tests.
3. **Separate financial and fulfillment state.** Add distinct payment and fulfillment fields, make Stripe PaymentIntent identity unique, persist processed webhook event IDs, and define partial-refund behavior.
4. **Harden order tracking.** Require an order number plus email or use a time-bounded signed tracking link. Preserve response minimization and rate limiting.
5. **Schedule cleanup and reconciliation.** Run reservation cleanup independently of customer/admin traffic and add a report or job that compares open local payments with Stripe.

### P1 — operational control and consistent boundaries

- Validate request bodies with shared schemas and return consistent error shapes.
- Centralize the server-side admin guard and authorization tests.
- Replace process-local throttling with a shared store appropriate to the deployment topology.
- Validate required environment variables during startup and document optional degradation explicitly.
- Configure production error reporting, alert thresholds, release association, and privacy-safe sampling.
- Move newsletter subscription state to an owned database table; synchronize to Sheets only as an integration if it remains useful.
- Add an inventory adjustment ledger so stock changes have reason, actor, quantity, and related order.

### P2 — maintainability and product quality

- Split the largest admin, checkout, and product-detail components around domain actions, not arbitrary line counts.
- Introduce TypeScript gradually at payment, order, inventory, validation, and adapter boundaries.
- Retire the legacy Google Drive image proxy after confirming all catalog media is in Cloudinary.
- Replace mock-state tests with rendered component tests; add automated accessibility and focused visual regression checks.
- Remove confirmed dead hooks, animation constants, unused password helpers, and obsolete component props in small reviewable changes.

## Recommended sequence of pull requests

1. Migration discovery, production schema comparison, backup/restore rehearsal, and baseline plan.
2. Isolated PostgreSQL test environment plus checkout/reservation integration tests, without changing behavior.
3. Payment and fulfillment state redesign with a staged migration and compatibility reads.
4. Durable webhook ledger, uniqueness constraints, replay tests, and reconciliation command/job.
5. Signed or two-factor order tracking plus shared throttling and privacy regression tests.

Each step should leave production deployable and include its own rollback path. Schema and payment work should not be combined into one large rewrite.

## Explicit non-goals

- Do not split the application into microservices.
- Do not start a ground-up rewrite.
- Do not convert the whole repository to TypeScript in one pass.
- Do not introduce a new state-management framework without a demonstrated product need.
- Do not change the production schema until its current state, backup, and migration baseline are verified.

## Exit criteria for a mature small-commerce repository

The repository reaches the next maturity level when a new engineer can clone it, run a documented database-backed test suite, make a schema change through reviewed migrations, trace a payment from checkout through webhook and refund, deploy through a required green check, observe failures, and execute a tested rollback without relying on private historical knowledge.
