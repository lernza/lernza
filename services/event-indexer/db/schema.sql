-- =============================================================================
-- Lernza Off-Chain Data Schema
-- =============================================================================
-- Run: psql $DATABASE_URL -f db/schema.sql
--
-- This schema provides a denormalized, query-optimised view of on-chain
-- Lernza data. Raw Soroban contract events are indexed into contract_events
-- by the event indexer, and the denormalized tables below are kept in sync
-- via UPSERT/INSERT patterns driven by those events.
--
-- Tables are organised into three tiers:
--   1. Raw event store (existing)     — contract_events, indexer_cursors
--   2. Denormalized entity tables     — quests, enrollees, milestones, etc.
--   3. Aggregated analytics views     — quest_stats, user_earnings, dashboard views
-- =============================================================================

-- =============================================================================
-- TIER 1: Raw Event Store
-- =============================================================================

CREATE TABLE IF NOT EXISTS contract_events (
  id            BIGSERIAL PRIMARY KEY,
  contract_id   TEXT NOT NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('quest', 'milestone', 'rewards', 'certificate')),
  event_name    TEXT NOT NULL,
  ledger        BIGINT NOT NULL,
  tx_hash       TEXT NOT NULL,
  topic         JSONB NOT NULL DEFAULT '[]',
  payload       JSONB NOT NULL DEFAULT '{}',
  indexed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tx_hash, contract_id, event_name, ledger)
);

CREATE INDEX IF NOT EXISTS idx_events_contract_type ON contract_events (contract_type);
CREATE INDEX IF NOT EXISTS idx_events_event_name   ON contract_events (event_name);
CREATE INDEX IF NOT EXISTS idx_events_ledger       ON contract_events (ledger DESC);
CREATE INDEX IF NOT EXISTS idx_events_indexed_at   ON contract_events (indexed_at DESC);

