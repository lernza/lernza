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
}

#[contractclient(name = "QuestClient")]
pub trait QuestContractTrait {
    fn get_quest(env: Env, quest_id: u32) -> Result<QuestInfo, soroban_sdk::Val>;
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
    Admin,
    QuestContractAddr,
    AdminAddr,
    // Who funded / controls a quest's pool
    QuestAuthority(u32),
    // Token balance allocated to a quest
    QuestPool(u32),
    // Per-user total earnings
    UserEarnings(Address),
    // Global stats
    TotalDistributed,
    // Total tokens allocated to quest pools
    TotalAllocated,
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
    InsufficientUnallocated = 7,
    QuestLookupFailed = 7,
}

const BUMP: u32 = 518_400;
const THRESHOLD: u32 = 120_960;

#[contract]
pub struct RewardsContract;

#[contractimpl]
impl RewardsContract {
    /// Initialize with the token contract address (SAC for the reward token),
    /// the quest contract address for ownership verification,
    /// and the admin address for recovery operations.
    pub fn initialize(
        env: Env,
        admin: Address,
        token_addr: Address,
        quest_contract_addr: Address,
    ) -> Result<(), Error> {
        admin.require_auth();

        if env.storage().instance().has(&DataKey::TokenAddr) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::TokenAddr, &token_addr);
        env.storage()
            .instance()
            .set(&DataKey::QuestContractAddr, &quest_contract_addr);
        env.storage()
            .instance()
            .set(&DataKey::AdminAddr, &admin);
        env.storage()
            .instance()
            .set(&DataKey::TotalDistributed, &0_i128);
        env.storage()
            .instance()
            .set(&DataKey::TotalAllocated, &0_i128);
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
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&funder, &env.current_contract_address(), &amount);

        // Credit the quest pool
        let pool_key = DataKey::QuestPool(quest_id);
        let current: i128 = env.storage().persistent().get(&pool_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&pool_key, &(current + amount));
        env.storage()
            .persistent()
            .extend_ttl(&pool_key, THRESHOLD, BUMP);

        // Update total allocated counter
        let total_allocated: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalAllocated)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalAllocated, &(total_allocated + amount));
        env.storage().instance().extend_ttl(THRESHOLD, BUMP);

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
            .get::<DataKey, Address>(&auth_key)
            .ok_or(Error::QuestNotFunded)?;
        if stored != authority {
            return Err(Error::Unauthorized);
        }

        if authority == enrollee {
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

        // Update total allocated counter
        let total_allocated: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalAllocated)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalAllocated, &(total_allocated - amount));
        env.storage().instance().extend_ttl(THRESHOLD, BUMP);

        // Track user earnings
        let earn_key = DataKey::UserEarnings(enrollee.clone());
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

        // Emit reward distribution event
        // Event topics: (reward, distributed)
        // Event data: (quest_id, enrollee, amount)
        env.events().publish(
            (symbol_short!("reward"), symbol_short!("paid")),
            (quest_id, enrollee, amount),
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

    /// Get the admin address.
    pub fn get_admin(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::AdminAddr)
            .ok_or(Error::NotInitialized)
    }

    /// Calculate the total allocated balance across all quest pools.
    /// Note: This is an O(n) operation that iterates through all quest pools.
    /// In production, consider maintaining a separate total allocated counter.
    fn get_total_allocated(env: &Env) -> i128 {
        let mut total = 0_i128;
        
        // Since we can't iterate over storage keys directly in Soroban,
        // we'll need to maintain a separate counter for production use.
        // For now, we'll return 0 and implement a simpler approach.
        // In a real implementation, you'd maintain a TotalAllocated counter.
        
        total
    }

    /// Get the actual token balance held by this contract.
    fn get_actual_balance(env: &Env) -> Result<i128, Error> {
        let token_addr = Self::get_token(env)?;
        let token_client = token::Client::new(env, &token_addr);
        Ok(token_client.balance(&env.current_contract_address()))
    }

    /// Calculate unallocated balance (actual balance minus allocated pools).
    fn get_unallocated_balance(env: &Env) -> Result<i128, Error> {
        let actual_balance = Self::get_actual_balance(env)?;
        let total_allocated: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalAllocated)
            .unwrap_or(0);
        Ok(actual_balance - total_allocated)
    }

    /// Recover tokens that were sent directly to the contract address.
    /// Only admin can call this function, and only unallocated tokens can be recovered.
    /// This provides a safety mechanism for accidental direct transfers.
    pub fn recover_tokens(
        env: Env,
        admin: Address,
        recipient: Address,
        amount: i128,
    ) -> Result<(), Error> {
        admin.require_auth();

        // Verify caller is admin
        let stored_admin = Self::get_admin(&env)?;
        if stored_admin != admin {
            return Err(Error::Unauthorized);
        }

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Check unallocated balance
        let unallocated = Self::get_unallocated_balance(&env)?;
        if unallocated < amount {
            return Err(Error::InsufficientUnallocated);
        }

        // Transfer tokens to recipient
        let token_addr = Self::get_token(&env)?;
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&env.current_contract_address(), &recipient, &amount);

        // Emit recovery event for audit trail
        // Event topics: (reward, recovered)
        // Event data: (admin, recipient, amount)
        env.events().publish(
            (symbol_short!("reward"), symbol_short!("recovered")),
            (admin, recipient, amount),
        );

        Ok(())
    }

    /// Get the current unallocated balance available for recovery.
    pub fn get_unallocated_balance_public(env: Env) -> Result<i128, Error> {
        Self::get_unallocated_balance(&env)
    }
}

mod test;
