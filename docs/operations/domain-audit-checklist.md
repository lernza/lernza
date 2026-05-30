# Domain Audit Checklist

Complete this checklist before mainnet launch and repeat quarterly.

## Registrar Controls

- [ ] **Registrar lock enabled** — transfer lock prevents unauthorized domain moves
- [ ] **WHOIS privacy** — registrant contact details not publicly exposed
- [ ] **Auto-renew enabled** — domain does not expire unexpectedly
- [ ] **Recovery email verified** — account recovery path tested
- [ ] **2FA enforced** — TOTP or hardware key on all registrar accounts
- [ ] **No shared credentials** — each operator has an individual account

## DNS Provider Controls

- [ ] **2FA enforced** on DNS provider accounts
- [ ] **API tokens scoped** — read-only tokens for CI; write tokens restricted to DNS zone
- [ ] **DNSSEC enabled** — see [domain-dns-hardening.md](./domain-dns-hardening.md#dnssec)
- [ ] **CAA records present** — restrict certificate issuance to approved CAs
- [ ] **No dangling CNAMEs** — every CNAME target resolves to an active resource
- [ ] **TTL reviewed** — production records use appropriate TTL (300–3600 s)

## TLS & Application

- [ ] **HTTPS enforced** — HSTS header configured at edge (Vercel/Netlify)
- [ ] **Certificate auto-renewal** — Let's Encrypt or provider-managed certs active
- [ ] **Redirect apex → www or vice versa** — single canonical hostname

## Monitoring & Alerting

- [ ] **DNS change alerts** — notify on-call when A/AAAA/CNAME/TXT records change
- [ ] **Certificate expiry alerts** — 30-day and 7-day warnings
- [ ] **Uptime monitoring** — external probe on `https://lernza.com/`

## Sign-Off

| Role | Name | Date | Signature |
|:-----|:-----|:-----|:----------|
| Infrastructure lead | | | |
| Security reviewer | | | |
