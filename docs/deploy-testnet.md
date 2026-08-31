# Lernza Contract Deployment (Stellar Testnet)

This guide is a step-by-step runbook for deploying Lernza Soroban contracts to Stellar **testnet**.

Contracts in this repo:
- `contracts/quest` (quest creation and enrollment)
- `contracts/milestone` (milestone definition and completion verification)
- `contracts/rewards` (reward pools and payout)
- `contracts/certificate` (quest-completion certificate NFTs)

`quest` is the contract name for quests.

For a guided, end-to-end walkthrough that also exercises the contracts (create a quest, fund it, enroll a learner, submit and verify a milestone) see [testnet-tutorial.md](testnet-tutorial.md). This document focuses on the deployment mechanics; the tutorial focuses on interacting with contracts once deployed.

## Automated Deployment (Recommended)

To deploy all contracts automatically with error handling, checkpointing, and rollback capability:

```bash
# Automated build & deploy to testnet
./scripts/deploy-contracts.sh --network testnet --build

# Deploy to standalone local network
./scripts/deploy-contracts.sh --network standalone --config-env development

# Rollback deployment checkpoint if an error occurred
./scripts/deploy-contracts.sh --rollback
```

---

## 1. Manual Prerequisites


- Stellar CLI v25.1.0 or later (`stellar --version`; tested with v25.2.0)
- Rust installed (`rustc --version`, `cargo --version`)
- Soroban WASM target available (`rustup target add wasm32-unknown-unknown`)
- A funded Stellar testnet account (testnet XLM)

Optional checks:

```bash
stellar --version
cargo --version
rustup target list | grep wasm32
```

### 1.1 Testnet Account & Faucet Setup

Testnet accounts need testnet XLM (Lumens) to pay transaction fees. The Stellar CLI can create and fund a key in one step:

```bash
# Generate a new local key named "lernza-deployer" and fund it via the
# Friendbot faucet in a single command
stellar keys generate lernza-deployer --network testnet --fund

# Check the account exists and has a balance
stellar keys address lernza-deployer
stellar account fund lernza-deployer --network testnet   # re-fund if needed
```

If you already have a key and just need more testnet XLM, use Friendbot directly:

```bash
curl "https://friendbot.stellar.org/?addr=$(stellar keys address lernza-deployer)"
```

Each Friendbot request funds the account with a fixed amount of testnet XLM (enough for many contract calls). Testnet state is reset periodically by SDF — if your account or contracts disappear, re-run this setup and redeploy.

## 2. Build Contracts

From repo root:

```bash
cargo test --workspace
stellar contract build
```

Expected wasm outputs:
- `target/wasm32v1-none/release/quest.wasm`
- `target/wasm32v1-none/release/milestone.wasm`
- `target/wasm32v1-none/release/rewards.wasm`
- `target/wasm32v1-none/release/certificate.wasm`

## 3. Configure Network + Deployer Identity

```bash
# Add testnet network (safe to re-run; ignore "already exists" message)
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Create deployer and fund with testnet XLM
stellar keys generate lernza-deployer --network testnet --fund

# (or fund an existing key)
stellar keys fund lernza-deployer --network testnet
```

## 4. Get USDC Token Contract Address

Lernza uses **USDC on Stellar** via its Stellar Asset Contract (SAC). The rewards contract requires a token contract address at initialization.

For testnet USDC (issued by the SDF test anchor):

```bash
stellar contract id asset \
  --asset USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 \
  --network testnet
```

If you prefer native XLM for quick testing:

```bash
stellar contract id asset --asset native --network testnet
```

Save the output as:

```bash
TOKEN_ID=<output_from_command_above>
```

## 5. Deploy Contracts

Deploy each contract and copy the returned contract ID. Contracts can be deployed in any order since deployment itself does not create cross-contract references — only the *initialization/usage* sequence in Section 6 is order-dependent.

