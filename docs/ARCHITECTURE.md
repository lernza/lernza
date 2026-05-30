# Architecture

System-level overview of Lernza's four Soroban smart contracts and how the frontend orchestrates them.

## System Overview

Lernza has no backend server. The Stellar blockchain is the backend. All state lives on-chain; the frontend is the orchestration layer that sequences contract calls and presents results to users.

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (React)                    │
│          Freighter wallet signs every transaction        │
└────────┬──────────┬──────────┬──────────────────────────┘
         │          │          │
    ┌────▼───┐ ┌────▼────┐ ┌──▼──────────┐ ┌─────────────┐
    │ Quest  │ │Milestone│ │   Rewards   │ │ Certificate │
    │Contract│ │Contract │ │  Contract   │ │  Contract   │
    └────────┘ └────┬────┘ └─────────────┘ └─────────────┘
                    │ cross-contract calls (read-only)
                    ▼
              Quest Contract
              Certificate Contract
```

**Why four contracts?**
- Single responsibility per contract — easier to audit and upgrade independently.
- Smaller WASM binaries — each stays well under Soroban's 256 KB limit.
- Scoped auth — permissions are enforced per contract.
- No backend — zero infrastructure cost, full on-chain transparency.

**Cross-contract calls** — The milestone contract calls the quest contract to verify ownership and enrollment, and calls the certificate contract to mint NFTs on quest completion. The rewards contract calls both the quest and milestone contracts to verify ownership and completion before paying out. The frontend does not rely on these cross-contract calls directly; it reads state independently.

---

## Contract Interaction Diagrams

### 1. Quest Creation

The owner creates a quest, then adds milestones. The milestone contract cross-calls the quest contract to verify ownership.

```mermaid
sequenceDiagram
    autonumber
    actor Owner
    participant FE as Frontend
    participant Wallet as Freighter
    participant Quest as Quest Contract
    participant Milestone as Milestone Contract

    Owner->>FE: Fill in quest details and milestone drafts
    FE->>Wallet: Sign create_quest(owner, name, description, category, tags, token_addr, visibility, max_enrollees)
    Wallet->>Quest: create_quest(...)
    Quest-->>Wallet: quest_id (e.g. 0)
    Wallet-->>FE: Confirmed — quest_id

    loop For each milestone draft
        FE->>Wallet: Sign create_milestone(owner, quest_id, title, description, reward_amount, requires_previous)
        Wallet->>Milestone: create_milestone(...)
        Milestone->>Quest: get_quest(quest_id) [cross-contract, verify owner]
        Quest-->>Milestone: QuestInfo
        Milestone-->>Wallet: milestone_id
        Wallet-->>FE: Milestone created
    end

    FE-->>Owner: Quest live with milestone list
```

---

### 2. Enrollment

The owner enrolls a learner, or a learner self-enrolls in a public quest.

```mermaid
sequenceDiagram
    autonumber
    actor Owner
    actor Learner
    participant FE as Frontend
    participant Wallet as Freighter
    participant Quest as Quest Contract

    alt Owner-managed enrollment
        Owner->>FE: Select learner to enroll
        FE->>Wallet: Sign add_enrollee(quest_id, enrollee)
        Wallet->>Quest: add_enrollee(quest_id, enrollee)
        Quest-->>Wallet: Ok
        Wallet-->>FE: Enrollment confirmed
    else Learner self-enrolls (public quest)
        Learner->>FE: Click "Join Quest"
        FE->>Wallet: Sign join_quest(enrollee, quest_id)
        Wallet->>Quest: join_quest(enrollee, quest_id)
        Quest-->>Wallet: Ok
        Wallet-->>FE: Enrollment confirmed
    end

    FE->>Quest: get_enrollees(quest_id)
    Quest-->>FE: Updated enrollee list
    FE-->>Learner: Quest unlocked
