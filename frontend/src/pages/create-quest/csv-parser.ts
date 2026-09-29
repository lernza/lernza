import { MAX_MILESTONES } from "@/lib/contract-types"
import { milestoneSchema } from "./types"

/** A quest accepts at most this many milestones (#1617). */
export const MAX_MILESTONES_PER_QUEST = 50

export interface ParsedMilestone {
  title: string
  description: string
  rewardAmount: number
}

export interface CsvParseError {
  row: number
  field: string
  message: string
}

export interface CsvParseResult {
  milestones: ParsedMilestone[]
  errors: CsvParseError[]
}

/**
 * Split CSV line handling quoted fields properly
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

/**
 * Strictly parses a reward cell. Values are collected as whole USDC tokens, so
 * the cell is validated rather than coerced: stripping every non-numeric
 * character would silently turn "-10" into 10 and "1,000" into 1, both of which
 * pass validation as the wrong reward.
 */
function parseRewardAmount(raw: string): { value: number } | { error: string } {
  const trimmed = raw.trim()
  if (trimmed === "") {
    return { error: "Reward amount is required" }
  }
  if (trimmed.startsWith("-")) {
    return { error: "Reward amount cannot be negative" }
  }

  const cleaned = trimmed
    .replace(/^(usdc|usd|token)\s*/i, "")
    .replace(/\s*(usdc|usd|token)$/i, "")
    .replace(/^[$€£]+\s*/, "")
    .replace(/\s*[$€£]+$/, "")
    .replace(/[,\s_]/g, "")

  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    return { error: `"${trimmed}" is not a valid reward amount` }
  }

  const value = Number(cleaned)
  if (!Number.isFinite(value)) {
    return { error: `"${trimmed}" is not a valid reward amount` }
  }

  return { value }
}

/**
 * Parses raw CSV text into validated milestone objects and row errors
 */
export function parseCsvMilestones(csvText: string): CsvParseResult {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0)
  const errors: CsvParseError[] = []
  const milestones: ParsedMilestone[] = []

  if (lines.length === 0) {
    return {
      milestones: [],
      errors: [{ row: 0, field: "file", message: "CSV file is empty" }],
    }
  }

  // Parse header
  const headerCols = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""))
  let titleIdx = headerCols.findIndex(c => c.includes("title") || c.includes("name"))
  let descIdx = headerCols.findIndex(c => c.includes("description") || c.includes("desc"))
  let rewardIdx = headerCols.findIndex(
    c => c.includes("reward") || c.includes("amount") || c.includes("usdc")
  )

  // Fallback index positioning if header isn't named explicitly
  if (titleIdx === -1) titleIdx = 0
  if (descIdx === -1) descIdx = 1
  if (rewardIdx === -1) rewardIdx = 2

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1
    const cols = parseCsvLine(lines[i])

    // Skip empty lines
    if (cols.length === 0 || (cols.length === 1 && cols[0] === "")) continue

    const title = cols[titleIdx] || ""
    const description = cols[descIdx] || ""
    const rewardStr = cols[rewardIdx] || ""

    const parsedReward = parseRewardAmount(rewardStr)
    if ("error" in parsedReward) {
      errors.push({ row: rowNum, field: "rewardAmount", message: parsedReward.error })
      continue
    }
    const rewardAmount = parseFloat(rewardStr.replace(/[$,]/g, "").trim())

    const rawObj = {
      title,
      description,
      rewardAmount: parsedReward.value,
    }

    const valResult = milestoneSchema.safeParse(rawObj)

    if (valResult.success) {
      // The milestone contract rejects milestone ids >= MAX_MILESTONES, so the
      // cap is enforced at parse time rather than surfacing as an opaque
      // transaction failure on step 2.
      if (milestones.length >= MAX_MILESTONES) {
        errors.push({
          row: rowNum,
          field: "general",
          message: `Exceeded contract limit of ${MAX_MILESTONES} milestones per quest; row ignored`,
        })
      } else {
        milestones.push(valResult.data)
      }
      milestones.push({
        title: valResult.data.title,
        description: valResult.data.description,
        rewardAmount: valResult.data.rewardAmount,
      })
    } else {
      valResult.error.issues.forEach(issue => {
        errors.push({
          row: rowNum,
          field: String(issue.path[0] || "general"),
          message: issue.message,
        })
      })
    }
  }

  // Reject files that would push the quest past the on-chain milestone cap.
  if (milestones.length + errors.length > MAX_MILESTONES_PER_QUEST) {
    return {
      milestones: [],
      errors: [
        ...errors,
        {
          row: 0,
          field: "file",
          message: `A quest accepts at most ${MAX_MILESTONES_PER_QUEST} milestones.`
        }
      ]
    }
  }

  return { milestones, errors }
}

/**
 * Generates sample CSV template string
 */
export function generateCsvTemplate(): string {
  return [
    "milestone_title,description,reward_amount",
    "title,description,rewardAmount",
    '"Complete Environment Setup","Set up development tools and connect wallet",50',
    '"Hello Soroban","Write your first Soroban smart contract in Rust",100',
    '"Deploy to Testnet","Deploy smart contract to Stellar Testnet and execute tests",150',
  ].join("\n")
}

/**
 * Triggers a browser download of the sample CSV template
 */
export function downloadCsvTemplate(filename = "milestones_template.csv"): void {
  const blob = new Blob([generateCsvTemplate()], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
