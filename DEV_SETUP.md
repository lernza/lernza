# Development Environment Setup

## Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli) v25.1.0+
- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) v10+

## Clone & Install

```bash
git clone https://github.com/lernza/lernza.git
cd lernza
```

## Smart Contracts (Rust/Soroban)

### Setup

```bash
rustup target add wasm32-unknown-unknown
cargo install --locked stellar-cli
```

### Build

```bash
stellar contract build
```

### Test

```bash
cargo test --workspace
```

### Lint

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets
```

## Frontend (React/TypeScript)

### Setup

```bash
cd frontend
pnpm install --frozen-lockfile
```

### Development

```bash
pnpm dev    # http://localhost:5173
```

### Build & Lint

```bash
pnpm build  # Type-check (tsc -b) + production build
pnpm lint   # ESLint
```

## Pre-commit Hooks

This project uses [husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to run checks before commits. Hooks are installed automatically after `pnpm install` in the frontend directory.

- **ESLint** on staged `.ts`/`.tsx` files
- **cargo fmt --check** on staged `.rs` files

## Project Structure

- `contracts/` — Three Soroban smart contracts (quest, milestone, rewards)
- `frontend/` — React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- `docs/` — Documentation

## VS Code Extensions (Recommended)

- rust-analyzer
- ESLint
- Tailwind CSS IntelliSense
- Prettier

## Troubleshooting

- **WASM target missing**: Run `rustup target add wasm32-unknown-unknown`
- **pnpm lockfile error**: Run `pnpm install --frozen-lockfile` (don't use `pnpm update`)
- **Stellar CLI not found**: Install via `cargo install --locked stellar-cli` or Homebrew
