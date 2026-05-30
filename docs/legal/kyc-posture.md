# KYC Posture for Reward Distribution

**Status:** Draft — pending counsel review  
**Last updated:** 2026-05-29

## Summary

Lernza distributes on-chain token rewards to learners who complete quest milestones. Because rewards have monetary value, distribution may trigger securities, money-transmission, or sanctions obligations depending on jurisdiction.

## Current Stance

| Decision | Posture |
|:---------|:--------|
| KYC required for all users | **No** — wallet connection is pseudonymous |
| KYC required above threshold | **Yes** — see [Reward Distribution Policy](./reward-distribution-policy.md) |
| Geo-blocking | **Yes** — restricted jurisdictions blocked at signup/reward claim |
| Age verification | **Self-attestation** — users confirm 18+ in Terms of Service |
| Sanctions screening | **Required** — wallet addresses screened against OFAC SDN list before payout |

## Rationale

1. **Low-friction onboarding** — most learners earn small amounts; full KYC on day one creates unnecessary friction.
2. **Risk-proportional controls** — higher cumulative payouts trigger identity verification.
3. **On-chain transparency** — all distributions are publicly auditable; KYC data stays off-chain.

## Open Questions for Counsel

- [ ] Does Lernza's reward model constitute a securities offering in the US, EU, or target markets?
- [ ] Is Lernza a money transmitter when distributing third-party tokens?
- [ ] What KYC provider and data retention period satisfies GDPR and CCPA?
- [ ] Are quest creators liable for reward tax reporting in their jurisdiction?

## Next Steps

1. Engage counsel specializing in crypto/fintech before mainnet launch.
2. Finalize [Jurisdiction Policy](./jurisdiction-policy.md) based on counsel input.
3. Select a KYC vendor (e.g. Persona, Sumsub) and integrate at the threshold defined in reward policy.
4. Update Terms of Service with counsel-approved language.
