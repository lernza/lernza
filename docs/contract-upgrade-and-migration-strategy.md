# Soroban Smart Contract Upgrade and Migration Strategy

## 1. Executive Summary

This document defines the formal upgrade authority model, contract versioning standard, storage migration requirements, interface compatibility guarantees, and operational rollout procedures for all Soroban smart contracts within the Lernza learn-to-earn platform.

Lernza operates four `#![no_std]` core smart contracts and one shared library crate:
- **`contracts/quest`**: Quest lifecycle, metadata management, enrollee membership, creator verification.
- **`contracts/milestone`**: Milestone creation, review modes (owner / peer), proof verification, completion tracking.
- **`contracts/rewards`**: Stellar Asset Contract (SAC) escrow pools, funding management, reward distribution.
- **`contracts/certificate`**: NFT non-fungible certificate minting, metadata resolution, revocation tombstones.
- **`contracts/common`**: Shared library containing canonical types, TTL constants, bounds, and utility helpers.

---

## 2. Contract Versioning Strategy

Lernza contracts adhere to **Semantic Versioning (SemVer)** formatted as `MAJOR.MINOR.PATCH` (`vX.Y.Z`):

```
v MAJOR . MINOR . PATCH
    │       │       │
    │       │       └── Backward-compatible bug fixes & internal optimizations
    │       └────────── Backward-compatible new entrypoints, optional fields, or state extensions
    └────────────────── Breaking storage layout changes, removed entrypoints, or state migrations
```

### Version Tracking & State Introspection
Each contract exposes a standard version inspection entrypoint and instance storage key:

```rust
#[contracttype]
pub enum VersionDataKey {
    ContractVersion, // Stores u32 integer representation or SemVer string
}
```

- **Minor State Additions:** Added struct fields must be wrapped in `Option<T>` or have fallback defaults for existing persistent ledger entries.
- **Major Migrations:** Changes modifying existing `DataKey` enum discriminant tags or layout semantics require an explicit migration routine.

---

## 3. Upgrade Authority Model & Governance

### Authority Architecture
Upgrades on Soroban are executed using the native host deployer API:
```rust
env.deployer().update_current_contract_wasm(new_wasm_hash);
```

```
┌─────────────────────────────────────────────────────────────┐
│                 Lernza Governance / Admin                   │
│         (Multi-Sig G-Address / Timelock DAO Signer)         │
└──────────────────────────────┬──────────────────────────────┘
                               │
               1. Upload WASM  │  2. `upgrade(admin, wasm_hash)`
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Target Soroban Contract                   │
│  - Verifies `admin.require_auth()`                           │
│  - Asserts `admin == stored_admin`                          │
│  - Calls `env.deployer().update_current_contract_wasm(...)`  │
│  - Emits `contract_upgraded` event                          │
└─────────────────────────────────────────────────────────────┘
```

### Authority Enforcement Rules
1. **Administrative Authentication:** Upgrades MUST authenticate the stored `Admin` address (`admin.require_auth()`).
2. **Emergency Pause Separation:** The administrative `pause()` / `unpause()` mechanism operates independently from code updates. Pausing halts sensitive mutations (enrolling, reward distribution, milestone verification) while maintaining read access and administrative maintenance.
3. **Multi-Sig Custody in Production:** Mainnet contract instances MUST be owned by a multi-signature account or timelock contract rather than a single individual keypair.

---

## 4. Storage Tiers & Migration Requirements

Soroban provides three distinct storage tiers:

| Storage Tier | Data Scope | TTL Policy | Migration Considerations |
| :--- | :--- | :--- | :--- |
| **Instance** | Admin keys, contract references, global counters, pause flag | Extended on instance usage (`extend_instance_ttl`) | Bound to contract instance; survives WASM code swaps without migration. |
| **Persistent** | Quests (`QuestInfo`), Milestones (`MilestoneInfo`), Enrollees, Balances | Extended on read/write via `THRESHOLD` (120k) & `BUMP` (518k ledgers) | Persists indefinitely while rent is maintained; requires layout compatibility. |
| **Temporary** | Ephemeral proofs, short-lived session commitments | Expires automatically upon TTL end | Not suitable for persistent user state. |

