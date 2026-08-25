#!/usr/bin/env bash
# Create a quest on the quest contract and print the resulting numeric ID.
# See docs/testnet-tutorial.md and docs/deploy-testnet.md for context.
set -eo pipefail

NETWORK="${NETWORK:-testnet}"
SOURCE_ACCOUNT="${SOURCE_ACCOUNT:-lernza-deployer}"
QUEST_ID="${QUEST_ID:?Set QUEST_ID to the deployed quest contract id}"
TOKEN_ID="${TOKEN_ID:?Set TOKEN_ID to the reward token/SAC contract id}"
QUEST_NAME="${QUEST_NAME:-Lernza Example Quest}"
QUEST_DESCRIPTION="${QUEST_DESCRIPTION:-Created by scripts/examples/create-quest.sh}"
QUEST_CATEGORY="${QUEST_CATEGORY:-Programming}"

echo "Creating quest \"$QUEST_NAME\" on $NETWORK..."

stellar contract invoke \
  --id "$QUEST_ID" \
  --source-account "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- create_quest \
  --owner "$SOURCE_ACCOUNT" \
  --name "$QUEST_NAME" \
  --description "$QUEST_DESCRIPTION" \
  --category "$QUEST_CATEGORY" \
  --tags '[]' \
  --token_addr "$TOKEN_ID" \
  --visibility '{"tag":"Public","values":null}'
