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

/// Validate that an address string is a valid Stellar contract address.
/// Checks:
/// - Exactly 56 characters long
/// - Starts with 'C' (contract prefix)
/// - Contains only valid base32 characters (A-Z, 2-7)
/// - Has valid CRC16 checksum
pub fn is_contract_address(addr: &Address) -> bool {
    let s = addr.to_string();

    // Length check: Stellar contract addresses are always 56 chars
    if s.len() != 56 {
        return false;
    }

    let mut buf = [0u8; 56];
    s.copy_into_slice(&mut buf);

    // Prefix check: must start with 'C' for contract
    if buf[0] != b'C' {
        return false;
    }

    // Base32 charset check: characters 1-55 must be A-Z or 2-7
    for i in 1..56 {
        let c = buf[i];
        let valid = (c >= b'A' && c <= b'Z') || (c >= b'2' && c <= b'7');
        if !valid {
            return false;
        }
    }

    // CRC16 checksum validation (Stellar uses CRC-16-CCITT)
    // The last 2 bytes (characters 54-55) contain the checksum
    validate_stellar_checksum(&buf)
}

/// Validate CRC16 checksum for a 56-byte Stellar address buffer.
/// Stellar uses CRC-16-CCITT (poly 0x1021, init 0, no reflect/xor-out).
fn validate_stellar_checksum(buf: &[u8; 56]) -> bool {
    // Decode base32 to bytes for checksum validation
    // Characters 0-53 (54 chars) = 5 * 54 / 8 = 33.75, round to 34 bytes
    // Characters 54-55 (2 chars) = checksum (10 bits, padded to 16 bits)

    let mut decoded = [0u8; 35];
    let mut bits = 0u32;
    let mut bit_count = 0u32;

    // Decode characters 0-53 from base32
    for (i, &c) in buf[0..54].iter().enumerate() {
        let val = match c {
            b'A'..=b'Z' => (c - b'A') as u32,
            b'2'..=b'7' => (c - b'2' + 26) as u32,
            _ => return false,
        };

        bits = (bits << 5) | val;
        bit_count += 5;

        if bit_count >= 8 {
            bit_count -= 8;
            decoded[(i / 8) + if i % 8 >= 3 { 1 } else { 0 }] = ((bits >> bit_count) & 0xFF) as u8;
        }
    }

    // Compute CRC16 over the decoded data
    let computed_crc = crc16_ccitt(&decoded[0..33]);

    // Decode and verify checksum from last 2 characters
    let checksum_c1 = match buf[54] {
        b'A'..=b'Z' => buf[54] - b'A',
        b'2'..=b'7' => buf[54] - b'2' + 26,
        _ => return false,
    } as u16;

    let checksum_c2 = match buf[55] {
        b'A'..=b'Z' => buf[55] - b'A',
        b'2'..=b'7' => buf[55] - b'2' + 26,
        _ => return false,
    } as u16;

    // Reconstruct checksum value (10 bits, left-justified in 16 bits)
    let encoded_checksum = (checksum_c1 << 11) | (checksum_c2 << 6);
    let stored_checksum = (encoded_checksum >> 6) & 0x3FF;

    computed_crc == stored_checksum
}

/// Compute CRC-16-CCITT for Stellar address validation.
/// Polynomial: 0x1021, Initial: 0x0000, No reflect, No final XOR.
fn crc16_ccitt(data: &[u8]) -> u16 {
    let mut crc = 0u32;
    for &byte in data {
        crc ^= (byte as u32) << 8;
        for _ in 0..8 {
            crc <<= 1;
            if crc & 0x10000 != 0 {
                crc ^= 0x1021;
            }
        }
    }
    (crc & 0xFFFF) as u16
}

pub fn extend_instance_ttl(env: &Env) {
    env.storage().instance().extend_ttl(THRESHOLD, BUMP);
}

pub fn extend_persistent_ttl(env: &Env, key: &impl IsDataKey) {
    env.storage().persistent().extend_ttl(key, THRESHOLD, BUMP);
}
