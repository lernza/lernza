import { rpc, Transaction } from "@stellar/stellar-sdk"
import { signTransaction, getNetworkDetails, getPublicKey } from "@stellar/freighter-api"

export const SOROBAN_RPC_URL =
  import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org"
export const NETWORK_PASSPHRASE =
  import.meta.env.VITE_SOROBAN_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015"

export const server = new rpc.Server(SOROBAN_RPC_URL)

export interface TransactionResult {
  status: "SUCCESS" | "FAILED" | "PENDING"
  txHash: string
  resultXdr?: string
  error?: string
}

export interface TransactionLifecycleHandlers {
  onSubmitted?: (txHash: string) => void
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
 * Common helper to wait for transaction completion
 */
export async function pollTransaction(txHash: string): Promise<rpc.Api.GetTransactionResponse> {
  const MAX_POLLS = 30
  let attempts = 0
  let response = await server.getTransaction(txHash)

  while (response.status === "NOT_FOUND") {
    if (++attempts >= MAX_POLLS) throw new Error("Transaction not found after 30s")
    await new Promise(resolve => setTimeout(resolve, 1000))
    response = await server.getTransaction(txHash)
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

    const net = await getNetworkDetails()
    if (net.networkPassphrase && net.networkPassphrase !== NETWORK_PASSPHRASE) {
      throw new Error(`Freighter is on the wrong network. Expected: Testnet.`)
    }

    const result = await signTransaction(tx.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
    })

    if (typeof result === "object" && result !== null && "signedTxXdr" in result) {
      const { signedTxXdr } = result
      // Convert to Transaction Envelope XDR string for safety
      const signedTx = new Transaction(signedTxXdr as string, NETWORK_PASSPHRASE)
      
      const currentAddress = await getPublicKey()
      if (signedTx.source !== currentAddress) {
        return {
          status: "FAILED",
          txHash: "",
          error: "Account changed after signing. Please re-confirm.",
        }
      }

      const submitResponse = await server.sendTransaction(signedTx)

      // The sendTransaction status was wrongly check for SUCCESS previously.
      // Accurate statuses: PENDING | DUPLICATE | TRY_AGAIN_LATER | ERROR
      if (submitResponse.status === "PENDING") {
        handlers.onSubmitted?.(submitResponse.hash)
        const pollResponse = await pollTransaction(submitResponse.hash)

        if (pollResponse.status === "SUCCESS") {
          const successResp = pollResponse as rpc.Api.GetSuccessfulTransactionResponse
          return {
            status: "SUCCESS",
            txHash: submitResponse.hash,
            resultXdr: successResp.returnValue?.toXDR("base64"),
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
        return {
          status: "FAILED",
          txHash: submitResponse.hash,
          error: "Network is busy. Please try again later.",
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
