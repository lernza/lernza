import { rpc } from "@stellar/stellar-sdk/rpc"
import { Transaction } from "@stellar/stellar-sdk/minimal"
import { signTransaction, getNetworkDetails, getPublicKey } from "@stellar/freighter-api"
import { env } from "../env"
import { pushToast } from "../notifications"

export const SOROBAN_RPC_URL =
  import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org"
export const NETWORK_PASSPHRASE =
  import.meta.env.VITE_SOROBAN_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015"

// Determine timeout based on network (testnet: 15s, mainnet: 8s)
const isMainnet = SOROBAN_RPC_URL.includes("mainnet")
export const RPC_TIMEOUT_MS = isMainnet ? 8000 : 15000

export const server = new rpc.Server(SOROBAN_RPC_URL)

const DEFAULT_RPC_READ_RATE_LIMIT_CAPACITY = 24
const DEFAULT_RPC_READ_RATE_LIMIT_REFILL_PER_SECOND = 12
const RPC_THROTTLE_TOAST_COOLDOWN_MS = 30_000

interface RpcReadBucket {
  tokens: number
  lastRefillMs: number
  lastToastMs: number
}

function getRpcReadRateLimitConfig() {
  return {
    capacity: env.VITE_RPC_READ_RATE_LIMIT_CAPACITY ?? DEFAULT_RPC_READ_RATE_LIMIT_CAPACITY,
    refillPerSecond:
      env.VITE_RPC_READ_RATE_LIMIT_REFILL_PER_SECOND ??
      DEFAULT_RPC_READ_RATE_LIMIT_REFILL_PER_SECOND,
  }
}

const rpcReadBucket: RpcReadBucket = {
  tokens: getRpcReadRateLimitConfig().capacity,
  lastRefillMs: Date.now(),
  lastToastMs: 0,
}

function refillRpcReadTokens(nowMs: number) {
  const { capacity, refillPerSecond } = getRpcReadRateLimitConfig()
  const elapsedSeconds = Math.max(0, (nowMs - rpcReadBucket.lastRefillMs) / 1000)

  if (elapsedSeconds > 0) {
    rpcReadBucket.tokens = Math.min(
      capacity,
      rpcReadBucket.tokens + elapsedSeconds * refillPerSecond
    )
    rpcReadBucket.lastRefillMs = nowMs
  }
}

function getRpcReadWaitMs(): number {
  const nowMs = Date.now()
  refillRpcReadTokens(nowMs)

  if (rpcReadBucket.tokens >= 1) {
    rpcReadBucket.tokens -= 1
    return 0
  }

  const { refillPerSecond } = getRpcReadRateLimitConfig()
  if (refillPerSecond <= 0) return 0

  const missingTokens = 1 - rpcReadBucket.tokens
  return Math.ceil((missingTokens / refillPerSecond) * 1000)
}

function notifyRpcReadThrottle(operation: string, waitMs: number) {
  const nowMs = Date.now()
  if (nowMs - rpcReadBucket.lastToastMs < RPC_THROTTLE_TOAST_COOLDOWN_MS) return

  rpcReadBucket.lastToastMs = nowMs
  pushToast({
    message: `RPC reads are busy. Waiting about ${Math.ceil(waitMs / 1000)}s before ${operation}.`,
    type: "info",
    duration: 4500,
  })
}

export async function withRpcReadThrottle<T>(
  operation: string,
  action: () => Promise<T>
): Promise<T> {
  const waitMs = getRpcReadWaitMs()
  if (waitMs > 0) {
    notifyRpcReadThrottle(operation, waitMs)
    await new Promise(resolve => setTimeout(resolve, waitMs))
  }

  return action()
}

/**
 * Wraps a promise with a timeout. Rejects if the promise doesn't resolve within the timeout.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = "Request timed out"
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        controller.signal.addEventListener("abort", () => {
          reject(new Error(timeoutMessage))
        })
      ),
    ])
  } finally {
    clearTimeout(timeoutId)
  }
}

export interface TransactionResult {
  status: "SUCCESS" | "FAILED" | "PENDING"
  txHash: string
  resultXdr?: string
  error?: string
  horizonMeta?: HorizonTransactionMeta
}

export interface TransactionLifecycleHandlers {
  onSubmitted?: (txHash: string) => void
  /** Called for user-visible failures (e.g. network mismatch). Wire to a toast in the UI. */
  onError?: (message: string) => void
}

