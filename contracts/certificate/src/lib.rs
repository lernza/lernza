#![no_std]
#![allow(deprecated)]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec,
};
use stellar_access::ownable::{self as ownable, Ownable};
use stellar_macros::{default_impl, only_owner};
use stellar_tokens::non_fungible::{burnable::NonFungibleBurnable, Base, NonFungibleToken};

#[cfg(test)]
mod test;

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
    CertificateMetadata(u32),       // token_id -> metadata
    QuestCertificate(u32, Address), // quest_id -> recipient -> token_id
    UserCertificates(Address),      // user -> Vec<token_id>
    NextCertificateId,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotOwner = 1,
    NotAuthorized = 2,
    AlreadyIssued = 3,
    NotFound = 4,
    InvalidQuest = 5,
}

const BUMP: u32 = 518_400;
const THRESHOLD: u32 = 120_960;

#[contract]
pub struct CertificateContract;

#[contractimpl]
impl CertificateContract {
    /// Initialize the certificate contract
    pub fn __constructor(env: Env, owner: Address) {
        // Set token metadata
        Base::set_metadata(
            &env,
            String::from_str(&env, "https://lernza.io/certificates"),
            String::from_str(&env, "Lernza Quest Completion Certificates"),
            String::from_str(&env, "LERNZA_CERT"),
        );

        // Set the contract owner
        ownable::set_owner(&env, &owner);

        // Initialize next certificate ID
        env.storage()
            .instance()
            .set(&DataKey::NextCertificateId, &1u32);
        env.storage().instance().extend_ttl(THRESHOLD, BUMP);
    }

    /// Mint a certificate for quest completion
    /// Only authorized addresses can mint certificates
    #[only_owner]
    pub fn mint_certificate(
        env: Env,
        quest_id: u32,
        quest_name: String,
        quest_category: String,
        recipient: Address,
        issuer: Address,
    ) -> Result<u32, Error> {
        // Check if certificate already exists for this quest and recipient
        let cert_key = DataKey::QuestCertificate(quest_id, recipient.clone());
        if env.storage().persistent().has(&cert_key) {
            return Err(Error::AlreadyIssued);
        }

        // Get next certificate ID
        let next_id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::NextCertificateId)
            .unwrap_or(1);

        // Create metadata
        let metadata = CertificateMetadata {
            quest_id,
            quest_name: quest_name.clone(),
            quest_category,
            completion_date: env.ledger().timestamp(),
            issuer: issuer.clone(),
            recipient: recipient.clone(),
        };

        // Store metadata
        let metadata_key = DataKey::CertificateMetadata(next_id);
        env.storage().persistent().set(&metadata_key, &metadata);
        env.storage()
            .persistent()
            .extend_ttl(&metadata_key, THRESHOLD, BUMP);

        // Store quest -> recipient -> token_id mapping
        env.storage().persistent().set(&cert_key, &next_id);
        env.storage()
            .persistent()
            .extend_ttl(&cert_key, THRESHOLD, BUMP);

        // Update user certificates list
        let user_key = DataKey::UserCertificates(recipient.clone());
        let mut certificates: Vec<u32> = env
            .storage()
            .persistent()
            .get(&user_key)
            .unwrap_or(Vec::new(&env));
        certificates.push_back(next_id);
        env.storage().persistent().set(&user_key, &certificates);
        env.storage()
            .persistent()
            .extend_ttl(&user_key, THRESHOLD, BUMP);

        // Update next certificate ID
        env.storage()
            .instance()
            .set(&DataKey::NextCertificateId, &(next_id + 1));
        env.storage().instance().extend_ttl(THRESHOLD, BUMP);

        // Mint the NFT to the recipient
        let token_id = Base::sequential_mint(&env, &recipient);

        // Emit certificate minted event
        // Event topics: (cert, minted)
        // Event data: (token_id, quest_id, recipient, quest_name)
        env.events().publish(
            (symbol_short!("cert"), symbol_short!("minted")),
            (token_id, quest_id, recipient, quest_name),
        );

