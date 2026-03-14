# Contributing to Lernza

Thanks for your interest in contributing. Lernza is an open source learn-to-earn platform on Stellar, and we welcome contributions of all kinds: code, documentation, bug reports, feature suggestions, and design feedback.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/lernza.git`
3. Create a branch: `git checkout -b feat/your-feature`
4. Make your changes
5. Push and open a pull request

## Development Setup

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
pnpm install
pnpm dev        # Start dev server
pnpm build      # Production build
pnpm lint       # Run linter
```

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

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful and constructive.

## Questions

Open a [discussion](https://github.com/lernza/lernza/discussions) or comment on an issue. We're happy to help.
