# Architecture Decision Records (ADRs)

Architecture Decision Records (ADRs) capture key architectural choices made in the Lernza protocol, their context, rationale, evaluated alternatives, and consequences.

## Creating a New ADR

To propose or document an architecture change:
1. Copy the [ADR Template](template.md).
2. Assign the next sequential number (e.g. `010-feature-title.md`).
3. Fill out the `Context`, `Decision`, `Alternatives`, and `Consequences` sections.
4. Submit a Pull Request and reference the ADR in related feature PRs.

---

## ADR Index

| ADR | Title | Status | Date | Summary |
|-----|-------|--------|------|---------|
| [ADR-001](001-quest-entity-model-and-naming.md) | Quest Entity Model and Naming | Accepted | 2026-03-25 | Establishes core terminology (Quest, Milestone, Enrollee, Reward Pool). |
| [ADR-002](002-three-contract-architecture.md) | Three-Contract Architecture | Accepted | 2026-03-25 | Splits core domain across Quest, Milestone, and Rewards smart contracts. |
| [ADR-003](003-frontend-orchestration-pattern.md) | Frontend Orchestration Pattern | Accepted | 2026-03-25 | Uses frontend application for multi-contract transaction workflow sequencing. |
| [ADR-004](004-stellar-asset-contract-token-handling.md) | Stellar Asset Contract Token Handling | Accepted | 2026-03-25 | Integrates standard SEP-41 Stellar Asset Contracts for reward token custody. |
| [ADR-005](005-storage-patterns-and-ttl-strategy.md) | Storage Patterns and TTL Strategy | Accepted | 2026-03-25 | Defines 3-tier storage durability policy and 30-day TTL bumping rules. |
| [ADR-006](006-storage-tier-optimization-and-caching.md) | Storage Tier Optimization and Caching | Accepted | 2026-03-26 | Implements gas-optimized read/write caching and storage tiering. |
| [ADR-006B](ADR-006-contract-address-validation.md) | Contract Address Validation | Accepted | 2026-03-26 | Enforces address validation checks across inter-contract parameter calls. |
| [ADR-007](007-admin-multisig-timelock.md) | Admin Multi-Sig and Timelock Migration | Accepted | 2026-03-27 | Plans mainnet transition from single admin key to 2-of-3 multi-sig + timelock. |
| [ADR-008](008-bump-threshold-rationale.md) | Bump Threshold Rationale | Accepted | 2026-03-28 | Establishes mathematical rationale for ledger TTL bump thresholds. |
| [ADR-009](009-contract-upgrade-and-migration-strategy.md) | Contract Upgrade and Migration Strategy | Accepted | 2026-08-27 | Defines in-place WASM code replacement, release artifacts, and lazy state migration. |
