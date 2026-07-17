# Friesian Ranchwear

Production e-commerce application for Friesian Ranchwear. The repository contains the public storefront, customer accounts, Stripe checkout, order tracking, product and inventory administration, review moderation, and email capture.

Production: [friesianranchwear.com](https://friesianranchwear.com)

## Start here

- [System architecture](docs/architecture.md)
- [Domain model and invariants](docs/domain-model.md)
- [Operations and incident runbook](docs/operations.md)
- [Testing and release checks](docs/testing.md)
- [Design system](docs/design-system.md)
- [Engineering assessment and roadmap](docs/engineering-assessment.md)
- [Contributing workflow](CONTRIBUTING.md)

## Stack

| Concern | Implementation |
| --- | --- |
| Application | Next.js App Router, React, JavaScript |
| Database | PostgreSQL through Prisma |
| Authentication | NextAuth credentials and JWT sessions |
| Payments and tax | Stripe Payment Intents, Stripe Tax, webhooks |
| Product images | Cloudinary, with legacy Google Drive support |
| Mailing list | Google Sheets |
| Hosting | Railway |
| Optional telemetry | Sentry and consent-gated Google Analytics |
| Tests | Vitest and Playwright |

## Local setup

Requirements:

- Node.js 20
- PostgreSQL
- A `.env.local` based on `.env.example`

```bash
npm ci
npx prisma generate
npx prisma db push
npm run dev
```

`prisma db push` is acceptable only for a disposable local database. The production database does not yet have a migration history. Do not use `db push` against production. See [the database section of the engineering assessment](docs/engineering-assessment.md#p0-before-the-next-payment-or-schema-feature).

## Verification

```bash
npm test
npm run test:integration
npm run test:e2e
npm run audit:prod
npm run build
```

`npm run check` runs the unit suite, high-severity production dependency audit, and production build. Browser tests run separately because they start a development server and require Playwright Chromium.

Integration tests require `DATABASE_URL` to point to a local PostgreSQL database named exactly `friesian_test`. The test runner refuses every other host or database name, synchronizes only that disposable schema, and then runs the database suite. See [the testing guide](docs/testing.md#postgresql-integration-tests).

## Deployment

Merges to `main` deploy automatically through Railway. The service is considered healthy only when `/api/health` can reach PostgreSQL. Stripe payment state is synchronized through `/api/webhooks/stripe`.

Read [docs/operations.md](docs/operations.md) before changing payments, environment variables, deployment configuration, or the production database.

## License

Proprietary. All rights reserved.
