#!/usr/bin/env bash
# ==============================================================================
# Lernza Smart Contract Automated Deployment Script
# ==============================================================================
# Automated deployment of Soroban contracts (rewards, quest, milestone, certificate)
# with proper error handling, deployment state checkpointing, and rollback capability.
#
# Compatible with standard Bash 3.2+ (macOS/Linux).
# ==============================================================================

set -eo pipefail

# Default configuration values
NETWORK="testnet"
SOURCE_ACCOUNT="lernza-deployer"
TOKEN_ADDR=""
CONFIG_ENV=""
BUILD_WASM=false
DRY_RUN=false
ROLLBACK_MODE=false
STATE_FILE=".deploy-state.json"
BACKUP_CONFIG=""

# Network parameters mapping helper
get_rpc_url() {
  case "$1" in
    testnet)    echo "https://soroban-testnet.stellar.org" ;;
    standalone) echo "http://localhost:8000/soroban/rpc" ;;
    mainnet)    echo "https://soroban.stellar.org" ;;
    *)          echo "" ;;
  esac
}

get_network_passphrase() {
  case "$1" in
    testnet)    echo "Test SDF Network ; September 2015" ;;
    standalone) echo "Standalone Network ; February 2017" ;;
    mainnet)    echo "Public Global Stellar Network ; September 2015" ;;
    *)          echo "" ;;
  esac
}

get_default_token() {
  case "$1" in
    testnet|staging)     echo "CDLZFC3SYJYDZXTEVRXTHNKVYKKEFZQJ2HW4QGHZ3KIZZMJDJPTKJ7QG" ;;
    standalone|dev)      echo "CDLZFC3SYJYDZXTEVRXTHNKVYKKEFZQJ2HW4QGHZ3KIZZMJDJPTKJ7QG" ;;
    mainnet|production)  echo "" ;;
    *)                   echo "" ;;
  esac
}

# Color outputs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_help() {
  cat << EOF
Lernza Smart Contract Automated Deployment Script

Usage:
  ./scripts/deploy-contracts.sh [OPTIONS]

Options:
  -n, --network <network>      Target network: testnet, standalone, mainnet (default: testnet)
  -s, --source <account>       Source key or account alias (default: lernza-deployer)
  -t, --token-addr <address>   SAC Token Contract Address for rewards contract
  -c, --config-env <env>       Config file to update (development, staging, production)
  -b, --build                  Build WASM contracts before deploying
  --dry-run                    Simulate contract deployment without network writes
  --rollback                   Rollback local deployment checkpoint and restore config
  --state-file <path>          State JSON file location (default: .deploy-state.json)
  -h, --help                   Show this help message

Examples:
  ./scripts/deploy-contracts.sh --network testnet --build
  ./scripts/deploy-contracts.sh --network testnet --config-env staging
  ./scripts/deploy-contracts.sh --rollback
EOF
}

# Parse Command Line Arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -n|--network)
      NETWORK="$2"
      shift 2
      ;;
    -s|--source)
      SOURCE_ACCOUNT="$2"
      shift 2
      ;;
    -t|--token-addr)
      TOKEN_ADDR="$2"
      shift 2
      ;;
    -c|--config-env)
      CONFIG_ENV="$2"
      shift 2
      ;;
    -b|--build)
      BUILD_WASM=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --rollback)
      ROLLBACK_MODE=true
      shift
      ;;
    --state-file)
      STATE_FILE="$2"
      shift 2
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Rollback Handler Routine
execute_rollback() {
  log_warn "Executing deployment rollback routine..."
  if [ -f "$STATE_FILE" ]; then
    log_info "Reading state file: $STATE_FILE"
    cat "$STATE_FILE"
    echo ""
    log_info "Cleaning up state file: $STATE_FILE"
    rm -f "$STATE_FILE"
  else
    log_info "No deployment state file ($STATE_FILE) found to clean."
  fi

  if [ -n "$BACKUP_CONFIG" ] && [ -f "$BACKUP_CONFIG" ]; then
    ORIG_CONFIG="${BACKUP_CONFIG%.bak}"
    log_info "Restoring original config file $ORIG_CONFIG from $BACKUP_CONFIG..."
    cp "$BACKUP_CONFIG" "$ORIG_CONFIG"
    rm -f "$BACKUP_CONFIG"
  fi

  log_success "Rollback procedure complete."
}

if [ "$ROLLBACK_MODE" = true ]; then
  execute_rollback
  exit 0
fi

