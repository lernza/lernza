# Release Checklist — Frontend & Contract Deployments

Use this document for every production release of Lernza. Work through each
section in order; check items off as you go. Paste a link to this checklist in
the release PR description.

> **Resolves issue #1466** — "Create a release checklist for frontend and
> contract deployments."

---

## 0. Pre-release gate

Before starting, confirm the following are true:

- [ ] All planned work items for this release are merged to `main`.
- [ ] No open P0/P1 incidents are active.
- [ ] The release branch (or `main`) is green on CI.
- [ ] A release owner has been identified and is available for the window.

---

## 1. Tests

### 1.1 Automated test suite

- [ ] `pnpm test` (unit + integration) passes with no failures.
- [ ] `pnpm lint` passes with no errors.
- [ ] E2E suite passes: `pnpm exec playwright test` (or CI equivalent).
- [ ] Rust tests pass: `cargo test --workspace`.
- [ ] Clippy clean: `cargo clippy --workspace -- -D warnings`.

### 1.2 Coverage

- [ ] Coverage has not regressed below the project threshold (see `coverage.yml.bak` for thresholds).
- [ ] Any new code paths are covered or a waiver is documented.

---

## 2. Contract builds

- [ ] Build all contract WASMs:
  ```bash
  cargo build --workspace --target wasm32-unknown-unknown --release
  ```
- [ ] Optimise WASMs (if `wasm-opt` is available):
  ```bash
  for f in target/wasm32-unknown-unknown/release/*.wasm; do
    wasm-opt -Oz "$f" -o "$f"
  done
  ```
- [ ] Verify WASM hashes match `docs/wasm-hashes.toml`:
  ```bash
  sha256sum target/wasm32-unknown-unknown/release/*.wasm
  ```
- [ ] Update `docs/wasm-hashes.toml` if hashes changed (triggers a version bump).

---

## 3. Deployment manifest updates

- [ ] `release-please-config.json` reflects the correct packages and bump types.
- [ ] `.release-please-manifest.json` contains the current version for each package.
- [ ] Environment variable documentation is up to date (`.env.example`, `DEV_SETUP.md`).
- [ ] Any new contract addresses or RPC URLs are added to the deployment manifests.

---

## 4. Environment validation

- [ ] Testnet environment is healthy (`pnpm exec ts-node scripts/check-env.ts` or equivalent).
- [ ] All required `VITE_*` variables are set in the target environment.
- [ ] Contract IDs referenced in `VITE_*_CONTRACT_ID` match the newly deployed contracts.
- [ ] RPC endpoints are reachable and below error-rate threshold.
- [ ] Confirm network passphrase matches the target network (`TESTNET` / `MAINNET`).

---

## 5. Smoke tests (post-deploy)

Run these against the live environment immediately after deployment:

- [ ] Landing page loads and renders correctly.
- [ ] Wallet connection flow works (Freighter).
- [ ] Quest creation form submits a transaction successfully.
- [ ] Learner can enroll in a quest.
- [ ] Learner can submit a milestone with evidence (URL + note).
- [ ] Quest owner can verify a milestone completion.
- [ ] Reward payout completes and balance is updated.
- [ ] Dashboard shows correct stats.
- [ ] Leaderboard renders without error.

---

## 6. Changelog entries

- [ ] `CHANGELOG.md` contains an entry for this release under `## [Unreleased]` or the new version heading.
- [ ] Each entry references the relevant issue/PR number.
- [ ] Breaking changes (if any) are highlighted with a `> ⚠️ Breaking` callout.

---

## 7. Rollback planning

- [ ] Previous contract WASM hashes are documented (see `docs/wasm-hashes.toml` history).
- [ ] Previous deployment manifest is committed and tagged.
- [ ] The rollback procedure is documented in `docs/operations/deployment-rollback.md`.
- [ ] On-call engineer knows the rollback trigger criteria (error-rate spike, P0 incident).
- [ ] Rollback has been tested in staging within the last 30 days.

---

## 8. Release completion

- [ ] Git tag created: `git tag -a vX.Y.Z -m "Release vX.Y.Z" && git push origin vX.Y.Z`.
- [ ] GitHub Release published with the changelog excerpt.
- [ ] Announcement posted in the community channels.
- [ ] `README.md` version badge updated if applicable.
- [ ] Monitoring / alerting dashboards show nominal after 15 minutes.

---

## Notes

<!-- Add release-specific notes, known issues, or deferred items here. -->

---

*Maintained by the Lernza engineering team. Update this checklist as
the release process evolves.*
