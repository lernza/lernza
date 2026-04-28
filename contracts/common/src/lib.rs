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

// Shared error codes
pub const ERR_NOT_FOUND: u32 = 1;
pub const ERR_UNAUTHORIZED: u32 = 2;
pub const ERR_INVALID_INPUT: u32 = 3;

#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum Visibility {
    Public = 0,
    Private = 1,
}

#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum QuestStatus {
    Active = 0,
    Archived = 1,
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
}

pub fn is_contract_address(addr: &Address) -> bool {
    let s = addr.to_string();
    if s.len() != 56 {
        return false;
    }
    let mut buf = [0u8; 56];
    s.copy_into_slice(&mut buf);
    buf[0] == b'C'
}

pub fn extend_instance_ttl(env: &Env) {
    env.storage().instance().extend_ttl(THRESHOLD, BUMP);
}

pub fn extend_persistent_ttl(env: &Env, key: &impl IsDataKey) {
    env.storage().persistent().extend_ttl(key, THRESHOLD, BUMP);
}
