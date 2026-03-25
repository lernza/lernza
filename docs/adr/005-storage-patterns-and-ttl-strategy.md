# ADR-005: Storage Patterns and TTL Strategy

- Status: Accepted
- Date: 2026-03-25

## Context

Soroban storage is split across instance, persistent, and temporary durability classes, each with different cost and lifecycle characteristics. Lernza needs a consistent rule for where data lives so that contracts remain affordable, predictable, and recoverable over time.

The current contracts already show clear storage categories:

- instance storage for contract-scoped configuration and counters such as `NextId`, `TokenAddr`, and `TotalDistributed`,
- persistent storage for long-lived business data such as quests, enrollees, milestone records, authorities, pool balances, and earnings, and
- temporary storage reserved for short-lived or easily recomputed state such as cooldowns, transient workflow markers, or other expiry-friendly data introduced later.

The contracts also standardize on a TTL policy using `BUMP = 518_400` ledgers and `THRESHOLD = 120_960` ledgers, which the README documents as approximately 30 days and 7 days.

## Decision

Adopt the following storage policy across Lernza contracts:

- use instance storage for per-contract metadata, counters, and configuration that is small in scope and tied to the contract instance,
- use persistent storage for user-facing business state that must survive over time and cannot be safely discarded, and
- use temporary storage only for short-lived state that can expire without harming core business integrity.

Adopt a shared TTL strategy for long-lived contract data:

- bump contract-managed entries to `518_400` ledgers,
- refresh entries when they are created or materially updated, and
- extend entries again once they approach the `120_960`-ledger threshold.

## Consequences

This gives contributors a clear rubric for modeling new state and keeps storage behavior consistent across contracts.

Separating storage by durability reduces unnecessary persistence costs for ephemeral data while protecting the records that define quests, milestones, balances, and authorization.

The trade-off is that TTL management becomes an explicit maintenance concern. Developers must remember to extend relevant entries as part of normal contract operations, and future features that introduce temporary state must be deliberate about what can safely expire.
