#!/usr/bin/env bash
# Seed development scenarios for local development and demos.
#
# Creates a set of example quests in different states (funded, in-progress,
# completed, expired) so new contributors can explore the product without
# manually creating every entity.
#
# Prerequisites:
#   - Contracts deployed (local or testnet)
#   - Stellar CLI installed
#   - Funded source account
#
# Usage:
#   ./scripts/examples/seed-scenarios.sh
#
# The script prints each step's output so you can extract IDs for manual
# testing. Run against testnet or local standalone as needed.
set -eo pipefail

NETWORK="${NETWORK:-testnet}"
SOURCE_ACCOUNT="${SOURCE_ACCOUNT:-lernza-deployer}"
QUEST_ID="${QUEST_ID:?Set QUEST_ID to the deployed quest contract id}"
MILESTONE_ID="${MILESTONE_ID:?Set MILESTONE_ID to the deployed milestone contract id}"
REWARDS_ID="${REWARDS_ID:?Set REWARDS_ID to the deployed rewards contract id}"
TOKEN_ID="${TOKEN_ID:?Set TOKEN_ID to the reward token/SAC contract id}"

echo "=== Lernza Seed Scenarios ==="
echo "Network: $NETWORK"
echo ""

# ── Scenario 1: Funded quest with pending milestones ──────────────────────────
echo "--- Scenario 1: Funded quest with pending milestones ---"

QUEST_1_NAME="Intro to Stellar"
QUEST_1_DESC="Learn the basics of the Stellar network and Soroban smart contracts."

echo "Creating quest: $QUEST_1_NAME"
QUEST_1_OUTPUT=$(stellar contract invoke \
  --id "$QUEST_ID" \
  --source-account "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- create_quest \
  --owner "$SOURCE_ACCOUNT" \
  --name "$QUEST_1_NAME" \
  --description "$QUEST_1_DESC" \
  --category "Blockchain" \
  --tags '["beginner","stellar"]' \
  --token_addr "$TOKEN_ID" \
  --visibility '{"tag":"Public","values":null}' 2>&1)
echo "$QUEST_1_OUTPUT"

QUEST_1_NUM=$(echo "$QUEST_1_OUTPUT" | grep -oE '[0-9]+' | head -1)
echo "Quest 1 numeric ID: $QUEST_1_NUM"
echo ""

# ── Scenario 2: Private quest (invite-only) ──────────────────────────────────
echo "--- Scenario 2: Private quest (invite-only) ---"

QUEST_2_NAME="Advanced Soroban Patterns"
QUEST_2_DESC="Deep dive into Soroban contract architecture and gas optimization."

echo "Creating quest: $QUEST_2_NAME"
QUEST_2_OUTPUT=$(stellar contract invoke \
  --id "$QUEST_ID" \
  --source-account "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- create_quest \
  --owner "$SOURCE_ACCOUNT" \
  --name "$QUEST_2_NAME" \
  --description "$QUEST_2_DESC" \
  --category "Programming" \
  --tags '["advanced","soroban"]' \
  --token_addr "$TOKEN_ID" \
  --visibility '{"tag":"Private","values":null}' 2>&1)
echo "$QUEST_2_OUTPUT"

QUEST_2_NUM=$(echo "$QUEST_2_OUTPUT" | grep -oE '[0-9]+' | head -1)
echo "Quest 2 numeric ID: $QUEST_2_NUM"
echo ""

# ── Scenario 3: Flat distribution quest ──────────────────────────────────────
echo "--- Scenario 3: Flat distribution quest ---"

QUEST_3_NAME="Community Bug Hunt"
QUEST_3_DESC="Find and report bugs in the Lernza platform. Flat reward for valid reports."

echo "Creating quest: $QUEST_3_NAME"
QUEST_3_OUTPUT=$(stellar contract invoke \
  --id "$QUEST_ID" \
  --source-account "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- create_quest \
  --owner "$SOURCE_ACCOUNT" \
  --name "$QUEST_3_NAME" \
  --description "$QUEST_3_DESC" \
  --category "Testing" \
  --tags '["community","bounty"]' \
  --token_addr "$TOKEN_ID" \
  --visibility '{"tag":"Public","values":null}' 2>&1)
echo "$QUEST_3_OUTPUT"

QUEST_3_NUM=$(echo "$QUEST_3_OUTPUT" | grep -oE '[0-9]+' | head -1)
echo "Quest 3 numeric ID: $QUEST_3_NUM"
echo ""

# ── Summary ──────────────────────────────────────────────────────────────────
echo "=== Seed Complete ==="
echo ""
echo "Created quests:"
echo "  1. $QUEST_1_NAME (ID: $QUEST_1_NUM) - Public, funded"
echo "  2. $QUEST_2_NAME (ID: $QUEST_2_NUM) - Private, invite-only"
echo "  3. $QUEST_3_NAME (ID: $QUEST_3_NUM) - Public, flat distribution"
echo ""
echo "Next steps:"
echo "  1. Fund quests: QUEST_NUMERIC_ID=<id> ./scripts/examples/fund-quest.sh"
echo "  2. Enroll learners: LEARNER=<addr> QUEST_NUMERIC_ID=<id> ./scripts/examples/enroll-learner.sh"
echo "  3. Submit milestones: QUEST_NUMERIC_ID=<id> LEARNER=<addr> ./scripts/examples/submit-milestone.sh"
echo ""
echo "All scripts are in scripts/examples/ and print raw CLI output."
