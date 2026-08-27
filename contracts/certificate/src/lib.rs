#![no_std]

use common::{extend_instance_ttl, extend_persistent_ttl};
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, BytesN, Env, IntoVal, String,
    Symbol, Vec,
};
use stellar_access::ownable::{self as ownable};
use stellar_macros::only_owner;
use stellar_tokens::non_fungible::Base;

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CertificateMetadata {
    pub quest_id: u32,
    pub quest_name: String,
    pub quest_category: String,
    pub completion_date: u64,
    pub issuer: Address,
    pub recipient: Address,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    CertificateMetadata(u32),
    QuestCertificate(u32, Address),
    UserCertificates(Address),
    MetadataBase,
    RevokedCertificate(u32),
    MilestoneContract,
    Paused,
}

// -- add IsDataKey implementation --
impl common::IsDataKey for DataKey {}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Entity not found (shared code 1).
    NotFound = 1,
    /// Caller is not authorized (shared code 2).
    Unauthorized = 2,
    /// Invalid input provided (shared code 3).
    InvalidInput = 3,
    NotOwner = 10,
    AlreadyIssued = 20,
    InvalidQuest = 5,
    AlreadyRevoked = 6,
    MetadataBaseNotSet = 7,
    MilestoneContractNotSet = 8,
    NotCompleted = 9,
    /// Contract is administratively paused (shared code 400).
    Paused = 400,
}

// BUMP and THRESHOLD now come from common

#[contract]
pub struct CertificateContract;

#[contractimpl]
impl CertificateContract {
    pub fn __constructor(env: Env, owner: Address) {
        Base::set_metadata(
            &env,
            String::from_str(&env, "https://lernza.io/certificates"),
            String::from_str(&env, "Lernza Quest Completion Certificates"),
            String::from_str(&env, "LERNZA_CERT"),
        );
        ownable::set_owner(&env, &owner);
        // before: env.storage().instance().extend_ttl(THRESHOLD, BUMP);
        extend_instance_ttl(&env);
    }

