# Event Reference

Every event emitted by Lernza's Soroban contracts. Indexers and off-chain listeners can subscribe to topics via the Stellar RPC `getEvents` endpoint.

## How Soroban Events Work

Each event has:
- **Topics** — a tuple of `Symbol` values used for filtering. The first element is always the event name.
- **Data** — a tuple of values carrying the payload.

Query events via Stellar CLI:

```bash
stellar contract events \
  --id <CONTRACT_ID> \
  --network testnet \
  --start-ledger <LEDGER>
```

Or via Horizon/RPC JSON endpoint using the `getEvents` method with a `topicFilter`.

> **Note on topic symbols and Soroban's 32-byte limit.** All event topic strings in this document are ≤ 32 characters (the Soroban `Symbol` hard limit). Any topic listed here can be used directly as a filter value.

---

## Quest Contract (`contracts/quest/`)

### `quest_created`

Emitted when a new quest is created via `create_quest`.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("quest_created"),)` | |
| `quest_id` | `u32` | Auto-assigned quest ID. |
| `owner` | `Address` | Quest owner address. |
| `name` | `String` | Quest name at creation time. |

**Data tuple:** `(quest_id, owner, name)`

---

### `quest_updated`

Emitted when quest metadata is changed via `update_quest`. Only the fields that were actually updated are non-`None` in the payload; unchanged fields are `None`.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("quest_updated"),)` | |
| `quest_id` | `u32` | ID of the updated quest. |
| `new_version` | `u32` | Monotonically increasing version number after this update. |
| `name` | `Option<String>` | New name, or `None` if unchanged. |
| `description` | `Option<String>` | New description, or `None` if unchanged. |
| `category` | `Option<String>` | New category, or `None` if unchanged. |
| `tags` | `Option<Vec<String>>` | New tags, or `None` if unchanged. |
| `max_enrollees` | `Option<u32>` | New enrollment cap, or `None` if unchanged. |

**Data tuple:** `(quest_id, new_version, name, description, category, tags, max_enrollees)`

---

### `quest_archived`

Emitted when a quest is archived via `archive_quest`. Once archived, the quest no longer accepts enrollments. The `archived_at` timestamp is stored in `QuestInfo` and referenced by the rewards contract for refund window calculations.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("quest_archived"),)` | |
| `quest_id` | `u32` | ID of the archived quest. |

**Data tuple:** `(quest_id)`

---

### `quest_cancelled`

Emitted when a quest is cancelled. Once cancelled, the quest no longer accepts enrollments and pending milestones might be affected depending on the reward configuration.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("quest_cancelled"),)` | |
| `quest_id` | `u32` | ID of the cancelled quest. |

**Data tuple:** `(quest_id)`

---

### `enrollee_added`

Emitted when a learner is enrolled. The `join_mode` field distinguishes how they joined.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("enrollee_added"),)` | |
| `quest_id` | `u32` | Quest the learner joined. |
| `enrollee` | `Address` | Enrolled learner address. |
| `actor` | `Address` | Quest owner address (present for `add_enrollee` and `join_quest`; absent for `join_quest_with_invite` — see note). |
| `timestamp` | `u64` | Ledger timestamp at enrollment (present for `add_enrollee` and `join_quest`; absent for invite path). |
| `join_mode` | `Symbol` | `"owner"` when added via `add_enrollee`; `"self"` when self-enrolled via `join_quest`. |

> **Invite path difference.** `join_quest_with_invite` emits a shorter data tuple `(quest_id, enrollee)` without `actor`, `timestamp`, or `join_mode`. Indexers should handle both tuple shapes for this topic.

**Data tuple (owner / self-enroll):** `(quest_id, enrollee, actor, timestamp, join_mode)`

**Data tuple (invite):** `(quest_id, enrollee)`

---

### `enrollee_removed`

Emitted when a learner is removed by the owner via `remove_enrollee`. Not emitted when a learner unenrolls themselves via `leave_quest`.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("enrollee_removed"),)` | |
| `quest_id` | `u32` | Quest the learner was removed from. |
| `enrollee` | `Address` | Removed learner address. |

**Data tuple:** `(quest_id, enrollee)`

---

### `admin_transferred`

