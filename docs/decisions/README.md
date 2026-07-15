# Architecture decision records

Architecture decision records (ADRs) preserve the reason behind consequential technical choices. They supplement the current-state architecture document; they are not meeting notes or a log of every refactor.

## Write an ADR when a change

- changes a domain invariant or state model;
- introduces, replaces, or removes a production service;
- changes how data is stored, migrated, retained, or recovered;
- changes the payment, inventory, authentication, or authorization boundary;
- creates a convention that future changes must follow; or
- accepts a significant operational or security tradeoff.

Routine implementation choices, reversible UI details, and dependency patch updates usually do not need an ADR.

## Process

1. Copy [the template](0000-template.md).
2. Name it `NNNN-short-decision-name.md` using the next available number.
3. Open it as `Proposed` in the same pull request as the design discussion.
4. Record the chosen option, rejected alternatives, consequences, rollout, rollback, and validation.
5. Change the status to `Accepted` when the implementation is approved.
6. Never rewrite the history of an accepted decision. Add a new ADR with `Supersedes: NNNN` and mark the old record `Superseded`.

Allowed statuses are `Proposed`, `Accepted`, `Deprecated`, and `Superseded`.

## Quality rule

An ADR should let a future engineer understand the constraints and tradeoffs without reconstructing them from commit history. Keep it concise, factual, and specific to this system.
