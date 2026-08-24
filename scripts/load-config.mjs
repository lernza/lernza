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
  // Simple YAML parser for the subset of YAML we use (two levels, no arrays).
  // Indentation must be matched against the raw line — trimming first would
  // strip the leading whitespace that distinguishes top-level from nested keys.
  const content = readFileSync(path, "utf8");
  const lines = content.split("\n");
  const result = {};
  let currentKey = null;

  const cleanValue = (raw) => {
    let val = raw.trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val === "" || val === "''") val = "";
    if (val === "true") return true;
    if (val === "false") return false;
    if (val !== "" && !isNaN(Number(val))) return Number(val);
    return val;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Top-level key (no leading whitespace), optionally with an inline value
    const topMatch = line.match(/^(\w+):\s*(.*)$/);
    if (topMatch) {
      currentKey = topMatch[1];
      const val = cleanValue(topMatch[2]);
      result[currentKey] = val === "" ? {} : val;
      continue;
    }

    // Nested key:value (two-space indented)
    const nestedMatch = line.match(/^  (\w+):\s*(.*)$/);
    if (nestedMatch && currentKey) {
      if (typeof result[currentKey] !== "object" || result[currentKey] === null) {
        result[currentKey] = {};
      }
      result[currentKey][nestedMatch[1]] = cleanValue(nestedMatch[2]);
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

// Map config paths to the exact VITE_* names the frontend consumes.
// Key names differ intentionally (e.g. stellar.rpc_url -> VITE_SOROBAN_RPC_URL).
const VITE_KEYS = [
  ["stellar.rpc_url", "VITE_SOROBAN_RPC_URL"],
  ["stellar.network_passphrase", "VITE_SOROBAN_NETWORK_PASSPHRASE"],
  ["stellar.horizon_url", "VITE_HORIZON_URL"],
  ["contracts.quest", "VITE_QUEST_CONTRACT_ID"],
  ["contracts.milestone", "VITE_MILESTONE_CONTRACT_ID"],
  ["contracts.rewards", "VITE_REWARDS_CONTRACT_ID"],
  ["contracts.rewards_token", "VITE_REWARDS_TOKEN_CONTRACT_ID"],
  ["contracts.usdc_token", "VITE_USDC_TOKEN_ADDRESS"],
  ["rpc_rate_limits.capacity", "VITE_RPC_READ_RATE_LIMIT_CAPACITY"],
  ["rpc_rate_limits.refill_per_second", "VITE_RPC_READ_RATE_LIMIT_REFILL_PER_SECOND"],
  ["sentry.dsn", "VITE_SENTRY_DSN"],
];

function getConfigPath(config, path) {
  return path
    .split(".")
    .reduce((acc, key) => (acc && typeof acc === "object" ? acc[key] : undefined), config);
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

  // Output the VITE_* env vars the frontend consumes
  const envLines = VITE_KEYS.map(([path, key]) => `${key}=${getConfigPath(config, path) ?? ""}`);

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
