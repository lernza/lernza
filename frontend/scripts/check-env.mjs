import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, "..")
const envLocalPath = path.join(frontendRoot, ".env.local")

const REQUIRED_VARS = [
  "VITE_QUEST_CONTRACT_ID",
  "VITE_MILESTONE_CONTRACT_ID",
  "VITE_REWARDS_CONTRACT_ID",
  "VITE_SOROBAN_RPC_URL",
  "VITE_SOROBAN_NETWORK_PASSPHRASE",
  "VITE_USDC_TOKEN_ADDRESS",
]

if (!fs.existsSync(envLocalPath)) {
  console.error("Environment check failed:\n")
  console.error("  .env.local not found.")
  console.error("\n  Copy the example file to get started:\n")
  console.error("    cp .env.example .env.local\n")
  process.exit(1)
}

const raw = fs.readFileSync(envLocalPath, "utf8")
const vars = new Map()
for (const line of raw.split("\n")) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) continue
  const eqIndex = trimmed.indexOf("=")
  if (eqIndex === -1) continue
  vars.set(trimmed.slice(0, eqIndex).trim(), trimmed.slice(eqIndex + 1).trim())
}

const missing = REQUIRED_VARS.filter((v) => !vars.get(v))
if (missing.length > 0) {
  console.error("Environment check failed:\n")
  console.error("  The following required variables are missing or empty in .env.local:\n")
  for (const v of missing) console.error(`    - ${v}`)
  console.error("\n  Copy the example file and fill in the values:\n")
  console.error("    cp .env.example .env.local\n")
  process.exit(1)
}

console.log("Environment check passed.")