```

---

### 3. Quest Funding

The quest owner funds the reward pool. The rewards contract verifies the funder is the quest owner via a cross-contract call, then pulls tokens from the funder's wallet.

```mermaid
sequenceDiagram
    autonumber
    actor Owner
    participant FE as Frontend
    participant Wallet as Freighter
    participant Quest as Quest Contract
    participant Rewards as Rewards Contract
    participant Token as Stellar Asset Contract (SAC)

    Owner->>FE: Open funding screen
    FE->>Quest: get_quest(quest_id)
    Quest-->>FE: QuestInfo (token_addr, owner)
    FE->>Rewards: get_pool_balance(quest_id)
    Rewards-->>FE: Current balance

    Owner->>FE: Enter amount and confirm
    FE->>Wallet: Sign fund_quest(funder, quest_id, amount)
    Wallet->>Rewards: fund_quest(funder, quest_id, amount)
    Rewards->>Quest: get_quest(quest_id) [cross-contract, verify owner + token match]
    Quest-->>Rewards: QuestInfo
    Rewards->>Token: transfer(funder → rewards_contract, amount)
    Token-->>Rewards: Transfer ok
    Rewards-->>Wallet: Pool credited
    Wallet-->>FE: Funding confirmed

    FE->>Rewards: get_pool_balance(quest_id)
    Rewards-->>FE: Updated balance
    FE-->>Owner: Pool balance shown
```

---

### 4. Milestone Completion and Reward Distribution (Owner Verification)

The standard flow: owner verifies completion, then distributes the reward. Two separate transactions.

```mermaid
sequenceDiagram
    autonumber
    actor Learner
    actor Owner
    participant FE as Frontend
    participant Wallet as Freighter
    participant Quest as Quest Contract
    participant Milestone as Milestone Contract
    participant Rewards as Rewards Contract
    participant Token as Stellar Asset Contract (SAC)

    Learner->>FE: Submit completion proof
    Owner->>FE: Review and approve

    FE->>Quest: is_enrollee(quest_id, learner)
    Quest-->>FE: true
    FE->>Milestone: is_completed(quest_id, milestone_id, learner)
    Milestone-->>FE: false

    FE->>Wallet: Sign verify_completion(owner, quest_id, milestone_id, enrollee)
    Wallet->>Milestone: verify_completion(...)
    Milestone->>Quest: get_quest(quest_id) [cross-contract, verify owner]
    Quest-->>Milestone: QuestInfo
    Milestone->>Quest: is_enrollee(quest_id, learner) [cross-contract]
    Quest-->>Milestone: true
    Milestone-->>Wallet: reward_amount
    Wallet-->>FE: Verified — reward_amount

    FE->>Rewards: get_pool_balance(quest_id)
    Rewards-->>FE: Available balance

    FE->>Wallet: Sign distribute_reward(authority, quest_id, milestone_id, enrollee, amount)
    Wallet->>Rewards: distribute_reward(...)
    Rewards->>Milestone: is_completed(quest_id, milestone_id, enrollee) [cross-contract]
    Milestone-->>Rewards: true
    Rewards->>Milestone: get_milestone_reward(quest_id, milestone_id) [cross-contract, validate amount]
    Milestone-->>Rewards: expected_amount
    Rewards->>Token: transfer(rewards_contract → learner, amount)
    Token-->>Rewards: Transfer ok
    Rewards-->>Wallet: Pool debited, earnings updated
    Wallet-->>FE: Distribution confirmed
    FE-->>Learner: Earnings updated
```

---

### 5. Peer Review Flow

When a quest uses `VerificationMode::PeerReview(n)`, learners submit for review and peers approve.

```mermaid
sequenceDiagram
    autonumber
    actor Learner
    actor Peer
    participant FE as Frontend
    participant Wallet as Freighter
    participant Milestone as Milestone Contract
    participant Rewards as Rewards Contract

    Learner->>FE: Click "Submit for Review"
    FE->>Wallet: Sign submit_for_review(enrollee, quest_id, milestone_id)
    Wallet->>Milestone: submit_for_review(...)
    Milestone-->>Wallet: Ok (pending review)
    Wallet-->>FE: Submission recorded

    loop Until required_approvals reached
        Peer->>FE: Review submission and approve
        FE->>Wallet: Sign approve_completion(peer, quest_id, milestone_id, enrollee)
        Wallet->>Milestone: approve_completion(...)
        alt Threshold not yet reached
            Milestone-->>Wallet: None (more approvals needed)
        else Threshold reached
            Milestone-->>Wallet: Some(reward_amount) — milestone auto-completed
        end
        Wallet-->>FE: Approval recorded
    end

    Note over FE,Rewards: Owner distributes reward after auto-completion
    FE->>Wallet: Sign distribute_reward(authority, quest_id, milestone_id, enrollee, amount)
    Wallet->>Rewards: distribute_reward(...)
    Rewards-->>Wallet: Ok
    Wallet-->>FE: Reward distributed
    FE-->>Learner: Earnings updated