export const NETWORK_MISMATCH_MESSAGE =
  "Freighter network changed after signing. Switch back to the app network before submitting."

const MAX_SUBMIT_ATTEMPTS = 5
const SUBMIT_BACKOFF_MS = 500

function getExpectedNetworkLabel(): string {
  if (NETWORK_PASSPHRASE.toLowerCase().includes("public")) return "Mainnet"
  if (NETWORK_PASSPHRASE.toLowerCase().includes("test")) return "Testnet"
  return "the configured network"
}

function freighterNetworkMatches(passphrase?: string | null): boolean {
  return !passphrase || passphrase === NETWORK_PASSPHRASE
}

async function submitTransactionWithRetry(
  signedTx: Transaction
): Promise<rpc.Api.SendTransactionResponse> {
  let lastResponse: rpc.Api.SendTransactionResponse | undefined

  for (let attempt = 0; attempt < MAX_SUBMIT_ATTEMPTS; attempt++) {
    lastResponse = await server.sendTransaction(signedTx)
    if (lastResponse.status !== "TRY_AGAIN_LATER") {
      return lastResponse
    }
    if (attempt < MAX_SUBMIT_ATTEMPTS - 1) {
      const delayMs = SUBMIT_BACKOFF_MS * 2 ** attempt
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return lastResponse!
}

export interface TransactionTimebounds {
  minTime: number // Unix timestamp in seconds
  maxTime: number // Unix timestamp in seconds
}

/**
 * Check if a transaction's timebounds are still valid
 * Returns true if the transaction can still be submitted
 */
export function isTransactionTimeboundsValid(timebounds: TransactionTimebounds): boolean {
  const now = Math.floor(Date.now() / 1000) // Convert to Unix timestamp in seconds

  // Check if current time is within the valid range
  if (now < timebounds.minTime) {
    return false // Too early
  }

  if (timebounds.maxTime > 0 && now > timebounds.maxTime) {
    return false // Too late (maxTime of 0 means no upper limit)
  }

  return true
}

/**
 * Get timebounds from a transaction
 */
export function getTransactionTimebounds(tx: Transaction): TransactionTimebounds | null {
  try {
    const timebounds = tx.timebounds
    if (!timebounds) return null

    return {
      minTime: parseInt(timebounds.minTime, 10),
      maxTime: parseInt(timebounds.maxTime, 10),
    }
  } catch {
    return null
  }
}

/**
 * Common helper to wait for transaction completion with timeout.
 *
 * Polls the Soroban RPC with exponential backoff (1s, 2s, 4s, 8s, then capped
 * at 5s per attempt) up to 60 attempts. The combination gives a low-latency
 * response on fast confirmations (~3 calls in the first 7 seconds) and a
 * bounded total wait of roughly 5 minutes on slow ones, without hammering RPC.
 */
export async function pollTransaction(txHash: string): Promise<rpc.Api.GetTransactionResponse> {
  const MAX_POLLS = 60
  const MAX_DELAY_MS = 5_000
  let attempts = 0
  let response = await withRpcReadThrottle("checking transaction status", () =>
    withTimeout(server.getTransaction(txHash), RPC_TIMEOUT_MS, "RPC timeout: getTransaction")
  )

  while (response.status === "NOT_FOUND") {
    if (++attempts >= MAX_POLLS) throw new Error("Transaction not found after polling timeout")
    // 1s, 2s, 4s, then capped at MAX_DELAY_MS for every subsequent attempt.
    const delayMs = Math.min(1_000 * 2 ** (attempts - 1), MAX_DELAY_MS)
    await new Promise(resolve => setTimeout(resolve, delayMs))
    response = await withRpcReadThrottle("checking transaction status", () =>
      withTimeout(server.getTransaction(txHash), RPC_TIMEOUT_MS, "RPC timeout: getTransaction")
    )
  }

  return response
}

/**
 * Signs and submits a transaction using Freighter
 * Validates transaction timebounds before submission
 */
export async function signAndSubmit(
  tx: Transaction,
  handlers: TransactionLifecycleHandlers = {}
): Promise<TransactionResult> {
  try {
    // Check transaction timebounds before proceeding
    const timebounds = getTransactionTimebounds(tx)
    if (timebounds && !isTransactionTimeboundsValid(timebounds)) {
      const now = Math.floor(Date.now() / 1000)
      let errorMsg = "Transaction timebounds are invalid"

      if (now < timebounds.minTime) {
        errorMsg = `Transaction is not yet valid. Valid from ${new Date(timebounds.minTime * 1000).toISOString()}`
      } else if (timebounds.maxTime > 0 && now > timebounds.maxTime) {
        errorMsg = `Transaction has expired. Valid until ${new Date(timebounds.maxTime * 1000).toISOString()}`
      }

      return {
        status: "FAILED",
        txHash: "",
        error: errorMsg,
      }
    }

    const netBeforeSign = await getNetworkDetails()
    if (!freighterNetworkMatches(netBeforeSign.networkPassphrase)) {
      const message = `Freighter is on the wrong network. Expected: ${getExpectedNetworkLabel()}.`
      handlers.onError?.(message)
      return {
        status: "FAILED",
        txHash: "",
        error: message,
      }
    }

    const result = await signTransaction(tx.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
    })

    if (typeof result === "object" && result !== null && "signedTxXdr" in result) {
      const { signedTxXdr } = result
      // Convert to Transaction Envelope XDR string for safety
      const signedTx = new Transaction(signedTxXdr as string, NETWORK_PASSPHRASE)

      const netAfterSign = await getNetworkDetails()
      if (!freighterNetworkMatches(netAfterSign.networkPassphrase)) {
        handlers.onError?.(NETWORK_MISMATCH_MESSAGE)
        return {
          status: "FAILED",
          txHash: "",
          error: NETWORK_MISMATCH_MESSAGE,
        }
      }

      const currentAddress = await getPublicKey()
      if (signedTx.source !== currentAddress) {
        const message = "Account changed after signing. Please re-confirm."
        handlers.onError?.(message)
        return {
          status: "FAILED",
          txHash: "",
          error: message,
        }
      }

      const submitResponse = await submitTransactionWithRetry(signedTx)

      // The sendTransaction status was wrongly check for SUCCESS previously.
      // Accurate statuses: PENDING | DUPLICATE | TRY_AGAIN_LATER | ERROR
      if (submitResponse.status === "PENDING") {
        handlers.onSubmitted?.(submitResponse.hash)
        const pollResponse = await pollTransaction(submitResponse.hash)

        if (pollResponse.status === "SUCCESS") {
          const successResp = pollResponse as rpc.Api.GetSuccessfulTransactionResponse
          const horizonMeta = await trackTransaction(submitResponse.hash)
          return {
            status: "SUCCESS",
            txHash: submitResponse.hash,
            resultXdr: successResp.returnValue?.toXDR("base64"),
            horizonMeta: horizonMeta ?? undefined,
          }
        } else {
          return {
            status: "FAILED",
            txHash: submitResponse.hash,
            error: "Transaction failed after submission",
          }
        }
      } else if (submitResponse.status === "DUPLICATE") {
        return {
          status: "FAILED",
          txHash: submitResponse.hash,
          error: "This transaction is a duplicate. Please wait a moment or try again.",
        }
      } else if (submitResponse.status === "TRY_AGAIN_LATER") {
        const message = "Network is busy. Please try again later."
        handlers.onError?.(message)
        return {
          status: "FAILED",
          txHash: submitResponse.hash,
          error: message,
        }
      } else if (submitResponse.status === "ERROR") {
        return {
          status: "FAILED",
          txHash: submitResponse.hash,
          error: "Transaction error. Please contact support or check your inputs.",
        }
      } else {
        return {
          status: "FAILED",
          txHash: submitResponse.hash,
          error: `Submission failed: ${submitResponse.status}`,
        }
      }
    } else {
      return {
        status: "FAILED",
        txHash: "",
        error: "Signing failed",
      }
    }
  } catch (err: unknown) {
    if (import.meta.env.DEV) {
      console.error("Transaction submission error:", err)
    }
    const message = err instanceof Error ? err.message : "Unknown error during signing/submission"
    return {
      status: "FAILED",
      txHash: "",
      error: message,
    }
  }
}
