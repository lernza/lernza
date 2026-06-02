# Contract API Reference

Public functions exposed by Lernza's four Soroban contracts.

- Quest contract: `contracts/quest/`
- Milestone contract: `contracts/milestone/`
- Rewards contract: `contracts/rewards/`
- Certificate contract: `contracts/certificate/`

## CLI Conventions

Examples assume:
- Network selected: `stellar network use testnet`
- Contracts deployed with aliases: `quest`, `milestone`, `rewards`, `certificate`
- Local identities created: `owner`, `learner`, `funder`

```bash
stellar network use testnet
stellar keys use owner
```

---

## Shared Types

### `QuestInfo`

Returned by `get_quest`, `list_public_quests`, `list_quests_by_owner`, `list_quests_by_enrollee`.

| Field | Type | Description |
|:------|:-----|:------------|
| `id` | `u32` | Auto-incremented quest ID. |
| `owner` | `Address` | Quest owner address. |
| `name` | `String` | Quest title (max 64 chars). |
| `description` | `String` | Quest description (max 2000 chars). |
| `category` | `String` | Category string for discovery. |
| `tags` | `Vec<String>` | Up to 5 tags (max 32 chars each). |
| `token_addr` | `Address` | Reward token contract address (SAC). |
| `created_at` | `u64` | Ledger timestamp at creation. |
| `visibility` | `Visibility` | `Public` or `Private`. |
| `status` | `QuestStatus` | `Active` or `Archived`. |
| `deadline` | `u64` | Unix timestamp deadline; `0` means no deadline. |
| `archived_at` | `u64` | Timestamp when archived; `0` if not archived. |
| `max_enrollees` | `Option<u32>` | Enrollment cap; `None` means unlimited. |
| `verified` | `bool` | Whether the creator was verified at creation time. |

### `MilestoneInfo`

Returned by `get_milestone`, `get_milestones`, `list_milestones`.

| Field | Type | Description |
|:------|:-----|:------------|
| `id` | `u32` | Auto-incremented milestone ID within a quest. |
| `quest_id` | `u32` | Quest this milestone belongs to. |
| `title` | `String` | Milestone title (max 128 chars). |
| `description` | `String` | Milestone description (max 1000 chars). |
| `reward_amount` | `i128` | Reward in token base units. |
| `requires_previous` | `bool` | If `true`, previous milestone must be completed first. |

### `Visibility`

| Variant | Description |
|:--------|:------------|
| `Public` | Quest appears in `list_public_quests` and category queries. |
| `Private` | Quest is hidden from discovery helpers. Direct reads by ID still work. |

### `VerificationMode`

| Variant | Description |
|:--------|:------------|
| `OwnerOnly` | Only the quest owner can verify completions (default). |
| `PeerReview(u32)` | Requires `u32` peer approvals to auto-complete. |

### `DistributionMode`

| Variant | Description |
|:--------|:------------|
| `Custom` | Each milestone pays its own `reward_amount` (default). |
| `Flat` | All milestones pay the same flat reward set via `set_distribution_mode`. |
| `Competitive(u32)` | First `u32` completers earn the reward; the rest earn 0. |

---

## Quest Contract

Source: `contracts/quest/src/lib.rs`

### `initialize`

One-time setup. Sets the contract admin.

```rust
initialize(env: Env, admin: Address) -> Result<(), Error>
```

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `admin` | `Address` | Admin address. |

Errors: `Unauthorized` if already initialized.

```bash
stellar contract invoke --id quest -- initialize --admin owner
```

---

### `create_quest`

Create a new quest. Returns the quest ID.

```rust
create_quest(
    owner: Address,
    name: String,
    description: String,
    category: String,
    tags: Vec<String>,
    token_addr: Address,
    visibility: Visibility,
    max_enrollees: Option<u32>,
) -> Result<u32, Error>
```

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `owner` | `Address` | Quest owner. Must authorize. |
| `name` | `String` | Quest title (max 64 chars, non-blank). |
| `description` | `String` | Quest description (max 2000 chars, non-blank). |
| `category` | `String` | Category for discovery. |
| `tags` | `Vec<String>` | Up to 5 tags. |
| `token_addr` | `Address` | SAC address for the reward token. Must be a contract address (starts with `C`). |
| `visibility` | `Visibility` | `Public` or `Private`. |
| `max_enrollees` | `Option<u32>` | Enrollment cap. Pass `null` for unlimited. |

