# Engineering documentation

These documents distinguish the deployed production base from the reviewed September 10,
2026 release candidate. They are part of the codebase and should change in the same pull
request when implementation or verified operating state changes.

## Documents

| Document | Purpose |
| --- | --- |
| [Architecture](architecture.md) | Runtime model, boundaries, routes, and major request flows |
| [Domain model](domain-model.md) | Entities, state transitions, ownership, and invariants |
| [Operations](operations.md) | Deployment, configuration, external services, incidents, and rollback |
| [Testing](testing.md) | Current coverage, local commands, CI, and release checks |
| [Database migrations](database-migrations.md) | Baseline, expand migration, maintenance-window rollout, and recovery guards |
| [Payment operations](payment-operations.md) | Checkout attempts, event projection, Tax operations, reconciliation, and access boundaries |
| [Design system](design-system.md) | Visual language, tokens, component rules, and design debt |
| [Engineering assessment](engineering-assessment.md) | Evidence-based maturity review and prioritized roadmap |
| [Decisions](decisions/README.md) | Architecture decision record process and template |

## Documentation rule

Documentation is not a replacement for tests or code. It records behavior that a new engineer cannot safely infer from one file, especially payment authority, inventory ownership, deployment assumptions, data handling, and cross-service recovery.

If code and documentation disagree, verify production behavior, fix the incorrect source, and update both in one change.
