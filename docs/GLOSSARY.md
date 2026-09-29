# Glossary

Short definitions for the terms used across Lernza's contracts, docs, and frontend. No wallet connection required.

| Term | Definition | Testnet vs Production |
|------|------------|------------------------|
| **Quest** | A learn-to-earn program created by a creator (the quest `owner`), with a name, description, category, tags, visibility (public/private), an optional enrollee cap, and a reward token. Holds one or more milestones. Status is `Active` or `Archived`. | On testnet, quests use test tokens and reset periodically. On mainnet, rewards are real assets. |
| **Milestone** | A single step within a quest that an enrollee must complete to earn a reward. Supports owner- or peer-review verification and flat/custom/competitive distribution modes. | Testnet milestones may be auto-verified for demos. Production requires explicit verification. |
| **Enrollee** | A learner who has joined a quest via open self-join, owner invitation, or redeeming an invite commitment (private quests). Submits completions for verification. | Testnet allows unrestricted self-join. Production may enforce KYC or allow-list rules. |
| **Pool** | Escrow of reward tokens funded via `fund_quest()` in the `rewards` contract. The funder is the pool authority; `distribute_reward()` pays enrollees; unused balance is refundable after the grace period. | Testnet pool uses friendbot-funded accounts. Production pool requires real XLM/USDC. |
| **Wallet** | A Stellar keypair (e.g. Freighter, Albedo) that signs transactions. Required to enroll, submit, and claim. | Testnet wallets are created with friendbot. Production wallets hold real funds. |
| **Contract** | On-chain Soroban program (quest, milestone, rewards) that enforces quest rules without a central server. | Testnet contracts are deployed on Stellar testnet. Production contracts on mainnet have different addresses. |
| **Verification** | Review step that confirms a milestone completion. Can be `owner` (creator approves) or `peer` (other learners approve). | Testnet verification may be mocked. Production is always on-chain. |
| **Transaction** | A Stellar ledger operation (enroll, submit, claim) signed by a wallet and submitted via RPC. | Testnet transactions are free and fast. Production transactions cost a small fee and are final on mainnet. |
| **Escrow** | Funds locked in the contract until conditions (milestone verified) are met, then released. | Testnet escrow uses test tokens. Production escrow locks real value. |
| **Testnet** | Stellar's test network for development. Tokens have no value and the network resets occasionally. | Use testnet to try quests without risk before mainnet. |
| **Grace Period** | Window after a quest ends where unclaimed rewards can be refunded to the funder. | Shorter on testnet for testing. Longer on production. |
| **Funder** | Account that calls `fund_quest()` and becomes the pool authority. | Testnet funders are often the quest creator. Production funders may be sponsors. |

## In-product help

Screens that mention these terms link here. Help icons (`?`) next to Wallet, Testnet, Escrow, Contract, Verification, and Transaction open the relevant definition in a modal without requiring a wallet connection.

## Maintenance

Review this glossary when major terminology changes (new contract, renamed field, new verification mode). The glossary is versioned with docs and checked in CI for broken help links.

## A note on naming

The platform was originally called "Workspace" and is being renamed to "Quest" throughout the codebase. The rename is largely complete — the contract crate, directory, and on-chain APIs (`create_quest`, `fund_quest`, `QuestInfo`) all use "Quest" — but a few legacy references to the old name remain intentionally, such as the `MOCK_WORKSPACES` mock-data identifier and a redirect route for old links. See `CLAUDE.md` for details.
