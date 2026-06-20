# Counsel Review Requirements

**Status:** Draft  
**Last updated:** 2026-05-29

## Pre-Mainnet Legal Checklist

- [ ] Terms of Service reviewed and approved by counsel
- [ ] Privacy Policy reviewed and approved by counsel
- [ ] KYC posture validated for target jurisdictions
- [ ] Jurisdiction blocklist confirmed with sanctions counsel
- [ ] KYC vendor contract signed (DPA + data processing agreement)
- [ ] Tax reporting obligations documented for US and EU users
- [ ] Cookie/analytics consent mechanism compliant with GDPR

## UI Requirements

The frontend must include counsel-approved legal links in these locations:

| Location | Links Required |
|:---------|:---------------|
| Site footer | Terms of Service, Privacy Policy |
| Wallet connect modal | ToS acceptance checkbox |
| Quest creation (funded) | Creator liability acknowledgment |
| Reward claim flow | ToS + Privacy links, tier disclosure |

Routes:

- `/terms` — Terms of Service
- `/privacy` — Privacy Policy

## Document Ownership

| Document | Owner | Review Frequency |
|:---------|:------|:-----------------|
| Terms of Service | Legal counsel | On feature change |
| Privacy Policy | Legal counsel | Annually + on data model change |
| KYC Posture | Compliance lead | Quarterly |
| Jurisdiction Policy | Compliance lead | Quarterly + on sanctions update |

## Approval Record

| Document | Counsel Firm | Approved Date | Version |
|:---------|:-------------|:--------------|:--------|
| Terms of Service | _Pending_ | | |
| Privacy Policy | _Pending_ | | |
| KYC Posture | _Pending_ | | |
