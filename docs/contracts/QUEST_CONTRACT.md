# Quest Contract Architecture

The `quest` crate (`contracts/quest/`) is Lernza's entry-point contract — the
factory and system of record for the `Quest` entity. This document is a
deep-dive on its design, storage layout, and interaction patterns, one level
below the platform-wide summary in [`CONTRACTS_OVERVIEW.md`](../CONTRACTS_OVERVIEW.md)
and the cross-contract sequence diagrams in [`ARCHITECTURE.md`](../ARCHITECTURE.md).

> Historical note: earlier drafts of this contract and some still-migrating
> identifiers refer to the same concept as "workspace" (see
> [ADR-001](../adr/001-quest-entity-model-and-naming.md)). There is no
> separate "QuestFactory" contract — `quest` *is* the factory: every other
> contract (`milestone`, `rewards`, `certificate`) treats a `quest_id` minted
> here as the root of truth and reads `QuestInfo` back from this contract to
> authorize its own calls.

## Role in the system

`quest` owns three responsibilities and nothing else:

1. **Identity** — mint quest IDs and store `QuestInfo` (name, description,
   category, tags, token, deadline, status, versioning).
2. **Access lists** — track who owns a quest and who is enrolled in it, plus
   the indexes needed to query both directions and to browse public quests.
3. **Enrollment policy** — decide who may join (open, owner-added, or
   invite-gated) and enforce it independent of any reward logic.

