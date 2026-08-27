# Lernza Configuration

Centralized environment configuration for development, staging, and production.

## Usage

### Switch Network via Helper Script

You can switch the network target instantly using `scripts/switch-network.sh` or npm script:

```bash
# Switch to testnet configuration
./scripts/switch-network.sh testnet
# or
npm run switch:network testnet

# Switch to mainnet configuration
./scripts/switch-network.sh mainnet

# Switch to local standalone network
./scripts/switch-network.sh standalone
```

`scripts/load-config.mjs` accepts network aliases (`testnet` -> `staging`, `mainnet` -> `production`, `standalone` -> `development`).

### Generate a `.env.local` for the frontend

```bash
# Development (standalone network)
node scripts/load-config.mjs development > frontend/.env.local

# Staging (testnet)
node scripts/load-config.mjs testnet > frontend/.env.local

# Production (mainnet)
node scripts/load-config.mjs mainnet > frontend/.env.local
```

### Generate env vars for the event-indexer

The `load-config.mjs` script also outputs service-level env vars at the end:

```bash
node scripts/load-config.mjs staging > .env
```

Copy the relevant lines to `services/event-indexer/.env`.

### Quick validation

```bash
node scripts/load-config.mjs development json    # print as JSON
node scripts/load-config.mjs production env      # print as env vars
```

## Files

| File | Environment | Stellar Network |
|------|-------------|-----------------|
| `development.yaml` | Local dev | Standalone |
| `staging.yaml` | Pre-production | Testnet |
| `production.yaml` | Live | Mainnet |

## Adding a new config key

1. Add the key to all three `config/*.yaml` files under the appropriate section.
2. Add the corresponding `VITE_*` env var to `frontend/src/lib/env.ts` (with Zod validation).
3. Add the TypeScript type to `frontend/src/env.d.ts`.
4. Add the var to `frontend/.env.example`.
5. If needed for CI, add validation in `frontend/scripts/check-env.mjs`.
