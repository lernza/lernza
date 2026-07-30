import pg from "pg"
import { config } from "./config.js"

let pool: pg.Pool | null = null

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: config.databaseUrl })
  }
  return pool
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

// ─── Indexer Cursors ─────────────────────────────────────────────────────────

export async function getCursor(contractId: string): Promise<number> {
  const result = await getPool().query<{ last_ledger: string }>(
    "SELECT last_ledger FROM indexer_cursors WHERE contract_id = $1",
    [contractId]
  )
  if (result.rows.length === 0) return config.startLedger ?? 0
  return Number(result.rows[0].last_ledger)
}

export async function setCursor(contractId: string, lastLedger: number): Promise<void> {
  await getPool().query(
    `INSERT INTO indexer_cursors (contract_id, last_ledger, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (contract_id) DO UPDATE
     SET last_ledger = EXCLUDED.last_ledger, updated_at = NOW()`,
    [contractId, lastLedger]
  )
}

// ─── Raw Events ──────────────────────────────────────────────────────────────

export interface StoredEvent {
  contractId: string
  contractType: string
  eventName: string
  ledger: number
  txHash: string
  topic: unknown
  payload: unknown
}

export async function insertEvent(event: StoredEvent): Promise<boolean> {
  const result = await getPool().query(
    `INSERT INTO contract_events
       (contract_id, contract_type, event_name, ledger, tx_hash, topic, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (tx_hash, contract_id, event_name, ledger) DO NOTHING
     RETURNING id`,
    [
      event.contractId,
      event.contractType,
      event.eventName,
      event.ledger,
      event.txHash,
      JSON.stringify(event.topic),
      JSON.stringify(event.payload),
    ]
  )
  return result.rowCount !== null && result.rowCount > 0
}

// ─── Quests ──────────────────────────────────────────────────────────────────

export interface QuestRow {
  id: number
  owner: string
  name: string
  description: string
  category: string
  tags: string[]
  tokenAddr: string
  createdAt: number
  visibility: number
  status: number
  deadline: number
  archivedAt: number
  maxEnrollees: number | null
  verified: boolean
  version: number
  firstEventId?: number | null
  lastEventId?: number | null
  lastUpdated: string
}

export async function upsertQuest(quest: Omit<QuestRow, "lastUpdated">): Promise<void> {
  await getPool().query(
    `INSERT INTO quests
       (id, owner, name, description, category, tags, token_addr, created_at,
        visibility, status, deadline, archived_at, max_enrollees, verified, version,
        first_event_id, last_event_id, last_updated)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
     ON CONFLICT (id) DO UPDATE SET
       owner         = EXCLUDED.owner,
       name          = EXCLUDED.name,
       description   = EXCLUDED.description,
       category      = EXCLUDED.category,
       tags          = EXCLUDED.tags,
       token_addr    = EXCLUDED.token_addr,
       visibility    = EXCLUDED.visibility,
       status        = EXCLUDED.status,
       deadline      = EXCLUDED.deadline,
       archived_at   = EXCLUDED.archived_at,
       max_enrollees = EXCLUDED.max_enrollees,
       verified      = EXCLUDED.verified,
       version       = EXCLUDED.version,
       last_event_id = EXCLUDED.last_event_id,
       last_updated  = NOW()`,
    [
      quest.id,
      quest.owner,
      quest.name,
      quest.description,
      quest.category,
      quest.tags,
      quest.tokenAddr,
      quest.createdAt,
      quest.visibility,
      quest.status,
      quest.deadline,
      quest.archivedAt,
      quest.maxEnrollees,
      quest.verified,
      quest.version,
      quest.firstEventId ?? null,
      quest.lastEventId ?? null,
    ]
  )
}

export async function getQuest(questId: number): Promise<QuestRow | null> {
  const result = await getPool().query<QuestRow>(
    "SELECT * FROM quests WHERE id = $1",
    [questId]
  )
  return result.rows[0] ?? null
}

