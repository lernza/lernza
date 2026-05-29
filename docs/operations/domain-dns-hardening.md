# Domain & DNS Hardening

Mainnet launch increases the blast radius of domain takeover or DNS hijack. This runbook documents the controls required before pointing production traffic at `lernza.com`.

## Scope

| Asset | Provider | Purpose |
|:------|:---------|:--------|
| `lernza.com` | Domain registrar | Primary product domain |
| DNS records | DNS provider (e.g. Cloudflare, Route 53) | A/AAAA, CNAME, TXT, MX |
| TLS certificates | DNS provider or Vercel | HTTPS termination |

## Threat Model

| Threat | Impact | Mitigation |
|:-------|:-------|:-----------|
| Registrar account compromise | Attacker transfers domain away | Registrar lock, 2FA, break-glass contacts |
| DNS record tampering | Traffic redirected to phishing site | DNSSEC, least-privilege DNS API tokens, change alerts |
| Stale DNS delegation | Subdomain takeover via dangling CNAME | Quarterly DNS audit, remove unused records |
| Social engineering of support | Unauthorized unlock/transfer | PIN + verified identity on registrar support calls |

## Prerequisites

- Production domain registered and delegated to the chosen DNS provider.
- Two distinct admin accounts (primary + backup) with hardware 2FA.
- On-call rotation documented in [on-call-dns-access.md](./on-call-dns-access.md).

## Related Documents

- [Domain Audit Checklist](./domain-audit-checklist.md) — pre-mainnet verification checklist
- [On-Call DNS Access](./on-call-dns-access.md) — who can change DNS and how
