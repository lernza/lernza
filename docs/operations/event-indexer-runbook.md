# Event Indexer Runbook

Operational guide for the Lernza mainnet contract event indexer (`services/event-indexer/`).

## Purpose

Once contracts run on mainnet, the frontend alone cannot support campaign analytics or fraud signals. This service:

1. Polls Stellar RPC `getEvents` for quest, milestone, and rewards contracts.
2. Persists events to PostgreSQL (`contract_events` table).
3. Reports errors to Sentry.
4. Exposes dashboard views for key metrics.

## Deployment Checklist

- [ ] PostgreSQL instance provisioned with encrypted storage
- [ ] `db/schema.sql` applied via `npm run db:migrate`
- [ ] Mainnet contract IDs set in environment
- [ ] Sentry DSN configured with `mainnet` environment tag
- [ ] RPC endpoint rate limits understood (default 5 s poll interval)
- [ ] Health check monitors process uptime and last `indexer_cursors.updated_at`

## Starting the Indexer

```bash
cd services/event-indexer
source .env
npm run db:migrate   # idempotent
npm start
```

Expected startup log:

```
[indexer] starting Lernza event indexer
[indexer] RPC: https://soroban-rpc.mainnet.stellar.org
[indexer] contracts: quest, milestone, rewards
[sentry] initialized for environment: mainnet
```

## Monitoring

### Key Metrics

| Metric | Query / Signal |
|:-------|:---------------|
| Events indexed/min | `SELECT COUNT(*) FROM contract_events WHERE indexed_at > NOW() - INTERVAL '1 minute'` |
| Cursor lag | Compare `indexer_cursors.last_ledger` to latest RPC ledger |
| Error rate | Sentry issue count for `@lernza/event-indexer` |
| Fraud signals | `src/metrics.ts` → `getFraudSignals()` |

### Dashboard Views

```sql
-- Daily quest and enrollment activity
SELECT * FROM v_quest_activity LIMIT 7;

-- Daily reward funding and distribution
SELECT * FROM v_reward_activity LIMIT 7;

-- Daily milestone completions
SELECT * FROM v_milestone_completions LIMIT 7;
```

## Incident Response

### Indexer Stopped

1. Check process/container status.
2. Verify PostgreSQL connectivity: `psql $DATABASE_URL -c 'SELECT 1'`.
3. Restart indexer — cursors resume from `indexer_cursors.last_ledger`.

### Cursor Lag > 1000 Ledgers

1. Check RPC endpoint health and rate limits.
2. Temporarily reduce `POLL_INTERVAL_MS` is **not** recommended; instead verify RPC quota.
3. If gap is large, set `START_LEDGER` to last known good ledger and restart.

### Duplicate Events

The `UNIQUE (tx_hash, contract_id, event_name, ledger)` constraint prevents duplicates. `ON CONFLICT DO NOTHING` makes replays safe.

## Related Documents

- [Event Indexer README](../../services/event-indexer/README.md)
- [Events Reference](../events-reference.md)
- [Reward Distribution Policy](../legal/reward-distribution-policy.md) — fraud signals
