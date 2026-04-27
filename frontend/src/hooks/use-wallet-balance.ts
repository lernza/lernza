import { useQuery } from "@tanstack/react-query"
import { rewardsClient } from "@/lib/contracts/rewards"

const HORIZON_MAINNET = "https://horizon.stellar.org"
const HORIZON_TESTNET = "https://horizon-testnet.stellar.org"
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
  const divisor = BigInt(10 ** decimals)
  const whole = raw / divisor
  const fraction = raw % divisor
  const fractionStr = fraction.toString().padStart(decimals, "0").slice(0, 2)
  return `${whole.toLocaleString()}.${fractionStr}`
}

interface BalanceResult {
  xlmBalance: string | null
  rewardBalance: string | null
}

async function fetchBalances(address: string, networkName: string | null): Promise<BalanceResult> {
  const horizonUrl = getHorizonUrl(networkName)

  const [accountResponse, earnings] = await Promise.allSettled([
    fetch(`${horizonUrl}/accounts/${address}`),
    rewardsClient.getUserEarnings(address),
  ])

  let xlmBalance: string | null = null
  if (accountResponse.status === "fulfilled") {
    const res = accountResponse.value
    if (res.ok) {
      const data = await res.json()
      const balances: Array<{ asset_type: string; balance: string }> = data.balances ?? []
      const xlm = balances.find(b => b.asset_type === "native")
      xlmBalance = xlm ? formatBalance(xlm.balance) : "0.00"
    } else if (res.status === 404) {
      xlmBalance = "0.00"
    }
  }
  if (xlmBalance === null) {
    throw new Error("Could not fetch balance")
  }

  let rewardBalance: string | null = null
  if (earnings.status === "fulfilled" && earnings.value > 0n) {
    rewardBalance = formatRewardBalance(earnings.value, REWARD_TOKEN_DECIMALS)
  }

  return { xlmBalance, rewardBalance }
}

export function useWalletBalance(
  address: string | null,
  networkName: string | null
): WalletBalance {
  const query = useQuery<BalanceResult, Error>({
    queryKey: ["walletBalance", address, networkName],
    queryFn: () => fetchBalances(address!, networkName),
    enabled: Boolean(address),
    staleTime: 15_000,
  })

  if (!address) {
    return { xlmBalance: null, rewardBalance: null, isLoading: false, error: null }
  }

  return {
    xlmBalance: query.data?.xlmBalance ?? null,
    rewardBalance: query.data?.rewardBalance ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  }
}
