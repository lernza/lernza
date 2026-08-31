#![no_std]
use common::{extend_instance_ttl, QuestInfo};
use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, symbol_short, Address, Env,
    String,
};

/// Quest contract interface used to fetch quest ownership and metadata so the
/// completion flow can verify the caller is the quest owner before acting.
#[contractclient(name = "QuestClient")]
pub trait QuestContractTrait {
    fn get_quest(env: Env, quest_id: u32) -> QuestInfo;
}

/// Milestone contract interface used to confirm every milestone in a quest was
/// completed by the recipient before finalizing.
#[contractclient(name = "MilestoneClient")]
pub trait MilestoneContractTrait {
    fn get_milestone_count(env: Env, quest_id: u32) -> u32;
    fn is_completed(env: Env, quest_id: u32, milestone_id: u32, enrollee: Address) -> bool;
}

/// Certificate contract interface used to mint or look up the completion
/// certificate as part of the atomic completion flow.
#[contractclient(name = "CertificateClient")]
pub trait CertificateContractTrait {
    fn get_quest_certificate(env: Env, quest_id: u32, recipient: Address) -> u32;
    fn mint_quest_certificate(
        env: Env,
        quest_id: u32,
        quest_name: String,
        quest_category: String,
        recipient: Address,
    ) -> u32;
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Contract has not been initialized with the dependent contract addresses.
    NotInitialized = 1,
    /// Caller is not the quest owner.
    NotOwner = 2,
    /// Not every milestone has been completed by the recipient yet.
    MilestonesIncomplete = 3,
    /// This quest/recipient pair has already been completed.
    AlreadyCompleted = 4,
    /// The downstream certificate operation failed.
    CertificateError = 5,
    /// The contract is already initialized.
    AlreadyInitialized = 6,
}

#[contracttype]
#[derive(Clone)]
pub struct CompletionConfig {
    pub quest: Address,
    pub milestone: Address,
    pub certificate: Address,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Config,
    /// Maps a (quest_id, recipient) pair to the minted certificate token id.
    Completed(u32, Address),
}

#[contract]
pub struct CompletionContract;

#[contractimpl]
impl CompletionContract {
    /// Wire the completion facade to the quest, milestone, and certificate
    /// contracts it orchestrates.
    pub fn initialize(
        env: Env,
        admin: Address,
        quest: Address,
        milestone: Address,
        certificate: Address,
    ) -> Result<(), Error> {
        admin.require_auth();
        if env.storage().instance().has(&DataKey::Config) {
            return Err(Error::AlreadyInitialized);
        }
        let config = CompletionConfig {
            quest,
            milestone,
            certificate,
        };
        env.storage().instance().set(&DataKey::Config, &config);
        extend_instance_ttl(&env);
        Ok(())
    }

    /// Returns the configured dependent contract addresses.
    pub fn get_config(env: Env) -> Result<CompletionConfig, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(Error::NotInitialized)
    }

    /// Atomically finalize a learner's completion of a quest:
    /// 1. verify the caller is the quest owner,
    /// 2. verify every milestone is completed by `recipient` (cross-contract
    ///    reads against the milestone contract),
    /// 3. obtain or mint the on-chain certificate (cross-contract call to the
    ///    certificate contract),
    /// 4. record the completion so it cannot be finalized twice.
    ///
    /// Reward distribution for individual milestones is performed by the
    /// milestone contract during `verify_completion`; this facade centralizes
    /// the finalization so the frontend can complete a quest with a single call.
    pub fn complete_quest(
        env: Env,
        owner: Address,
        quest_id: u32,
        recipient: Address,
    ) -> Result<u32, Error> {
        owner.require_auth();

        let config = Self::get_config(env.clone())?;

        // 1. Verify caller ownership of the quest.
        let quest = QuestClient::new(&env, &config.quest).get_quest(&quest_id);
        if quest.owner != owner {
            return Err(Error::NotOwner);
        }

        // 2. Verify every milestone is completed by the recipient.
        let count = MilestoneClient::new(&env, &config.milestone).get_milestone_count(&quest_id);
        if count == 0 {
            return Err(Error::MilestonesIncomplete);
        }
        let mut milestone_id: u32 = 0;
        while milestone_id < count {
            let done = MilestoneClient::new(&env, &config.milestone)
                .is_completed(&quest_id, &milestone_id, &recipient);
            if !done {
                return Err(Error::MilestonesIncomplete);
            }
            milestone_id += 1;
        }

        // Guard against double completion.
        let completed_key = DataKey::Completed(quest_id, recipient.clone());
        if env.storage().persistent().has(&completed_key) {
            return Err(Error::AlreadyCompleted);
        }

        // 3. Obtain the completion certificate. The milestone contract already
        //    mints it on final completion, so we reuse that token when present
        //    and only mint if one does not yet exist (cross-contract calls).
        let cert_client = CertificateClient::new(&env, &config.certificate);
        let token_id: u32 = match cert_client.try_get_quest_certificate(&quest_id, &recipient) {
            Ok(Ok(id)) => id,
            _ => cert_client.mint_quest_certificate(
                &quest_id,
                &quest.name,
                &quest.category,
                &recipient,
            ),
        };

        // 4. Record completion.
        env.storage().persistent().set(&completed_key, &token_id);
        extend_instance_ttl(&env);
        env.events().publish(
            (symbol_short!("completed"),),
            (quest_id, recipient.clone(), token_id),
        );
        Ok(token_id)
    }
}

#[cfg(test)]
mod test;
