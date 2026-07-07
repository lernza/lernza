// frontend/src/lib/env.ts
import { z } from "zod";

// Helper: treat empty string as missing (undefined)
const emptyToUndefined = <T>(val: T) => (val === "" ? undefined : val);

const schema = z.object({
  VITE_SOROBAN_RPC_URL: z
    .preprocess(emptyToUndefined, z.string().url().optional())
    .default("http://localhost:8000/soroban/rpc"),

  VITE_SOROBAN_NETWORK_PASSPHRASE: z
    .preprocess(emptyToUndefined, z.string().optional())
    .default("Test SDF Network ; September 2023"),

  VITE_HORIZON_URL: z
    .preprocess(emptyToUndefined, z.string().url().optional())
    .default("http://localhost:8000"),

  VITE_RPC_READ_RATE_LIMIT_CAPACITY: z
    .preprocess(emptyToUndefined, z.coerce.number().int().positive().optional())
    .default(100),

  VITE_RPC_READ_RATE_LIMIT_REFILL_PER_SECOND: z
    .preprocess(emptyToUndefined, z.coerce.number().positive().optional())
    .default(10),

  VITE_SENTRY_DSN: z
    .preprocess(emptyToUndefined, z.string().optional())
    .default(""),
});

export const env = schema.parse({
  VITE_SOROBAN_RPC_URL: import.meta.env.VITE_SOROBAN_RPC_URL,
  VITE_SOROBAN_NETWORK_PASSPHRASE: import.meta.env.VITE_SOROBAN_NETWORK_PASSPHRASE,
  VITE_HORIZON_URL: import.meta.env.VITE_HORIZON_URL,
  VITE_RPC_READ_RATE_LIMIT_CAPACITY: import.meta.env.VITE_RPC_READ_RATE_LIMIT_CAPACITY,
  VITE_RPC_READ_RATE_LIMIT_REFILL_PER_SECOND:
    import.meta.env.VITE_RPC_READ_RATE_LIMIT_REFILL_PER_SECOND,
  VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
});

// Optional: export the inferred type for use elsewhere
export type Env = z.infer<typeof schema>;
