/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_QUEST_CONTRACT_ID: string
  readonly VITE_MILESTONE_CONTRACT_ID: string
  readonly VITE_REWARDS_CONTRACT_ID: string
  readonly VITE_SOROBAN_RPC_URL: string
  readonly VITE_SOROBAN_NETWORK_PASSPHRASE: string
  readonly VITE_HORIZON_URL?: string
  readonly VITE_REWARDS_TOKEN_CONTRACT_ID?: string
  readonly VITE_USDC_TOKEN_ADDRESS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
