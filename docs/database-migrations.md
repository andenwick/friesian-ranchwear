# Database migrations

The migration history begins with `prisma/migrations/0_init`. It represents the
schema that existed before migrations were introduced; it is not an instruction
to recreate populated tables.

## Existing production database

On September 10, 2026, an authorized read-only production export was restored into
isolated local PostgreSQL 17. It matched the exact baseline; the additive migration
applied; all eight application-table counts were preserved; and negative-stock,
invalid-money, orphan-order-item, and orphan-attempt checks were zero. No production
write occurred. This proves the fresh logical-export migration path, not Railway
snapshot/PITR restore, provider truth, production RTO, or off-device key recovery.

Do not run production migration commands until a fresh release-time backup has been
restored and the schema comparison is still clean. With an explicitly approved
production connection and exact SQL:

1. Compare tables, columns, indexes, constraints, enum values, and Prisma's
   generated baseline with the live schema.
2. Restore a fresh logical export into a disposable PostgreSQL database and run
   application/schema/data smoke checks.
3. Mark only the baseline as already applied:
   `npx prisma migrate resolve --applied 0_init`.
4. Run `npx prisma migrate status`, review the exact pending SQL, then use
   `npx prisma migrate deploy` only under the approved release plan.

Never use `prisma db push` against production. `migrate resolve` changes migration
metadata and therefore also requires explicit production authorization.

The first additive migration is an expand step: a legacy binary can still insert rows
because the new expected-payment amount is nullable and the payment status defaults to
`UNKNOWN`. That is schema compatibility, not safe mixed-version payment compatibility:
the hardened webhook intentionally refuses to bless `UNKNOWN` as paid.

Use a short approved maintenance window for the first rollout. Quiesce old checkout,
preserve Stripe webhook retry behavior, recheck legacy in-flight orders, take and
restore the release backup, mark the baseline, apply the additive migration, deploy
the exact hardened build, reconcile legacy pending/unknown work, and only then reopen
checkout. Do not invent or assume a feature flag. The September 10 snapshot contained
four cancelled and zero pending orders, but that must be rechecked at release time.

A later contract migration may make the expected amount required only after the
upgraded application is fully deployed and all null rows have been reconciled. The
legacy binary contains known payment defects and is not an approved operational
rollback target. If no corrected compatible build is available, keep all payment
processing quiescent. Prevent the old webhook and admin cleanup paths from mutating
reservations while preserving Stripe deliveries for later retry.

## Disposable verification

Migration replay uses a local database named exactly `friesian_test`. A fresh
replay proves that migration SQL can create the schema. A separate upgrade
rehearsal must create the baseline schema, mark `0_init` applied, load
representative non-sensitive fixtures, and then apply later migrations. Synthetic
fixtures remain useful for repeatability but do not replace the completed logical
production-export rehearsal or a future provider-managed snapshot/PITR restore.