export async function searchQuests(
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<QuestRow[]> {
  const result = await getPool().query(
    `SELECT * FROM quests
     WHERE status = 0
       AND to_tsvector('english', name || ' ' || description || ' ' || category) @@ plainto_tsquery('english', $1)
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [query, limit, offset]
  )
  return result.rows as unknown as QuestRow[]
}

export async function listQuestsByOwner(
  owner: string,
  limit: number = 20,
  offset: number = 0
): Promise<QuestRow[]> {
  const result = await getPool().query(
    "SELECT * FROM quests WHERE owner = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    [owner, limit, offset]
  )
  return result.rows as unknown as QuestRow[]
}

export async function listQuestsByCategory(
  category: string,
  limit: number = 20
): Promise<QuestRow[]> {
  const result = await getPool().query(
    "SELECT * FROM quests WHERE category = $1 AND status = 0 ORDER BY created_at DESC LIMIT $2",
    [category, limit]
  )
  return result.rows as unknown as QuestRow[]
}

// ─── Enrollees ───────────────────────────────────────────────────────────────

export interface EnrolleeRow {
  id: number
  questId: number
  enrollee: string
  enrolledAt: number
  joinMode: "self" | "owner" | "invite"
  status: "active" | "removed" | "left"
  removedAt: number | null
  removedBy: string | null
  createdAt: string
}

export async function insertEnrollee(
  questId: number,
  enrollee: string,
  enrolledAt: number,
  joinMode: "self" | "owner" | "invite"
): Promise<void> {
  await getPool().query(
    `INSERT INTO enrollees (quest_id, enrollee, enrolled_at, join_mode)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [questId, enrollee, enrolledAt, joinMode]
  )
}

export async function markEnrolleeRemoved(
  questId: number,
  enrollee: string,
  removedAt: number,
  removedBy: string,
  status: "removed" | "left" = "removed"
): Promise<void> {
  await getPool().query(
    `UPDATE enrollees
     SET status = $3, removed_at = $4, removed_by = $5
     WHERE quest_id = $1 AND enrollee = $2 AND status = 'active'`,
    [questId, enrollee, status, removedAt, removedBy]
  )
}

export async function getActiveEnrollees(questId: number): Promise<EnrolleeRow[]> {
  const result = await getPool().query(
    "SELECT * FROM enrollees WHERE quest_id = $1 AND status = 'active'",
    [questId]
  )
  return result.rows as unknown as EnrolleeRow[]
}

export async function getEnrolleeQuests(
  enrollee: string,
  limit: number = 20
): Promise<QuestRow[]> {
  const result = await getPool().query(
    `SELECT q.* FROM quests q
     JOIN enrollees e ON e.quest_id = q.id
     WHERE e.enrollee = $1 AND e.status = 'active'
     ORDER BY e.enrolled_at DESC
     LIMIT $2`,
    [enrollee, limit]
  )
  return result.rows as unknown as QuestRow[]
}

export async function isEnrolled(questId: number, enrollee: string): Promise<boolean> {
  const result = await getPool().query(
    "SELECT 1 FROM enrollees WHERE quest_id = $1 AND enrollee = $2 AND status = 'active' LIMIT 1",
    [questId, enrollee]
  )
  return result.rowCount !== null && result.rowCount > 0
}

export async function getEnrolleeCount(questId: number): Promise<number> {
  const result = await getPool().query(
    "SELECT COUNT(*) AS cnt FROM enrollees WHERE quest_id = $1 AND status = 'active'",
    [questId]
  )
  return Number(result.rows[0]?.cnt ?? 0)
}

// ─── Milestones ──────────────────────────────────────────────────────────────

export interface MilestoneRow {
  id: number
  questId: number
  title: string
  description: string
  rewardAmount: number
  requiresPrevious: boolean
  createdAt: number
  lastUpdated: string
}

export async function upsertMilestone(
  milestone: Omit<MilestoneRow, "lastUpdated"> & {
    firstEventId?: number | null
    lastEventId?: number | null
  }
): Promise<void> {
  await getPool().query(
    `INSERT INTO milestones
       (id, quest_id, title, description, reward_amount, requires_previous, created_at,
        first_event_id, last_event_id, last_updated)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     ON CONFLICT (quest_id, id) DO UPDATE SET
       title             = EXCLUDED.title,
       description       = EXCLUDED.description,
       reward_amount     = EXCLUDED.reward_amount,
       requires_previous = EXCLUDED.requires_previous,
       last_event_id     = EXCLUDED.last_event_id,
       last_updated      = NOW()`,
    [
      milestone.id,
      milestone.questId,
      milestone.title,
      milestone.description,
      milestone.rewardAmount,
      milestone.requiresPrevious,
      milestone.createdAt,
      milestone.firstEventId ?? null,
      milestone.lastEventId ?? null,
    ]
  )
}

export async function getMilestones(questId: number): Promise<MilestoneRow[]> {
  const result = await getPool().query(
    "SELECT * FROM milestones WHERE quest_id = $1 ORDER BY id ASC",
    [questId]
  )
  return result.rows as unknown as MilestoneRow[]
}

export async function getMilestoneCount(questId: number): Promise<number> {
  const result = await getPool().query(
    "SELECT COUNT(*) AS cnt FROM milestones WHERE quest_id = $1",
    [questId]
  )
  return Number(result.rows[0]?.cnt ?? 0)
}

// ─── Milestone Completions ───────────────────────────────────────────────────

export interface MilestoneCompletionRow {
  id: number
  questId: number
  milestoneId: number
  enrollee: string
  completedAt: number
  verificationMode: "owner" | "peer_review"
  approvedBy: string[] | null
  requiredApprovals: number | null
  txHash: string | null
}

export async function insertMilestoneCompletion(
  completion: Omit<MilestoneCompletionRow, "id">
): Promise<void> {
  await getPool().query(
    `INSERT INTO milestone_completions
       (quest_id, milestone_id, enrollee, completed_at, verification_mode,
        approved_by, required_approvals, tx_hash, event_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT DO NOTHING`,
    [
      completion.questId,
      completion.milestoneId,
      completion.enrollee,
      completion.completedAt,
      completion.verificationMode,
      completion.approvedBy ?? null,
      completion.requiredApprovals ?? null,
      completion.txHash ?? null,
      null, // event_id
    ]
  )
}

export async function getCompletionsForQuest(questId: number): Promise<MilestoneCompletionRow[]> {
  const result = await getPool().query(
    "SELECT * FROM milestone_completions WHERE quest_id = $1 ORDER BY completed_at DESC",
    [questId]
  )
  return result.rows as unknown as MilestoneCompletionRow[]
}

export async function getEnrolleeCompletions(
  enrollee: string,
  limit: number = 20
): Promise<MilestoneCompletionRow[]> {
  const result = await getPool().query(
    "SELECT * FROM milestone_completions WHERE enrollee = $1 ORDER BY completed_at DESC LIMIT $2",
    [enrollee, limit]
  )
  return result.rows as unknown as MilestoneCompletionRow[]
}

export async function getCompletionCount(questId: number): Promise<number> {
  const result = await getPool().query(
    "SELECT COUNT(*) AS cnt FROM milestone_completions WHERE quest_id = $1",
    [questId]
  )
  return Number(result.rows[0]?.cnt ?? 0)
}

// ─── Reward Distributions ────────────────────────────────────────────────────

export interface RewardDistributionRow {
  id: number
  questId: number
  milestoneId: number
  enrollee: string
  amount: number
  txHash: string
  ledger: number
  distributedAt: number
}

export async function insertRewardDistribution(
  dist: Omit<RewardDistributionRow, "id">
): Promise<void> {
  await getPool().query(
    `INSERT INTO reward_distributions
       (quest_id, milestone_id, enrollee, amount, tx_hash, ledger, distributed_at, event_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT DO NOTHING`,
    [
      dist.questId,
      dist.milestoneId,
      dist.enrollee,
      dist.amount,
      dist.txHash,
      dist.ledger,
      dist.distributedAt,
      null, // event_id
    ]
  )
}

export async function getDistributionsForQuest(
  questId: number,
  limit: number = 50
): Promise<RewardDistributionRow[]> {
  const result = await getPool().query(
    "SELECT * FROM reward_distributions WHERE quest_id = $1 ORDER BY distributed_at DESC LIMIT $2",
    [questId, limit]
  )
  return result.rows as unknown as RewardDistributionRow[]
}

export async function getDistributionsForEnrollee(
  enrollee: string,
  limit: number = 50
): Promise<RewardDistributionRow[]> {
  const result = await getPool().query(
    "SELECT * FROM reward_distributions WHERE enrollee = $1 ORDER BY distributed_at DESC LIMIT $2",
    [enrollee, limit]
  )
  return result.rows as unknown as RewardDistributionRow[]
}

export async function getTotalDistributedForQuest(questId: number): Promise<number> {
  const result = await getPool().query(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM reward_distributions WHERE quest_id = $1",
    [questId]
  )
  return Number(result.rows[0]?.total ?? 0)
}

// ─── Reward Pool Events ──────────────────────────────────────────────────────

export interface RewardPoolEventRow {
  id: number
  questId: number
  actor: string
  operation: "fund" | "distribute" | "refund"
  amount: number
  txHash: string
  ledger: number
  occurredAt: number
}

export async function insertRewardPoolEvent(
  event: Omit<RewardPoolEventRow, "id">
): Promise<void> {
  await getPool().query(
    `INSERT INTO reward_pool_events
       (quest_id, actor, operation, amount, tx_hash, ledger, occurred_at, event_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT DO NOTHING`,
    [
      event.questId,
      event.actor,
      event.operation,
      event.amount,
      event.txHash,
      event.ledger,
      event.occurredAt,
      null, // event_id
    ]
  )
}

export async function getPoolBalance(questId: number): Promise<number> {
  const result = await getPool().query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE operation = 'fund'), 0)
       - COALESCE(SUM(amount) FILTER (WHERE operation IN ('distribute', 'refund')), 0)
       AS balance
     FROM reward_pool_events
     WHERE quest_id = $1`,
    [questId]
  )
  return Number(result.rows[0]?.balance ?? 0)
}

// ─── Certificates ────────────────────────────────────────────────────────────

export interface CertificateRow {
  id: number
  questId: number
  enrollee: string
  tokenId: number
  mintedAt: number
  txHash: string
  revoked: boolean
  revokedAt: number | null
}

export async function insertCertificate(
  cert: Omit<CertificateRow, "id">
): Promise<void> {
  await getPool().query(
    `INSERT INTO certificates
       (quest_id, enrollee, token_id, minted_at, tx_hash, event_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (quest_id, enrollee) DO NOTHING`,
    [
      cert.questId,
      cert.enrollee,
      cert.tokenId,
      cert.mintedAt,
      cert.txHash,
      null, // event_id
    ]
  )
}

export async function getEnrolleeCertificates(
  enrollee: string
): Promise<CertificateRow[]> {
  const result = await getPool().query(
    "SELECT * FROM certificates WHERE enrollee = $1 AND revoked = FALSE ORDER BY minted_at DESC",
    [enrollee]
  )
  return result.rows as unknown as CertificateRow[]
}

export async function getQuestCertificates(questId: number): Promise<CertificateRow[]> {
  const result = await getPool().query(
    "SELECT * FROM certificates WHERE quest_id = $1 ORDER BY minted_at DESC",
    [questId]
  )
  return result.rows as unknown as CertificateRow[]
}

// ─── User Earnings ───────────────────────────────────────────────────────────

export interface UserEarningsRow {
  address: string
  totalEarned: number
  questsEnrolled: number
  questsCompleted: number
  milestonesCompleted: number
  lastActivityAt: number | null
}

export async function upsertUserEarnings(
  address: string,
  delta: {
    totalEarned?: number
    questsEnrolled?: number
    questsCompleted?: number
    milestonesCompleted?: number
  }
): Promise<void> {
  await getPool().query(
    `INSERT INTO user_earnings (address, total_earned, quests_enrolled, quests_completed,
                                milestones_completed, last_activity_at, last_updated)
     VALUES ($1, $2, $3, $4, $5, EXTRACT(EPOCH FROM NOW())::BIGINT, NOW())
     ON CONFLICT (address) DO UPDATE SET
       total_earned         = user_earnings.total_earned + EXCLUDED.total_earned,
       quests_enrolled      = user_earnings.quests_enrolled + EXCLUDED.quests_enrolled,
       quests_completed     = user_earnings.quests_completed + EXCLUDED.quests_completed,
       milestones_completed = user_earnings.milestones_completed + EXCLUDED.milestones_completed,
       last_activity_at     = EXCLUDED.last_activity_at,
       last_updated         = NOW()`,
    [
      address,
      delta.totalEarned ?? 0,
      delta.questsEnrolled ?? 0,
      delta.questsCompleted ?? 0,
      delta.milestonesCompleted ?? 0,
    ]
  )
}

export async function getUserEarnings(address: string): Promise<UserEarningsRow | null> {
  const result = await getPool().query(
    "SELECT * FROM user_earnings WHERE address = $1",
    [address]
  )
  return result.rows[0] as unknown as UserEarningsRow | null
}

export async function getTopEarners(limit: number = 100): Promise<UserEarningsRow[]> {
  const result = await getPool().query(
    "SELECT * FROM user_earnings ORDER BY total_earned DESC LIMIT $1",
    [limit]
  )
  return result.rows as unknown as UserEarningsRow[]
}

// ─── Aggregated Stats ────────────────────────────────────────────────────────

export interface QuestStatsRow {
  questId: number
  enrolledCount: number
  milestoneCount: number
  completionsCount: number
  totalFunded: number
  totalDistributed: number
  completionRate: number | null
  certificatesIssued: number
}

export async function getQuestStats(questId: number): Promise<QuestStatsRow | null> {
  const result = await getPool().query(
    "SELECT * FROM quest_stats WHERE quest_id = $1",
    [questId]
  )
  return result.rows[0] as unknown as QuestStatsRow | null
}

export async function getPlatformStats(): Promise<{
  totalQuests: number
  totalEnrollees: number
  totalDistributed: number
  totalFunded: number
  activeUsers: number
  certificatesIssued: number
}> {
  const result = await getPool().query(`
    SELECT
      (SELECT COUNT(*) FROM quests WHERE status = 0) AS total_quests,
      (SELECT COUNT(DISTINCT enrollee) FROM enrollees WHERE status = 'active') AS total_enrollees,
      (SELECT COALESCE(SUM(total_distributed), 0) FROM quest_stats) AS total_distributed,
      (SELECT COALESCE(SUM(total_funded), 0) FROM quest_stats) AS total_funded,
      (SELECT COUNT(*) FROM user_earnings WHERE last_activity_at IS NOT NULL) AS active_users,
      (SELECT COUNT(*) FROM certificates WHERE revoked = FALSE) AS certificates_issued
  `)
  const row = result.rows[0]
  return {
    totalQuests: Number(row?.total_quests ?? 0),
    totalEnrollees: Number(row?.total_enrollees ?? 0),
    totalDistributed: Number(row?.total_distributed ?? 0),
    totalFunded: Number(row?.total_funded ?? 0),
    activeUsers: Number(row?.active_users ?? 0),
    certificatesIssued: Number(row?.certificates_issued ?? 0),
  }
}

export async function refreshQuestStats(): Promise<void> {
  await getPool().query("SELECT refresh_quest_stats()")
}

// ─── Dashboard Queries ───────────────────────────────────────────────────────

export async function getQuestLeaderboard(limit: number = 20): Promise<QuestStatsRow[]> {
  const result = await getPool().query(
    "SELECT * FROM v_quest_leaderboard LIMIT $1",
    [limit]
  )
  return result.rows as unknown as QuestStatsRow[]
}

export async function getTopEarnersView(limit: number = 100): Promise<UserEarningsRow[]> {
  const result = await getPool().query(
    "SELECT * FROM v_top_earners LIMIT $1",
    [limit]
  )
  return result.rows as unknown as UserEarningsRow[]
}
