# Bugfix Requirements Document

## Introduction

The milestone contract generates milestone IDs using a naive per-quest counter stored in persistent contract storage (`NextMilestoneId(quest_id)`). This counter starts at 0 and increments by 1 with each created milestone. If the contract is redeployed (resetting storage) or if a network fork causes divergent state, the counter restarts from 0, producing IDs that collide with IDs already assigned in a prior deployment or fork branch. This breaks the uniqueness assumption relied on by milestone lookups, completion records, and certificate minting.

The fix replaces the counter with a deterministic ID derived from `hash(quest_id + timestamp + nonce)`, making each ID unique across deployments and fork scenarios.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the contract is redeployed and `NextMilestoneId(quest_id)` storage is reset THEN the system generates milestone IDs starting from 0 again, colliding with IDs issued in the previous deployment

1.2 WHEN a network fork produces two divergent chains that each independently increment the same `NextMilestoneId(quest_id)` counter THEN the system assigns the same numeric ID to different milestones on each fork branch, violating ID uniqueness

1.3 WHEN a milestone ID collision occurs THEN the system overwrites the existing `Milestone(quest_id, id)` storage entry with the new milestone data, silently destroying the original milestone record

1.4 WHEN a milestone ID collision occurs THEN the system incorrectly resolves completion records (`Completed(quest_id, id, enrollee)`) for different milestones to the same storage key, causing cross-milestone completion state corruption

### Expected Behavior (Correct)

2.1 WHEN the contract is redeployed and storage is reset THEN the system SHALL generate new milestone IDs that do not collide with IDs issued in any prior deployment, using a deterministic hash of `quest_id + timestamp + nonce`

2.2 WHEN a network fork causes divergent state THEN the system SHALL generate milestone IDs that are unique per fork branch, such that IDs assigned on one branch do not collide with IDs assigned on another

2.3 WHEN a new milestone is created THEN the system SHALL derive its ID deterministically from inputs that include the quest ID, the current ledger timestamp, and a nonce, producing a collision-resistant identifier

2.4 WHEN a milestone ID is generated THEN the system SHALL verify no existing milestone already occupies that ID in storage, and if a collision is detected, SHALL increment the nonce and retry until a free ID is found

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a milestone is created with a valid quest ID, title, description, and reward amount THEN the system SHALL CONTINUE TO store the milestone and return a unique ID to the caller

3.2 WHEN `get_milestone(quest_id, milestone_id)` is called THEN the system SHALL CONTINUE TO return the correct milestone data for the given ID

3.3 WHEN `get_milestones(quest_id)` is called THEN the system SHALL CONTINUE TO return all milestones belonging to that quest

3.4 WHEN `get_milestone_count(quest_id)` is called THEN the system SHALL CONTINUE TO return the accurate count of milestones for the quest

3.5 WHEN `verify_completion` is called with a valid milestone ID THEN the system SHALL CONTINUE TO mark the milestone as completed for the enrollee and return the correct reward amount

3.6 WHEN `create_milestones_batch` is called with a list of milestone inputs THEN the system SHALL CONTINUE TO create all milestones atomically and return a list of their unique IDs

3.7 WHEN a milestone is created with `requires_previous = true` THEN the system SHALL CONTINUE TO enforce that the enrollee completes the prior milestone before the new one can be verified

3.8 WHEN the contract is paused THEN the system SHALL CONTINUE TO reject milestone creation and verification with `Error::Paused`

---

## Bug Condition

**Bug Condition Function:**

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type MilestoneCreationContext
         where X.deployment_count is the number of times the contract has been
         deployed (resets storage), and X.fork_active indicates a network fork
  OUTPUT: boolean

  RETURN X.deployment_count > 1
      OR X.fork_active = true
END FUNCTION
```

**Property: Fix Checking**

```pascal
// Property: Fix Checking — ID uniqueness across redeployments and forks
FOR ALL X WHERE isBugCondition(X) DO
  id ← create_milestone'(X.quest_id, X.title, X.description, X.reward_amount)
  ASSERT id NOT IN previously_issued_ids(X.quest_id)
  ASSERT Milestone(X.quest_id, id) is NOT overwritten by a new creation
END FOR
```

**Property: Preservation Checking**

```pascal
// Property: Preservation Checking — non-redeployment / non-fork scenarios
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT create_milestone'(X) produces a unique ID
  ASSERT get_milestone(quest_id, id) = F(quest_id, id)  // same lookup semantics
  ASSERT get_milestone_count(quest_id) = F_count(quest_id)
END FOR
```
