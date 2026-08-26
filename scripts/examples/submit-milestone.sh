#!/usr/bin/env bash
# Create a milestone, have a learner submit it for review, verify it as the
# quest owner, and distribute the reward. Assumes milestone.initialize and
# rewards.initialize have already been run (see docs/deploy-testnet.md
# Sections 6.3-6.4) and the learner is already enrolled (enroll-learner.sh).
#
# See docs/testnet-tutorial.md for context.
set -eo pipefail

NETWORK="${NETWORK:-testnet}"
SOURCE_ACCOUNT="${SOURCE_ACCOUNT:-lernza-deployer}"
MILESTONE_ID="${MILESTONE_ID:?Set MILESTONE_ID to the deployed milestone contract id}"
REWARDS_ID="${REWARDS_ID:?Set REWARDS_ID to the deployed rewards contract id}"
QUEST_NUMERIC_ID="${QUEST_NUMERIC_ID:?Set QUEST_NUMERIC_ID to the numeric quest id}"
LEARNER="${LEARNER:?Set LEARNER to the enrolled learner address}"
MILESTONE_TITLE="${MILESTONE_TITLE:-Example Milestone}"
MILESTONE_DESCRIPTION="${MILESTONE_DESCRIPTION:-Created by scripts/examples/submit-milestone.sh}"
REWARD_AMOUNT="${REWARD_AMOUNT:-1000}"

echo "Creating milestone \"$MILESTONE_TITLE\" for quest #$QUEST_NUMERIC_ID..."
CREATE_OUTPUT=$(stellar contract invoke \
  --id "$MILESTONE_ID" \
  --source-account "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- create_milestone \
  --owner "$SOURCE_ACCOUNT" \
  --quest_id "$QUEST_NUMERIC_ID" \
  --title "$MILESTONE_TITLE" \
  --description "$MILESTONE_DESCRIPTION" \
  --reward_amount "$REWARD_AMOUNT" \
  --requires_previous false)
echo "$CREATE_OUTPUT"
MILESTONE_NUMERIC_ID="${MILESTONE_NUMERIC_ID:-$CREATE_OUTPUT}"

echo "Learner $LEARNER submitting milestone #$MILESTONE_NUMERIC_ID for review..."
stellar contract invoke \
  --id "$MILESTONE_ID" \
  --source-account "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- submit_for_review \
  --enrollee "$LEARNER" \
  --quest_id "$QUEST_NUMERIC_ID" \
  --milestone_id "$MILESTONE_NUMERIC_ID"

echo "Owner verifying completion..."
stellar contract invoke \
  --id "$MILESTONE_ID" \
  --source-account "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- verify_completion \
  --owner "$SOURCE_ACCOUNT" \
  --quest_id "$QUEST_NUMERIC_ID" \
  --milestone_id "$MILESTONE_NUMERIC_ID" \
  --enrollee "$LEARNER"

echo "Distributing reward..."
stellar contract invoke \
  --id "$REWARDS_ID" \
  --source-account "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- distribute_reward \
  --caller "$SOURCE_ACCOUNT" \
  --quest_id "$QUEST_NUMERIC_ID" \
  --milestone_id "$MILESTONE_NUMERIC_ID" \
  --enrollee "$LEARNER" \
  --amount "$REWARD_AMOUNT"
