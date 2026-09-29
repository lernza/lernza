## Reward token allowlist

The frontend uses a versioned, network-specific allowlist in
`frontend/src/lib/reward-tokens.ts`. Quest creation and funding require the configured contract
address to be present in the active network's allowlist and verify its on-chain symbol, name, and
decimals before constructing a transaction. Testnet assets are never reused for production; a
mainnet asset must be explicitly reviewed and added to the production allowlist with its Stellar
Expert explorer URL.

# Lernza Contributor Smart Contract Integration Guide

This guide provides contributor-facing documentation for integrating with Lernza's Soroban smart contracts on the Stellar network. It covers contract methods, authorization requirements, storage architectures, event schemas, frontend interaction patterns, and local testing workflows.

---

## 1. Smart Contract Architecture

Lernza's decentralized learning platform is powered by four primary Soroban smart contracts located in `contracts/`:

```
contracts/
├── quest/        # Quest metadata, creator controls, enrollment, status tracking
├── milestone/    # Milestone definitions, proof submission, completion validation
├── rewards/      # Token escrow, funding pools, LEARN token reward payouts
└── certificate/  # On-chain verifiable credential / completion badge minting
```

### Primary Contract Interfaces

#### Quest Contract (`contracts/quest/`)
* **`create_quest(env, creator, title, category, reward_amount)`**: Registers a new quest on-chain.
* **`get_quest(env, quest_id) -> QuestInfo`**: Retrieves on-chain quest details.
* **`update_status(env, quest_id, status)`**: Allows quest creator or admin to update quest lifecycle state (`Active`, `Paused`, `Completed`, `Cancelled`).
* **`get_category(env, category_id) -> CategoryInfo`**: Fetches category details and expiry parameters.

#### Milestone Contract (`contracts/milestone/`)
* **`add_milestone(env, quest_id, title, description, reward_share)`**: Attaches a learning milestone to a quest.
* **`submit_proof(env, learner, quest_id, milestone_id, proof_hash)`**: Learner submits proof of work for validation.
* **`verify_milestone(env, verifier, quest_id, milestone_id, learner)`**: Approves proof submission and triggers completion state.

#### Rewards Contract (`contracts/rewards/`)
* **`fund_quest(env, sponsor, quest_id, token_address, amount)`**: Escrows tokens into a quest reward pool.
* **`claim_reward(env, learner, quest_id, milestone_id)`**: Transfers earned tokens from escrow to learner.
* **`get_balance(env, user, token_address) -> i128`**: Queries escrow or reward balance.

#### Certificate Contract (`contracts/certificate/`)
* **`mint_certificate(env, recipient, quest_id, metadata_uri)`**: Mints a soulbound credential token proving quest completion.
* **`verify_certificate(env, certificate_id) -> CertificateData`**: Public verification helper for third-party verifiers.

---

## 2. Authorization Rules & Security Model

Soroban relies on explicit address authorization (`require_auth`). All contract invocations must enforce strict access boundaries:

```rust
// Example: Authorizing creator action in Rust
pub fn update_status(env: Env, quest_id: u32, new_status: QuestStatus) -> Result<(), ContractError> {
    let quest = get_quest(&env, quest_id)?;
    
    // Require signature from the quest creator
    quest.creator.require_auth();
    
    // Perform state transition...
    Ok(())
}
```

### Authorization Hierarchy
1. **User / Learner Auth**: Required when submitting milestone proofs or claiming rewards (`learner.require_auth()`).
2. **Creator Auth**: Required when modifying quest parameters or managing milestones (`creator.require_auth()`).
3. **Admin Auth**: Privileged administrative functions (e.g. protocol parameter updates, emergency pauses) (`admin.require_auth()`).
4. **Contract-to-Contract Auth**: When `rewards` contract transfers tokens on behalf of a quest escrow, cross-contract call authorization is passed via invocation context.

---

## 3. Storage Concepts & Lifetime Management

Soroban offers three distinct storage tiers. Choosing the correct storage type prevents state bloat and minimizes storage rent costs:

