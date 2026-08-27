# Contract Upgrade Policy

This document explains Lernza's upgrade model for Soroban contracts: how upgrades
work at the protocol level, how storage migrations are classified and executed,
and what guarantees the team makes to indexers and frontend consumers across
contract versions.

For the step-by-step operator procedure, see
[docs/operations/contract-upgrade-runbook.md](./operations/contract-upgrade-runbook.md).

---

## How Soroban In-Place Upgrades Work

A Soroban contract upgrade **replaces the WASM bytecode** at an existing contract
address without touching the contract's storage. The sequence is:

1. Upload the new WASM to the network — this returns a 32-byte `wasm_hash`.
2. Invoke `update_current_contract_wasm(new_wasm_hash)` inside the currently
   deployed contract (gated to the admin address).
3. From the next invocation onwards, the contract address executes the new
   bytecode while reading the same persistent and instance storage that the old
   bytecode wrote.

Because storage is untouched, any mismatch between what the new code expects
and what the old code wrote is a **breaking change** that must be handled
explicitly.

> **Each Lernza contract must expose an `upgrade` entry point** that wraps
> `env.update_current_contract_wasm(new_wasm_hash)` and is gated to the stored
> `Admin` address. This function is the only upgrade surface; upgrading via
> other means is not supported.
>
> **Current state (2026-07):** All four contracts expose an admin-gated
> `upgrade` entry point. The quest contract additionally exposes a bounded,
> admin-gated `migrate_quest_data` entry point for schema migration batches.

---

## Upgrade Classifications

Every planned change must be classified before scheduling:

| Class | Description | Migration required? | Backward-compatible? |
|:------|:------------|:-------------------|:--------------------|
| **Additive** | New entry points, new `DataKey` variants, new fields in new keys | No | Yes |
| **Additive with lazy migration** | Existing stored structs gain new optional fields, read with defaults | Lazy (on read) | Yes |
| **Breaking struct change** | Existing stored structs change field order, type, or remove fields | Yes (eager or versioned) | No — requires migration window |
| **DataKey rename/removal** | A `DataKey` variant is renamed or removed | Yes (copy + tombstone old key) | No |
| **ABI removal** | A public entry point is removed or its signature changes | No storage migration, but **breaking for callers** | No — requires deprecation period |

### Rules

- **Additive changes** can be deployed without a migration window or indexer
  notice.
- **Breaking changes** require a minimum 48-hour public notice (per ADR-007),
  a migration script, and a coordinated frontend and indexer rollout.
- **ABI removals** additionally require a deprecation comment in source
  (`// DEPRECATED: removing in vN+1`) for at least one release.

---

## WASM Hash Pinning

Pinning the WASM hash is the primary defence against supply-chain attacks and
accidental deployment of the wrong binary.

### What to pin

After `stellar contract upload` returns a hash:

1. Record it in `releases/wasm-hashes.toml` (see format below).
2. Verify the hash against the local binary before invoking the upgrade.
3. Include the hash in the CHANGELOG entry for the release.

### `releases/wasm-hashes.toml` format

```toml
# Format: [[contracts]]  network = "..."  contract = "..."  version = "..."
#         wasm_hash = "<64-hex-char SHA-256>"  deployed_at = "<ledger>"
#         tx_hash = "<transaction hash>"  notes = "..."

[[contracts]]
network    = "testnet"
contract   = "milestone"
version    = "0.2.0"
wasm_hash  = "a3f1..."   # 64 hex chars from `stellar contract upload`
deployed_at = 1_234_567  # ledger sequence number
tx_hash    = "abc..."
notes      = "Adds MilestoneInfo.tags field; lazy migration via default"
```

> Keep this file in the repo. It is the authoritative record of what is
> running on each network. CI can diff it against a fresh build to detect
> hash drift.

### Verifying a hash before upgrade

```bash
# 1. Build locally
stellar contract build

# 2. Compute SHA-256 of the WASM
sha256sum target/wasm32v1-none/release/milestone.wasm

# 3. Upload and capture the returned hash
stellar contract upload \
  --network testnet \
  --source lernza-admin \
  --wasm target/wasm32v1-none/release/milestone.wasm
# → wasm_hash: a3f1...

# 4. Confirm the two values match before proceeding
```

If they differ, stop. The WASM on disk is not what the network received. Do not
proceed until the source of the discrepancy is understood.

---

## Storage Migration Patterns

### Pattern 1 — Additive new key (no migration)

Add a new `DataKey` variant and new entry points that read/write it.
Old entries are unaffected. No migration needed.

