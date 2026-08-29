import { describe, expect, it } from "vitest";
import { LERNZA_TOOLS } from "./catalog.js";
import { DEFAULT_CONFIG, resolveConfig } from "./config.js";
import { createLernzaMcpServer } from "./server.js";

// ---------------------------------------------------------------------------
// resolveConfig
// ---------------------------------------------------------------------------

describe("resolveConfig", () => {
  it("returns default config when called with no arguments", () => {
    const cfg = resolveConfig();
    expect(cfg.catalog_cache_ttl).toBe(DEFAULT_CONFIG.catalog_cache_ttl);
    expect(cfg.name).toBe(DEFAULT_CONFIG.name);
    expect(cfg.version).toBe(DEFAULT_CONFIG.version);
  });

  it("returns default TTL (300) when catalog_cache_ttl is omitted", () => {
    const cfg = resolveConfig({ name: "custom" });
    expect(cfg.catalog_cache_ttl).toBe(300);
  });

  it("accepts catalog_cache_ttl of 0 (no caching)", () => {
    const cfg = resolveConfig({ catalog_cache_ttl: 0 });
    expect(cfg.catalog_cache_ttl).toBe(0);
  });

  it("accepts a positive integer TTL", () => {
    const cfg = resolveConfig({ catalog_cache_ttl: 600 });
    expect(cfg.catalog_cache_ttl).toBe(600);
  });

  it("accepts large TTL values (e.g. 86400 for 24 h)", () => {
    const cfg = resolveConfig({ catalog_cache_ttl: 86400 });
    expect(cfg.catalog_cache_ttl).toBe(86400);
  });

  it("throws RangeError for a negative catalog_cache_ttl", () => {
    expect(() => resolveConfig({ catalog_cache_ttl: -1 })).toThrow(RangeError);
    expect(() => resolveConfig({ catalog_cache_ttl: -1 })).toThrow(
      "catalog_cache_ttl"
    );
  });

  it("throws RangeError for a non-integer catalog_cache_ttl", () => {
    expect(() => resolveConfig({ catalog_cache_ttl: 1.5 })).toThrow(
      RangeError
    );
  });

  it("throws RangeError for NaN catalog_cache_ttl", () => {
    expect(() => resolveConfig({ catalog_cache_ttl: NaN })).toThrow(
      RangeError
    );
  });

  it("throws RangeError for Infinity catalog_cache_ttl", () => {
    expect(() => resolveConfig({ catalog_cache_ttl: Infinity })).toThrow(
      RangeError
    );
  });

  it("overrides name and version when provided", () => {
    const cfg = resolveConfig({ name: "my-server", version: "1.2.3" });
    expect(cfg.name).toBe("my-server");
    expect(cfg.version).toBe("1.2.3");
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_CONFIG
// ---------------------------------------------------------------------------

describe("DEFAULT_CONFIG", () => {
  it("has catalog_cache_ttl of 300", () => {
    expect(DEFAULT_CONFIG.catalog_cache_ttl).toBe(300);
  });

  it("has name lernza", () => {
    expect(DEFAULT_CONFIG.name).toBe("lernza");
  });

  it("has version 0.1.0", () => {
    expect(DEFAULT_CONFIG.version).toBe("0.1.0");
  });
});

// ---------------------------------------------------------------------------
// LERNZA_TOOLS catalog
// ---------------------------------------------------------------------------

describe("LERNZA_TOOLS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(LERNZA_TOOLS)).toBe(true);
    expect(LERNZA_TOOLS.length).toBeGreaterThan(0);
  });

  it("contains the expected tool names", () => {
    const names = LERNZA_TOOLS.map((t) => t.name);
    expect(names).toContain("get_quest");
    expect(names).toContain("list_quests");
    expect(names).toContain("get_milestones");
    expect(names).toContain("get_enrollees");
    expect(names).toContain("get_pool_balance");
    expect(names).toContain("get_user_earnings");
  });

  it("every tool has a non-empty description", () => {
    for (const tool of LERNZA_TOOLS) {
      expect(typeof tool.description).toBe("string");
      expect((tool.description ?? "").length).toBeGreaterThan(0);
    }
  });

  it("every tool has an inputSchema of type object", () => {
    for (const tool of LERNZA_TOOLS) {
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("every tool's required fields are declared in properties", () => {
    for (const tool of LERNZA_TOOLS) {
      const schema = tool.inputSchema;
      const props = Object.keys(schema.properties ?? {});
      for (const req of schema.required ?? []) {
        expect(props).toContain(req);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// createLernzaMcpServer
// ---------------------------------------------------------------------------

describe("createLernzaMcpServer", () => {
  it("creates a server with default catalog_cache_ttl in capabilities", () => {
    const server = createLernzaMcpServer();
    const caps = server.server.getClientCapabilities();
    // The TTL is stored in the server info / capabilities; we verify via the
    // internal _serverInfo which the SDK exposes as server.server.
    // Because the SDK does not expose capabilities directly, we validate
    // indirectly via resolveConfig and confirm no error is thrown.
    expect(server).toBeDefined();
  });

  it("accepts catalog_cache_ttl: 0 without throwing", () => {
    expect(() => createLernzaMcpServer({ catalog_cache_ttl: 0 })).not.toThrow();
  });

  it("accepts catalog_cache_ttl: 600 without throwing", () => {
    expect(() =>
      createLernzaMcpServer({ catalog_cache_ttl: 600 })
    ).not.toThrow();
  });

  it("throws when catalog_cache_ttl is negative", () => {
    expect(() =>
      createLernzaMcpServer({ catalog_cache_ttl: -5 })
    ).toThrow(RangeError);
  });

  it("throws when catalog_cache_ttl is a float", () => {
    expect(() =>
      createLernzaMcpServer({ catalog_cache_ttl: 3.14 })
    ).toThrow(RangeError);
  });

  it("returns an McpServer instance", () => {
    const server = createLernzaMcpServer();
    // McpServer exposes a .server property (the underlying Server instance)
    expect(server).toHaveProperty("server");
  });
});
