/// <reference types="vite/client" />

interface ImportMetaEnv {
  // ── Testnet (default) ────────────────────────────────────────────────────
  readonly VITE_QUEST_CONTRACT_ID: string
  readonly VITE_MILESTONE_CONTRACT_ID: string
  readonly VITE_REWARDS_CONTRACT_ID: string
  readonly VITE_SOROBAN_RPC_URL: string
  readonly VITE_SOROBAN_NETWORK_PASSPHRASE: string

  // ── Per-network contract IDs (preferred over the bare names above) ───────
  readonly VITE_QUEST_CONTRACT_ID_TESTNET?: string
  readonly VITE_MILESTONE_CONTRACT_ID_TESTNET?: string
  readonly VITE_REWARDS_CONTRACT_ID_TESTNET?: string

  readonly VITE_QUEST_CONTRACT_ID_MAINNET?: string
  readonly VITE_MILESTONE_CONTRACT_ID_MAINNET?: string
  readonly VITE_REWARDS_CONTRACT_ID_MAINNET?: string

  // ── Mainnet RPC / passphrase (required when switching to mainnet) ────────
  readonly VITE_SOROBAN_RPC_URL_MAINNET?: string
  readonly VITE_SOROBAN_NETWORK_PASSPHRASE_MAINNET?: string

  // ── Misc ─────────────────────────────────────────────────────────────────
  readonly VITE_USDC_TOKEN_ADDRESS?: string
  readonly VITE_ENABLE_ANALYTICS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
