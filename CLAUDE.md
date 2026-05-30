# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

### Smart Contracts (Rust/Soroban)
```bash
cargo test --workspace              # Run all contract tests
cargo test -p quest                 # Run tests for one crate (certificate, milestone, quest, or rewards)
cargo test -p milestone -- test_name # Run a single test by name
cargo fmt --all -- --check          # Check formatting
cargo clippy --workspace --all-targets  # Lint
stellar contract build              # Build optimized WASM binaries
```

### Frontend (React/TypeScript)
```bash
cd frontend
pnpm install --frozen-lockfile      # Install deps
pnpm dev                             # Dev server at localhost:5173
pnpm build                           # Type-check (tsc -b) + production build
pnpm lint                            # ESLint
```

## Architecture

Lernza is a learn-to-earn platform on Stellar. A creator makes a Quest, enrolls learners, sets milestones with token rewards. Completed milestones trigger on-chain token distribution. There is no backend — all state lives on Stellar's ledger.

### Five Crates (`contracts/`)

The Cargo workspace contains four `#![no_std]` Soroban contracts (each compiled to WASM with its own `lib.rs` + `test.rs`) and one shared library crate:

1. **quest** — Entry point. Quest creation/update/archive, enrollee management (open join, owner add, invite-commitment redeem), admin pause/unpause, creator verification, and queries (`get_quest`, `get_enrollees`, `is_expired`). Stores `QuestInfo` and enrollee lists keyed by auto-incrementing IDs (`NextId`).
2. **milestone** — Per-quest milestone definition (single + batch create), owner- or peer-review verification modes, distribution modes (flat/custom/competitive), submission/approval flow, and completion tracking. Returns `reward_amount` on verification so the frontend can trigger reward transfers.
3. **rewards** — SAC-based token pools. `fund_quest()` deposits tokens (funder becomes authority), `distribute_reward()` transfers from pool to enrollee. Uses `soroban_sdk::token::Client` for transfers.
4. **certificate** — Soroban non-fungible token (`stellar-tokens`) for quest-completion certificates. Owner-gated `mint_certificate` / `mint_quest_certificate`, metadata lookup, revocation tombstones (issue #720), and configurable base URI (issue #719).
5. **common** — Pure library crate (not a contract; no WASM, no `test.rs`). Houses shared types (`QuestInfo`, `Visibility`, `QuestStatus`), TTL constants (`BUMP`, `THRESHOLD`), reward bounds (`MAX_REWARD_AMOUNT`), shared error codes, the `IsDataKey` marker trait, and helpers like `is_contract_address` / `extend_persistent_ttl`. Imported by the four contract crates.

**Contract patterns:**
- Auth: `address.require_auth()` + storage-based ownership checks
- Storage tiers: Instance (counters/config), Persistent (entities/auth)
- TTL bumping: `BUMP = 518_400` (~30 days), `THRESHOLD = 120_960` (~7 days)
- No cross-contract calls — frontend orchestrates the flow between contracts

### Frontend (`frontend/src/`)

- **No router library** — URL-based routing in `App.tsx` via `pushState`/`popstate`
- Path alias: `@/` maps to `src/` (configured in `vite.config.ts`)
- `hooks/use-wallet.ts` — Freighter wallet integration (`@stellar/freighter-api`)
- `components/ui/` — shadcn/ui components (button, card, badge, progress)
- `pages/` — Landing, Dashboard, Quest, Create Quest, Creator, Leaderboard, Profile, Not Found
- `lib/mock-data.ts` — Mock data (contracts not wired to frontend yet)

## Conventions

- **Conventional Commits** required for PR titles (enforced by CI): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`, `build:`, `perf:`, `style:`, `revert:`
- PRs require at least one label from the project's label set
- Frontend: TypeScript strict mode, no `any` types, kebab-case filenames, Tailwind only (no CSS modules), prefer shadcn/ui components
- Contracts: `cargo fmt`, address clippy warnings, public functions return `Result<T, Error>`
- Deployment handled by Vercel (no deploy workflows in CI)

## Key Naming Context

"Workspace" → "Quest" rename is largely complete: the contract crate and directory are `contracts/quest/`, and on-chain APIs use `create_quest` / `fund_quest` / `QuestInfo`. Stragglers may still appear in mock-data identifiers (`MOCK_WORKSPACES`), the legacy `/workspace/:id` redirect route, and a handful of test names — these are intentional or out-of-scope and tracked in their own issues.
