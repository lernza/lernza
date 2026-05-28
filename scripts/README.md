# Lernza Scripts

This directory contains automation scripts for the Lernza project.

## check-docs.js

Documentation link and reference checker that validates:

- **Internal file links**: Checks that all markdown links point to existing files
- **Contract function references**: Validates that documented functions match actual contract code
- **Stale terminology**: Detects outdated "workspace" references that should be "quest"
- **File path references**: Ensures referenced code files and directories exist

### Usage

```bash
# Run the checker
node scripts/check-docs.js

# Or use npm script (from root)
npm run check:docs
```

### What it checks

1. **Broken Links**
   - Markdown links `[text](path)`
   - HTML links `<a href="path">`
   - Relative file paths
   - Anchor links (coming soon)

2. **Stale References**
   - `workspace_id` → should be `quest_id`
   - `create_workspace` → should be `create_quest`
   - `get_workspace` → should be `get_quest`
   - `fund_workspace` → should be `fund_quest`
   - `WorkspaceInfo` → should be `QuestInfo`
   - `contracts/workspace/` → should be `contracts/quest/`

3. **Invalid Functions**
   - Deprecated function names in code examples
   - Functions that don't exist in contracts

4. **Missing Files**
   - Referenced code files that don't exist
   - Broken directory paths

### Configuration

Edit `scripts/check-docs.js` to customize:

- `DOCS_DIRS`: Directories to scan
- `DOC_EXTENSIONS`: File extensions to check
- `IGNORE_PATTERNS`: Patterns to skip
- `CONTRACT_FUNCTIONS`: Valid contract functions
- `STALE_TERMS`: Deprecated terminology patterns

### CI Integration

This script runs automatically on PRs that modify documentation files via the `docs-check.yml` workflow.

### Exit Codes

- `0`: All checks passed
- `1`: Issues found (fails CI)

## generate-bindings.sh

Generates TypeScript contract bindings from compiled WASM files.

See [CONTRIBUTING.md](../CONTRIBUTING.md#generating-typescript-contract-bindings) for usage.
