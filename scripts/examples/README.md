# Testnet Interaction Examples

Small, focused scripts that each perform one common on-chain operation against
already-deployed Lernza contracts. They complement the full walkthrough in
[docs/testnet-tutorial.md](../../docs/testnet-tutorial.md) and the deployment
runbook in [docs/deploy-testnet.md](../../docs/deploy-testnet.md).

Each script is a thin wrapper around `stellar contract invoke` — read it
before running it so you understand exactly what it submits.

## Prerequisites

- Contracts already deployed (see [docs/deploy-testnet.md](../../docs/deploy-testnet.md))
- Stellar CLI installed and a funded identity available (default: `lernza-deployer`)
- The following environment variables exported (or edit the defaults at the
  top of each script):

```bash
export NETWORK=testnet
export QUEST_ID=<deployed quest contract id>
export MILESTONE_ID=<deployed milestone contract id>
export REWARDS_ID=<deployed rewards contract id>
export TOKEN_ID=<reward token / SAC contract id>
export SOURCE_ACCOUNT=lernza-deployer
```

## Scripts

| Script | Purpose |
|---|---|
| `create-quest.sh` | Create a new quest and print its numeric ID |
| `enroll-learner.sh` | Enroll a learner address into a quest |
| `fund-quest.sh` | Initialize (if needed) and fund the reward pool for a quest |
| `submit-milestone.sh` | Create a milestone and submit/verify it for a learner |
| `seed-scenarios.sh` | Create multiple example quests in different states for demos |

## Usage

```bash
./scripts/examples/create-quest.sh
QUEST_NUMERIC_ID=0 ./scripts/examples/fund-quest.sh
LEARNER=<learner-address> QUEST_NUMERIC_ID=0 ./scripts/examples/enroll-learner.sh
QUEST_NUMERIC_ID=0 LEARNER=<learner-address> ./scripts/examples/submit-milestone.sh
```

All scripts print the raw `stellar contract invoke` output so you can extract
IDs for the next step.
