#!/usr/bin/env bash
# ==============================================================================
# Lernza Network Switcher Helper
# ==============================================================================
# Easily switch frontend and service configuration between Stellar networks:
#   - testnet (staging)
#   - mainnet (production)
#   - standalone / dev (development)
#
# Usage:
#   ./scripts/switch-network.sh [testnet|mainnet|standalone|development|staging|production]
# ==============================================================================

set -eo pipefail

TARGET_NET="${1:-testnet}"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

case "$TARGET_NET" in
  testnet|staging)
    ENV_NAME="staging"
    DISPLAY_NET="Stellar Testnet"
    ;;
  mainnet|production)
    ENV_NAME="production"
    DISPLAY_NET="Stellar Mainnet"
    ;;
  standalone|dev|development|local)
    ENV_NAME="development"
    DISPLAY_NET="Local Standalone Network"
    ;;
  *)
    echo -e "${RED}[ERROR]${NC} Unknown network/environment: '$TARGET_NET'"
    echo "Supported networks: testnet, mainnet, standalone"
    exit 1
    ;;
esac

echo -e "${BLUE}[INFO]${NC} Switching configuration to ${GREEN}${DISPLAY_NET}${NC} (environment: ${ENV_NAME})..."

# Directory verification
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ ! -f "config/${ENV_NAME}.yaml" ]; then
  echo -e "${RED}[ERROR]${NC} Configuration file config/${ENV_NAME}.yaml not found."
  exit 1
fi

# Generate frontend/.env.local
mkdir -p frontend
node scripts/load-config.mjs "$ENV_NAME" env > frontend/.env.local

echo -e "${GREEN}[SUCCESS]${NC} Updated frontend/.env.local from config/${ENV_NAME}.yaml"
echo -e "${BLUE}[INFO]${NC} Active configuration:"
echo "--------------------------------------------------------"
grep -E "^VITE_SOROBAN_RPC_URL|^VITE_SOROBAN_NETWORK_PASSPHRASE|^VITE_ENVIRONMENT" frontend/.env.local || true
echo "--------------------------------------------------------"
echo -e "${GREEN}[SUCCESS]${NC} Network switched to ${DISPLAY_NET} successfully!"
