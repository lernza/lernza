import { describe, it, expect, vi, beforeEach } from "vitest"
import { RpcHealthManager } from "./rpc-health"
import {
  buildIdempotencyKey,
  classifyContractError,
  getQuestCertificate,
  isCertificateRevoked,
} from "./certificate"
import { withTimeout, withRpcReadThrottle } from "./client"

describe("Contract Client Layer Tests (Issue #1639)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("RPC Health Manager Fallback Behavior", () => {
    it("fails over to secondary endpoint when primary reaches max consecutive failures", () => {
      const primaryUrl = "https://soroban-rpc-primary.stellar.org"
      const secondaryUrl = "https://soroban-rpc-backup.stellar.org"

      const manager = new RpcHealthManager({
        urls: [primaryUrl, secondaryUrl],
        maxConsecutiveFailures: 3,
      })

      // Initially primary is active and healthy
      expect(manager.getHealthyEndpoint()).toBe(primaryUrl)

      // 1st and 2nd failure — still under threshold (max=3)
      manager.markFailed(primaryUrl)
      expect(manager.getHealthyEndpoint()).toBe(primaryUrl)

      manager.markFailed(primaryUrl)
      expect(manager.getHealthyEndpoint()).toBe(primaryUrl)

      // 3rd failure — threshold reached, marks primary unhealthy and falls back to secondary
      manager.markFailed(primaryUrl)
      expect(manager.getHealthyEndpoint()).toBe(secondaryUrl)
    })
  })

  describe("Transaction Timeout Handling", () => {
    it("rejects with a timeout error when promise exceeds specified milliseconds", async () => {
      const slowPromise = new Promise((resolve) => setTimeout(resolve, 200))

      await expect(withTimeout(slowPromise, 50, "Custom timeout message")).rejects.toThrow(
        "Custom timeout message"
      )
    })

    it("resolves normally when promise completes before timeout deadline", async () => {
      const fastPromise = Promise.resolve("success-value")
      const result = await withTimeout(fastPromise, 500, "Should not timeout")
      expect(result).toBe("success-value")
    })
  })

  describe("Rate Limiting Logic", () => {
    it("throttles and permits calls using withRpcReadThrottle wrapper", async () => {
      const fn = vi.fn().mockResolvedValue("throttled-result")
      const result = await withRpcReadThrottle("test-operation", fn)
      expect(result).toBe("throttled-result")
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })

  describe("Idempotency Key Generation", () => {
    it("generates deterministic and unique idempotency keys for quest operations", () => {
      const key1 = buildIdempotencyKey("mint_cert", 101, "GUSER123")
      const key2 = buildIdempotencyKey("mint_cert", 101, "GUSER123")
      const key3 = buildIdempotencyKey("mint_cert", 102, "GUSER123")
      const key4 = buildIdempotencyKey("claim_reward", 101, "GUSER123")

      expect(key1).toBe("mint_cert:101:GUSER123")
      expect(key1).toBe(key2) // Deterministic
      expect(key1).not.toBe(key3) // Unique per quest
      expect(key1).not.toBe(key4) // Unique per action
    })
  })

  describe("Error Classification", () => {
    it("classifies user rejection errors accurately", () => {
      const result = classifyContractError(new Error("User declined transaction in Freighter"))
      expect(result.type).toBe("USER_REJECTED")
      expect(result.message).toContain("cancelled by user")
    })

    it("classifies timeout errors", () => {
      const result = classifyContractError(new Error("Transaction status check timed out after 15000ms"))
      expect(result.type).toBe("TIMEOUT")
      expect(result.message).toContain("timed out")
    })

    it("classifies rate limit errors", () => {
      const result = classifyContractError(new Error("Too many requests: rate limit exceeded"))
      expect(result.type).toBe("RATE_LIMITED")
      expect(result.message).toContain("Rate limit exceeded")
    })

    it("classifies simulation / host errors", () => {
      const result = classifyContractError(new Error("HostError: simulation failed with Error(Contract, 4)"))
      expect(result.type).toBe("SIMULATION_FAILED")
      expect(result.message).toContain("Contract execution failed")
    })

    it("classifies network errors", () => {
      const result = classifyContractError(new Error("Failed to fetch RPC server response"))
      expect(result.type).toBe("NETWORK_ERROR")
      expect(result.message).toContain("Network connection error")
    })
  })

  describe("Mock Contract Call Responses", () => {
    it("handles mock certificate query response gracefully when not found", async () => {
      const cert = await getQuestCertificate(99, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "")
      expect(cert).toBeNull()
    })

    it("checks certificate revocation status safely", async () => {
      const isRevoked = await isCertificateRevoked(1, "")
      expect(isRevoked).toBe(false)
    })
  })
})
