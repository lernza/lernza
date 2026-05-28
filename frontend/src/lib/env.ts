import { z } from "zod"

const schema = z.object({
  VITE_SOROBAN_RPC_URL: z.url().optional(),
  VITE_SOROBAN_NETWORK_PASSPHRASE: z.string().optional(),
  VITE_HORIZON_URL: z.url().optional(),
})

export const env = schema.parse({
  VITE_SOROBAN_RPC_URL: import.meta.env.VITE_SOROBAN_RPC_URL,
  VITE_SOROBAN_NETWORK_PASSPHRASE: import.meta.env.VITE_SOROBAN_NETWORK_PASSPHRASE,
  VITE_HORIZON_URL: import.meta.env.VITE_HORIZON_URL,
})
