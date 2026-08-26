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
  issuer: string
  recipient: string
}

function parseMetadata(raw: unknown): CertificateMetadata {
  const record = raw as Record<string, unknown>
  return {
    questId: Number(record.quest_id),
    questName: String(record.quest_name),
    questCategory: String(record.quest_category),
    completionDate: Number(record.completion_date),
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
