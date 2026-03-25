# Contract API Reference

This reference documents every public function exposed by Lernza's three Soroban contracts:

- Quest contract: `contracts/workspace/`
- Milestone contract: `contracts/milestone/`
- Rewards contract: `contracts/rewards/`

The product language uses "quest", while the current contract module and function names still use `workspace`. This document uses "quest contract" for the concept and preserves the exact on-chain function names for CLI usage.

## CLI Conventions

These examples use the current Stellar CLI invoke format and assume:

- You already selected a network, for example: `stellar network use testnet`
- You already deployed the contracts and saved aliases such as `quest`, `milestone`, and `rewards`
- You already created local identities such as `owner`, `learner`, and `funder`
- Strings with spaces are passed as JSON-quoted values

Example setup:

```bash
stellar network use testnet
stellar keys use owner
```

## Shared Return Types

### `WorkspaceInfo`

Returned by `get_workspace`.

| Field | Type | Description |
|:------|:-----|:------------|
| `id` | `u32` | Auto-incremented quest ID. |
| `owner` | `Address` | Quest owner address. |
| `name` | `String` | Quest title. |
| `description` | `String` | Quest description. |
| `token_addr` | `Address` | Reward token contract address. |
| `created_at` | `u64` | Ledger timestamp recorded at creation. |

### `MilestoneInfo`

Returned by `get_milestone` and `get_milestones`.

| Field | Type | Description |
|:------|:-----|:------------|
| `id` | `u32` | Auto-incremented milestone ID within a quest. |
| `workspace_id` | `u32` | Quest ID the milestone belongs to. |
| `title` | `String` | Milestone title. |
| `description` | `String` | Milestone description. |
| `reward_amount` | `i128` | Reward amount in token base units. |

## Quest Contract

Source: `contracts/workspace/src/lib.rs`

### `create_workspace`

Signature:

```rust
create_workspace(owner: Address, name: String, description: String, token_addr: Address) -> Result<u32, Error>
```

Parameters:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `owner` | `Address` | Address that owns and administers the quest. Must authorize the call. |
| `name` | `String` | Quest name shown to users. |
| `description` | `String` | Quest description. |
| `token_addr` | `Address` | Stellar asset contract address used for rewards. |

Returns:

- `Ok(u32)`: newly created quest ID.

Possible errors:

- No contract-defined `Error` variant is currently returned by this implementation.
- Runtime note: the transaction still requires `owner` authorization.

Example:

```bash
stellar keys use owner
stellar contract invoke --id quest -- create_workspace \
  --owner owner \
  --name '"Rust Basics"' \
  --description '"Complete Soroban onboarding milestones"' \
  --token-addr token
```

### `add_enrollee`

Signature:

```rust
add_enrollee(workspace_id: u32, enrollee: Address) -> Result<(), Error>
```

Parameters:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `workspace_id` | `u32` | Target quest ID. |
| `enrollee` | `Address` | Learner address to add. |

Returns:

- `Ok(())`: learner was added to the quest.

Possible errors:

- `Error::NotFound`: quest does not exist.
- `Error::AlreadyEnrolled`: learner is already enrolled.
- Runtime note: only the stored quest owner can authorize this call.

Example:

```bash
stellar keys use owner
stellar contract invoke --id quest -- add_enrollee \
  --workspace-id 0 \
  --enrollee learner
```

### `remove_enrollee`

Signature:

```rust
remove_enrollee(workspace_id: u32, enrollee: Address) -> Result<(), Error>
```

Parameters:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `workspace_id` | `u32` | Target quest ID. |
| `enrollee` | `Address` | Learner address to remove. |

Returns:

- `Ok(())`: learner was removed from the quest.

Possible errors:

- `Error::NotFound`: quest does not exist.
- `Error::NotEnrolled`: learner is not enrolled in the quest.
- Runtime note: only the stored quest owner can authorize this call.

Example:

```bash
stellar keys use owner
stellar contract invoke --id quest -- remove_enrollee \
  --workspace-id 0 \
  --enrollee learner
```

### `get_workspace`

Signature:

```rust
get_workspace(workspace_id: u32) -> Result<WorkspaceInfo, Error>
```

Parameters:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `workspace_id` | `u32` | Quest ID to fetch. |

Returns:

- `Ok(WorkspaceInfo)`: full quest metadata.

Possible errors:

- `Error::NotFound`: quest does not exist.

Example:

```bash
stellar contract invoke --id quest -- get_workspace \
  --workspace-id 0
```

### `get_enrollees`

Signature:

```rust
get_enrollees(workspace_id: u32) -> Result<Vec<Address>, Error>
```

Parameters:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `workspace_id` | `u32` | Quest ID to inspect. |

Returns:

- `Ok(Vec<Address>)`: all enrolled learner addresses for the quest.

Possible errors:

- `Error::NotFound`: quest does not exist.

Example:

```bash
stellar contract invoke --id quest -- get_enrollees \
  --workspace-id 0
```

### `is_enrollee`

Signature:

