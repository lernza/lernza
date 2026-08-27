/** Core Soroban RPC client — connection, signing, submission, and rate limiting. */
import { isDev } from "@/lib/env"
import * as rpc from "@stellar/stellar-sdk/rpc"
import {
  Account,
  Keypair,
  scValToNative,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk"
import type { xdr } from "@stellar/stellar-sdk"
import { signTransaction, getNetworkDetails, getAddress } from "@stellar/freighter-api"
import { env } from "../env"
import { pushToast } from "../notifications"
import { logContractCall } from "./logger"
import { trackTransaction, type HorizonTransactionMeta } from "./tx-tracker"
import { RpcHealthManager, parseRpcUrls } from "./rpc-health"
import { trackContractFailure } from "../analytics"
import { classifyError, parseContractErrorCode } from "../contract-errors"
import { idempotencyManager } from "./idempotency"
import {
  addPendingTransaction,
  getPendingTransactions,
  removePendingTransaction,
  type PendingTransaction,
} from "../pending-transactions"
import type { Contract } from "@stellar/stellar-sdk"

export type ContractMethodArgs = readonly xdr.ScVal[]

export interface TypedContractCall<Method extends string = string> {
  method: Method
  args: ContractMethodArgs
}

export async function simulateContractRead<Method extends string>(
  contract: Contract,
  call: TypedContractCall<Method>
): Promise<ReturnType<typeof scValToNative> | null> {
  const randomKP = Keypair.random()
  const account = new Account(randomKP.publicKey(), "0")
  const tx = new TransactionBuilder(account, {
    fee: "10000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(call.method, ...call.args))
    .setTimeout(30)
    .build()

  const response = await withRpcReadThrottle(`loading ${call.method.replace(/_/g, " ")}`, () =>
    withTimeout(server.simulateTransaction(tx), RPC_TIMEOUT_MS, `RPC timeout: ${call.method}`)
  )

  return response && "result" in response && response.result
    ? scValToNative(response.result.retval)
    : null
}

export async function prepareContractTransaction<Method extends string>(
  contract: Contract,
  source: string,
  call: TypedContractCall<Method>
) {
  const account = await withTimeout(
    server.getAccount(source),
    RPC_TIMEOUT_MS,
    "RPC timeout: getAccount"
  )
  const tx = new TransactionBuilder(account, {
    fee: "10000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(call.method, ...call.args))
    .setTimeout(30)
    .build()

  return withTimeout(
    server.prepareTransaction(tx),
    RPC_TIMEOUT_MS,
    "RPC timeout: prepareTransaction"
  )
}

export const SOROBAN_RPC_URL = env.VITE_SOROBAN_RPC_URL
export const NETWORK_PASSPHRASE = env.VITE_SOROBAN_NETWORK_PASSPHRASE

// Determine timeout based on network (testnet: 15s, mainnet: 8s)
const isMainnet = SOROBAN_RPC_URL.includes("mainnet")
export const RPC_TIMEOUT_MS = isMainnet ? 8000 : 15000

// Initialize RPC health manager with fallback endpoints
const rpcUrls =
  parseRpcUrls(import.meta.env.VITE_SOROBAN_RPC_URLS).length > 0
    ? parseRpcUrls(import.meta.env.VITE_SOROBAN_RPC_URLS)
    : [SOROBAN_RPC_URL]

export const rpcHealthManager = new RpcHealthManager({
  urls: rpcUrls,
  timeoutMs: RPC_TIMEOUT_MS,
  maxConsecutiveFailures: 3,
  healthCheckIntervalMs: 30000,
})

// Start health checks on module load
rpcHealthManager.startHealthChecks()

export let server = rpcHealthManager.getServer()

/**
 * Update the active server when RPC endpoint changes (for internal use)
 */
export function updateServer(): void {
  server = rpcHealthManager.getServer()
}

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

export const TransactionStatus = {
  Signing: "SIGNING",
  Submitted: "SUBMITTED",
  PendingLedger: "PENDING_LEDGER",
  Success: "SUCCESS",
  Failed: "FAILED",
} as const
export type TransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus]

function normalizeRpcStatus(status: string): string {
  return status.toUpperCase()
}

export interface TransactionResult {
  status: TransactionStatus | "SUCCESS" | "FAILED" | "PENDING_LEDGER"
  txHash: string
  resultXdr?: string
  error?: string
  horizonMeta?: HorizonTransactionMeta
}

export interface TransactionLifecycleHandlers {
  /** Called when signing starts */
  onSigning?: () => void
  /** Called when the transaction has been signed and is ready for submission */
  onSigned?: (signedTxXdr: string) => void
  /** Called after the transaction is submitted to the network */
  onSubmitted?: (txHash: string) => void
  /** Called when the transaction reaches the ledger (finality) */
  onPendingLedger?: (txHash: string) => void
  /** Called for user-visible failures (e.g. network mismatch, account change). Wire to a toast in the UI. */
  onError?: (message: string) => void
  /** Called when the transaction succeeds on-chain */
  onSuccess?: (txHash: string) => void
}

export const NETWORK_MISMATCH_MESSAGE =
  "Transaction blocked: Freighter network changed. Switch Freighter back to the app network and try again."

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
  const currentRpcUrl = rpcHealthManager.getHealthyEndpoint()

  for (let attempt = 0; attempt < MAX_SUBMIT_ATTEMPTS; attempt++) {
    try {
      lastResponse = await server.sendTransaction(signedTx)
      if (lastResponse.status !== "TRY_AGAIN_LATER") {
        rpcHealthManager.markRecovered(currentRpcUrl)
        return lastResponse
      }
      if (attempt < MAX_SUBMIT_ATTEMPTS - 1) {
        const delayMs = SUBMIT_BACKOFF_MS * 2 ** attempt
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    } catch (err: unknown) {
      // Mark endpoint as failed if RPC call throws
      rpcHealthManager.markFailed(currentRpcUrl)
      updateServer()

      if (attempt < MAX_SUBMIT_ATTEMPTS - 1) {
        const delayMs = SUBMIT_BACKOFF_MS * 2 ** attempt
        await new Promise(resolve => setTimeout(resolve, delayMs))
      } else {
        throw err
      }
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
    const timebounds = tx.timeBounds
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

export interface SignAndSubmitOptions {
  idempotencyKey?: string
  bypassIdempotency?: boolean
  ttlMs?: number
}

/**
 * Signs and submits a transaction using Freighter with idempotency safeguards.
 * Validates transaction timebounds before submission and prevents duplicate submissions.
 */
export async function signAndSubmit(
  tx: Transaction,
  handlers: TransactionLifecycleHandlers = {},
  options?: SignAndSubmitOptions
): Promise<TransactionResult> {
  if (options?.bypassIdempotency) {
    return executeSignAndSubmit(tx, handlers)
  }

  const key = idempotencyManager.deriveIdempotencyKey(tx, options?.idempotencyKey)
  return idempotencyManager.executeIdempotent(
    key,
    () => executeSignAndSubmit(tx, handlers),
    options?.ttlMs
  )
}

async function executeSignAndSubmit(
  tx: Transaction,
  handlers: TransactionLifecycleHandlers = {}
): Promise<TransactionResult> {
  const startMs = Date.now()

  // Derive network label for observability (issue #1465)
  const networkLabel = NETWORK_PASSPHRASE.includes("Test SDF") ? "TESTNET" : "MAINNET"

  /** Emit a contract failure observation with sanitized context. */
  function observeFailure(method: string, errorMsg: string, txHash?: string) {
    trackContractFailure({
      method,
      network: networkLabel,
      errorClass: classifyError(errorMsg),
      txHash,
      contractErrorCode: parseContractErrorCode(errorMsg) ?? undefined,
    })
  }

  // Helper: emit a structured breadcrumb for this transaction lifecycle event.
  function logTx(
    stage: string,
    result: "success" | "failed" | "error",
    extra: Record<string, unknown> = {}
  ) {
    logContractCall({
      contract: "soroban",
      fn: stage,
      durationMs: Date.now() - startMs,
      result,
      ...extra,
    })
  }

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

      logTx("timebounds_check", "failed", { error: errorMsg })
      observeFailure("timebounds_check", errorMsg)
      return {
        status: TransactionStatus.Failed,
        txHash: "",
        error: errorMsg,
      }
    }

    handlers.onSigning?.()

    const netBeforeSign = await getNetworkDetails()
    if (!freighterNetworkMatches(netBeforeSign.networkPassphrase)) {
      const message = `Transaction blocked: Freighter is on the wrong network. Expected ${getExpectedNetworkLabel()}. Switch Freighter to the app network and try again.`
      logTx("network_check", "failed", { error: message })
      observeFailure("network_check", message)
      handlers.onError?.(message)
      return {
        status: TransactionStatus.Failed,
        txHash: "",
        error: message,
      }
    }

    const signResult = await signTransaction(tx.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
    })

    if (typeof signResult === "object" && signResult !== null && "signedTxXdr" in signResult) {
      const { signedTxXdr } = signResult
      handlers.onSigned?.(signedTxXdr)

      // Convert to Transaction Envelope XDR string for safety
      const signedTx = new Transaction(signedTxXdr as string, NETWORK_PASSPHRASE)

      const netAfterSign = await getNetworkDetails()
      if (!freighterNetworkMatches(netAfterSign.networkPassphrase)) {
        const message = NETWORK_MISMATCH_MESSAGE
        logTx("network_check_post_sign", "failed", { error: message })
        observeFailure("network_check_post_sign", message)
        handlers.onError?.(message)
        return {
          status: TransactionStatus.Failed,
          txHash: "",
          error: message,
        }
      }

      const { address: currentAddress } = await getAddress()
      if (signedTx.source !== currentAddress) {
        const message = "Account changed after signing. Please re-confirm."
        logTx("account_check", "failed", { error: message })
        observeFailure("account_check", message)
        handlers.onError?.(message)
        return {
          status: TransactionStatus.Failed,
          txHash: "",
          error: message,
        }
      }

      const submitResponse = await submitTransactionWithRetry(signedTx)

      // Accurate statuses from submitTransactionWithRetry: PENDING | DUPLICATE | TRY_AGAIN_LATER | ERROR
      if (submitResponse.status === "PENDING") {
        handlers.onSubmitted?.(submitResponse.hash)
        logTx("submit", "success", { txHash: submitResponse.hash })

        const pollResponse = await pollTransaction(submitResponse.hash)

        if (normalizeRpcStatus(pollResponse.status) === TransactionStatus.Success) {
          const successResp = pollResponse as rpc.Api.GetSuccessfulTransactionResponse
          const horizonMeta = await trackTransaction(submitResponse.hash)
          const txResult: TransactionResult = {
            status: TransactionStatus.Success,
            txHash: submitResponse.hash,
            resultXdr: successResp.returnValue?.toXDR("base64"),
            horizonMeta: horizonMeta ?? undefined,
          }
          logTx("confirmed", "success", { txHash: submitResponse.hash })
          handlers.onSuccess?.(submitResponse.hash)
          return txResult
        } else if (
          normalizeRpcStatus(String(pollResponse.status)) === TransactionStatus.PendingLedger
        ) {
          handlers.onPendingLedger?.(submitResponse.hash)
          return {
            status: TransactionStatus.PendingLedger,
            txHash: submitResponse.hash,
          }
        } else {
          const pollError = "Transaction failed after submission"
          logTx("poll", "failed", { txHash: submitResponse.hash, error: pollError })
          observeFailure("poll", pollError, submitResponse.hash)
          return {
            status: TransactionStatus.Failed,
            txHash: submitResponse.hash,
            error: pollError,
          }
        }
      } else if (submitResponse.status === "DUPLICATE") {
        const error = "This transaction is a duplicate. Please wait a moment or try again."
        logTx("submit", "failed", { txHash: submitResponse.hash, submitStatus: "DUPLICATE", error })
        observeFailure("submit_duplicate", error, submitResponse.hash)
        return {
          status: TransactionStatus.Failed,
          txHash: submitResponse.hash,
          error,
        }
      } else if (submitResponse.status === "TRY_AGAIN_LATER") {
        const message = "Network is busy. Please try again later."
        logTx("submit", "failed", {
          txHash: submitResponse.hash,
          submitStatus: "TRY_AGAIN_LATER",
          error: message,
        })
        observeFailure("submit_try_again_later", message, submitResponse.hash)
        handlers.onError?.(message)
        return {
          status: TransactionStatus.Failed,
          txHash: submitResponse.hash,
          error: message,
        }
      } else if (submitResponse.status === "ERROR") {
        const error = "Transaction error. Please contact support or check your inputs."
        logTx("submit", "failed", { txHash: submitResponse.hash, submitStatus: "ERROR", error })
        observeFailure("submit_error", error, submitResponse.hash)
        return {
          status: TransactionStatus.Failed,
          txHash: submitResponse.hash,
          error,
        }
      } else {
        const error = `Submission failed: ${submitResponse.status}`
        logTx("submit", "failed", {
          txHash: submitResponse.hash,
          submitStatus: submitResponse.status,
          error,
        })
        observeFailure("submit_unknown", error, submitResponse.hash)
        return {
          status: TransactionStatus.Failed,
          txHash: submitResponse.hash,
          error,
        }
      }
    } else {
      const signingError = "Signing failed"
      logTx("sign", "failed", { error: signingError })
      observeFailure("sign", signingError)
      return {
        status: TransactionStatus.Failed,
        txHash: "",
        error: signingError,
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error during signing/submission"
    logTx("sign_and_submit", "error", { error: message })
    observeFailure("sign_and_submit", message)
    if (isDev) {
      console.error("Transaction submission error:", err)
    }
    return {
      status: TransactionStatus.Failed,
      txHash: "",
      error: message,
    }
  }
}

/**
 * Wraps signAndSubmit with pending-transaction persistence (issue #1478).
 * Persists {txHash, label, submittedAt} to localStorage as soon as the
 * transaction is submitted, and removes it once resolved — except when the
 * result is still PendingLedger, since that's exactly the "confirmation
 * outcome unknown" case reconcilePendingTransactions() resolves on next
 * load. Never persists signed XDR, keys, or wallet secrets.
 */
export async function signAndSubmitTracked(
  tx: Transaction,
  label: string,
  handlers: TransactionLifecycleHandlers = {}
): Promise<TransactionResult> {
  const result = await signAndSubmit(tx, {
    ...handlers,
    onSubmitted: (txHash: string) => {
      addPendingTransaction({ txHash, label, submittedAt: Date.now() })
      handlers.onSubmitted?.(txHash)
    },
  })

  if (result.txHash && result.status !== TransactionStatus.PendingLedger) {
    removePendingTransaction(result.txHash)
  }

  return result
}

// If a pending transaction is still NOT_FOUND on the RPC after this long,
// treat it as expired/dropped rather than leaving it pending indefinitely.
const PENDING_TRANSACTION_EXPIRY_MS = 10 * 60 * 1000

/**
 * Reconciles persisted pending transactions against ledger status (issue
 * #1478). Intended to run once when the app loads: for each transaction
 * still recorded from a prior session/reload, checks its current status and
 * surfaces a distinct success/failure/expiry toast, clearing resolved
 * entries. Genuinely still-pending, recently-submitted transactions are left
 * for the next reconciliation rather than reported as expired prematurely.
 */
export async function reconcilePendingTransactions(): Promise<void> {
  const pending: PendingTransaction[] = getPendingTransactions()
  if (pending.length === 0) return

  await Promise.all(
    pending.map(async tx => {
      try {
        const response = await server.getTransaction(tx.txHash)
        const status = normalizeRpcStatus(response.status)

        if (status === TransactionStatus.Success) {
          pushToast({
            message: `${tx.label}: transaction confirmed successfully.`,
            type: "success",
            duration: 5000,
          })
          removePendingTransaction(tx.txHash)
        } else if (status === TransactionStatus.Failed) {
          pushToast({
            message: `${tx.label}: transaction failed on-chain.`,
            type: "error",
            duration: 6000,
          })
          removePendingTransaction(tx.txHash)
        } else if (status === "not_found") {
          if (Date.now() - tx.submittedAt > PENDING_TRANSACTION_EXPIRY_MS) {
            pushToast({
              message: `${tx.label}: transaction expired before confirmation. Please try again.`,
              type: "warning",
              duration: 6000,
            })
            removePendingTransaction(tx.txHash)
          }
          // Otherwise still genuinely in flight — leave it for the next reconciliation.
        }
      } catch (error) {
        // RPC unreachable while checking — leave the record for a future attempt.
        if (isDev) {
          console.warn(`Failed to reconcile pending transaction ${tx.txHash}:`, error)
        }
      }
    })
  )
}