Returns `Ok(u32)` — the new quest ID.

Errors: `InvalidInput`, `NameTooLong`, `DescriptionTooLong`, `Paused`.

```bash
stellar keys use owner
stellar contract invoke --id quest -- create_quest \
  --owner owner \
  --name '"Rust Basics"' \
  --description '"Complete Soroban onboarding milestones"' \
  --category '"Engineering"' \
  --tags '["soroban","rust"]' \
  --token-addr token \
  --visibility '{"Public": null}' \
  --max-enrollees 'null'
```

---

### `update_quest`

Update quest metadata. Owner only. Quest must be active.

```rust
update_quest(
    quest_id: u32,
    owner: Address,
    name: Option<String>,
    description: Option<String>,
    category: Option<String>,
    tags: Option<Vec<String>>,
    visibility: Option<Visibility>,
    max_enrollees: Option<u32>,
) -> Result<(), Error>
```

Pass `null` for any field you do not want to change.

Errors: `NotFound`, `Unauthorized`, `QuestArchived`, `InvalidInput`, `NameTooLong`, `DescriptionTooLong`.

---

### `archive_quest`

Archive a quest. Owner only. Archived quests reject new enrollments.

```rust
archive_quest(env: Env, quest_id: u32) -> Result<(), Error>
```

Errors: `NotFound`, `Unauthorized`, `Paused`.

```bash
stellar keys use owner
stellar contract invoke --id quest -- archive_quest --quest-id 0
```

---

### `add_enrollee`

Enroll a learner. Owner only.

```rust
add_enrollee(env: Env, quest_id: u32, enrollee: Address) -> Result<(), Error>
```

Errors: `NotFound`, `Unauthorized`, `QuestArchived`, `AlreadyEnrolled`, `QuestFull`.

```bash
stellar keys use owner
stellar contract invoke --id quest -- add_enrollee \
  --quest-id 0 --enrollee learner
```

---

### `join_quest`

Self-enroll in a public quest. Enrollee must authorize.

```rust
join_quest(env: Env, enrollee: Address, quest_id: u32) -> Result<(), Error>
```

Errors: `NotFound`, `QuestArchived`, `InviteOnly` (if `Private`), `AlreadyEnrolled`, `QuestFull`.

```bash
stellar keys use learner
stellar contract invoke --id quest -- join_quest \
  --enrollee learner --quest-id 0
```

---

### `remove_enrollee`

Remove a learner. Owner only.

```rust
remove_enrollee(env: Env, quest_id: u32, enrollee: Address) -> Result<(), Error>
```

Errors: `NotFound`, `Unauthorized`, `NotEnrolled`.

---

### `leave_quest`

Unenroll yourself. Enrollee must authorize.

```rust
leave_quest(env: Env, enrollee: Address, quest_id: u32) -> Result<(), Error>
```

Errors: `NotFound`, `NotEnrolled`.

---

### `set_visibility`

Change public/private visibility. Owner only. Does not provide on-chain confidentiality.

```rust
set_visibility(env: Env, quest_id: u32, visibility: Visibility) -> Result<(), Error>
```

---

### `set_deadline`

Set or clear a quest deadline. Owner only. Pass `0` to remove.

```rust
set_deadline(env: Env, quest_id: u32, deadline: u64) -> Result<(), Error>
```

---

### `get_quest`

Fetch quest metadata by ID. Readable for any ID regardless of visibility.

```rust
get_quest(env: Env, quest_id: u32) -> Result<QuestInfo, Error>
```

Errors: `NotFound`.

```bash
stellar contract invoke --id quest -- get_quest --quest-id 0
```

---

### `get_enrollees`

List all enrolled addresses for a quest.

```rust
get_enrollees(env: Env, quest_id: u32) -> Result<Vec<Address>, Error>
```

