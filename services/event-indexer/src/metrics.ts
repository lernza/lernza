import { getPool } from "./db/client.js"

export interface DailyMetric {
  day: string
  count: number
}

export async function getQuestCreations(days = 30): Promise<DailyMetric[]> {
  const result = await getPool().query<{ day: Date; count: string }>(
    `SELECT date_trunc('day', indexed_at) AS day, COUNT(*) AS count
     FROM contract_events
     WHERE event_name = 'quest_created'
       AND indexed_at >= NOW() - INTERVAL '${days} days'
     GROUP BY 1 ORDER BY 1 DESC`
  )
  return result.rows.map(r => ({ day: r.day.toISOString().slice(0, 10), count: Number(r.count) }))
}

export async function getRewardDistributions(days = 30): Promise<DailyMetric[]> {
  const result = await getPool().query<{ day: Date; count: string }>(
    `SELECT date_trunc('day', indexed_at) AS day, COUNT(*) AS count
     FROM contract_events
     WHERE event_name = 'reward_distributed'
       AND indexed_at >= NOW() - INTERVAL '${days} days'
     GROUP BY 1 ORDER BY 1 DESC`
  )
  return result.rows.map(r => ({ day: r.day.toISOString().slice(0, 10), count: Number(r.count) }))
}

export async function getEnrollmentCount(days = 30): Promise<number> {
  const result = await getPool().query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM contract_events
     WHERE event_name = 'enrollee_added'
       AND indexed_at >= NOW() - INTERVAL '${days} days'`
  )
  return Number(result.rows[0]?.count ?? 0)
}

export async function getFraudSignals(): Promise<
  Array<{ signal: string; wallet_count: number; event_count: number }>
> {
  const result = await getPool().query<{ signal: string; wallet_count: string; event_count: string }>(
    `SELECT
       'rapid_enrollment_reward' AS signal,
       COUNT(DISTINCT payload->>'enrollee') AS wallet_count,
       COUNT(*) AS event_count
     FROM contract_events
     WHERE event_name = 'reward_distributed'
       AND indexed_at >= NOW() - INTERVAL '24 hours'
     HAVING COUNT(*) > 10`
  )
  return result.rows.map(r => ({
    signal: r.signal,
    wallet_count: Number(r.wallet_count),
    event_count: Number(r.event_count),
  }))
}

export async function printDashboardSummary(): Promise<void> {
  const enrollments = await getEnrollmentCount(7)
  const quests = await getQuestCreations(7)
  const rewards = await getRewardDistributions(7)

  console.info("[metrics] last 7 days:")
  console.info(`  enrollments: ${enrollments}`)
  console.info(`  quest creation days: ${quests.length}`)
  console.info(`  reward distribution days: ${rewards.length}`)
}
