import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  TransactionBuilder,
  Account,
  Transaction,
  Operation,
  Asset,
} from "@stellar/stellar-sdk/minimal"

const TEST_SOURCE = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"

const mocks = vi.hoisted(() => ({
  sendTransaction: vi.fn(),
  getTransaction: vi.fn(),
  getNetworkDetails: vi.fn(),
  signTransaction: vi.fn(),
  getAddress: vi.fn(),
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
  getNetworkDetails: (...args: unknown[]) => mocks.getNetworkDetails(...args),
  signTransaction: (...args: unknown[]) => mocks.signTransaction(...args),
  getAddress: (...args: unknown[]) => mocks.getAddress(...args),
}))

import { signAndSubmit, NETWORK_PASSPHRASE, NETWORK_MISMATCH_MESSAGE } from "./client"

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
