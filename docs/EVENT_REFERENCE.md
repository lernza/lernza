# Event Reference

Every event emitted by Lernza's Soroban contracts. Indexers and off-chain listeners can subscribe to these topics via the Stellar RPC `getEvents` endpoint.

## How Soroban Events Work

Each event has:
- **Topics** — a tuple of `Symbol` values used for filtering (the first element is always the event name).
- **Data** — a tuple of values carrying the event payload.

Filter by topic using the Stellar RPC:

```bash
stellar contract events \
  --id <CONTRACT_ID> \
  --network testnet \
  --start-ledger <LEDGER>
```

---

## Quest Contract (`contracts/quest/`)

### `quest_created`

Emitted when a new quest is created via `create_quest`.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("quest_created"),)` | |
| `quest_id` | `u32` | Auto-assigned quest ID. |
| `owner` | `Address` | Quest owner address. |
| `name` | `String` | Quest name. |

**Data tuple:** `(quest_id, owner, name)`

---

### `quest_updated`

Emitted when quest metadata is changed via `update_quest`.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("quest_updated"),)` | |
| `quest_id` | `u32` | ID of the updated quest. |

**Data tuple:** `(quest_id)`

---

### `quest_archived`

Emitted when a quest is archived via `archive_quest`.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("quest_archived"),)` | |
| `quest_id` | `u32` | ID of the archived quest. |

**Data tuple:** `(quest_id)`

---

### `enrollee_added`

Emitted when a learner is enrolled via `add_enrollee` or self-enrolls via `join_quest`.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("enrollee_added"),)` | |
| `quest_id` | `u32` | Quest the learner joined. |
| `enrollee` | `Address` | Enrolled learner address. |

**Data tuple:** `(quest_id, enrollee)`

---

### `enrollee_removed`

Emitted when a learner is removed via `remove_enrollee`. Not emitted for `leave_quest`.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("enrollee_removed"),)` | |
| `quest_id` | `u32` | Quest the learner was removed from. |
| `enrollee` | `Address` | Removed learner address. |

**Data tuple:** `(quest_id, enrollee)`

---

### `admin_transferred`

Emitted when contract admin is rotated via `transfer_admin`.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("admin_transferred"),)` | |
| `old_admin` | `Address` | Previous admin address. |
| `new_admin` | `Address` | New admin address. |

**Data tuple:** `(old_admin, new_admin)`

---

### `creator_verified`

Emitted when an admin verifies a creator address via `verify_creator`.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("creator_verified"),)` | |
| `creator` | `Address` | Verified creator address. |
| `admin` | `Address` | Admin who issued the verification. |
| `timestamp` | `u64` | Ledger timestamp of the event. |

**Data tuple:** `(creator, admin, timestamp)`

---

### `creator_verification_revoked`

Emitted when an admin revokes a creator's verification via `revoke_creator_verification`.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("creator_verification_revoked"),)` | |
| `addr` | `Address` | Address whose verification was revoked. |
| `revoked_by` | `Address` | Admin who issued the revocation. |
| `timestamp` | `u64` | Ledger timestamp of the event. |

**Data tuple:** `(addr, revoked_by, timestamp)`

---

## Milestone Contract (`contracts/milestone/`)

### `milestone_created`

Emitted when a milestone is created via `create_milestone` or `create_milestones_batch` (once per milestone).

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("milestone_created"),)` | |
| `milestone_id` | `u32` | Auto-assigned milestone ID within the quest. |
| `quest_id` | `u32` | Quest the milestone belongs to. |
| `reward_amount` | `i128` | Configured reward in token base units. |

**Data tuple:** `(milestone_id, quest_id, reward_amount)`

---

### `milestone_completed`

Emitted when an owner verifies a learner's completion via `verify_completion`.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("milestone_completed"),)` | |
| `quest_id` | `u32` | Quest containing the milestone. |
| `milestone_id` | `u32` | Completed milestone ID. |
| `enrollee` | `Address` | Learner who completed the milestone. |

**Data tuple:** `(quest_id, milestone_id, enrollee)`

---

### `peer_approved`

