# Lernza Contract Deployment (Stellar Testnet)

This guide is a step-by-step runbook for deploying Lernza Soroban contracts to Stellar **testnet**.

Contracts in this repo:
- `contracts/rewards` (reward pools and payout)
- `contracts/workspace` (quest/workspace creation and enrollment)
- `contracts/milestone` (milestone definition and completion verification)

`workspace` is the current contract name for quests.

## 1. Prerequisites

- Stellar CLI installed (`stellar --version`)  
  Tested with: `stellar 25.1.0`
- Rust installed (`rustc --version`, `cargo --version`)
- Soroban WASM target available (`rustup target add wasm32-unknown-unknown`)
- A funded Stellar testnet account (testnet XLM)

Optional checks:

```bash
stellar --version
cargo --version
rustup target list --installed
```

## 2. Build Contracts

From repo root:

```bash
cargo test --workspace
stellar contract build
```

Expected wasm outputs:
- `target/wasm32v1-none/release/rewards.wasm`
- `target/wasm32v1-none/release/workspace.wasm`
- `target/wasm32v1-none/release/milestone.wasm`

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

## 4. Get Reward Token Contract Address

Lernza rewards contract requires a token contract address at initialization.

For native testnet XLM (SAC wrapper):

```bash
stellar contract id asset --asset native --network testnet
```

Save this as:

```bash
TOKEN_ID=<output_from_command_above>
```

## 5. Deploy Contracts

Deploy each contract and copy the returned contract ID.

### 5.1 Deploy rewards

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/rewards.wasm \
  --source-account lernza-deployer \
  --network testnet \
  --alias lernza-rewards-testnet
```

Save output as `REWARDS_ID`.

### 5.2 Deploy workspace (quest)

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/workspace.wasm \
  --source-account lernza-deployer \
  --network testnet \
  --alias lernza-workspace-testnet
```

Save output as `WORKSPACE_ID`.

### 5.3 Deploy milestone

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/milestone.wasm \
  --source-account lernza-deployer \
  --network testnet \
  --alias lernza-milestone-testnet
```

Save output as `MILESTONE_ID`.

## 6. Initialization Sequence (Required Order)

Required order for first setup:
1. Initialize `rewards`
2. Create quest in `workspace`
3. Create milestone in `milestone`

### 6.1 Initialize rewards first

```bash
stellar contract invoke \
  --id <REWARDS_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- initialize \
  --token_addr <TOKEN_ID>
```

### 6.2 Create quest/workspace

```bash
stellar contract invoke \
  --id <WORKSPACE_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- create_workspace \
  --owner lernza-deployer \
  --name "Lernza Test Quest" \
  --description "Deployment check quest" \
  --token_addr <TOKEN_ID>
```

Save output as `WORKSPACE_NUMERIC_ID` (usually `0` for first quest/workspace).

### 6.3 Create milestone

```bash
stellar contract invoke \
  --id <MILESTONE_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- create_milestone \
  --owner lernza-deployer \
  --workspace_id <WORKSPACE_NUMERIC_ID> \
  --title "First Milestone" \
  --description "Run deployment smoke test" \
  --reward_amount 1000
```

Save output as `MILESTONE_NUMERIC_ID` (usually `0` for first milestone in that workspace).

## 7. Verification Commands

Confirm reward contract was initialized with the expected token:

```bash
stellar contract invoke \
  --id <REWARDS_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- get_token
```

Confirm quest/workspace exists:

```bash
stellar contract invoke \
  --id <WORKSPACE_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- get_workspace_count

stellar contract invoke \
  --id <WORKSPACE_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- get_workspace \
  --workspace_id <WORKSPACE_NUMERIC_ID>
```

Confirm milestone exists:

```bash
stellar contract invoke \
  --id <MILESTONE_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- get_milestone_count \
  --workspace_id <WORKSPACE_NUMERIC_ID>

stellar contract invoke \
  --id <MILESTONE_ID> \
  --source-account lernza-deployer \
  --network testnet \
  -- get_milestone \
  --workspace_id <WORKSPACE_NUMERIC_ID> \
  --milestone_id <MILESTONE_NUMERIC_ID>
```

## 8. Troubleshooting

- `AlreadyInitialized` on `rewards.initialize`  
  `initialize` is one-time only. Reuse existing rewards contract, or redeploy a new rewards instance.

- `NotFound` on milestone verification  
  Usually means owner was never registered for that workspace in milestone contract (create at least one milestone first), or wrong workspace/milestone IDs.

- `OwnerMismatch` in milestone contract  
  First owner that creates a milestone for a workspace is locked as owner for that workspace in milestone contract.

- `WorkspaceNotFunded` / `InsufficientPool` in rewards contract  
  Call `fund_workspace` first and ensure funded amount covers distributions.

- CLI says read-only simulation and does not submit  
  This is normal for getters (e.g., `get_workspace_count`, `get_milestone`).

- `source-account`/auth errors  
  Ensure `--source-account` is the expected signer and that the address passed to `--owner`/`--funder` matches authorization expectations.

## 9. Notes From a Verified Testnet Deployment

A deployment run was executed on **2026-03-24** with:
- `REWARDS_ID=CCF2BR6PDYW4BAEPXHIXDNKBBCYWURFSFACHL5SG45XTSF3CT5YY753W`
- `WORKSPACE_ID=CAWNB5LTEXQVXRMPLYT5HTEDEIGMUHNFGYMBWEIET6FQSP47Z7XGOJUD`
- `MILESTONE_ID=CCM6NJGQG2IST2S3BMQC6SUBKYB4WIM7AWYA4UIYOVXY5OQQZBX5GJDO`
- `TOKEN_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` (native XLM SAC)

Treat these as historical proof of process, not reusable deployment targets for your environment.
