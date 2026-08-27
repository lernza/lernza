#!/usr/bin/env bash
# Safely migrate bounded batches of quest records after a compatible contract upgrade.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./scripts/migrate-quest-data.sh --network <network> --source <key> --contract-id <id> --quest-ids <comma-separated IDs> [options]

Required:
  --network <network>       Stellar CLI network name (for example: testnet)
  --source <key>            Administrator key name or address
  --contract-id <id>        Upgraded quest contract ID
  --quest-ids <ids>         Comma-separated unique quest IDs (for example: 0,1,2)

Options:
  --schema-version <n>      Target schema version (default: 1)
  --batch-size <n>          IDs per invocation, 1-25 (default: 25)
  --dry-run                 Build transactions without submitting them
  -h, --help                Show this help

The script invokes the contract's admin-gated migrate_quest_data entry point.
It validates every ID and submits no transaction until all local validation passes.
EOF
}

network=""
source_key=""
contract_id=""
quest_ids=""
schema_version="1"
batch_size="25"
dry_run=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --network) network="${2:-}"; shift 2 ;;
    --source) source_key="${2:-}"; shift 2 ;;
    --contract-id) contract_id="${2:-}"; shift 2 ;;
    --quest-ids) quest_ids="${2:-}"; shift 2 ;;
    --schema-version) schema_version="${2:-}"; shift 2 ;;
    --batch-size) batch_size="${2:-}"; shift 2 ;;
    --dry-run) dry_run=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -z "$network" || -z "$source_key" || -z "$contract_id" || -z "$quest_ids" ]]; then
  echo "--network, --source, --contract-id, and --quest-ids are required." >&2
  usage >&2
  exit 2
fi
if ! [[ "$schema_version" =~ ^[1-9][0-9]*$ ]] || ! [[ "$batch_size" =~ ^([1-9]|1[0-9]|2[0-5])$ ]]; then
  echo "Schema version must be positive and batch size must be between 1 and 25." >&2
  exit 2
fi
if ! command -v stellar >/dev/null 2>&1; then
  echo "stellar CLI is required; install it before running a migration." >&2
  exit 1
fi

IFS=',' read -r -a ids <<< "$quest_ids"
declare -A seen=()
for id in "${ids[@]}"; do
  if ! [[ "$id" =~ ^[0-9]+$ ]]; then
    echo "Invalid quest ID: $id" >&2
    exit 2
  fi
  if [[ -n "${seen[$id]:-}" ]]; then
    echo "Duplicate quest ID: $id" >&2
    exit 2
  fi
  seen[$id]=1
done

for ((start = 0; start < ${#ids[@]}; start += batch_size)); do
  batch=("${ids[@]:start:batch_size}")
  joined=$(IFS=','; echo "${batch[*]}")
  args=(contract invoke --network "$network" --source "$source_key" --id "$contract_id")
  if [[ "$dry_run" == true ]]; then
    args+=(--build-only)
  fi
  args+=(-- migrate_quest_data --admin "$source_key" --quest_ids "[$joined]" --target_schema_version "$schema_version")

  echo "Migrating quest IDs: $joined"
  stellar "${args[@]}"
done