Errors: `NotFound`.

---

### `is_enrollee`

Check whether an address is enrolled.

```rust
is_enrollee(env: Env, quest_id: u32, user: Address) -> Result<bool, Error>
```

Errors: `NotFound`.

---

### `is_expired`

Returns `true` if the quest has a non-zero deadline that has passed.

```rust
is_expired(env: Env, quest_id: u32) -> Result<bool, Error>
```

---

### `list_public_quests`

Paginated list of public quests.

```rust
list_public_quests(env: Env, start: u32, limit: u32) -> Vec<QuestInfo>
```

---

### `get_quests_by_category`

All public quests in a category.

```rust
get_quests_by_category(env: Env, category: String) -> Vec<QuestInfo>
```

---

### `list_quests_by_owner`

All quests owned by an address.

```rust
list_quests_by_owner(env: Env, owner: Address) -> Vec<QuestInfo>
```

---

### `list_quests_by_enrollee`

All quests an address is enrolled in.

```rust
list_quests_by_enrollee(env: Env, enrollee: Address) -> Vec<QuestInfo>
```

---

### `get_quest_count`

Total number of quests created.

```rust
get_quest_count(env: Env) -> u32
```

---

### `get_enrollment_cap`

Returns the enrollment cap for a quest, or `None` if unlimited.

```rust
get_enrollment_cap(env: Env, quest_id: u32) -> Option<u32>
```

---

### `verify_creator` / `is_creator_verified`

Admin-only: mark a creator as verified. Verified status is stored on the quest at creation time.

```rust
verify_creator(env: Env, admin: Address, creator: Address) -> Result<(), Error>
is_creator_verified(env: Env, creator: Address) -> bool
```

---

### `transfer_admin`

Transfer admin control to a new address. Admin only.

```rust
transfer_admin(env: Env, current_admin: Address, new_admin: Address) -> Result<(), Error>
```

---

### `pause` / `unpause` / `is_paused`

Admin-only circuit breaker. Pausing blocks all state-mutating calls.

```rust
pause(env: Env, admin: Address) -> Result<(), Error>
unpause(env: Env, admin: Address) -> Result<(), Error>
is_paused(env: Env) -> bool
```

---

## Milestone Contract

Source: `contracts/milestone/src/lib.rs`

### `initialize`

One-time setup. Must be called before any milestones can be created.

```rust
initialize(
    env: Env,
    admin: Address,
    quest_contract: Address,
    certificate_contract: Address,
) -> Result<(), Error>
```

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `admin` | `Address` | Admin address. Must authorize. |
| `quest_contract` | `Address` | Deployed quest contract address. |
| `certificate_contract` | `Address` | Deployed certificate contract address. |

Errors: `Unauthorized` if already initialized.

```bash
stellar contract invoke --id milestone -- initialize \
  --admin owner \
  --quest-contract <QUEST_ID> \
  --certificate-contract <CERT_ID>
```

---

### `create_milestone`

Add a milestone to a quest. Owner auth required. Validates ownership via cross-contract call.

```rust
create_milestone(
    env: Env,
    owner: Address,
    quest_id: u32,
    title: String,
    description: String,
    reward_amount: i128,
    requires_previous: bool,
) -> Result<u32, Error>
```

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `owner` | `Address` | Quest owner. Must authorize. |
| `quest_id` | `u32` | Quest to add the milestone to. |
| `title` | `String` | Milestone title (max 128 chars, non-blank). |
| `description` | `String` | Milestone description (max 1000 chars, non-blank). |
| `reward_amount` | `i128` | Reward in token base units. Must be > 0 and ≤ 10^15. |
| `requires_previous` | `bool` | If `true`, previous milestone must be completed first. |

Returns `Ok(u32)` — the new milestone ID.

Errors: `NotInitialized`, `OwnerMismatch`, `InvalidInput`, `TitleTooLong`, `DescriptionTooLong`, `InvalidAmount`.

