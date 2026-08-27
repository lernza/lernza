#![no_std]
use soroban_sdk::{contracttype, Address, Env, String, Vec};

/// Marker trait for types that can be used as persistent storage keys.
/// This restricts `extend_persistent_ttl` to only accept valid storage key types,
/// preventing accidental misuse with invalid types at compile time.
pub trait IsDataKey: soroban_sdk::IntoVal<Env, soroban_sdk::Val> {}

/// Target TTL for persistent and instance storage entries: 518_400 ledgers.
/// At ~5 seconds per ledger this is roughly 30 days. Every write or meaningful
/// update to a long-lived entry should extend its TTL to this value so that
/// quests, milestones, balances, and authorization records do not silently
/// expire between user interactions.
pub const BUMP: u32 = 518_400;

/// Refresh threshold: 120_960 ledgers (~7 days). When an entry's remaining TTL
/// falls below this value the next read or write will extend it back to BUMP.
/// Keeping the threshold at roughly one-quarter of BUMP avoids unnecessary
/// ledger writes while still providing a comfortable safety margin before
/// expiry. See ADR-005 for the full storage and TTL policy.
pub const THRESHOLD: u32 = 120_960;

/// Upper bound on any single reward amount (raw token units).
/// Prevents overflow-adjacent abuse and unbounded storage costs.
pub const MAX_REWARD_AMOUNT: i128 = 1_000_000_000_000_000; // 10^15

/// Metadata validation bounds for quest fields
pub const MIN_QUEST_NAME_LEN: u32 = 1;
pub const MAX_QUEST_NAME_LEN: u32 = 64; // duplicate of quest crate; canonicalized here for shared use
pub const MIN_QUEST_DESCRIPTION_LEN: u32 = 1;
pub const MAX_QUEST_DESCRIPTION_LEN: u32 = 2000;

// Shared error codes
// Shared error codes — standardised across all Lernza contracts.
//
// Every contract defines its own `#[contracterror]` enum because Soroban
// requires error types to live in the contract crate. These constants ensure
// the numeric codes stay consistent across contracts so the frontend and
// tooling can interpret errors uniformly.

/// The requested entity does not exist.
pub const ERR_NOT_FOUND: u32 = 1;
/// The caller is not authorized to perform this action.
pub const ERR_UNAUTHORIZED: u32 = 2;
/// One or more inputs failed validation.
pub const ERR_INVALID_INPUT: u32 = 3;
/// Contract is administratively paused.
pub const ERR_PAUSED: u32 = 400;

/// Human-readable descriptions for the standard error codes.
/// Useful for logging and debugging — call `error_info(code)` to get the
/// corresponding message.
pub fn error_info(code: u32) -> &'static str {
    match code {
        ERR_NOT_FOUND => "entity not found",
        ERR_UNAUTHORIZED => "unauthorized",
        ERR_INVALID_INPUT => "invalid input",
        ERR_PAUSED => "contract is paused",
        _ => "unknown error",
    }
}

#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum Visibility {
    Public = 0,
    Private = 1,
    Unlisted = 2,
    InviteOnly = 3,
}

#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum QuestStatus {
    Active = 0,
    Archived = 1,
    Cancelled = 2,
}

#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum EnrolleeStatus {
    Active = 0,
    Suspended = 1,
    Banned = 2,
    Inactive = 3,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct QuestInfo {
    pub id: u32,
    pub owner: Address,
    pub name: String,
    pub description: String,
    pub category: String,
    pub tags: Vec<String>,
    pub token_addr: Address,
    pub created_at: u64,
    pub visibility: Visibility,
    pub status: QuestStatus,
    pub deadline: u64,
    pub archived_at: u64,
    pub max_enrollees: Option<u32>,
    pub verified: bool,
    pub version: u32,
    pub prerequisite_quest_ids: Vec<u32>,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Enrollee {
    pub address: Address,
    pub status: EnrolleeStatus,
    pub enrolled_at: u64,
}

/// A snapshot of quest fields at a specific version, stored for history.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct QuestVersion {
    pub version: u32,
    pub name: String,
    pub description: String,
    pub category: String,
    pub tags: Vec<String>,
    pub visibility: Visibility,
    pub max_enrollees: Option<u32>,
    pub updated_at: u64,
}

