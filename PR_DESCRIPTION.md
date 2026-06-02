# CI/CD Enhancements: Lighthouse, Security Scanning, and Quality Gates

## Summary

This PR implements comprehensive CI/CD improvements to enforce quality gates, security scanning, and performance budgets on every pull request.

Closes #961  
Closes #960  
Closes #959  
Closes #958

## Changes

### 1. ✅ Lighthouse CI Budget Enforcement (#961)

**Problem:** `lighthouserc.json` defines budgets (total 500KB, LCP < 2.5s, CLS < 0.1) but no GitHub Action enforces them. The dashboard chunk regression (1.2MB) would not have been caught.

**Solution:** Added `.github/workflows/lighthouse-ci.yml` that:
- Runs Lighthouse CI against the Vercel preview URL on every frontend PR
- Posts performance scores as PR comments
- Blocks merge if regressions exceed 10%
- Enforces bundle size budgets and Core Web Vitals thresholds

**Acceptance:**
- ✅ PR comment with Lighthouse scores
- ✅ Failure blocks merge if regressions > 10%
- ✅ Catches bundle size regressions automatically

### 2. 🔒 Cargo Security Scanning (#960)

**Problem:** No supply-chain scanning runs on contract changes. Dependabot covers npm but not crates.io.

**Solution:** Added `.github/workflows/cargo-security.yml` that:
- Runs `cargo audit` with refreshed advisory database
- Runs `cargo deny check` with policy enforcement from `deny.toml`
- Blocks PR on CVSS > 6 vulnerabilities
- Runs daily via cron to catch new advisories
- Posts detailed security reports as PR comments

**Acceptance:**
- ✅ Job blocks PR on CVSS > 6
- ✅ `deny.toml` policy enforced (licenses, bans, sources)
- ✅ Advisory DB refreshed automatically
- ✅ Daily scheduled runs for continuous monitoring

### 3. 🚀 Release Please Re-enabled (#959)

**Problem:** `release.yml.bak` is disabled. Releases and changelog updates are manual and rely on remembering to bump versions.

**Solution:** Re-enabled `release.yml` that:
- Automatically creates/updates Release PRs on main branch merges
- Uses conventional commits for version bumping
- Builds WASM contracts and uploads to releases
- Generates comprehensive release notes with all commit types
- Lists contributors with GitHub profiles
- Verified `release-please-config.json` reflects current project structure

**Acceptance:**
- ✅ Next merge to main opens a release-please PR automatically
- ✅ WASM artifacts uploaded on release
- ✅ Full changelog with contributors

### 4. ✅ PR Quality Checks Re-enabled (#958)

**Problem:** `pr-checks.yml.bak` enforces conventional-commit PR titles and linked issues — both are documented requirements but currently not gated.

**Solution:** Re-enabled `pr-checks.yml` that:
- Enforces semantic/conventional PR titles (feat, fix, docs, etc.)
- Requires linked issues via "Closes #N" or GitHub sidebar
- Auto-applies labels via labeler
- Allows Renovate/Dependabot to bypass checks
- Allows `no-issue` label for trivial changes

**Acceptance:**
- ✅ PRs without semantic title fail check
- ✅ PRs without linked issue fail (unless `no-issue` label)
- ✅ Bots (dependabot, renovate, release-please) bypass checks

## Testing

All workflows are configured with proper path filters and concurrency controls:
- `lighthouse-ci.yml` - triggers on `frontend/**` changes
- `cargo-security.yml` - triggers on `contracts/**`, `Cargo.*`, `deny.toml` changes
- `release.yml` - triggers on push to main and manual dispatch
- `pr-checks.yml` - triggers on all PRs to main

## Impact

- **Performance:** Prevents bundle size regressions and Core Web Vitals degradation
- **Security:** Proactive vulnerability scanning for Rust dependencies
- **Release Management:** Automated, consistent releases with proper versioning
- **Code Quality:** Enforced PR standards align with documented guidelines

## Deployment Notes

- No environment changes required
- Workflows will activate on next PR/push to main
- `GITHUB_TOKEN` has sufficient permissions (no secrets needed)
- Lighthouse CI requires Vercel preview deployment (already configured)

---

**Breaking Changes:** None  
**Database Changes:** None  
**Configuration Changes:** Re-enabled previously disabled workflows
