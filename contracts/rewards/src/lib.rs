#![no_std]
#![allow(deprecated)]
use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, symbol_short, token,
    Address, Env, String,
};

#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Visibility {
    Public = 0,
    Private = 1,
}

#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
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
    pub tags: soroban_sdk::Vec<String>,
    pub token_addr: Address,
    pub created_at: u64,
    pub visibility: Visibility,
    pub status: QuestStatus,
    pub deadline: u64,
}

#[contractclient(name = "QuestClient")]
pub trait QuestContractTrait {
    fn get_quest(env: Env, quest_id: u32) -> Result<QuestInfo, soroban_sdk::Val>;
}

#[contractclient(name = "MilestoneClient")]
pub trait MilestoneContractTrait {
    fn is_completed(env: Env, quest_id: u32, milestone_id: u32, enrollee: Address) -> bool;
}

// Rewards contract: holds token pools per quest and distributes rewards.
//
// Flow:
// 1. Quest owner calls fund_quest() to deposit tokens into the pool
// 2. When owner verifies a milestone completion, frontend calls distribute_reward()
// 3. Tokens transfer from the contract's pool to the enrollee

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    TokenAddr,
    QuestContractAddr,
    MilestoneContractAddr,
    // Who funded / controls a quest's pool
    QuestAuthority(u32),
    // Token balance allocated to a quest
    QuestPool(u32),
    // Per-user total earnings
    UserEarnings(Address),
    // Global stats
    TotalDistributed,
    // Idempotency: tracks whether a (quest, milestone, enrollee) payout was already made
    PayoutRecord(u32, u32, Address), // (quest_id, milestone_id, enrollee)
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InsufficientPool = 4,
    InvalidAmount = 5,
    QuestNotFunded = 6,
    QuestLookupFailed = 7,
    MilestoneNotCompleted = 8,
    MilestoneContractNotInitialized = 9,
    ArithmeticOverflow = 10,
    AlreadyPaid = 11,
    InvalidToken = 12,
}

const BUMP: u32 = 518_400;
const THRESHOLD: u32 = 120_960;

#[contract]
pub struct RewardsContract;

