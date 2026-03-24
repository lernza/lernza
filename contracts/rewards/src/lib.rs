#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, token, Address, Env};

// Rewards contract: holds token pools per quest and distributes rewards.
//
// Flow:
// 1. Quest owner calls fund_quest() to deposit tokens into the pool
// 2. When owner verifies a milestone completion, frontend calls distribute_reward()
// 3. Tokens transfer from the contract's pool to the enrollee
//
// Auth model: whoever funds a quest becomes its authority.
// Only the authority can distribute from that quest's pool.

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    TokenAddr,
    // Who funded / controls a quest's pool
    QuestAuthority(u32),
    // Token balance allocated to a quest
    QuestPool(u32),
    // Per-user total earnings
    UserEarnings(Address),
    // Global stats
    TotalDistributed,
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
}

const BUMP: u32 = 518_400;
const THRESHOLD: u32 = 120_960;

#[contract]
pub struct RewardsContract;

#[contractimpl]
impl RewardsContract {
    /// Initialize with the token contract address (SAC for the reward token).
    pub fn initialize(env: Env, token_addr: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::TokenAddr) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage()
            .instance()
            .set(&DataKey::TokenAddr, &token_addr);
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

        let token_addr = Self::get_token(&env)?;

        // If quest already has an authority, only they can add more funds
        let auth_key = DataKey::QuestAuthority(quest_id);
        if let Some(existing) = env.storage().persistent().get::<_, Address>(&auth_key) {
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
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&funder, env.current_contract_address(), &amount);

        // Credit the quest pool
        let pool_key = DataKey::QuestPool(quest_id);
        let current: i128 = env.storage().persistent().get(&pool_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&pool_key, &(current + amount));
        env.storage()
            .persistent()
            .extend_ttl(&pool_key, THRESHOLD, BUMP);

        Ok(())
    }

    /// Distribute reward tokens to an enrollee. Authority only.
    /// Called after milestone verification.
    pub fn distribute_reward(
        env: Env,
        authority: Address,
        quest_id: u32,
        enrollee: Address,
        amount: i128,
    ) -> Result<(), Error> {
        authority.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Verify authority
        let auth_key = DataKey::QuestAuthority(quest_id);
        let stored: Address = env
            .storage()
            .persistent()
            .get(&auth_key)
            .ok_or(Error::QuestNotFunded)?;
        if stored != authority {
            return Err(Error::Unauthorized);
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
        env.storage().persistent().set(&pool_key, &(pool - amount));
        env.storage()
            .persistent()
            .extend_ttl(&pool_key, THRESHOLD, BUMP);

        // Track user earnings
        let earn_key = DataKey::UserEarnings(enrollee);
        let earned: i128 = env.storage().persistent().get(&earn_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&earn_key, &(earned + amount));
        env.storage()
            .persistent()
            .extend_ttl(&earn_key, THRESHOLD, BUMP);

        // Update global total
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalDistributed)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalDistributed, &(total + amount));
        env.storage().instance().extend_ttl(THRESHOLD, BUMP);

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
            .get(&DataKey::TokenAddr)
            .ok_or(Error::NotInitialized)
    }
}

mod test;
