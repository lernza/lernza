# ADR-003: Frontend Orchestration Pattern for MVP

- Status: Accepted
- Date: 2026-03-25

## Context

Lernza's user flows span multiple contracts. For example, rewarding a learner requires milestone verification in one contract and token distribution in another. A possible design would let contracts call each other directly so that one on-chain entrypoint performs the whole workflow.

For the MVP, cross-contract calls would add complexity in several places:

- more difficult interface coordination between contracts,
- tighter runtime coupling across deployment units,
- harder debugging when a multi-step flow fails, and
- more surface area to secure before the product's basic mechanics are proven.

The current contracts are already designed around explicit sequencing. The milestone contract returns the reward amount on verification, and the rewards contract exposes a separate payout call.

## Decision

Use the frontend as the orchestration layer for MVP flows and avoid cross-contract calls between Lernza contracts.

The frontend is responsible for:

- calling the appropriate contract in the correct order,
- carrying shared identifiers such as quest and milestone IDs across steps,
- handling user confirmation and transaction status, and
- invoking reward distribution only after successful milestone verification.

The contracts remain intentionally decoupled and expose focused entrypoints instead of depending on each other at runtime.

## Consequences

This keeps the contracts simpler and reduces MVP delivery risk by making each on-chain action explicit.

It also makes failures easier to diagnose because each transaction boundary is visible to the client and the user.

The trade-off is that the frontend becomes responsible for more workflow logic, including sequencing, retries, and partial-failure handling. If the product later needs stronger atomic guarantees across multiple contract operations, the team may revisit controlled cross-contract composition in a future ADR.
