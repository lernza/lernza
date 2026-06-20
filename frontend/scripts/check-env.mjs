/**
 * check-env.mjs
 *
 * Validates environment variables before dev or production builds.
 *
 * Usage:
 *   node scripts/check-env.mjs                        # testnet (reads .env.local)
 *   node scripts/check-env.mjs --mode testnet         # explicit testnet
 *   node scripts/check-env.mjs --mode mainnet         # mainnet validation
 *   node scripts/check-env.mjs --env-file .env.prod   # custom env file
 *   node scripts/check-env.mjs --help                 # print this help
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)

if (args.includes("--help") || args.includes("-h")) {
  printHelp()
  process.exit(0)
}

function getArg(flag) {
  const idx = args.indexOf(flag)
  return idx !== -1 ? args[idx + 1] : null
}

const mode = getArg("--mode") ?? "testnet"

if (mode !== "testnet" && mode !== "mainnet") {
  console.error(`check-env: unknown --mode "${mode}". Expected "testnet" or "mainnet".`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Env file resolution
// ---------------------------------------------------------------------------

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, "..")

function resolveEnvFile() {
  if (getArg("--env-file")) {
    return path.resolve(frontendRoot, getArg("--env-file"))
  }
  // Prefer .env.local for testnet, .env.production for mainnet (both optional).
  const candidates =
    mode === "mainnet"
      ? [".env.production", ".env.local"]
      : [".env.local"]
  for (const name of candidates) {
    const p = path.join(frontendRoot, name)
    if (fs.existsSync(p)) return p
  }
  return null
}

/**
 * Parse a dotenv file into a flat key→value map.
 * Values are NOT unquoted; we just strip surrounding quotes for basic cases.
 */
function parseDotenv(filePath) {
  const vars = new Map()
  const raw = fs.readFileSync(filePath, "utf8")
  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIndex = trimmed.indexOf("=")
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let val = trimmed.slice(eqIndex + 1).trim()
    // Strip surrounding single or double quotes
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    vars.set(key, val)
  }
  return vars
}

// Build the vars map: file values take priority over process.env so that a
// CI pipeline can place vars in a file and have them validated consistently.
const envFilePath = resolveEnvFile()
const fileVars = envFilePath ? parseDotenv(envFilePath) : new Map()

function getVar(key) {
  return fileVars.get(key) ?? process.env[key] ?? ""
}

// ---------------------------------------------------------------------------
// Zod schemas — loaded via require so the script stays dependency-light
// ---------------------------------------------------------------------------

// zod is a regular dep so it's available after `pnpm install`
const require = createRequire(import.meta.url)

let z
try {
  ;({ z } = require("zod"))
} catch {
  // Zod v4 exports the object directly
  z = require("zod")
  if (z.z) z = z.z
}

// Stellar contract IDs: 56-character base32 C-prefixed string
const contractId = z
  .string()
  .regex(/^C[A-Z2-7]{55}$/, "must be a valid Stellar contract ID (56-char, starts with C)")

// Stellar account/contract address (G… or C…)
const stellarAddress = z
  .string()
  .regex(/^[GC][A-Z2-7]{55}$/, "must be a valid Stellar address (56-char, starts with G or C)")

const url = z.string().url("must be a valid URL")

// Shared required vars for every mode
const baseSchema = z.object({
  VITE_QUEST_CONTRACT_ID: contractId,
  VITE_MILESTONE_CONTRACT_ID: contractId,
  VITE_REWARDS_CONTRACT_ID: contractId,
  VITE_SOROBAN_RPC_URL: url,
  VITE_SOROBAN_NETWORK_PASSPHRASE: z.string().min(1, "must not be empty"),
  VITE_USDC_TOKEN_ADDRESS: stellarAddress,
})

// Mainnet adds stricter checks on top of the base schema
const mainnetSchema = baseSchema.extend({
  VITE_SOROBAN_RPC_URL: url.refine(
    (v) => !v.includes("testnet"),
    "mainnet RPC URL must not contain 'testnet'"
  ),
  VITE_SOROBAN_NETWORK_PASSPHRASE: z
    .string()
    .refine(
      (v) => v.toLowerCase().includes("public"),
      'mainnet passphrase must contain "Public" (e.g. "Public Global Stellar Network ; September 2015")'
    ),
  // Sentry strongly recommended in production
  VITE_SENTRY_DSN: z.string().min(1, "Sentry DSN is required for mainnet deployments"),
})

const schema = mode === "mainnet" ? mainnetSchema : baseSchema

// ---------------------------------------------------------------------------
// Validate
// ---------------------------------------------------------------------------

const envSource = envFilePath
  ? path.relative(frontendRoot, envFilePath)
  : "process environment"

console.log(`check-env: mode=${mode}, source=${envSource}`)

// Collect current values for every key the schema expects
const schemaKeys = Object.keys(schema.shape)
const input = Object.fromEntries(schemaKeys.map((k) => [k, getVar(k)]))

const result = schema.safeParse(input)

if (!result.success) {
  console.error("\nEnvironment check failed:\n")
  for (const issue of result.error.issues) {
    const key = issue.path.join(".")
    console.error(`  ${key}: ${issue.message}`)
  }

  if (!envFilePath && mode === "testnet") {
    console.error("\n  No .env.local found. Copy the example file and fill in the values:\n")
    console.error("    cp .env.example .env.local\n")
  } else if (!envFilePath && mode === "mainnet") {
    console.error(
      "\n  No env file found. Set vars in .env.production or export them before running.\n"
    )
  }

  process.exit(1)
}

console.log(`check-env: all required variables present and valid (${mode}).`)

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`
check-env.mjs — validate environment variables before build or dev

USAGE
  node scripts/check-env.mjs [options]

OPTIONS
  --mode testnet|mainnet   Validation profile (default: testnet)
  --env-file <path>        Path to an env file (relative to frontend/)
  --help, -h               Print this help and exit

ENV FILE RESOLUTION (automatic, no --env-file needed)
  testnet   reads .env.local
  mainnet   reads .env.production, then falls back to .env.local
  Any mode  falls back to process environment variables if no file is found

REQUIRED VARIABLES (both modes)
  VITE_QUEST_CONTRACT_ID           Stellar contract ID (56-char, C…)
  VITE_MILESTONE_CONTRACT_ID       Stellar contract ID (56-char, C…)
  VITE_REWARDS_CONTRACT_ID         Stellar contract ID (56-char, C…)
  VITE_SOROBAN_RPC_URL             Valid URL to a Soroban RPC endpoint
  VITE_SOROBAN_NETWORK_PASSPHRASE  Network passphrase string
  VITE_USDC_TOKEN_ADDRESS          Stellar address (56-char, G… or C…)

ADDITIONAL REQUIREMENTS (mainnet only)
  VITE_SOROBAN_RPC_URL             Must NOT contain "testnet"
  VITE_SOROBAN_NETWORK_PASSPHRASE  Must contain "Public"
  VITE_SENTRY_DSN                  Must be set (error tracking required)

EXAMPLES
  # Local dev (testnet)
  node scripts/check-env.mjs

  # CI mainnet deploy
  node scripts/check-env.mjs --mode mainnet

  # Point at a custom file
  node scripts/check-env.mjs --mode mainnet --env-file .env.staging
`)
}