/// Validate that an address is a Stellar contract address (not an account).
///
/// **Validation Strategy (ADR-006):**
/// This function performs lightweight validation to distinguish contract addresses
/// (C-prefixed) from account addresses (G-prefixed). It does NOT perform CRC-16
/// checksum validation, as we delegate cryptographic integrity checks to the
/// soroban-sdk's XDR boundary.
///
/// **What this function checks:**
/// - Length is exactly 56 characters
/// - First character is 'C' (contract prefix)
/// - All characters use valid base32 charset (A-Z, 2-7)
///
/// **What this function does NOT check:**
/// - CRC-16-XMODEM checksum validity
/// - Whether the address corresponds to an actual deployed contract
///
/// **Rationale:**
/// Soroban's host already guarantees that any `Address` it hands a contract
/// is structurally well-formed — it was deserialized from XDR and round-trips
/// to a valid StrKey. Invalid contract addresses will fail during actual
/// contract invocations, providing clear error feedback without requiring
/// complex validation logic here.
///
/// **Usage:**
/// Use this function when you need to ensure callers pass contract addresses
/// rather than account addresses for operations that require contract interaction.
pub fn is_contract_address(addr: &Address) -> bool {
    let s = addr.to_string();

    if s.len() != 56 {
        return false;
    }

    let mut buf = [0u8; 56];
    s.copy_into_slice(&mut buf);

    if buf[0] != b'C' {
        return false;
    }

    for &c in buf[1..].iter() {
        let valid = c.is_ascii_uppercase() || (b'2'..=b'7').contains(&c);
        if !valid {
            return false;
        }
    }

    true
}

pub fn extend_instance_ttl(env: &Env) {
    env.storage().instance().extend_ttl(THRESHOLD, BUMP);
}

pub fn extend_persistent_ttl(env: &Env, key: &impl IsDataKey) {
    env.storage().persistent().extend_ttl(key, THRESHOLD, BUMP);
}

/// Basic URL format checker used by contract metadata validation.
/// Lightweight acceptance of http/https/ipfs schemes and rejects whitespace
/// and empty strings.
pub fn is_valid_url(s: &String) -> bool {
    if s.is_empty() || s.len() > 2048 {
        return false;
    }
    let mut buf = [0u8; 2048];
    let len = s.len() as usize;
    s.copy_into_slice(&mut buf[..len]);
    for &b in buf[..len].iter() {
        if b == b' ' || b == b'\n' || b == b'\r' || b == b'\t' {
            return false;
        }
    }
    if len < 7 {
        return false;
    }
    let prefix_http = b"http://";
    let prefix_https = b"https://";
    let prefix_ipfs = b"ipfs://";
    if len >= 7 && &buf[..7] == prefix_http {
        return true;
    }
    if len >= 8 && &buf[..8] == prefix_https {
        return true;
    }
    if len >= 7 && &buf[..7] == prefix_ipfs {
        return true;
    }
    false
}

/// Emit a structured event for outgoing cross-contract call attempts.
/// Topics: (cross_contract_call,)
/// Data: (caller_contract, target_contract, method_symbol, params)
pub fn log_cross_call(env: &Env, target: &Address, method: &str, params: &String) {
    env.events().publish(
        (soroban_sdk::Symbol::new(env, "cross_contract_call"),),
        (
            env.current_contract_address(),
            target.clone(),
            soroban_sdk::Symbol::new(env, method),
            params.clone(),
        ),
    );
}

/// Emit a structured event for cross-contract call returns.
/// Topics: (cross_contract_return,)
/// Data: (caller_contract, target_contract, method_symbol, success, result)
pub fn log_cross_return(env: &Env, target: &Address, method: &str, success: bool, result: &String) {
    env.events().publish(
        (soroban_sdk::Symbol::new(env, "cross_contract_return"),),
        (
            env.current_contract_address(),
            target.clone(),
            soroban_sdk::Symbol::new(env, method),
            success,
            result.clone(),
        ),
    );
}