It deliberately does **not** know about milestones or tokens. `milestone`
and `rewards` both hold a `QuestClient` (a `#[contractclient]` view of this
contract's `get_quest`) and call it read-only to verify ownership, status,
and deadlines before they act — see
[ADR-002: Three-Contract Architecture](../adr/002-three-contract-architecture.md)
for why that split exists. `quest` never calls out to the other contracts —
it is the one dependency-free contract among the four, which means it can be
deployed and upgraded independently of `milestone`/`rewards`/`certificate`.

## Data model

### `QuestInfo` (shared in `common`, persistent storage)

```rust
pub struct QuestInfo {
    pub id: u32,
    pub owner: Address,
    pub name: String,
    pub description: String,
    pub category: String,
    pub tags: Vec<String>,
    pub token_addr: Address,      // reward token, validated as a contract address
    pub created_at: u64,
    pub visibility: Visibility,   // Public | Private
    pub status: QuestStatus,      // Active | Archived
    pub deadline: u64,            // 0 = no deadline
    pub archived_at: u64,         // 0 until archive_quest() is called
    pub max_enrollees: Option<u32>,
    pub verified: bool,           // snapshotted from is_creator_verified() at creation
    pub version: u32,             // starts at 1, incremented by update_quest()
}
```

`QuestInfo`, `QuestStatus`, and `Visibility` live in the `common` crate (not
`quest`) so `milestone` and `rewards` can decode the same struct from a
cross-contract call without depending on the `quest` crate itself.

`verified` is a **snapshot**, not a live lookup: it is copied from
`is_creator_verified(owner)` at `create_quest` time. Verifying or revoking a
creator's status afterwards does not retroactively change the `verified` flag
on quests they already created — this is intentional so a quest's displayed
trust signal doesn't change out from under enrollees mid-quest.

### `DataKey` (persistent storage keys)

| Key | Value | Purpose |
|---|---|---|
| `NextId` (instance) | `u32` | Auto-incrementing quest ID counter |
| `Quest(u32)` | `QuestInfo` | The quest record itself |
| `Enrollees(u32)` | `Vec<Address>` | Enrollee list for a quest, insertion order |
| `PublicQuests` | `Vec<u32>` | IDs of every `Visibility::Public` quest, for `list_public_quests` |
| `PublicCategoryQuests(String)` | `Vec<u32>` | Public quest IDs bucketed by category |
| `OwnerQuests(Address)` | `Vec<u32>` | Reverse index: quests an address owns |
| `EnrolleeQuests(Address)` | `Vec<u32>` | Reverse index: quests an address is enrolled in |
| `QuestVersionHistory(u32)` | `Vec<QuestVersion>` | Snapshots of prior field values, appended by `update_quest` |
| `InviteCommitment(u32, BytesN<32>)` | `bool` | Registered invite hash for a quest, keyed by `(quest_id, sha256(preimage))` |
| `InviteUsed(u32, BytesN<32>)` | `bool` | Marks a commitment as redeemed, prevents replay |
| `LeaveHold(u32, Address)` | `bool` | Owner-placed hold blocking `leave_quest` for an enrollee mid peer-review |
| `VerifiedCreator(Address)` | `bool` | Admin-managed allowlist consulted at `create_quest` time |
| `Admin` / `Paused` (instance) | `Address` / `bool` | Contract-wide admin and kill-switch |

**Storage tier choice**: `Admin`, `Paused`, and `NextId` live in *instance*
storage (cheap, always resident, but shared TTL across the whole contract).
Everything keyed by quest ID or address lives in *persistent* storage so each
quest's cost and TTL are independent — a quest nobody reads can be left to
expire without affecting others. See
[ADR-005](../adr/005-storage-patterns-and-ttl-strategy.md) for the general
policy this follows.

### Versioning

`update_quest` never mutates `QuestInfo` in place without a trail: before
writing the new field values it pushes the *previous* values (as a
`QuestVersion` snapshot) onto `QuestVersionHistory(quest_id)`, then
increments `quest.version`. `get_quest_version_history` returns the list
oldest-first. There is no cap on history length today — every update adds one
entry — so integrators building on top of a very long-lived, frequently
edited quest should be aware the history vector grows unbounded.

## Interaction patterns

### Auth model

Every mutating function follows the same shape: resolve the acting
`Address` from an explicit parameter (never `env.invoker()`), then call
`.require_auth()` on it before touching storage. Two authorization roles
exist:

- **Owner-only**: `update_quest`, `archive_quest`, `add_enrollee`,
  `remove_enrollee`, `register_invite`, `revoke_invite`, `set_deadline`,
  `set_visibility`, `place_leave_hold`, `lift_leave_hold`. These load the
  quest first, then check `quest.owner == caller` (or rely on `require_auth`
  on the field read directly off the loaded quest — see `archive_quest` and
  `set_deadline`, which call `quest.owner.require_auth()` instead of taking a
  separate `owner` parameter, so there is no way to pass a mismatched
  address).
- **Self-service**: `join_quest`, `join_quest_with_invite`, and `leave_quest`
  authenticate the enrollee themselves, not the owner.
- **Admin-only**: `verify_creator`, `revoke_creator_verification`, `pause`,
  `unpause`, `transfer_admin` — gated by `require_admin`, which compares
  against the single `Admin` instance-storage address (no multisig/timelock
  at this layer; see [ADR-007](../adr/007-admin-multisig-timelock.md) for
  the platform-wide admin-key posture).

### Pause switch

`require_not_paused` is checked at the top of every mutating entry point
(creation, updates, enrollment, invites, holds). Pure reads (`get_quest`,
`list_public_quests`, `is_expired`, …) intentionally skip the check — the
contract can be frozen for writes without also blocking the frontend's
ability to display existing quests.

### Enrollment: three paths, one invariant

`quest` supports three ways to add an enrollee, all converging on the same
`Enrollees(quest_id)` list and the same guard rails (not archived, deadline
not passed, under `max_enrollees`, not already enrolled):

1. **`add_enrollee`** — owner adds someone directly. Emits
   `enrollee_added` with `join_mode = "owner"`.
2. **`join_quest`** — self-serve join, only allowed when
   `visibility == Public`. Emits `enrollee_added` with `join_mode = "self"`.
3. **`join_quest_with_invite`** — commit-reveal flow for `Private` quests
   (and optionally public ones that want single-use codes): the owner calls
   `register_invite` with `sha256(secret)` computed off-chain, hands the raw
   `secret` to the intended learner out of band, and the learner calls this
   function with the preimage. The contract hashes it, checks the commitment
   is registered and unused, marks it used, then enrolls. The secret itself
   never touches the chain until redemption, so it can't be front-run by
   watching pending transactions.

`leave_quest` is the inverse of `add_enrollee`/`join_quest`, but it is
enrollee-authenticated and can be blocked: if the owner has called
`place_leave_hold` for that `(quest_id, enrollee)` pair — used while a
peer-review submission from that enrollee is in flight in the `milestone`
contract — `leave_quest` returns `LeaveBlockedByPendingApproval` until the
owner calls `lift_leave_hold`. This exists purely so `milestone`'s
peer-review bookkeeping never ends up pointing at an address that quietly
un-enrolled mid-review.

### Reads are visibility-blind

`Visibility::Private` only removes a quest from the *discovery* indexes
(`PublicQuests`, `PublicCategoryQuests`). It is not access control:
`get_quest`, `get_enrollees`, `is_enrollee`, and `get_quest_version_history`
all work on any quest ID regardless of visibility, as documented inline in
the source. Anyone who already has the ID (e.g., from an invite link) can
read it directly; "Private" only means "not on the public list."

### Query/index maintenance

Four `Vec<u32>`-based indexes (`PublicQuests`, `PublicCategoryQuests`,
`OwnerQuests`, `EnrolleeQuests`) back the `list_*` query functions. They are
maintained by two small helpers, `add_id_to_index` / `remove_id_from_index`,
called from `create_quest`, `update_quest` (on category or visibility
change), and enrollment/removal. There is no secondary index by name or
deadline — category and owner/enrollee are the only supported filters at the
contract level; anything else (search, sort) is expected to happen in the
frontend once it has paginated through `list_public_quests` /
`get_quests_by_category`.

### TTL bumping

Every mutating call ends by calling `Self::bump(&env, quest_id)`, which
extends the TTL (see [`BUMP`/`THRESHOLD`](../adr/008-bump-threshold-rationale.md))
on the instance storage plus the quest's own `Quest`, `Enrollees`, and
`QuestVersionHistory` entries. Reads that touch persistent keys (`get_quest`,
`get_enrollees`, `is_creator_verified`, the `list_*` functions) also extend
TTL on the keys they read, so an actively-queried quest never silently
expires even without writes.

## Error surface

`quest::Error` uses the shared low-numbered codes from `common`
(`NotFound = 1`, `Unauthorized = 2`, `InvalidInput = 3`) plus contract-local
codes for domain-specific rejections: `AlreadyEnrolled`, `NotEnrolled`,
`QuestFull`, `QuestArchived`, `NameTooLong`, `DescriptionTooLong`,
`InviteOnly`, `LeaveBlockedByPendingApproval`, `EnrollmentClosed`,
`DeadlineExpired`, `InvalidInvite`, `InviteAlreadyUsed`, and the shared
`Paused = 400`. Note `EnrollmentClosed` (archived) and `QuestArchived`
(same underlying condition, different call sites) are distinct variants kept
for stable ABI reasons — error codes are wire-format and must stay stable
across upgrades, so existing codes are never renumbered or reused. See
[`docs/contracts/ERROR_CONVENTIONS.md`](ERROR_CONVENTIONS.md) for the
project-wide numbering rules and the full per-contract error tables.

## What other contracts read from here

| Caller | Function called | Why |
|---|---|---|
| `rewards::fund_quest` | `get_quest` | Confirms the funder is the quest owner and the quest's configured token matches the rewards pool's token |
| `rewards::refund_pool` / `refund_unused_pool` | `get_quest` | Confirms `status == Archived` and reads `archived_at` for the grace-period check |
| `rewards::refund_expired_pool` | `get_quest` | Reads `deadline` directly — this path deliberately does **not** require `Archived`, so an abandoned quest is still recoverable (issue #1187) |
| `milestone::verify_completion` | `get_quest`, `is_enrollee` | Confirms the caller is the quest owner and the enrollee is actually enrolled before recording a completion |
| `milestone::approve_completion` | `is_enrollee` | Confirms the approving peer is themselves enrolled in the quest (no owner check — peer review doesn't require the owner) |

Both go through `milestone`'s private `is_enrolled` helper, which cross-calls
`quest::is_enrollee` rather than trusting a client-supplied flag — see
`contracts/milestone/src/lib.rs`.

Because these calls are read-only (`get_quest`, `is_enrollee`, `is_expired`),
`quest` never needs to grant or check auth for cross-contract callers — it
answers the same way for any caller, contract or account.

## Related documents

- [`CONTRACTS_OVERVIEW.md`](../CONTRACTS_OVERVIEW.md) — one-page summary of all five contracts
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) — end-to-end sequence diagrams (creation, enrollment, funding, verification, refunds)
- [ADR-001](../adr/001-quest-entity-model-and-naming.md) — why "Quest" and the workspace-naming transition
- [ADR-002](../adr/002-three-contract-architecture.md) — why `quest`/`milestone`/`rewards` are separate contracts with no cross-contract writes
- [ADR-005](../adr/005-storage-patterns-and-ttl-strategy.md) / [ADR-006](../adr/006-storage-tier-optimization-and-caching.md) — storage tier and TTL policy this contract follows
- [`docs/contracts/ERROR_CONVENTIONS.md`](ERROR_CONVENTIONS.md) — shared error-code numbering rules
