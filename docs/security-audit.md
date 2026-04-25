# Lernza Smart Contract Security Audit

**Scope:** All three Soroban contracts — `quest`, `milestone`, `rewards`
**Auditor:** Internal pre-testnet review
**Date:** 2026-03-24
**Branch:** `security/access-control-audit`

---

## Executive Summary

The three contracts implement a learn-to-earn flow where the frontend orchestrates cross-contract calls. The core access control model is sound, but several critical and high-severity issues were found stemming from two root causes:

1. **No cross-contract validation** — The milestone and rewards contracts each cache an "owner" or "authority" independently of the quest contract. Any caller who acts first can seize that role for any quest ID.
2. **Missing authorization guards** — The rewards `initialize` function has no `require_auth()` check; the deployer must race their own deployment to initialize safely.

**Findings by severity:**

| ID | Contract | Severity | Title |
|----|----------|----------|-------|
| CRIT-01 | milestone | Critical | Milestone ownership race condition |
| CRIT-02 | rewards | Critical | `fund_quest` front-running seizes authority |
| HIGH-01 | milestone | High | `verify_completion` does not check enrollment |
| HIGH-02 | rewards | High | `initialize` has no auth guard |
| MED-01 | rewards | Medium | `distribute_reward` bypasses milestone verification |
| MED-02 | rewards | Medium | Authority can distribute rewards to themselves |
| LOW-01 | rewards | Low | Token balance drift from direct transfers |
| INFO-01 | quest | Informational | Read-only functions are ungated (by design) |
| INFO-02 | cross | Informational | Frontend-orchestrated flow creates ordering assumptions |

---

## Threat Triage Matrix

This matrix is a quick, OWASP-style triage view: **asset → threat → mitigation**.

| Asset | Primary threat | Likely impact | Current mitigation | Gaps / follow-ups |
|---|---|---|---|---|
| Quest funds (reward pools) | Unauthorized authority initialization / front-running | Pool drain, loss of funds, stuck quests | Per-function auth checks + storage guards | Cross-contract validation against quest owner (see CRIT-02); initialize/admin auth (see HIGH-02) |
| Enrollment data (enrollee lists, progress) | Forged enrollment/completion state | Unfair rewards, data integrity loss | Quest contract enforces enrollee management | Ensure milestone verification checks enrollment (see HIGH-01); avoid duplicated “authority” state across contracts |
| Certificate metadata (token IDs, ownership) | Incorrect issuance / spoofed proofs | False credentials, reputational damage | Certificate contract ties token ownership to chain | Validate issuance triggers originate from verified completion path; document verification approach for third parties |
| Admin keys (pause/admin roles) | Key compromise / misuse | Global outage, censorship, funds loss | `require_auth()` on admin paths; pause mechanisms | Rotate keys; consider multisig; document key management and incident response |

## Findings

### CRIT-01 — Milestone Ownership Race Condition

**Contract:** `contracts/milestone/src/lib.rs`
**Severity:** Critical
**Function:** `create_milestone`

#### Description

The milestone contract stores a quest owner the first time `create_milestone` is called for a given `quest_id`. This cached owner is the sole authorization gate for all future milestone creation and completion verification on that quest.

There is **no cross-contract validation** against the quest contract. Any address that calls `create_milestone` first for a given `quest_id` becomes the permanent milestone authority for that quest, regardless of who actually owns the quest.

**Vulnerable code** (`milestone/src/lib.rs:72-82`):

```rust
let owner_key = DataKey::Owner(quest_id);
if let Some(stored_owner) = env.storage().persistent().get::<_, Address>(&owner_key) {
    if stored_owner != owner {
        return Err(Error::OwnerMismatch);
    }
} else {
    // First caller for this quest_id wins — no validation against quest contract
    env.storage().persistent().set(&owner_key, &owner);
}
```

#### Attack Scenario

1. Alice creates quest `quest_id=5` in the quest contract.
2. Bob (attacker) observes the creation event (ledger data is public).
3. Bob calls `create_milestone(bob_address, 5, "backdoor", 9999)` before Alice does.
4. Bob is now the permanent milestone authority for quest 5.
5. Bob can call `verify_completion` and trigger reward distributions; Alice cannot create any milestones for her own quest.

This is exploitable within the same ledger close (~5 seconds) or any time before Alice's first `create_milestone` call.

#### Fix

Require callers to pass a quest contract address and cross-call `get_quest` to validate the owner:

