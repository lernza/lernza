/**
 * Retry policy with safe boundaries.
 * Read operations retry with exponential backoff; signed writes never retry silently.
 */

export const READ_RETRY_COUNT = 3;
export const READ_RETRY_BASE_MS = 500;
export const STATUS_CHECK_RETRY_COUNT = 2;

export type FailureKind = "retryable" | "non_retryable";

const RETRYABLE_PATTERNS = [
  "fetch failed",
  "network",
  "timeout",
  "timed out",
  "econnrefused",
  "econnreset",
  "etimedout",
  "enotfound",
  "socket hang up",
  "503",
  "502",
  "429",
];

const NON_RETRYABLE_PATTERNS = [
  "unauthorized",
  "not found",
  "invalid",
  "already enrolled",
  "insufficient",
  "signature",
  "auth",
];

export function classifyFailure(error: unknown): FailureKind {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  for (const p of NON_RETRYABLE_PATTERNS) if (msg.includes(p)) return "non_retryable";
  for (const p of RETRYABLE_PATTERNS) if (msg.includes(p)) return "retryable";
  return "non_retryable";
}

export function isRetryable(error: unknown): boolean {
  return classifyFailure(error) === "retryable";
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseMs?: number } = {}
): Promise<T> {
  const retries = opts.retries ?? READ_RETRY_COUNT;
  const baseMs = opts.baseMs ?? READ_RETRY_BASE_MS;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt === retries || !isRetryable(e)) throw e;
      const delay = baseMs * Math.pow(2, attempt) + Math.random() * 100;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export function isSignedWriteOperation(operation: string): boolean {
  return ["fund_quest", "enroll", "complete_milestone", "distribute_reward", "claim", "create_quest"].some((k) =>
    operation.toLowerCase().includes(k)
  );
}
