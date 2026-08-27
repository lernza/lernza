// frontend/src/lib/env.ts
/**
 * Centralized environment configuration for the Lernza frontend.
 *
 * All environment variables are validated via Zod at import time.
 * Defaults are aligned with config/development.yaml.
 *
 * To switch environments, generate the correct .env.local:
 *   node scripts/load-config.mjs <environment> > frontend/.env.local
 *
 * Supported environments: development, staging, production
 */
import { z } from "zod"

const emptyToUndefined = <T>(val: T) => (val === "" ? undefined : val)

const schema = z.object({
  VITE_SOROBAN_RPC_URL: z
    .preprocess(emptyToUndefined, z.string().url().optional())
    .default("http://localhost:8000/soroban/rpc"),

  VITE_SOROBAN_NETWORK_PASSPHRASE: z
    .preprocess(emptyToUndefined, z.string().optional())
    .default("Standalone Network ; February 2017"),

  VITE_HORIZON_URL: z
    .preprocess(emptyToUndefined, z.string().url().optional())
    .default("http://localhost:8000"),

  VITE_RPC_READ_RATE_LIMIT_CAPACITY: z
    .preprocess(emptyToUndefined, z.coerce.number().int().positive().optional())
    .default(100),

  VITE_RPC_READ_RATE_LIMIT_REFILL_PER_SECOND: z
    .preprocess(emptyToUndefined, z.coerce.number().positive().optional())
    .default(10),

  VITE_SENTRY_DSN: z.preprocess(emptyToUndefined, z.string().optional()).default(""),

  VITE_QUEST_CONTRACT_ID: z.preprocess(emptyToUndefined, z.string().optional()).default(""),

  VITE_MILESTONE_CONTRACT_ID: z.preprocess(emptyToUndefined, z.string().optional()).default(""),

  VITE_REWARDS_CONTRACT_ID: z.preprocess(emptyToUndefined, z.string().optional()).default(""),

  VITE_CERTIFICATE_CONTRACT_ID: z.preprocess(emptyToUndefined, z.string().optional()).default(""),

  VITE_REWARDS_TOKEN_CONTRACT_ID: z.preprocess(emptyToUndefined, z.string().optional()).default(""),

  VITE_USDC_TOKEN_ADDRESS: z.preprocess(emptyToUndefined, z.string().optional()).default(""),

  VITE_ENVIRONMENT: z
    .preprocess(emptyToUndefined, z.enum(["development", "staging", "production"]).optional())
    .default("development"),

  VITE_APP_URL: z.preprocess(emptyToUndefined, z.string().url().optional()).default(""),
})

export const env = schema.parse({
  VITE_SOROBAN_RPC_URL: import.meta.env.VITE_SOROBAN_RPC_URL,
  VITE_SOROBAN_NETWORK_PASSPHRASE: import.meta.env.VITE_SOROBAN_NETWORK_PASSPHRASE,
  VITE_HORIZON_URL: import.meta.env.VITE_HORIZON_URL,
  VITE_RPC_READ_RATE_LIMIT_CAPACITY: import.meta.env.VITE_RPC_READ_RATE_LIMIT_CAPACITY,
  VITE_RPC_READ_RATE_LIMIT_REFILL_PER_SECOND: import.meta.env
    .VITE_RPC_READ_RATE_LIMIT_REFILL_PER_SECOND,
  VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  VITE_QUEST_CONTRACT_ID: import.meta.env.VITE_QUEST_CONTRACT_ID,
  VITE_MILESTONE_CONTRACT_ID: import.meta.env.VITE_MILESTONE_CONTRACT_ID,
  VITE_REWARDS_CONTRACT_ID: import.meta.env.VITE_REWARDS_CONTRACT_ID,
  VITE_CERTIFICATE_CONTRACT_ID: import.meta.env.VITE_CERTIFICATE_CONTRACT_ID,
  VITE_REWARDS_TOKEN_CONTRACT_ID: import.meta.env.VITE_REWARDS_TOKEN_CONTRACT_ID,
  VITE_USDC_TOKEN_ADDRESS: import.meta.env.VITE_USDC_TOKEN_ADDRESS,
  VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
  VITE_APP_URL: import.meta.env.VITE_APP_URL,
})

export type Env = z.infer<typeof schema>

/** True when running in Vite dev server (replaces scattered import.meta.env.DEV reads). */
export const isDev: boolean = import.meta.env.DEV

/** True when running a production build (replaces scattered import.meta.env.PROD reads). */
export const isProd: boolean = import.meta.env.PROD
