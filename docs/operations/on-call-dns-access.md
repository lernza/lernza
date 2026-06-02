# On-Call DNS Access

Documents who can modify domain registrar and DNS settings, and the escalation path for DNS incidents.

## Access Matrix

| Action | Primary On-Call | Backup On-Call | Requires Approval |
|:-------|:----------------|:---------------|:------------------|
| View DNS records | Yes | Yes | No |
| Add/modify DNS record | Yes | Yes | No (non-prod); Yes (prod apex) |
| Enable/disable DNSSEC | No | No | Security lead + infra lead |
| Unlock registrar transfer lock | No | No | Two-person rule |
| Transfer domain | No | No | Executive + legal |

## On-Call Rotation

1. Primary on-call holds write access to the DNS provider via a scoped API token stored in the team secrets manager.
2. Backup on-call holds read-only access and can be promoted within 15 minutes by the primary.
3. Registrar credentials are **not** stored in shared password managers accessible to all engineers.

## Incident Response

### Suspected DNS Hijack

1. **Contain** — revert unauthorized DNS changes from provider audit log.
2. **Verify** — confirm registrar lock still enabled; check for pending transfer requests.
3. **Communicate** — post status update; warn users via official channels (X, Discord).
4. **Rotate** — invalidate all DNS API tokens; rotate TLS certificates if CA was compromised.
5. **Post-mortem** — document timeline within 48 hours.

### Certificate Expiry

1. Confirm auto-renewal status in Vercel/DNS provider dashboard.
2. If renewal failed, manually trigger re-issue and verify HTTPS within 30 minutes.

## Contact List

| Role | Contact Method |
|:-----|:---------------|
| Primary on-call | PagerDuty rotation `lernza-infra` |
| Security lead | `#security` Slack channel |
| Registrar support | Provider-specific support portal (keep account PIN ready) |