# Set default CONFIG_ENV based on NETWORK if not provided
if [ -z "$CONFIG_ENV" ]; then
  case "$NETWORK" in
    standalone|dev|development) CONFIG_ENV="development" ;;
    testnet|staging)           CONFIG_ENV="staging" ;;
    mainnet|production)        CONFIG_ENV="production" ;;
    *) CONFIG_ENV="staging" ;;
  esac
fi

# Assign default token address if not specified
if [ -z "$TOKEN_ADDR" ]; then
  TOKEN_ADDR=$(get_default_token "$NETWORK")
fi

# Ensure cleanup on failure
trap_failure() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo ""
    log_error "Deployment failed with exit code $exit_code during step: ${CURRENT_STEP:-unknown}"
    log_warn "State checkpoint has been preserved in $STATE_FILE."
    log_warn "To reset state and restore backup configs, run: ./scripts/deploy-contracts.sh --rollback"
  fi
}
trap trap_failure EXIT

# Check Prerequisites
check_prerequisites() {
  CURRENT_STEP="Check Prerequisites"
  log_info "Checking deployment prerequisites..."

  if ! command -v stellar &> /dev/null; then
    log_error "Stellar CLI ('stellar') is not installed or not in PATH."
    exit 1
  fi

  if [ "$BUILD_WASM" = true ]; then
    if ! command -v cargo &> /dev/null; then
      log_error "Cargo is required for building WASM contracts but was not found."
      exit 1
    fi
  fi

  log_success "Prerequisites verified."
}

# Build WASM Contracts
build_contracts() {
  CURRENT_STEP="Build Contracts"
  if [ "$BUILD_WASM" = true ]; then
    log_info "Building optimized WASM contract binaries..."
    if [ "$DRY_RUN" = true ]; then
      log_info "[DRY-RUN] Would run: stellar contract build"
    else
      stellar contract build
    fi
    log_success "WASM binaries built."
  fi
}

# Find WASM File Helper
find_wasm() {
  local contract_name="$1"
  local path1="target/wasm32v1-none/release/${contract_name}.wasm"
  local path2="target/wasm32-unknown-unknown/release/${contract_name}.wasm"

  if [ -f "$path1" ]; then
    echo "$path1"
  elif [ -f "$path2" ]; then
    echo "$path2"
  else
    echo ""
  fi
}

# Initialize State File
init_state_file() {
  CURRENT_STEP="Initialize State File"
  if [ ! -f "$STATE_FILE" ]; then
    cat << EOF > "$STATE_FILE"
{
  "network": "$NETWORK",
  "source_account": "$SOURCE_ACCOUNT",
  "status": "in_progress",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "contracts": {},
  "initialized": {}
}
EOF
  fi
}

# Helper to update JSON state file via node
update_state_contract() {
  local name="$1"
  local contract_id="$2"
  if command -v node &> /dev/null; then
    node -e "
      const fs = require('fs');
      const data = JSON.parse(fs.readFileSync('$STATE_FILE', 'utf8'));
      data.contracts['$name'] = '$contract_id';
      fs.writeFileSync('$STATE_FILE', JSON.stringify(data, null, 2));
    "
  fi
}

update_state_init() {
  local name="$1"
  local status="$2"
  if command -v node &> /dev/null; then
    node -e "
      const fs = require('fs');
      const data = JSON.parse(fs.readFileSync('$STATE_FILE', 'utf8'));
      data.initialized['$name'] = '$status';
      fs.writeFileSync('$STATE_FILE', JSON.stringify(data, null, 2));
    "
  fi
}

update_state_status() {
  local status="$1"
  if command -v node &> /dev/null; then
    node -e "
      const fs = require('fs');
      const data = JSON.parse(fs.readFileSync('$STATE_FILE', 'utf8'));
      data.status = '$status';
      fs.writeFileSync('$STATE_FILE', JSON.stringify(data, null, 2));
    "
  fi
}

