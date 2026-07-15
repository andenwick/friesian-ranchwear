# Contributing

This is a small production system. The process should stay lightweight, but every change must preserve payment, inventory, customer-data, and deployment invariants.

## Workflow

1. Branch from the current `main`.
2. Read the relevant route, client flow, domain documentation, and tests before editing.
3. Keep each pull request focused on one behavior or one engineering concern.
4. Add or update tests for changed behavior.
5. Run the checks listed below.
6. Describe production risk, rollback, and any required configuration in the pull request.

## Required checks

For every code change:

```bash
npm test
npm run audit:prod
npm run build
```

Also run `npm run test:e2e` for customer-facing, navigation, auth, cart, checkout, policy, or layout changes.

For payment, inventory, database, admin-write, image-storage, or authentication changes, add focused tests for the failure path as well as the happy path.

## Database rules

- Never run `prisma db push` against production.
- Do not edit the production database manually to make code work.
- The repository does not yet contain a Prisma migration baseline. Establishing that baseline is P0 work and must be handled as its own reviewed change.
- Until migration history exists, schema changes are blocked.
- Preserve historical order records. Products and variants referenced by orders are deactivated or set out of stock, not deleted.

## Payment and inventory rules

- Prices and stock are authoritative on the server. Client totals are display-only.
- Inventory reservation and order creation stay in one database transaction.
- A failed or canceled unpaid PaymentIntent can release stock once.
- A succeeded payment must never lose its inventory reservation.
- Stripe webhooks are the financial event source. Do not make admin status changes perform hidden Stripe actions.
- Never use live payment credentials in automated tests.

## Customer-data rules

- Do not log secrets, full addresses, passwords, payment data, or private keys.
- Public order lookup must not return shipping addresses or customer names.
- New public data endpoints need explicit authorization and rate-limit decisions.

## Pull requests

Use the repository pull request template. Include:

- what behavior changed;
- why the change is needed;
- tests run;
- production and data risk;
- rollback or recovery steps;
- configuration or webhook changes.

Do not combine opportunistic refactors with production fixes. Record larger structural work in `docs/engineering-assessment.md` and address it incrementally.
