# Learner removal policy

## Scope

This policy applies to an enrollee in an **active quest**. Removal is an enrollment change; it does not erase work already recorded by the milestone contract.

## Contract rules

| Action | Authority | Allowed state | Outcome |
|---|---|---|---|
| Owner removal | Current quest owner | Active quest, no removal hold | The learner is removed and the next waitlisted learner may be promoted. |
| Learner departure | The learner | Active quest, no removal hold | The learner is removed and the next waitlisted learner may be promoted. |
| Any removal | Any other caller | Any state | Rejected by authorization. |
| Any removal | Owner or learner | Archived/cancelled quest | Rejected because enrollment is closed. |

A removal hold blocks both owner removal and learner departure. The owner uses a hold while a submission is awaiting review or while a verified reward is awaiting settlement. This prevents either path from making an in-flight submission point at a non-enrollee.

## Work and rewards

Verified milestone records, completion timestamps, and earned-reward accounting are owned by the milestone and rewards contracts. Removing a learner from the quest does **not** delete or claw back verified work or rewards. The learner may therefore retain and claim rewards that were already verified under the reward contract’s normal rules.

A pending submission is not a verified milestone. It remains protected from removal while its hold is active and must be resolved by the review flow. If the owner intends to abandon a pending review, the review contract’s pending-reservation release flow must be completed before the hold is lifted; the quest contract does not silently discard cross-contract submission data.

Enrollment-scoped status and removal holds are cleared when removal succeeds, so a later re-enrollment starts with the default active status and cannot inherit a stale block.

## User-facing explanation

The learner-facing UI must state that leaving an active quest removes future participation but does not erase verified work or earned rewards. When removal is blocked, it must explain that a submission is awaiting review or reward settlement and that the learner should wait for the review flow to finish. Owner controls should use the same wording before submitting a removal transaction.

The `enrollee_removed` event is emitted for both owner removal and learner departure, allowing clients to update enrollment lists consistently.

## Test contract

Contract tests cover removal before any completion, blocked removal while a review hold is present, and removal after completion-state data exists. The latter verifies that enrollment cleanup does not alter milestone-side records.