```rust
is_enrollee(workspace_id: u32, user: Address) -> Result<bool, Error>
```

Parameters:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `workspace_id` | `u32` | Quest ID to inspect. |
| `user` | `Address` | Address to check. |

Returns:

- `Ok(true)`: the address is enrolled.
- `Ok(false)`: the address is not enrolled.

Possible errors:

- `Error::NotFound`: quest does not exist.

Example:

```bash
stellar contract invoke --id quest -- is_enrollee \
  --workspace-id 0 \
  --user learner
```

### `get_workspace_count`

Signature:

```rust
get_workspace_count() -> u32
```

Parameters:

- None.

Returns:

- `u32`: total number of quests created so far.

Possible errors:

- No contract-defined errors.

Example:

```bash
stellar contract invoke --id quest -- get_workspace_count
```

## Milestone Contract

Source: `contracts/milestone/src/lib.rs`

### `create_milestone`

Signature:

```rust
create_milestone(owner: Address, workspace_id: u32, title: String, description: String, reward_amount: i128) -> Result<u32, Error>
```

Parameters:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `owner` | `Address` | Quest owner. Must authorize the call. |
| `workspace_id` | `u32` | Quest ID the milestone belongs to. |
| `title` | `String` | Milestone title. |
| `description` | `String` | Milestone description. |
| `reward_amount` | `i128` | Reward amount in token base units. Zero is allowed; negative values are rejected. |

Returns:

- `Ok(u32)`: newly created milestone ID for that quest.

Possible errors:

- `Error::InvalidAmount`: `reward_amount` is negative.
- `Error::OwnerMismatch`: a different owner is already recorded for this quest in the milestone contract.
- Runtime note: `owner` must authorize the call.

Example:

```bash
stellar keys use owner
stellar contract invoke --id milestone -- create_milestone \
  --owner owner \
  --workspace-id 0 \
  --title '"Build first API"' \
  --description '"Ship a working Soroban-backed endpoint"' \
  --reward-amount 5000000
```

### `verify_completion`

Signature:

```rust
verify_completion(owner: Address, workspace_id: u32, milestone_id: u32, enrollee: Address) -> Result<i128, Error>
```

Parameters:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `owner` | `Address` | Quest owner recorded in the milestone contract. Must authorize the call. |
| `workspace_id` | `u32` | Quest ID containing the milestone. |
| `milestone_id` | `u32` | Milestone ID to verify. |
| `enrollee` | `Address` | Learner whose completion is being verified. |

Returns:

- `Ok(i128)`: the milestone reward amount. The frontend uses this value to trigger reward distribution.

Possible errors:

- `Error::NotFound`: the quest owner was never recorded in this contract for `workspace_id`, or the milestone does not exist.
- `Error::Unauthorized`: the caller is not the stored owner for the quest.
- `Error::AlreadyCompleted`: this learner was already verified for the milestone.
- Runtime note: `owner` must authorize the call.

Example:

```bash
stellar keys use owner
stellar contract invoke --id milestone -- verify_completion \
  --owner owner \
  --workspace-id 0 \
  --milestone-id 0 \
  --enrollee learner
```

### `get_milestone`

Signature:

```rust
get_milestone(workspace_id: u32, milestone_id: u32) -> Result<MilestoneInfo, Error>
```

Parameters:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `workspace_id` | `u32` | Quest ID containing the milestone. |
| `milestone_id` | `u32` | Milestone ID to fetch. |

Returns:

- `Ok(MilestoneInfo)`: milestone metadata and reward amount.

Possible errors:

- `Error::NotFound`: milestone does not exist.

Example:

```bash
stellar contract invoke --id milestone -- get_milestone \
  --workspace-id 0 \
  --milestone-id 0
```

### `get_milestones`

Signature:

```rust
get_milestones(workspace_id: u32) -> Vec<MilestoneInfo>
```

Parameters:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `workspace_id` | `u32` | Quest ID to inspect. |

Returns:

- `Vec<MilestoneInfo>`: all stored milestones for the quest. Returns an empty list if none exist yet.

Possible errors:

- No contract-defined errors.

Example:

```bash
stellar contract invoke --id milestone -- get_milestones \
  --workspace-id 0
```

### `get_milestone_count`

Signature:

```rust
get_milestone_count(workspace_id: u32) -> u32
```

Parameters:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `workspace_id` | `u32` | Quest ID to inspect. |

Returns:

- `u32`: number of milestones created for the quest.

Possible errors:

- No contract-defined errors.

Example:

```bash
stellar contract invoke --id milestone -- get_milestone_count \
  --workspace-id 0
```

### `is_completed`

Signature:

```rust
is_completed(workspace_id: u32, milestone_id: u32, enrollee: Address) -> bool
```

Parameters:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `workspace_id` | `u32` | Quest ID containing the milestone. |
| `milestone_id` | `u32` | Milestone ID to inspect. |
| `enrollee` | `Address` | Learner address to check. |

Returns:

- `true`: learner has already been marked complete for the milestone.
- `false`: learner has not been marked complete.

