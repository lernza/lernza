# Contributing to Lernza

Thanks for your interest in contributing. Lernza is an open source learn-to-earn platform on Stellar, and we welcome contributions of all kinds: code, documentation, bug reports, feature suggestions, and design feedback.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/lernza.git`
3. Create a branch: `git checkout -b feat/your-feature`
4. Make your changes
5. Push and open a pull request

## Development Setup

For detailed setup instructions, see [DEV_SETUP.md](DEV_SETUP.md).

### Smart Contracts (Rust/Soroban)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WASM target
rustup target add wasm32-unknown-unknown

# Install Stellar CLI
brew install stellar-cli

# Run tests
cargo test --workspace

# Build WASM
cargo build --target wasm32-unknown-unknown --release
```

### Frontend (React/TypeScript)

```bash
cd frontend
cp .env.example .env.local  # Copy environment variables
pnpm install
pnpm dev        # Start dev server
pnpm build      # Production build
pnpm lint       # Run linter
```

### Generating TypeScript Contract Bindings

The Stellar CLI can generate fully-typed TypeScript clients directly from compiled WASM. These bindings live in `frontend/src/lib/contracts/generated/` and are **not committed** — regenerate them locally after deploying contracts or pulling WASM changes.

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

- **ESLint** on staged `.ts`/`.tsx` files in the frontend
- **cargo fmt --check** on staged `.rs` files in the contracts

These checks help prevent formatting issues from reaching CI. The hooks are automatically installed after running `pnpm install` in the frontend directory.

To troubleshoot hook issues, check `.husky/pre-commit` and `.lintstagedrc`.
The `.env.example` file contains optional configuration for connecting to Stellar testnet. These variables will be required once contract integration is complete.

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

## Code Style

### Rust Contracts

- Follow standard Rust formatting: `cargo fmt`
- Run `cargo clippy` and address warnings
- Every public function needs error handling (return `Result<T, Error>`)
- Every new feature needs tests
- Use the existing storage patterns (Instance/Persistent/Temporary)

### Frontend

- TypeScript strict mode. No `any` types.
- Use the existing shadcn/ui components before creating custom ones
- Follow the existing file naming conventions (kebab-case for files)
- Tailwind for styling. No inline styles or CSS modules.

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
