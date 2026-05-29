import "dotenv/config"

export interface ContractConfig {
  id: string
  type: "quest" | "milestone" | "rewards"
  topics: string[]
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const config = {
  rpcUrl: process.env.SOROBAN_RPC_URL ?? "https://soroban-rpc.mainnet.stellar.org",
  networkPassphrase:
    process.env.NETWORK_PASSPHRASE ?? "Public Global Stellar Network ; September 2015",
  databaseUrl: requireEnv("DATABASE_URL"),
  sentryDsn: process.env.SENTRY_DSN ?? "",
  sentryEnvironment: process.env.SENTRY_ENVIRONMENT ?? "mainnet",
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 5000),
  startLedger: process.env.START_LEDGER ? Number(process.env.START_LEDGER) : undefined,
  contracts: [
    {
      id: requireEnv("QUEST_CONTRACT_ID"),
      type: "quest" as const,
      topics: [
        "quest_created",
        "quest_updated",
        "quest_archived",
        "enrollee_added",
        "enrollee_removed",
        "creator_verified",
        "creator_verification_revoked",
        "admin_transferred",
      ],
    },
    {
      id: requireEnv("MILESTONE_CONTRACT_ID"),
      type: "milestone" as const,
      topics: [
        "milestone_created",
        "milestone_completed",
        "peer_approved",
        "certificate_minted",
      ],
    },
    {
      id: requireEnv("REWARDS_CONTRACT_ID"),
      type: "rewards" as const,
      topics: ["reward_funded", "reward_distributed", "reward_refunded"],
    },
  ] satisfies ContractConfig[],
}
