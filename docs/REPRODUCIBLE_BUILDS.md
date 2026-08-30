# Reproducible Builds

## Required Toolchain
- Rust stable 1.78+ (`rustup toolchain install stable`)
- Stellar CLI 22.0.11 (`cargo install --locked stellar-cli@22.0.11`)
- Soroban SDK 22.0.11 (pinned in Cargo.toml workspace.dependencies)

## Build
```bash
cargo build --release
# or
stellar contract build
```

## Checksum
```bash
sha256sum target/wasm32-unknown-unknown/release/*.wasm > wasm.checksums
```

A clean-environment build should match `wasm.checksums` recorded in CI. On mismatch, check:
- Rust version (`rustc --version`)
- Stellar CLI version (`stellar --version`)
- Deleted `target/` before rebuild?
- Platform differences: Linux vs macOS WASM output may differ by metadata; use Docker (`ghcr.io/stellar/rust:stable`) for canonical build.
