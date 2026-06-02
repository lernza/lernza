# Lernza Contract Events Reference

This document catalogs all events published by Lernza contracts. Events are indexed by Soroban event listeners and can be used for auditing, analytics, and off-chain state synchronization.

## Event Format

All Lernza events follow a consistent pattern:
- **Topics**: A tuple containing the event name as a Symbol
- **Data**: A tuple containing event-specific parameters

Example:
```rust
env.events().publish(
    (Symbol::new(&env, "event_name"),),
    (param1, param2, param3),
);
```

## Quest Contract Events

### creator_verified
Emitted when an address is verified as a creator by the admin.

- **Topics**: `(creator_verified,)`
- **Data**: `(creator: Address, admin: Address, timestamp: u64)`
- **Emitted by**: `verify_creator()`
- **Use case**: Track creator verification for auditing and access control

### creator_verification_revoked
Emitted when a creator's verification is revoked by the admin.

- **Topics**: `(creator_verification_revoked,)`
- **Data**: `(creator: Address, admin: Address, timestamp: u64)`
- **Emitted by**: `revoke_creator_verification()`
- **Use case**: Track creator access revocation

### admin_transferred
Emitted when admin privileges are transferred to a new address.

- **Topics**: `(admin_transferred,)`
- **Data**: `(previous_admin: Address, new_admin: Address)`
- **Emitted by**: `transfer_admin()`
- **Use case**: Track administrative changes

### quest_created
Emitted when a new quest is created.

- **Topics**: `(quest_created,)`
- **Data**: `(quest_id: u32, owner: Address, name: String)`
- **Emitted by**: `create_quest()`
- **Use case**: Index new quests for discovery and analytics

### quest_updated
Emitted when a quest's metadata is updated.

- **Topics**: `(quest_updated,)`
- **Data**: `(quest_id: u32)`
- **Emitted by**: `update_quest()`
- **Use case**: Track quest modifications

### quest_archived
Emitted when a quest is archived and closed to new enrollments.

- **Topics**: `(quest_archived,)`
- **Data**: `(quest_id: u32)`
- **Emitted by**: `archive_quest()`
- **Use case**: Track quest lifecycle state changes

### enrollee_added
Emitted when an enrollee is added to a quest (by owner or self-enrollment).

- **Topics**: `(enrollee_added,)`
- **Data**: `(quest_id: u32, enrollee: Address)`
- **Emitted by**: `add_enrollee()`, `join_quest()`, `join_quest_with_invite()`
- **Use case**: Track learner enrollment for analytics and notifications

### enrollee_removed
Emitted when an enrollee is removed from a quest.

- **Topics**: `(enrollee_removed,)`
- **Data**: `(quest_id: u32, enrollee: Address)`
- **Emitted by**: `remove_enrollee()`, `leave_quest()`
- **Use case**: Track learner unenrollment

## Milestone Contract Events

### milestone_created
Emitted when a new milestone is created for a quest.

- **Topics**: `(milestone_created,)`
- **Data**: `(milestone_id: u32, quest_id: u32, reward_amount: i128)`
- **Emitted by**: `create_milestone()`, `batch_create_milestones()`
- **Use case**: Index milestones and track reward structure

### milestone_completed
Emitted when an enrollee completes a milestone (owner-verified).

- **Topics**: `(milestone_completed,)`
- **Data**: `(quest_id: u32, milestone_id: u32, enrollee: Address)`
- **Emitted by**: `verify_completion()`
- **Use case**: Track learner progress and trigger reward distribution

### peer_approved
Emitted when a peer approves another enrollee's milestone submission (peer verification mode).

- **Topics**: `(peer_approved,)`
- **Data**: `(milestone_id: u32, quest_id: u32, enrollee: Address, peer: Address, reward_amount: i128)`
- **Emitted by**: `approve_completion()`
- **Use case**: Track peer-to-peer verification and reward amounts

### certificate_minted
Emitted when an NFT certificate is minted for completing all milestones in a quest.

- **Topics**: `(certificate_minted,)`
- **Data**: `(quest_id: u32, enrollee: Address)`
- **Emitted by**: `verify_completion()` (when all milestones complete)
- **Use case**: Track quest completion and certificate issuance

## Rewards Contract Events

### reward_funded
Emitted when tokens are deposited into a quest's reward pool.

- **Topics**: `(reward_funded,)`
- **Data**: `(quest_id: u32, funder: Address, amount: i128)`
- **Emitted by**: `fund_quest()`
- **Use case**: Track funding activity and pool balance changes

### reward_distributed
Emitted when tokens are distributed to an enrollee for completing a milestone.

- **Topics**: `(reward_distributed,)`
- **Data**: `(quest_id: u32, milestone_id: u32, enrollee: Address, amount: i128)`
- **Emitted by**: `distribute_reward()`
- **Use case**: Track reward payouts and learner earnings

### reward_refunded
Emitted when tokens are refunded from a quest's reward pool.

- **Topics**: `(reward_refunded,)`
- **Data**: `(quest_id: u32, authority: Address, amount: i128)`
- **Emitted by**: `refund_quest()`, `refund_available()`
- **Use case**: Track refund activity and pool adjustments

## Event Indexing Patterns

### Discover New Quests
Listen for `quest_created` events to index new quests in real-time:
```
Topic: quest_created
Extract: quest_id, owner, name
```

### Track Learner Progress
Listen for `enrollee_added` and `milestone_completed` events:
```
Topic: enrollee_added → learner enrolled
Topic: milestone_completed → learner progressed
Topic: certificate_minted → learner completed quest
```

### Monitor Funding
Listen for `reward_funded` and `reward_distributed` events:
```
Topic: reward_funded → pool increased
Topic: reward_distributed → learner earned
```

### Audit Administrative Changes
Listen for `creator_verified`, `creator_verification_revoked`, and `admin_transferred`:
```
Topic: creator_verified → access granted
Topic: creator_verification_revoked → access revoked
Topic: admin_transferred → ownership changed
```

## Event Reliability

- All events are published synchronously during transaction execution
- Events are included in the transaction receipt and are immutable
- Event data is indexed by Soroban event listeners and can be queried
- Events are the source of truth for off-chain state synchronization

## Future Events

As Lernza evolves, new events may be added for:
- Deadline enforcement and expiration
- Invite code usage and revocation
- Verification mode changes
- Distribution mode changes
- Pause/unpause state changes
