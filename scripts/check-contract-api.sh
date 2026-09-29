#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTRACTS_DIR="$REPO_ROOT/contracts"
SNAPSHOT_FILE="$CONTRACTS_DIR/api-snapshot.json"

# Extract public method names from Soroban contract source files.
# Looks for `pub fn <name>` inside #[contractimpl] blocks.
extract_methods() {
  local lib_file="$1"
  if [ ! -f "$lib_file" ]; then
    echo "[]"
    return
  fi

  grep -oP 'pub fn \K[a-z_]+' "$lib_file" | sort -u | awk 'BEGIN { printf "[" } { if (NR > 1) printf ","; printf "\"%s\"", $0 } END { printf "]" }'
}

echo "Extracting public contract methods..."

CONTRACTS=("quest" "milestone" "rewards" "certificate")

TMPFILE=$(mktemp)
echo "{" > "$TMPFILE"

FIRST=true
for contract in "${CONTRACTS[@]}"; do
  lib_file="$CONTRACTS_DIR/$contract/src/lib.rs"
  if [ ! -f "$lib_file" ]; then
    echo "  Warning: $lib_file not found, skipping" >&2
    continue
  fi

  methods=$(extract_methods "$lib_file")

  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo "," >> "$TMPFILE"
  fi
  printf '  "%s": %s' "$contract" "$methods" >> "$TMPFILE"
done

echo "" >> "$TMPFILE"
echo "}" >> "$TMPFILE"

mv "$TMPFILE" "$SNAPSHOT_FILE"

echo "Snapshot written to $SNAPSHOT_FILE"
