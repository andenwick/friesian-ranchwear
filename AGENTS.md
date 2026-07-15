# Friesian Ranchwear Agent Guide

This file is the project-local operating guide for coding agents and engineers.

## Read order

1. `README.md`
2. `docs/architecture.md`
3. `docs/domain-model.md`
4. `docs/testing.md`
5. `docs/operations.md` for deployment, payment, image, environment, or database work
6. `docs/design-system.md` for UI work
7. The relevant implementation and tests

## System shape

Friesian Ranchwear is a single Next.js application deployed as one Railway web service. Pages and API handlers live in `app/`. Shared infrastructure and domain helpers live in `lib/`. PostgreSQL is accessed through Prisma. Stripe, Cloudinary, Google Sheets, Sentry, and Google Analytics are external adapters.

Do not invent service boundaries that the code does not have. When a route grows, extract domain logic into a focused `lib/` service with injected adapters so it can be tested without live infrastructure.

## Non-negotiable invariants

- Database product price and stock override client data.
- Stock decrement and order creation are atomic.
- Successful payments are not canceled or restocked.
- Financial state changes remain reconcilable with Stripe.
- Products or variants with order history are not deleted.
- Only approved reviews are public.
- Admin authorization is enforced in server routes, not only in client layouts.
- Public order lookup does not expose shipping addresses or customer names.
- Production health includes a database query.

## Change rules

- Check `git status --short` before editing.
- Preserve unrelated user changes.
- Use a clean branch or worktree for substantial work.
- Do not add secrets or real customer data to code, tests, fixtures, logs, or docs.
- Do not run live charges or mutate production data during verification.
- Do not use `prisma db push` against production.
- Do not add a schema field until the migration baseline work is complete.
- Prefer a small extraction with tests over a repository-wide rewrite.

## Verification

Run the narrow test during implementation, then before handoff run:

```bash
npm test
npm run audit:prod
npm run build
```

Run `npm run test:e2e` when the change affects a browser flow. Payment and inventory changes require failure-path tests, not only a build.

Update the architecture, domain, operations, testing, or design documentation when a change makes any of those documents inaccurate.
