# Changelog Conventions

This document defines how changes are recorded in `CHANGELOG.md` and release
notes for both the Soroban contracts and the web application.

## Categories

| Prefix | Scope | Example |
|--------|-------|---------|
| `feat` | New user-facing feature | `feat(frontend): add quest leaderboard` |
| `fix` | Bug fix | `fix(contracts): prevent reward overflow on flat mode` |
| `docs` | Documentation only | `docs: add data retention policy` |
| `refactor` | Code restructure, no behavior change | `refactor(quest): extract enrollment logic` |
| `test` | Test additions or fixes | `test(milestone): cover edge case for zero rewards` |
| `chore` | Build, tooling, CI | `chore(ci): add contract size check` |
| `perf` | Performance improvement | `perf(quest): reduce storage reads in get_quest` |
| `style` | Formatting, no logic change | `style: apply cargo fmt` |
| `revert` | Revert of a previous change | `revert: undo broken migration` |

## Breaking Changes

Breaking contract changes **must** include migration impact in the entry:

```
### ⚠ BREAKING CHANGES

* **contracts:** `verify_completion` now returns `FlatRewardNotConfigured`
  if no flat reward is set. Migrators must call `set_flat_reward` before
  verifying milestones in flat distribution mode.
```

Breaking frontend changes **must** note affected routes or APIs:

```
* **frontend:** Removed `/workspace/:id` redirect. Use `/quest/:id`.
```

## Entry Format

Each entry in `CHANGELOG.md` under a version heading should:

1. Start with the category prefix and scope in parentheses
2. Reference the issue or PR number: `([#123](url))`
3. Use plain language a non-developer can understand
4. Group by scope: `contracts`, `frontend`, `ci`, `docs`

Example:

```
## [0.4.0] - 2026-09-15

### Features

* **contracts:** add quest expiration deadline support ([#456](https://github.com/lernza/lernza/issues/456))
* **frontend:** show countdown timer for expiring quests ([#457](https://github.com/lernza/lernza/issues/457))

### Bug Fixes

* **contracts:** prevent reward drain when milestone count is zero ([#460](https://github.com/lernza/lernza/issues/460))
```

## Release Checklist

Before tagging a release:

- [ ] All merged PRs since the last release are listed in `CHANGELOG.md`
- [ ] Breaking changes include migration instructions
- [ ] Contract changes note any storage layout or API differences
- [ ] Frontend changes note affected routes
- [ ] Issue or PR numbers are linked
- [ ] Entries use plain language (no jargon unexplained)
