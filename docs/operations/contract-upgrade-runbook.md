# Contract Upgrade Runbook

Soroban contracts can be upgraded in-place via `update_current_contract_wasm`.
This runbook covers the end-to-end process for safely deploying a new WASM
binary to an existing contract address on Testnet or Mainnet.

## Prerequisites

- Stellar CLI installed and configured (`stellar --version`)
- Admin keypair available (see `docs/operations/admin-rotation.md`)
- New WASM binary built and reviewed (`make build` in the relevant contract dir)
- Access to `environments.toml` for the target network's contract IDs

---

## 1. Build and verify the new WASM

```bash
# From the repo root
cargo build --release --target wasm32-unknown-unknown -p <contract-name>

# Confirm binary size is reasonable (Soroban limit is 64 KB)
ls -lh target/wasm32-unknown-unknown/release/<contract_name>.wasm
```

Run all tests against the new binary before proceeding:

```bash
cargo test -p <contract-name>
```

---

## 2. Upload the WASM to the network

```bash
stellar contract upload \
  --network <testnet|mainnet> \
  --source <admin-keypair-alias> \
  --wasm target/wasm32-unknown-unknown/release/<contract_name>.wasm
```

Note the returned `WASM hash` — you will need it in the next step.

---

## 3. Invoke the upgrade

Each Lernza contract exposes an `upgrade` entry point that calls
`update_current_contract_wasm` internally and is gated to the stored admin
address.

```bash
stellar contract invoke \
  --network <testnet|mainnet> \
  --source <admin-keypair-alias> \
  --id <CONTRACT_ID_FROM_ENVIRONMENTS_TOML> \
  -- upgrade \
  --new_wasm_hash <WASM_HASH_FROM_STEP_2>
```

---

## 4. Verify the upgrade

Confirm the contract is running the new code by calling a read-only function
and checking the response matches expected behaviour from the new binary:

```bash
stellar contract invoke \
  --network <testnet|mainnet> \
  --source <admin-keypair-alias> \
  --id <CONTRACT_ID> \
  -- version   # or any stable read-only entry point
```

Check Stellar Explorer for the upgrade transaction and confirm no error events
were emitted.

---

## 5. Post-upgrade checklist

- [ ] Upgrade transaction confirmed on-chain
- [ ] Read-only smoke test passed
- [ ] `environments.toml` updated if contract ID changed (re-deploy scenario)
- [ ] CHANGELOG entry added referencing the upgrade transaction hash
- [ ] Team notified in the relevant channel

---

## Rollback

Soroban does not support automatic rollback. If the new binary is broken:

1. Re-upload the previous WASM (keep old binaries in `releases/` or CI
   artifacts).
2. Repeat steps 2–4 with the previous WASM hash.
3. Open a post-mortem issue describing what went wrong.

---

## Notes

- Storage layout changes are **not** automatically migrated. If the new binary
  reads keys written by the old binary under a different type, data will be
  unreadable. Plan migrations explicitly and test against a forked state.
- TTL entries are unaffected by upgrades; existing ledger entries retain their
  current TTL.
- Only the stored admin address can call `upgrade`. Confirm the correct keypair
  is loaded before invoking (see `docs/operations/admin-rotation.md`).