# Deploy Contracts Process
deploy_contracts() {
  local contracts=("rewards" "quest" "milestone" "certificate")
  local rewards_id=""
  local quest_id=""
  local milestone_id=""
  local certificate_id=""

  log_info "Starting deployment to network: $NETWORK (Source: $SOURCE_ACCOUNT)..."

  for contract in "${contracts[@]}"; do
    CURRENT_STEP="Deploy $contract"
    local wasm_file
    wasm_file=$(find_wasm "$contract")

    if [ -z "$wasm_file" ] && [ "$DRY_RUN" = false ]; then
      log_error "WASM file for '$contract' not found. Run with --build flag first."
      exit 1
    fi

    log_info "Deploying contract '$contract' (WASM: ${wasm_file:-simulated})..."
    local alias_name="lernza-${contract}-${NETWORK}"
    local contract_id=""

    if [ "$DRY_RUN" = true ]; then
      case "$contract" in
        rewards) contract_id="C_SIMULATED_REWARDS_ID" ;;
        quest) contract_id="C_SIMULATED_QUEST_ID" ;;
        milestone) contract_id="C_SIMULATED_MILESTONE_ID" ;;
        certificate) contract_id="C_SIMULATED_CERTIFICATE_ID" ;;
      esac
      log_info "[DRY-RUN] Simulated contract deployment for $contract -> $contract_id"
    else
      contract_id=$(stellar contract deploy \
        --wasm "$wasm_file" \
        --source-account "$SOURCE_ACCOUNT" \
        --network "$NETWORK" \
        --alias "$alias_name")
      
      log_success "Deployed '$contract' with ID: $contract_id"
    fi

    case "$contract" in
      rewards) rewards_id="$contract_id" ;;
      quest) quest_id="$contract_id" ;;
      milestone) milestone_id="$contract_id" ;;
      certificate) certificate_id="$contract_id" ;;
    esac

    update_state_contract "$contract" "$contract_id"
  done

  # Initialize Rewards Contract
  CURRENT_STEP="Initialize Rewards Contract"
  if [ -n "$rewards_id" ]; then
    log_info "Initializing 'rewards' contract with token address '${TOKEN_ADDR}'..."
    if [ "$DRY_RUN" = true ]; then
      log_info "[DRY-RUN] Simulated rewards contract initialization"
    else
      if [ -n "$TOKEN_ADDR" ]; then
        stellar contract invoke \
          --id "$rewards_id" \
          --source-account "$SOURCE_ACCOUNT" \
          --network "$NETWORK" \
          -- initialize \
          --token_addr "$TOKEN_ADDR"
        log_success "'rewards' contract initialized successfully."
      else
        log_warn "No TOKEN_ADDR provided; skipping rewards.initialize call."
      fi
    fi
    update_state_init "rewards" "completed"
  fi

  # Update YAML Config if requested
  CURRENT_STEP="Update Config File"
  local target_yaml="config/${CONFIG_ENV}.yaml"
  if [ -f "$target_yaml" ]; then
    BACKUP_CONFIG="${target_yaml}.bak"
    cp "$target_yaml" "$BACKUP_CONFIG"
    log_info "Backed up $target_yaml to $BACKUP_CONFIG"

    if [ "$DRY_RUN" = true ]; then
      log_info "[DRY-RUN] Would update $target_yaml with contract IDs:"
      log_info "  quest: $quest_id"
      log_info "  milestone: $milestone_id"
      log_info "  rewards: $rewards_id"
    else
      log_info "Updating contract IDs in $target_yaml..."
      if command -v node &> /dev/null; then
        node -e "
          const fs = require('fs');
          let content = fs.readFileSync('$target_yaml', 'utf8');
          content = content.replace(/(quest:\s*)\"[^\"]*\"|quest:\s*\S*/, '\$1$quest_id');
          content = content.replace(/(milestone:\s*)\"[^\"]*\"|milestone:\s*\S*/, '\$1$milestone_id');
          content = content.replace(/(rewards:\s*)\"[^\"]*\"|rewards:\s*\S*/, '\$1$rewards_id');
          if ('$TOKEN_ADDR') {
            content = content.replace(/(rewards_token:\s*)\"[^\"]*\"|rewards_token:\s*\S*/, '\$1$TOKEN_ADDR');
          }
          fs.writeFileSync('$target_yaml', content);
        "
        log_success "Updated $target_yaml with new contract IDs."
        rm -f "$BACKUP_CONFIG"
        BACKUP_CONFIG=""
      fi
    fi
  fi

  update_state_status "completed"
  log_success "All contracts successfully deployed and configured!"
  echo ""
  echo "=========================================================================="
  echo "Deployment Summary ($NETWORK):"
  echo "  Quest Contract ID:     $quest_id"
  echo "  Milestone Contract ID: $milestone_id"
  echo "  Rewards Contract ID:   $rewards_id"
  echo "  Certificate ID:        $certificate_id"
  echo "  Token Address:         $TOKEN_ADDR"
  echo "=========================================================================="
}

# Main Execution Flow
main() {
  log_info "Starting Lernza Contract Deployment Pipeline..."
  check_prerequisites
  build_contracts
  init_state_file
  deploy_contracts
}

main
