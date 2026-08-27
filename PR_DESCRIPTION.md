# Contract Deployment Automation, Network Switching, Gas Cost Documentation, and Contributing Guidelines

## Summary

This PR addresses issues **#1214**, **#1213**, **#1221**, and **#1236** by introducing automated contract deployment with error handling and rollback capability, network environment configuration switching between Stellar testnet and mainnet, comprehensive smart contract gas cost documentation, and updated contributing guidelines.

Closes #1214  
Closes #1213  
Closes #1221  
Closes #1236  

---

## Key Changes

### 1. 🚀 Contract Deployment Automation (#1214)

**Problem:** Contract deployment to Soroban networks was a manual multi-step process prone to failure midway without progress tracking or recovery mechanisms.

**Solution:**
- Added `./scripts/deploy-contracts.sh` bash script supporting automated deployment of all Soroban smart contracts (`rewards`, `quest`, `milestone`, `certificate`).
- Configurable target network (`--network testnet|standalone|mainnet`), deployer source key (`--source`), token contract address (`--token-addr`), dry-run mode (`--dry-run`), and optional WASM building (`--build`).
- Implemented state checkpointing via `.deploy-state.json` and error trapping.
- Added automated rollback routine (`--rollback`) to restore configuration backups and clean up deployment checkpoints upon failure.
- Updated `Makefile` (`make deploy`), `package.json` (`npm run deploy:contracts`), and `scripts/README.md`.

### 2. 🌐 Stellar Testnet Configuration & Network Switching (#1213)

**Problem:** Switching local frontend and indexing configuration between Stellar `testnet`, `mainnet`, and `standalone` networks required manual editing of environment files.

**Solution:**
- Added `./scripts/switch-network.sh` helper script for one-command network profile switching (`testnet`, `mainnet`, `standalone`).
- Enhanced `scripts/load-config.mjs` to map environment aliases (`testnet` → `staging`, `mainnet` → `production`, `standalone` → `development`).
- Added `npm run switch:network` to `package.json` and updated `config/README.md`.

### 3. 📊 Smart Contract Gas Cost Documentation (#1221)

**Problem:** Users and developers lacked documented gas cost and resource consumption estimates for transaction planning across Soroban contracts.

**Solution:**
- Created `docs/GAS_COSTS.md` with detailed resource metrics (CPU instructions, RAM memory bytes, Ledger Read/Write entries and bytes, XLM fee estimates) for common operations in `quest`, `milestone`, `rewards`, and `certificate` contracts.
- Explained Soroban metering principles, storage tiering (Instance vs Persistent), TTL rent extensions, and fee structures.
- Documented developer optimization guidelines (pagination, batching, RPC transaction simulation).
- Linked `GAS_COSTS.md` in `docs/CONTRACTS_OVERVIEW.md` and `README.md`.

### 4. 📝 Contributing Guidelines Updates (#1236)

**Problem:** `CONTRIBUTING.md` was missing current setup procedures, network configuration commands, deployment workflows, and documentation checking standards.

**Solution:**
- Updated `CONTRIBUTING.md` with current bootstrap steps, network switching workflows (`./scripts/switch-network.sh`), contract deployment commands (`./scripts/deploy-contracts.sh`), and documentation checking (`npm run check:docs`).
- Standardized Rust/Soroban coding requirements (`#![no_std]`, `Result<T, Error>`, ADR-005 storage patterns, TTL management, clippy/fmt) and Frontend standards (TypeScript strict mode, Zod env validation via `src/lib/env.ts`, shadcn/ui).

---

## Verification & Testing

- ✅ **Deployment Script**: Verified `scripts/deploy-contracts.sh --dry-run` and `scripts/deploy-contracts.sh --rollback` routines.
- ✅ **Network Switching**: Tested `scripts/switch-network.sh testnet` and confirmed `frontend/.env.local` generation.
- ✅ **Documentation**: Verified documentation links and references.
- ✅ **Smart Contracts**: `cargo test --workspace` verified.

---

**Breaking Changes:** None  
**Configuration Changes:** Added network alias handling in `scripts/load-config.mjs` and deployment/network npm scripts in `package.json`.
