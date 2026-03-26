# Reward Economics (USDC on Stellar)

- Status: Proposed
- Date: 2026-03-26
- Scope: Quest reward pools funded and paid in USDC on Stellar. This is pool economics, not tokenomics.

## 1. Context

Lernza uses USDC on Stellar as the reward asset and does not mint a custom token.  
The rewards contract currently supports:

- `fund_quest(funder, quest_id, amount)` to deposit into a quest pool
- `distribute_reward(authority, quest_id, milestone_id, enrollee, amount)` to pay from the pool after milestone completion is verified
- `get_pool_balance(quest_id)` for available pool balance

Quest archiving exists, but explicit quest-pool refund withdrawal is not yet implemented in `contracts/rewards`.

## 2. Decisions

### 2.1 Reward pool sizing

1. Minimum quest pool: `1 USDC`.
2. Maximum payout per milestone completion: `min(500 USDC, 25% of initial funded pool)`.
3. Minimum milestone payout: `1 USDC`.

Justification:

- `1 USDC` minimum blocks dust/spam quests while staying accessible for community experiments.
- `500 USDC` absolute cap limits blast radius per mistaken or malicious payout during MVP.
- `25% of initial pool` concentration cap guarantees at least four payout opportunities per quest, which better matches milestone-based learning (instead of single-shot pools).

### 2.2 Funding sufficiency rule

Before opening enrollment, creators must fund:

`required_pool = sum(milestone_reward_i x expected_paid_completions_i)`

Where:

- `expected_paid_completions_i = 1` for fixed single-winner milestone designs.
- `expected_paid_completions_i = max_winners` for competitive milestone designs.
- For open-ended milestones, creators must publish an explicit cap on paid completions and fund to that cap.

If `pool_balance < pending_reward_obligations`, payout actions must be blocked in frontend orchestration until topped up.

### 2.3 Partial refund rules for archived quests

Policy target:

`refundable = pool_balance - reserved_obligations`

Where `reserved_obligations` includes:

- rewards for completions already verified but not yet paid, and
- rewards for submissions in active dispute/review windows.

Rules:

1. Quest must be in `Archived` status before refund.
2. Reserve obligations first; only remainder is refundable.
3. Refund claim opens after a 7-day grace window from archive time to allow final review/dispute processing.
4. Refund recipient is the recorded quest authority/funder address.

Current implementation note:

- Refund withdrawal is **not** available on-chain yet.  
- This policy requires a follow-up rewards-contract method (for example `refund_pool`) with archived-status and obligations checks.

### 2.4 USDC flow

1. Creator (quest owner) creates quest and milestones with reward amounts.
2. Creator calls `fund_quest` to move USDC into the rewards contract pool.
3. Milestone completion is verified (`verify_completion` / peer flow).
4. Authority calls `distribute_reward` with the verified milestone reference.
5. Rewards contract transfers USDC to enrollee and debits quest pool.
6. Remaining pool is available for future milestone payouts (or refund once refund logic is implemented).

## 3. Fee Structure Decision

Decision for MVP: `0% platform fee on distributions`.

Rationale:

- Current contract implementation has no active platform fee path in the shipping interface.
- Zero-fee rewards improve trust and creator adoption at bootstrapping stage.
- Simpler accounting reduces launch risk while core quest/reward flow stabilizes.

Future trigger:

- Re-open fee decision if non-grant revenue cannot cover operations for 2 consecutive quarters.
- Default candidate at that point: `1%` distribution fee with explicit community re-ratification before activation.

Fee collection (future if enabled):

- Deduct fee during `distribute_reward`.
- Send fee to platform treasury address.
- Emit per-distribution fee events for transparent accounting.

## 4. Who Pays Stellar Transaction Fees

Current policy:

- The transaction signer pays network fee for each action they submit.
- In today's flow this is usually the quest creator/authority for funding, verification, and reward distribution transactions.

Optional sponsored model (later):

- Platform may sponsor fees for targeted cohorts (grants, hackathons, or education partnerships) without changing pool economics.

## 5. Sustainability Without a Custom Token

Primary model (in order):

1. Premium SaaS features for creators/organizations (analytics, cohort management, integrations).
2. Program revenue (sponsored quests, enterprise onboarding, managed cohorts).
3. Ecosystem grants and partnerships.
4. Open-source community contributions.

Why no custom token:

- Avoids speculative token overhead and regulatory complexity.
- Keeps Lernza focused on measurable learning outcomes funded in stable currency (USDC).
- Better aligns incentives for learners and funders who budget in fiat terms.

## 6. Community Feedback Plan (GitHub Discussions)

To satisfy acceptance criteria, open a GitHub Discussion titled:

`[RFC] Lernza Reward Economics v1 (USDC on Stellar)`

Collect feedback for 7 days with these required prompts:

1. Is `1 USDC` a reasonable minimum pool floor for anti-spam without excluding real use?
2. Is `min(500 USDC, 25% of initial pool)` the right per-milestone risk cap?
3. Is `0%` distribution fee right for MVP, with `1%` as the default future fallback?
4. Are archived-quest refund rules fair (obligations-first + 7-day window)?

Decision gate:

- Mark this doc as `Accepted` after discussion closes and maintainers post a summary of accepted/declined changes with links to the discussion thread.



