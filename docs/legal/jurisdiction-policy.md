# Jurisdiction Policy

**Status:** Draft — pending counsel review  
**Last updated:** 2026-05-29

## Allowed Countries (Tier 1)

Users in these jurisdictions may connect wallets, enroll in quests, and receive rewards up to the standard KYC threshold without additional geo-restrictions:

- United States (excluding sanctioned persons)
- United Kingdom
- Canada
- European Union member states
- Australia
- New Zealand
- Japan
- Singapore
- South Korea

## Restricted Countries (Blocked)

Users connecting from these jurisdictions are **blocked** from reward-eligible actions (enrollment with funded quests, reward claims):

| Country / Region | Reason |
|:-----------------|:-------|
| Cuba | OFAC sanctions |
| Iran | OFAC sanctions |
| North Korea | OFAC sanctions |
| Syria | OFAC sanctions |
| Crimea region | OFAC sanctions |
| Russia (reward claims) | Sanctions + regulatory uncertainty |
| Belarus (reward claims) | Sanctions + regulatory uncertainty |
| China (reward claims) | Crypto distribution restrictions |

## Tier 2 (Allowed with Enhanced KYC)

Users in these jurisdictions may participate but must complete **full KYC before any reward claim**, regardless of amount:

- Brazil
- India
- Nigeria
- Philippines
- Indonesia

## Implementation

1. **IP geolocation** at reward claim time (not wallet connection).
2. **Wallet sanctions screening** via Chainalysis, TRM Labs, or equivalent before every payout.
3. **VPN detection** — flag and require manual review if IP/country mismatch detected.

## Review Cadence

Re-evaluate this list quarterly and within 48 hours of any new OFAC designation or counsel advisory.
