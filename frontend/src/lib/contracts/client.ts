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
 */
export async function signAndSubmit(
  tx: Transaction,
  handlers: TransactionLifecycleHandlers = {}
): Promise<TransactionResult> {
  try {
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
