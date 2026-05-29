# Lernza Event Indexer

Subscribes to mainnet Soroban contract events and persists them to PostgreSQL for campaign analytics, fraud detection, and operational dashboards.

## Architecture

```
Stellar RPC (getEvents)
        │
        ▼
  Event Subscriber ──► PostgreSQL (contract_events)
        │                      │
        ▼                      ▼
     Sentry              Dashboard views
   (errors)         (v_quest_activity, v_reward_activity)
```

## Subscribed Events

| Contract | Events |
|:---------|:-------|
| Quest | `quest_created`, `enrollee_added`, `enrollee_removed`, … |
| Milestone | `milestone_created`, `milestone_completed`, `certificate_minted`, … |
| Rewards | `reward_funded`, `reward_distributed`, `reward_refunded` |

See [events-reference.md](../../docs/events-reference.md) for full event catalog.

## Setup

```bash
cd services/event-indexer
cp .env.example .env
# Fill in contract IDs, DATABASE_URL, SENTRY_DSN

npm install
npm run db:migrate
npm start
```

## Environment Variables

| Variable | Required | Description |
|:---------|:---------|:------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `QUEST_CONTRACT_ID` | Yes | Mainnet quest contract address |
| `MILESTONE_CONTRACT_ID` | Yes | Mainnet milestone contract address |
| `REWARDS_CONTRACT_ID` | Yes | Mainnet rewards contract address |
| `SOROBAN_RPC_URL` | No | Defaults to mainnet RPC |
| `SENTRY_DSN` | No | Sentry project DSN for error reporting |
| `POLL_INTERVAL_MS` | No | Poll frequency (default 5000) |
| `START_LEDGER` | No | Override initial ledger cursor |

## Dashboard Queries

Pre-built views in PostgreSQL:

```sql
SELECT * FROM v_quest_activity LIMIT 30;
SELECT * FROM v_reward_activity LIMIT 30;
SELECT * FROM v_milestone_completions LIMIT 30;
```

Programmatic access via `src/metrics.ts`.

## Deployment

Run as a long-lived process (systemd, Docker, or Railway). The indexer is stateless except for PostgreSQL cursors in `indexer_cursors`.

See [event-indexer-runbook.md](../../docs/operations/event-indexer-runbook.md) for operational procedures.
