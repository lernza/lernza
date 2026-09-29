import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { TransactionBuilder, Account, Transaction, Operation, Asset } from "@stellar/stellar-sdk"

const TEST_SOURCE = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"

const mocks = vi.hoisted(() => ({
  sendTransaction: vi.fn(),
  getTransaction: vi.fn(),
  getNetworkDetails: vi.fn(),
  signTransaction: vi.fn(),
  getAddress: vi.fn(),
  pushToast: vi.fn(),
}))

vi.mock("@stellar/stellar-sdk/rpc", () => ({
  Server: class MockRpcServer {
    sendTransaction(...args: unknown[]) {
      return mocks.sendTransaction(...args)
    }
    getTransaction(...args: unknown[]) {
      return mocks.getTransaction(...args)
    }
  },
}))

vi.mock("@stellar/freighter-api", () => ({
  // The wallet adapter imports the default export, not just the named ones.
  default: { requestAccess: vi.fn() },
  getNetworkDetails: (...args: unknown[]) => mocks.getNetworkDetails(...args),
  signTransaction: (...args: unknown[]) => mocks.signTransaction(...args),
  getAddress: (...args: unknown[]) => mocks.getAddress(...args),
}))

vi.mock("@/lib/notifications", () => ({
  pushToast: (...args: unknown[]) => mocks.pushToast(...args),
}))

import { signAndSubmit, reconcilePendingTransactions, NETWORK_PASSPHRASE, NETWORK_MISMATCH_MESSAGE } from "./client"
import {
  addPendingTransaction,
  getPendingTransactions,
  clearPendingTransactions,
} from "@/lib/pending-transactions"

function buildTx(): Transaction {
  return new TransactionBuilder(new Account(TEST_SOURCE, "1"), {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: TEST_SOURCE,
        asset: Asset.native(),
        amount: "0.0000001",
      })
    )
    .setTimeout(30)
    .build()
}

describe("signAndSubmit", () => {
  let signedTx: Transaction

  beforeEach(() => {
    vi.clearAllMocks()
    signedTx = buildTx()
    mocks.getNetworkDetails.mockResolvedValue({ networkPassphrase: NETWORK_PASSPHRASE })
    mocks.getAddress.mockResolvedValue({ address: signedTx.source })
    mocks.signTransaction.mockResolvedValue({ signedTxXdr: signedTx.toXDR() })
    mocks.getTransaction.mockResolvedValue({ status: "SUCCESS", returnValue: undefined })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("refuses to submit when Freighter network changes after signing", async () => {
    mocks.getNetworkDetails
      .mockResolvedValueOnce({ networkPassphrase: NETWORK_PASSPHRASE })
      .mockResolvedValueOnce({
        networkPassphrase: "Public Global Stellar Network ; September 2015",
      })

    const onError = vi.fn()
    const result = await signAndSubmit(signedTx, { onError })

    expect(result.status).toBe("FAILED")
    expect(result.error).toBe(NETWORK_MISMATCH_MESSAGE)
    expect(mocks.sendTransaction).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(NETWORK_MISMATCH_MESSAGE)
  })

  it("retries TRY_AGAIN_LATER before surfacing failure", async () => {
    vi.useFakeTimers()
    mocks.sendTransaction
      .mockResolvedValueOnce({ status: "TRY_AGAIN_LATER", hash: "hash-1" })
      .mockResolvedValueOnce({ status: "TRY_AGAIN_LATER", hash: "hash-1" })
      .mockResolvedValueOnce({ status: "PENDING", hash: "hash-1" })

    const promise = signAndSubmit(signedTx)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(mocks.sendTransaction).toHaveBeenCalledTimes(3)
    expect(result.status).toBe("SUCCESS")
    expect(result.txHash).toBe("hash-1")
  })
})

describe("reconcilePendingTransactions", () => {
  const PENDING_EXPIRY_MS = 10 * 60 * 1000
  const stale = Date.now() - PENDING_EXPIRY_MS - 1000

  beforeEach(() => {
    vi.clearAllMocks()
    clearPendingTransactions()
    mocks.getTransaction.mockResolvedValue({ status: "NOT_FOUND", returnValue: undefined })
  })

  afterEach(() => {
    clearPendingTransactions()
  })

  it("cleans up transactions the network never saw once they expire", async () => {
    addPendingTransaction({ txHash: "missing-1", label: "Fund quest", submittedAt: stale })

    await reconcilePendingTransactions()

    expect(getPendingTransactions()).toEqual([])
    expect(mocks.pushToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Fund quest: transaction expired before confirmation. Please try again.",
        type: "warning",
      })
    )
  })

  it("matches NOT_FOUND regardless of the casing the RPC returns", async () => {
    mocks.getTransaction.mockResolvedValue({ status: "not_found", returnValue: undefined })
    addPendingTransaction({ txHash: "missing-2", label: "Join quest", submittedAt: stale })

    await reconcilePendingTransactions()

    expect(getPendingTransactions()).toEqual([])
  })

  it("keeps a recently submitted not-found transaction for the next pass", async () => {
    addPendingTransaction({ txHash: "fresh-1", label: "Submit work", submittedAt: Date.now() })

    await reconcilePendingTransactions()

    expect(getPendingTransactions()).toHaveLength(1)
    expect(mocks.pushToast).not.toHaveBeenCalled()
  })

  it("removes confirmed and failed transactions", async () => {
    mocks.getTransaction
      .mockResolvedValueOnce({ status: "SUCCESS", returnValue: undefined })
      .mockResolvedValueOnce({ status: "FAILED", returnValue: undefined })
    addPendingTransaction({ txHash: "ok-1", label: "Create quest", submittedAt: Date.now() })
    addPendingTransaction({ txHash: "bad-1", label: "Claim reward", submittedAt: Date.now() })

    await reconcilePendingTransactions()

    expect(getPendingTransactions()).toEqual([])
  })

  it("keeps the record when the RPC check itself throws", async () => {
    mocks.getTransaction.mockRejectedValue(new Error("rpc down"))
    addPendingTransaction({ txHash: "unreachable-1", label: "Fund quest", submittedAt: stale })

    await reconcilePendingTransactions()

    expect(getPendingTransactions()).toHaveLength(1)
    expect(mocks.pushToast).not.toHaveBeenCalled()
  })
})