### 5.1 Deploy quest contract

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/quest.wasm \
  --source-account lernza-deployer \
  --network testnet \
  --alias lernza-quest-testnet
```

Save output as `QUEST_ID`.

### 5.2 Deploy milestone

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/milestone.wasm \
  --source-account lernza-deployer \
  --network testnet \
  --alias lernza-milestone-testnet
```

Save output as `MILESTONE_ID`.

### 5.3 Deploy rewards

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/rewards.wasm \
  --source-account lernza-deployer \
  --network testnet \
  --alias lernza-rewards-testnet
```

Save output as `REWARDS_ID`.

### 5.4 Deploy certificate

The certificate contract's constructor takes the owner/admin address directly, so it is initialized as part of deployment (no separate `initialize` call):

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/certificate.wasm \
  --source-account lernza-deployer \
  --network testnet \
  --alias lernza-certificate-testnet \
  -- \
  --owner lernza-deployer
```

Save output as `CERTIFICATE_ID`.

## 6. Initialization Sequence (Required Order)

Contracts reference each other by address at initialization time (there are
no cross-contract calls at runtime beyond read-only lookups — see
[ARCHITECTURE.md](ARCHITECTURE.md) — but `milestone` and `rewards` both store
peer contract addresses set once during `initialize`). Deploy all four
contracts first (Section 5), then initialize/use them in this order:

1. **`quest`** — initialize the contract admin, then create the quest
2. **`milestone`** — initialize with the `quest` and `certificate` addresses, then define milestones for the quest
3. **`rewards`** — initialize with the token, `quest`, and `milestone` addresses, then fund the quest's reward pool
4. **`certificate`** — mint a completion certificate once a learner finishes the quest

### 6.1 Initialize the quest contract admin (one-time)

```bash
stellar contract invoke \
  --id <QUEST_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- initialize \
  --admin lernza-deployer
```

### 6.2 Create quest

```bash
stellar contract invoke \
  --id <QUEST_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- create_quest \
  --owner lernza-deployer \
  --name "Lernza Test Quest" \
  --description "Deployment check quest" \
  --category "Programming" \
  --tags '[]' \
  --token_addr <TOKEN_ID> \
  --visibility '{"tag":"Public","values":null}'
```

Save output as `QUEST_NUMERIC_ID` (usually `0` for first quest).

### 6.3 Initialize milestone and create a milestone

`milestone.initialize` records the `quest` and `certificate` contract
addresses it will look up during verification, so both must already be
deployed:

```bash
stellar contract invoke \
  --id <MILESTONE_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- initialize \
  --admin lernza-deployer \
  --quest_contract <QUEST_ID> \
  --certificate_contract <CERTIFICATE_ID>

stellar contract invoke \
  --id <MILESTONE_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- create_milestone \
  --owner lernza-deployer \
  --quest_id <QUEST_NUMERIC_ID> \
  --title "First Milestone" \
  --description "Run deployment smoke test" \
  --reward_amount 1000 \
  --requires_previous false
```

Save output as `MILESTONE_NUMERIC_ID` (usually `0` for first milestone in that quest).

### 6.4 Initialize and fund rewards

`rewards.initialize` records the token and the `quest`/`milestone` addresses:

```bash
stellar contract invoke \
  --id <REWARDS_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- initialize \
  --admin lernza-deployer \
  --token_addr <TOKEN_ID> \
  --quest_contract_addr <QUEST_ID> \
  --milestone_contract_addr <MILESTONE_ID>

stellar contract invoke \
  --id <REWARDS_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- fund_quest \
  --funder lernza-deployer \
  --quest_id <QUEST_NUMERIC_ID> \
  --amount 10000
```

### 6.5 Mint a completion certificate

Once a milestone/quest is verified as complete for a learner (see [testnet-tutorial.md](testnet-tutorial.md) for the full enroll-and-submit flow):