Possible errors:

- No contract-defined errors.

Example:

```bash
stellar contract invoke --id milestone -- is_completed \
  --workspace-id 0 \
  --milestone-id 0 \
  --enrollee learner
```

### `get_enrollee_completions`

Signature:

```rust
get_enrollee_completions(workspace_id: u32, enrollee: Address) -> u32
```

Parameters:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `workspace_id` | `u32` | Quest ID to inspect. |
| `enrollee` | `Address` | Learner address to inspect. |

Returns:

- `u32`: total verified milestone completions for that learner in the quest.

Possible errors:

- No contract-defined errors.

Example:

```bash
stellar contract invoke --id milestone -- get_enrollee_completions \
  --workspace-id 0 \
  --enrollee learner
```

## Rewards Contract

Source: `contracts/rewards/src/lib.rs`

### `initialize`

Signature:

```rust
initialize(token_addr: Address) -> Result<(), Error>
```

Parameters:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `token_addr` | `Address` | Stellar asset contract address used by the rewards pool. |

Returns:

- `Ok(())`: rewards contract initialized successfully.

Possible errors:

- `Error::AlreadyInitialized`: token address was already set earlier.

Example:

```bash
stellar contract invoke --id rewards -- initialize \
  --token-addr token
```

### `fund_workspace`

Signature:

```rust
fund_workspace(funder: Address, workspace_id: u32, amount: i128) -> Result<(), Error>
```

Parameters:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `funder` | `Address` | Address depositing tokens into the quest pool. Must authorize the call. |
| `workspace_id` | `u32` | Quest ID whose pool is being funded. |
| `amount` | `i128` | Deposit amount in token base units. Must be greater than zero. |

Returns:

- `Ok(())`: pool balance was credited.

Possible errors:

- `Error::InvalidAmount`: `amount` is zero or negative.
- `Error::NotInitialized`: rewards contract was not initialized with a token address.
- `Error::Unauthorized`: the quest pool already has a different authority recorded.
- Runtime note: token transfer from `funder` to the rewards contract must also succeed.

Example:

```bash
stellar keys use owner
stellar contract invoke --id rewards -- fund_workspace \
  --funder owner \
  --workspace-id 0 \
  --amount 50000000
```

### `distribute_reward`

Signature:

```rust
distribute_reward(authority: Address, workspace_id: u32, enrollee: Address, amount: i128) -> Result<(), Error>
```

Parameters:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `authority` | `Address` | Address authorized to pay from the quest pool. Must authorize the call. |
| `workspace_id` | `u32` | Quest ID whose pool is being debited. |
| `enrollee` | `Address` | Learner receiving the reward. |
| `amount` | `i128` | Reward amount in token base units. Must be greater than zero. |

Returns:

- `Ok(())`: tokens were transferred to the learner and accounting was updated.

Possible errors:

- `Error::InvalidAmount`: `amount` is zero or negative.
- `Error::WorkspaceNotFunded`: no authority was ever recorded for the quest.
- `Error::Unauthorized`: caller is not the recorded authority for the quest.
- `Error::InsufficientPool`: quest pool balance is lower than `amount`.
- `Error::NotInitialized`: rewards contract was not initialized with a token address.
- Runtime note: token transfer from the rewards contract to `enrollee` must also succeed.

Example:

```bash
stellar keys use owner
stellar contract invoke --id rewards -- distribute_reward \
  --authority owner \
  --workspace-id 0 \
  --enrollee learner \
  --amount 5000000
```

### `get_pool_balance`

Signature:

```rust
get_pool_balance(workspace_id: u32) -> i128
```

Parameters:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `workspace_id` | `u32` | Quest ID whose pool balance should be returned. |

Returns:

- `i128`: current funded balance for the quest. Returns `0` when no pool exists yet.

Possible errors:

- No contract-defined errors.

Example:

```bash
stellar contract invoke --id rewards -- get_pool_balance \
  --workspace-id 0
```

### `get_user_earnings`

Signature:

```rust
get_user_earnings(user: Address) -> i128
```

Parameters:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `user` | `Address` | Learner address to inspect. |

Returns:

- `i128`: cumulative rewards distributed to that user across all quests.

Possible errors:

- No contract-defined errors.

Example:

```bash
stellar contract invoke --id rewards -- get_user_earnings \
  --user learner
```

### `get_total_distributed`

Signature:

```rust
get_total_distributed() -> i128
```

Parameters:

- None.

Returns:

- `i128`: total amount distributed by the rewards contract across all quests.

Possible errors:

- No contract-defined errors.

Example:

```bash
stellar contract invoke --id rewards -- get_total_distributed
```

### `get_token`

Signature:

```rust
get_token() -> Result<Address, Error>
```

Parameters:

- None.

Returns:

- `Ok(Address)`: configured Stellar asset contract address used for rewards.

Possible errors:

- `Error::NotInitialized`: rewards contract has not been initialized yet.

Example:

```bash
stellar contract invoke --id rewards -- get_token
```
