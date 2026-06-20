# ADR-002: Three-Contract Architecture

- Status: Accepted
- Date: 2026-03-25

## Context

Lernza's MVP needs on-chain support for three distinct responsibilities:

- managing the top-level quest record and enrollee membership,
- managing milestones and completion verification, and
- managing token funding pools and reward distribution.

One option was a single monolithic contract that owns every workflow end to end. That approach would centralize logic, but it would also bundle unrelated concerns into one deployment unit, increase binary size, and widen the blast radius of every upgrade or bug.

Soroban contracts also benefit from keeping state and authorization boundaries explicit. Quest management, milestone verification, and token distribution each have different data shapes and different failure modes.

## Decision

Implement the MVP as three independent Soroban contracts:

- the quest contract for quest creation and enrollee management,
- the milestone contract for milestone definition and completion tracking, and
- the rewards contract for token custody, funding, and payouts.

Each contract owns its own state and authorization checks. The contracts coordinate through shared identifiers and frontend-driven sequencing rather than being merged into a single monolith.

## Consequences

This separation keeps each contract focused, easier to reason about, and easier to test in isolation.

It also supports smaller WASM artifacts, narrower security review scope, and more flexible upgrades because reward logic can evolve without forcing changes to quest or milestone logic.

The trade-off is additional orchestration complexity. The system must maintain consistent identifiers and call ordering across contracts, and contributors need to understand how the contracts fit together instead of reading one unified module.
