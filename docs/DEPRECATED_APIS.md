# Deprecated SDK APIs

This document tracks Soroban SDK API deprecations that Lernza contracts depend on or have migrated away from.

## Removal of Blanket `#![allow(deprecated)]`

**Date:** 2026-04-29
**Change:** Removed top-level `#![allow(deprecated)]` from all contract crates.

### Background

All four contract crates (`quest`, `milestone`, `rewards`, `certificate`) previously silenced deprecation warnings with a blanket `#![allow(deprecated)]` attribute. This prevented visibility into actual SDK API deprecations we should migrate from.

### Current Status

- **certificate**: No deprecated API usage detected after blanket allow removal.
- **milestone**: No deprecated API usage detected after blanket allow removal.
- **quest**: No deprecated API usage detected after blanket allow removal.
- **rewards**: No deprecated API usage detected after blanket allow removal.

### Migration Action Items

If future Soroban SDK versions introduce breaking deprecations, deprecation warnings will now surface at compile time with proper attribution. When deprecations are identified:

1. Add a per-site `#[allow(deprecated)]` block above the deprecated call.
2. Include a `// TODO(#XXX)` comment referencing the GitHub issue for migration.
3. Open a follow-up issue to track the migration.
4. Update this file with the deprecated API name, reason, and intended migration path.

### Guidelines

- Never add top-level `#![allow(deprecated)]` attributes.
- Per-call allows are acceptable only when paired with a TODO and issue reference.
- Periodically review TODO comments and prioritize migrations to keep the codebase forward-compatible.

---

## Deprecated APIs Requiring Migration

(None identified yet. New deprecations will be listed here as they arise.)