Emitted when peer review reaches the required approval threshold via `approve_completion`, auto-completing the milestone.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("peer_approved"),)` | |
| `milestone_id` | `u32` | Milestone that was approved. |
| `quest_id` | `u32` | Quest containing the milestone. |
| `enrollee` | `Address` | Learner whose submission was approved. |
| `peer` | `Address` | Address that cast the final approving vote. |
| `reward_amount` | `i128` | Reward amount unlocked (may be `0` in Competitive mode if cap was exceeded). |

**Data tuple:** `(milestone_id, quest_id, enrollee, peer, reward_amount)`

---

### `certificate_minted` (from milestone contract)

Emitted by the milestone contract when a learner completes all milestones in a quest and a certificate is minted. This is a lightweight notification event; the canonical certificate event with full metadata is emitted by the certificate contract itself.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("certificate_minted"),)` | |
| `quest_id` | `u32` | Quest that was fully completed. |
| `enrollee` | `Address` | Learner who received the certificate. |

**Data tuple:** `(quest_id, enrollee)`

---

## Rewards Contract (`contracts/rewards/`)

> **Indexer migration note (workspace → quest).** Earlier deployments of the rewards contract (pre-PR #412 / commit `1bcc507`) used `workspace_*` naming for the public surface. The current contract emits **only the `reward_funded` / `reward_distributed` / `reward_refunded` events documented below — `workspace_*` event symbols never existed in any released build.** Indexers should:
>
> - Filter on `Symbol("reward_funded" | "reward_distributed" | "reward_refunded")`. No backwards-compatible aliases are emitted; nothing to migrate at the event topic layer.
> - Update any function-call references the indexer reads from operation envelopes: `fund_workspace` → `fund_quest`, parameter `workspace_id` → `quest_id`.
> - Update storage-key probes if the indexer reads `DataKey` ledger entries directly: `WorkspaceAuthority(u32)` → `QuestAuthority(u32)`, `WorkspacePool(u32)` → `QuestPool(u32)`.
>
> Old testnet deployments still on the pre-rename WASM should be redeployed; the on-chain interface is incompatible.

### `reward_funded`

Emitted when a quest pool is funded via `fund_quest`.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("reward_funded"),)` | |
| `quest_id` | `u32` | Quest whose pool was funded. |
| `funder` | `Address` | Address that deposited tokens. |
| `amount` | `i128` | Amount deposited in token base units. |

**Data tuple:** `(quest_id, funder, amount)`

---

### `reward_distributed`

Emitted when a reward is paid to a learner via `distribute_reward`.

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

Emitted when unallocated pool tokens are returned to the authority via `refund_pool`.

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

Emitted when an NFT certificate is minted via `mint_certificate` or `mint_quest_certificate`.

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("certificate_minted"),)` | |
| `token_id` | `u32` | NFT token ID assigned to this certificate. |
| `quest_id` | `u32` | Quest the certificate is for. |
| `recipient` | `Address` | Learner who received the certificate. |
| `quest_name` | `String` | Name of the completed quest. |

**Data tuple:** `(token_id, quest_id, recipient, quest_name)`

---

### `certificate_revoked`

Emitted when a certificate NFT is burned via `revoke_certificate` (owner-only, exceptional cases).

| Field | Type | Description |
|:------|:-----|:------------|
| **Topics** | `(Symbol("certificate_revoked"),)` | |
| `token_id` | `u32` | NFT token ID that was revoked. |
| `quest_id` | `u32` | Quest the certificate was for. |
| `recipient` | `Address` | Learner whose certificate was revoked. |

**Data tuple:** `(token_id, quest_id, recipient)`

---

## Summary Table

| Contract | Event | Emitter Function |
|:---------|:------|:-----------------|
| Quest | `quest_created` | `create_quest` |
| Quest | `quest_updated` | `update_quest` |
| Quest | `quest_archived` | `archive_quest` |
| Quest | `enrollee_added` | `add_enrollee`, `join_quest` |
| Quest | `enrollee_removed` | `remove_enrollee` |
| Quest | `admin_transferred` | `transfer_admin` |
| Milestone | `milestone_created` | `create_milestone`, `create_milestones_batch` |
| Milestone | `milestone_completed` | `verify_completion` |
| Milestone | `peer_approved` | `approve_completion` |
| Milestone | `certificate_minted` | `verify_completion`, `approve_completion` (on full quest completion) |
| Rewards | `reward_funded` | `fund_quest` |
| Rewards | `reward_distributed` | `distribute_reward` |
| Rewards | `reward_refunded` | `refund_pool` |
| Certificate | `certificate_minted` | `mint_certificate`, `mint_quest_certificate` |
| Certificate | `certificate_revoked` | `revoke_certificate` |

## Keeping This Document in Sync

A CI grep step in `.github/workflows/docs-check.yml.bak` validates that every event symbol referenced here exists in the contract source. To verify locally:

```bash
node scripts/check-docs.js
```
