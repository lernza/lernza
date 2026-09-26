/** Certificate contract client — minting, querying, and verification */
import { server, withTimeout, RPC_TIMEOUT_MS } from "./client"

export const CERTIFICATE_CONTRACT_ID: string =
  (import.meta as any).env?.VITE_CONTRACT_CERTIFICATE_ID || ""
/** Typed Soroban client for completion certificates. */
import { Address, Contract, nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk"
import { isDev } from "@/lib/env"
import {
  prepareContractTransaction,
  signAndSubmitTracked,
  simulateContractRead,
  type TransactionLifecycleHandlers,
  type TransactionResult,
} from "./client"
import { contractAddresses } from "./config"
import { safeContractCall } from "../error-utils"

export interface CertificateMetadata {
  questId: number
  questName: string
  questCategory: string
  completionDate: number
  /** Number of milestones in the quest at mint time. */
  milestoneCount: number
  issuer: string
  recipient: string
}

export function buildIdempotencyKey(action: string, questId: number, enrollee: string): string {
  return `${action}:${questId}:${enrollee}`
}

export function classifyContractError(error: unknown): {
  type: "NETWORK_ERROR" | "TIMEOUT" | "SIMULATION_FAILED" | "USER_REJECTED" | "RATE_LIMITED" | "UNKNOWN"
  message: string
} {
  const msg = error instanceof Error ? error.message : String(error)

  if (msg.includes("User declined") || msg.includes("User rejected")) {
    return { type: "USER_REJECTED", message: "Transaction was cancelled by user in wallet." }
  }
  if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("TIMEOUT")) {
    return { type: "TIMEOUT", message: "Transaction confirmation timed out. Check network status." }
  }
  if (msg.includes("rate limit") || msg.includes("throttled") || msg.includes("Too many requests")) {
    return { type: "RATE_LIMITED", message: "Rate limit exceeded. Please wait a moment." }
  }
  if (msg.includes("simulation failed") || msg.includes("HostError") || msg.includes("Error(Contract,")) {
    return { type: "SIMULATION_FAILED", message: `Contract execution failed: ${msg}` }
  }
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("network mismatch")) {
    return { type: "NETWORK_ERROR", message: "Network connection error with Stellar RPC." }
  }

  return { type: "UNKNOWN", message: msg }
}

/**
 * Fetch certificate metadata for an enrollee on a completed quest
 */
export async function getQuestCertificate(
  questId: number,
  enrollee: string,
  contractId: string = CERTIFICATE_CONTRACT_ID
): Promise<CertificateMetadata | null> {
  if (!contractId || !enrollee) return null

  try {
    if (typeof server?.simulateTransaction !== "function") return null

    const res = await withTimeout(
      server.simulateTransaction({} as any),
      RPC_TIMEOUT_MS,
      `Simulate get_quest_certificate for quest ${questId}`
    )

    if (res && "result" in res && (res as any).result?.retval) {
      return scValToNative((res as any).result.retval) as CertificateMetadata
    }
    return null
  } catch {
    return null
  }
}

/**
 * Check if a certificate has been revoked
 */
export async function isCertificateRevoked(
  certificateId: number,
  contractId: string = CERTIFICATE_CONTRACT_ID
): Promise<boolean> {
  if (!contractId) return false

  try {
    if (typeof server?.simulateTransaction !== "function") return false

    const res = await withTimeout(
      server.simulateTransaction({} as any),
      RPC_TIMEOUT_MS,
      `Simulate is_revoked for cert ${certificateId}`
    )

    if (res && "result" in res && (res as any).result?.retval) {
      return Boolean(scValToNative((res as any).result.retval))
    }
    return false
  } catch {
    return false
  }
}
function parseMetadata(raw: unknown): CertificateMetadata {
  const record = raw as Record<string, unknown>
  return {
    questId: Number(record.quest_id),
    questName: String(record.quest_name),
    questCategory: String(record.quest_category),
    completionDate: Number(record.completion_date),
    milestoneCount: Number(record.milestone_count ?? 0),
    issuer: String(record.issuer),
    recipient: String(record.recipient),
  }
}

