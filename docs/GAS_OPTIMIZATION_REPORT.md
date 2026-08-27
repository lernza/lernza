# Contract Gas Optimization Report

## Scope and method

This report covers the common write paths in `quest`, `milestone`, and
`rewards`, with particular attention to milestone completion. Measurements in
[GAS_COSTS.md](GAS_COSTS.md) are planning estimates; production release checks
must use `stellar contract invoke --build-only` against the target network and
record the simulated transaction resources before deployment.

## Findings and implemented safeguards

| Path | Cost driver | Optimization in the codebase | Result |
|---|---|---|---|
| `get_milestone_count` | Scanning a milestone list | Persistent `MilestoneCount(quest_id)` counter | O(1) count read |
| `get_quest_completion_rate` | Unbounded enrollee iteration | Explicit, capped page (`MAX_COMPLETION_RATE_PAGE = 100`) | Bounded CPU and read footprint |
| `create_milestones_batch` | Repeated transaction base fee | Batch entry point with `MAX_BATCH_SIZE = 20` | One base transaction fee for a bounded batch |
| `verify_completion` | Repeated completion and reward bookkeeping | Persistent completion flag and idempotent payout record | Duplicate calls fail before a token transfer |
| `refund_pool` | Recomputing outstanding rewards | Persistent reserved-reward and distributed aggregates | Avoids scanning completion history |

## Milestone verification profile

`verify_completion` is intentionally the most expensive normal milestone
operation because it validates the quest/enrollee relationship, writes the
completion state, maintains aggregates, and may mint a certificate. The
estimated profile is approximately four ledger reads and two writes before the
certificate call. It must remain a single verification transaction: splitting
the state update from the reward/certificate actions would introduce a
double-payment or partial-completion risk.

The recommended operational flow is to simulate each production transaction,
reject a transaction that exceeds the deployed resource budget, and use batch
creation for setup rather than batching completions. Completion batching would
make failure recovery and user authorization materially less safe.

## Release checklist

- Run `cargo test --workspace` and `cargo clippy --workspace --all-targets`.
- Build release WASM and verify the size limits in the upgrade runbook.
- Simulate `create_milestone`, `verify_completion`, and `distribute_reward`
  with representative payload sizes on the intended network.
- Record the resulting resource footprint alongside the release's WASM hash.
