import { rpc } from "@stellar/stellar-sdk"
import type { ContractConfig } from "./config.js"
import { getCursor, insertEvent, setCursor } from "./db/client.js"
import { captureIndexerError } from "./sentry.js"

const PAGE_SIZE = 200

function extractEventName(topics: unknown[]): string | null {
  if (!topics.length) return null
  const first = topics[0]
  if (typeof first === "string") return first
  if (first && typeof first === "object" && "symbol" in (first as Record<string, unknown>)) {
    return String((first as { symbol: string }).symbol)
  }
  return String(first)
}

function scValToJson(val: unknown): unknown {
  if (val === null || val === undefined) return null
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") return val
  if (Array.isArray(val)) return val.map(scValToJson)
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>
    if ("symbol" in obj) return obj.symbol
    if ("address" in obj) return obj.address
    if ("u32" in obj) return obj.u32
    if ("i128" in obj) return obj.i128
    if ("string" in obj) return obj.string
    return obj
  }
  return String(val)
}

export class EventSubscriber {
  private server: rpc.Server

  constructor(rpcUrl: string) {
    this.server = new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") })
  }

  async pollContract(contract: ContractConfig): Promise<number> {
    let startLedger = await getCursor(contract.id)
    if (startLedger === 0) {
      const latest = await this.server.getLatestLedger()
      startLedger = Math.max(0, latest.sequence - 1000)
    }

    let cursor: string | undefined
    let maxLedger = startLedger
    let inserted = 0

    do {
      const response = await this.server.getEvents({
        startLedger: startLedger + 1,
        filters: [
          {
            type: "contract",
            contractIds: [contract.id],
          },
        ],
        limit: PAGE_SIZE,
        cursor,
      })

      for (const event of response.events) {
        const eventName = extractEventName(event.topic as unknown[])
        if (!eventName) continue
        if (!contract.topics.includes(eventName)) continue

        const stored = await insertEvent({
          contractId: contract.id,
          contractType: contract.type,
          eventName,
          ledger: event.ledger,
          txHash: event.txHash,
          topic: (event.topic as unknown[]).map(scValToJson),
          payload: scValToJson(event.value),
        })

        if (stored) inserted++
        if (event.ledger > maxLedger) maxLedger = event.ledger
      }

      cursor = response.cursor
      if (response.latestLedger > maxLedger) maxLedger = response.latestLedger
    } while (cursor)

    if (maxLedger > startLedger) {
      await setCursor(contract.id, maxLedger)
    }

    return inserted
  }

  async pollAll(contracts: ContractConfig[]): Promise<void> {
    for (const contract of contracts) {
      try {
        const count = await this.pollContract(contract)
        if (count > 0) {
          console.info(`[indexer] ${contract.type}: inserted ${count} events`)
        }
      } catch (error) {
        captureIndexerError(error, { contractId: contract.id, contractType: contract.type })
      }
    }
  }
}
