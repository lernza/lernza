import { scValToNative, xdr } from "@stellar/stellar-sdk"
import { NETWORK_PASSPHRASE } from "@/lib/contracts/client"
import { questClient } from "@/lib/contracts/quest"

const DEFAULT_HORIZON_URL = "https://horizon-testnet.stellar.org"
const PAGE_SIZE = 10

export type WalletActivityType = "enrolled" | "completed" | "rewarded" | "left"

export interface WalletActivityItem {
  id: string
  type: WalletActivityType
  questId: number | null
  questName: string
  timestamp: number
  txHash: string
  href: string
  amount?: bigint
}

export interface WalletActivityPage {
  items: WalletActivityItem[]
  nextCursor: string | null
}

interface HorizonResponse<T> {
  _embedded?: {
    records?: T[]
  }
  _links?: {
    next?: {
      href?: string
    }
  }
}

interface HorizonOperationRecord {
  id?: string
  paging_token?: string
  type?: string
  transaction_hash?: string
  created_at?: string
  function?: string
  function_name?: string
  parameters?: unknown[]
}

function getHorizonBaseUrl(): string {
  return import.meta.env.VITE_HORIZON_URL || DEFAULT_HORIZON_URL
}

function getExplorerBaseUrl(): string {
  return NETWORK_PASSPHRASE.toLowerCase().includes("public")
    ? "https://stellar.expert/explorer/public/tx/"
    : "https://stellar.expert/explorer/testnet/tx/"
}

function normalizeParameter(parameter: unknown): string | null {
  if (typeof parameter === "string") return parameter
  if (!parameter || typeof parameter !== "object") return null

  const record = parameter as Record<string, unknown>
  const candidates = ["xdr", "value", "value_xdr", "parameter", "parameter_xdr"]
  for (const key of candidates) {
    const candidate = record[key]
    if (typeof candidate === "string") {
      return candidate
    }
  }

  return null
}

function decodeScVal(parameter: unknown): unknown {
  const encoded = normalizeParameter(parameter)
  if (!encoded) return null

  try {
    return scValToNative(xdr.ScVal.fromXDR(encoded, "base64"))
  } catch {
    return null
  }
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "bigint") return Number(value)
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function toBigInt(value: unknown): bigint | undefined {
  if (typeof value === "bigint") return value
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value))
  if (typeof value === "string" && value.length > 0) {
    try {
      return BigInt(value)
    } catch {
      return undefined
    }
  }
  return undefined
}

function buildOperationsUrl(address: string, cursor?: string | null): string {
  if (cursor) return cursor

  const url = new URL(`/accounts/${address}/operations`, getHorizonBaseUrl())
  url.searchParams.set("order", "desc")
  url.searchParams.set("limit", String(PAGE_SIZE))
  url.searchParams.set("include_failed", "false")
  return url.toString()
}

function extractDecodedParameters(record: HorizonOperationRecord): unknown[] {
  return Array.isArray(record.parameters) ? record.parameters.map(decodeScVal) : []
}

function extractFunctionName(record: HorizonOperationRecord, decoded: unknown[]): string | null {
  if (typeof record.function_name === "string") return record.function_name
  if (typeof record.function === "string") return record.function

  if (typeof decoded[1] === "string") return decoded[1]
  if (typeof decoded[0] === "string") return decoded[0]
  return null
}

function extractFunctionArgs(decoded: unknown[], functionName: string | null): unknown[] {
  if (!functionName) return []
  if (decoded[1] === functionName) return decoded.slice(2)
  if (decoded[0] === functionName) return decoded.slice(1)
  return decoded
}

async function resolveQuestNames(questIds: number[]): Promise<Map<number, string>> {
  const uniqueIds = Array.from(new Set(questIds.filter(id => Number.isInteger(id) && id >= 0)))
  const quests = await Promise.all(uniqueIds.map(id => questClient.getQuest(id)))
  return new Map(uniqueIds.map((id, index) => [id, quests[index]?.name || `Quest #${id}`]))
}

function parseActivityRecord(
  record: HorizonOperationRecord,
  walletAddress: string,
  questNames: Map<number, string>
): WalletActivityItem | null {
  if (record.type !== "invoke_host_function") return null

  const decodedParameters = extractDecodedParameters(record)
  const functionName = extractFunctionName(record, decodedParameters)
  const args = extractFunctionArgs(decodedParameters, functionName)
  const createdAt = record.created_at ? Date.parse(record.created_at) : NaN
  const txHash = record.transaction_hash

  if (!functionName || !Number.isFinite(createdAt) || !txHash) {
    return null
  }

  const buildItem = (
    type: WalletActivityType,
    questId: number | null,
    amount?: bigint
  ): WalletActivityItem => ({
    id: record.id || record.paging_token || `${txHash}-${functionName}`,
    type,
    questId,
    questName: questId != null ? (questNames.get(questId) ?? `Quest #${questId}`) : "Unknown quest",
    timestamp: createdAt,
    txHash,
    href: `${getExplorerBaseUrl()}${txHash}`,
    amount,
  })

  if ((functionName === "join_quest" || functionName === "leave_quest") && args.length >= 2) {
    const enrollee = typeof args[0] === "string" ? args[0] : null
    const questId = toNumber(args[1])
    if (enrollee === walletAddress && questId != null) {
      return buildItem(functionName === "join_quest" ? "enrolled" : "left", questId)
    }
  }

  if (functionName === "verify_completion" && args.length >= 4) {
    const questId = toNumber(args[1])
    const enrollee = typeof args[3] === "string" ? args[3] : null
    if (enrollee === walletAddress && questId != null) {
      return buildItem("completed", questId)
    }
  }

  if (functionName === "distribute_reward" && args.length >= 5) {
    const questId = toNumber(args[1])
    const enrollee = typeof args[3] === "string" ? args[3] : null
    const amount = toBigInt(args[4])
    if (enrollee === walletAddress && questId != null) {
      return buildItem("rewarded", questId, amount)
    }
  }

  return null
}

export async function fetchWalletActivity(
  address: string,
  cursor?: string | null
): Promise<WalletActivityPage> {
  const response = await fetch(buildOperationsUrl(address, cursor))
  if (!response.ok) {
    throw new Error(`Failed to load wallet activity (${response.status})`)
  }

  const payload = (await response.json()) as HorizonResponse<HorizonOperationRecord>
  const records = payload._embedded?.records ?? []

  const decodedParameters = records.map(record => extractDecodedParameters(record))
  const questIds = decodedParameters
    .map((decoded, index) => {
      const functionName = extractFunctionName(records[index], decoded)
      const args = extractFunctionArgs(decoded, functionName)

      if (functionName === "join_quest" || functionName === "leave_quest") {
        return toNumber(args[1])
      }
      if (functionName === "verify_completion" || functionName === "distribute_reward") {
        return toNumber(args[1])
      }
      return null
    })
    .filter((questId): questId is number => questId != null)

  const questNames = await resolveQuestNames(questIds)
  const items = records
    .map(record => parseActivityRecord(record, address, questNames))
    .filter((item): item is WalletActivityItem => item !== null)

  return {
    items,
    nextCursor: payload._links?.next?.href ?? null,
  }
}
