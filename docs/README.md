# Engineering documentation

These documents describe the deployed system as of July 15, 2026. They are part of the codebase and should change in the same pull request when the implementation changes.

## Documents

| Document | Purpose |
| --- | --- |
| [Architecture](architecture.md) | Runtime model, boundaries, routes, and major request flows |
| [Domain model](domain-model.md) | Entities, state transitions, ownership, and invariants |
| [Operations](operations.md) | Deployment, configuration, external services, incidents, and rollback |
| [Testing](testing.md) | Current coverage, local commands, CI, and release checks |
| [Design system](design-system.md) | Visual language, tokens, component rules, and design debt |
| [Engineering assessment](engineering-assessment.md) | Evidence-based maturity review and prioritized roadmap |
| [Decisions](decisions/README.md) | Architecture decision record process and template |

## Documentation rule

Documentation is not a replacement for tests or code. It records behavior that a new engineer cannot safely infer from one file, especially payment authority, inventory ownership, deployment assumptions, data handling, and cross-service recovery.

If code and documentation disagree, verify production behavior, fix the incorrect source, and update both in one change.
