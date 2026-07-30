# Security Review Checklist

**Purpose:** This checklist ensures that code changes — both smart contract upgrades and frontend modifications — are reviewed against Lernza's security model before merging. It supplements the general [Review Checklist](../../CONTRIBUTING.md#review-checklist) in CONTRIBUTING.md and the [Threat Model](../THREAT_MODEL.md).

**Who should use this:** PR authors (self-review) and code reviewers. Not every item applies to every PR — use judgement, but explicitly note which items were considered and skipped.

**Related documents:**
- [Threat Model](../THREAT_MODEL.md) — attacker classes, assets, and mitigations
- [Security Audit](../security-audit.md) — prior findings and their current status
- [SECURITY.md](../../SECURITY.md) — load-bearing security assumptions
- [Contract Upgrade Policy](../UPGRADES.md) — upgrade classifications and migration patterns
- [Contract Upgrade Runbook](./contract-upgrade-runbook.md) — operator step-by-step
- [Deployment Rollback](./deployment-rollback.md) — rollback procedure
- [Incident Response](./incident-response.md) — what happens if a change goes wrong

---

## Step-by-Step Verification Process

Follow these steps to verify this checklist has been completed correctly:

1. **Determine scope** — Read the PR diff and determine which sections apply:
   - **Section A** if the PR touches `contracts/` (Rust/Soroban)
   - **Section B** if the PR touches `frontend/` (React/TypeScript)
   - **Section C** always — cross-cutting items
2. **Self-review** — PR author checks every item in the applicable sections
3. **Mark N/A items** — For any item that does not apply, write `N/A` with a one-line justification (e.g., "N/A — no storage changes in this PR")
4. **Verify tooling** — Run the appropriate commands for changed areas:
   - Contracts: `cargo test --workspace && cargo clippy --workspace --all-targets`
   - Frontend: `cd frontend && pnpm build && pnpm lint`
   - Both: run both sets of checks
5. **Reviewer sign-off** — Code reviewer re-checks applicable items, especially `N/A` justifications
6. **Blocking items** — ⚠️-marked items MUST NOT be marked `N/A` without explicit maintainer sign-off (document the exception in the PR description)

---

## Section A — Contract Upgrade Security Review

Use this section when a PR modifies any file under `contracts/`, including WASM builds, storage schemas, or cross-contract interfaces.

### A.1 Authorization & Access Control

