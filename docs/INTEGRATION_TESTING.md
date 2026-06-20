# Integration Testing Guide

A frontend developer should be productive in 30 minutes with this guide. It covers building the contracts, deploying them to a local Stellar node, and pointing the frontend at the local contract IDs.

## Prerequisites

| Tool | Version | Install |
|:-----|:--------|:--------|
| Rust + WASM target | stable | `rustup target add wasm32-unknown-unknown` |
| Stellar CLI | 25.x | [install guide](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli) |
| Node.js | 24.x | [nodejs.org](https://nodejs.org) or `.nvmrc` with nvm |
| pnpm | 9.x | `npm i -g pnpm` |
| Docker | any | Required for `stellar network start` |

Verify:

```bash
stellar --version   # 25.x
cargo --version
rustup target list --installed | grep wasm32
node --version      # v24.x
```

---

## Step 1 — Build the Contracts

From the repo root:

```bash
cargo test --workspace   # confirm all tests pass first
stellar contract build   # compiles to target/wasm32v1-none/release/
```

Expected outputs:

```
target/wasm32v1-none/release/quest.wasm
target/wasm32v1-none/release/milestone.wasm
target/wasm32v1-none/release/rewards.wasm
target/wasm32v1-none/release/certificate.wasm
```

---

## Step 2 — Start a Local Stellar Node

```bash
stellar network start local
```

This starts a local Stellar node with Soroban enabled. The RPC endpoint is `http://localhost:8000/soroban/rpc`.

Add it as a named network (safe to re-run):

```bash
stellar network add local \
  --rpc-url http://localhost:8000/soroban/rpc \
  --network-passphrase "Standalone Network ; February 2017"
```

---

## Step 3 — Create a Deployer Identity

```bash
stellar keys generate local-deployer --network local --fund
stellar keys use local-deployer
```

---

## Step 4 — Get the Native Token Address

For local testing, use the native XLM SAC:

```bash
TOKEN_ID=$(stellar contract id asset --asset native --network local)
echo "TOKEN_ID=$TOKEN_ID"
```

---

## Step 5 — Deploy All Four Contracts

Run these in order and save each contract ID.

```bash
# Quest contract
QUEST_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/quest.wasm \
  --source-account local-deployer \
  --network local \
  --alias local-quest)
echo "QUEST_ID=$QUEST_ID"

# Certificate contract (needed by milestone)
CERT_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/certificate.wasm \
  --source-account local-deployer \
  --network local \
  --alias local-certificate)
echo "CERT_ID=$CERT_ID"

# Milestone contract
MILESTONE_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/milestone.wasm \
  --source-account local-deployer \
  --network local \
  --alias local-milestone)
echo "MILESTONE_ID=$MILESTONE_ID"

# Rewards contract
REWARDS_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/rewards.wasm \
  --source-account local-deployer \
  --network local \
  --alias local-rewards)
echo "REWARDS_ID=$REWARDS_ID"
```

---

## Step 6 — Initialize the Contracts

Initialize in this exact order:

```bash
# 1. Quest contract
stellar contract invoke --id $QUEST_ID --source-account local-deployer --network local \
  -- initialize --admin local-deployer

# 2. Certificate contract
stellar contract invoke --id $CERT_ID --source-account local-deployer --network local \
  -- __constructor --owner $MILESTONE_ID

# 3. Milestone contract (needs quest + certificate addresses)
stellar contract invoke --id $MILESTONE_ID --source-account local-deployer --network local \
  -- initialize \
  --admin local-deployer \
  --quest-contract $QUEST_ID \
  --certificate-contract $CERT_ID

# 4. Rewards contract (needs quest + milestone addresses)
stellar contract invoke --id $REWARDS_ID --source-account local-deployer --network local \
  -- initialize \
  --token-addr $TOKEN_ID \
  --quest-contract-addr $QUEST_ID \
  --milestone-contract-addr $MILESTONE_ID
```

---

## Step 7 — Smoke Test the Full Flow

Create a test identity for a learner:

```bash
stellar keys generate local-learner --network local --fund
```

### 7.1 Create a quest

```bash
stellar contract invoke --id $QUEST_ID --source-account local-deployer --network local \
  -- create_quest \
  --owner local-deployer \
  --name '"Test Quest"' \
  --description '"Integration test quest"' \
  --category '"Testing"' \
  --tags '[]' \
  --token-addr $TOKEN_ID \
  --visibility '{"Public": null}' \
  --max-enrollees 'null'
# Returns: 0  (quest_id)
```

### 7.2 Fund the quest pool

```bash
stellar contract invoke --id $REWARDS_ID --source-account local-deployer --network local \
  -- fund_quest \
  --funder local-deployer \
  --quest-id 0 \
  --amount 10000000
```

### 7.3 Create a milestone

```bash
stellar contract invoke --id $MILESTONE_ID --source-account local-deployer --network local \
  -- create_milestone \
  --owner local-deployer \
  --quest-id 0 \
  --title '"First milestone"' \
  --description '"Complete the first task"' \
  --reward-amount 5000000 \
  --requires-previous false
# Returns: 0  (milestone_id)
```

### 7.4 Enroll the learner

```bash
stellar contract invoke --id $QUEST_ID --source-account local-deployer --network local \
  -- add_enrollee \
  --quest-id 0 \
  --enrollee local-learner
```

### 7.5 Verify completion and distribute reward

```bash
# Verify completion (owner marks learner as done)
stellar contract invoke --id $MILESTONE_ID --source-account local-deployer --network local \
  -- verify_completion \
  --owner local-deployer \
  --quest-id 0 \
  --milestone-id 0 \
  --enrollee local-learner

# Distribute reward
stellar contract invoke --id $REWARDS_ID --source-account local-deployer --network local \
  -- distribute_reward \
  --authority local-deployer \
  --quest-id 0 \
  --milestone-id 0 \
  --enrollee local-learner \
  --amount 5000000
```

### 7.6 Verify state

```bash
# Check pool balance (should be 5000000 after one payout)
stellar contract invoke --id $REWARDS_ID --network local \
  -- get_pool_balance --quest-id 0

# Check learner earnings
stellar contract invoke --id $REWARDS_ID --network local \
  -- get_user_earnings --user local-learner

# Check milestone completion
stellar contract invoke --id $MILESTONE_ID --network local \
  -- is_completed --quest-id 0 --milestone-id 0 --enrollee local-learner
```

---

## Step 8 — Point the Frontend at Local Contracts

Copy the example env file and fill in the local contract IDs:

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_NETWORK=local
VITE_RPC_URL=http://localhost:8000/soroban/rpc
VITE_NETWORK_PASSPHRASE="Standalone Network ; February 2017"
VITE_QUEST_CONTRACT_ID=<QUEST_ID>
VITE_MILESTONE_CONTRACT_ID=<MILESTONE_ID>
VITE_REWARDS_CONTRACT_ID=<REWARDS_ID>
VITE_CERTIFICATE_CONTRACT_ID=<CERT_ID>
VITE_TOKEN_CONTRACT_ID=<TOKEN_ID>
```

Start the frontend:

```bash
pnpm install
pnpm dev   # → http://localhost:5173
```

Connect Freighter, switch it to the local network, and import the `local-deployer` secret key to test owner flows.

---

## Running the Existing Test Suites

### Rust unit + integration tests

```bash
# All contracts
cargo test --workspace

# Single contract
cargo test -p milestone

# With output
cargo test --workspace -- --nocapture
```

### Frontend unit tests

```bash
cd frontend
pnpm test          # vitest watch mode
pnpm test --run    # single pass (CI mode)
```

### Frontend e2e tests (Playwright)

```bash
cd frontend
pnpm exec playwright install --with-deps
pnpm exec playwright test
```

---

## Troubleshooting

**`AlreadyInitialized`** — The contract was already initialized. Redeploy a fresh instance or use the existing one.

**`OwnerMismatch`** — The `--owner` passed to `create_milestone` or `verify_completion` does not match the quest owner stored in the quest contract. Ensure you use the same identity that called `create_quest`.

**`MilestoneNotCompleted`** — `distribute_reward` was called before `verify_completion`. Always verify first.

**`RewardAmountMismatch`** — The `--amount` passed to `distribute_reward` must exactly match the `reward_amount` set when the milestone was created.

**`RefundWindowNotOpen`** — `refund_pool` requires the quest to be archived and 7 days (604,800 seconds) to have elapsed since `archived_at`.

**`InvalidToken`** — The token address passed to `fund_quest` must match the token the rewards contract was initialized with, and must be a valid SAC.

**Freighter not connecting to local node** — In Freighter settings, add a custom network with RPC URL `http://localhost:8000/soroban/rpc` and passphrase `Standalone Network ; February 2017`.

**`stellar network start` fails** — Ensure Docker is running. Run `stellar network stop local` first if a stale instance exists.
