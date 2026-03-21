# Changelog

## [0.2.1](https://github.com/lernza/lernza/compare/v0.2.0...v0.2.1) (2026-03-21)


### Bug Fixes

* **ci:** exempt dependabot from pr-checks and auto-label ([#94](https://github.com/lernza/lernza/issues/94)) ([8e177c5](https://github.com/lernza/lernza/commit/8e177c5bfe253d47088c0f3807d8349031c12243))

## [0.2.0](https://github.com/lernza/lernza/compare/v0.1.0...v0.2.0) (2026-03-21)


### Features

* **ci:** switch to Release Please for automated releases ([cae2926](https://github.com/lernza/lernza/commit/cae29261ee3e84fc8f12b78692261f164959ea5f))


### Bug Fixes

* **ci:** skip CI checks for Release Please PRs, simplify release notes ([#90](https://github.com/lernza/lernza/issues/90)) ([73c63fd](https://github.com/lernza/lernza/commit/73c63fd7632c218821c2e9e39636f736e418181f))

## [0.1.0](https://github.com/lernza/lernza/releases/tag/v0.1.0) (2026-03-21)

### New Features

* admin dashboard (12feebe)
* add wallet connection hook and integrate with Freighter API (f489b23)
* enhance profile and workspace pages with improved UI and animations (851eb33)
* enhance landing page with new icons and improved footer layout (6571acc)
* enhance layout and animations across components (d7f2f34)
* handle refresh and 404 (8d48cd1)
* continuous marquee (1d2c427)
* USDC token, auto-labeling, release workflow, contributor recognition (0159190)
* add Stellar contract integration layer (c26cb57)
* path-filtered builds, linked-issue check, stale bot (062ef31)
* PR-linked issues auto-progress, comprehensive branch protection (bae47eb)

### Bug Fixes

* fix wallet connection reliability improvements
* fix release notes and WASM binary paths
* harden project automation with status guards and edge cases (670fd76)
* handle all edge cases in project automation (dad6bed)

### Refactoring

* consolidate project automation into single job (2b99ac3)
* remove Todo status, simplify to 5-status board (5bb96b9)

### Documentation

* add lernza-automation GitHub App implementation guide (95a5ba9)
* rewrite README with detailed architecture, contract API, and roadmap (7515497)

### CI/CD

* migrate to Vercel (a66e7cf)
* add repo infrastructure, CI workflows, and community files (49d1963)