- [ ] **Admin-gated upgrade entry point** — Does the modified (or new) contract expose an `upgrade` function that calls `env.deployer().update_current_contract_wasm()` and is gated to the stored `Admin` address?
  - Reference: [`UPGRADES.md`](../UPGRADES.md#how-soroban-in-place-upgrades-work)
  - Ensure the admin check uses `admin.require_auth()` and validates against instance storage — not a parameter a caller could forge.

- [ ] **Initialization guards** — If the PR adds a new `initialize` or `__constructor` function, does it call `require_auth()` and prevent re-initialization?
  - Prior finding: [HIGH-02](../security-audit.md#high-02--initialize-has-no-authorization-guard) — the rewards contract `initialize` was unguarded.

- [⚠️] **Cross-contract ownership validation** — Does the PR introduce a new function that takes an `owner` or `authority` parameter and stores it without cross-validating against the quest contract?
  - Prior findings: [CRIT-01](../security-audit.md#crit-01--milestone-ownership-race-condition), [CRIT-02](../security-audit.md#crit-02--fund_quest-front-running-seizes-rewards-authority) — milestone and rewards contracts cached owners without cross-contract validation.
  - Mitigation: cross-call `Quest.get_quest(quest_id)` and verify the returned `owner` field matches.

- [ ] **Self-distribution guard** — If the code distributes rewards or transfers tokens, does it prevent the authority from paying themselves?
  - Prior finding: [MED-02](../security-audit.md#med-02--authority-can-distribute-rewards-to-themselves)
  - Check: `if authority == enrollee { return Err(...) }`

- [ ] **Enrollment check on completion** — Does `verify_completion` (or equivalent) cross-call `Quest.is_enrollee` before marking a milestone complete?
  - Prior finding: [HIGH-01](../security-audit.md#high-01--verify_completion-does-not-check-enrollment)

- [ ] **Pause/unpause consistency** — If the PR adds or modifies pause/unpause logic, does it block all state-mutating functions? Are read-only functions intentionally left ungated?
  - Reference: [INFO-03](../security-audit.md#info-03--pause-flag-is-write-only-by-design) — pausing should block writes only.

### A.2 Storage & Data Integrity

- [⚠️] **Storage migration classification** — Has the change been classified as *Additive*, *Additive with lazy migration*, *Breaking struct change*, or *DataKey rename/removal* per [UPGRADES.md](../UPGRADES.md#upgrade-classifications)?
  - Breaking changes require a 48-hour public notice, a migration script, and a coordinated rollout.

- [ ] **Legacy type defined** — For breaking struct changes, is a `*V1` legacy type defined matching the old XDR layout exactly?

- [ ] **Migration-aware reader** — If the change adds a new field to an existing struct, does the code use a fallback reader (e.g., `load_milestone()`) that deserialises old entries with a default value?
  - Worked example: [Adding MilestoneInfo.tags](../UPGRADES.md#worked-example-adding-milestoneinfotagsvecstring)

- [ ] **Rollback compatibility assessed** — If the upgrade is rolled back, can the old binary read entries written in the new format? If not, is a compensating migration entry point planned?
  - Reference: [UPGRADES.md — Rollback](../UPGRADES.md#rollback)

- [ ] **TTL bumping** — Does every persistent storage write call `common::extend_persistent_ttl()` with the correct `BUMP` (518,400) and `THRESHOLD` (120,960) constants?
  - Reference: [ADR-005](../adr/005-storage-patterns-and-ttl-strategy.md)

- [ ] **No phantom entries** — If the PR removes or renames a `DataKey`, is the old key tombstoned (removed from storage) to prevent stale reads and state bloat?

### A.3 Cross-Contract Calls

- [ ] **Call graph impact assessed** — If the PR adds a new cross-contract call or changes an existing one, does it introduce a circular dependency or new ordering requirement?
  - Reference: [Cross-contract call graph](../ARCHITECTURE.md#cross-contract-call-graph)

- [ ] **Outbound call error handling** — Does the calling contract handle a failed outbound call (e.g., certificate mint failure) gracefully? Does the failure cause the entire transaction to revert when it should?
  - Prior pattern: milestone contract's `certificate_mint` failure reverts the entire transaction — confirm this is intentional.

- [⚠️] **Idempotency keys** — For reward distribution and similar payout functions, does the contract use idempotency keys (e.g., `PayoutRecord`) to prevent double-spending?
  - Reference: [Rewards contract events](../EVENT_REFERENCE.md#reward_distributed)

### A.4 WASM Build & Deployment

- [ ] **Binary size budget** — Does the compiled WASM stay under the contract's size budget (quest: 150 KB, milestone: 150 KB, rewards: 100 KB, certificate: 100 KB)?
  - Check: `ls -lh target/wasm32v1-none/release/<contract>.wasm`

- [ ] **WASM hash pinned** — If deploying a new version, is the SHA-256 hash computed locally and recorded in `releases/wasm-hashes.toml` before the upgrade call?
  - Reference: [UPGRADES.md — WASM Hash Pinning](../UPGRADES.md#wasm-hash-pinning)

- [ ] **No test-only code in production WASM** — Are all `#[cfg(test)]` modules, test helpers, and debug assertions excluded from the release build?

### A.5 Testing

- [ ] **Migration test added** — If the PR introduces a storage migration, is there a test that writes an entry in the old format and reads it back via the new migration-aware reader?
  - Example: `test_get_milestone_migrates_v1_entry` in the worked upgrade example.

- [ ] **Front-running / race condition test** — Are there tests that simulate an attacker calling the function first (e.g., `test_fund_quest_frontrun_attack`, `test_milestone_ownership_race_condition`)?
  - Reference: [Security audit test coverage](../security-audit.md#test-coverage-added)

- [ ] **All existing tests pass** — `cargo test --workspace` should return zero failures.

- [ ] **`cargo clippy` clean** — `cargo clippy --workspace --all-targets` produces zero warnings.

---

## Section B — Frontend Change Security Review

Use this section when a PR modifies any file under `frontend/`, including components, hooks, pages, utilities, or configuration.

### B.1 Wallet & Transaction Security

- [ ] **Transaction arguments validated client-side** — Does the code validate user inputs against contract constraints *before* constructing the signing request? (e.g., milestone reward ≤ `MAX_REWARD_AMOUNT`, name ≤ 64 chars, description ≤ 2000 chars)
  - The wallet shows the destination contract and authorization scope, but users rely on the frontend to show the correct request.
  - Reference: [Threat Model — Wallet phishing](../THREAT_MODEL.md#4-wallet-phishing)

- [⚠️] **No hardcoded secret keys or mnemonics** — Are private keys, recovery phrases, or admin secret keys absent from source code, environment variables, and build artifacts?
  - Environment variables containing secrets must be server-side only (Vite `VITE_` prefix variables are bundled into the client).

- [ ] **Freighter API errors handled gracefully** — Does the code handle cases where Freighter is not installed, the user rejects the signing request, or the network is wrong?
  - Bad UX around rejected transactions can lead users to sign without reading.

- [ ] **Transaction simulation / fee estimation** — Does the UI simulate the transaction before asking the user to sign, displaying a clear fee breakdown?
  - Reference: [Threat Model — RPC provider compromise](../THREAT_MODEL.md#5-rpc-provider-compromise)
  - Re-verify critical state (e.g., "has this milestone already been paid") immediately before constructing the transaction, not from a stale cache.

- [ ] **Network mismatch detection** — Does the frontend detect when Freighter is on a different network (mainnet vs testnet) and warn the user before allowing state-changing transactions?

### B.2 Data Handling & Display

- [ ] **Mock data boundaries documented** — If the PR touches mock data (`src/lib/mock-data.ts`), is it clearly documented which features still use mock data and which use live contract data?
  - Reference: [Frontend README](../../frontend/README.md#data-sources-current-state)
  - Using mock data in a production-adjacent feature hides latency, error, and state-consistency bugs.

- [ ] **Contract state not assumed to exist** — Does every component that reads on-chain state handle the `NotFound`, `NotInitialized`, and `Paused` error cases without crashing or exposing raw error messages to the user?

- [ ] **User balance/earnings displayed correctly** — If the PR displays token amounts, does it use the correct unit conversion (token base units → human-readable)? Are negative or zero values handled gracefully?
  - Reference: [Rewards contract — `get_user_earnings`](../api-reference.md#get_user_earnings)

- [ ] **No stale state** — If the PR caches contract state (quest list, enrollees, etc.), does it invalidate the cache after a state-changing transaction (fund, verify, distribute)?

### B.3 UI & User Safety

- [ ] **Clear transaction confirmation dialogs** — Does the UI show a confirmation step before signing any on-chain transaction, summarising what the transaction does (create quest, fund pool, distribute reward)?
  - The wallet prompt alone is insufficient — users need context in the app UI.
  - Reference: [Threat Model — Wallet phishing](../THREAT_MODEL.md#4-wallet-phishing)

- [ ] **Destructive action confirmation** — Are destructive actions (archiving a quest, removing an enrollee, revoking a certificate) preceded by a confirmation dialog with the action described in plain language?

- [ ] **Error messages do not leak sensitive information** — Do error displays omit contract addresses, transaction hashes, or internal state that could aid an attacker?

### B.4 Dependencies & Build

- [ ] **No new `any` types** — TypeScript strict mode is enforced. If the PR introduces a new `any` type, is there a compelling reason documented in a comment?
  - Reference: [CLAUDE.md](../../CLAUDE.md#conventions)

- [ ] **Dependency audit clean** — If the PR adds a new npm dependency, is it auditable (not a known-cryptocurrency-themed scam package)? Run `pnpm audit` to check for vulnerabilities.
  - Reference: [Dependency Policy](../DEPENDENCY_POLICY.md#security-auditing)

- [ ] **Content Security Policy (CSP) compatible** — If the PR adds inline scripts, external resources, or dynamic imports, does it comply with the CSP defined in the deployment config?
  - Reference: `frontend/netlify.toml` or `frontend/vercel.json` for CSP headers.

- [ ] **Environment variables validated** — Are all new `VITE_*` environment variables validated through the Zod schema in `src/lib/env.ts` (or equivalent) before use?

### B.5 Testing & Build

- [ ] **`pnpm build` passes** — Type-check (`tsc -b`) and production build complete without errors.
  - Reference: [CLAUDE.md](../../CLAUDE.md#build--test-commands)

- [ ] **`pnpm lint` clean** — ESLint passes on all changed files with zero warnings.
  - Run: `cd frontend && pnpm lint`

- [ ] **Playwright E2E tests pass** — If the PR modifies quest creation, enrollment, milestone review, or reward flows, run the relevant E2E test suites:
  ```bash
  cd frontend && pnpm exec playwright test --grep "<modified-flow>"
  ```
  - E2E tests: `frontend/e2e/`

### B.6 Audit & Compliance (Pre-Mainnet)

- [ ] **KYC/gating flow respected** — If the PR touches reward claim or payout flows, does it respect the KYC threshold tiers and geo-blocking rules?
  - Reference: [Reward Distribution Policy](../legal/reward-distribution-policy.md)

- [ ] **Legal links present** — If the PR adds or modifies a reward-claim screen, wallet connect modal, or quest creation flow, are the required Terms of Service and Privacy Policy links included?
  - Reference: [Counsel Review Requirements](../legal/counsel-review.md#ui-requirements)

---

## Section C — Combined / Cross-Cutting

- [ ] **PR description notes security impact** — Does the PR description explicitly state whether the change has security implications? If "no security impact", is the reasoning documented?

- [ ] **Existing findings not regressed** — Does the change avoid re-introducing any finding from the [Security Audit](../security-audit.md) (CRIT-01, CRIT-02, HIGH-01, HIGH-02, MED-01, MED-02)?

- [ ] **Load-bearing assumptions reviewed** — If the change relies on any of the assumptions from [SECURITY.md](../../SECURITY.md#security-assumptions) (admin trust, oracle-free pricing, token integrity, frontend orchestration correctness), is the assumption still valid after the change?

- [ ] **Event payloads reviewed** — If the PR adds or modifies contract events, do the payloads avoid leaking sensitive data (private keys, internal storage keys, addresses of non-public contracts)?
  - Reference: [Event Reference](../EVENT_REFERENCE.md)

---

## Using This Checklist

1. **PR author** — before requesting review, run through the entire applicable checklist. For each item, mark it as checked (`[x]`) or `N/A` with a brief justification (e.g., "N/A — no storage changes in this PR").
2. **Reviewer** — during code review, re-check the applicable items, paying special attention to items the author marked `N/A`. Verify the justification is sound.
3. **⚠️ Blocking items** — Items marked with ⚠️ (cross-contract ownership, storage migration classification, idempotency keys, hardcoded secrets) are non-negotiable. They MUST NOT be marked `N/A` without explicit maintainer sign-off, documented in the PR description.
4. **Merging** — All applicable items must be checked off or explicitly justified as `N/A`. The reviewer approves the checklist as part of the review.

> **Maintainers:** Review this checklist quarterly and update it when new threat model entries, audit findings, or security assumptions are added.
