# ADR-003: Frontend Orchestration Pattern for MVP

- **Status**: Accepted
- **Date**: 2026-03-25

## Context

Lernza's user flows span multiple contracts. For example, rewarding a learner requires milestone verification in the milestone contract and token distribution in the rewards contract. Multi-step contract execution could either be orchestrated on-chain via cross-contract calls, off-chain via a centralized backend server, or on the client side via the frontend application.

## Decision

Use the frontend application (React/TypeScript client) as the sole orchestration layer for MVP flows without requiring a centralized backend API or complex on-chain cross-contract call chains.

The frontend client coordinates operations by:
- Invoking smart contracts in sequential order.
- Passing shared identifiers (quest ID, milestone ID, enrollee address) between function calls.
- Managing user wallet transaction signatures and error recovery.

## Alternatives

- **On-Chain Contract Chaining (Cross-Contract Sub-Invocations)**:
  - *Description*: Have the milestone contract directly invoke the rewards contract during milestone completion.
  - *Rejection Rationale*: Creates tight runtime coupling between contract deployments, increases gas cost per invocation, and complicates cross-contract authorization scoping in Soroban.
- **Centralized Relayer / Backend API Server Orchestration**:
  - *Description*: Build a Node.js/Go backend to receive user webhooks, manage transaction queues, and invoke contracts.
  - *Rejection Rationale*: Introduces server hosting infrastructure costs, introduces single-point-of-failure servers, and compromises decentralization and transparent auditability.

## Consequences

- **Positive**: Zero backend server infrastructure cost, transparent user-driven transaction signing, simplified contract isolation, and easier step-by-step transaction debugging.
- **Negative / Risks**: Frontend must gracefully handle partial transaction failure states (e.g. milestone verified but payout transaction rejected by user).
