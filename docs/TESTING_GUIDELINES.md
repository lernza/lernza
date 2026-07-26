# Testing Guidelines

This guide outlines the recommended testing strategy for Lernza developers and contributors. It covers the different testing layers, the tools to use, and how to run tests locally and in CI.

---
## Test Types

| Layer | Purpose | Typical Tools | Command |
|-------|---------|---------------|---------|
| **Unit Tests** | Verify isolated logic in Rust contracts or TypeScript utilities. | `cargo test` (Rust), `jest` / `vitest` (TS) | `cargo test --workspace`<br/>`pnpm test` (runs `vitest` for TS) |
| **Integration Tests** | Exercise contract interactions end‑to‑end on a local Soroban network or testnet. | `soroban-cli` + `cargo test --test integration`, `pnpm test:e2e` (Playwright) | `scripts/run-integration-tests.sh` (provided) |
| **End‑to‑End (E2E) UI Tests** | Simulate user flows in the frontend, including wallet interactions. | Playwright with the `@playwright/test` library. | `pnpm playwright test` |
| **Contract Binding Tests** | Ensure generated TypeScript bindings stay in sync with contract ABI. | Custom script `scripts/verify-bindings.sh` that recompiles contracts and diffs generated TS. | `pnpm generate:bindings --verify` |

---
## Running Tests Locally

1. **Prerequisites**
   - Rust toolchain (`rustup`), target `wasm32-unknown-unknown` installed.
   - Stellar CLI (`brew install stellar-cli`).
   - Node.js ≥ 18 and `pnpm` installed.
   - A running local Soroban testnet (use `soroban server start` or Docker image).

2. **Unit Tests**
   ```bash
   # In repository root
   cargo test --workspace          # Rust contracts
   pnpm test                      # TypeScript unit tests (vitest)
   ```

3. **Integration Tests**
   ```bash
   ./scripts/run-integration-tests.sh   # Boots a local soroban node, deploys contracts, runs Rust integration suite.
   ```

4. **E2E UI Tests**
   ```bash
   cd frontend
   pnpm playwright test               # Launches Chromium, runs UI scenarios.
   ```

---
## CI Configuration

The project uses GitHub Actions defined in `.github/workflows/ci.yml`. The workflow executes the following steps:
1. Install Rust, Node, and Stellar CLI.
2. Build contracts (`cargo build --target wasm32-unknown-unknown --release`).
3. Run **unit** and **integration** tests.
4. Generate TypeScript bindings and verify they match the committed version.
5. Run frontend **lint**, **type‑checking**, and **Playwright** tests.
6. Upload test artifacts (`artifacts/` folder) for debugging failed runs.

If any step fails, the pre‑commit hook will also block the push locally, ensuring CI integrity.

---
## Adding New Tests

- **New Rust function** → Add a `#[cfg(test)]` module under `src/` and write a standard Rust unit test.
- **New frontend component** → Add a `*.test.tsx` file beside the component and import with `vitest`.
- **New contract‑frontend integration** → Extend `scripts/generate-bindings.sh` and add a Playwright scenario in `tests/e2e/`.

Remember to update the relevant CI step if you introduce a new test runner.

---
## Troubleshooting

- **Stellar CLI not found** – Ensure `brew install stellar-cli` ran successfully and that `$PATH` includes `/usr/local/bin`.
- **Wasm build fails** – Verify the target is added: `rustup target add wasm32-unknown-unknown`.
- **Playwright browsers missing** – Run `pnpm playwright install` after a fresh `pnpm install`.

---
## Further Reading

- [Integration Testing Guide](../INTEGRATION_TESTING.md)
- [Generating TypeScript Bindings](../README.md#generating-typescript-contract-bindings)
- [CI Workflow](.github/workflows/ci.yml)

*Keep this file up‑to‑date as the testing stack evolves.*