```rust
// v2 adds MilestoneCount per quest alongside the existing NextMilestoneId.
// Old storage is untouched; new storage is written on first create_milestone call.
MilestoneCount(u32),   // NEW in v2
```

### Pattern 2 — Lazy field default (additive struct change)

Add a new field to an existing stored struct with a `Default` implementation
(or an explicit fallback at read time). The old binary wrote entries without
this field; the new binary reads them and substitutes the default.

```rust
// v2 MilestoneInfo adds an optional `tags` field.
// Old entries on disk don't have it — the reader must supply a default.
#[contracttype]
pub struct MilestoneInfo {
    pub id:                u32,
    pub quest_id:          u32,
    pub title:             String,
    pub description:       String,
    pub reward_amount:     i128,
    pub requires_previous: bool,
    // NEW in v2 — absent in entries written by v1
    pub tags:              Vec<String>,
}
```

Because `#[contracttype]` uses XDR encoding, adding a field **changes the
encoding** and makes old entries unreadable by the new struct directly. To
handle this safely:

- Define a `MilestoneInfoV1` legacy type that matches the old layout exactly.
- At read time, attempt to deserialize as `MilestoneInfo`; if that fails,
  fall back to `MilestoneInfoV1` and project it into `MilestoneInfo` with the
  default value for the new field.
- On the first write after the upgrade, persist the entry in the new format,
  migrating it lazily.

