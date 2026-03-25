# ADR-001: Quest Entity Model and Naming

- Status: Accepted
- Date: 2026-03-25

## Context

Lernza needs a single top-level product concept that represents a learning journey created by an owner, joined by learners, structured by milestones, and funded with tokens. The codebase started with the term `workspace`, which fits an internal container model but does not communicate the product intent clearly to users. Other options such as `course`, `program`, or `workspace` each introduce problems:

- `course` suggests a fixed curriculum and classroom-style delivery, which is narrower than Lernza's mentor, DAO, and team onboarding use cases.
- `program` is broad, but it does not naturally imply participant progress, milestones, or reward-driven completion.
- `workspace` is implementation-friendly, but it reads like a generic software container instead of a mission-oriented learning experience.

The README, roadmap, and UI language already lean toward `Quest`, while the contract package and several function names still use `workspace` during the transition.

## Decision

Use `Quest` as the canonical product and domain term for the top-level Lernza entity.

A Quest is defined as the owner-created container that holds:

- the quest metadata such as name and description,
- the enrolled learners,
- the reward token configuration,
- the milestones that define progress, and
- the funding pool used to pay rewards.

During the MVP transition, `workspace` remains an internal compatibility term in contract names, storage keys, and function signatures where renaming would create unnecessary churn. External documentation, UI copy, and future public APIs should prefer `Quest`, with internal `workspace` identifiers phased out incrementally.

## Consequences

Using `Quest` gives Lernza a differentiated, user-facing concept that matches the product story of commitment, progress, and reward.

The team must now treat `workspace` as legacy terminology and avoid introducing it in new user-facing surfaces. This creates follow-up work to rename contracts, functions, tests, and frontend routes over time.

Keeping a temporary split between external `Quest` language and internal `workspace` identifiers reduces immediate migration risk, but it also means docs and code must clearly acknowledge the transition to avoid confusion for contributors.
