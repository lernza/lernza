# Reproducible Contract Release Artifact Process & Verification Guide

This document describes Lernza's reproducible smart contract release process, artifact specification, and step-by-step instructions for verifying WASM checksums locally from a clean checkout.

---

## 1. Overview & Reproducibility Goal

To guarantee supply-chain integrity, every published smart contract deployment must be directly traceable to:
- A specific Git commit SHA.
- Exact toolchain versions (`rustc`, `cargo`, `stellar-cli`).
- Immutable SHA-256 byte checksums of the compiled `.wasm` binaries.
- Public deployment context (network name, deployment public key) **without containing secrets or private keys**.

Anyone checking out the repository at the specified release tag or commit SHA can reproduce the compiled WASM binaries and verify their SHA-256 hashes byte-for-byte.

---

## 2. Generating Release Artifacts

To generate release artifacts for a release candidate or official deployment:

```bash
# 1. Clean build directory
cargo clean

# 2. Build release WASM binaries
cargo build --target wasm32-unknown-unknown --release

# 3. Execute the release artifact generator script
./scripts/generate-release-artifacts.sh --version v0.1.0 --network testnet
```

This generates:
- `releases/artifacts/v0.1.0/release-manifest.json` (version-specific artifact)
- `releases/release-manifest.json` (latest release pointer)

---

## 3. Release Manifest Schema Specification

The `release-manifest.json` schema structure:

```json
{
  "release_version": "v0.1.0",
  "timestamp": "2026-08-27T00:00:00Z",
  "source": {
    "repository": "https://github.com/lernza/lernza",
    "commit_sha": "fbfe084...",
    "branch": "main",
    "is_dirty": false
  },
  "toolchain": {
    "rustc": "rustc 1.85.0...",
    "cargo": "cargo 1.85.0...",
    "stellar_cli": "stellar 22.0.0...",
    "target": "wasm32-unknown-unknown",
    "profile": "release"
  },
  "deployment_context": {
    "network": "testnet",
    "deployer_public_key": "GBRP5LFAV4Y6L2W3M3Z45PXX..."
  },
  "contracts": {
    "quest": {
      "wasm_file": "quest.wasm",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    },
    "milestone": {
      "wasm_file": "milestone.wasm",
      "sha256": "..."
    },
    "rewards": {
      "wasm_file": "rewards.wasm",
      "sha256": "..."
    },
    "certificate": {
      "wasm_file": "certificate.wasm",
      "sha256": "..."
    }
  }
}
```

---

## 4. Local Checksum Verification Step-by-Step Guide

Follow these steps from a clean machine or checkout to independently verify contract binaries:

### Step 1: Clean Checkout
```bash
git clone https://github.com/lernza/lernza.git
cd lernza
git checkout <RELEASE_TAG_OR_COMMIT_SHA>
```

### Step 2: Ensure Toolchain Match
Check `rust-toolchain.toml` or inspect the `toolchain` block in `releases/release-manifest.json` to install the exact Rust toolchain version:
```bash
rustup target add wasm32-unknown-unknown
```

### Step 3: Build WASM Binaries
```bash
cargo build --target wasm32-unknown-unknown --release
```

### Step 4: Compute Local SHA-256 Checksums
```bash
shasum -a 256 target/wasm32-unknown-unknown/release/*.wasm
```

### Step 5: Compare Against Release Manifest
Compare the generated checksums against `releases/release-manifest.json` or `releases/wasm-hashes.toml`. If all 64 hex characters match, the binary compilation is verified authentic and untampered.
