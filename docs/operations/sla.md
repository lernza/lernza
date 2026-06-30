# Error Budget & Alerting Policy

This document defines Lernza's error budgets per surface, the burn-rate thresholds
that trigger alerts, and the first alert rules wired in Sentry and Vercel.

## Error Budgets

| Surface | Availability Target | Monthly Error Budget | Notes |
|---------|--------------------|-----------------------|-------|
| **Frontend** (Vercel) | 99.5% | ≤ 3.6 hours downtime | Measured by Vercel deployment success rate and Sentry JS error rate |
| **RPC / Stellar API** | 99.0% | ≤ 7.2 hours degraded | Measured by RPC health-check failures logged in `rpc-health.ts` |
| **Smart Contracts** | ~100% | N/A (immutable on-chain) | Contracts cannot go "down"; incident = exploit or fund loss |

### What counts as an error

- **Frontend**: unhandled JS exceptions captured by Sentry (`captureException`) plus 5xx
  responses from Vercel functions.
- **RPC**: failed `simulateTransaction` or `submitTransaction` calls after all retries,
  tracked in `src/lib/contracts/rpc-health.ts`.
- **Contracts**: any on-chain `Error(Contract, #N)` that represents unexpected state
  (not a user-input validation error), or a detected exploit attempt.

## Alert Rules

### Sentry — Frontend Error Rate

> **Rule:** Alert when the error rate for the `lernza` Sentry project exceeds **1%
> of sessions** in a 1-hour sliding window.

Configuration path in Sentry: **Alerts → Issue Alerts → New Alert Rule**

```
Conditions:
  - Event frequency: more than 1% of sessions in 1h

Actions:
  - Notify via email: on-call alias
  - (optional) Notify Slack #incidents channel
```

> **Budget-burn alert:** Set a second rule at **5% in 15 minutes** for fast-burn
> detection (P1 incident threshold from `incident-response.md`).

### Sentry — RPC Error Spike

> **Rule:** Alert when the `rpc_error` tag appears on more than **10 events** in any
> 5-minute window.

This corresponds to the RPC health-check failures emitted in `rpc-health.ts` when
the fallback endpoint is also unreachable.

### Vercel — Deployment Failure

> **Rule:** Vercel sends a webhook on deployment failure. Configure the webhook to
> POST to `#deployments` Slack channel.

Configuration path: **Vercel Dashboard → Project Settings → Webhooks → Add**
- Event: `deployment.error`
- Endpoint: Slack incoming-webhook URL for `#deployments`

### CSP Violation Spike

> **Rule:** Alert in Sentry when the `security` issue type count exceeds **50 events**
> in a 24-hour window.

This catches sustained CSP violation campaigns or misconfigured third-party scripts.
CSP violations arrive via `/api/csp-report` (see `CSP_SECURITY.md`).

## Incident Classification

Use the thresholds below to map a firing alert to the severity scale in
[`incident-response.md`](./incident-response.md):

| Condition | Severity |
|-----------|----------|
| Error rate > 5% in 15 min | P1 |
| Error rate > 1% for > 1 hour | P2 |
| RPC errors > 10 in 5 min | P2 |
| Deployment failure | P3 |
| CSP spike > 50 in 24 h | P3 |
| Error rate > 0.5% trending up | P4 |

## Review Cadence

- Error budget consumption is reviewed at each sprint retrospective.
- If more than **50% of any monthly budget is consumed by the 15th**, the team
  must triage and close contributing issues before adding new features.
- SLA targets are revisited quarterly and before each major release.