    /// Returns the owner, which is this contract's administrator role.
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        ownable::get_owner(&env).ok_or(Error::NotOwner)
    }

    /// Upgrade this contract's WASM. The `only_owner` guard enforces the
    /// administrator role before Soroban replaces the current code.
    #[only_owner]
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }

    #[only_owner]
    pub fn mint_certificate(
        env: Env,
        quest_id: u32,
        quest_name: String,
        quest_category: String,
        recipient: Address,
        issuer: Address,
    ) -> Result<u32, Error> {
        Self::require_not_paused(&env)?;
        let cert_key = DataKey::QuestCertificate(quest_id, recipient.clone());
        if env.storage().persistent().has(&cert_key) {
            return Err(Error::AlreadyIssued);
        }

        let token_id = Base::sequential_mint(&env, &recipient);

        let metadata = CertificateMetadata {
            quest_id,
            quest_name: quest_name.clone(),
            quest_category,
            completion_date: env.ledger().timestamp(),
            issuer: issuer.clone(),
            recipient: recipient.clone(),
        };

        let metadata_key = DataKey::CertificateMetadata(token_id);
        env.storage().persistent().set(&metadata_key, &metadata);
        extend_persistent_ttl(&env, &metadata_key);

        env.storage().persistent().set(&cert_key, &token_id);
        extend_persistent_ttl(&env, &cert_key);

        let user_key = DataKey::UserCertificates(recipient.clone());
        let mut certificates: Vec<u32> = env
            .storage()
            .persistent()
            .get(&user_key)
            .unwrap_or(Vec::new(&env));
        certificates.push_back(token_id);
        env.storage().persistent().set(&user_key, &certificates);
        extend_persistent_ttl(&env, &user_key);

        extend_instance_ttl(&env);

        env.events().publish(
            (Symbol::new(&env, "certificate_minted"),),
            (token_id, quest_id, recipient, quest_name),
        );

        Ok(token_id)
    }

    pub fn get_certificate_metadata(env: Env, token_id: u32) -> Result<CertificateMetadata, Error> {
        let key = DataKey::CertificateMetadata(token_id);
        env.storage().persistent().get(&key).ok_or(Error::NotFound)
    }

    pub fn get_quest_certificate(
        env: Env,
        quest_id: u32,
        recipient: Address,
    ) -> Result<u32, Error> {
        let key = DataKey::QuestCertificate(quest_id, recipient);
        env.storage().persistent().get(&key).ok_or(Error::NotFound)
    }

    pub fn get_user_certificates(env: Env, user: Address) -> Vec<u32> {
        let key = DataKey::UserCertificates(user);
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(&env))
    }

    pub fn has_quest_certificate(env: Env, quest_id: u32, recipient: Address) -> bool {
        let key = DataKey::QuestCertificate(quest_id, recipient);
        env.storage().persistent().has(&key)
    }

    pub fn mint_quest_certificate(
        env: Env,
        quest_id: u32,
        quest_name: String,
        quest_category: String,
        recipient: Address,
    ) -> Result<u32, Error> {
        Self::require_not_paused(&env)?;
        let owner = ownable::get_owner(&env).ok_or(Error::NotOwner)?;
        Self::mint_certificate(env, quest_id, quest_name, quest_category, recipient, owner)
    }

    pub fn get_certificate_details(
        env: Env,
        token_id: u32,
    ) -> Result<(CertificateMetadata, Address), Error> {
        let metadata = Self::get_certificate_metadata(env.clone(), token_id)?;
        let owner = Base::owner_of(&env, token_id);
        Ok((metadata, owner))
    }

    pub fn get_user_certificate_details(
        env: Env,
        user: Address,
    ) -> Vec<(u32, CertificateMetadata)> {
        let certificate_ids = Self::get_user_certificates(env.clone(), user.clone());
        let mut details = Vec::new(&env);

        for i in 0..certificate_ids.len() {
            if let Some(token_id) = certificate_ids.get(i) {
                if let Ok(metadata) = Self::get_certificate_metadata(env.clone(), token_id) {
                    details.push_back((token_id, metadata));
                }
            }
        }

        details
    }

    #[only_owner]
    pub fn revoke_certificate(env: Env, token_id: u32) -> Result<(), Error> {
        if env
            .storage()
            .persistent()
            .has(&DataKey::RevokedCertificate(token_id))
        {
            return Err(Error::AlreadyRevoked);
        }

        let metadata = Self::get_certificate_metadata(env.clone(), token_id)?;

        let user_key = DataKey::UserCertificates(metadata.recipient.clone());
        let certificates: Vec<u32> = env
            .storage()
            .persistent()
            .get(&user_key)
            .unwrap_or(Vec::new(&env));

        let mut new_certificates = Vec::new(&env);
        for i in 0..certificates.len() {
            if let Some(cert_id) = certificates.get(i) {
                if cert_id != token_id {
                    new_certificates.push_back(cert_id);
                }
            }
        }

        env.storage().persistent().set(&user_key, &new_certificates);
        extend_persistent_ttl(&env, &user_key);

        let quest_key = DataKey::QuestCertificate(metadata.quest_id, metadata.recipient.clone());
        env.storage().persistent().remove(&quest_key);

        let metadata_key = DataKey::CertificateMetadata(token_id);
        env.storage().persistent().remove(&metadata_key);

        env.storage()
            .persistent()
            .set(&DataKey::RevokedCertificate(token_id), &true);

        Base::burn(&env, &metadata.recipient, token_id);

        env.events().publish(
            (Symbol::new(&env, "certificate_revoked"),),
            (token_id, metadata.quest_id, metadata.recipient),
        );

        Ok(())
    }

    #[only_owner]
    pub fn set_metadata_base(env: Env, uri: String) -> Result<(), Error> {
        if !common::is_valid_url(&uri) {
            return Err(Error::InvalidInput);
        }
        env.storage().instance().set(&DataKey::MetadataBase, &uri);
        extend_instance_ttl(&env);
        env.events()
            .publish((Symbol::new(&env, "metadata_base_updated"),), uri);
        Ok(())
    }

    pub fn get_metadata_base(env: Env) -> Result<String, Error> {
        env.storage()
            .instance()
            .get(&DataKey::MetadataBase)
            .ok_or(Error::MetadataBaseNotSet)
    }

    pub fn is_revoked(env: Env, token_id: u32) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::RevokedCertificate(token_id))
    }

    #[only_owner]
    pub fn pause(env: Env) -> Result<(), Error> {
        env.storage().instance().set(&DataKey::Paused, &true);
        extend_instance_ttl(&env);
        env.events().publish((Symbol::new(&env, "paused"),), ());
        Ok(())
    }

    #[only_owner]
    pub fn unpause(env: Env) -> Result<(), Error> {
        env.storage().instance().set(&DataKey::Paused, &false);
        extend_instance_ttl(&env);
        env.events().publish((Symbol::new(&env, "unpaused"),), ());
        Ok(())
    }

    fn require_not_paused(env: &Env) -> Result<(), Error> {
        if common::is_paused_by_key(env, &DataKey::Paused) {
            return Err(Error::Paused);
        }
        Ok(())
    }

    #[only_owner]
    pub fn set_milestone_contract(env: Env, milestone_contract: Address) -> Result<(), Error> {
        env.storage()
            .instance()
            .set(&DataKey::MilestoneContract, &milestone_contract);
        extend_instance_ttl(&env);
        Ok(())
    }

    pub fn get_milestone_contract(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::MilestoneContract)
            .ok_or(Error::MilestoneContractNotSet)
    }

    pub fn verify_and_issue(
        env: Env,
        quest_id: u32,
        quest_name: String,
        quest_category: String,
        recipient: Address,
    ) -> Result<u32, Error> {
        Self::require_not_paused(&env)?;
        let milestone_contract = Self::get_milestone_contract(env.clone())?;

        // Cross-contract call to check completions
        let total_milestones: u32 = env.invoke_contract(
            &milestone_contract,
            &Symbol::new(&env, "get_milestone_count"),
            soroban_sdk::vec![&env, quest_id.into_val(&env)],
        );

        let completions: u32 = env.invoke_contract(
            &milestone_contract,
            &Symbol::new(&env, "get_enrollee_completions"),
            soroban_sdk::vec![&env, quest_id.into_val(&env), recipient.into_val(&env)],
        );

        if total_milestones == 0 || completions < total_milestones {
            return Err(Error::NotCompleted);
        }

        // Mint using the contract's own address as the issuer
        Self::mint_certificate(
            env.clone(),
            quest_id,
            quest_name,
            quest_category,
            recipient,
            env.current_contract_address(),
        )
    }

    // SBT specific: Expose balance_of and owner_of, but NOT transfer
    pub fn balance_of(env: Env, id: Address) -> i128 {
        Base::balance(&env, &id).into()
    }

    pub fn owner_of(env: Env, token_id: u32) -> Option<Address> {
        Some(Base::owner_of(&env, token_id))
    }

    pub fn name(env: Env) -> String {
        Base::name(&env)
    }

    pub fn symbol(env: Env) -> String {
        Base::symbol(&env)
    }
}

#[cfg(test)]
mod test;

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