```bash
stellar keys use owner
stellar contract invoke --id milestone -- create_milestone \
  --owner owner \
  --quest-id 0 \
  --title '"Build first API"' \
  --description '"Ship a working Soroban-backed endpoint"' \
  --reward-amount 5000000 \
  --requires-previous false
```

---

### `create_milestones_batch`

Atomically create multiple milestones. All succeed or none are written.

```rust
create_milestones_batch(
    env: Env,
    owner: Address,
    quest_id: u32,
    milestones: Vec<MilestoneInput>,
) -> Result<Vec<u32>, Error>
```

`MilestoneInput` fields: `title`, `description`, `reward_amount`, `requires_previous`. Max batch size: 20.

Errors: `BatchTooLarge`, `OwnerMismatch`, `InvalidInput`, `TitleTooLong`, `DescriptionTooLong`, `InvalidAmount`.

---

### `set_verification_mode`

Set how milestone completions are verified for a quest. Owner only.

```rust
set_verification_mode(
    env: Env,
    owner: Address,
    quest_id: u32,
    mode: VerificationMode,
) -> Result<(), Error>
```

| Mode | Description |
|:-----|:------------|
| `OwnerOnly` | Default. Owner calls `verify_completion`. |
| `PeerReview(n)` | Learners submit via `submit_for_review`; `n` peers must call `approve_completion`. |

---

### `set_distribution_mode`

Set the reward distribution mode for a quest. Owner only.

```rust
set_distribution_mode(
    env: Env,
    owner: Address,
    quest_id: u32,
    mode: DistributionMode,
    flat_reward: i128,
) -> Result<(), Error>
```

Pass `flat_reward > 0` when using `Flat` mode; pass `0` otherwise.

---

### `verify_completion`

Mark a learner's milestone as complete. Owner only. Returns the reward amount so the frontend can trigger `distribute_reward`.

```rust
verify_completion(
    env: Env,
    owner: Address,
    quest_id: u32,
    milestone_id: u32,
    enrollee: Address,
) -> Result<i128, Error>
```

Errors: `NotInitialized`, `Unauthorized`, `NotEnrolled`, `NotFound`, `AlreadyCompleted`, `MilestoneNotUnlocked`.

```bash
stellar keys use owner
stellar contract invoke --id milestone -- verify_completion \
  --owner owner \
  --quest-id 0 \
  --milestone-id 0 \
  --enrollee learner
```

---

### `submit_for_review`

Submit a milestone completion for peer review. Enrollee must authorize. Only valid when `VerificationMode` is `PeerReview`.

```rust
submit_for_review(
    env: Env,
    enrollee: Address,
    quest_id: u32,
    milestone_id: u32,
) -> Result<(), Error>
```

Errors: `NotFound`, `AlreadyCompleted`, `AlreadySubmitted`, `Unauthorized`, `NotEnrolled`.

---

### `approve_completion`

Approve a peer's submitted milestone. Peer must be enrolled and must not be the submitter. Returns `Some(reward)` when the threshold is reached and the milestone auto-completes; `None` if more approvals are still needed.

```rust
approve_completion(
    env: Env,
    peer: Address,
    quest_id: u32,
    milestone_id: u32,
    enrollee: Address,
) -> Result<Option<i128>, Error>
```

Errors: `NotFound`, `AlreadyCompleted`, `NotSubmitted`, `InvalidApprover`, `AlreadyApproved`, `NotEnrolled`, `Unauthorized`.

---

### `get_milestone`

Fetch a single milestone.

```rust
get_milestone(env: Env, quest_id: u32, milestone_id: u32) -> Result<MilestoneInfo, Error>
```

---

### `get_milestones` / `list_milestones`

All milestones for a quest (both functions are equivalent).

```rust
get_milestones(env: Env, quest_id: u32) -> Vec<MilestoneInfo>
list_milestones(env: Env, quest_id: u32) -> Vec<MilestoneInfo>
```

---

### `get_milestone_count`

Number of milestones in a quest.

```rust
get_milestone_count(env: Env, quest_id: u32) -> u32
```

---

### `get_milestone_reward`

Configured reward amount for a specific milestone.

```rust
get_milestone_reward(env: Env, quest_id: u32, milestone_id: u32) -> Result<i128, Error>
```

