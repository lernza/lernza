#!/usr/bin/env bash
# Enroll a learner into an existing quest as its owner.
# See docs/testnet-tutorial.md for context.
set -eo pipefail

NETWORK="${NETWORK:-testnet}"
SOURCE_ACCOUNT="${SOURCE_ACCOUNT:-lernza-deployer}"
QUEST_ID="${QUEST_ID:?Set QUEST_ID to the deployed quest contract id}"
QUEST_NUMERIC_ID="${QUEST_NUMERIC_ID:?Set QUEST_NUMERIC_ID to the numeric quest id returned by create-quest.sh}"
LEARNER="${LEARNER:?Set LEARNER to the learner address to enroll}"

echo "Enrolling $LEARNER into quest #$QUEST_NUMERIC_ID on $NETWORK..."

stellar contract invoke \
  --id "$QUEST_ID" \
  --source-account "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- add_enrollee \
  --quest_id "$QUEST_NUMERIC_ID" \
  --enrollee "$LEARNER"
