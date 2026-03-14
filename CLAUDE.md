# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

### Smart Contracts (Rust/Soroban)
```bash
cargo test --workspace              # Run all 33 contract tests
cargo test -p workspace             # Run tests for one contract (workspace, milestone, or rewards)
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

### Three Soroban Contracts (`contracts/`)

Each contract is `#![no_std]`, compiled to WASM, and has its own `lib.rs` + `test.rs`:

1. **workspace** (being renamed to **quest**) — Quest creation, enrollee management, stores `WorkspaceInfo` and enrollee lists. Auto-incrementing IDs via `NextId` counter.
2. **milestone** — Milestone definition per workspace, owner-verified completion tracking. Caches workspace owner on first milestone creation for auth. Returns `reward_amount` on verification so frontend can trigger rewards.
3. **rewards** — SAC-based token pools. `fund_workspace()` deposits tokens (funder becomes authority), `distribute_reward()` transfers from pool to enrollee. Uses `soroban_sdk::token::Client` for transfers.

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
- `pages/` — Landing, Dashboard, Workspace, Profile
- `lib/mock-data.ts` — Mock data (contracts not wired to frontend yet)

## Conventions

- **Conventional Commits** required for PR titles (enforced by CI): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`, `build:`, `perf:`, `style:`, `revert:`
- PRs require at least one label from the project's label set
- Frontend: TypeScript strict mode, no `any` types, kebab-case filenames, Tailwind only (no CSS modules), prefer shadcn/ui components
- Contracts: `cargo fmt`, address clippy warnings, public functions return `Result<T, Error>`
- Deployment handled by Vercel (no deploy workflows in CI)

## Key Naming Context

"Workspace" is being renamed to "Quest" throughout the codebase. The contract directory is `contracts/workspace/` but the entity concept is "Quest." GitHub issues track this rename.