Emitted when the contract admin is rotated via `transfer_admin`.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("admin_transferred"),)` | |
| `old_admin` | `Address` | Previous admin address. |
| `new_admin` | `Address` | New admin address. |

**Data tuple:** `(old_admin, new_admin)`

---

### `creator_verified`

Emitted when an admin marks a creator address as verified via `verify_creator`. Verified creators have their `QuestInfo.verified` flag set to `true` on any quest they create.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("creator_verified"),)` | |
| `creator` | `Address` | Newly verified creator address. |
| `admin` | `Address` | Admin who issued the verification. |
| `timestamp` | `u64` | Ledger timestamp. |

**Data tuple:** `(creator, admin, timestamp)`

---

### `creator_verification_revoked`

Emitted when an admin revokes a creator's verified status via `revoke_creator_verification`.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("creator_verification_revoked"),)` | |
| `addr` | `Address` | Address whose verification was revoked. |
| `revoked_by` | `Address` | Admin who revoked it. |
| `timestamp` | `u64` | Ledger timestamp. |

**Data tuple:** `(addr, revoked_by, timestamp)`

---

## Common Events

These events are emitted by the common library (e.g. `contracts/common/src/lib.rs`) and can appear in the event stream of any contract that uses cross-contract calls.

### `cross_contract_call`

Emitted for outgoing cross-contract call attempts.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("cross_contract_call"),)` | |
| `caller_contract` | `Address` | Address of the contract making the call. |
| `target_contract` | `Address` | Address of the contract being called. |
| `method_symbol` | `Symbol` | Method being invoked. |
| `params` | `String` | Serialized or stringified parameters. |

**Data tuple:** `(caller_contract, target_contract, method_symbol, params)`

---

### `cross_contract_return`

Emitted for cross-contract call returns.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("cross_contract_return"),)` | |
| `caller_contract` | `Address` | Address of the contract making the call. |
| `target_contract` | `Address` | Address of the contract being called. |
| `method_symbol` | `Symbol` | Method that was invoked. |
| `success` | `bool` | Whether the call was successful. |
| `result` | `String` | Serialized or stringified return value or error. |

**Data tuple:** `(caller_contract, target_contract, method_symbol, success, result)`

---

## Milestone Contract (`contracts/milestone/`)

### `milestone_created`

Emitted once per milestone created via `create_milestone`. For batch creation via `create_milestones_batch`, this event is emitted once per milestone in the batch within the same transaction.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("milestone_created"),)` | |
| `milestone_id` | `u32` | Auto-assigned milestone ID within the quest (zero-indexed). |
| `quest_id` | `u32` | Quest the milestone belongs to. |
| `reward_amount` | `i128` | Configured reward in token base units. |

**Data tuple:** `(milestone_id, quest_id, reward_amount)`

---

### `milestone_completed`

Emitted when an owner marks a learner's milestone as complete via `verify_completion` (owner-verification path only; for peer review see `peer_approved`).

> **Competitive mode note.** This event is emitted even when the `max_winners` cap is exceeded. In that case the learner is marked complete but earns `0`. Use the `reward_distributed` event from the rewards contract to track actual payouts.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("milestone_completed"),)` | |
| `quest_id` | `u32` | Quest containing the milestone. |
| `milestone_id` | `u32` | Completed milestone ID. |
| `enrollee` | `Address` | Learner who completed the milestone. |

**Data tuple:** `(quest_id, milestone_id, enrollee)`

---

### `peer_approved`

Emitted when peer review reaches the required approval threshold via `approve_completion`, which auto-completes the milestone. Not emitted for intermediate approvals that have not yet reached the threshold.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("peer_approved"),)` | |
| `milestone_id` | `u32` | Milestone that was approved. |
| `quest_id` | `u32` | Quest containing the milestone. |
| `enrollee` | `Address` | Learner whose submission was approved. |
| `peer` | `Address` | Address that cast the final approving vote. |
| `reward_amount` | `i128` | Reward amount unlocked (may be `0` in Competitive mode if the winner cap was already reached). |

**Data tuple:** `(milestone_id, quest_id, enrollee, peer, reward_amount)`

---

### `distribution_mode_set`

Emitted when the quest owner changes the reward distribution mode via `set_distribution_mode`. Indexers and frontends should listen for this to detect mid-quest rule changes and warn enrolled learners.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("distribution_mode_set"),)` | |
| `quest_id` | `u32` | Quest whose mode changed. |
| `mode` | `DistributionMode` | New distribution mode: `Custom`, `Flat`, or `Competitive(max_winners)`. |
| `flat_reward` | `i128` | Flat reward amount (non-zero only when `mode == Flat`; `0` otherwise). |
| `actor` | `Address` | Quest owner who made the change. |
| `timestamp` | `u64` | Ledger timestamp. |

