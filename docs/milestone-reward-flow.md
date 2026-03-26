# Milestone Completion and Reward Distribution Flow

This flow shows the frontend coordinating milestone verification and reward payout as two explicit transactions. The contracts stay decoupled, and the frontend carries the workspace ID, milestone ID, learner address, and verified reward amount across steps.

```mermaid
sequenceDiagram
    autonumber
    actor Learner as Learner
    actor Owner as Quest Owner
    participant FE as Frontend
    participant Wallet as Freighter Wallet
    participant Quest as Quest Contract (workspace)
    participant Milestone as Milestone Contract
    participant Rewards as Rewards Contract
    participant Token as Stellar Asset Contract

    Note over Owner,Rewards: In the smooth MVP path, the quest owner is also the funded workspace authority

    Learner->>FE: Submit completion proof or request review
    Owner->>FE: Open pending milestone review
    FE->>Quest: is_enrollee(workspace_id, learner)
    Quest-->>FE: true
    FE->>Milestone: is_completed(workspace_id, milestone_id, learner)
    Milestone-->>FE: false
    FE->>Wallet: Request owner signature for verify_completion(owner, workspace_id, milestone_id, learner)
    Wallet->>Milestone: verify_completion(owner, workspace_id, milestone_id, learner)
    Milestone-->>Wallet: reward_amount
    Wallet-->>FE: Verification confirmed with reward_amount
    FE->>Rewards: get_pool_balance(workspace_id)
    Rewards-->>FE: Available balance
    FE->>Wallet: Request authority signature for distribute_reward(authority, workspace_id, learner, reward_amount)
    Wallet->>Rewards: distribute_reward(authority, workspace_id, learner, reward_amount)
    Rewards->>Token: transfer(rewards_contract, learner, reward_amount)
    Token-->>Rewards: Transfer succeeds
    Rewards-->>Wallet: Pool debited and earnings updated
    Wallet-->>FE: Distribution confirmed
    FE-->>Learner: Show completed milestone and updated earnings
```