        Ok(token_id)
    }

    /// Get certificate metadata
    pub fn get_certificate_metadata(env: Env, token_id: u32) -> Result<CertificateMetadata, Error> {
        let key = DataKey::CertificateMetadata(token_id);
        env.storage().persistent().get(&key).ok_or(Error::NotFound)
    }

    /// Get certificate ID for a quest and recipient
    pub fn get_quest_certificate(
        env: Env,
        quest_id: u32,
        recipient: Address,
    ) -> Result<u32, Error> {
        let key = DataKey::QuestCertificate(quest_id, recipient);
        env.storage().persistent().get(&key).ok_or(Error::NotFound)
    }

    /// Get all certificates for a user
    pub fn get_user_certificates(env: Env, user: Address) -> Vec<u32> {
        let key = DataKey::UserCertificates(user);
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(&env))
    }

    /// Check if a user has completed a specific quest
    pub fn has_quest_certificate(env: Env, quest_id: u32, recipient: Address) -> bool {
        let key = DataKey::QuestCertificate(quest_id, recipient);
        env.storage().persistent().has(&key)
    }

    /// Mint a certificate for quest completion (internal function called by milestone contract)
    pub fn mint_quest_certificate(
        env: Env,
        quest_id: u32,
        quest_name: String,
        quest_category: String,
        recipient: Address,
    ) -> Result<u32, Error> {
        // Get contract owner (will be the milestone contract)
        let owner = ownable::get_owner(&env).ok_or(Error::NotOwner)?;

        // Call the owner-only mint function
        Self::mint_certificate(env, quest_id, quest_name, quest_category, recipient, owner)
    }

    /// Get certificate details including metadata and NFT info
    pub fn get_certificate_details(
        env: Env,
        token_id: u32,
    ) -> Result<(CertificateMetadata, Address), Error> {
        let metadata = Self::get_certificate_metadata(env.clone(), token_id)?;
        let owner = Base::owner_of(&env, token_id);
        Ok((metadata, owner))
    }

    /// Get all certificate details for a user
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

    /// Revoke a certificate (owner only, for exceptional cases)
    #[only_owner]
    pub fn revoke_certificate(env: Env, token_id: u32) -> Result<(), Error> {
        let metadata = Self::get_certificate_metadata(env.clone(), token_id)?;

        // Remove from user's certificate list
        let user_key = DataKey::UserCertificates(metadata.recipient.clone());
        let certificates: Vec<u32> = env
            .storage()
            .persistent()
            .get(&user_key)
            .unwrap_or(Vec::new(&env));

        // Remove the certificate ID from the list
        let mut new_certificates = Vec::new(&env);
        for i in 0..certificates.len() {
            if let Some(cert_id) = certificates.get(i) {
                if cert_id != token_id {
                    new_certificates.push_back(cert_id);
                }
            }
        }

        env.storage().persistent().set(&user_key, &new_certificates);
        env.storage()
            .persistent()
            .extend_ttl(&user_key, THRESHOLD, BUMP);

        // Remove quest mapping
        let quest_key = DataKey::QuestCertificate(metadata.quest_id, metadata.recipient.clone());
        env.storage().persistent().remove(&quest_key);

        // Remove metadata
        let metadata_key = DataKey::CertificateMetadata(token_id);
        env.storage().persistent().remove(&metadata_key);

        // Burn the NFT
        Base::burn(&env, &metadata.recipient, token_id);

        // Emit revocation event
        env.events().publish(
            (symbol_short!("cert"), symbol_short!("revoked")),
            (token_id, metadata.quest_id, metadata.recipient),
        );

        Ok(())
    }
}

#[default_impl]
#[contractimpl]
impl NonFungibleToken for CertificateContract {
    type ContractType = Base;
}

#[default_impl]
#[contractimpl]
impl NonFungibleBurnable for CertificateContract {}

#[default_impl]
#[contractimpl]
impl Ownable for CertificateContract {}
