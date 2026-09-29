# Contributing to Lernza

Thanks for your interest in contributing. Lernza is an open source learn-to-earn platform on Stellar, and we welcome contributions of all kinds: code, documentation, bug reports, feature suggestions, and design feedback.

New to the project vocabulary? See [docs/GLOSSARY.md](docs/GLOSSARY.md) for short definitions of quest, milestone, enrollee, and pool.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/lernza.git`
3. Create a branch: `git checkout -b feat/your-feature`
4. Make your changes
5. Push and open a pull request

The fastest way to get both the contracts and the frontend running is the one-command bootstrap:

```bash
./scripts/bootstrap.sh
# or: make setup
```

This detects your OS and installs Rust, the `wasm32-unknown-unknown` target, Stellar CLI, Node.js, pnpm, frontend dependencies, and runs the contract test suite once to confirm everything works. For a step-by-step walkthrough see [DEV_SETUP.md](DEV_SETUP.md).

### Switching Stellar Networks

To switch your local development environment between Stellar testnet, mainnet, or local standalone network:

```bash
# Switch to testnet
./scripts/switch-network.sh testnet

# Switch to local standalone network
./scripts/switch-network.sh standalone

# Switch to mainnet
./scripts/switch-network.sh mainnet
```

> **Contract changes require an extra step.** If your work touches any file under `contracts/`, you must deploy to testnet and regenerate the TypeScript bindings before the frontend will see your changes — see [Deploying Contracts](#deploying-contracts) and [Tooling: Generating TypeScript Contract Bindings](#generating-typescript-contract-bindings) below. This is the single most common thing new contributors miss.

## Contracts (Rust/Soroban)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WASM target
rustup target add wasm32-unknown-unknown

# Install Stellar CLI
brew install stellar-cli

# Run tests
cargo test --workspace

# Run tests for a single crate
cargo test -p milestone

# Build WASM
cargo build --target wasm32-unknown-unknown --release
# or: stellar contract build
```

### Deploying Contracts

Deploy all contracts automatically with error handling, checkpointing, and rollback support:

```bash
# Automated build and deploy to testnet
./scripts/deploy-contracts.sh --network testnet --build

# Automated deploy to local standalone network
./scripts/deploy-contracts.sh --network standalone --config-env development

# Test deployment without execution (dry-run)
./scripts/deploy-contracts.sh --network testnet --dry-run
```

See [docs/deploy-testnet.md](docs/deploy-testnet.md) for full deployment details and runbooks.

### Contract Code Style & Standards

- Follow standard Rust formatting: `cargo fmt --all -- --check`
- Run `cargo clippy --workspace --all-targets` and address warnings
- Every public function needs error handling (return `Result<T, Error>`)
- Every new feature needs unit tests
- Use the existing storage patterns (Instance/Persistent/Temporary) and TTL strategy (`BUMP = 518,400`, `THRESHOLD = 120,960`) — see [ADR-005](docs/adr/005-storage-patterns-and-ttl-strategy.md)
- Consider gas and resource costs for on-chain state mutations — see [docs/GAS_COSTS.md](docs/GAS_COSTS.md)
- Browser storage usage must follow [docs/DATA_RETENTION_POLICY.md](docs/DATA_RETENTION_POLICY.md) — no private keys or PII in localStorage

### Architecture Decision Records (ADRs)

All core protocol choices, contract boundaries, storage strategies, and authorization rules are documented as ADRs. 
- Browse existing decisions in the [ADR Index](docs/adr/README.md).
- Any pull request proposing material architectural changes **must** reference an existing ADR or include a new ADR using [docs/adr/template.md](docs/adr/template.md).


## Frontend (React/TypeScript)

```bash
cd frontend
cp .env.example .env.local  # Copy environment variables (or run ./scripts/switch-network.sh testnet)
pnpm install
pnpm dev        # Start dev server at localhost:5173
pnpm build      # Type-check (tsc -b) + production build
pnpm lint       # Run linter
```

The `.env.example` file contains configuration for connecting to Stellar testnet.

If your change depends on updated contract behavior, remember to regenerate the bindings first — see [Generating TypeScript Contract Bindings](#generating-typescript-contract-bindings).

### Frontend Code Style

- TypeScript strict mode. No `any` types.
- Use existing shadcn/ui components before creating custom ones
- Follow existing file naming conventions (kebab-case for files)
- Tailwind for styling. No inline styles or CSS modules.
- Environment variables MUST be accessed via `import { env } from '@/lib/env'` for Zod validation

## Tooling

### Checking Documentation Links

Before opening a PR with doc changes, validate file paths and contract references:

```bash
npm run check:docs
```

### Generating TypeScript Contract Bindings

The Stellar CLI can generate fully-typed TypeScript clients directly from compiled WASM. These bindings live in `frontend/src/lib/contracts/generated/` and are **not committed** — regenerate them locally after deploying contracts or pulling WASM changes. This is required any time `contracts/` changes in a way that the frontend needs to consume.

**Prerequisites:**

- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli) installed
- Contracts deployed on testnet and their IDs recorded in `frontend/.env.local`

**Steps:**

```bash
# 1. Copy the env template and fill in your deployed contract IDs
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local:
#   VITE_QUEST_CONTRACT_ID=<your quest contract ID>
#   VITE_MILESTONE_CONTRACT_ID=<your milestone contract ID>
#   VITE_REWARDS_CONTRACT_ID=<your rewards contract ID>

# 2. Generate bindings (builds contracts first, then generates)
cd frontend
pnpm generate:bindings

# 3. Install generated package dependencies and verify compilation
pnpm install
pnpm build
```