CREATE TABLE IF NOT EXISTS indexer_cursors (
  contract_id   TEXT PRIMARY KEY,
  last_ledger   BIGINT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TIER 2: Denormalized Entity Tables
-- =============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- quests: Single source of truth for quest metadata off-chain.
-- Every quest_created / quest_updated / quest_archived / quest_cancelled event
-- UPSERTS into this table so the frontend has a fast, always-current snapshot.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quests (
  id              INTEGER PRIMARY KEY,
  owner           TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  category        TEXT NOT NULL DEFAULT '',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  token_addr      TEXT NOT NULL,
  created_at      BIGINT NOT NULL,            -- ledger timestamp (u64)
  visibility      SMALLINT NOT NULL DEFAULT 0, -- 0=Public, 1=Private
  status          SMALLINT NOT NULL DEFAULT 0, -- 0=Active, 1=Archived, 2=Cancelled
  deadline        BIGINT NOT NULL DEFAULT 0,
  archived_at     BIGINT NOT NULL DEFAULT 0,
  max_enrollees   INTEGER,
  verified        BOOLEAN NOT NULL DEFAULT FALSE,
  version         INTEGER NOT NULL DEFAULT 1,
  first_event_id  BIGINT REFERENCES contract_events(id),
  last_event_id   BIGINT REFERENCES contract_events(id),
  last_updated    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quests_owner       ON quests (owner);
CREATE INDEX IF NOT EXISTS idx_quests_category     ON quests (category);
CREATE INDEX IF NOT EXISTS idx_quests_status       ON quests (status);
CREATE INDEX IF NOT EXISTS idx_quests_visibility   ON quests (visibility);
CREATE INDEX IF NOT EXISTS idx_quests_created_at   ON quests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quests_last_updated ON quests (last_updated DESC);

-- Full-text search index on quest name + description + category
CREATE INDEX IF NOT EXISTS idx_quests_fts ON quests
  USING GIN (to_tsvector('english', name || ' ' || description || ' ' || category));

-- ──────────────────────────────────────────────────────────────────────────────
-- enrollees: Historical enrollment records.
-- Tracks every enrollee_added / enrollee_removed / leave_quest event so we can
-- answer questions like "who has ever been enrolled in quest X?" and "when were
-- they removed?".
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollees (
  id              BIGSERIAL PRIMARY KEY,
  quest_id        INTEGER NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  enrollee        TEXT NOT NULL,
  enrolled_at     BIGINT NOT NULL,              -- ledger timestamp
  join_mode       TEXT NOT NULL DEFAULT 'self'   -- 'self', 'owner', 'invite'
                    CHECK (join_mode IN ('self', 'owner', 'invite')),
  status          TEXT NOT NULL DEFAULT 'active'  -- 'active', 'removed', 'left')
                    CHECK (status IN ('active', 'removed', 'left')),
  removed_at      BIGINT,                        -- ledger timestamp when removed
  removed_by      TEXT,                           -- address that performed removal
  event_id        BIGINT REFERENCES contract_events(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (quest_id, enrollee, enrolled_at)       -- allow re-enrollment history
);

CREATE INDEX IF NOT EXISTS idx_enrollees_quest_id  ON enrollees (quest_id);
CREATE INDEX IF NOT EXISTS idx_enrollees_enrollee  ON enrollees (enrollee);
CREATE INDEX IF NOT EXISTS idx_enrollees_status    ON enrollees (status);
CREATE INDEX IF NOT EXISTS idx_enrollees_quest_enrollee ON enrollees (quest_id, enrollee);

-- ──────────────────────────────────────────────────────────────────────────────
-- milestones: Milestone definitions per quest.
-- Upserted from milestone_created events. Mutable fields (title, description,
-- reward_amount) are updated on milestone_updated events.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS milestones (
  id                INTEGER NOT NULL,
  quest_id          INTEGER NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  reward_amount     BIGINT NOT NULL DEFAULT 0,  -- i128 stored as int8
  requires_previous BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        BIGINT NOT NULL,
  first_event_id    BIGINT REFERENCES contract_events(id),
  last_event_id     BIGINT REFERENCES contract_events(id),
  last_updated      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (quest_id, id)
);

CREATE INDEX IF NOT EXISTS idx_milestones_quest_id ON milestones (quest_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- milestone_completions: Verification & completion records.
-- Each row records that an enrollee completed a specific milestone and, for
-- peer-review mode, tracks who approved it and how many approvals were needed.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS milestone_completions (
  id                BIGSERIAL PRIMARY KEY,
  quest_id          INTEGER NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  milestone_id      INTEGER NOT NULL,
  enrollee          TEXT NOT NULL,
  completed_at      BIGINT NOT NULL,             -- ledger timestamp
  verification_mode TEXT NOT NULL DEFAULT 'owner' -- 'owner', 'peer_review'
                    CHECK (verification_mode IN ('owner', 'peer_review')),
  approved_by       TEXT[],                       -- array of addresses that approved
  required_approvals INTEGER,                     -- for peer-review
  tx_hash           TEXT,
  event_id          BIGINT REFERENCES contract_events(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (quest_id, milestone_id, enrollee, completed_at),
  FOREIGN KEY (quest_id, milestone_id) REFERENCES milestones(quest_id, id)
);

CREATE INDEX IF NOT EXISTS idx_mc_quest_milestone ON milestone_completions (quest_id, milestone_id);
CREATE INDEX IF NOT EXISTS idx_mc_enrollee        ON milestone_completions (enrollee);
CREATE INDEX IF NOT EXISTS idx_mc_completed_at    ON milestone_completions (completed_at DESC);

-- ──────────────────────────────────────────────────────────────────────────────
-- reward_distributions: Every reward payout ever made.
-- One row per distribute_reward call. Allows queries like "total paid per
-- enrollee" and "rewards paid per quest".
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reward_distributions (
  id              BIGSERIAL PRIMARY KEY,
  quest_id        INTEGER NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  milestone_id    INTEGER NOT NULL,
  enrollee        TEXT NOT NULL,
  amount          BIGINT NOT NULL,               -- i128 raw token units as int8
  tx_hash         TEXT NOT NULL,
  ledger          BIGINT NOT NULL,
  distributed_at  BIGINT NOT NULL,               -- ledger timestamp
  event_id        BIGINT REFERENCES contract_events(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rd_quest_id       ON reward_distributions (quest_id);
CREATE INDEX IF NOT EXISTS idx_rd_enrollee        ON reward_distributions (enrollee);
CREATE INDEX IF NOT EXISTS idx_rd_distributed_at  ON reward_distributions (distributed_at DESC);
CREATE INDEX IF NOT EXISTS idx_rd_quest_enrollee  ON reward_distributions (quest_id, enrollee);

-- ──────────────────────────────────────────────────────────────────────────────
-- reward_pools: Every funding and refund event for a quest's reward pool.
-- The running balance can be computed by summing amounts (positive = fund,
-- negative = refund/withdrawal).
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reward_pool_events (
  id              BIGSERIAL PRIMARY KEY,
  quest_id        INTEGER NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  actor           TEXT NOT NULL,                  -- funder or authority
  operation       TEXT NOT NULL CHECK (operation IN ('fund', 'distribute', 'refund')),
  amount          BIGINT NOT NULL CHECK (amount > 0),  -- always positive; `operation` determines direction
  tx_hash         TEXT NOT NULL,
  ledger          BIGINT NOT NULL,
  occurred_at     BIGINT NOT NULL,
  event_id        BIGINT REFERENCES contract_events(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rpe_quest_id     ON reward_pool_events (quest_id);
CREATE INDEX IF NOT EXISTS idx_rpe_actor        ON reward_pool_events (actor);
CREATE INDEX IF NOT EXISTS idx_rpe_occurred_at  ON reward_pool_events (occurred_at DESC);

-- ──────────────────────────────────────────────────────────────────────────────
-- certificates: Quest-completion NFT certificates.
-- One row per certificate_minted event.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificates (
  id              BIGSERIAL PRIMARY KEY,
  quest_id        INTEGER NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  enrollee        TEXT NOT NULL,
  token_id        INTEGER NOT NULL,
  minted_at       BIGINT NOT NULL,               -- ledger timestamp
  tx_hash         TEXT NOT NULL,
  revoked         BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at      BIGINT,
  event_id        BIGINT REFERENCES contract_events(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (quest_id, enrollee),                   -- one cert per quest per enrollee
  UNIQUE (token_id)                              -- NFT token IDs are globally unique
);

CREATE INDEX IF NOT EXISTS idx_certs_quest_id    ON certificates (quest_id);
CREATE INDEX IF NOT EXISTS idx_certs_enrollee    ON certificates (enrollee);

-- ──────────────────────────────────────────────────────────────────────────────
-- creator_verifications: Audit trail for creator verification state changes.
-- Each verify_creator / revoke_creator_verification event produces a row.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_verifications (
  id              BIGSERIAL PRIMARY KEY,
  creator         TEXT NOT NULL,
  admin           TEXT NOT NULL,
  action          TEXT NOT NULL CHECK (action IN ('verified', 'revoked')),
  timestamp       BIGINT NOT NULL,
  event_id        BIGINT REFERENCES contract_events(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cv_creator ON creator_verifications (creator);

-- =============================================================================
-- TIER 3: Aggregated Tables & Analytics Views
-- =============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- quest_stats: Pre-computed aggregate statistics per quest.
-- Refreshed periodically or on each event via the indexer.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quest_stats (
  quest_id              INTEGER PRIMARY KEY REFERENCES quests(id) ON DELETE CASCADE,
  enrolled_count        INTEGER NOT NULL DEFAULT 0,
  milestone_count       INTEGER NOT NULL DEFAULT 0,
  completions_count     INTEGER NOT NULL DEFAULT 0,
  total_funded          BIGINT NOT NULL DEFAULT 0,   -- i128
  total_distributed     BIGINT NOT NULL DEFAULT 0,   -- i128
  completion_rate       NUMERIC(5,4),                -- ratio 0..1
  certificates_issued   INTEGER NOT NULL DEFAULT 0,
  last_updated          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- user_earnings: Running total of rewards earned per address.
-- Updated on each reward_distribution event.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_earnings (
  address             TEXT PRIMARY KEY,
  total_earned        BIGINT NOT NULL DEFAULT 0,
  quests_enrolled     INTEGER NOT NULL DEFAULT 0,
  quests_completed    INTEGER NOT NULL DEFAULT 0,
  milestones_completed INTEGER NOT NULL DEFAULT 0,
  last_activity_at    BIGINT,
  last_updated        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ue_total_earned ON user_earnings (total_earned DESC);

-- =============================================================================
-- Dashboard & Analytics Views
-- =============================================================================

-- Daily quest creation and enrollment activity (enhanced metrics view)
CREATE OR REPLACE VIEW v_quest_activity AS
SELECT
  date_trunc('day', indexed_at) AS day,
  COUNT(*) FILTER (WHERE event_name = 'quest_created') AS quests_created,
  COUNT(*) FILTER (WHERE event_name = 'quest_updated') AS quests_updated,
  COUNT(*) FILTER (WHERE event_name = 'enrollee_added') AS enrollments,
  COUNT(*) FILTER (WHERE event_name = 'enrollee_removed') AS unenrollments
FROM contract_events
WHERE contract_type = 'quest'
GROUP BY 1
ORDER BY 1 DESC;

-- Daily reward activity (enhanced)
CREATE OR REPLACE VIEW v_reward_activity AS
SELECT
  date_trunc('day', indexed_at) AS day,
  COUNT(*) FILTER (WHERE event_name = 'reward_funded') AS fundings,
  COUNT(*) FILTER (WHERE event_name = 'reward_distributed') AS distributions,
  COUNT(*) FILTER (WHERE event_name = 'reward_refunded') AS refunds
FROM contract_events
WHERE contract_type = 'rewards'
GROUP BY 1
ORDER BY 1 DESC;

-- Daily milestone completions
CREATE OR REPLACE VIEW v_milestone_completions AS
SELECT
  date_trunc('day', indexed_at) AS day,
  COUNT(*) AS completions
FROM contract_events
WHERE contract_type = 'milestone' AND event_name = 'milestone_completed'
GROUP BY 1
ORDER BY 1 DESC;

-- Quest leaderboard: top quests by enrollee count
CREATE OR REPLACE VIEW v_quest_leaderboard AS
SELECT
  q.id,
  q.name,
  q.owner,
  q.category,
  q.status,
  q.created_at,
  COALESCE(qs.enrolled_count, 0) AS enrolled_count,
  COALESCE(qs.milestone_count, 0) AS milestone_count,
  COALESCE(qs.completions_count, 0) AS completions_count,
  COALESCE(qs.total_funded, 0) AS total_funded,
  COALESCE(qs.total_distributed, 0) AS total_distributed,
  COALESCE(qs.certificates_issued, 0) AS certificates_issued
FROM quests q
LEFT JOIN quest_stats qs ON qs.quest_id = q.id
WHERE q.status = 0  -- Active only
ORDER BY enrolled_count DESC, total_distributed DESC;

-- Top earners view
CREATE OR REPLACE VIEW v_top_earners AS
SELECT
  address,
  total_earned,
  quests_completed,
  milestones_completed,
  last_activity_at
FROM user_earnings
ORDER BY total_earned DESC
LIMIT 100;

-- Recent certificate issuances
CREATE OR REPLACE VIEW v_recent_certificates AS
SELECT
  c.id,
  c.quest_id,
  q.name AS quest_name,
  c.enrollee,
  c.token_id,
  c.minted_at
FROM certificates c
JOIN quests q ON q.id = c.quest_id
WHERE c.revoked = FALSE
ORDER BY c.minted_at DESC
LIMIT 100;

-- Per-quest completion progress summary
CREATE OR REPLACE VIEW v_quest_progress AS
SELECT
  q.id AS quest_id,
  q.name AS quest_name,
  qs.enrolled_count,
  qs.milestone_count,
  qs.completions_count,
  CASE
    WHEN qs.enrolled_count > 0 AND qs.milestone_count > 0
      THEN ROUND(qs.completions_count::NUMERIC / (qs.enrolled_count * qs.milestone_count), 4)
    ELSE 0
  END AS overall_progress,
  qs.certificates_issued,
  CASE
    WHEN qs.milestone_count > 0
      THEN ROUND(qs.certificates_issued::NUMERIC / qs.enrolled_count, 4)
    ELSE 0
  END AS completion_rate
FROM quests q
LEFT JOIN quest_stats qs ON qs.quest_id = q.id
WHERE q.status = 0;  -- Active only

-- =============================================================================
-- Maintenance & Cleanup
-- =============================================================================

-- Function to refresh quest_stats from the event tables
-- Can be called on demand or via a cron/scheduler.
CREATE OR REPLACE FUNCTION refresh_quest_stats()
RETURNS void AS $$
BEGIN
  INSERT INTO quest_stats (quest_id, enrolled_count, milestone_count, completions_count,
                           total_funded, total_distributed, certificates_issued, last_updated)
  SELECT
    q.id,
    (SELECT COUNT(DISTINCT enrollee) FROM enrollees WHERE quest_id = q.id AND status = 'active'),
    (SELECT COUNT(*) FROM milestones WHERE quest_id = q.id),
    (SELECT COUNT(*) FROM milestone_completions WHERE quest_id = q.id),
    COALESCE((SELECT SUM(amount) FROM reward_pool_events WHERE quest_id = q.id AND operation = 'fund'), 0),
    COALESCE((SELECT SUM(amount) FROM reward_distributions WHERE quest_id = q.id), 0),
    (SELECT COUNT(*) FROM certificates WHERE quest_id = q.id AND revoked = FALSE),
    NOW()
  FROM quests q
  ON CONFLICT (quest_id) DO UPDATE SET
    enrolled_count        = EXCLUDED.enrolled_count,
    milestone_count       = EXCLUDED.milestone_count,
    completions_count     = EXCLUDED.completions_count,
    total_funded          = EXCLUDED.total_funded,
    total_distributed     = EXCLUDED.total_distributed,
    certificates_issued   = EXCLUDED.certificates_issued,
    completion_rate       = CASE
                              WHEN EXCLUDED.enrolled_count > 0 AND EXCLUDED.milestone_count > 0
                                THEN ROUND(
                                  EXCLUDED.completions_count::NUMERIC /
                                  (EXCLUDED.enrolled_count * EXCLUDED.milestone_count),
                                  4)
                              ELSE NULL
                            END,
    last_updated          = NOW();
END;
$$ LANGUAGE plpgsql;
