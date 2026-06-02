const HORIZON_MAINNET = "https://horizon.stellar.org"
const HORIZON_TESTNET = "https://horizon-testnet.stellar.org"

export interface HorizonOperation {
  id: string
  type: string
  type_i: number
  source_account: string
  transaction_hash: string
  [key: string]: unknown
}

export interface HorizonTransactionMeta {
  hash: string
  ledger: number
  created_at: string
  fee_charged: string
  successful: boolean
  operation_count: number
  result_xdr: string
  result_meta_xdr: string
  operations?: HorizonOperation[]
}

function horizonUrl(): string {
  const rpcUrl = import.meta.env.VITE_SOROBAN_RPC_URL ?? ""
  return rpcUrl.includes("mainnet") ? HORIZON_MAINNET : HORIZON_TESTNET
}

/**
 * After pollTransaction returns SUCCESS, confirm finality via Horizon and
 * surface the on-chain meta. Logs to console in dev; safe to wire to Sentry.
 */
export async function trackTransaction(txHash: string): Promise<HorizonTransactionMeta | null> {
  const base = horizonUrl()
  try {
    const [txRes, opsRes] = await Promise.all([
      fetch(`${base}/transactions/${txHash}`),
      fetch(`${base}/transactions/${txHash}/operations`),
    ])

    if (!txRes.ok) {
      if (import.meta.env.DEV) {
        console.warn(`[TxTracker] Horizon returned ${txRes.status} for ${txHash}`)
      }
      return null
    }

    const tx = (await txRes.json()) as Record<string, unknown>
    let operations: HorizonOperation[] | undefined

    if (opsRes.ok) {
      const opsBody = (await opsRes.json()) as { _embedded?: { records?: HorizonOperation[] } }
      operations = opsBody._embedded?.records
    }

    const meta: HorizonTransactionMeta = {
      hash: tx.hash as string,
      ledger: tx.ledger as number,
      created_at: tx.created_at as string,
      fee_charged: tx.fee_charged as string,
      successful: tx.successful as boolean,
      operation_count: tx.operation_count as number,
      result_xdr: tx.result_xdr as string,
      result_meta_xdr: tx.result_meta_xdr as string,
      operations,
    }

    if (import.meta.env.DEV) {
      console.group(`[TxTracker] On-chain meta — ${txHash.slice(0, 8)}…`)
      console.log("ledger:", meta.ledger, "| created_at:", meta.created_at)
      console.log("fee_charged:", meta.fee_charged, "| successful:", meta.successful)
      console.log("operations:", operations)
      console.log("result_meta_xdr:", meta.result_meta_xdr)
      console.groupEnd()
    }

    return meta
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[TxTracker] Horizon lookup failed:", err)
    }
    return null
  }
}