---

### `is_completed`

Check whether a learner has completed a milestone.

```rust
is_completed(env: Env, quest_id: u32, milestone_id: u32, enrollee: Address) -> bool
```

```bash
stellar contract invoke --id milestone -- is_completed \
  --quest-id 0 --milestone-id 0 --enrollee learner
```

---

### `get_enrollee_completions`

Total verified milestone completions for a learner in a quest.

```rust
get_enrollee_completions(env: Env, quest_id: u32, enrollee: Address) -> u32
```

---

### `get_enrollee_progress`

Full progress details for a learner: completion count, total milestones, total earned, and per-milestone timestamps.

```rust
get_enrollee_progress(env: Env, quest_id: u32, enrollee: Address) -> EnrolleeProgress
```

---

### `get_enrollee_earnings`

Total tokens earned by a learner in a quest (milestone contract's view).

```rust
get_enrollee_earnings(env: Env, quest_id: u32, enrollee: Address) -> i128
```

---

### `get_total_reserved_reward`

Total reward reserved (verified completions + pending peer reviews) for a quest. Used by the rewards contract to calculate refundable balance.

```rust
get_total_reserved_reward(env: Env, quest_id: u32) -> i128
```

---

### `get_distribution_mode` / `get_flat_reward`

Read the configured distribution mode and flat reward for a quest.

```rust
get_distribution_mode(env: Env, quest_id: u32) -> DistributionMode
get_flat_reward(env: Env, quest_id: u32) -> Option<i128>
```

---

### `pause` / `unpause` / `is_paused`

Admin-only circuit breaker.

```rust
pause(env: Env, admin: Address) -> Result<(), Error>
unpause(env: Env, admin: Address) -> Result<(), Error>
is_paused(env: Env) -> bool
```

---

## Rewards Contract

Source: `contracts/rewards/src/lib.rs`

### `initialize`

One-time setup. Sets the reward token and contract addresses.

```rust
initialize(
    env: Env,
    token_addr: Address,
    quest_contract_addr: Address,
    milestone_contract_addr: Address,
) -> Result<(), Error>
```

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `token_addr` | `Address` | SAC address for the reward token. |
| `quest_contract_addr` | `Address` | Deployed quest contract address. |
| `milestone_contract_addr` | `Address` | Deployed milestone contract address. |

Errors: `AlreadyInitialized`.

```bash
stellar contract invoke --id rewards -- initialize \
  --token-addr token \
  --quest-contract-addr <QUEST_ID> \
  --milestone-contract-addr <MILESTONE_ID>
```

---

### `fund_quest`

Deposit tokens into a quest's reward pool. The funder must be the quest owner. Funder becomes the quest authority.

```rust
fund_quest(env: Env, funder: Address, quest_id: u32, amount: i128) -> Result<(), Error>
```

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `funder` | `Address` | Quest owner depositing tokens. Must authorize. |
| `quest_id` | `u32` | Quest whose pool is being funded. |
| `amount` | `i128` | Deposit amount in token base units. Must be > 0. |

Errors: `InvalidAmount`, `NotInitialized`, `Unauthorized`, `InvalidToken`, `QuestLookupFailed`.

```bash
stellar keys use owner
stellar contract invoke --id rewards -- fund_quest \
  --funder owner \
  --quest-id 0 \
  --amount 50000000
```

---

### `distribute_reward`

Pay a reward to a learner. Requires milestone completion to be verified first. Idempotent — a second call for the same `(quest_id, milestone_id, enrollee)` returns `AlreadyPaid`.

```rust
distribute_reward(
    env: Env,
    authority: Address,
    quest_id: u32,
    milestone_id: u32,
    enrollee: Address,
    amount: i128,
) -> Result<(), Error>
```

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `authority` | `Address` | Quest authority (the funder). Must authorize. |
| `quest_id` | `u32` | Quest whose pool is debited. |
| `milestone_id` | `u32` | Milestone the reward is for. |
| `enrollee` | `Address` | Learner receiving the reward. |
| `amount` | `i128` | Amount in token base units. Must match the milestone's configured `reward_amount`. |

Errors: `InvalidAmount`, `AlreadyPaid`, `QuestNotFunded`, `Unauthorized`, `MilestoneNotCompleted`, `RewardAmountMismatch`, `InsufficientPool`.

```bash
stellar keys use owner
stellar contract invoke --id rewards -- distribute_reward \
  --authority owner \
  --quest-id 0 \
  --milestone-id 0 \
  --enrollee learner \
  --amount 5000000
```

---

### `refund_pool`

Withdraw unallocated tokens back to the authority. The quest must be archived and the 7-day grace period (604,800 seconds) must have elapsed since archiving.

```rust
refund_pool(env: Env, authority: Address, quest_id: u32, amount: i128) -> Result<(), Error>
```

Errors: `InvalidAmount`, `QuestNotFunded`, `Unauthorized`, `QuestNotArchived`, `RefundWindowNotOpen`, `InsufficientPool`.

```bash
stellar keys use owner
stellar contract invoke --id rewards -- refund_pool \
  --authority owner \
  --quest-id 0 \
  --amount 10000000
```

---

### `get_pool_balance`

Current token balance in a quest's reward pool.

```rust
get_pool_balance(env: Env, quest_id: u32) -> i128
```

Returns `0` if the quest has no pool yet.

```bash
stellar contract invoke --id rewards -- get_pool_balance --quest-id 0
```

---

### `get_user_earnings`

Cumulative rewards distributed to a user across all quests.

```rust
get_user_earnings(env: Env, user: Address) -> i128
```

```bash
stellar contract invoke --id rewards -- get_user_earnings --user learner
```

---

### `get_total_distributed`

Global total of all rewards distributed by this contract.

```rust
get_total_distributed(env: Env) -> i128
```

---

### `get_token`

The configured reward token address.

```rust
get_token(env: &Env) -> Result<Address, Error>
```

Errors: `NotInitialized`.

---

## Certificate Contract

Source: `contracts/certificate/src/lib.rs`

The certificate contract is an NFT (non-fungible token) built on the Stellar `stellar-tokens` library. Certificates are minted automatically by the milestone contract when a learner completes all milestones in a quest.

### `__constructor`

Initializes the contract with an owner and sets NFT collection metadata. Called once at deploy time.

```rust
__constructor(env: Env, owner: Address)
```

---

### `mint_quest_certificate`

Mint a certificate for quest completion. Called internally by the milestone contract; not intended for direct use.

```rust
mint_quest_certificate(
    env: Env,
    quest_id: u32,
    quest_name: String,
    quest_category: String,
    recipient: Address,
) -> Result<u32, Error>
```

Returns the NFT `token_id`.

Errors: `AlreadyIssued`, `NotOwner`.

---

### `mint_certificate`

Owner-only manual mint. Used for administrative issuance.

```rust
mint_certificate(
    env: Env,
    quest_id: u32,
    quest_name: String,
    quest_category: String,
    recipient: Address,
    issuer: Address,
) -> Result<u32, Error>
```

Errors: `AlreadyIssued`.

---

### `revoke_certificate`

Burn a certificate NFT. Owner only. For exceptional cases only.

```rust
revoke_certificate(env: Env, token_id: u32) -> Result<(), Error>
```

Errors: `NotFound`.

---

### `get_certificate_metadata`

Fetch metadata for a certificate by token ID.

```rust
get_certificate_metadata(env: Env, token_id: u32) -> Result<CertificateMetadata, Error>
```

`CertificateMetadata` fields: `quest_id`, `quest_name`, `quest_category`, `completion_date`, `issuer`, `recipient`.

Errors: `NotFound`.

---

### `get_quest_certificate`

Get the token ID for a specific quest + recipient combination.

```rust
get_quest_certificate(env: Env, quest_id: u32, recipient: Address) -> Result<u32, Error>
```

Errors: `NotFound`.

---

### `has_quest_certificate`

Check whether a user holds a certificate for a quest.

```rust
has_quest_certificate(env: Env, quest_id: u32, recipient: Address) -> bool
```

---

### `get_user_certificates`

All certificate token IDs held by a user.

```rust
get_user_certificates(env: Env, user: Address) -> Vec<u32>
```

---

### `get_certificate_details`

Certificate metadata plus the current NFT owner address.

```rust
get_certificate_details(env: Env, token_id: u32) -> Result<(CertificateMetadata, Address), Error>
```

---

### `get_user_certificate_details`

All certificates for a user with full metadata.

```rust
get_user_certificate_details(env: Env, user: Address) -> Vec<(u32, CertificateMetadata)>
```

---

## Error Codes

### Quest Contract

| Code | Name | Description |
|:-----|:-----|:------------|
| 1 | `NotFound` | Quest does not exist. |
| 2 | `Unauthorized` | Caller is not the owner or admin. |
| 3 | `InvalidInput` | Blank name/description, bad token address, or invalid tags. |
| 4 | `AlreadyEnrolled` | Learner is already enrolled. |
| 6 | `NotEnrolled` | Learner is not enrolled. |
| 7 | `QuestFull` | Enrollment cap reached. |
| 8 | `QuestArchived` | Quest is archived. |
| 9 | `NameTooLong` | Name exceeds 64 characters. |
| 10 | `DescriptionTooLong` | Description exceeds 2000 characters. |
| 11 | `InviteOnly` | Quest is private; self-enrollment not allowed. |
| 12 | `Paused` | Contract is paused. |

### Milestone Contract

| Code | Name | Description |
|:-----|:-----|:------------|
| 1 | `NotFound` | Milestone does not exist. |
| 2 | `Unauthorized` | Caller is not authorized. |
| 3 | `InvalidInput` | Blank title/description or invalid input. |
| 4 | `AlreadyCompleted` | Milestone already completed for this learner. |
| 6 | `InvalidAmount` | Reward amount is zero, negative, or exceeds max. |
| 7 | `OwnerMismatch` | Caller is not the quest owner. |
| 8 | `NotInitialized` | Contract not initialized. |
| 9 | `AlreadySubmitted` | Submission already pending review. |
| 10 | `NotSubmitted` | No pending submission to approve. |
| 11 | `AlreadyApproved` | Peer already approved this submission. |
| 12 | `NotEnrolled` | User is not enrolled in the quest. |
| 13 | `InvalidApprover` | Approver is the same as the submitter. |
| 14 | `MilestoneNotUnlocked` | Previous milestone not yet completed. |
| 15 | `TitleTooLong` | Title exceeds 128 characters. |
| 16 | `DescriptionTooLong` | Description exceeds 1000 characters. |
| 17 | `BatchTooLarge` | Batch exceeds 20 milestones. |
| 18 | `Paused` | Contract is paused. |
| 19 | `Overflow` | Arithmetic overflow in earnings calculation. |

### Rewards Contract

| Code | Name | Description |
|:-----|:-----|:------------|
| 1 | `AlreadyInitialized` | Contract already initialized. |
| 2 | `NotInitialized` | Contract not initialized. |
| 3 | `Unauthorized` | Caller is not the quest authority. |
| 4 | `InsufficientPool` | Pool balance too low. |
| 5 | `InvalidAmount` | Amount is zero, negative, or exceeds max. |
| 6 | `QuestNotFunded` | No authority recorded for this quest. |
| 7 | `QuestLookupFailed` | Cross-contract quest lookup failed. |
| 8 | `MilestoneNotCompleted` | Milestone not verified before distribution. |
| 9 | `MilestoneContractNotInitialized` | Milestone contract address not set. |
| 10 | `ArithmeticOverflow` | Overflow in pool/earnings arithmetic. |
| 11 | `AlreadyPaid` | Reward already distributed for this (quest, milestone, enrollee). |
| 12 | `InvalidToken` | Token address mismatch or not a valid SAC. |
| 13 | `RewardAmountMismatch` | Amount does not match milestone's configured reward. |
| 14 | `QuestNotArchived` | Quest must be archived before refund. |
| 15 | `RefundWindowNotOpen` | 7-day grace period has not elapsed since archiving. |
