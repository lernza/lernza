/**
 * Configuration for the Lernza MCP server.
 */
export interface LernzaMcpConfig {
  /**
   * How long (in seconds) MCP clients should cache the tool/resource catalog
   * before re-fetching it via tools/list or resources/list.
   *
   * - `0`  — no caching; clients must re-fetch the catalog on every request.
   * - `> 0` — clients may reuse the catalog for this many seconds.
   *
   * Defaults to `300` (5 minutes).
   *
   * This value is surfaced through the server's `capabilities.experimental`
   * block as `{ catalog_cache_ttl: <seconds> }` so that compatible clients
   * can honour it without requiring a dedicated protocol extension.
   */
  catalog_cache_ttl?: number;

  /**
   * Human-readable name for this MCP server instance.
   * Defaults to `"lernza"`.
   */
  name?: string;

  /**
   * Semantic version of this server instance.
   * Defaults to `"0.1.0"`.
   */
  version?: string;
}

/** Default configuration values. */
export const DEFAULT_CONFIG: Required<LernzaMcpConfig> = {
  catalog_cache_ttl: 300,
  name: "lernza",
  version: "0.1.0",
};

/**
 * Merges caller-supplied config with defaults, validates `catalog_cache_ttl`,
 * and returns the resolved config.
 *
 * @throws {RangeError} when `catalog_cache_ttl` is negative or not a finite integer.
 */
export function resolveConfig(
  config: LernzaMcpConfig = {}
): Required<LernzaMcpConfig> {
  const ttl = config.catalog_cache_ttl ?? DEFAULT_CONFIG.catalog_cache_ttl;

  if (!Number.isFinite(ttl) || ttl < 0 || !Number.isInteger(ttl)) {
    throw new RangeError(
      `catalog_cache_ttl must be a non-negative integer (received ${ttl})`
    );
  }

  return {
    catalog_cache_ttl: ttl,
    name: config.name ?? DEFAULT_CONFIG.name,
    version: config.version ?? DEFAULT_CONFIG.version,
  };
}
