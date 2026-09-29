# Deployment Guide

This guide documents the **required contract registration and initialization order** for the
Lernza Soroban contract set, plus the concrete commands for deploying to **testnet** and
**mainnet**.

Follow the order in [Required order](#required-order) exactly. Three of the four contracts
persist the addresses of their peers during initialization, and **none of them expose a
re-initialize or address-setter for those peers**. A deployment that registers or
initializes in the wrong order produces contracts that cannot be repaired in place — you must
deploy a fresh instance.

Related documents:

- [INIT_ORDER.md](docs/contracts/INIT_ORDER.md) — background rationale on ordering
- [deploy-testnet.md](docs/deploy-testnet.md) — testnet mechanics and troubleshooting
- [testnet-tutorial.md](docs/testnet-tutorial.md) — end-to-end exercise after deployment
- [CONTRACT_INTERFACES.md](docs/CONTRACT_INTERFACES.md) — full contract API reference
- [RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) — pre-release sign-off
- [ADR-007](docs/adr/007-admin-multisig-timelock.md) — mainnet admin key policy

---

## Contracts

| Crate | Role | Initialized via | Persists peer addresses? |
|---|---|---|---|
| `contracts/quest` | Quest creation, enrolment, admin | `initialize(admin)` after registration | No |
| `contracts/milestone` | Milestone definition and verification | `initialize(admin, quest_contract, certificate_contract)` | **Yes** — `quest`, `certificate` |
| `contracts/certificate` | Completion certificate tokens | `__constructor(owner)` **at registration** | **Yes** — `owner` is set to the `milestone` address and is fixed permanently |
| `contracts/rewards` | Reward pools and payouts | `initialize(admin, token_addr, quest_contract_addr, milestone_contract_addr)` | **Yes** — token, `quest`, `milestone` |

Throughout this document:

- **Register** = `stellar contract deploy` (upload WASM + install). Registering `milestone`,
  `quest`, and `rewards` does **not** wire them together; a separate `initialize` invocation
  does that.
- **Initialize** = a state-changing `stellar contract invoke -- initialize ...` call.

---

## Required order

The order is not a convention. Three hard constraints produce it:

1. **`certificate` must be registered with the `milestone` address as its owner.** The owner
   is fixed in the `__constructor`, so `milestone` must already be registered (and its
   address known) before `certificate` is deployed. This is the only ordering constraint
   between two *registrations*.
2. **`milestone::initialize` needs the `quest` and `certificate` addresses.** Both contracts
   must be registered first.
3. **`rewards::initialize` needs the `quest` and `milestone` addresses.** Both must be
   registered first.

Execute in exactly this sequence:

| # | Action | Command summary |
|---|---|---|
| 1 | **Register `quest`**, then set its admin | `contract deploy` → `initialize --admin` |
| 2 | **Register `milestone`** | `contract deploy` |
| 3 | **Register `certificate`** with `milestone` as owner | `contract deploy -- --owner <MILESTONE_ID>` |
| 4 | **Initialize `milestone`** with `quest` + `certificate` | `initialize --admin --quest_contract --certificate_contract` |
| 5 | **Register `rewards`** | `contract deploy` |
| 6 | **Initialize `rewards`** with `quest` + `milestone` (+ token) | `initialize --admin --token_addr --quest_contract_addr --milestone_contract_addr` |

### Why each initialize is one-shot

There is no re-initialize path. A second call is rejected and leaves stored state unchanged:

| Contract | Guard | Error on re-initialize |
|---|---|---|
| `quest` | `has(DataKey::Admin)` | `Unauthorized` |
| `milestone` | `has(DataKey::QuestContract)` | `Unauthorized` |
| `rewards` | `has(DataKey::TokenAddr)` | `AlreadyInitialized` |

Capture every contract ID immediately after registration and record it in the environment
config (see [Recording contract IDs](#recording-contract-ids)) before running step 4 and
step 6, so a failed later step can be retried without re-registering.

---

## Prerequisites

- Stellar CLI v25.1.0 or later (`stellar --version`)
- Rust toolchain plus the WASM target (`rustup target add wasm32-unknown-unknown`)
- A funded deployer key on the target network
- A funded **admin** address. This is a separate role from the deployer: `initialize` requires
  `admin.require_auth()`, so the `--admin` address must sign the initialization transactions.

Build the WASM artifacts from the repository root:

```bash
cargo test --workspace
stellar contract build
```

Expected outputs:

- `target/wasm32v1-none/release/quest.wasm`
- `target/wasm32v1-none/release/milestone.wasm`
- `target/wasm32v1-none/release/certificate.wasm`
- `target/wasm32v1-none/release/rewards.wasm`

---

## Testnet

### T1. Configure the network and key

```bash
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

stellar keys generate lernza-deployer --network testnet --fund
stellar keys address lernza-deployer
```

Testnet state is periodically reset by the SDF. If a registered contract disappears, restart
the sequence from step 1.

### T2. Resolve the reward token contract

`rewards::initialize` requires a live Stellar Asset Contract (SAC) address. For testnet USDC
issued by the SDF test anchor:

```bash
TOKEN_ID=$(stellar contract id asset \
  --asset USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 \
  --network testnet)
```

To use native XLM instead: `stellar contract id asset --asset native --network testnet`.

### T3. Steps 1–6

Set the addresses used throughout:

```bash
export DEPLOYER=lernza-deployer
export ADMIN=lernza-deployer
```

**Step 1 — register `quest`, then set its admin.**

```bash
QUEST_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/quest.wasm \
  --source-account "$DEPLOYER" \
  --network testnet \
  --alias lernza-quest-testnet)

stellar contract invoke \
  --id "$QUEST_ID" \
  --source-account "$ADMIN" \
  --network testnet \
  -- initialize \
  --admin "$ADMIN"
```

**Step 2 — register `milestone`.**

`milestone` has no constructor arguments, so registering it does not touch its stored
`quest`/`certificate` addresses.

```bash
MILESTONE_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/milestone.wasm \
  --source-account "$DEPLOYER" \
  --network testnet \
  --alias lernza-milestone-testnet)
```

**Step 3 — register `certificate` with `milestone` as owner.**

This is why `milestone` is registered at step 2: its address must exist before
`certificate` is deployed. Pass the real `$MILESTONE_ID`.

```bash
CERTIFICATE_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/certificate.wasm \
  --source-account "$DEPLOYER" \
  --network testnet \
  --alias lernza-certificate-testnet \
  -- \
  --owner "$MILESTONE_ID")
```

**Step 4 — initialize `milestone` with `quest` + `certificate`.**

```bash
stellar contract invoke \
  --id "$MILESTONE_ID" \
  --source-account "$ADMIN" \
  --network testnet \
  -- initialize \
  --admin "$ADMIN" \
  --quest_contract "$QUEST_ID" \
  --certificate_contract "$CERTIFICATE_ID"
```

**Step 5 — register `rewards`.**

```bash
REWARDS_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/rewards.wasm \
  --source-account "$DEPLOYER" \
  --network testnet \
  --alias lernza-rewards-testnet)
```

**Step 6 — initialize `rewards` with `quest` + `milestone`.**

Note the argument names differ from `milestone::initialize`: this contract uses
`quest_contract_addr` / `milestone_contract_addr` (suffixed), and it also requires
`--token_addr`.

```bash
stellar contract invoke \
  --id "$REWARDS_ID" \
  --source-account "$ADMIN" \
  --network testnet \
  -- initialize \
  --admin "$ADMIN" \
  --token_addr "$TOKEN_ID" \
  --quest_contract_addr "$QUEST_ID" \
  --milestone_contract_addr "$MILESTONE_ID"
```

Record the four IDs before continuing:

```bash
printf 'quest=%s\nmilestone=%s\ncertificate=%s\nrewards=%s\n' \
  "$QUEST_ID" "$MILESTONE_ID" "$CERTIFICATE_ID" "$REWARDS_ID" | tee deployment-ids.env
```

---

## Mainnet

Mainnet differs from testnet in three ways that matter operationally:

1. **Registration is irreversible and costs real XLM.** There is no testnet reset and no
   rollback. A mis-ordered deployment requires deploying a new instance and migrating users.
2. **The token must be a real SAC.** Using the wrong issuer permanently breaks `fund_quest`.
3. **The admin should be a multi-sig account.** See
   [ADR-007](docs/adr/007-admin-multisig-timelock.md), which requires a `2-of-3` signing
   threshold on medium/high operations before launch.

Complete [RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) before starting.

### M1. Configure the network

```bash
stellar network add mainnet \
  --rpc-url https://soroban.stellar.org \
  --network-passphrase "Public Global Stellar Network ; September 2015"
```

The passphrase and RPC URL above match [config/production.yaml](config/production.yaml).
Verify both against the network you intend to deploy to — a mismatched passphrase produces
contract IDs that are unusable on the real network.

### M2. Verify the reward token issuer

Lernza pays rewards in USDC on Stellar via its SAC. **Do not copy an issuer address from an
unverified source.** Obtain the Circle-issued Stellar account from Circle's own published
documentation, confirm it matches what your team already uses, then derive the SAC address:

```bash
TOKEN_ID=$(stellar contract id asset \
  --asset "USDC:<VERIFIED_CIRCLE_ISSUER>" \
  --network mainnet)
```

Re-check the SAC against the token's public metadata on a block explorer before using it in
step 6. An issuer typo is unrecoverable: `rewards` stores the token address permanently and
every `fund_quest` transfer will target the wrong contract.

### M3. Steps 1–6

Use the same six steps as [T3](#t3-steps-16) with two changes:

- `--network testnet` → `--network mainnet`
- `--alias lernza-*-testnet` → `--alias lernza-*-mainnet`

The commands are otherwise identical, and the **order is identical**:

```bash
export DEPLOYER=lernza-deployer
export ADMIN=lernza-multisig        # 2-of-3 account per ADR-007
```

Because `ADMIN` is a multi-sig, `stellar contract invoke` will not complete on its own —
it prints the transaction XDR for the remaining signers. Submit, collect signatures, and
broadcast per your multi-sig procedure.

### M4. Record the contract IDs

Update the `contracts:` block of [config/production.yaml](config/production.yaml) with
`quest`, `milestone`, `rewards`, `certificate`, and `rewards_token` / `usdc_token`, then
regenerate the frontend env file as described in
[Recording contract IDs](#recording-contract-ids).

---

## Recording contract IDs

Contract IDs are centralized per environment in the `config/` directory and rendered into
frontend env files by `scripts/load-config.mjs` (see [config/README.md](config/README.md)):

| File | Environment | Stellar network |
|---|---|---|
| `config/development.yaml` | Local dev | Standalone |
| `config/staging.yaml` | Staging / testnet | Testnet |
| `config/production.yaml` | Live | Mainnet |

```bash
node scripts/load-config.mjs staging     # testnet
node scripts/load-config.mjs production  # mainnet
```

The commands print env vars to stdout; redirect them into the frontend env file
(see [config/README.md](config/README.md) for the exact redirect target, and
`frontend/.env.example` for the variables the frontend expects). `load-config.mjs` also
accepts `testnet` and `mainnet` as aliases for `staging` and `production`.

Update the config **after** step 6 succeeds, so a partially completed deployment never leaves
the frontend pointed at half-wired contracts.

---

## Verification

Confirm the administrator and, where exposed, the stored peer address:

```bash
stellar contract invoke --id "$QUEST_ID"      --network testnet -- get_admin
stellar contract invoke --id "$MILESTONE_ID"  --network testnet -- get_admin
stellar contract invoke --id "$CERTIFICATE_ID" --network testnet -- get_admin
stellar contract invoke --id "$REWARDS_ID"    --network testnet -- get_admin
stellar contract invoke --id "$REWARDS_ID"    --network testnet -- get_token
```

Read-only calls simulate rather than submit. That is expected.

`certificate::get_admin` should return `$MILESTONE_ID`, confirming step 3 wired the owner
correctly.

### Cross-wiring smoke test

`milestone` and `rewards` do **not** expose getters for the peer addresses they stored during
initialization, so a successful `initialize` is the only direct confirmation. Validate the
wiring functionally instead — each call below fails if the stored address is wrong.

**1. Create a quest on `quest`.** Use the same `$TOKEN_ID` that was passed to
`rewards::initialize` in step 6:

```bash
stellar contract invoke \
  --id "$QUEST_ID" --source-account "$ADMIN" --network testnet \
  -- create_quest \
  --owner "$ADMIN" \
  --name "Deployment smoke test" \
  --description "Wiring check" \
  --category "Programming" \
  --tags '[]' \
  --token_addr "$TOKEN_ID" \
  --visibility '{"tag":"Public","values":null}'
```

The optional `max_enrollees` and `deadline` arguments may be omitted. Note the returned quest
ID — it is `0` on a fresh contract.

**2. Create a milestone on `milestone` — proves the `milestone` → `quest` link.**

```bash
stellar contract invoke \
  --id "$MILESTONE_ID" --source-account "$ADMIN" --network testnet \
  -- create_milestone \
  --owner "$ADMIN" \
  --quest_id 0 \
  --title "Deployment smoke test" \
  --description "Wiring check" \
  --reward_amount 1000 \
  --requires_previous false
```

**3. Fund the quest on `rewards` — proves the `rewards` → `quest` link.**
`fund_quest` cross-calls `quest` to confirm the funder owns the quest, and rejects the call
with `InvalidToken` unless the quest's `token_addr` matches the `rewards` token:

```bash
stellar contract invoke \
  --id "$REWARDS_ID" --source-account "$ADMIN" --network testnet \
  -- fund_quest \
  --funder "$ADMIN" \
  --quest_id 0 \
  --amount 10000
```

A successful `fund_quest` proves the `rewards` → `quest` link. The `rewards` → `milestone`
link is exercised by `distribute_reward` during a real payout — see
[testnet-tutorial.md](docs/testnet-tutorial.md).

---

## Failure modes

| Mistake | Symptom | Fix |
|---|---|---|
| Step 3 before step 2 (`certificate` deployed before `milestone`) | `$MILESTONE_ID` is empty or wrong; `certificate::get_admin` returns the wrong address | Redeploy `certificate` — the owner cannot be changed after construction |
| Step 4 before steps 1 and 3 | `milestone::initialize` stores a bad address; cross-contract calls fail later | Redeploy `milestone`; there is no re-initialize |
| Step 6 before steps 1 and 2 | `rewards::initialize` stores a bad address; `distribute_reward` fails during completion checks | Redeploy `rewards`; re-initialize returns `AlreadyInitialized` |
| Second `initialize` on `quest` / `milestone` | `Unauthorized` | Expected. State unchanged — continue, do not retry |
| Second `initialize` on `rewards` | `AlreadyInitialized` | Expected. State unchanged — continue, do not retry |
| Quest `token_addr` ≠ `rewards` token | `fund_quest` fails with `InvalidToken` | Create new quests with the step 6 token; existing quests cannot be re-tokenised |
| Network passphrase mismatch | Contract IDs unusable on the intended network | Redeploy on the correct network |
| Admin key cannot sign the `initialize` call | Auth failure | `--admin` must be an address that signs; re-run with the correct source account |

---

## Operational notes

### Certificate ownership is permanent

Setting the `milestone` contract as the `certificate` owner (step 3) is required so that
milestone-driven issuance is authorized. Two consequences to plan for:

- `certificate` exposes no transfer or renounce function. Once registered, the owner cannot
  be changed — only a new `certificate` instance can be deployed.
- Functions guarded by `#[only_owner]` can no longer be called by the admin key once the
  owner is a contract address: `upgrade`, `mint_certificate`, `mint_quest_certificate`,
  `revoke_certificate`, `set_metadata_base`, `pause`, `unpause`, and
  `set_milestone_contract`. Plan certificate governance accordingly.
- `verify_and_issue` is **not** owner-gated and cross-calls the milestone contract to confirm
  completion, so it remains callable after the owner is set to the `milestone` address.
  `verify_and_issue` requires `set_milestone_contract` to have been called; note that
  `set_milestone_contract` is itself owner-gated.

### Automation caveat

[scripts/deploy-contracts.sh](scripts/deploy-contracts.sh) does **not** implement the order in
this guide: it registers `rewards` before `quest` and `milestone`, deploys `certificate`
without an owner, and calls `rewards::initialize` with only `token_addr`. Use the manual
sequence above until that script is updated.

### Rollback

Registration cannot be rolled back on-chain. To recover from a mis-ordered deployment, deploy
a fresh instance set following the required order, then migrate:

- See [deployment-rollback.md](docs/operations/deployment-rollback.md)
- See [contract-upgrade-runbook.md](docs/operations/contract-upgrade-runbook.md)
  for in-place upgrades after a correct initialization
- See [admin-rotation.md](docs/operations/admin-rotation.md) for admin
  key handover

### Mainnet admin policy

Per [ADR-007](docs/adr/007-admin-multisig-timelock.md), mainnet admin operations should run
through a `2-of-3` multi-sig with a 48-hour public notice for non-emergency actions, and a
single designated signer at the low threshold for emergency pausing.
