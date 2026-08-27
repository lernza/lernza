export type ErrorCategory = "validation" | "authorization" | "balance" | "network" | "timeout" | "unknown";

export interface ErrorCode {
  code: string;
  category: ErrorCategory;
  message: string;
  action: string;
  retryable: boolean;
}

export const ERROR_CODES: Record<string, ErrorCode> = {
  VALIDATION_REQUIRED: { code: "L1001", category: "validation", message: "Please check the required fields.", action: "Review the highlighted fields and try again.", retryable: false },
  VALIDATION_INVALID_INPUT: { code: "L1002", category: "validation", message: "Some values look incorrect.", action: "Correct the highlighted values and resubmit.", retryable: false },
  VALIDATION_QUEST_NOT_FOUND: { code: "L1003", category: "validation", message: "Quest not found.", action: "Check the quest link or browse available quests.", retryable: false },
  AUTH_NOT_AUTHORIZED: { code: "L2001", category: "authorization", message: "You are not authorized for this action.", action: "Connect with the quest owner wallet or request access.", retryable: false },
  AUTH_EXPIRED: { code: "L2002", category: "authorization", message: "Your session has expired.", action: "Reconnect your wallet and try again.", retryable: true },
  AUTH_INSUFFICIENT_ROLE: { code: "L2003", category: "authorization", message: "Insufficient permissions.", action: "Contact the quest owner to request the correct role.", retryable: false },
  BALANCE_INSUFFICIENT: { code: "L3001", category: "balance", message: "Insufficient balance.", action: "Add funds to your wallet and retry.", retryable: true },
  BALANCE_POOL_EMPTY: { code: "L3002", category: "balance", message: "Reward pool is empty.", action: "The quest owner needs to fund the pool before rewards can be claimed.", retryable: false },
  NETWORK_RPC_ERROR: { code: "L4001", category: "network", message: "Network error contacting Stellar.", action: "Check your connection and retry in a moment.", retryable: true },
  NETWORK_CONTRACT_ERROR: { code: "L4002", category: "network", message: "Contract returned an error.", action: "Retry. If it persists, copy the support code and contact support.", retryable: true },
  TIMEOUT_RPC: { code: "L5001", category: "timeout", message: "Request timed out.", action: "The network is busy. Please retry.", retryable: true },
  TIMEOUT_TX: { code: "L5002", category: "timeout", message: "Transaction is taking longer than expected.", action: "Check the explorer for status. Do not resubmit immediately.", retryable: true },
  UNKNOWN: { code: "L9999", category: "unknown", message: "Something unexpected happened.", action: "Retry. If it continues, contact support with the support code.", retryable: true },
};

export function mapContractError(raw: string): ErrorCode {
  const lower = raw.toLowerCase();
  if (lower.includes("unauthorized") || lower.includes("not authorized") || lower.includes("auth")) return ERROR_CODES.AUTH_NOT_AUTHORIZED;
  if (lower.includes("insufficient") && lower.includes("balance")) return ERROR_CODES.BALANCE_INSUFFICIENT;
  if (lower.includes("pool") && lower.includes("empty")) return ERROR_CODES.BALANCE_POOL_EMPTY;
  if (lower.includes("not found") || lower.includes("notfound")) return ERROR_CODES.VALIDATION_QUEST_NOT_FOUND;
  if (lower.includes("invalid") || lower.includes("validation")) return ERROR_CODES.VALIDATION_INVALID_INPUT;
  if (lower.includes("timeout") || lower.includes("timed out")) return ERROR_CODES.TIMEOUT_RPC;
  if (lower.includes("network") || lower.includes("rpc") || lower.includes("fetch")) return ERROR_CODES.NETWORK_RPC_ERROR;
  return ERROR_CODES.UNKNOWN;
}

export function toUserMessage(error: unknown): { code: string; title: string; action: string; category: ErrorCategory; diagnostics?: string } {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const mapped = mapContractError(raw);
  return {
    code: mapped.code,
    title: mapped.message,
    action: mapped.action,
    category: mapped.category,
    diagnostics: raw.slice(0, 500),
  };
}