**Data tuple:** `(quest_id, mode, flat_reward, actor, timestamp)`

---

### `certificate_minted` (milestone contract)

A lightweight notification event emitted by the **milestone contract** immediately after a successful cross-contract call to `Certificate.mint_quest_certificate`. The canonical certificate event with full metadata (including `token_id` and `quest_name`) is emitted by the certificate contract in the same transaction; this event is a convenience signal for indexers watching the milestone contract's event stream.

The emission is atomic with the milestone completion: if the certificate mint fails, the entire transaction (including this event and the completion tombstone) reverts.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("certificate_minted"),)` | |
| `quest_id` | `u32` | Quest that was fully completed. |
| `enrollee` | `Address` | Learner who received the certificate. |

**Data tuple:** `(quest_id, enrollee)`

---

### `certificate_mint_failed` (milestone contract)

Emitted by the **milestone contract** when `Certificate.mint_quest_certificate` returns an error. Because the mint happens atomically inside `verify_completion` or `approve_completion`, this event causes the entire transaction to revert — meaning neither the event nor the completion tombstone will ever be durably committed on-chain. In practice this event is only visible in failed/dry-run simulation output. Indexers watching confirmed ledger state will never observe it in a finalised transaction.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("certificate_mint_failed"),)` | |
| `quest_id` | `u32` | Quest where the mint failed. |
| `enrollee` | `Address` | Learner for whom minting was attempted. |

**Data tuple:** `(quest_id, enrollee)`

---

## Rewards Contract (`contracts/rewards/`)

### `reward_authority_assigned`

Emitted the first time a quest pool is funded via `fund_quest`. Records which address holds authority over the pool (and will receive any future refunds). Not re-emitted on subsequent top-ups by the same authority.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("reward_authority_assigned"),)` | |
| `quest_id` | `u32` | Quest whose authority was set. |
| `funder` | `Address` | Address assigned as quest authority. |

**Data tuple:** `(quest_id, funder)`

---

### `reward_funded`

Emitted on every successful `fund_quest` call, including top-ups after the initial funding.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("reward_funded"),)` | |
| `quest_id` | `u32` | Quest whose pool was funded. |
| `funder` | `Address` | Address that deposited tokens. |
| `amount` | `i128` | Amount deposited in token base units. |

**Data tuple:** `(quest_id, funder, amount)`

---

### `reward_distributed`

Emitted when a reward is paid to a learner via `distribute_reward`. The `PayoutRecord` idempotency key guarantees this event is emitted at most once per `(quest_id, milestone_id, enrollee)` triple.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("reward_distributed"),)` | |
| `quest_id` | `u32` | Quest the reward came from. |
| `milestone_id` | `u32` | Milestone the reward is for. |
| `enrollee` | `Address` | Learner who received the reward. |
| `amount` | `i128` | Amount paid in token base units. |

**Data tuple:** `(quest_id, milestone_id, enrollee, amount)`

---

### `reward_refunded`

Emitted when unallocated pool tokens are returned to the quest authority. Both `refund_pool` (partial refund) and `refund_unused_pool` (full sweep) emit this same topic.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("reward_refunded"),)` | |
| `quest_id` | `u32` | Quest whose pool was refunded. |
| `authority` | `Address` | Address that received the refund. |
| `amount` | `i128` | Amount refunded in token base units. |

**Data tuple:** `(quest_id, authority, amount)`

---

## Certificate Contract (`contracts/certificate/`)

### `certificate_minted`

Emitted by the **certificate contract** when an NFT certificate is minted via `mint_certificate` or `mint_quest_certificate`. This is the canonical event with full metadata. In the automated completion flow, both this event and the milestone contract's `certificate_minted` notification event are emitted in the same transaction.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("certificate_minted"),)` | |
| `token_id` | `u32` | NFT token ID assigned to this certificate. |
| `quest_id` | `u32` | Quest the certificate is for. |
| `recipient` | `Address` | Learner who received the certificate. |
| `quest_name` | `String` | Name of the completed quest at mint time. |