```bash
stellar contract invoke \
  --id <CERTIFICATE_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- mint_quest_certificate \
  --quest_id <QUEST_NUMERIC_ID> \
  --quest_name "Lernza Test Quest" \
  --quest_category "Programming" \
  --recipient <LEARNER_ADDRESS>
```

Runnable versions of steps 6.2–6.5 (plus enrollment) are provided as example scripts in [scripts/examples/](../scripts/examples/) — see [testnet-tutorial.md](testnet-tutorial.md).

## 7. Verification Commands

Confirm reward contract was initialized with the expected token:

```bash
stellar contract invoke \
  --id <REWARDS_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- get_token
```

Confirm quest exists:

```bash
stellar contract invoke \
  --id <QUEST_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- get_quest_count

stellar contract invoke \
  --id <QUEST_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- get_quest \
  --quest_id <QUEST_NUMERIC_ID>
```

Confirm milestone exists:

```bash
stellar contract invoke \
  --id <MILESTONE_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- get_milestone_count \
  --quest_id <QUEST_NUMERIC_ID>

stellar contract invoke \
  --id <MILESTONE_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- get_milestone \
  --quest_id <QUEST_NUMERIC_ID> \
  --milestone_id <MILESTONE_NUMERIC_ID>
```

## 8. Troubleshooting

- `AlreadyInitialized` on `rewards.initialize`  
  `initialize` is one-time only. Reuse existing rewards contract, or redeploy a new rewards instance.

- `NotFound` on milestone verification  
  Usually means owner was never registered for that quest in milestone contract (create at least one milestone first), or wrong quest/milestone IDs.

- `OwnerMismatch` in milestone contract  
  First owner that creates a milestone for a quest is locked as owner for that quest in milestone contract.

- `QuestNotFunded` / `InsufficientPool` in rewards contract  
  Call `fund_quest` first and ensure funded amount covers distributions.

- CLI says read-only simulation and does not submit  
  This is normal for getters (e.g., `get_quest_count`, `get_milestone`).

- `source-account`/auth errors  
  Ensure `--source-account` is the expected signer and that the address passed to `--owner`/`--funder` matches authorization expectations.

## 9. Notes From a Verified Testnet Deployment

A deployment run was executed on **2026-03-24** with:
- `REWARDS_ID=CCF2BR6PDYW4BAEPXHIXDNKBBCYWURFSFACHL5SG45XTSF3CT5YY753W`
- `WORKSPACE_ID=CAWNB5LTEXQVXRMPLYT5HTEDEIGMUHNFGYMBWEIET6FQSP47Z7XGOJUD`
- `MILESTONE_ID=CCM6NJGQG2IST2S3BMQC6SUBKYB4WIM7AWYA4UIYOVXY5OQQZBX5GJDO`
- `TOKEN_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` (native XLM SAC used for testing)

Treat these as historical proof of process, not reusable deployment targets for your environment.

## 10. Contract Addresses & Network Configuration

Deployed contract IDs are not hardcoded in the frontend. They are centralized per-environment in `config/*.yaml` and turned into `.env` files by `scripts/load-config.mjs` (see [config/README.md](../config/README.md)):

| File | Environment | Stellar Network |
|---|---|---|
| `config/development.yaml` | Local dev | Standalone |
| `config/staging.yaml` | Pre-production | Testnet |
| `config/production.yaml` | Live | Mainnet |

After deploying, update the `contracts:` block of the relevant config file with the new contract IDs (`quest`, `milestone`, `rewards`, `rewards_token`/`usdc_token`), then regenerate the frontend env file:

```bash
node scripts/load-config.mjs testnet > frontend/.env.local
```

The `certificate` contract is deployed independently (Section 5.4) and is not yet part of the generated frontend bindings pipeline described in [CONTRIBUTING.md](../CONTRIBUTING.md#generating-typescript-contract-bindings) — record its ID alongside the others in your own notes or an additional config key until frontend wiring lands.

Switching networks locally (testnet/mainnet/standalone) is also available via:

```bash
./scripts/switch-network.sh testnet
```