/// Helper: emit a canonical quest_created event
/// Topics: (quest_created,)
/// Data: (quest_id, owner, name, created_at)
pub fn emit_quest_created(
    env: &Env,
    quest_id: u32,
    owner: &Address,
    name: &String,
    created_at: u64,
) {
    env.events().publish(
        (soroban_sdk::Symbol::new(env, "quest_created"),),
        (quest_id, owner.clone(), name.clone(), created_at),
    );
}

/// Helper: emit reward_funded event
/// Topics: (reward_funded,)
/// Data: (quest_id, funder, amount)
pub fn emit_reward_funded(env: &Env, quest_id: u32, funder: &Address, amount: i128) {
    env.events().publish(
        (soroban_sdk::Symbol::new(env, "reward_funded"),),
        (quest_id, funder.clone(), amount),
    );
}

/// Helper: emit reward_distributed event
/// Topics: (reward_distributed,)
/// Data: (quest_id, milestone_id, enrollee, amount)
pub fn emit_reward_distributed(
    env: &Env,
    quest_id: u32,
    milestone_id: u32,
    enrollee: &Address,
    amount: i128,
) {
    env.events().publish(
        (soroban_sdk::Symbol::new(env, "reward_distributed"),),
        (quest_id, milestone_id, enrollee.clone(), amount),
    );
}

pub fn is_paused_by_key<K: IsDataKey>(env: &Env, key: &K) -> bool {
    env.storage().instance().get(key).unwrap_or(false)
}

pub fn get_instance<K: IsDataKey, T: soroban_sdk::TryFromVal<Env, soroban_sdk::Val>>(
    env: &Env,
    key: &K,
) -> Option<T> {
    env.storage().instance().get(key)
}

pub fn get_persistent<K: IsDataKey, T: soroban_sdk::TryFromVal<Env, soroban_sdk::Val>>(
    env: &Env,
    key: &K,
) -> Option<T> {
    env.storage().persistent().get(key)
}

/// Planning-only heuristic for rent-cost estimates: stroops charged per
/// 1,024 bytes of persistent-entry payload for a single `BUMP` (~30 day) TTL
/// extension window. This mirrors the order of magnitude of Soroban's
/// published write-fee / rent schedule but is **not** read from the network,
/// so callers must still confirm exact costs via `simulateTransaction`
/// before submitting a transaction. See `docs/GAS_COSTS.md` for the full
/// storage cost model this constant supports.
pub const RENT_STROOPS_PER_KB_PER_BUMP: i128 = 150;

/// Estimate the rent (in stroops) needed to keep a persistent entry of
/// `entry_size_bytes` alive for one `BUMP` TTL-extension cycle.
///
/// This is a rough, contract-side planning aid so frontends can show users
/// an approximate storage cost *before* they sign a transaction — it is not
/// a substitute for simulating the actual transaction.
pub fn estimate_persistent_rent(entry_size_bytes: u32) -> i128 {
    let bytes = entry_size_bytes as i128;
    // Ceil-divide so partial kilobytes still round up to a whole unit of rent.
    ((bytes * RENT_STROOPS_PER_KB_PER_BUMP) + 1023) / 1024
}

/// Deterministic milestone ID — issue #1340
/// Uses hash(quest_id || timestamp || nonce) to avoid collisions on redeploy/fork
pub fn deterministic_milestone_id(quest_id: &[u8], timestamp: u64, nonce: u64) -> [u8; 32] {
    let mut out = [0u8; 32];
    let ts_bytes = timestamp.to_be_bytes();
    let nonce_bytes = nonce.to_be_bytes();
    let mut idx = 0;
    for &b in quest_id {
        out[idx % 32] ^= b;
        idx += 1;
    }
    for &b in &ts_bytes {
        out[idx % 32] ^= b;
        idx += 1;
    }
    for &b in &nonce_bytes {
        out[idx % 32] ^= b;
        idx += 1;
    }
    out
}
