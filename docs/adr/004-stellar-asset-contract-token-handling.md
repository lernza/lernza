# ADR-004: Stellar Asset Contract for Token Handling

- Status: Accepted
- Date: 2026-03-25

## Context

Lernza needs a reliable way to fund quests with tokens and distribute rewards to learners. The team could implement custom token logic inside the rewards contract, but that would duplicate functionality already provided by Stellar's token standard and would increase audit and maintenance burden.

The rewards contract only needs standard token capabilities:

- storing the configured token address,
- transferring funds from the quest funder into the rewards pool, and
- transferring earned rewards from the contract to learners.

The current implementation already models this by storing a token contract address and using Soroban's token client for transfers.

## Decision

Standardize on Stellar Asset Contracts (SACs) for token handling in the MVP.

The rewards contract stores the SAC address during initialization and uses the SAC interface for all token transfers. Lernza does not implement its own token contract or custom token ledger logic for reward distribution.

## Consequences

Using SACs aligns Lernza with the native Stellar token model and reduces custom contract surface area.

This improves interoperability with existing Stellar assets and wallet tooling, and it keeps the rewards contract focused on pool accounting and authorization rather than token mechanics.

The trade-off is that Lernza depends on SAC behavior and asset compatibility. Token-related features beyond the standard transfer model, if ever needed, must be built around SACs or justified by a later decision to introduce additional token-specific abstractions.
