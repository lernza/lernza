# Dependency Update Policy & Security Scanning

This document establishes Lernza's dependency management policy, security auditing requirements, and response procedures for supply-chain security vulnerabilities.

---

## 1. Dependency Ownership & Update Cadence

Dependency security and maintenance is shared across contract and frontend maintainers.

### Automated Update Schedules (Dependabot)

Dependabot is configured (`.github/dependabot.yml`) to automatically check for dependency updates every Monday:

| Ecosystem | Directory | Target Branch | Schedule | PR Limit | Ownership |
|-----------|-----------|---------------|----------|----------|-----------|
| **Cargo** | `/` | `main` | Weekly (Mon 00:00 UTC) | 10 | Smart Contract Team |
| **npm / pnpm** | `/frontend` | `main` | Weekly (Mon 00:00 UTC) | 10 | Frontend Team |
| **GitHub Actions** | `/` | `main` | Weekly (Mon 00:00 UTC) | 5 | Infrastructure / DevOps |

---

## 2. Security Auditing & Automated Scanning in CI

Automated security checks run on every Pull Request and daily schedule in CI:

### Rust / Cargo Scanning (`.github/workflows/dependency-security-scan.yml`)
- **`cargo audit`**: Queries the RustSec Advisory Database for known CVEs. Fails CI on high/critical findings (CVSS score > 6.0), unsound code, or yanked crates.
- **`cargo deny`**: Validates license compliance, enforces banned dependencies, and checks crate registry sources via `deny.toml`.

### Frontend / Node Scanning
- **`pnpm audit`**: Scans Node package manifests (`package.json`, `pnpm-lock.yaml`). Fails CI if `high` or `critical` severity vulnerabilities are detected.

### Lockfile Integrity Validation
- **Lockfile Enforcement**: Pull Requests modifying `Cargo.toml` or `frontend/package.json` **must** commit the corresponding updated lockfiles (`Cargo.lock` or `pnpm-lock.yaml`).
- CI enforces `--frozen-lockfile` (for pnpm) and `--locked` (for Cargo) to detect out-of-sync manifests.

---

## 3. Vulnerability Response SLAs

When security vulnerabilities are detected in dependency scans or reported via security advisories:

| Severity | Definition | Response SLA | Required Action |
|----------|------------|--------------|-----------------|
| **Critical** | Remote code execution, key compromise, fund loss | **24 hours** | Immediate emergency patch, release hotfix to testnet/mainnet. |
| **High** | Potential privilege escalation or severe denial of service | **3 business days** | Prioritized dependency update in current sprint. |
| **Medium** | Conditional vulnerability, complex exploitation requirements | **1 week** | Standard dependency update in regular development cycle. |
| **Low** | Non-exploitable informational advisory | **Next sprint** | Scheduled maintenance update. |

---

## 4. Policy Exceptions & Advisory Overrides

If a dependency update cannot be applied immediately (e.g. upstream breaking change or false positive advisory), an exception may be granted subject to strict controls:

### Exception Criteria
1. **Documented Rationale**: The exception must include a technical justification explaining why the vulnerability is unexploitable in Lernza's execution context.
2. **Assigned Owner**: A designated maintainer must be assigned ownership of the exception.
3. **Expiration & Review Date**: Exceptions cannot be permanent and MUST specify a review/expiration date (maximum 30 days).

### Exception Documentation Format

#### Cargo / Rust (`deny.toml`)
```toml
[advisories]
ignore = [
    # RUSTSEC-2026-0001: Reason - Utility script dev dependency only, unexploitable in WASM runtime.
    # Owner: @DevNetlife
    # Review Date: 2026-09-30
    "RUSTSEC-2026-0001"
]
```

#### Node / Frontend (`frontend/package.json` pnpm overrides or audit exceptions)
```json
{
  "pnpm": {
    "auditConfig": {
      "ignoreCves": [
        "CVE-2026-XXXX" // Reason: Build tool dependency, unexploitable in client bundle. Owner: @frontend-lead. Review: 2026-09-30
      ]
    }
  }
}
```
