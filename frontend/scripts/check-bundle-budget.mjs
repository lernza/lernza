import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, "..")
const distDir = path.join(frontendRoot, "dist")
const budgetPath = path.join(frontendRoot, "budget.json")

// Single JS chunk hard cap, independent of the aggregate script budget below.
// Keeps one runaway chunk (e.g. an un-code-split vendor import) from hiding
// inside an otherwise-healthy total. Slightly above Vite's chunkSizeWarningLimit
// (244 KB, see vite.config.ts) so a plain warning there fails the build here.
const PER_CHUNK_SCRIPT_BUDGET_KB = 300

const EXTENSION_TO_RESOURCE_TYPE = {
  ".js": "script",
  ".mjs": "script",
  ".cjs": "script",
  ".css": "stylesheet",
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".gif": "image",
  ".svg": "image",
  ".webp": "image",
  ".avif": "image",
  ".woff": "font",
  ".woff2": "font",
  ".eot": "font",
  ".ttf": "font",
  ".otf": "font",
}

function readBudget() {
  const raw = JSON.parse(fs.readFileSync(budgetPath, "utf8"))
  const budget = raw.performance?.budgets?.[0]
  if (!budget) {
    throw new Error(`Could not find performance.budgets[0] in ${budgetPath}`)
  }

  const sizeBudgetsKb = {}
  for (const entry of budget.resourceSizes ?? []) {
    sizeBudgetsKb[entry.resourceType] = entry.budget
  }

  return sizeBudgetsKb
}

function walkFiles(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkFiles(absolutePath))
    } else if (entry.isFile()) {
      results.push(absolutePath)
    }
  }
  return results
}

function formatKb(bytes) {
  return (bytes / 1024).toFixed(1)
}

if (!fs.existsSync(distDir)) {
  console.error(`Build output not found at ${distDir}. Run "pnpm run build" first.`)
  process.exit(1)
}

const sizeBudgetsKb = readBudget()
const files = walkFiles(distDir)

const totalsByResourceType = {}
let totalBytes = 0
const oversizedChunks = []

for (const absolutePath of files) {
  const size = fs.statSync(absolutePath).size
  totalBytes += size

  const ext = path.extname(absolutePath).toLowerCase()
  const resourceType = EXTENSION_TO_RESOURCE_TYPE[ext]
  if (resourceType) {
    totalsByResourceType[resourceType] = (totalsByResourceType[resourceType] ?? 0) + size
  }

  if (resourceType === "script" && size / 1024 > PER_CHUNK_SCRIPT_BUDGET_KB) {
    oversizedChunks.push({ file: path.relative(distDir, absolutePath), sizeKb: size / 1024 })
  }
}

const failures = []
const rows = [{ resourceType: "total", actualKb: totalBytes / 1024, budgetKb: sizeBudgetsKb.total }]
for (const resourceType of ["script", "stylesheet", "image", "font"]) {
  rows.push({
    resourceType,
    actualKb: (totalsByResourceType[resourceType] ?? 0) / 1024,
    budgetKb: sizeBudgetsKb[resourceType],
  })
}

console.log("=== Frontend Bundle Budget Report ===")
console.log(`Source of truth: ${path.relative(frontendRoot, budgetPath)}\n`)

for (const row of rows) {
  const budgetKb = row.budgetKb
  const exceeded = typeof budgetKb === "number" && row.actualKb > budgetKb
  if (exceeded) failures.push(row)
  const status = budgetKb == null ? "  -  " : exceeded ? "FAIL " : "OK   "
  const budgetLabel = budgetKb == null ? "n/a" : `${budgetKb} KB`
  console.log(`${status}${row.resourceType.padEnd(12)} ${row.actualKb.toFixed(1).padStart(9)} KB / ${budgetLabel}`)
}

if (oversizedChunks.length > 0) {
  console.log(`\nOversized JS chunks (> ${PER_CHUNK_SCRIPT_BUDGET_KB} KB each):`)
  for (const chunk of oversizedChunks) {
    console.log(`FAIL ${chunk.file}: ${chunk.sizeKb.toFixed(1)} KB`)
  }
}

console.log("")

if (process.env.GITHUB_OUTPUT) {
  const totalRow = rows.find((r) => r.resourceType === "total")
  const scriptRow = rows.find((r) => r.resourceType === "script")
  const lines = [
    `total_kb=${totalRow.actualKb.toFixed(1)}`,
    `script_kb=${scriptRow.actualKb.toFixed(1)}`,
    `passed=${failures.length === 0 && oversizedChunks.length === 0}`,
  ]
  fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join("\n") + "\n")
}

if (failures.length > 0 || oversizedChunks.length > 0) {
  console.error("Bundle budget check failed. See FAIL rows above.")
  console.error(`Budgets are defined in ${path.relative(frontendRoot, budgetPath)} — update them deliberately if the growth is expected.`)
  process.exit(1)
}

console.log("Bundle budget check passed.")