To skip the build step (use already-compiled WASM files):

```bash
cd .. && ./scripts/generate-bindings.sh --skip-build
```

**What gets generated:**

| Contract | WASM source | Output directory |
|---|---|---|
| Quest | `target/wasm32v1-none/release/quest.wasm` | `frontend/src/lib/contracts/generated/quest/` |
| Milestone | `target/wasm32v1-none/release/milestone.wasm` | `frontend/src/lib/contracts/generated/milestone/` |
| Rewards | `target/wasm32v1-none/release/rewards.wasm` | `frontend/src/lib/contracts/generated/rewards/` |

Each output directory is a self-contained npm package. Import the clients in frontend code like:

```typescript
import { Client as QuestClient } from '@/lib/contracts/generated/quest';
```

### Pre-commit Hooks

This project uses [husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to run automated checks before commits. The pre-commit hook runs:

- **lint-staged** — ESLint + Prettier on staged `.ts`/`.tsx` files, and `cargo fmt --check` on staged `.rs` files
- **ESLint** (full project) — `pnpm run lint` catches issues outside the staged set
- **TypeScript** (full project) — `tsc -b --noEmit` blocks commits with type errors

All three must pass. Broken TypeScript cannot be committed. The hooks are automatically installed after running `pnpm install` in the frontend directory.

To troubleshoot hook issues, check `.husky/pre-commit` and `.lintstagedrc`.

## Branch Naming

Use conventional prefixes:

- `feat/` -- New features
- `fix/` -- Bug fixes
- `refactor/` -- Code refactoring
- `docs/` -- Documentation changes
- `chore/` -- Maintenance tasks
- `test/` -- Adding or updating tests

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org):

```
feat: add peer verification to milestone contract
fix: wallet disconnect not clearing state
docs: add deployment guide for testnet
refactor: extract quest funding logic into separate module
test: add edge case tests for reward distribution
chore: update soroban-sdk to v26
```

## Pull Requests

- Reference the related issue: `closes #XX`
- Keep PRs focused. One concern per PR.
- Include screenshots for UI changes
- Ensure all tests pass before requesting review
- Fill out the PR template completely

## Code Review Guidelines

### For Contributors (PR Authors)

Before requesting review:

1. **Self-review first** — Read through your own diff. Catch obvious issues before a reviewer spends time on them.
2. **Write a clear description** — Explain _what_ changed and _why_. Link to the issue. Reviewers shouldn't have to reverse-engineer your intent.
3. **Keep PRs small** — PRs under 400 lines get reviewed faster and more thoroughly. Split large changes into stacked PRs if possible.
4. **Run all checks locally** — `cargo test --workspace`, `cargo clippy`, `pnpm build`, `pnpm lint`. Don't rely on CI to catch formatting issues.
5. **Respond to feedback promptly** — Active PRs get merged faster. If you need time, acknowledge the review and give a timeline.

### For Reviewers

Review expectations:

1. **Review within 2 business days** — If you're assigned, prioritize it. If you're busy, reassign or note your availability.
2. **Focus on correctness first** — Does the code do what it claims? Are there edge cases or security issues?
3. **Check test coverage** — New code needs new tests. Bug fixes need regression tests.
4. **Verify CI passes** — All checks must be green before approving.
5. **Be constructive** — Suggest improvements, don't just point out problems. Use "nit:" prefix for non-blocking style suggestions.

### Review Checklist

- [ ] Tests pass locally and in CI
- [ ] New code has corresponding tests
- [ ] No `any` types in TypeScript code
- [ ] No `unwrap()` without error handling in Rust (except tests)
- [ ] Documentation updated if public API changed
- [ ] Commit messages follow Conventional Commits
- [ ] PR description is complete and links the issue

### Approval Requirements

- **Minimum 1 approving review** from a maintainer or trusted contributor
- **All CI checks must pass** (lint, type-check, tests)
- **No unresolved conversations** — all feedback must be addressed or acknowledged
- **Merge strategy** — Maintainers will squash-merge to keep main history clean

### Handling Feedback

- **Blockers** must be fixed before merge
- **Suggestions** are non-blocking — apply if reasonable, discuss if not
- **Nit picks** are style preferences — apply at your discretion
- If you disagree with feedback, explain your reasoning. Healthy debate improves code quality.

## Issues

Before creating a new issue, search existing issues to avoid duplicates.

### Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/OS/wallet version
- Screenshots if applicable

### Feature Requests

Include:
- Clear description of the feature
- Why it's useful
- How it fits the existing architecture

## Good First Issues

Look for issues labeled `good first issue`. These are scoped, well-documented, and have clear acceptance criteria. They're designed for new contributors.

## How We Recognize Contributors

Every contribution matters. Here's how we make sure yours is recognized:

- **Release credits** — every GitHub Release lists the contributors who made it happen, by name. Your work is permanently recorded in the project's release history.
- **README contributors gallery** — your avatar appears in the contributors section automatically after your first merged PR.
- **Founding contributor** — anyone who contributes before our v1.0.0 release is a founding contributor. When we launch on mainnet, founding contributors will be recognized in the project's on-chain history.
- **Maintainer path** — consistent contributors get invited as collaborators with write access and review responsibilities. We grow the team from the community, not outside it.
- **Your voice in the roadmap** — active contributors participate in roadmap discussions and architecture decisions. This is your project too.

We don't do badges or leaderboards. We build genuine relationships with people who care about what we're building.

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful and constructive.

## Questions

Open a [discussion](https://github.com/lernza/lernza/discussions) or comment on an issue. We're happy to help.

See [Issue Triage Guide](docs/ISSUE_TRIAGE.md) for labeling and triage process.
