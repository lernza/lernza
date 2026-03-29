import { useState, useEffect, useCallback, useRef } from "react"
import { rewardsClient } from "@/lib/contracts/rewards"

// Stellar Horizon endpoints
const HORIZON_MAINNET = "https://horizon.stellar.org"
const HORIZON_TESTNET = "https://horizon-testnet.stellar.org"

// Reward token decimals — Stellar SAC tokens use 7 decimal places by default
const REWARD_TOKEN_DECIMALS = 7

export interface WalletBalance {
  xlmBalance: string | null
  rewardBalance: string | null
  isLoading: boolean
  error: string | null
}

function getHorizonUrl(networkName: string | null): string {
  if (!networkName) return HORIZON_TESTNET
  const lower = networkName.toLowerCase()
  if (lower.includes("main") || lower.includes("public")) return HORIZON_MAINNET
  return HORIZON_TESTNET
}

function formatBalance(raw: string): string {
  const num = parseFloat(raw)
  if (isNaN(num)) return "0.00"
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatRewardBalance(raw: bigint, decimals: number): string {
  // bigint raw units → human-readable (e.g. 50_000_000n with 7 decimals → "5.00")
  const divisor = BigInt(10 ** decimals)
  const whole = raw / divisor
  const fraction = raw % divisor
  const fractionStr = fraction.toString().padStart(decimals, "0").slice(0, 2)
  return `${whole.toLocaleString()}.${fractionStr}`
}

/**
 * Fetches XLM balance from Stellar Horizon API and reward token balance
 * from the on-chain rewards contract for a connected wallet address.
 *
 * @param address     - The connected Stellar wallet address (null when disconnected)
 * @param networkName - The current network name from useWallet (e.g. "Testnet", "mainnet")
 */
export function useWalletBalance(
  address: string | null,
  networkName: string | null
): WalletBalance {
  const [xlmBalance, setXlmBalance] = useState<string | null>(null)
  const [rewardBalance, setRewardBalance] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track the latest fetch so stale responses from prior addresses are discarded
  const fetchIdRef = useRef(0)

  const fetchBalances = useCallback(async () => {
    if (!address) {
      setXlmBalance(null)
      setRewardBalance(null)
      setIsLoading(false)
      setError(null)
      return
    }

    const fetchId = ++fetchIdRef.current
    setIsLoading(true)
    setError(null)

    try {
      const horizonUrl = getHorizonUrl(networkName)

      // Run both fetches in parallel for speed
      const [accountResponse, earnings] = await Promise.allSettled([
        fetch(`${horizonUrl}/accounts/${address}`),
        rewardsClient.getUserEarnings(address),
      ])

      // Guard: if a newer fetch started while we awaited, discard this result
      if (fetchId !== fetchIdRef.current) return

      // --- XLM balance ---
      if (accountResponse.status === "fulfilled") {
        const res = accountResponse.value

        if (res.ok) {
          const data = await res.json()
          const balances: Array<{ asset_type: string; balance: string }> = data.balances ?? []
          const xlm = balances.find(b => b.asset_type === "native")
          setXlmBalance(xlm ? formatBalance(xlm.balance) : "0.00")
        } else if (res.status === 404) {
          // Account exists on ledger but has no funded entry (0 XLM)
          setXlmBalance("0.00")
        } else {
          setXlmBalance(null)
          setError("Could not fetch balance")
        }
      } else {
        setXlmBalance(null)
        setError("Could not reach Horizon")
      }

      // --- Reward token balance ---
      if (earnings.status === "fulfilled" && earnings.value > 0n) {
        setRewardBalance(formatRewardBalance(earnings.value, REWARD_TOKEN_DECIMALS))
      } else {
        // No earnings yet or contract not configured — silently hide the badge
        setRewardBalance(null)
      }
    } catch {
      if (fetchId !== fetchIdRef.current) return
      setXlmBalance(null)
      setRewardBalance(null)
      setError("Balance fetch failed")
    } finally {
      if (fetchId === fetchIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [address, networkName])

  useEffect(() => {
    void fetchBalances()
  }, [fetchBalances])

  // Clear immediately when wallet disconnects
  useEffect(() => {
    if (!address) {
      setXlmBalance(null)
      setRewardBalance(null)
      setError(null)
      setIsLoading(false)
    }
  }, [address])

  return { xlmBalance, rewardBalance, isLoading, error }
}
