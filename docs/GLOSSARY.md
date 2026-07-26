# Glossary

Short definitions for the terms used across Lernza's contracts, docs, and frontend.

**Quest** — A learn-to-earn program created by a creator (the quest `owner`), with a name, description, category, tags, visibility (public/private), an optional enrollee cap, and a reward token. A quest holds one or more milestones and tracks its own lifecycle status (`Active` or `Archived`). Defined by the `quest` contract (`contracts/quest/`).

**Milestone** — A single step within a quest that an enrollee must complete to earn a reward. Milestones support owner- or peer-review verification, and flat/custom/competitive distribution modes for how the reward amount is calculated. Defined by the `milestone` contract (`contracts/milestone/`).

**Enrollee** — A learner who has joined a quest, either by open self-join, owner invitation, or redeeming an invite commitment (for private quests). Enrollees submit milestone completions for verification and receive rewards from the quest's pool.

**Pool** — The escrow of reward tokens funded for a quest via `fund_quest()` in the `rewards` contract. The funder becomes the pool's authority; `distribute_reward()` pays enrollees out of the pool as milestones are verified, and unused balance can be refunded after the quest's grace period.

## A note on naming

The platform was originally called "Workspace" and is being renamed to "Quest" throughout the codebase. The rename is largely complete — the contract crate, directory, and on-chain APIs (`create_quest`, `fund_quest`, `QuestInfo`) all use "Quest" — but a few legacy references to the old name remain intentionally, such as the `MOCK_WORKSPACES` mock-data identifier and a redirect route for old links. See `CLAUDE.md` for details.
