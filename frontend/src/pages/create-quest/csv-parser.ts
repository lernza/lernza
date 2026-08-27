import { milestoneSchema } from "./types"

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
    const rewardAmount = parseFloat(rewardStr.replace(/[$,]/g, "").trim())

    const rawObj = {
      title,
      description,
      rewardAmount: isNaN(rewardAmount) ? 0 : rewardAmount,
    }

    const valResult = milestoneSchema.safeParse(rawObj)

    if (valResult.success) {
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

  return { milestones, errors }
}

/**
 * Generates sample CSV template string
 */
export function generateCsvTemplate(): string {
  return [
    'title,description,rewardAmount',
    '"Complete Environment Setup","Set up development tools and connect wallet",50',
    '"Hello Soroban","Write your first Soroban smart contract in Rust",100',
    '"Deploy to Testnet","Deploy smart contract to Stellar Testnet and execute tests",150',
  ].join("\n")
}
