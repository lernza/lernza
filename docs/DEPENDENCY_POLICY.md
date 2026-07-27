# Dependency Policy

This document describes how Lernza manages dependencies across Rust contracts and the frontend application.

## Automated Updates

### Dependabot

[Dependabot](https://docs.github.com/en/code-security/dependabot) is configured to open weekly pull requests for:

| Ecosystem | Directory | Schedule | PR Limit |
|-----------|-----------|----------|----------|
| Cargo | `/` | Monday | 10 |
| npm | `/frontend` | Monday | 10 |
| GitHub Actions | `/` | Monday | 5 |

All Dependabot PRs are labeled `dependencies` plus the relevant ecosystem tag (`contracts`, `frontend`, or `infrastructure`).

### Review Process

1. Dependabot opens a PR with version bumps and changelogs.
2. CI runs the full test suite (lint, type-check, tests, security audit).
3. A maintainer reviews the changelog for breaking changes.
4. If CI passes and no breaking changes are detected, the PR is merged.
5. For major version bumps, the PR is reviewed by at least two maintainers.

## Security Auditing

### Rust (Cargo)

- **cargo-audit**: Scans the RustSec advisory database for known vulnerabilities. Runs on every PR that touches `contracts/`, `Cargo.toml`, `Cargo.lock`, or `deny.toml`, plus a daily cron job.
- **cargo-deny**: Enforces license compliance, banned dependencies, and source registry verification via `deny.toml`.

### Frontend (npm)

- **pnpm audit**: Runs as part of CI on every PR that touches `frontend/`. Fails on `high` and `critical` severity vulnerabilities.

### GitHub Actions

- Dependabot keeps action versions current. Review pinned SHA updates for compatibility.

## Vulnerability Response

| Severity | Response Time | Action |
|----------|---------------|--------|
| Critical | 24 hours | Immediate hotfix PR; patch to testnet/mainnet as needed |
| High | 3 business days | Prioritized fix in next regular development cycle |
| Medium | 1 week | Fix in regular development cycle |
| Low | Next sprint | Scheduled with other maintenance work |

### Reporting

Report security vulnerabilities by emailing the maintainers directly or opening a private security advisory on GitHub. Do **not** open a public issue for security vulnerabilities.

## Breaking Changes

When a dependency introduces a breaking change:

1. Check the migration guide in the dependency's changelog.
2. Update all affected code before merging the version bump.
3. If the breaking change affects the on-chain contract ABI, follow the contract upgrade process (deploy new WASM, update bindings).
4. If the breaking change affects the frontend, run the full E2E test suite.

## Pinning Strategy

- **Cargo**: Exact versions in `Cargo.lock`; semver ranges in `Cargo.toml` for direct dependencies.
- **npm**: Exact versions in `pnpm-lock.yaml`; semver ranges in `package.json`.
- **GitHub Actions**: Pinned to full commit SHAs with version comments (e.g., `actions/checkout@<sha> # v7.0.0`).
