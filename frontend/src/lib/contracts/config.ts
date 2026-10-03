import { env } from "@/lib/env"

export type ContractName = "quest" | "milestone" | "rewards" | "certificate" | "token"

export interface ContractAddresses {
  quest: string | undefined
  milestone: string | undefined
  rewards: string | undefined
  certificate: string | undefined
  token: string | undefined
}

export const contractAddresses: ContractAddresses = Object.freeze({
  quest: env.VITE_QUEST_CONTRACT_ID,
  milestone: env.VITE_MILESTONE_CONTRACT_ID,
  rewards: env.VITE_REWARDS_CONTRACT_ID,
  certificate: env.VITE_CERTIFICATE_CONTRACT_ID,
  token: env.VITE_REWARDS_TOKEN_CONTRACT_ID || env.VITE_USDC_TOKEN_ADDRESS,
})

export function getContractAddress(name: ContractName): string {
  const address = contractAddresses[name]
  if (!address) {
    const variable =
      name === "token" ? "VITE_REWARDS_TOKEN_CONTRACT_ID" : `VITE_${name.toUpperCase()}_CONTRACT_ID`
    throw new Error(`${name} contract not configured. Set ${variable}.`)
  }
  return address
}
