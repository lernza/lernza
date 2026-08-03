---
title: "Sneaky Runtime Bug in Soroban SDK v22 Storage Extension"
tags: ["#soroban", "#sdk-v22", "#rust", "#smart-contract", "#storage", "#debugging"]
date: 2026-08-02
---

# Sneaky Runtime Bug in Soroban SDK v22 Storage Extension

## Root Cause
In Soroban SDK v22, attempting to extend the Time-To-Live (TTL) of a persistent storage key that **does not exist** causes a fatal runtime panic: HostError: Error(Storage, MissingValue).

## Specific Case in Lernza
The ump function in QuestContract (contracts/quest/src/lib.rs) was unconditionally extending the TTL for QuestVersionHistory. However, QuestVersionHistory is only initialized when a quest is **updated**, not when it is **created**. Thus, the very first create_quest call would crash at the end when ump tried to extend a non-existent key.

## Solution & Best Practice
Always perform an existence check before extending TTL on keys that are not strictly guaranteed to exist at all lifecycle stages of the contract.

**Code Pattern:**
``rust
if env.storage().persistent().has(&DataKey::QuestVersionHistory(quest_id)) {
    common::extend_persistent_ttl(env, &DataKey::QuestVersionHistory(quest_id));
}
``

## Secondary Test Logic Flaws
- **Flaw 1:** Changing a distribution mode *after* a milestone is created is intentionally blocked by the MilestoneContract. Tests must call set_distribution_mode **before** create_ms.
- **Flaw 2:** When testing deadline expirations (DeadlineExpired), merely setting the quest deadline is insufficient. The mock environment timestamp must explicitly be stepped forward beyond the deadline using env.ledger().set_timestamp(...).
