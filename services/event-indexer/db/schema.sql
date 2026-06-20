-- Lernza contract event store
-- Run: psql $DATABASE_URL -f db/schema.sql

CREATE TABLE IF NOT EXISTS contract_events (
  id            BIGSERIAL PRIMARY KEY,
  contract_id   TEXT NOT NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('quest', 'milestone', 'rewards')),
  event_name    TEXT NOT NULL,
  ledger        BIGINT NOT NULL,
  tx_hash       TEXT NOT NULL,
  topic         JSONB NOT NULL DEFAULT '[]',
  payload       JSONB NOT NULL DEFAULT '{}',
  indexed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tx_hash, contract_id, event_name, ledger)
);

CREATE INDEX IF NOT EXISTS idx_events_contract_type ON contract_events (contract_type);
CREATE INDEX IF NOT EXISTS idx_events_event_name ON contract_events (event_name);
CREATE INDEX IF NOT EXISTS idx_events_ledger ON contract_events (ledger DESC);
CREATE INDEX IF NOT EXISTS idx_events_indexed_at ON contract_events (indexed_at DESC);

CREATE TABLE IF NOT EXISTS indexer_cursors (
  contract_id   TEXT PRIMARY KEY,
  last_ledger   BIGINT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dashboard metric views
CREATE OR REPLACE VIEW v_quest_activity AS
SELECT
  date_trunc('day', indexed_at) AS day,
  COUNT(*) FILTER (WHERE event_name = 'quest_created') AS quests_created,
  COUNT(*) FILTER (WHERE event_name = 'enrollee_added') AS enrollments
FROM contract_events
WHERE contract_type = 'quest'
GROUP BY 1
ORDER BY 1 DESC;

CREATE OR REPLACE VIEW v_reward_activity AS
SELECT
  date_trunc('day', indexed_at) AS day,
  COUNT(*) FILTER (WHERE event_name = 'reward_funded') AS fundings,
  COUNT(*) FILTER (WHERE event_name = 'reward_distributed') AS distributions
FROM contract_events
WHERE contract_type = 'rewards'
GROUP BY 1
ORDER BY 1 DESC;

CREATE OR REPLACE VIEW v_milestone_completions AS
SELECT
  date_trunc('day', indexed_at) AS day,
  COUNT(*) AS completions
FROM contract_events
WHERE contract_type = 'milestone' AND event_name = 'milestone_completed'
GROUP BY 1
ORDER BY 1 DESC;
