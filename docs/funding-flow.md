# Funding Flow

This flow shows the workspace authority funding a quest pool through the rewards contract. The rewards contract then moves tokens through the Stellar asset contract and updates the workspace pool balance.

```mermaid
sequenceDiagram
    autonumber
    actor Authority as Workspace Authority
    participant FE as Frontend
    participant Quest as Quest Contract (workspace)
    participant Wallet as Freighter Wallet
    participant Rewards as Rewards Contract
    participant Token as Stellar Asset Contract

    Note over Rewards: Assumes initialize(token_addr) already ran during setup

    Authority->>FE: Open funding screen for a quest
    FE->>Quest: get_workspace(workspace_id)
    Quest-->>FE: token_addr and quest metadata
    FE->>Rewards: get_pool_balance(workspace_id)
    Rewards-->>FE: Current pool balance
    FE->>Wallet: Request signature for fund_workspace(funder, workspace_id, amount)
    Wallet->>Rewards: fund_workspace(funder, workspace_id, amount)
    Rewards->>Token: transfer(funder, rewards_contract, amount)
    Token-->>Rewards: Transfer succeeds
    Rewards-->>Wallet: Pool balance credited
    Wallet-->>FE: Funding transaction confirmed
    FE->>Rewards: get_pool_balance(workspace_id)
    Rewards-->>FE: Updated pool balance
    FE-->>Authority: Show funded quest pool
```
