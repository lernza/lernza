# @lernza/mcp

Model Context Protocol (MCP) server for Lernza. Exposes quest, milestone, and
rewards data as MCP tools so that AI assistants and agent frameworks can query
on-chain Lernza state through a standard interface.

## Overview

The package exports a factory function (`createLernzaMcpServer`) that builds an
`McpServer` instance (from [`@modelcontextprotocol/sdk`][mcp-sdk]) pre-loaded
with the full Lernza tool catalog. The server is intentionally read-only; write
operations (funding, reward distribution) require wallet auth handled by the
Freighter-connected frontend.

[mcp-sdk]: https://github.com/modelcontextprotocol/typescript-sdk

## Installation

```bash
# from the mcp/ directory
npm install
```

## Usage

```ts
import { createLernzaMcpServer } from "@lernza/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = createLernzaMcpServer({
  catalog_cache_ttl: 300, // 5 minutes (default)
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Override individual tool handlers

`createLernzaMcpServer` registers placeholder handlers for every tool. Mount
the server and override handlers in the consuming application before calling
`connect`:

```ts
const server = createLernzaMcpServer({ catalog_cache_ttl: 60 });

// Replace the placeholder with a real RPC call
server.tool("get_quest", "Retrieve a quest by ID", { quest_id: { type: "number" } },
  async ({ quest_id }) => {
    const data = await rpcClient.getQuest(quest_id);
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  }
);
```

## Configuration

All options are optional.

### `catalog_cache_ttl`

| Type | Default | Valid range |
|------|---------|-------------|
| `number` (integer, seconds) | `300` | `0` – `Number.MAX_SAFE_INTEGER` |

How long MCP clients should cache the tool catalog before re-fetching it via
`tools/list`. The value is surfaced in the server's `capabilities.experimental`
block:

```json
{
  "capabilities": {
    "tools": {},
    "experimental": {
      "catalog": { "cache_ttl": 300 }
    }
  }
}
```

Compatible clients that read `capabilities.experimental.catalog.cache_ttl`
can skip repeated `tools/list` round-trips and use the cached list for the
advertised number of seconds.

**Special values:**

| Value | Behaviour |
|-------|-----------|
| `0`   | No caching — clients must re-fetch the catalog on every request. |
| `> 0` | Clients may reuse the catalog for this many seconds. |

**Validation:** `catalog_cache_ttl` must be a non-negative finite integer.
A negative value, a float, `NaN`, or `Infinity` throws a `RangeError`.

```ts
// ✅ valid
createLernzaMcpServer({ catalog_cache_ttl: 0 });    // disable caching
createLernzaMcpServer({ catalog_cache_ttl: 300 });   // 5 min (default)
createLernzaMcpServer({ catalog_cache_ttl: 600 });   // 10 min
createLernzaMcpServer({ catalog_cache_ttl: 86400 }); // 24 h

// ❌ throws RangeError
createLernzaMcpServer({ catalog_cache_ttl: -1 });
createLernzaMcpServer({ catalog_cache_ttl: 1.5 });
createLernzaMcpServer({ catalog_cache_ttl: NaN });
createLernzaMcpServer({ catalog_cache_ttl: Infinity });
```

### `name`

| Type | Default |
|------|---------|
| `string` | `"lernza"` |

Human-readable server name reported in the MCP `initialize` handshake.

### `version`

| Type | Default |
|------|---------|
| `string` | `"0.1.0"` |

Server version string reported in the MCP `initialize` handshake.

## Tool Catalog

The following tools are registered on every server instance. Each tool is
read-only and maps to a query operation on the Lernza smart contracts.

| Tool | Description |
|------|-------------|
| `get_quest` | Retrieve details for a single quest by its on-chain ID |
| `list_quests` | List active quests with optional offset/limit pagination |
| `get_milestones` | List all milestones for a given quest |
| `get_enrollees` | Return enrolled learners for a quest |
| `get_pool_balance` | Return the token balance in a quest's reward pool |
| `get_user_earnings` | Return total earnings for a Stellar address |

See [`src/catalog.ts`](src/catalog.ts) for the full JSON Schema for each tool's
input parameters.

## Development

```bash
cd mcp

# Type-check
npm run lint

# Run tests
npm test

# Build
npm run build
```

## Testing

Tests live in `src/catalog.test.ts` and are run with Jest + ts-jest (ESM mode).
They cover:

- `resolveConfig` — valid and invalid TTL values, defaults, name/version overrides
- `LERNZA_TOOLS` — catalog shape, required fields, schema types
- `createLernzaMcpServer` — valid configs succeed, invalid TTLs throw

```bash
npm test
```

## Architecture Notes

- This package does **not** make any RPC calls itself. It defines the MCP interface
  and tool schemas. Real contract queries are wired by the consuming process that
  calls `createLernzaMcpServer` and overrides individual tool handlers.
- The `catalog_cache_ttl` is advisory — it only matters if the MCP client reads
  `capabilities.experimental`. Standard MCP clients that ignore experimental
  capabilities will still work correctly; they'll just re-fetch the catalog more
  often.
- The MCP protocol does not define a standard `cache_ttl` field yet. Placing it
  in `capabilities.experimental` follows the SDK convention for pre-standard
  extensions and avoids breaking strict capability parsers.
