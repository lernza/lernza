# Compatibility Matrix

This document records the toolchain and runtime combinations we validate for the
current contract line. Update it whenever a contract release changes storage
layout, ABI, or frontend expectations.

## Current baseline

| Area | Supported version | Verified against | Notes |
|:-----|:------------------|:-----------------|:------|
| Soroban SDK | `22.x` | `soroban-sdk = "22"` | All contract crates in this repo target the same SDK major line. |
| Stellar CLI | `25.x` | `stellar-cli` testnet/mainnet commands | Use the CLI documented in `README.md` and `docs/deploy-testnet.md`. |
| Frontend SDK | `@stellar/stellar-sdk@^15.0.1` | Browser preview builds | Matches the frontend contract clients under `frontend/src/lib/contracts/`. |
| Freighter | `^6.0.1` | Browser wallet integration | Required for signing transactions in the app. |

## Contract families

| Contract | Compatibility status | Notes |
|:---------|:---------------------|:------|
| `quest` | Compatible with the current baseline | Read APIs are rate-limited per session in the frontend to keep wallet and RPC traffic bounded. |
| `milestone` | Compatible with the current baseline | Upgrade-safe reads and writes depend on the shared `Quest`/`Milestone` identifiers staying stable. |
| `rewards` | Compatible with the current baseline | Token funding and distribution assume a reviewed SEP-41 / SAC token. |
| `certificate` | Compatible with the current baseline | Certificate issuance and revocation follow the same CLI and frontend assumptions. |

## Update procedure

1. Record the exact toolchain versions used for the release.
2. Verify the contracts against the corresponding frontend preview build.
3. Update this matrix in the same PR as the contract or frontend change.
4. Link the release commit or PR in the notes column when the version moves forward.
