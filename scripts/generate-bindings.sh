#!/usr/bin/env bash
# generate-bindings.sh
#
# Generates TypeScript bindings for all Lernza Soroban contracts.
# Can be run from any directory — it always navigates to the repo root first.
#
# Usage:
#   ./scripts/generate-bindings.sh              # Build contracts then generate bindings
#   ./scripts/generate-bindings.sh --skip-build # Skip build, use existing WASM files
#

# Navigate to repo root (parent of the scripts/ directory)
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
# Prerequisites:
#   - Stellar CLI installed (https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli)
#   - Contract IDs set in frontend/.env (copy from frontend/.env.example)
#   - Rust + wasm32v1-none target installed for contract builds

set -euo pipefail

# ---------------------------------------------------------------------------
# Load contract IDs from frontend/.env
# Parsed manually to avoid sourcing issues with values that contain spaces
# or shell metacharacters (e.g. VITE_NETWORK_PASSPHRASE=Test SDF Network ; ...)
# ---------------------------------------------------------------------------
get_env_var() {
  local key="$1"
  local file="$2"
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2-
}

if [ -f "frontend/.env" ]; then
  QUEST_CONTRACT_ID="$(get_env_var VITE_QUEST_CONTRACT_ID frontend/.env)"
  MILESTONE_CONTRACT_ID="$(get_env_var VITE_MILESTONE_CONTRACT_ID frontend/.env)"
  REWARDS_CONTRACT_ID="$(get_env_var VITE_REWARDS_CONTRACT_ID frontend/.env)"
else
  QUEST_CONTRACT_ID=""
  MILESTONE_CONTRACT_ID=""
  REWARDS_CONTRACT_ID=""
fi

if [ -z "$QUEST_CONTRACT_ID" ] || [ -z "$MILESTONE_CONTRACT_ID" ] || [ -z "$REWARDS_CONTRACT_ID" ]; then
  echo "Error: contract IDs are not set."
  echo ""
  echo "Copy frontend/.env.example to frontend/.env and fill in the deployed contract IDs:"
  echo "  VITE_QUEST_CONTRACT_ID=<your quest contract ID>"
  echo "  VITE_MILESTONE_CONTRACT_ID=<your milestone contract ID>"
  echo "  VITE_REWARDS_CONTRACT_ID=<your rewards contract ID>"
  echo ""
  echo "Deploy the contracts to Stellar testnet first:"
  echo "  stellar contract build"
  echo "  stellar contract deploy --wasm target/wasm32v1-none/release/quest.wasm --network testnet"
  exit 1
fi

# ---------------------------------------------------------------------------
# Build contracts (unless --skip-build is passed)
# ---------------------------------------------------------------------------
SKIP_BUILD=false
for arg in "$@"; do
  [ "$arg" = "--skip-build" ] && SKIP_BUILD=true
done

if [ "$SKIP_BUILD" = false ]; then
  echo "Building contracts..."
  stellar contract build
  echo ""
fi

# ---------------------------------------------------------------------------
# Generate TypeScript bindings
# ---------------------------------------------------------------------------
OUTPUT_BASE="frontend/src/lib/contracts/generated"

declare -A CONTRACTS=(
  ["quest"]="$QUEST_CONTRACT_ID"
  ["milestone"]="$MILESTONE_CONTRACT_ID"
  ["rewards"]="$REWARDS_CONTRACT_ID"
)

for contract in quest milestone rewards; do
  wasm="target/wasm32v1-none/release/${contract}.wasm"
  out="${OUTPUT_BASE}/${contract}"
  id="${CONTRACTS[$contract]}"

  if [ ! -f "$wasm" ]; then
    echo "Error: WASM not found at $wasm"
    echo "Run without --skip-build or run 'stellar contract build' first."
    exit 1
  fi

  echo "Generating bindings for $contract..."
  stellar contract bindings typescript \
    --wasm "$wasm" \
    --output-dir "$out" \
    --contract-id "$id"

  echo "  -> $out"
done

echo ""
echo "Done. Bindings written to $OUTPUT_BASE"
echo ""
echo "Next: run 'cd frontend && pnpm install' to install generated package dependencies,"
echo "then 'pnpm build' to verify the bindings compile."
