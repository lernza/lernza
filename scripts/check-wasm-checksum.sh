#!/usr/bin/env bash
set -euo pipefail
echo "Building contracts in clean environment..."
cargo clean
cargo build --release
echo "Computing checksums..."
sha256sum target/wasm32-unknown-unknown/release/*.wasm | tee wasm.checksums
echo "Validating against recorded checksums..."
if [ -f wasm.checksums.expected ]; then
  diff -u wasm.checksums.expected wasm.checksums && echo "Reproducibility check passed"
else
  echo "No expected checksums found — recording current as baseline"
  cp wasm.checksums wasm.checksums.expected
fi
