# Bug Bounty Policy

Lernza runs a self-hosted bug-bounty program for security research. Reports are
triaged privately through the normal security intake path described in
[`SECURITY.md`](../../SECURITY.md).

## Program host

- Primary intake: GitHub Security Advisories
- Fallback intake: private email to the maintainers if advisories are
  unavailable

## In scope

- Smart contract vulnerabilities
- Wallet-signing or transaction-abuse flows in the frontend
- Authorization bypasses
- Token accounting, pool-drain, or reward-manipulation issues
- Event indexer issues that can materially affect on-chain integrity or safety

## Out of scope

- Purely theoretical issues without impact
- Dependency CVEs already tracked upstream
- Social engineering, phishing, or credential theft

## Reward tiers

Rewards are assigned case-by-case after triage, using the following bands:

| CVSS band | Tier | Typical impact |
|:----------|:-----|:----------------|
| 9.0-10.0 | Critical | Direct token loss, unrestricted admin abuse, or signing compromise |
| 7.0-8.9 | High | Significant privilege escalation or contract-state corruption |
| 4.0-6.9 | Medium | Limited abuse with partial impact or hard preconditions |
| 0.1-3.9 | Low | Informational issues that still improve the program |

## Rules

- Reports must include clear reproduction steps.
- Duplicate reports are credited to the first valid submission.
- Public disclosure is only allowed after explicit written approval from the
  maintainers.
- Researchers who prefer anonymity may request it at submission time.