```rust
// Pseudocode — one approach
let ws_client = QuestContractClient::new(&env, &quest_contract_addr);
let ws = ws_client.get_quest(&quest_id).map_err(|_| Error::NotFound)?;
if ws.owner != owner {
    return Err(Error::Unauthorized);
}
```

Alternatively, store the quest contract address at milestone contract initialization time and use it for every ownership check.

---

### CRIT-02 — `fund_quest` Front-Running Seizes Rewards Authority

**Contract:** `contracts/rewards/src/lib.rs`
**Severity:** Critical
**Function:** `fund_quest`

#### Description

Similar to CRIT-01, the rewards contract assigns quest authority to whoever calls `fund_quest` first for a given `quest_id`. Any subsequent caller receives `Unauthorized`, even the legitimate quest owner.

**Vulnerable code** (`rewards/src/lib.rs:80-90`):

```rust
let auth_key = DataKey::QuestAuthority(quest_id);
if let Some(existing) = env.storage().persistent().get::<_, Address>(&auth_key) {
    if existing != funder {
        return Err(Error::Unauthorized);  // legitimate owner locked out
    }
} else {
    // First funder wins unconditionally
    env.storage().persistent().set(&auth_key, &funder);
}
```

#### Attack Scenario

1. Alice creates quest `quest_id=5` and is about to fund the reward pool.
2. Bob calls `fund_quest(bob_address, 5, 1)` with a 1-token deposit.
3. Bob is now the authority for quest 5's reward pool.
4. Alice's `fund_quest` call returns `Unauthorized`.
5. Bob can distribute his 1 token to himself, and the quest can never be funded legitimately.

#### Fix

Validate the `funder` against the quest contract's owner before setting authority:

```rust
let ws_client = QuestContractClient::new(&env, &quest_contract_addr);
let ws = ws_client.get_quest(&quest_id).map_err(|_| Error::QuestNotFunded)?;
if ws.owner != funder {
    return Err(Error::Unauthorized);
}
```

The quest contract address should be stored at rewards contract initialization.

---

### HIGH-01 — `verify_completion` Does Not Check Enrollment

**Contract:** `contracts/milestone/src/lib.rs`
**Severity:** High
**Function:** `verify_completion`
**Related issue:** #84

#### Description

`verify_completion` accepts any `enrollee: Address` and marks it as having completed a milestone. There is no check that the address is actually enrolled in the quest. An owner can issue completion records and trigger reward distributions for arbitrary addresses — including addresses with no relationship to the quest.

**Vulnerable code** (`milestone/src/lib.rs:107-143`): The function validates the milestone exists and checks for double-completion, but never verifies the `enrollee` is enrolled.

#### Impact

- Owner (or attacker who seized milestone authority via CRIT-01) can mark anyone as a milestone completer.
- Combined with CRIT-01, an attacker can verify completions for addresses they control and drain the reward pool.

#### Fix

Cross-call the quest contract's `is_enrollee` before marking completion:

```rust
let ws_client = QuestContractClient::new(&env, &quest_contract_addr);
let enrolled = ws_client.is_enrollee(&quest_id, &enrollee);
if !enrolled {
    return Err(Error::Unauthorized);
}
```

---

### HIGH-02 — `initialize` Has No Authorization Guard

**Contract:** `contracts/rewards/src/lib.rs`
**Severity:** High
**Function:** `initialize`

#### Description

The `initialize` function sets the reward token address and can only be called once (guarded by `AlreadyInitialized`). However, there is no `require_auth()` call — any address can call it before the legitimate deployer does.

**Vulnerable code** (`rewards/src/lib.rs:49-61`): No auth check before setting `TokenAddr`.

#### Attack Scenario

1. Attacker monitors the network for a rewards contract deployment.
2. Before the deployer can call `initialize`, the attacker calls `initialize` with a token address they control.
3. The contract is permanently initialized with a malicious token. All `fund_quest` and `distribute_reward` calls operate on the attacker's token.
4. The deployer cannot re-initialize (`AlreadyInitialized`).

#### Fix

Add an `admin: Address` parameter and call `admin.require_auth()`:

```rust
pub fn initialize(env: Env, admin: Address, token_addr: Address) -> Result<(), Error> {
    admin.require_auth();
    if env.storage().instance().has(&DataKey::TokenAddr) {
        return Err(Error::AlreadyInitialized);
    }
    // store admin for future admin-only operations
    ...
}
```

Alternatively, initialize via the constructor (deployer account auth) using `env.deployer().require_auth()`.

---

### MED-01 — `distribute_reward` Bypasses Milestone Verification

**Contract:** `contracts/rewards/src/lib.rs`
**Severity:** Medium
**Function:** `distribute_reward`

