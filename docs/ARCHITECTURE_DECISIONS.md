This document summarizes key architectural choices for Lernza. For the full catalog of durable rationale, alternative evaluations, and consequences, consult the [Architecture Decision Records Index](adr/README.md).

> **Rule for Contributors**: All material architecture changes (contract boundaries, storage patterns, security/auth boundaries, or protocol upgrades) MUST reference an ADR in `docs/adr/`.


---
## 1. Four‑Contract Separation

**Decision**: Split core functionality across four independent Soroban contracts – `quest`, `milestone`, `rewards`, and `certificate`.

**Rationale**:
- **Single Responsibility** – Each contract manages a distinct domain, making the codebase easier to audit and reason about.
- **WASM Size Limits** – Soroban imposes a 256 KB Wasm size limit; smaller contracts stay comfortably under this bound.
- **Independent Upgrades** – Contracts can be upgraded or replaced without touching the others, reducing risk.
- **Scoped Authorization** – Permissions are enforced per contract, limiting the blast radius of a compromised contract.

**Trade‑offs**:
- Requires cross‑contract calls, adding a modest overhead and complexity in transaction ordering.
- More contracts mean more deployment steps and coordination.

---
## 2. Frontend‑Only Orchestration (No Backend Server)

**Decision**: The React frontend is the sole orchestrator of user interactions; all state lives on‑chain.

**Rationale**:
- **Zero Infrastructure Cost** – No servers to host or maintain; the Stellar blockchain stores all persistent data.
- **Transparency** – Users can verify on‑chain state directly, increasing trust.
- **Simplicity** – Eliminates the need for a traditional REST/GraphQL API layer.

**Trade‑offs**:
- Frontend must handle wallet integration, transaction signing, and error handling directly.
- Limited ability to perform complex off‑chain aggregations without additional indexing services.

---
## 3. Type‑Safe TypeScript Bindings

**Decision**: Generate fully typed TypeScript clients from compiled contracts using the Stellar CLI.

**Rationale**:
- Guarantees compile‑time safety when calling contract functions from the UI.
- Keeps the contract ABI and frontend client in sync automatically.
- Reduces boilerplate and manual encoding/decoding of XDR.

**Trade‑offs**:
- Requires developers to regenerate bindings after any contract change.
- Generated code is not committed to the repo, so CI must verify it matches the current contracts.

---
## 4. Storage Model & TTL Strategy

**Decision**: Use **Instance** storage for mutable, frequently written data (e.g., counters) and **Persistent** storage for long‑lived data with a TTL of ~30 days.

**Rationale**:
- Instance storage is cheap for high‑frequency updates.
- Persistent entries automatically expire, preventing unbounded growth of on‑chain state.

**Reference**: See `docs/ADR-005-storage-patterns-and-ttl-strategy.md` for full details.

---
## 5. Development Tooling Stack

- **Rust** for smart contracts (`cargo`, `wasm32-unknown-unknown` target).
- **Node.js + pnpm** for the React frontend.
- **Husky + lint‑staged** for pre‑commit checks.
- **Playwright** for end‑to‑end UI testing.
- **release‑please** for automated changelog and version bumping.

---
## 6. Versioning & Release Process (see `RELEASE_PROCESS.md`)

We follow **Semantic Versioning (SemVer)** combined with the **Keep a Changelog** format. Releases are driven by conventional commit messages and the `release‑please` bot, which:
- Generates a `CHANGELOG.md` entry per version.
- Tags the repo with the new version.
- Publishes release artifacts.

---
## 7. Security Model

- All contracts are **open‑source** and undergo internal audits (`security-audit.md`).
- Critical functions are protected by `admin` checks and cross‑contract verification.
- The `visibility` flag on quests is advisory; state is always publicly readable on‑chain.

---
## 8. Future Extensibility

- The modular contract design allows new feature contracts (e.g., governance) to be added without modifying existing ones.
- The frontend architecture (shadcn/ui components, modular routing) supports incremental feature addition.

---
**Maintainers** should keep this document synchronized with any architectural changes. Adding a new ADR should be reflected here with a brief summary and a link to the full ADR.
