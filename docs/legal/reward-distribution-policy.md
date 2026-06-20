# Reward Distribution Policy

**Status:** Draft — pending counsel review  
**Last updated:** 2026-05-29

## KYC Threshold Tiers

| Tier | Cumulative Rewards (USD equivalent) | Requirements |
|:-----|:------------------------------------|:-------------|
| Tier 0 | $0 – $99 | Wallet connection only; ToS acceptance |
| Tier 1 | $100 – $999 | Email verification + sanctions screening |
| Tier 2 | $1,000 – $9,999 | Full KYC (government ID + liveness check) |
| Tier 3 | $10,000+ | Enhanced due diligence + manual review |

USD equivalent calculated at payout time using a reputable price oracle for the reward token.

## Payout Rules

1. **Sanctions check** — every payout screened against OFAC SDN before on-chain transfer.
2. **Geo check** — IP and jurisdiction policy applied at claim time.
3. **Cooldown** — Tier 1+ KYC must complete before funds leave the rewards contract; no retroactive clawback of already-distributed Tier 0 amounts under $99.
4. **Creator responsibility** — quest creators funding pools acknowledge they are responsible for tax reporting in their jurisdiction (disclosed in quest creation flow).

## Fraud Signals

The event indexer (see `services/event-indexer/`) feeds the following signals for manual review:

- Same IP claiming rewards across >5 distinct wallet addresses in 24 hours
- Reward claim within 60 seconds of enrollment (bot pattern)
- Payout to address appearing on public blocklists

## Data Retention

| Data Type | Retention | Storage |
|:----------|:----------|:--------|
| KYC documents | 5 years after last activity | Encrypted, off-chain (KYC vendor) |
| Wallet ↔ identity mapping | 5 years after last activity | Encrypted PostgreSQL |
| Sanctions screening results | 7 years | PostgreSQL audit log |
| On-chain transaction hashes | Indefinite | Public blockchain |

## UI Requirements

- Display current tier and remaining allowance before reward claim.
- Link to Terms of Service and Privacy Policy on every reward-eligible screen.
- Show "Identity verification required" modal when Tier 1+ threshold reached.
