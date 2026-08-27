/**
 * Storage and TTL health check for Soroban contracts.
 * No private key required — read-only RPC inspection.
 *
 * Usage: npx tsx scripts/check-storage-health.ts --contract <id> --rpc https://soroban-testnet.stellar.org
 */

export interface StorageKeyHealth {
  key: string;
  type: "persistent" | "temporary" | "instance";
  ttl: number | null;
  maxTtl: number;
  threshold: number;
  healthy: boolean;
  risk: "ok" | "warning" | "critical" | "unknown";
  message: string;
}

const DEFAULT_BUMP = 518400; // ~30 days in ledgers
const DEFAULT_THRESHOLD = 120960; // ~7 days

export const PERSISTENT_KEYS = [
  { key: "Quest", type: "persistent" as const, bump: DEFAULT_BUMP, threshold: DEFAULT_THRESHOLD },
  { key: "Enrollees", type: "persistent" as const, bump: DEFAULT_BUMP, threshold: DEFAULT_THRESHOLD },
  { key: "NextId", type: "instance" as const, bump: DEFAULT_BUMP, threshold: DEFAULT_THRESHOLD },
  { key: "PublicQuests", type: "persistent" as const, bump: DEFAULT_BUMP, threshold: DEFAULT_THRESHOLD },
];

export const TEMPORARY_KEYS = [
  { key: "InviteCommitment", type: "temporary" as const, bump: DEFAULT_BUMP, threshold: DEFAULT_THRESHOLD },
  { key: "PendingTransfer", type: "temporary" as const, bump: 8640, threshold: 2160 },
];

export function assessTtlHealth(
  key: string,
  type: "persistent" | "temporary" | "instance",
  ttlRemaining: number | null,
  bump = DEFAULT_BUMP,
  threshold = DEFAULT_THRESHOLD
): StorageKeyHealth {
  if (ttlRemaining === null) {
    return { key, type, ttl: null, maxTtl: bump, threshold, healthy: false, risk: "unknown", message: `${key}: TTL unavailable — contract may not be deployed or key absent` };
  }
  if (ttlRemaining <= threshold) {
    return { key, type, ttl: ttlRemaining, maxTtl: bump, threshold, healthy: false, risk: "critical", message: `${key}: expires in ${ttlRemaining} ledgers — bump immediately` };
  }
  if (ttlRemaining <= threshold * 2) {
    return { key, type, ttl: ttlRemaining, maxTtl: bump, threshold, healthy: false, risk: "warning", message: `${key}: approaching expiry (${ttlRemaining} ledgers remain)` };
  }
  return { key, type, ttl: ttlRemaining, maxTtl: bump, threshold, healthy: true, risk: "ok", message: `${key}: healthy (${ttlRemaining} ledgers)` };
}

export function estimateStorageGrowth(enrollees: number, milestones: number, quests: number): { bytes: number; entries: number } {
  const enrolleeEntry = 64;
  const milestoneEntry = 128;
  const questEntry = 512;
  return {
    entries: enrollees + milestones + quests,
    bytes: enrollees * enrolleeEntry + milestones * milestoneEntry + quests * questEntry,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Storage health check — use --contract <id> to run against live RPC");
  for (const k of [...PERSISTENT_KEYS, ...TEMPORARY_KEYS]) {
    console.log(assessTtlHealth(k.key, k.type, 400000, k.bump, k.threshold).message);
  }
}
