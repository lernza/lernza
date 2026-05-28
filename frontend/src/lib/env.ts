import { z } from "zod"

const DEFAULT_HORIZON_URL = "https://horizon-testnet.stellar.org"

const optionalUrl = z.preprocess(value => {
  if (typeof value !== "string") return value
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}, z.string().url("VITE_HORIZON_URL must be a valid URL").default(DEFAULT_HORIZON_URL))

const clientEnvSchema = z.object({
  VITE_HORIZON_URL: optionalUrl,
})

export interface ClientEnv {
  horizonUrl: string
}

export function parseClientEnv(env: Pick<ImportMetaEnv, "VITE_HORIZON_URL">): ClientEnv {
  const parsed = clientEnvSchema.parse({
    VITE_HORIZON_URL: env.VITE_HORIZON_URL,
  })

  return {
    horizonUrl: parsed.VITE_HORIZON_URL,
  }
}

export const clientEnv = parseClientEnv(import.meta.env)
