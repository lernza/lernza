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

## deploy-contracts.sh

Automated deployment script for Soroban contracts (`rewards`, `quest`, `milestone`, `certificate`) with proper error handling, checkpointing, and rollback capabilities.

### Usage

```bash
# Basic deployment to testnet (with automatic WASM build)
./scripts/deploy-contracts.sh --network testnet --build

# Deploy to standalone local network
./scripts/deploy-contracts.sh --network standalone --config-env development

# Dry-run deployment simulation
./scripts/deploy-contracts.sh --network testnet --dry-run

# Rollback deployment checkpoint and restore original configs
./scripts/deploy-contracts.sh --rollback
```

### Options

- `-n, --network <network>`: Target network (`testnet`, `standalone`, `mainnet`). Default: `testnet`.
- `-s, --source <account>`: Deployer key or account alias. Default: `lernza-deployer`.
- `-t, --token-addr <address>`: SAC Token contract address for rewards contract initialization.
- `-c, --config-env <env>`: Config file target (`development`, `staging`, `production`).
- `-b, --build`: Rebuild WASM binaries before deploying.
- `--dry-run`: Simulate deployment without making on-chain transactions.
- `--rollback`: Clean state file checkpoint (`.deploy-state.json`) and restore config backups.

## switch-network.sh

Helper script to quickly switch local frontend environment configuration between Stellar `testnet`, `mainnet`, and `standalone` networks.

### Usage

```bash
# Switch to testnet configuration
./scripts/switch-network.sh testnet

# Switch to mainnet configuration
./scripts/switch-network.sh mainnet

# Switch to standalone local network
./scripts/switch-network.sh standalone
```

