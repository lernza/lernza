# ADR-009: Contract Upgrade and Migration Strategy

- **Status**: Accepted
- **Date**: 2026-08-27
- **Author**: Lernza Core Team

## Context

Smart contract systems deployed on Stellar's Soroban runtime must support bug fixes, security patches, gas optimizations, and feature enhancements over time. However, smart contract upgrades introduce risks: state corruption, unauthorized code execution, and user distrust if upgrades occur without transparency or verification.

Lernza requires a formal contract upgrade and migration strategy that preserves persistent state (quest history, enrollee progress, token balances) while guaranteeing verifiable, secure release updates across contracts.

## Decision

Adopt an in-place WASM bytecode upgrade strategy with explicit release artifact hash recording and lazy state migration:

1. **In-Place WASM Code Upgrades**:
   - Each contract exposes a privileged `upgrade(env: Env, new_wasm_hash: BytesN<32>)` function.
   - The contract calls `env.deployer().update_current_contract_wasm(new_wasm_hash)` to replace its executable bytecode while retaining its existing contract ID and storage.

2. **Privileged Authorization & Governance**:
   - Upgrade functions require explicit signature verification from the authorized `Admin` account.
   - For testnet, upgrades are authorized by the protocol deployment account.
   - For mainnet, upgrades require a `2-of-3` Stellar native multi-sig configuration (per ADR-007).

3. **Release Traceability & Hash Registry**:
   - All proposed upgrade binaries must be built in a reproducible CI environment and cataloged in `releases/wasm-hashes.toml` with release version, git commit SHA, WASM checksum, and deployment transaction hash.

4. **Lazy Schema Migration**:
   - When contract state structures evolve (e.g. adding new struct fields), contracts use lazy initialization/migration on read or dedicated migration routines rather than bulk storage rewrites.

## Alternatives

- **Proxy Delegated Code Execution Pattern**:
  - *Description*: Deploy proxy contracts that forward invocations to underlying logic contracts using delegatecall mechanisms.
  - *Rejection Rationale*: Soroban native architecture does not rely on delegatecall proxies; in-place WASM code replacement is directly supported by the Soroban host env (`update_current_contract_wasm`), avoiding proxy overhead and storage slot clash risks.
- **Redeployment and State Copy Migration**:
  - *Description*: Deploy brand new contract instances for every version and write migration scripts to copy state entries item-by-item.
  - *Rejection Rationale*: Prohibitively expensive in ledger read/write fees, causes breaking contract address changes for frontend clients, and creates extended maintenance downtime.

## Consequences

- **Positive**: Zero contract address churn, low gas overhead, full state retention across upgrades, and verifiable byte-for-byte SHA256 transparency.
- **Negative / Risks**: Code upgrade authority must be tightly guarded via multi-sig to prevent compromised admin keys from deploying malicious binaries.
