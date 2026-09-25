import { describe, it, expect } from "vitest"
import type { WalletActivityItem } from "./horizon-activity"
import {
  buildExportFilename,
  toCsv,
  toExportRows,
  toJson,
  serializeTransactions,
  TRANSACTION_EXPORT_VERSION,
} from "./transaction-export"

function makeItem(overrides: Partial<WalletActivityItem> = {}): WalletActivityItem {
  return {
    id: "op-1",
    type: "rewarded",
    questId: 7,
    questName: "Stellar Basics",
    timestamp: Date.parse("2026-01-15T10:30:00.000Z"),
    txHash: "abc123",
    href: "https://stellar.expert/explorer/testnet/tx/abc123",
    amount: 5_000_000n,
    ...overrides,
  }
}

describe("transaction export", () => {
  it("maps wallet activity onto export rows with an ISO date and string amount", () => {
    const [row] = toExportRows([makeItem()])

    expect(row).toEqual({
      date: "2026-01-15T10:30:00.000Z",
      type: "rewarded",
      questId: 7,
      questName: "Stellar Basics",
      amount: "5000000",
      txHash: "abc123",
      link: "https://stellar.expert/explorer/testnet/tx/abc123",
    })
  })

  it("emits a header row and one line per transaction", () => {
    const csv = toCsv(toExportRows([makeItem(), makeItem({ id: "op-2", type: "enrolled", amount: undefined })]))

    const lines = csv.trimEnd().split("\n")
    expect(lines[0]).toBe("Date,Type,Quest ID,Quest,Amount,Transaction Hash,Link")
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain("Rewarded")
    expect(lines[1]).toContain("7,Stellar Basics,5000000,abc123")
    // No amount on a non-reward row leaves the column empty, not "undefined".
    expect(lines[2]).toContain("Enrolled")
    expect(lines[2]).toContain(",Stellar Basics,,abc123")
    expect(csv.endsWith("\n")).toBe(true)
  })

  it("quotes CSV fields containing commas, quotes, or newlines", () => {
    const csv = toCsv(
      toExportRows([makeItem({ questName: 'Rust, "advanced"\npart 2', questId: null })])
    )

    expect(csv).toContain('"Rust, ""advanced""\npart 2"')
    // A quest with no ID leaves the column empty.
    expect(csv).toContain(",,Rewarded,")
  })

  it("builds a JSON document with provenance metadata", () => {
    const doc = toJson(toExportRows([makeItem()]), {
      wallet: "GABC",
      filter: "rewarded",
      truncated: true,
      exportedAt: "2026-02-01T00:00:00.000Z",
    })

    expect(doc.version).toBe(TRANSACTION_EXPORT_VERSION)
    expect(doc.exportedAt).toBe("2026-02-01T00:00:00.000Z")
    expect(doc.wallet).toBe("GABC")
    expect(doc.filter).toBe("rewarded")
    expect(doc.truncated).toBe(true)
    expect(doc.total).toBe(1)
    expect(doc.transactions[0].txHash).toBe("abc123")
  })

  it("defaults filter and truncation metadata", () => {
    const doc = toJson([], { wallet: "GABC" })

    expect(doc.filter).toBe("all")
    expect(doc.truncated).toBe(false)
    expect(doc.total).toBe(0)
    expect(Date.parse(doc.exportedAt)).not.toBeNaN()
  })

  it("serializes to the requested format", () => {
    const rows = toExportRows([makeItem()])
    const meta = { wallet: "GABC" }

    expect(serializeTransactions(rows, "csv", meta).startsWith("Date,Type")).toBe(true)
    expect(JSON.parse(serializeTransactions(rows, "json", meta)).total).toBe(1)
  })

  it("derives a dated filename per format", () => {
    const date = new Date("2026-01-31T12:00:00.000Z")
    expect(buildExportFilename("csv", date)).toBe("lernza-transactions-2026-01-31.csv")
    expect(buildExportFilename("json", date)).toBe("lernza-transactions-2026-01-31.json")
  })
})
