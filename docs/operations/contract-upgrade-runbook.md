# Contract Upgrade Runbook

Step-by-step operator checklist for deploying a new WASM binary to an
existing Lernza contract address. This runbook covers both Testnet rehearsals
and Mainnet deployments.

For upgrade concepts, storage migration patterns, and the worked
`MilestoneInfo.tags` example, see
[docs/UPGRADES.md](../UPGRADES.md).

---

## Prerequisites

Before starting, confirm **all** of the following:

- [ ] Stellar CLI `>= 25.2.0` installed (`stellar --version`)
- [ ] Admin keypair loaded and confirmed for the target network
      (`stellar keys ls`; see [admin-rotation.md](./admin-rotation.md))
- [ ] New WASM built from a tagged commit on `main` (`stellar contract build`)
- [ ] All contract tests pass (`cargo test --workspace`)
- [ ] Change classified (additive / breaking — see [UPGRADES.md](../UPGRADES.md#upgrade-classifications))
- [ ] **Mainnet only:** 48-hour public notice published in GitHub Discussions
      and 2-of-3 multi-sig co-signers confirmed available (ADR-007)
- [ ] Previous WASM binary archived in CI artifacts or `releases/`
- [ ] `releases/wasm-hashes.toml` up to date for the previous version

---

## Step 0 — Confirm the upgrade entry point exists

Lernza contracts must expose an `upgrade` function before they can be upgraded
without full redeployment:

```rust
// Required in every upgradeable contract (not yet present — see note below)
pub fn upgrade(env: Env, admin: Address, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
    admin.require_auth();
    Self::require_admin(&env, &admin)?;
    env.deployer().update_current_contract_wasm(new_wasm_hash);
    Ok(())
}
```

> **Current state:** No Lernza contract ships this entry point yet. If it is
> absent, the only upgrade path is a full redeployment followed by
> re-initialization and frontend reconfiguration. Complete the work to add
> `upgrade` to a contract **before** scheduling an in-place upgrade.
>
> Confirm which contracts have `upgrade` before proceeding:
> ```bash
> grep -r "fn upgrade" contracts/
> ```

---

## Step 1 — Build and verify the new WASM

```bash
# Build all contracts from the repo root
stellar contract build

# The milestone contract specifically (adjust for other contracts)
# Output: target/wasm32v1-none/release/milestone.wasm
ls -lh target/wasm32v1-none/release/milestone.wasm
```

Size budgets (fail CI if exceeded):

| Contract | Budget |
|:---------|:-------|
| `certificate.wasm` | 100 KB |
| `milestone.wasm` | 150 KB |
| `quest.wasm` | 150 KB |
| `rewards.wasm` | 100 KB |

Run all tests:

```bash
cargo test --workspace
```

Do not proceed if any test fails.

---

## Step 2 — Compute and record the WASM hash

```bash
# Compute the local SHA-256
sha256sum target/wasm32v1-none/release/milestone.wasm
# e.g. a3f1c9...  target/wasm32v1-none/release/milestone.wasm
```

Record this value. You will cross-check it against the hash returned by the
network upload in Step 3.

---

## Step 3 — Upload the WASM to the network

```bash
stellar contract upload \
  --network <testnet|mainnet> \
  --source lernza-admin \
  --wasm target/wasm32v1-none/release/milestone.wasm
```

The command returns a **wasm_hash** (64 hex characters). This is the on-chain
identifier for this specific binary.

**Pin the hash immediately:**

1. Confirm the returned `wasm_hash` matches your `sha256sum` output from
   Step 2. If they differ, stop — do not proceed until the discrepancy is
   understood.
2. Record the hash in `releases/wasm-hashes.toml`:

```toml
[[contracts]]
network     = "testnet"
contract    = "milestone"
version     = "0.2.0"
wasm_hash   = "<64-hex-char hash from stellar contract upload>"
deployed_at = 0          # fill in after upgrade (ledger sequence)
tx_hash     = ""         # fill in after upgrade
notes       = "Adds MilestoneInfo.tags; lazy migration on read"
```

> The `deployed_at` and `tx_hash` fields are filled in after Step 4 succeeds.

---

## Step 4 — Dry-run on Testnet (Testnet only — skip for Mainnet rehearsal)

Before touching Mainnet, run the full upgrade path on Testnet with the live
contract IDs:

```bash
# Simulate the upgrade call without submitting
stellar contract invoke \
  --network testnet \
  --source lernza-admin \
  --id <MILESTONE_CONTRACT_ID_TESTNET> \
  --build-only \
  -- upgrade \
  --admin <ADMIN_ADDRESS> \
  --new_wasm_hash <WASM_HASH>
```

`--build-only` constructs and serialises the transaction but does not submit
it. Inspect the XDR output to confirm the correct contract ID, entry point,
and arguments before committing.

---

## Step 5 — If applicable: review the migration plan

For breaking struct changes or DataKey renames, confirm the migration strategy
before upgrading:

- [ ] Legacy type (`MilestoneInfoV1` etc.) defined and matches the exact old
      XDR encoding
- [ ] Migration-aware reader (`load_milestone(...)`) replaces all direct
      `get::<_, MilestoneInfo>` calls in contract source
- [ ] Migration entry point (if eager) reviewed and tested against a fork
      of on-chain state
- [ ] Rollback plan documented: can the old WASM read entries written in the
      new format? If not, a compensating migration entry point must be ready.

For additive-only changes (new key variants, new fields with lazy defaults):
this step is a quick confirm — no blocker.

---

## Step 6 — Execute the upgrade

```bash
stellar contract invoke \
  --network <testnet|mainnet> \
  --source lernza-admin \
  --id <CONTRACT_ID> \
  -- upgrade \
  --admin <ADMIN_ADDRESS> \
  --new_wasm_hash <WASM_HASH>
```

**Mainnet:** at this point the 2-of-3 co-signers must add their signatures to
the transaction before it is broadcast. Use the Stellar Lab Transaction Signer
or Freighter multi-sig flow as agreed in ADR-007.

Record the returned transaction hash. Update `releases/wasm-hashes.toml`:

```toml
deployed_at = <ledger-sequence>
tx_hash     = "<transaction-hash>"
```

---

## Step 7 — Post-upgrade verification

### 7a — Confirm the WASM hash on-chain

```bash
# The contract should now report the new wasm_hash in its footprint.
# Use stellar-expert or RPC getContractData to inspect the instance storage.
stellar contract info \
  --network <testnet|mainnet> \
  --id <CONTRACT_ID>
```

Cross-check the reported hash against `releases/wasm-hashes.toml`.

### 7b — Read-only smoke test

```bash
# milestone — read an existing entry (tests the migration path for additive changes)
stellar contract invoke \
  --network <testnet|mainnet> \
  --source lernza-admin \
  --id <MILESTONE_CONTRACT_ID> \
  -- get_milestone \
  --quest_id 0 \
  --milestone_id 0

# rewards — confirm pool balance is unchanged
stellar contract invoke \
  --network <testnet|mainnet> \
  --source lernza-admin \
  --id <REWARDS_CONTRACT_ID> \
  -- get_pool_balance \
  --quest_id 0

# quest — confirm quest data is intact
stellar contract invoke \
  --network <testnet|mainnet> \
  --source lernza-admin \
  --id <QUEST_CONTRACT_ID> \
  -- get_quest \
  --quest_id 0
```

### 7c — Write smoke test (non-production data)

On **Testnet only**, create a test milestone (or equivalent) using the new
entry point to confirm the new code path works end to end:

```bash
stellar contract invoke \
  --network testnet \
  --source lernza-admin \
  --id <MILESTONE_CONTRACT_ID> \
  -- create_milestone \
  --owner <OWNER_ADDR> \
  --quest_id 0 \
  --title "Upgrade smoke test" \
  --description "Created post-upgrade to verify v2 path" \
  --reward_amount 1 \
  --requires_previous false \
  --tags '["smoke-test"]'
```

### 7d — Check explorer for error events

Open [Stellar Expert (Testnet)](https://stellar.expert/explorer/testnet) or
[Stellar Expert (Mainnet)](https://stellar.expert/explorer/public), search for
the upgrade transaction hash, and confirm:

- Transaction result is `SUCCESS`
- No contract error events emitted
- Contract data footprint shows the new `wasm_hash`

---

## Step 8 — Run the eager migration (if applicable)

If the change required an explicit one-shot migration entry point:

```bash
stellar contract invoke \
  --network <testnet|mainnet> \
  --source lernza-admin \
  --id <CONTRACT_ID> \
  -- migrate_<entity> \
  --admin <ADMIN_ADDRESS> \
  --ids '[0, 1, 2, ...]'   # batch of IDs to migrate
```

For large state sets, run in batches to stay within the transaction fee budget.
Confirm each batch's transaction before proceeding to the next.

---

## Step 9 — Update frontend and indexers

If the upgrade changes the ABI (new entry point parameters, new response
fields, removed functions):

- [ ] Regenerate TypeScript contract bindings:
      ```bash
      stellar contract bindings typescript \
        --network <testnet|mainnet> \
        --id <CONTRACT_ID> \
        --output frontend/src/lib/contracts/<contract>
      ```
- [ ] Update `docs/COMPATIBILITY.md` with the new version line
- [ ] Notify indexer operators (GitHub Discussions) so they can handle new
      response fields or changed event payloads
- [ ] Update `docs/EVENT_REFERENCE.md` if any events changed

---

## Step 10 — Post-upgrade checklist

- [ ] Upgrade transaction hash recorded in `releases/wasm-hashes.toml`
- [ ] `releases/wasm-hashes.toml` committed and pushed
- [ ] Read-only smoke test passed
- [ ] Write smoke test passed (Testnet) or production write verified (Mainnet)
- [ ] Explorer shows no error events
- [ ] `docs/COMPATIBILITY.md` updated
- [ ] `CHANGELOG.md` entry added with: version, wasm_hash, tx_hash, change summary
- [ ] Indexer operators notified if event payloads changed
- [ ] Frontend TypeScript bindings regenerated and deployed
- [ ] Team notified in `#deployments`

---

## Rollback Procedure

Soroban does not support automatic rollback. Revert to the previous binary:

```bash
# 1. Retrieve the previous wasm_hash from releases/wasm-hashes.toml
#    (the entry for the version before this upgrade)

# 2. The previous WASM may already be on the network; re-upload if needed
stellar contract upload \
  --network <testnet|mainnet> \
  --source lernza-admin \
  --wasm releases/<previous-version>/milestone.wasm
# → should return the same hash recorded in wasm-hashes.toml

# 3. Invoke upgrade with the previous hash
stellar contract invoke \
  --network <testnet|mainnet> \
  --source lernza-admin \
  --id <CONTRACT_ID> \
  -- upgrade \
  --admin <ADMIN_ADDRESS> \
  --new_wasm_hash <PREVIOUS_WASM_HASH>
```

> **Storage caveat.** If the upgrade introduced a migration (new field
> defaults, lazy re-serialisation), rolling back the WASM does **not** undo
> entries already written in the new format. The old code will be unable to
> deserialise them. Before any breaking upgrade, confirm whether the old binary
> can tolerate the new on-disk format. If not, a compensating migration entry
> point must be prepared and deployed before the rollback WASM.

See [docs/operations/deployment-rollback.md](./deployment-rollback.md) for the
broader incident response procedure.

---

## Quick Reference

| Contract | Testnet ID | Mainnet ID |
|:---------|:-----------|:-----------|
| `quest` | *(see environments.toml)* | *(see environments.toml)* |
| `milestone` | *(see environments.toml)* | *(see environments.toml)* |
| `rewards` | *(see environments.toml)* | *(see environments.toml)* |
| `certificate` | *(see environments.toml)* | *(see environments.toml)* |

Keep `environments.toml` as the single source of truth for live contract IDs.
Do not hard-code them in runbooks.

---

## Related Documents

| Document | Purpose |
|:---------|:--------|
| [docs/UPGRADES.md](../UPGRADES.md) | Upgrade policy, migration patterns, worked `tags` example |
| [docs/operations/admin-rotation.md](./admin-rotation.md) | Admin key management |
| [docs/operations/deployment-rollback.md](./deployment-rollback.md) | Full rollback and incident response |
| [docs/COMPATIBILITY.md](../COMPATIBILITY.md) | Toolchain version matrix |
| [docs/adr/007-admin-multisig-timelock.md](../adr/007-admin-multisig-timelock.md) | Mainnet multi-sig requirements |
| [Soroban upgrade guide](https://developers.stellar.org/docs/smart-contracts/guides/upgrading-contracts) | Official Stellar reference |
