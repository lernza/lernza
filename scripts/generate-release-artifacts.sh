#!/usr/bin/env bash

# generate-release-artifacts.sh
# Generates reproducible release artifacts containing WASM checksums, source commit,
# toolchain versions, build flags, and non-sensitive deployment context.

set -euo pipefail

# Configuration and Default Values
VERSION="${RELEASE_VERSION:-$(git describe --tags --always 2>/dev/null || echo "v0.1.0-dev")}"
NETWORK="${STELLAR_NETWORK:-testnet}"
DEPLOYER_PUBKEY="${DEPLOYMENT_ACCOUNT:-GBRP5LFAV4Y6L2W3M3Z45PXX... (public key only)}"
OUTPUT_DIR="releases/artifacts/${VERSION}"

# Parse optional command line flags
while [[ $# -gt 0 ]]; do
  case $1 in
    --version)
      VERSION="$2"
      shift 2
      ;;
    --network)
      NETWORK="$2"
      shift 2
      ;;
    --deployer-pk)
      DEPLOYER_PUBKEY="$2"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [--version <version>] [--network <network>] [--deployer-pk <pubkey>] [--output-dir <dir>]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "========================================================="
echo "Generating Contract Release Artifacts for ${VERSION}"
echo "Network Context: ${NETWORK}"
echo "Output Directory: ${OUTPUT_DIR}"
echo "========================================================="

mkdir -p "${OUTPUT_DIR}"

# 1. Collect Git Source Metadata
GIT_COMMIT="$(git rev-parse HEAD)"
GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")"
IS_DIRTY="false"
if ! git diff --quiet HEAD 2>/dev/null; then
  IS_DIRTY="true"
fi

# 2. Collect Build Environment & Toolchain Versions
RUSTC_VERSION="$(rustc --version 2>/dev/null || echo "rustc missing")"
CARGO_VERSION="$(cargo --version 2>/dev/null || echo "cargo missing")"
STELLAR_CLI_VERSION="$(stellar --version 2>/dev/null | head -n 1 || echo "stellar-cli missing")"


# 3. Locate WASM Artifacts & Compute SHA-256 Checksums
WASM_DIR=""
if [ -f "target/wasm32v1-none/release/quest.wasm" ]; then
  WASM_DIR="target/wasm32v1-none/release"
elif [ -f "target/wasm32-unknown-unknown/release/quest.wasm" ]; then
  WASM_DIR="target/wasm32-unknown-unknown/release"
elif [ -d "target/wasm32v1-none/release" ]; then
  WASM_DIR="target/wasm32v1-none/release"
elif [ -d "target/wasm32-unknown-unknown/release" ]; then
  WASM_DIR="target/wasm32-unknown-unknown/release"
else
  echo "Error: WASM target directory not found. Please run 'stellar contract build' first."
  exit 1
fi


compute_hash() {
  local file="$1"
  if [ -f "$file" ]; then
    if command -v sha256sum >/dev/null 2>&1; then
      sha256sum "$file" | awk '{print $1}'
    elif command -v shasum >/dev/null 2>&1; then
      shasum -a 256 "$file" | awk '{print $1}'
    else
      echo "hash_tool_missing"
    fi
  else
    echo "file_not_found"
  fi
}

QUEST_HASH=$(compute_hash "${WASM_DIR}/quest.wasm")
MILESTONE_HASH=$(compute_hash "${WASM_DIR}/milestone.wasm")
REWARDS_HASH=$(compute_hash "${WASM_DIR}/rewards.wasm")
CERTIFICATE_HASH=$(compute_hash "${WASM_DIR}/certificate.wasm")

# 4. Generate JSON Release Manifest
MANIFEST_PATH="${OUTPUT_DIR}/release-manifest.json"

cat <<EOF > "${MANIFEST_PATH}"
{
  "release_version": "${VERSION}",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "source": {
    "repository": "https://github.com/lernza/lernza",
    "commit_sha": "${GIT_COMMIT}",
    "branch": "${GIT_BRANCH}",
    "is_dirty": ${IS_DIRTY}
  },
  "toolchain": {
    "rustc": "${RUSTC_VERSION}",
    "cargo": "${CARGO_VERSION}",
    "stellar_cli": "${STELLAR_CLI_VERSION}",
    "target": "wasm32-unknown-unknown",
    "profile": "release"
  },
  "deployment_context": {
    "network": "${NETWORK}",
    "deployer_public_key": "${DEPLOYER_PUBKEY}"
  },
  "contracts": {
    "quest": {
      "wasm_file": "quest.wasm",
      "sha256": "${QUEST_HASH}"
    },
    "milestone": {
      "wasm_file": "milestone.wasm",
      "sha256": "${MILESTONE_HASH}"
    },
    "rewards": {
      "wasm_file": "rewards.wasm",
      "sha256": "${REWARDS_HASH}"
    },
    "certificate": {
      "wasm_file": "certificate.wasm",
      "sha256": "${CERTIFICATE_HASH}"
    }
  }
}
EOF

# Copy latest manifest to root releases directory
cp "${MANIFEST_PATH}" "releases/release-manifest.json"

echo "✅ Release manifest successfully generated:"
echo "   - Versioned Manifest: ${MANIFEST_PATH}"
echo "   - Latest Manifest: releases/release-manifest.json"
echo ""
echo "Checksum Summary:"
echo "  - quest.wasm:       ${QUEST_HASH}"
echo "  - milestone.wasm:   ${MILESTONE_HASH}"
echo "  - rewards.wasm:     ${REWARDS_HASH}"
echo "  - certificate.wasm: ${CERTIFICATE_HASH}"
