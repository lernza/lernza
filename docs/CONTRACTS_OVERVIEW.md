# Contracts Overview

Quick reference for the five Soroban smart contracts in this repository. Each section covers purpose, initialization, key state, and key events.

---

## 1. common — Shared Types and Utilities

**Purpose:** Reusable types and constants used by all other contracts. Eliminates duplication of `QuestInfo`, `QuestStatus`, `Visibility`, TTL constants, and address validation helpers.

**Key Types:**
- `QuestInfo` — struct with id, owner, name, description, category, tags, token_addr, created_at, visibility, status, deadline, archived_at, max_enrollees, verified
- `QuestStatus` — enum: `Active`, `Archived`
- `Visibility` — enum: `Public`, `Private`

**Key Constants:**
- `BUMP: u32 = 518_400` — ~30 days TTL for persistent storage
- `THRESHOLD: u32 = 120_960` — ~7 days refresh threshold
- `MAX_REWARD_AMOUNT: i128 = 1_000_000_000_000_000` — max single reward

**No initialization or events.** Import this crate in other contracts to access shared types.

---

## 2. quest — Quest Creation and Enrollment

**Purpose:** Entry point for the Lernza platform. Owners create quests, enroll learners, manage quest metadata (name, description, category, tags, deadline, max enrollees). Acts as the source of truth for quest existence and enrollee lists.

**Initialization:**
```rust
// No explicit initialize — quest contract is self-contained.
// First create_quest call auto-increments NextId.
```

**Key State:**
- `NextId` — auto-incrementing quest ID counter
- `Quest(u32)` — QuestInfo per quest_id
- `Enrollees(u32)` — Vec<Address> per quest_id
- `OwnerQuests(Address)` — Vec<u32> of quests owned by an address
- `EnrolleeQuests(Address)` — Vec<u32> of quests a user is enrolled in

**Key Events:**
| Event | Data |
|-------|------|
| `quest_created` | quest_id, owner, name |
| `quest_updated` | quest_id |
| `quest_archived` | quest_id |
| `enrollee_added` | quest_id, enrollee_address |
| `enrollee_removed` | quest_id, enrollee_address |

---

## 3. milestone — Milestone Definition and Completion Verification

**Purpose:** Defines milestones per quest and tracks completions. Owner (or peer reviewers) verify that learners have completed milestone requirements, then the frontend triggers reward distribution via the rewards contract.

**Initialization:**
```rust
// No explicit initialize — milestone contract is self-contained.
// First create_milestone call caches the quest owner for auth.
```

**Key State:**
- `NextMilestoneId(u32)` — auto-incrementing milestone ID per quest
- `Milestone(u32, u32)` — MilestoneInfo per (quest_id, milestone_id)
- `Completed(u32, u32, Address)` — bool flag for (quest_id, milestone_id, enrollee)
- `Mode(u32)` — DistributionMode: `Custom`, `Flat`, or `Competitive`
- `VerificationMode(u32)` — `OwnerOnly` or `PeerReview(required_approvals)`

**Key Events:**
| Event | Data |
|-------|------|
| `milestone_created` | milestone_id, quest_id, reward_amount |
| `milestone_completed` | quest_id, milestone_id, enrollee |
| `peer_approved` | milestone_id, quest_id, enrollee, peer, reward_amount |

---

## 4. rewards — Token Pool Management and Distribution

**Purpose:** Holds token pools per quest and distributes rewards to learners. Quest owners fund their quest pools; when milestone completions are verified, tokens transfer to enrollees.

**Initialization:**
```rust
fn initialize(
    env: Env,
    token_addr: Address,          // SAC token (e.g., USDC)
    quest_contract_addr: Address, // for ownership verification
    milestone_contract_addr: Address, // for completion verification
) -> Result<(), Error>
```

**Key State:**
- `TokenAddr` — the SAC token contract address
- `QuestContractAddr` — reference to quest contract
- `MilestoneContractAddr` — reference to milestone contract
- `QuestAuthority(u32)` — who funded / controls a quest's pool
- `QuestPool(u32)` — token balance allocated to a quest
- `UserEarnings(Address)` — total earnings per user
- `PayoutRecord(u32, u32, Address)` — idempotency key for (quest, milestone, enrollee)

**Key Events:**
| Event | Data |
|-------|------|
| `reward_funded` | quest_id, funder, amount |
| `reward_distributed` | quest_id, milestone_id, enrollee, amount |
| `reward_refunded` | quest_id, authority, amount |

---

## 5. certificate — NFT Certificates for Quest Completion

**Purpose:** Mints ERC-721-style NFTs to certify quest completion. Uses Stellar's NFT standard (stellar_tokens::non_fungible). Optional contract — quests can opt into certificates for completed milestones.

**Initialization:**
```rust
fn __constructor(env: Env, owner: Address)
// Sets metadata base URI and contract owner via Ownable trait.
```

**Key State:**
- `CertificateMetadata(u32)` — metadata per token_id (quest_id, quest_name, quest_category, completion_date, issuer, recipient)
- `QuestCertificate(u32, Address)` — token_id for (quest_id, recipient) pair
- `UserCertificates(Address)` — Vec<token_id> per user
- `MetadataBase` — base URI for tokenURI resolution (Issue #719)
- `RevokedCertificate(u32)` — tombstone for revoked token_ids (Issue #720)

**Key Events:**
| Event | Data |
|-------|------|
| `certificate_minted` | token_id, quest_id, recipient, quest_name |
| `certificate_revoked` | token_id, quest_id, recipient |

---

## Contract Interaction Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   quest     │────▶│  milestone  │────▶│   rewards   │
│  (owner)    │     │  (verify)   │     │  (payout)   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                    │
       ▼                   │                    ▼
  enrollees          completions           tokens to
       │                   │                 enrollee
       ▼                   ▼
┌─────────────┐           │
│certificate  │───────────┘
│  (optional) │
└─────────────┘
```

1. **Owner** creates a quest in `quest` contract
2. **Learners** enroll via `quest` contract
3. **Owner** creates milestones in `milestone` contract
4. **Owner** verifies milestone completion → frontend calls `rewards::distribute_reward()`
5. **Optional** — owner calls `certificate::mint_certificate()` for completion proof

---

## Further Reading & Resource Costs

For detailed gas cost estimations, CPU/memory resource metering, and fee optimization guidance, see [GAS_COSTS.md](GAS_COSTS.md).