### Storage Key Compatibility (DataKey Invariants)
1. **Deterministic Enum Ordering:** Never reorder existing `enum DataKey` variants. New storage keys MUST be appended to the end of the enum definition to preserve binary serialization tags.
2. **Discriminant Stability:** Explicit `#[repr(u32)]` attributes on data keys and enums prevent compiler-introduced discriminant shifts across rustc versions.

### State Migration Patterns

#### Pattern A: Lazy / On-Demand Migration (Preferred)
When reading persistent state from an older contract version:
```rust
pub fn get_quest(env: Env, quest_id: u32) -> QuestInfo {
    let key = DataKey::Quest(quest_id);
    let mut quest: QuestInfo = env.storage().persistent().get(&key).expect("not found");
    
    // Check if entry needs schema hydration
    if quest.version < CURRENT_VERSION {
        quest = hydrate_quest_schema(&env, quest);
        env.storage().persistent().set(&key, &quest);
    }
    
    quest
}
```

#### Pattern B: Explicit Administrative Migration Step
For sweeping data changes, the contract can expose a temporary, admin-gated batch migration function:
```rust
pub fn migrate_batch(env: Env, admin: Address, start_id: u32, count: u32) -> Result<u32, Error> {
    admin.require_auth();
    Self::require_admin(&env, &admin)?;
    
    // Process batch of entity keys
    // ...
    Ok(migrated_count)
}
```

---

## 5. Compatibility Guarantees

Lernza maintains the following compatibility guarantees across contract upgrades:

### 1. Interface Backward Compatibility
- Existing public entrypoints will not change parameter types or argument positions within the same MAJOR version.
- Return types remain stable; new data is surfaced through new query methods or additive struct fields.

### 2. Client & Indexer Event Stability
Event topics and payload formats remain stable across minor upgrades:
- `quest_created`: `(Symbol("quest_created"),) -> (quest_id, owner, name)`
- `milestone_completed`: `(Symbol("milestone_completed"),) -> (quest_id, milestone_id, enrollee)`
- `reward_distributed`: `(Symbol("reward_distributed"),) -> (quest_id, milestone_id, enrollee, amount)`

### 3. TTL Safety
All writes perform automated TTL extensions (`THRESHOLD = 120_960`, `BUMP = 518_400`), guaranteeing ~30 days of persistent lifetime from every touch point.

---

## 6. Rollout Procedures for Testnet and Mainnet

### Step-by-Step Deployment Lifecycle

```
[1. Compilation & WASM Hash Verification]
       │  cargo test --workspace
       │  stellar contract build
       ▼
[2. Testnet Staging & Canary Verification]
       │  stellar contract install --wasm target/wasm32-unknown-unknown/release/*.wasm
       │  Deploy to Testnet & run E2E integration test suite
       ▼
[3. Pre-Upgrade State Snapshot]
       │  Query active quest balances, reserved rewards, enrollee counts
       ▼
[4. Transaction Simulation & Dry Run]
       │  Simulate `upgrade()` call via `simulateTransaction`
       │  Verify resource limits, CPU instructions, and authorization signatures
       ▼
[5. Multi-Sig Approval & Execution]
       │  Sign and broadcast upgrade transaction on-chain
       ▼
[6. Post-Upgrade Health Verification]
       │  Execute smoke tests (enrollment, milestone submission, reward claim)
       │  Confirm version query reflects updated release
```

### Rollback Contingency Strategy
If an unexpected runtime regression is detected following an upgrade:
1. **Immediate Pause:** Call `pause(admin)` to halt active token distributions and milestone verification.
2. **WASM Downgrade:** Call `upgrade(admin, previous_wasm_hash)` pointing back to the prior stable WASM hash.
3. **Unpause & Verify:** Call `unpause(admin)` and verify that protocol state remains uncorrupted.

---

## 7. Operational Checklist

- [ ] All workspace tests pass (`cargo test --workspace`).
- [ ] WASM binaries compiled in release mode with optimization flags.
- [ ] WASM hash published and verified against reproducible build environment.
- [ ] Testnet deployment validated with frontend and indexer integrations.
- [ ] Admin multi-sig threshold collected and verified.
- [ ] Pre-upgrade snapshot of state balances recorded.
- [ ] `upgrade()` simulated on RPC node without error.
- [ ] Post-upgrade smoke test suite executed.
