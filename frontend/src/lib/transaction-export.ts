/**
 * Transaction history export (CSV / JSON) — Issue #1632.
 *
 * Turns the wallet activity feed rendered by the History page into a
 * spreadsheet-friendly CSV or a machine-readable JSON document the learner
 * can keep (for their own records, tax bookkeeping, or an accounting tool).
 * Serialization is kept free of DOM access so it can be unit-tested; the
 * browser download is a thin wrapper on top of it.
 */
import type { WalletActivityItem, WalletActivityType } from "./horizon-activity"

export type TransactionExportFormat = "csv" | "json"

/** Current schema version stamped into JSON exports. */
export const TRANSACTION_EXPORT_VERSION = "1.0.0"

export interface TransactionExportRow {
  /** ISO-8601 UTC timestamp of the on-chain operation. */
  date: string
  type: WalletActivityType
  questId: number | null
  questName: string
  /** Raw token amount in base units, as a string (bigint-safe). */
  amount: string | null
  txHash: string
  /** Explorer deep link for the transaction. */
  link: string
}

export interface TransactionExportMeta {
  /** Wallet the activity was fetched for. */
  wallet: string
  /** Active filter on the History page at export time, if any. */
  filter?: WalletActivityType | "all"
  /** Whether the feed was truncated by the history safety cap. */
  truncated?: boolean
  /** Export timestamp; defaults to now. */
  exportedAt?: string
}

const CSV_COLUMNS = ["Date", "Type", "Quest ID", "Quest", "Amount", "Transaction Hash", "Link"] as const

/** Human-readable labels for the activity types, shared by both formats. */
const TYPE_LABELS: Record<WalletActivityType, string> = {
  enrolled: "Enrolled",
  completed: "Completed",
  rewarded: "Rewarded",
  left: "Left",
}

/** Map a wallet activity item onto the export shape. */
export function toExportRow(item: WalletActivityItem): TransactionExportRow {
  return {
    date: new Date(item.timestamp).toISOString(),
    type: item.type,
    questId: item.questId,
    questName: item.questName,
    amount: item.amount === undefined ? null : item.amount.toString(),
    txHash: item.txHash,
    link: item.href,
  }
}

export function toExportRows(items: WalletActivityItem[]): TransactionExportRow[] {
  return items.map(toExportRow)
}

/**
 * Quote a CSV field per RFC 4180 — wrap in double quotes and double any
 * embedded quote when the value contains a delimiter, quote, or newline.
 * Without this a quest named `Rust, part 1` would shift every later column.
 */
function escapeCsvField(value: string): string {
  if (!/[",\r\n]/.test(value)) {
    return value
  }
  return `"${value.replace(/"/g, '""')}"`
}

function toCsvLine(fields: string[]): string {
  return fields.map(escapeCsvField).join(",")
}

/** Serialize transactions as CSV, newest rows first as the feed returned them. */
export function toCsv(rows: TransactionExportRow[]): string {
  const lines = [toCsvLine([...CSV_COLUMNS])]
  for (const row of rows) {
    lines.push(
      toCsvLine([
        row.date,
        TYPE_LABELS[row.type],
        row.questId === null ? "" : String(row.questId),
        row.questName,
        row.amount ?? "",
        row.txHash,
        row.link,
      ])
    )
  }
  // Trailing newline keeps POSIX-friendly diffing and `wc -l` behaviour.
  return `${lines.join("\n")}\n`
}

export interface TransactionHistoryExport {
  version: string
  exportedAt: string
  wallet: string
  filter: WalletActivityType | "all"
  truncated: boolean
  total: number
  transactions: TransactionExportRow[]
}

/** Build the JSON export document, stamping provenance metadata up front. */
export function toJson(rows: TransactionExportRow[], meta: TransactionExportMeta): TransactionHistoryExport {
  return {
    version: TRANSACTION_EXPORT_VERSION,
    exportedAt: meta.exportedAt ?? new Date().toISOString(),
    wallet: meta.wallet,
    filter: meta.filter ?? "all",
    truncated: meta.truncated ?? false,
    total: rows.length,
    transactions: rows,
  }
}

export function serializeTransactions(
  rows: TransactionExportRow[],
  format: TransactionExportFormat,
  meta: TransactionExportMeta
): string {
  return format === "csv" ? toCsv(rows) : `${JSON.stringify(toJson(rows, meta), null, 2)}\n`
}

/** `lernza-transactions-2026-01-31.csv` */
export function buildExportFilename(format: TransactionExportFormat, date: Date = new Date()): string {
  return `lernza-transactions-${date.toISOString().slice(0, 10)}.${format}`
}

/**
 * Serialize the items and hand the result to the browser as a download.
 * Returns the serialized payload so callers can report what was exported.
 */
export function downloadTransactionHistory(
  items: WalletActivityItem[],
  format: TransactionExportFormat,
  meta: TransactionExportMeta
): string {
  const content = serializeTransactions(toExportRows(items), format, meta)
  const mimeType = format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8"

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = buildExportFilename(format)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return content
}
