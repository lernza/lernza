# ADR-008: BUMP / THRESHOLD Rationale

- Status: Accepted
- Date: 2026-07-25

## Context

`contracts/common/src/lib.rs` defines two TTL constants used across every
contract's persistent and instance storage:

```rust
pub const BUMP: u32 = 518_400;
pub const THRESHOLD: u32 = 120_960;
```

ADR-005 establishes the *policy* of extending entries to `BUMP` ledgers and
refreshing them once they approach `THRESHOLD`, but it does not explain how
these two specific numbers were derived, or what it costs to maintain them.
New contributors reading the code have no way to tell whether `518_400` is
an arbitrary constant or a deliberately chosen value, which makes it harder
to reason about changing it later.

Soroban expresses storage lifetime in ledgers, not wall-clock time, and
Stellar's target ledger close time is 5 seconds. That conversion factor is
the basis for both constants.

### 30-day target

Lernza's data (quests, milestones, enrollees, reward pools) needs to survive
comfortably longer than a typical quest's active lifecycle without requiring
every read to also perform a write. 30 days was chosen as a durability
target because:

- It comfortably exceeds the expected duration of a single milestone cycle,
  so entries do not expire mid-quest under normal usage.
- It is short enough that abandoned or archived quests do not accumulate
  storage rent indefinitely without ever being touched again.

At 5-second ledger close times:

```
30 days = 30 * 24 * 60 * 60 seconds = 2,592,000 seconds
2,592,000 seconds / 5 seconds-per-ledger = 518,400 ledgers
```

This is exactly `BUMP`.

### 7-day refresh window

`THRESHOLD` determines how early, relative to expiry, an entry gets bumped
back up to `BUMP` on its next access. It is set to one quarter of `BUMP`:

```
7 days = 7 * 24 * 60 * 60 seconds = 604,800 seconds
604,800 seconds / 5 seconds-per-ledger = 120,960 ledgers
```

This is exactly `THRESHOLD`.

A 7-day window was chosen instead of refreshing on every single access
because:

- **Cost**: `extend_ttl` is not free — refreshing on every read would
  multiply the number of storage-extension operations (and their associated
  fees) by the read frequency of hot data such as `QuestInfo`. A quarter of
  the total TTL means an actively-used entry is typically re-extended once
  every several accesses rather than on every single one, while still
  never coming close to expiring.
- **Safety margin**: 7 days is generous enough that even infrequently
  accessed (but not abandoned) data — e.g. a quest an enrollee checks in on
  weekly — gets refreshed before expiry, without needing background jobs or
  keeper bots to touch idle entries.
- **Simplicity**: a clean quarter-of-`BUMP` ratio keeps the two constants
  easy to reason about and to re-derive if the 30-day target ever changes.

## Decision

Keep `BUMP = 518_400` (30 days at 5s/ledger) and `THRESHOLD = 120_960` (7
days at 5s/ledger, one quarter of `BUMP`) as the shared TTL constants for all
Lernza contracts, per the storage policy in ADR-005.

## Consequences

Contributors modifying storage code can now derive these numbers from first
principles (ledger close time × desired day count) instead of treating them
as magic numbers, and can recompute them consistently if Stellar's target
ledger close time or Lernza's durability requirements change.

If Stellar's average ledger close time changes materially from 5 seconds,
both constants should be recalculated from the same 30-day / 7-day targets
rather than left as stale ledger counts.

## Related ADRs

- ADR-005: Storage Patterns and TTL Strategy
- ADR-006: Storage Tier Optimization and Caching Strategy
