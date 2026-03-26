#![no_std]
use soroban_sdk::{contracttype, Address, Env, String, Vec};

pub const BUMP: u32 = 518_400;
pub const THRESHOLD: u32 = 120_960;

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
    pub max_enrollees: Option<u32>,
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

pub fn extend_persistent_ttl<K>(env: &Env, key: &K)
where
    K: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
{
    env.storage().persistent().extend_ttl(key, THRESHOLD, BUMP);
}
