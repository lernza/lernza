export type Network = "testnet" | "mainnet"

const STORAGE_KEY = "lernza_network"

export function getNetwork(): Network {
  try {
    return localStorage.getItem(STORAGE_KEY) === "mainnet" ? "mainnet" : "testnet"
  } catch {
    return "testnet"
  }
}

export function setNetwork(network: Network): void {
  try {
    localStorage.setItem(STORAGE_KEY, network)
  } catch {
    // ignore storage errors in SSR/restricted environments
  }
}

export function getNetworkConfig() {
  const n = getNetwork()
  if (n === "mainnet") {
    return {
      network: "mainnet" as const,
      rpcUrl:
        import.meta.env.VITE_SOROBAN_RPC_URL_MAINNET || "https://soroban-mainnet.stellar.org",
      passphrase:
        import.meta.env.VITE_SOROBAN_NETWORK_PASSPHRASE_MAINNET ||
        "Public Global Stellar Network ; September 2015",
      questContractId: import.meta.env.VITE_QUEST_CONTRACT_ID_MAINNET || "",
      milestoneContractId: import.meta.env.VITE_MILESTONE_CONTRACT_ID_MAINNET || "",
      rewardsContractId: import.meta.env.VITE_REWARDS_CONTRACT_ID_MAINNET || "",
    }
  }
  return {
    network: "testnet" as const,
    rpcUrl:
      import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org",
    passphrase:
      import.meta.env.VITE_SOROBAN_NETWORK_PASSPHRASE ||
      "Test SDF Network ; September 2015",
    questContractId:
      import.meta.env.VITE_QUEST_CONTRACT_ID_TESTNET ||
      import.meta.env.VITE_QUEST_CONTRACT_ID ||
      "",
    milestoneContractId:
      import.meta.env.VITE_MILESTONE_CONTRACT_ID_TESTNET ||
      import.meta.env.VITE_MILESTONE_CONTRACT_ID ||
      "",
    rewardsContractId:
      import.meta.env.VITE_REWARDS_CONTRACT_ID_TESTNET ||
      import.meta.env.VITE_REWARDS_CONTRACT_ID ||
      "",
  }
}
