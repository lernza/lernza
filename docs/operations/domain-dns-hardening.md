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

## Registrar Lock

Enable transfer lock at the registrar immediately after domain registration:

1. Log in to the registrar control panel.
2. Navigate to **Domain Settings → Transfer Lock** (wording varies by provider).
3. Enable lock and verify status shows **Locked** or **Client Transfer Prohibited**.
4. Document the lock status in the [audit checklist](./domain-audit-checklist.md).

Re-lock after any legitimate transfer preparation. Never leave the domain unlocked overnight.

## DNSSEC

DNSSEC adds cryptographic signatures to DNS responses, preventing cache poisoning and spoofing.

### Enable at DNS Provider

1. Open the DNS zone for `lernza.com` in your provider dashboard.
2. Enable **DNSSEC** for the zone.
3. Copy the **DS record** (key tag, algorithm, digest type, digest).
4. Add the DS record at the **registrar** (not the DNS provider).
5. Verify propagation:

```bash
dig +dnssec lernza.com A
# Expect: ad flag in response header, RRSIG records present
```

### Rollback

If DNSSEC causes resolution failures, disable at the registrar first (remove DS record), then at the DNS provider. Allow 24–48 hours for TTL expiry before re-enabling.

## Two-Factor Authentication

Require hardware-backed 2FA (FIDO2/WebAuthn or YubiKey) on:

| Account | Minimum 2FA | Notes |
|:--------|:------------|:------|
| Domain registrar | Hardware key | Disable SMS fallback |
| DNS provider | Hardware key | Separate key from registrar |
| Vercel/hosting | Hardware key | Restrict team member roles |
| Certificate authority (if manual) | Hardware key | Prefer provider-managed certs |

Backup codes must be stored offline in a team safe, not in the same password manager as account passwords.
