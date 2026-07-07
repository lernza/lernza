#![no_std]

use common::{extend_instance_ttl, extend_persistent_ttl, BUMP, THRESHOLD};
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, Env, String, Symbol, Vec,
};
use stellar_access::ownable::{self as ownable, Ownable};
use stellar_macros::{default_impl, only_owner};
use stellar_tokens::non_fungible::{burnable::NonFungibleBurnable, Base, NonFungibleToken};

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
}

// -- add IsDataKey implementation --
impl common::IsDataKey for DataKey {}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotOwner = 10,
    Unauthorized = 2,
    AlreadyIssued = 20,
    NotFound = 1,
    InvalidQuest = 5,
    AlreadyRevoked = 6,
    MetadataBaseNotSet = 7,
    InvalidInput = 3,
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

    #[only_owner]
    pub fn mint_certificate(
        env: Env,
        quest_id: u32,
        quest_name: String,
        quest_category: String,
        recipient: Address,
        issuer: Address,
    ) -> Result<u32, Error> {
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
    pub fn revoke_certificate(env: Env, caller: Address, token_id: u32) -> Result<(), Error> {
        caller.require_auth();
        let owner = ownable::get_owner(&env).ok_or(Error::NotOwner)?;
        if caller != owner {
            return Err(Error::NotOwner);
        }

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
        env.storage().instance().set(&DataKey::MetadataBase, &uri);
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
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "paused"), &true);
        extend_instance_ttl(&env);
        env.events().publish((Symbol::new(&env, "paused"),), ());
        Ok(())
    }

    #[only_owner]
    pub fn unpause(env: Env) -> Result<(), Error> {
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "paused"), &false);
        extend_instance_ttl(&env);
        env.events().publish((Symbol::new(&env, "unpaused"),), ());
        Ok(())
    }

    fn require_not_paused(env: &Env) -> Result<(), Error> {
        if env
            .storage()
            .instance()
            .get(&Symbol::new(env, "paused"))
            .unwrap_or(false)
        {
            return Err(Error::Paused);
        }
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

#[cfg(test)]
mod test;
