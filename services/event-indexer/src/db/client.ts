import pg from "pg"
import { config } from "./config.js"

let pool: pg.Pool | null = null

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: config.databaseUrl })
  }
  return pool
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

export async function getCursor(contractId: string): Promise<number> {
  const result = await getPool().query<{ last_ledger: string }>(
    "SELECT last_ledger FROM indexer_cursors WHERE contract_id = $1",
    [contractId]
  )
  if (result.rows.length === 0) return config.startLedger ?? 0
  return Number(result.rows[0].last_ledger)
}

export async function setCursor(contractId: string, lastLedger: number): Promise<void> {
  await getPool().query(
    `INSERT INTO indexer_cursors (contract_id, last_ledger, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (contract_id) DO UPDATE
     SET last_ledger = EXCLUDED.last_ledger, updated_at = NOW()`,
    [contractId, lastLedger]
  )
}

export interface StoredEvent {
  contractId: string
  contractType: string
  eventName: string
  ledger: number
  txHash: string
  topic: unknown
  payload: unknown
}

export async function insertEvent(event: StoredEvent): Promise<boolean> {
  const result = await getPool().query(
    `INSERT INTO contract_events
       (contract_id, contract_type, event_name, ledger, tx_hash, topic, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (tx_hash, contract_id, event_name, ledger) DO NOTHING
     RETURNING id`,
    [
      event.contractId,
      event.contractType,
      event.eventName,
      event.ledger,
      event.txHash,
      JSON.stringify(event.topic),
      JSON.stringify(event.payload),
    ]
  )
  return result.rowCount !== null && result.rowCount > 0
}
