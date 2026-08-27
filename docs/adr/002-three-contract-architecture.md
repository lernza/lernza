# ADR-002: Three-Contract Architecture

- **Status**: Accepted
- **Date**: 2026-03-25

## Context

Lernza's MVP needs on-chain support for three distinct responsibilities:
- managing the top-level quest record and enrollee membership,
- managing milestones and completion verification, and
- managing token funding pools and reward distribution.

Soroban smart contracts operate under explicit binary size limits (256 KB) and state isolation models. Quest management, milestone verification, and token distribution each have different data shapes, authorization models, and failure modes.

## Decision

Implement the core protocol across independent, modular Soroban contracts:
- `quest` contract for quest creation, ownership, and enrollee management.
- `milestone` contract for milestone definition, submission tracking, and completion verification.
- `rewards` contract for token custody, pool funding, and reward payout distribution.

Each contract owns its state and authorization checks, coordinating through shared identifiers and frontend-driven call sequencing.

## Alternatives

- **Monolithic Single-Contract Architecture**:
  - *Description*: Combine all quest, milestone, and reward logic into a single contract binary.
  - *Rejection Rationale*: Centralizing all logic increases binary size near Soroban's 256 KB limit, expands security audit attack surface, and causes upgrades in reward logic to force redeployment of unrelated quest state.
- **Proxy Contract Delegation Pattern**:
  - *Description*: Use an orchestrator proxy contract to route calls between specialized logic modules.
  - *Rejection Rationale*: Introduces unnecessary on-chain hop overhead, higher CPU/Memory gas cost per transaction, and complex authorization delegation state.

## Consequences

- **Positive**: Focused scope per contract, simpler code auditing, independent contract upgrade paths, and smaller WASM binary sizes.
- **Negative / Risks**: Requires cross-contract transaction orchestration on the frontend and careful identifier consistency checks.