**Data tuple:** `(token_id, quest_id, recipient, quest_name)`

---

### `certificate_revoked`

Emitted when a certificate NFT is burned by the contract owner via `revoke_certificate`. After revocation, `is_revoked(token_id)` returns `true` and `get_certificate_metadata(token_id)` returns `NotFound`.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("certificate_revoked"),)` | |
| `token_id` | `u32` | NFT token ID that was revoked. |
| `quest_id` | `u32` | Quest the certificate was for. |
| `recipient` | `Address` | Learner whose certificate was revoked. |

**Data tuple:** `(token_id, quest_id, recipient)`

---

### `metadata_base_updated`

Emitted when the base metadata URI is changed via `set_metadata_base` (owner-only).

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("metadata_base_updated"),)` | |
| `uri` | `String` | New metadata base URI. |

**Data tuple:** `(uri)`

---

### `paused` / `unpaused`

Emitted when the certificate contract's pause state is toggled by the owner. Both events carry an empty data payload.

| Event | Topics | Data |
|:------|:-------|:-----|
| `paused` | `(Symbol("paused"),)` | `()` |
| `unpaused` | `(Symbol("unpaused"),)` | `()` |

---

## Summary Table

| Contract | Event topic | Emitting function(s) | When |
|:---------|:------------|:---------------------|:-----|
| Quest | `quest_created` | `create_quest` | New quest persisted |
| Quest | `quest_updated` | `update_quest` | Quest metadata changed |
| Quest | `quest_archived` | `archive_quest` | Quest status → Archived |
| Quest | `quest_cancelled` | `cancel_quest` | Quest status → Cancelled |
| Quest | `enrollee_added` | `add_enrollee`, `join_quest`, `join_quest_with_invite` | Learner enrolled |
| Quest | `enrollee_removed` | `remove_enrollee` | Owner removes learner |
| Quest | `admin_transferred` | `transfer_admin` | Admin address rotated |
| Quest | `creator_verified` | `verify_creator` | Creator badge granted |
| Quest | `creator_verification_revoked` | `revoke_creator_verification` | Creator badge revoked |
| Milestone | `milestone_created` | `create_milestone`, `create_milestones_batch` | Milestone added (once per milestone) |
| Milestone | `milestone_completed` | `verify_completion` | Owner verifies completion |
| Milestone | `peer_approved` | `approve_completion` | Peer threshold reached, milestone auto-completes |
| Milestone | `distribution_mode_set` | `set_distribution_mode` | Owner changes reward mode |
| Milestone | `certificate_minted` | `verify_completion`, `approve_completion` | All milestones done — notification only |
| Milestone | `certificate_mint_failed` | `verify_completion`, `approve_completion` | Cert mint failed — tx reverts, never finalised |
| Rewards | `reward_authority_assigned` | `fund_quest` | First fund for a quest |
| Rewards | `reward_funded` | `fund_quest` | Every fund call |
| Rewards | `reward_distributed` | `distribute_reward` | Reward transferred to learner |
| Rewards | `reward_refunded` | `refund_pool`, `refund_unused_pool` | Unused pool returned to authority |
| Certificate | `certificate_minted` | `mint_certificate`, `mint_quest_certificate` | NFT minted (canonical, includes token_id) |
| Certificate | `certificate_revoked` | `revoke_certificate` | NFT burned |
| Certificate | `metadata_base_updated` | `set_metadata_base` | Base URI changed |
| Certificate | `paused` | `pause` | Contract paused |
| Certificate | `unpaused` | `unpause` | Contract unpaused |
| Common | `cross_contract_call` | `log_cross_call` | Emitted when a cross-contract call is initiated |
| Common | `cross_contract_return` | `log_cross_return` | Emitted when a cross-contract call returns |

---

## Keeping This Document in Sync

A CI job (`event-doc-sync` in `.github/workflows/ci.yml`) runs `scripts/check-events.js` on every PR that touches contract source or `docs/EVENT_REFERENCE.md`. It extracts every `Symbol::new(&env, "...")` string from contract source and verifies each one appears in this document.

Run it locally:

```bash
node scripts/check-events.js
```

The script exits non-zero if any event symbol found in Rust source is absent from this document, catching drift before it reaches the index.
