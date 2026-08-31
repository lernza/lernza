#!/usr/bin/env bash
set -euo pipefail

# Per-package coverage for Lernza contracts.
# Quest, milestone and rewards report separately so threshold failures identify the affected package.

PACKAGES=(quest milestone rewards)
THRESHOLDS=(70 70 70)

echo "Running coverage per package..."

for i in "${!PACKAGES[@]}"; do
  pkg="${PACKAGES[$i]}"
  threshold="${THRESHOLDS[$i]}"
  echo "=== $pkg (threshold ${threshold}%) ==="
  cargo tarpaulin -p "$pkg" --out Xml --output-dir "coverage/$pkg" --fail-under "$threshold" --exclude-files "testutils/*" || {
    echo "Coverage below ${threshold}% for $pkg"
    exit 1
  }
done

echo "All packages meet thresholds."
