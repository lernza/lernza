import { 
  rpc, 
  Transaction,
} from "@stellar/stellar-sdk";
import { 
  signTransaction 
} from "@stellar/freighter-api";

export const SOROBAN_RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE = import.meta.env.VITE_SOROBAN_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";

export const server = new rpc.Server(SOROBAN_RPC_URL);

export interface TransactionResult {
  status: "SUCCESS" | "FAILED" | "PENDING";
  txHash: string;
  resultXdr?: string;
  error?: string;
}

/**
 * Common helper to wait for transaction completion
 */
export async function pollTransaction(txHash: string): Promise<rpc.Api.GetTransactionResponse> {
  const MAX_POLLS = 30;
  let attempts = 0;
  let response = await server.getTransaction(txHash);
  
  while (response.status === "NOT_FOUND") {
    if (++attempts >= MAX_POLLS) throw new Error("Transaction not found after 30s");
    await new Promise(resolve => setTimeout(resolve, 1000));
    response = await server.getTransaction(txHash);
  }
  
  return response;
}

/**
 * Signs and submits a transaction using Freighter
 */
export async function signAndSubmit(tx: Transaction): Promise<TransactionResult> {
  try {
    const result = await signTransaction(tx.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
    });
    
    if (typeof result === "object" && result !== null && "signedTxXdr" in result) {
      const { signedTxXdr } = result;
      // Convert to Transaction Envelope XDR string for safety
      const submitResponse = await server.sendTransaction(new Transaction(signedTxXdr as string, NETWORK_PASSPHRASE));
      
      // The sendTransaction status was wrongly check for SUCCESS previously.
      // Accurate statuses: PENDING | DUPLICATE | TRY_AGAIN_LATER | ERROR
      if (submitResponse.status === "PENDING") {
        const pollResponse = await pollTransaction(submitResponse.hash);
        
        if (pollResponse.status === "SUCCESS") {
          return {
            status: "SUCCESS",
            txHash: submitResponse.hash,
            resultXdr: (pollResponse as rpc.Api.GetTransactionResponse & { resultXdr: string }).resultXdr,
          };
        } else {
          return {
            status: "FAILED",
            txHash: submitResponse.hash,
            error: "Transaction failed after submission",
          };
        }
      } else {
        return {
          status: "FAILED",
          txHash: submitResponse.hash,
          error: `Submission failed: ${submitResponse.status}`,
        };
      }
    } else {
       return {
         status: "FAILED",
         txHash: "",
         error: "Signing failed"
       };
    }
  } catch (err: unknown) {
    console.error("Transaction submission error:", err);
    const message = err instanceof Error ? err.message : "Unknown error during signing/submission";
    return {
      status: "FAILED",
      txHash: "",
      error: message,
    };
  }
}