```

---

### 6. Certificate Minting (Automatic on Quest Completion)

When a learner completes all milestones, the milestone contract automatically mints an NFT certificate via a cross-contract call.

```mermaid
sequenceDiagram
    autonumber
    participant Milestone as Milestone Contract
    participant Quest as Quest Contract
    participant Certificate as Certificate Contract

    Note over Milestone: verify_completion or approve_completion called
    Milestone->>Milestone: get_enrollee_completions(quest_id, enrollee)
    Milestone->>Milestone: get_quest_milestone_count(quest_id)

    alt All milestones completed
        Milestone->>Quest: get_quest(quest_id) [cross-contract, get name + category]
        Quest-->>Milestone: QuestInfo
        Milestone->>Certificate: mint_quest_certificate(quest_id, quest_name, quest_category, recipient)
        Certificate-->>Milestone: token_id
        Milestone->>Milestone: emit certificate_minted(quest_id, enrollee)
    end
```

---

### 7. Pool Refund (After Quest Archival)

The quest authority can reclaim unallocated tokens after a quest is archived and a 7-day grace period has elapsed.

```mermaid
sequenceDiagram
    autonumber
    actor Owner
    participant FE as Frontend
    participant Wallet as Freighter
    participant Quest as Quest Contract
    participant Milestone as Milestone Contract
    participant Rewards as Rewards Contract
    participant Token as Stellar Asset Contract (SAC)

    Owner->>FE: Archive quest first
    FE->>Wallet: Sign archive_quest(quest_id)
    Wallet->>Quest: archive_quest(quest_id)
    Quest-->>Wallet: Ok (archived_at timestamp set)

    Note over Owner,Rewards: Wait 7 days (604,800 seconds)

    Owner->>FE: Request refund
    FE->>Wallet: Sign refund_pool(authority, quest_id, amount)
    Wallet->>Rewards: refund_pool(...)
    Rewards->>Quest: get_quest(quest_id) [cross-contract, verify archived + grace period]
    Quest-->>Rewards: QuestInfo (status=Archived, archived_at)
    Rewards->>Milestone: get_total_reserved_reward(quest_id) [cross-contract, calculate obligations]
    Milestone-->>Rewards: reserved_amount
    Rewards->>Token: transfer(rewards_contract → authority, amount)
    Token-->>Rewards: Transfer ok
    Rewards-->>Wallet: Refund complete
    Wallet-->>FE: Confirmed
    FE-->>Owner: Refund received
```

---

## Storage Model

| Contract | Storage Type | What is Stored |
|:---------|:-------------|:---------------|
| Quest | Instance | `NextId`, `Admin`, `Paused` |
| Quest | Persistent | `Quest(id)`, `Enrollees(id)`, `PublicQuests`, `OwnerQuests(addr)`, `EnrolleeQuests(addr)` |
| Milestone | Instance | `Admin`, `Paused`, `QuestContract`, `CertificateContract` |
| Milestone | Persistent | `Milestone(quest,ms)`, `Completed(quest,ms,addr)`, `Mode(quest)`, `VerificationMode(quest)`, earnings, counts |
| Rewards | Instance | `TokenAddr`, `QuestContractAddr`, `MilestoneContractAddr`, `TotalDistributed` |
| Rewards | Persistent | `QuestPool(id)`, `QuestAuthority(id)`, `UserEarnings(addr)`, `PayoutRecord(quest,ms,addr)` |
| Certificate | Instance | NFT collection metadata, owner |
| Certificate | Persistent | `CertificateMetadata(token_id)`, `QuestCertificate(quest,addr)`, `UserCertificates(addr)` |

**TTL policy** — All persistent entries are bumped to 518,400 ledgers (~30 days) on every write, with a refresh threshold of 120,960 ledgers (~7 days). Instance storage is bumped on every state-mutating call.

---

## Privacy Model

`Visibility::Private` is **not a confidentiality feature**. It only removes a quest from public discovery helpers (`list_public_quests`, `get_quests_by_category`). Any caller that knows a quest ID can still read `get_quest`, `get_enrollees`, and `is_enrollee` directly. All on-chain state is public.

---

## Further Reading

- [API Reference](./api-reference.md) — every public function with signatures and error codes
- [Event Reference](./EVENT_REFERENCE.md) — every emitted event with topics and payload
- [Integration Testing](./INTEGRATION_TESTING.md) — local node setup and smoke test walkthrough
- [ADR 002 — Three-contract architecture](./adr/002-three-contract-architecture.md)
- [ADR 003 — Frontend orchestration pattern](./adr/003-frontend-orchestration-pattern.md)
- [ADR 005 — Storage patterns and TTL strategy](./adr/005-storage-patterns-and-ttl-strategy.md)
