# Testnet Interaction Tutorial

A hands-on walkthrough for interacting with already-deployed Lernza contracts
on Stellar testnet: create a quest, enroll a learner, submit and verify a
milestone, and mint a completion certificate. For the deployment steps
themselves (building WASM, `stellar contract deploy`, initialization calls),
see [deploy-testnet.md](deploy-testnet.md) — this tutorial assumes deployment
is already done.

## 1. Prerequisites

- Contracts deployed and initialized per [deploy-testnet.md](deploy-testnet.md) Sections 5-6
- A funded Stellar CLI identity for the quest owner (default: `lernza-deployer`; see Section 1.1 of that guide for faucet/account setup)
- The deployed contract IDs from your run:

```bash
export NETWORK=testnet
export QUEST_ID=<quest contract id>
export MILESTONE_ID=<milestone contract id>
export REWARDS_ID=<rewards contract id>
export CERTIFICATE_ID=<certificate contract id>
export TOKEN_ID=<reward token / SAC contract id>
export SOURCE_ACCOUNT=lernza-deployer
```

Contract IDs for the current environment also live in `config/*.yaml` — see
[Contract Addresses & Network Configuration](deploy-testnet.md#10-contract-addresses--network-configuration).

## 2. Create a learner identity

A learner needs their own funded Stellar account to sign enrollment and
submission transactions:

```bash
stellar keys generate lernza-learner --network testnet --fund
export LEARNER=$(stellar keys address lernza-learner)
```

## 3. Create a quest

```bash
./scripts/examples/create-quest.sh
```

Read the `create_quest` return value from the output and export it:

```bash
export QUEST_NUMERIC_ID=0   # replace with the actual returned id
```

## 4. Enroll the learner

```bash
./scripts/examples/enroll-learner.sh
```

This calls `add_enrollee` as the quest owner. A learner can alternatively
self-enroll into a public quest with `join_quest`, or redeem an invite code
with `join_quest_with_invite` for a private quest (see
[enrollment-flow.md](enrollment-flow.md)).

## 5. Fund the quest's reward pool

```bash
export FUND_AMOUNT=10000
./scripts/examples/fund-quest.sh
```

This requires `rewards.initialize` to have already been called with the
`quest`/`milestone` contract addresses (Section 6.4 of the deployment guide).

## 6. Create, submit, verify, and reward a milestone

```bash
export REWARD_AMOUNT=1000
./scripts/examples/submit-milestone.sh
```

This single script performs the full milestone lifecycle:
1. `create_milestone` — the owner defines the milestone and its reward
2. `submit_for_review` — the learner submits their completion
3. `verify_completion` — the owner (or, in peer-review mode, other enrollees) verifies it
4. `distribute_reward` — the rewards contract pays the learner from the funded pool

See [milestone-reward-flow.md](milestone-reward-flow.md) for the full state
machine, including peer-review and competitive-distribution modes not
covered by this basic tutorial.

## 7. Mint a completion certificate

Once a milestone is verified, mint the learner a certificate:

```bash
stellar contract invoke \
  --id "$CERTIFICATE_ID" \
  --source-account "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- mint_quest_certificate \
  --quest_id "$QUEST_NUMERIC_ID" \
  --quest_name "Lernza Example Quest" \
  --quest_category "Programming" \
  --recipient "$LEARNER"
```

Confirm it exists:

```bash
stellar contract invoke \
  --id "$CERTIFICATE_ID" \
  --source-account "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- get_user_certificates \
  --user "$LEARNER"
```

## 8. Where to go next

- [deploy-testnet.md](deploy-testnet.md) — deployment mechanics, troubleshooting, and contract address/config management
- [CONTRACT_INTERFACES.md](CONTRACT_INTERFACES.md) — full function reference for every contract
- [EVENT_REFERENCE.md](EVENT_REFERENCE.md) / [events-reference.md](events-reference.md) — events emitted by each call in this tutorial, useful when building an indexer or UI
- [GAS_COSTS.md](GAS_COSTS.md) — expected fees for each call above
