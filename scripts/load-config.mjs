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
    const nestedMatch = trimmed.match(/^  (\w+):\s*(.*)/);
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

function getEnvironment() {
  const envArg = process.argv[2];
  if (envArg && ["development", "staging", "production"].includes(envArg)) {
    return envArg;
  }
  if (process.env.ENVIRONMENT && ["development", "staging", "production"].includes(process.env.ENVIRONMENT)) {
    return process.env.ENVIRONMENT;
  }
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
