#!/usr/bin/env bash
# Fund the reward pool for a quest. Assumes rewards.initialize has already
# been run (see docs/deploy-testnet.md Section 6.4).
# See docs/testnet-tutorial.md for context.
set -eo pipefail

NETWORK="${NETWORK:-testnet}"
SOURCE_ACCOUNT="${SOURCE_ACCOUNT:-lernza-deployer}"
REWARDS_ID="${REWARDS_ID:?Set REWARDS_ID to the deployed rewards contract id}"
QUEST_NUMERIC_ID="${QUEST_NUMERIC_ID:?Set QUEST_NUMERIC_ID to the numeric quest id to fund}"
FUND_AMOUNT="${FUND_AMOUNT:-10000}"

echo "Funding quest #$QUEST_NUMERIC_ID with $FUND_AMOUNT (raw token units) on $NETWORK..."

stellar contract invoke \
  --id "$REWARDS_ID" \
  --source-account "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- fund_quest \
  --funder "$SOURCE_ACCOUNT" \
  --quest_id "$QUEST_NUMERIC_ID" \
  --amount "$FUND_AMOUNT"