| Storage Type | Lifetime Behavior | Best Used For |
| :--- | :--- | :--- |
| **Instance Storage** | Tied to contract instance; extended automatically on invocation | Contract admin keys, configuration parameters, global counters |
| **Persistent Storage** | Permanent unless TTL expires; requires active maintenance via `extend_ttl` | Quests, user profiles, milestone records, token balances |
| **Temporary Storage** | Short-lived; automatically purged when TTL expires | Replay prevention nonces, transient verification tokens |

### DataKey Patterns
State is organized using typed enum keys:

```rust
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Quest(u32),
    Milestone(u32, u32),
    LearnerProgress(Address, u32),
    RewardBalance(Address),
    Admin,
}
```

### TTL Management
All persistent storage items should extend their Time-To-Live during access to avoid state archival:

```rust
env.storage().persistent().extend_ttl(&key, 172800, 518400); // Extend by ~30 days
```

---

## 4. Event Schemas & Indexing

Contracts emit structured events for off-chain indexing by Horizon or custom indexers.

### Event Format
Events consist of a **Topic Vector** (up to 4 symbols/addresses) and a **Data Payload**:

```rust
env.events().publish(
    (Symbol::new(&env, "quest"), Symbol::new(&env, "created"), quest_id),
    (creator, reward_amount)
);
```

### Event Reference Summary

| Contract | Event Topic | Data Payload | Trigger Condition |
| :--- | :--- | :--- | :--- |
| `quest` | `("quest", "created", quest_id)` | `(creator: Address, reward: i128)` | When a new quest is registered |
| `quest` | `("quest", "status_updated", quest_id)` | `(new_status: u32)` | When quest status changes |
| `milestone` | `("milestone", "completed", quest_id)` | `(milestone_id: u32, learner: Address)` | When proof is verified |
| `rewards` | `("rewards", "claimed", quest_id)` | `(learner: Address, amount: i128)` | When reward tokens are disbursed |

---

## 5. Frontend Call Patterns

The React frontend communicates with Soroban using `@stellar/stellar-sdk` and `@stellar/freighter-api`.

### Architecture Flow

```
React Component ──> Hook (useWallet / useTransactionAction) ──> Client Wrapper (questClient) ──> Freighter Wallet ──> Stellar RPC / Soroban Network
```

### Transaction Execution Example

```typescript
import { questClient } from "@/lib/contracts/quest"
import { parseTokenAmount } from "@/lib/token-amount"

async function handleCreateQuest(title: string, rewardDisplay: string) {
  // 1. Safely parse reward to atomic bigint
  const rawReward = parseTokenAmount(rewardDisplay, 7)
  
  // 2. Invoke contract client method
  const tx = await questClient.createQuest({
    title,
    rewardAmount: rawReward,
  })
  
  return tx
}
```

### Precision-Safe Token Amounts
Always use the shared `token-amount` utility (`@/lib/token-amount`) when converting between display amounts and contract atomic units:

- **Parsing (User Input -> Contract)**: `parseTokenAmount("10.5", 7)` => `105000000n`
- **Formatting (Contract -> Display)**: `formatTokenAmount(105000000n, { decimals: 7, symbol: "LEARN" })` => `"10.5 LEARN"`

### Handling Errors & Network Mismatches
Contract errors return codes in the format `Error(Contract, #N)`. Map raw error messages to friendly UI strings using `mapContractError` in `@/lib/contract-errors`.

---

## 6. Local Testing & Development Commands

### 1. Run Unit & Integration Tests

```bash
# Run all Rust contract tests
cargo test

# Run tests for a specific contract
cargo test --package lernza-quest-contract

# Run frontend Vitest suite
cd frontend && npm test
```

### 2. Build Contracts for WASM

```bash
# Compile optimized WASM binaries
cargo build --target wasm32-unknown-unknown --release

# Or use Stellar CLI
stellar contract build
```

### 3. Local Sandbox & Testnet Deployment

```bash
# Deploy quest contract to Stellar Testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/lernza_quest.wasm \
  --source-account <YOUR_ACCOUNT_ALIAS> \
  --network testnet
```

### 4. Makefile Shortcuts

```bash
make build    # Builds all contracts
make test     # Runs contract test suites
make fmt      # Checks Rust formatting
make clippy   # Runs Clippy linters
```
