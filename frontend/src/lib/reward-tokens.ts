import { env } from "@/lib/env"
import { TokenClient, type TokenMetadata } from "@/lib/contracts/token"

export const REWARD_TOKEN_ALLOWLIST_VERSION = "1.0.0"

export interface RewardToken {
  contractId: string
  symbol: string
  decimals: number
  name: string
  explorerUrl: string
}

const TESTNET_REWARD_TOKEN: RewardToken = {
  contractId: "CDLZFC3SYJYDZXTEVRXTHNKVYKKEFZQJ2HW4QGHZ3KIZZMJDJPTKJ7QG",
  symbol: "USDC",
  decimals: 6,
  name: "USD Coin",
  explorerUrl:
    "https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZXTEVRXTHNKVYKKEFZQJ2HW4QGHZ3KIZZMJDJPTKJ7QG",
}

const REWARD_TOKEN_ALLOWLIST: Record<string, readonly RewardToken[]> = {
  development: [TESTNET_REWARD_TOKEN],
  staging: [TESTNET_REWARD_TOKEN],
  // Mainnet assets must be explicitly reviewed and added before production use.
  production: [],
}

export function getAllowedRewardTokens(environment = env.VITE_ENVIRONMENT): readonly RewardToken[] {
  return REWARD_TOKEN_ALLOWLIST[environment] ?? []
}

export function getConfiguredRewardToken(): RewardToken | null {
  const configuredAddress = env.VITE_REWARDS_TOKEN_CONTRACT_ID || env.VITE_USDC_TOKEN_ADDRESS
  if (!configuredAddress) return null

  return getAllowedRewardTokens().find(token => token.contractId === configuredAddress) ?? null
}

export function validateTokenMetadata(token: RewardToken, metadata: TokenMetadata): string | null {
  if (metadata.symbol !== token.symbol) {
    return `The configured token reports symbol ${metadata.symbol}, but the approved asset is ${token.symbol}.`
  }
  if (metadata.decimals !== token.decimals) {
    return `The configured token reports ${metadata.decimals} decimals, but the approved asset requires ${token.decimals}.`
  }
  if (metadata.name !== token.name) {
    return `The configured token reports name ${metadata.name}, but the approved asset is ${token.name}.`
  }
  return null
}

export async function getVerifiedRewardToken(): Promise<RewardToken> {
  const token = getConfiguredRewardToken()
  if (!token) {
    throw new Error(
      `This network does not have a supported reward token configured. Unsupported tokens cannot be used for quests (allowlist v${REWARD_TOKEN_ALLOWLIST_VERSION}).`
    )
  }

  const metadata = await new TokenClient(token.contractId).getTokenMetadata()
  const metadataError = validateTokenMetadata(token, metadata)
  if (metadataError) throw new Error(`Reward token verification failed: ${metadataError}`)

  return token
}
