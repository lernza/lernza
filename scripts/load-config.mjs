#!/usr/bin/env node

/**
 * Central configuration loader for Lernza.
 *
 * Reads config/<environment>.yaml and outputs the flattened env vars
 * needed by the frontend (VITE_*) and the event-indexer.
 *
 * Usage:
 *   node scripts/load-config.mjs [environment] [output-format]
 *
 * environment  - "development" | "staging" | "production" (default: development)
 * output-format - "env" (default) | "json"
 *
 * Examples:
 *   node scripts/load-config.mjs production env     # Print VITE_* env vars
 *   node scripts/load-config.mjs development json    # Print JSON
 *   ENVIRONMENT=production node scripts/load-config.mjs  # Use env var
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, "..", "config");

function loadYaml(path) {
  // Simple YAML parser for the subset of YAML we use (no nested arrays)
  const content = readFileSync(path, "utf8");
  const lines = content.split("\n");
  const result = {};
  let currentKey = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Top-level key
    const topMatch = trimmed.match(/^(\w+):$/);
    if (topMatch) {
      currentKey = topMatch[1];
      result[currentKey] = {};
      continue;
    }

    // Nested key:value
    const nestedMatch = line.match(/^  (\w+):\s*(.*)/);
    if (nestedMatch && currentKey) {
      let val = nestedMatch[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val === "" || val === "''") val = "";
      if (val === "true") val = true;
      if (val === "false") val = false;
      if (!isNaN(Number(val)) && val !== "") val = Number(val);
      result[currentKey][nestedMatch[1]] = val;
    }
  }

  return result;
}

function resolveEnvName(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  if (["staging", "testnet"].includes(lower)) return "staging";
  if (["production", "mainnet"].includes(lower)) return "production";
  if (["development", "dev", "standalone", "local"].includes(lower)) return "development";
  return null;
}

function getEnvironment() {
  const envArg = process.argv[2];
  const resolvedArg = resolveEnvName(envArg);
  if (resolvedArg) return resolvedArg;

  const envVar = resolveEnvName(process.env.ENVIRONMENT);
  if (envVar) return envVar;

  return "development";
}

function flattenForEnv(config, prefix = "") {
  const entries = [];
  for (const [key, value] of Object.entries(config)) {
    const envKey = prefix ? `${prefix}${key.toUpperCase()}` : key.toUpperCase();
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      entries.push(...flattenForEnv(value, `${envKey}_`));
    } else {
      entries.push([envKey, String(value)]);
    }
  }
  return entries;
}

function main() {
  const env = getEnvironment();
  const format = process.argv[3] || "env";
  const configPath = join(CONFIG_DIR, `${env}.yaml`);

  if (!existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    process.exit(1);
  }

  const config = loadYaml(configPath);

  if (format === "json") {
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  // Flatten and output as VITE_* env vars for frontend
  const flat = flattenForEnv(config);
  const envLines = flat.map(([key, value]) => {
    const viteKey = `VITE_${key}`;
    return `${viteKey}=${value}`;
  });

  // Emit the canonical frontend names consumed by src/lib/env.ts. The
  // flattened names remain available for tooling that reads the YAML shape.
  const frontendAliases = {
    VITE_SOROBAN_RPC_URL: config.stellar?.rpc_url || "",
    VITE_SOROBAN_NETWORK_PASSPHRASE: config.stellar?.network_passphrase || "",
    VITE_HORIZON_URL: config.stellar?.horizon_url || "",
    VITE_QUEST_CONTRACT_ID: config.contracts?.quest || "",
    VITE_MILESTONE_CONTRACT_ID: config.contracts?.milestone || "",
    VITE_REWARDS_CONTRACT_ID: config.contracts?.rewards || "",
    VITE_CERTIFICATE_CONTRACT_ID: config.contracts?.certificate || "",
    VITE_REWARDS_TOKEN_CONTRACT_ID: config.contracts?.rewards_token || "",
    VITE_USDC_TOKEN_ADDRESS: config.contracts?.usdc_token || "",
    VITE_RPC_READ_RATE_LIMIT_CAPACITY: config.rpc_rate_limits?.capacity || "",
    VITE_RPC_READ_RATE_LIMIT_REFILL_PER_SECOND: config.rpc_rate_limits?.refill_per_second || "",
    VITE_SENTRY_DSN: config.sentry?.dsn || "",
  };
  for (const [key, value] of Object.entries(frontendAliases)) {
    envLines.push(`${key}=${value}`);
  }

  // Add derived vars
  envLines.push(`VITE_ENVIRONMENT=${env}`);
  envLines.push(`# Generated from config/${env}.yaml`);
  envLines.push(`# Run: node scripts/load-config.mjs ${env} > frontend/.env.local`);

  // Also output service-level env keys
  envLines.push("");
  envLines.push(`# Event-indexer environment variables`);
  envLines.push(`SOROBAN_RPC_URL=${config.stellar?.rpc_url || ""}`);
  envLines.push(`NETWORK_PASSPHRASE=${config.stellar?.network_passphrase || ""}`);
  envLines.push(`QUEST_CONTRACT_ID=${config.contracts?.quest || ""}`);
  envLines.push(`MILESTONE_CONTRACT_ID=${config.contracts?.milestone || ""}`);
  envLines.push(`REWARDS_CONTRACT_ID=${config.contracts?.rewards || ""}`);
  envLines.push(`SENTRY_DSN=${config.sentry?.dsn || ""}`);
  envLines.push(`SENTRY_ENVIRONMENT=${config.sentry?.environment || env}`);

  console.log(envLines.join("\n"));
}

main();
