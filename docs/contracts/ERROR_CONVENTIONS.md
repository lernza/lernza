# Contract Error Code Conventions

## Overview

Each Lernza contract defines its own `Error` enum with `#[contracterror]` and
`#[repr(u32)]`. Error codes are the wire format returned to clients; they must
be stable across upgrades.

## Bands

| Range | Owner | Purpose |
|-------|-------|---------|
| 1 – 99 | Per-contract | Contract-specific errors (may differ between contracts) |
| 400 – 499 | System / cross-cutting | Identical semantics across **all** contracts |

### System band (400+)

These variants carry the **same numeric code and the same meaning** in every
contract that uses them. Frontends and SDKs can catch them without knowing
which contract raised the error.

| Code | Name | Meaning |
|------|------|---------|
| 400 | `Paused` | The contract has been administratively paused; all mutating calls are rejected |

> **Rule:** any new cross-cutting concern (e.g. `RateLimited`, `Deprecated`)
> must be assigned the next free code in the 400–499 band and documented here
> before being added to any contract.

## Per-contract error tables

### Quest contract (`contracts/quest`)

| Code | Variant |
|------|---------|
| 1 | `NotFound` |
| 2 | `Unauthorized` |
| 3 | `InvalidInput` |
| 4 | `AlreadyEnrolled` |
| 6 | `NotEnrolled` |
| 7 | `QuestFull` |
| 8 | `QuestArchived` |
| 9 | `NameTooLong` |
| 10 | `DescriptionTooLong` |
| 11 | `InviteOnly` |
| 13 | `EnrollmentClosed` |
| 14 | `DeadlineExpired` |
| 15 | `InvalidInvite` |
| 16 | `InviteAlreadyUsed` |
| 400 | `Paused` *(system band)* |

### Milestone contract (`contracts/milestone`)

| Code | Variant |
|------|---------|
| 1 | `NotFound` |
| 2 | `Unauthorized` |
| 3 | `InvalidInput` |
| 4 | `AlreadyCompleted` |
| 6 | `InvalidAmount` |
| 7 | `OwnerMismatch` |
| 8 | `NotInitialized` |
| 9 | `AlreadySubmitted` |
| 10 | `NotSubmitted` |
| 11 | `AlreadyApproved` |
| 12 | `NotEnrolled` |
| 13 | `InvalidApprover` |
| 14 | `MilestoneNotUnlocked` |
| 15 | `TitleTooLong` |
| 16 | `DescriptionTooLong` |
| 17 | `BatchTooLarge` |
| 19 | `Overflow` |
| 400 | `Paused` *(system band)* |

### Rewards contract (`contracts/rewards`)

| Code | Variant |
|------|---------|
| 1 | `AlreadyInitialized` |
| 2 | `NotInitialized` |
| 3 | `Unauthorized` |
| 4 | `InsufficientPool` |
| 5 | `InvalidAmount` |
| 6 | `QuestNotFunded` |
| 7 | `QuestLookupFailed` |
| 8 | `MilestoneNotCompleted` |
| 9 | `MilestoneContractNotInitialized` |
| 10 | `ArithmeticOverflow` |
| 11 | `AlreadyPaid` |
| 12 | `InvalidToken` |
| 13 | `RewardAmountMismatch` |
| 14 | `QuestNotArchived` |
| 15 | `RefundWindowNotOpen` |

## Adding new errors

1. Decide: is this cross-cutting (same meaning in ≥2 contracts)?
   - **Yes** → assign the next free code in 400–499, add it to this doc, then
     add the variant to every affected contract with that exact code.
   - **No** → assign the next free code in 1–99 for that contract only.
2. Never reuse a retired code.
3. Update this document in the same PR as the code change.