#### Description

The rewards contract has no linkage to the milestone contract. The quest authority can call `distribute_reward` for any address and any amount at any time, without any milestone being verified first. The frontend is expected to enforce the correct sequencing, but a malicious or compromised frontend (or a direct API call) can distribute tokens freely.

This is a cross-contract architectural concern rather than a single-contract bug: the design intentionally allows the frontend to orchestrate the flow, but it creates an on-chain invariant that cannot be enforced.

#### Impact

- Authority can drain the entire reward pool in a single call.
- Rewards can be distributed to unenrolled or undeserving addresses.
- Combined with CRIT-01/CRIT-02, an attacker who seizes authority can immediately drain the pool.

#### Fix Recommendation

The cleanest fix is for `distribute_reward` to accept a `quest_id` and `milestone_id`, and cross-call the milestone contract's `is_completed` to verify the enrollee actually completed that milestone before distributing. This makes the on-chain state self-enforcing without relying on frontend coordination.

---

### MED-02 — Authority Can Distribute Rewards to Themselves

**Contract:** `contracts/rewards/src/lib.rs`
**Severity:** Medium
**Function:** `distribute_reward`

#### Description

There is no check preventing `authority == enrollee`. The quest authority can call `distribute_reward(authority, quest_id, authority, amount)` and pay themselves from the pool.

While the funder and authority are the same address (they funded the pool), this still represents a loss of tokens intended for learners if the authority acts maliciously or is compromised.

#### Fix

Add a guard:

```rust
if authority == enrollee {
    return Err(Error::Unauthorized);
}
```

---

### LOW-01 — Token Balance Drift from Direct Transfers

**Contract:** `contracts/rewards/src/lib.rs`
**Severity:** Low

#### Description

The contract tracks pool balances via an internal accounting ledger (`QuestPool`). If anyone sends tokens directly to the rewards contract address (outside of `fund_quest`), the internal pool balances undercount the actual token holdings, and those tokens are permanently locked with no mechanism to recover them.

This is a common smart contract issue. For Lernza, the practical risk is low since there is no incentive to donate tokens, but it is worth documenting.

#### Fix

Add an admin function to sweep unallocated tokens, or document that the contract does not accept direct token transfers.

---

### INFO-01 — Read-Only Functions Are Ungated (By Design)

**Contract:** `contracts/quest/src/lib.rs`
**Severity:** Informational

`get_quest`, `get_enrollees`, and `is_enrollee` require no authentication and return public data. This is consistent with the blockchain data model (all ledger data is publicly readable) and is intentional. No action required.

---

### INFO-02 — Frontend-Orchestrated Flow Creates Ordering Assumptions

**Severity:** Informational

The three contracts are independent: no cross-contract calls are made at runtime. The frontend is responsible for:

1. Calling `create_milestone` only after `create_quest`.
2. Calling `verify_completion` before `distribute_reward`.
3. Calling `fund_quest` with the quest owner's identity.

A malicious or buggy frontend can violate these assumptions. The findings above (MED-01, CRIT-01, CRIT-02) are the concrete exploits that this enables. The architectural recommendation is to add cross-contract validation for at minimum the ownership checks (CRIT-01, CRIT-02).

---

## Summary of Recommendations

| Priority | Action |
|----------|--------|
| Critical | Add quest contract cross-validation to `create_milestone` and `fund_quest` |
| Critical | Store quest contract address at initialization in both milestone and rewards contracts |
| High | Add `require_auth()` to `initialize` in rewards contract |
| High | Add enrollment check in `verify_completion` (cross-call `is_enrollee`) |
| Medium | Add `authority != enrollee` guard in `distribute_reward` |
| Medium | Add milestone completion check in `distribute_reward` (cross-call `is_completed`) |
| Low | Document or handle direct token transfers to rewards contract |

---

## Test Coverage Added

The following security-focused tests were added alongside this report. All existing tests continue to pass.

| Test | File | Finding |
|------|------|---------|
| `test_milestone_ownership_race_condition` | `milestone/src/test.rs` | CRIT-01 |
| `test_verify_completion_no_enrollment_check` | `milestone/src/test.rs` | HIGH-01 |
| `test_initialize_no_auth_guard` | `rewards/src/test.rs` | HIGH-02 |
| `test_fund_quest_frontrun_attack` | `rewards/src/test.rs` | CRIT-02 |
| `test_authority_self_distribution` | `rewards/src/test.rs` | MED-02 |
| `test_distribute_reward_no_milestone_check` | `rewards/src/test.rs` | MED-01 |