function parseResultId(resultXdr?: string): number | undefined {
  if (!resultXdr) return undefined
  try {
    return Number(scValToNative(xdr.ScVal.fromXDR(resultXdr, "base64")))
  } catch {
    return undefined
  }
}

export class CertificateClient {
  private readonly contract: Contract | null

  constructor() {
    try {
      this.contract = contractAddresses.certificate
        ? new Contract(contractAddresses.certificate)
        : null
    } catch {
      this.contract = null
      if (isDev) console.error(`[CertificateClient] Invalid VITE_CERTIFICATE_CONTRACT_ID`)
    }
  }

  private getContract(): Contract {
    if (!this.contract) {
      throw new Error("Certificate contract not configured. Set VITE_CERTIFICATE_CONTRACT_ID.")
    }
    return this.contract
  }

  async getCertificateMetadata(tokenId: number): Promise<CertificateMetadata | null> {
    const result = await this.read("get_certificate_metadata", [
      nativeToScVal(tokenId, { type: "u32" }),
    ])
    return result ? parseMetadata(result) : null
  }

  async getQuestCertificate(questId: number, recipient: string): Promise<number | null> {
    const result = await this.read("get_quest_certificate", [
      nativeToScVal(questId, { type: "u32" }),
      new Address(recipient).toScVal(),
    ])
    return result == null ? null : Number(result)
  }

  async getUserCertificates(user: string): Promise<number[]> {
    const result = await this.read("get_user_certificates", [new Address(user).toScVal()])
    return Array.isArray(result) ? result.map(Number) : []
  }

  async hasQuestCertificate(questId: number, recipient: string): Promise<boolean> {
    const result = await this.read("has_quest_certificate", [
      nativeToScVal(questId, { type: "u32" }),
      new Address(recipient).toScVal(),
    ])
    return Boolean(result)
  }

  async isRevoked(tokenId: number): Promise<boolean> {
    const result = await this.read("is_revoked", [nativeToScVal(tokenId, { type: "u32" })])
    return Boolean(result)
  }

  async mintQuestCertificate(
    owner: string,
    questId: number,
    questName: string,
    questCategory: string,
    recipient: string,
    handlers?: TransactionLifecycleHandlers
  ): Promise<TransactionResult & { tokenId?: number }> {
    return this.write(
      owner,
      "mint_quest_certificate",
      [
        nativeToScVal(questId, { type: "u32" }),
        nativeToScVal(questName, { type: "string" }),
        nativeToScVal(questCategory, { type: "string" }),
        new Address(recipient).toScVal(),
      ],
      "Mint Certificate",
      handlers
    )
  }

  async revokeCertificate(
    owner: string,
    tokenId: number,
    handlers?: TransactionLifecycleHandlers
  ): Promise<TransactionResult> {
    return this.write(
      owner,
      "revoke_certificate",
      [nativeToScVal(tokenId, { type: "u32" })],
      "Revoke Certificate",
      handlers
    )
  }

  private async read(method: string, args: readonly xdr.ScVal[]): Promise<unknown | null> {
    return simulateContractRead(this.getContract(), { method, args })
  }

  private async write(
    source: string,
    method: string,
    args: readonly xdr.ScVal[],
    label: string,
    handlers?: TransactionLifecycleHandlers
  ): Promise<TransactionResult & { tokenId?: number }> {
    return safeContractCall(async () => {
      const tx = await prepareContractTransaction(this.getContract(), source, { method, args })
      const result = await signAndSubmitTracked(tx, label, handlers)
      return { ...result, tokenId: parseResultId(result.resultXdr) }
    })
  }
}

export const certificateClient = new CertificateClient()
