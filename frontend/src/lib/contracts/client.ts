import { rpc, Transaction } from "@stellar/stellar-sdk"
import { signTransaction, getNetworkDetails } from "@stellar/freighter-api"
import { getNetworkConfig } from "@/lib/network"

// Legacy constants kept for backward compatibility — always testnet defaults.
export const SOROBAN_RPC_URL =
  import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org"
export const NETWORK_PASSPHRASE =
  import.meta.env.VITE_SOROBAN_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015"

// Legacy singleton — contract clients should use getServer() for network-aware calls.
export const server = new rpc.Server(SOROBAN_RPC_URL)

/** Returns an RPC server for the currently selected network. */
export function getServer(): rpc.Server {
  return new rpc.Server(getNetworkConfig().rpcUrl)
}

export interface TransactionResult {
  status: "SUCCESS" | "FAILED" | "PENDING"
  txHash: string
  resultXdr?: string
  error?: string
}

/**
 * Common helper to wait for transaction completion
 */
export async function pollTransaction(txHash: string): Promise<rpc.Api.GetTransactionResponse> {
  const MAX_POLLS = 30
  let attempts = 0
  const srv = getServer()
  let response = await srv.getTransaction(txHash)

  while (response.status === "NOT_FOUND") {
    if (++attempts >= MAX_POLLS) throw new Error("Transaction not found after 30s")
    await new Promise(resolve => setTimeout(resolve, 1000))
    response = await srv.getTransaction(txHash)
  }

  return response
}

/**
 * Signs and submits a transaction using Freighter
 */
export async function signAndSubmit(tx: Transaction): Promise<TransactionResult> {
  try {
    const config = getNetworkConfig()
    const net = await getNetworkDetails()
    if (net.networkPassphrase && net.networkPassphrase !== config.passphrase) {
      const expected = config.network === "mainnet" ? "Mainnet" : "Testnet"
      throw new Error(`Freighter is on the wrong network. Expected: ${expected}.`)
    }

    const result = await signTransaction(tx.toXDR(), {
      networkPassphrase: config.passphrase,
    })

    if (typeof result === "object" && result !== null && "signedTxXdr" in result) {
      const { signedTxXdr } = result
      const srv = getServer()
      const submitResponse = await srv.sendTransaction(
        new Transaction(signedTxXdr as string, config.passphrase)
      )

      if (submitResponse.status === "PENDING") {
        const pollResponse = await pollTransaction(submitResponse.hash)

        if (pollResponse.status === "SUCCESS") {
          return {
            status: "SUCCESS",
            txHash: submitResponse.hash,
            resultXdr: (pollResponse as rpc.Api.GetTransactionResponse & { resultXdr: string })
              .resultXdr,
          }
        } else {
          return {
            status: "FAILED",
            txHash: submitResponse.hash,
            error: "Transaction failed after submission",
          }
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
    console.error("Transaction submission error:", err)
    const message = err instanceof Error ? err.message : "Unknown error during signing/submission"
    return {
      status: "FAILED",
      txHash: "",
      error: message,
    }
  }
}