#[contractimpl]
impl RewardsContract {
    /// Initialize with the token contract address (SAC for the reward token),
    /// the quest contract address for ownership verification,
    /// and the milestone contract address for completion verification.
    pub fn initialize(
        env: Env,
        token_addr: Address,
        quest_contract_addr: Address,
        milestone_contract_addr: Address,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::TokenAddr) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage()
            .instance()
            .set(&DataKey::TokenAddr, &token_addr);
        env.storage()
            .instance()
            .set(&DataKey::QuestContractAddr, &quest_contract_addr);
        env.storage()
            .instance()
            .set(&DataKey::MilestoneContractAddr, &milestone_contract_addr);
        env.storage()
            .instance()
            .set(&DataKey::TotalDistributed, &0_i128);
        env.storage().instance().extend_ttl(THRESHOLD, BUMP);
        Ok(())
    }

    /// Fund a quest's reward pool. The funder becomes the quest authority.
    /// Transfers tokens from the funder to this contract and credits the quest pool.
    pub fn fund_quest(env: Env, funder: Address, quest_id: u32, amount: i128) -> Result<(), Error> {
        funder.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Security Fix: Verify that the funder is the quest owner using direct contract invocation
        let quest_contract_addr = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::QuestContractAddr)
            .ok_or(Error::NotInitialized)?;

        // Using QuestClient trait-based client to avoid WASM requirement in CI
        let quest_client = QuestClient::new(&env, &quest_contract_addr);
        let quest_info_result = quest_client.try_get_quest(&quest_id);
        let quest_info = match quest_info_result {
            Ok(Ok(quest)) => quest,
            Ok(Err(_)) => return Err(Error::QuestLookupFailed),
            Err(_) => return Err(Error::QuestLookupFailed),
        };

        if quest_info.owner != funder {
            return Err(Error::Unauthorized);
        }

        let token_addr = Self::get_token(&env)?;

        // Validate that token_addr points to a live SAC contract.
        // A non-contract address or an address without a token interface
        // will cause try_symbol() to fail, rejecting the funding early.
        let token_client = token::Client::new(&env, &token_addr);
        if token_client.try_symbol().is_err() {
            return Err(Error::InvalidToken);
        }

        // If quest already has an authority, only they can add more funds
        let auth_key = DataKey::QuestAuthority(quest_id);
        if let Some(existing) = env
            .storage()
            .persistent()
            .get::<DataKey, Address>(&auth_key)
        {
            if existing != funder {
                return Err(Error::Unauthorized);
            }
        } else {
            env.storage().persistent().set(&auth_key, &funder);
            env.storage()
                .persistent()
                .extend_ttl(&auth_key, THRESHOLD, BUMP);
        }

        // Transfer tokens from funder to this contract
        token_client.transfer(&funder, &env.current_contract_address(), &amount);

        // Credit the quest pool
        let pool_key = DataKey::QuestPool(quest_id);
        let current: i128 = env.storage().persistent().get(&pool_key).unwrap_or(0);
        let new_pool = current
            .checked_add(amount)
            .ok_or(Error::ArithmeticOverflow)?;
        env.storage().persistent().set(&pool_key, &new_pool);
        env.storage()
            .persistent()
            .extend_ttl(&pool_key, THRESHOLD, BUMP);

        // Emit quest funding event
        // Event topics: (reward, funded)
        // Event data: (quest_id, funder, amount)
        env.events().publish(
            (symbol_short!("reward"), symbol_short!("funded")),
            (quest_id, funder, amount),
        );

        Ok(())
    }

    /// Distribute reward tokens to an enrollee. Authority only.
    /// Requires milestone completion verification before payment.
    /// Idempotent: a second call for the same (quest, milestone, enrollee) returns AlreadyPaid.
    pub fn distribute_reward(
        env: Env,
        authority: Address,
        quest_id: u32,
        milestone_id: u32,
        enrollee: Address,
        amount: i128,
    ) -> Result<(), Error> {
        authority.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Idempotency check: reject duplicate payouts for (quest, milestone, enrollee)
        let payout_key = DataKey::PayoutRecord(quest_id, milestone_id, enrollee.clone());
        if env.storage().persistent().has(&payout_key) {
            return Err(Error::AlreadyPaid);
        }

        // Verify authority
        let auth_key = DataKey::QuestAuthority(quest_id);
        let stored: Address = env
            .storage()
            .persistent()
            .get::<DataKey, Address>(&auth_key)
            .ok_or(Error::QuestNotFunded)?;
        if stored != authority {
            return Err(Error::Unauthorized);
        }

        // Verify milestone completion before allowing reward distribution
        let milestone_contract_addr = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::MilestoneContractAddr)
            .ok_or(Error::MilestoneContractNotInitialized)?;

        let milestone_client = MilestoneClient::new(&env, &milestone_contract_addr);
        if !milestone_client.is_completed(&quest_id, &milestone_id, &enrollee) {
            return Err(Error::MilestoneNotCompleted);
        }

        // Check pool balance
        let pool_key = DataKey::QuestPool(quest_id);
        let pool: i128 = env.storage().persistent().get(&pool_key).unwrap_or(0);
        if pool < amount {
            return Err(Error::InsufficientPool);
        }

        // Transfer tokens to enrollee
        let token_addr = Self::get_token(&env)?;
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&env.current_contract_address(), &enrollee, &amount);

        // Update pool balance
        let new_pool = pool.checked_sub(amount).ok_or(Error::ArithmeticOverflow)?;
        env.storage().persistent().set(&pool_key, &new_pool);
        env.storage()
            .persistent()
            .extend_ttl(&pool_key, THRESHOLD, BUMP);

        // Record payout for idempotency (prevents duplicate payouts on retry)
        env.storage().persistent().set(&payout_key, &amount);
        env.storage()
            .persistent()
            .extend_ttl(&payout_key, THRESHOLD, BUMP);

        // Track user earnings
        let earn_key = DataKey::UserEarnings(enrollee.clone());
        let earned: i128 = env.storage().persistent().get(&earn_key).unwrap_or(0);
        let new_earned = earned
            .checked_add(amount)
            .ok_or(Error::ArithmeticOverflow)?;
        env.storage().persistent().set(&earn_key, &new_earned);
        env.storage()
            .persistent()
            .extend_ttl(&earn_key, THRESHOLD, BUMP);

        // Update global total
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalDistributed)
            .unwrap_or(0);
        let new_total = total.checked_add(amount).ok_or(Error::ArithmeticOverflow)?;
        env.storage()
            .instance()
            .set(&DataKey::TotalDistributed, &new_total);
        env.storage().instance().extend_ttl(THRESHOLD, BUMP);

        // Emit reward distribution event
        // Event topics: (reward, distributed)
        // Event data: (quest_id, milestone_id, enrollee, amount)
        env.events().publish(
            (symbol_short!("reward"), symbol_short!("paid")),
            (quest_id, milestone_id, enrollee, amount),
        );

        Ok(())
    }

    /// Get the token pool balance for a quest.
    pub fn get_pool_balance(env: Env, quest_id: u32) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::QuestPool(quest_id))
            .unwrap_or(0)
    }

    /// Get total earnings for a user across all quests.
    pub fn get_user_earnings(env: Env, user: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::UserEarnings(user))
            .unwrap_or(0)
    }

    /// Get global total distributed.
    pub fn get_total_distributed(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalDistributed)
            .unwrap_or(0)
    }

    /// Get the reward token address.
    pub fn get_token(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::TokenAddr)
            .ok_or(Error::NotInitialized)
    }
}

#[cfg(test)]
mod test;
