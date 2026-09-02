import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LERNZA_TOOLS } from "./catalog.js";
import { DEFAULT_CONFIG, LernzaMcpConfig, resolveConfig } from "./config.js";

export { LernzaMcpConfig, DEFAULT_CONFIG, resolveConfig };
export { LERNZA_TOOLS };

/**
 * Creates and returns a configured `McpServer` instance for Lernza.
 *
 * The server advertises all Lernza tools and surfaces `catalog_cache_ttl`
 * (in seconds) through `capabilities.experimental` so that compatible MCP
 * clients can cache the tool catalog without re-fetching it on every request.
 *
 * @example
 * ```ts
 * // Default TTL (300 s / 5 min)
 * const server = createLernzaMcpServer();
 *
 * // Disable caching
 * const server = createLernzaMcpServer({ catalog_cache_ttl: 0 });
 *
 * // Cache for 10 minutes
 * const server = createLernzaMcpServer({ catalog_cache_ttl: 600 });
 * ```
 */
export function createLernzaMcpServer(config: LernzaMcpConfig = {}): McpServer {
  const resolved = resolveConfig(config);

  const server = new McpServer(
    { name: resolved.name, version: resolved.version },
    {
      capabilities: {
        tools: {},
        experimental: {
          // catalog_cache_ttl is wrapped in an object because the MCP protocol
          // types experimental capability values as `object`, not `number`.
          // Compatible clients should read: capabilities.experimental.catalog.cache_ttl
          catalog: { cache_ttl: resolved.catalog_cache_ttl },
        },
      },
    }
  );

  // Register each tool from the catalog with a placeholder handler.
  // The catalog metadata (description, inputSchema) is carried in LERNZA_TOOLS
  // and exposed via the `tools/list` protocol response through the SDK.
  //
  // Implementors that consume this factory should override individual tools
  // via server.registerTool() with a real Zod inputSchema and handler before
  // calling server.connect(transport).
  for (const tool of LERNZA_TOOLS) {
    server.registerTool(
      tool.name,
      { description: tool.description ?? "" },
      // Placeholder handler — replace in the consuming application.
      async () => ({
        content: [
          {
            type: "text" as const,
            text: `Tool "${tool.name}" is registered but not yet implemented.`,
          },
        ],
      })
    );
  }

  return server;
}