See the [worked example](#worked-example-adding-milestoneinfotagsvecstring)
below for the full implementation.

### Pattern 3 — Versioned DataKey rename

Rename a key by writing to the new key and tombstoning the old one. Requires
an explicit one-shot migration entry point callable once after the upgrade.

```rust
// Old key: DataKey::WorkspacePool(u32)
// New key: DataKey::QuestPool(u32)

pub fn migrate_pool_keys(env: Env, admin: Address, quest_ids: Vec<u32>) -> Result<(), Error> {
    admin.require_auth();
    Self::require_admin(&env, &admin)?;

    for id in quest_ids.iter() {
        let old_key = DataKey::WorkspacePool(id);
        if let Some(balance) = env.storage().persistent().get::<_, i128>(&old_key) {
            let new_key = DataKey::QuestPool(id);
            env.storage().persistent().set(&new_key, &balance);
            common::extend_persistent_ttl(&env, &new_key);
            env.storage().persistent().remove(&old_key);
        }
    }
    Ok(())
}
```

### Pattern 4 — Breaking struct change (versioned structs)

When a struct change is not backward-compatible via a lazy default — for
example, a field is removed or its type changes — use versioned struct keys:

```rust
DataKey::MilestoneV1(u32, u32),  // old layout
DataKey::Milestone(u32, u32),    // new layout (same name, migrated entries)
```

Write a migration entry point that reads every `MilestoneV1` key, transforms
the data to the new layout, writes it under `Milestone`, and removes the old
key. Run the migration in a single transaction per batch (bounded by gas).

---

## Worked Example: Adding `MilestoneInfo.tags: Vec<String>`

This section walks through a realistic planned change — adding a `tags` field
to `MilestoneInfo` in the milestone contract — end to end.

### Change summary

| | Before (v1) | After (v2) |
|:|:--|:--|
| `MilestoneInfo` fields | 6 | 7 (`tags: Vec<String>` added) |
| `create_milestone` signature | unchanged (tags default to `[]`) | gains optional `tags` param |
| `get_milestone` response | 6 fields | 7 fields (old entries backfilled with `[]`) |
| Migration type | Lazy (on first read/write post-upgrade) | — |
| Backward compat | Existing indexers receive extra field; no removals | Yes |

### Step 1 — Define the legacy type in source

```rust
// contracts/milestone/src/lib.rs

/// Layout of MilestoneInfo as stored by v1 of this contract.
/// Used only during the v1→v2 lazy migration window; remove after
/// all entries have been rewritten in v2 format (or after one release cycle).
#[contracttype]
#[derive(Clone)]
pub struct MilestoneInfoV1 {
    pub id:                u32,
    pub quest_id:          u32,
    pub title:             String,
    pub description:       String,
    pub reward_amount:     i128,
    pub requires_previous: bool,
}

/// Current layout (v2+). Entries written by v1 are migrated lazily on first
/// read using MilestoneInfoV1 as a fallback.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct MilestoneInfo {
    pub id:                u32,
    pub quest_id:          u32,
    pub title:             String,
    pub description:       String,
    pub reward_amount:     i128,
    pub requires_previous: bool,
    pub tags:              Vec<String>, // NEW — default: empty
}
```

### Step 2 — Write a migration-aware reader

```rust
/// Read a MilestoneInfo for (quest_id, milestone_id).
/// Handles both v1 (no tags field) and v2+ (has tags field) on-disk formats.
fn load_milestone(env: &Env, quest_id: u32, milestone_id: u32) -> Option<MilestoneInfo> {
    let key = DataKey::Milestone(quest_id, milestone_id);

    // Try current format first.
    if let Some(ms) = env.storage().persistent().get::<_, MilestoneInfo>(&key) {
        return Some(ms);
    }

    // Fall back to v1 format (written before the tags field was added).
    if let Some(v1) = env.storage().persistent().get::<_, MilestoneInfoV1>(&key) {
        return Some(MilestoneInfo {
            id:                v1.id,
            quest_id:          v1.quest_id,
            title:             v1.title,
            description:       v1.description,
            reward_amount:     v1.reward_amount,
            requires_previous: v1.requires_previous,
            tags:              Vec::new(env), // default for migrated entries
        });
    }

    None
}
```

Replace every direct `env.storage().persistent().get::<_, MilestoneInfo>` call
in the contract body with `load_milestone(...)`.

### Step 3 — Lazy re-serialisation on write

On the first write to an entry after the upgrade (e.g. in
`verify_completion` which touches the `Completed` key but not `Milestone`
directly), the `Milestone` entry is not automatically re-serialised. Trigger
re-serialisation explicitly in `get_milestone` (the primary read path):

```rust
pub fn get_milestone(env: Env, quest_id: u32, milestone_id: u32) -> Result<MilestoneInfo, Error> {
    let key = DataKey::Milestone(quest_id, milestone_id);
    let ms = load_milestone(&env, quest_id, milestone_id).ok_or(Error::NotFound)?;

    // Re-serialise in the new format if this entry was read via the v1 fallback.
    // The `tags` field being empty is the signal that this is a migrated entry.
    // After this write, subsequent reads use the fast path.
    // NOTE: This re-write bumps the TTL, which is desirable.
    env.storage().persistent().set(&key, &ms);
    common::extend_persistent_ttl(&env, &key);

    Ok(ms)
}
```

> **Alternative:** skip the re-serialisation write in `get_milestone` (keep it
> read-only) and instead add an explicit `migrate_milestones(quest_id)` entry
> point callable by the admin. Use that path if the contract's read volume is
> low and you want to control when migration writes happen.

### Step 4 — Update `create_milestone`

```rust
pub fn create_milestone(
    env: Env,
    owner: Address,
    quest_id: u32,
    title: String,
    description: String,
    reward_amount: i128,
    requires_previous: bool,
    tags: Vec<String>,          // NEW parameter
) -> Result<u32, Error> {
    // ... existing validation unchanged ...

    let milestone = MilestoneInfo {
        id,
        quest_id,
        title,
        description,
        reward_amount,
        requires_previous,
        tags,                   // NEW
    };
    // ... rest unchanged ...
}
```

> **ABI note.** Adding a required parameter to a public function is a
> **breaking ABI change**. If the frontend is not updated simultaneously,
> old call sites will fail. Options:
>
> - Add `tags` as an optional parameter via a separate `set_milestone_tags`
>   entry point (non-breaking, recommended if a coordinated rollout is not
>   feasible).
> - Add `tags` to `create_milestone` and roll out frontend and contract
>   atomically in the same release.
>
> The runbook below assumes the atomic rollout path.

### Step 5 — Update tests

```rust
// In contracts/milestone/src/test.rs

#[test]
fn test_create_milestone_with_tags() {
    let (env, client, quest_client, admin) = setup();
    let owner = Address::generate(&env);
    let quest_id = create_quest(&env, &quest_client, &owner);

    let tags = vec![
        &env,
        String::from_str(&env, "rust"),
        String::from_str(&env, "beginner"),
    ];

    let ms_id = client.create_milestone(
        &owner,
        &quest_id,
        &String::from_str(&env, "Hello World"),
        &String::from_str(&env, "Write a hello world program"),
        &1_000_i128,
        &false,
        &tags,
    );

    let ms = client.get_milestone(&quest_id, &ms_id);
    assert_eq!(ms.tags.len(), 2);
}

#[test]
fn test_get_milestone_migrates_v1_entry() {
    // Simulate a v1 entry written without tags by storing a MilestoneInfoV1
    // directly into the key, then reading back via get_milestone.
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(MilestoneContract, ());
    // ... setup admin, quest, initialize ...

    // Write a V1 entry directly into persistent storage to simulate
    // what was on disk before the upgrade.
    let v1_entry = MilestoneInfoV1 {
        id: 0,
        quest_id: 0,
        title: String::from_str(&env, "Legacy milestone"),
        description: String::from_str(&env, "Existed before v2"),
        reward_amount: 500,
        requires_previous: false,
    };
    env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .set(&DataKey::Milestone(0, 0), &v1_entry);
    });

    let client = MilestoneContractClient::new(&env, &contract_id);
    let ms = client.get_milestone(&0u32, &0u32);

    // V1 entry is readable and tags default to empty.
    assert_eq!(ms.id, 0);
    assert_eq!(ms.tags.len(), 0);
}
```

### Step 6 — Build, hash, and upload

```bash
# Build
stellar contract build

# Verify size stays under budget (150 KB for milestone)
ls -lh target/wasm32v1-none/release/milestone.wasm

# Compute hash
sha256sum target/wasm32v1-none/release/milestone.wasm

# Upload to testnet
stellar contract upload \
  --network testnet \
  --source lernza-admin \
  --wasm target/wasm32v1-none/release/milestone.wasm
# → note returned wasm_hash
```

Record both the local `sha256sum` and the returned `wasm_hash` in
`releases/wasm-hashes.toml`. Confirm they match before proceeding to the
upgrade call.

### Step 7 — Execute the upgrade

```bash
stellar contract invoke \
  --network testnet \
  --source lernza-admin \
  --id <MILESTONE_CONTRACT_ID> \
  -- upgrade \
  --new_wasm_hash <WASM_HASH>
```

### Step 8 — Smoke test the migration path

```bash
# Read a milestone that existed before the upgrade (should return tags: [])
stellar contract invoke \
  --network testnet \
  --source lernza-admin \
  --id <MILESTONE_CONTRACT_ID> \
  -- get_milestone \
  --quest_id 0 \
  --milestone_id 0

# Create a new milestone with tags
stellar contract invoke \
  --network testnet \
  --source lernza-admin \
  --id <MILESTONE_CONTRACT_ID> \
  -- create_milestone \
  --owner <OWNER_ADDR> \
  --quest_id 0 \
  --title "New milestone" \
  --description "Post-upgrade test" \
  --reward_amount 1000 \
  --requires_previous false \
  --tags '["rust","beginner"]'
```

---

## Deprecation Policy

When removing or changing a public entry point:

1. Add a `// DEPRECATED: will be removed in vN+1 — use <new_fn> instead`
   comment in the contract source.
2. Keep the old function callable for at least one release cycle.
3. Announce removal in `CHANGELOG.md` under the release that introduces it.
4. Indexers that parse operation envelopes must be updated before the final
   removal; coordinate via the project's GitHub Discussions.

---

## Admin Authorisation for Upgrades

Upgrades are gated to the `Admin` address stored in instance storage of each
contract. Before a Mainnet upgrade:

- Confirm the current admin address with `stellar contract invoke -- get_admin`
  (or equivalent read-only check per contract).
- Per ADR-007, Mainnet admin operations require a **2-of-3 multi-sig** signing
  threshold and a **48-hour public notice** in GitHub Discussions before the
  upgrade transaction is broadcast.
- For Testnet, single-signer admin operations are permitted.

See [docs/operations/admin-rotation.md](./operations/admin-rotation.md) for
key management procedures.

---

## Rollback

Soroban does not support automatic rollback. To revert a deployed upgrade:

1. Retrieve the previous WASM binary from CI artifacts or `releases/`.
2. Verify its hash against `releases/wasm-hashes.toml`.
3. Upload the previous WASM (`stellar contract upload ...`) — it may already be
   on the network if it was deployed before; re-uploading returns the same hash.
4. Call `upgrade` with the old `wasm_hash`.
5. If the upgrade introduced a storage migration, the rollback will **not**
   automatically undo the migration. Entries written in the new format will be
   unreadable by the old code. A compensating migration entry point may be
   required — plan for this before deploying any breaking change.

See [docs/operations/deployment-rollback.md](./operations/deployment-rollback.md)
for the full rollback procedure.

---

## Further Reading

- [docs/operations/contract-upgrade-runbook.md](./operations/contract-upgrade-runbook.md) — operator step-by-step checklist
- [docs/adr/005-storage-patterns-and-ttl-strategy.md](./adr/005-storage-patterns-and-ttl-strategy.md) — storage tier decisions
- [docs/adr/007-admin-multisig-timelock.md](./adr/007-admin-multisig-timelock.md) — admin key management for Mainnet
- [docs/COMPATIBILITY.md](./COMPATIBILITY.md) — toolchain compatibility matrix
- [Soroban upgrade docs](https://developers.stellar.org/docs/smart-contracts/guides/upgrading-contracts) — official Stellar reference
