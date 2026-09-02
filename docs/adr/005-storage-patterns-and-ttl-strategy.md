# ADR-005: Storage Patterns and TTL Strategy

- **Status**: Accepted
- **Date**: 2026-03-25

## Context

Soroban storage is split across instance, persistent, and temporary durability classes, each with different rent cost, footprint, and lifecycle characteristics. Lernza needs a standardized rule for data storage so contracts remain affordable, state growth remains controlled, and data entries do not prematurely expire.

## Decision

Adopt a explicit 3-tier storage allocation policy and uniform TTL extension strategy:
- **Instance Storage**: Reserved for small contract-wide configuration parameters (e.g. `Admin`, `TokenAddress`, `NextQuestId`, `TotalDistributed`).
- **Persistent Storage**: Used for core domain state requiring permanent retention (e.g. Quests, Milestones, Enrollee Registrations, Pool Balances).
- **Temporary Storage**: Used exclusively for short-lived operational data (e.g. anti-spam rate limit cooldowns, session nonce checks).
- **TTL Strategy**: Standardize entry extension to `518,400` ledgers (~30 days) whenever entries are created or updated, with bump threshold set to `120,960` ledgers (~7 days).

## Alternatives

- **All-Instance Storage Pattern**:
  - *Description*: Store all user records, quests, and milestone entries directly inside the contract's instance data map.
  - *Rejection Rationale*: Instance storage payload expands with every new user and quest, dramatically increasing gas read/write costs for all contract functions due to inflating instance serialization size.
- **Pure Persistent Storage Without Active TTL Bumping**:
  - *Description*: Store everything in persistent storage without automated TTL extension in contract execution calls.
  - *Rejection Rationale*: Risk of data entries expiring into archived state if users do not manually call extend TTL, requiring expensive restoration operations.

## Consequences

- **Positive**: Controlled gas execution costs, predictable ledger rent footprints, and automatic state preservation for active quests.
- **Negative / Risks**: Continuous obligation to execute TTL bump calls in contract functions and track rent reserve allowances.
