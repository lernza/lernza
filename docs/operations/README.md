# Operations Runbooks

Operational guides for mainnet deployment and ongoing maintenance.

| Runbook | Purpose |
|:--------|:--------|
| [Admin Rotation](./admin-rotation.md) | Emergency admin key rotation |
| [Contract Upgrade](./contract-upgrade-runbook.md) | WASM upgrade operator checklist |
| [Deployment Rollback](./deployment-rollback.md) | Frontend and contract rollback procedures |
| [Domain & DNS Hardening](./domain-dns-hardening.md) | Registrar lock, DNSSEC, 2FA |
| [Domain Audit Checklist](./domain-audit-checklist.md) | Pre-mainnet domain verification |
| [Event Indexer Runbook](./event-indexer-runbook.md) | Mainnet contract event monitoring |
| [Incident Response Playbook](./incident-response.md) | General incident response procedures, escalation, communication |
| [On-Call DNS Access](./on-call-dns-access.md) | DNS incident response |
| [SLA & Error Budget](./sla.md) | Error budgets per surface and Sentry/Vercel alert rules |
| [Status Page Setup](./status-page-setup.md) | Public status page configuration and usage |

## Upgrade Policy

The upgrade model, storage migration patterns, WASM hash pinning, and a full
worked example (adding `MilestoneInfo.tags`) live in
[docs/UPGRADES.md](../UPGRADES.md). Read that document before executing the
upgrade runbook for any breaking or migration-required change.

| [Storage TTL Strategy](../STORAGE_TTL_STRATEGY.md) | Persistent/temporary storage TTL, health checks, expiry risks |
