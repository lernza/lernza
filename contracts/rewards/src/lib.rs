#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, token, Address, Env};

// Rewards contract: holds token pools per workspace and distributes rewards.
//
// Flow:
// 1. Workspace owner calls fund_workspace() to deposit tokens into the pool
// 2. When owner verifies a milestone completion, frontend calls distribute_reward()
// 3. Tokens transfer from the contract's pool to the enrollee
//
// Auth model: whoever funds a workspace becomes its authority.
// Only the authority can distribute from that workspace's pool.
// A platform admin (set at initialization) can pause the contract,
// set the platform fee, and transfer admin rights.

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    TokenAddr,
    // Who funded / controls a workspace's pool
    WorkspaceAuthority(u32),
    // Token balance allocated to a workspace
    WorkspacePool(u32),
    // Per-user total earnings
    UserEarnings(Address),
    // Global stats
    TotalDistributed,
    // Platform governance
    Admin,
    Paused,
    PlatformFeeBps,     // fee in basis points (0–10_000)
    PlatformFeeBalance, // accumulated fee tokens retained in contract
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
    WorkspaceNotFunded = 6,
    Paused = 7,
    InvalidFee = 8, // basis points must be 0–10_000
}

const BUMP: u32 = 518_400;
const THRESHOLD: u32 = 120_960;

#[contract]
pub struct RewardsContract;

#[contractimpl]
impl RewardsContract {
    /// Initialize with the reward token address and platform admin.
    pub fn initialize(env: Env, token_addr: Address, admin: Address) -> Result<(), Error> {
        admin.require_auth();
        if env.storage().instance().has(&DataKey::TokenAddr) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage()
            .instance()
            .set(&DataKey::TokenAddr, &token_addr);
        env.storage()
            .instance()
            .set(&DataKey::TotalDistributed, &0_i128);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage()
            .instance()
            .set(&DataKey::PlatformFeeBps, &0_u32);
        env.storage()
            .instance()
            .set(&DataKey::PlatformFeeBalance, &0_i128);
        env.storage().instance().extend_ttl(THRESHOLD, BUMP);
        Ok(())
    }

    /// Pause all state-changing operations. Admin only.
    pub fn pause(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();
        Self::require_admin(&env, &admin)?;
        env.storage().instance().set(&DataKey::Paused, &true);
        env.storage().instance().extend_ttl(THRESHOLD, BUMP);
        Ok(())
    }

    /// Resume operations after a pause. Admin only.
    pub fn unpause(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();
        Self::require_admin(&env, &admin)?;
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().instance().extend_ttl(THRESHOLD, BUMP);
        Ok(())
    }

    /// Set the platform fee in basis points (100 bps = 1%). Max 10_000. Admin only.
    /// Fee is deducted from each reward distribution and retained in the contract.
    pub fn set_platform_fee(env: Env, admin: Address, bps: u32) -> Result<(), Error> {
        admin.require_auth();
        Self::require_admin(&env, &admin)?;
        if bps > 10_000 {
            return Err(Error::InvalidFee);
        }
        env.storage().instance().set(&DataKey::PlatformFeeBps, &bps);
        env.storage().instance().extend_ttl(THRESHOLD, BUMP);
        Ok(())
    }

    /// Transfer admin rights to a new address. Current admin only.
    pub fn transfer_admin(env: Env, admin: Address, new_admin: Address) -> Result<(), Error> {
        admin.require_auth();
        Self::require_admin(&env, &admin)?;
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        env.storage().instance().extend_ttl(THRESHOLD, BUMP);
        Ok(())
    }

    /// Fund a workspace's reward pool. The funder becomes the workspace authority.
    /// Transfers tokens from the funder to this contract and credits the workspace pool.
    pub fn fund_workspace(
        env: Env,
        funder: Address,
        workspace_id: u32,
        amount: i128,
    ) -> Result<(), Error> {
        funder.require_auth();
        Self::check_not_paused(&env)?;

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let token_addr = Self::get_token(&env)?;

        // If workspace already has an authority, only they can add more funds
        let auth_key = DataKey::WorkspaceAuthority(workspace_id);
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

        // Credit the workspace pool
        let pool_key = DataKey::WorkspacePool(workspace_id);
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
    /// Called after milestone verification. Platform fee is deducted before transfer.
    pub fn distribute_reward(
        env: Env,
        authority: Address,
        workspace_id: u32,
        enrollee: Address,
        amount: i128,
    ) -> Result<(), Error> {
        authority.require_auth();
        Self::check_not_paused(&env)?;

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Verify authority
        let auth_key = DataKey::WorkspaceAuthority(workspace_id);
        let stored: Address = env
            .storage()
            .persistent()
            .get(&auth_key)
            .ok_or(Error::WorkspaceNotFunded)?;
        if stored != authority {
            return Err(Error::Unauthorized);
        }

        // Check pool balance
        let pool_key = DataKey::WorkspacePool(workspace_id);
        let pool: i128 = env.storage().persistent().get(&pool_key).unwrap_or(0);
        if pool < amount {
            return Err(Error::InsufficientPool);
        }

        // Calculate platform fee
        let fee_bps: u32 = env
            .storage()
            .instance()
            .get(&DataKey::PlatformFeeBps)
            .unwrap_or(0);
        let fee = (amount * fee_bps as i128) / 10_000;
        let enrollee_amount = amount - fee;

        // Transfer net amount to enrollee
        let token_addr = Self::get_token(&env)?;
        let client = token::Client::new(&env, &token_addr);
        if enrollee_amount > 0 {
            client.transfer(&env.current_contract_address(), &enrollee, &enrollee_amount);
        }

        // Pool decreases by the full requested amount
        env.storage().persistent().set(&pool_key, &(pool - amount));
        env.storage()
            .persistent()
            .extend_ttl(&pool_key, THRESHOLD, BUMP);

        // Accumulate platform fee
        if fee > 0 {
            let bal: i128 = env
                .storage()
                .instance()
                .get(&DataKey::PlatformFeeBalance)
                .unwrap_or(0);
            env.storage()
                .instance()
                .set(&DataKey::PlatformFeeBalance, &(bal + fee));
        }

        // Track user earnings (net amount received)
        let earn_key = DataKey::UserEarnings(enrollee);
        let earned: i128 = env.storage().persistent().get(&earn_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&earn_key, &(earned + enrollee_amount));
        env.storage()
            .persistent()
            .extend_ttl(&earn_key, THRESHOLD, BUMP);

        // Update global total (net distributed to enrollees)
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalDistributed)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalDistributed, &(total + enrollee_amount));
        env.storage().instance().extend_ttl(THRESHOLD, BUMP);

        Ok(())
    }

    /// Get the token pool balance for a workspace.
    pub fn get_pool_balance(env: Env, workspace_id: u32) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::WorkspacePool(workspace_id))
            .unwrap_or(0)
    }

    /// Get total earnings for a user across all workspaces.
    pub fn get_user_earnings(env: Env, user: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::UserEarnings(user))
            .unwrap_or(0)
    }

    /// Get global total distributed to enrollees (excluding fees).
    pub fn get_total_distributed(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalDistributed)
            .unwrap_or(0)
    }

    /// Get the platform admin address.
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    /// Returns true if the contract is paused.
    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    /// Get the current platform fee in basis points.
    pub fn get_platform_fee_bps(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::PlatformFeeBps)
            .unwrap_or(0)
    }

    /// Get accumulated platform fee tokens retained in this contract.
    pub fn get_platform_fee_balance(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::PlatformFeeBalance)
            .unwrap_or(0)
    }

    /// Get the reward token address.
    pub fn get_token(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::TokenAddr)
            .ok_or(Error::NotInitialized)
    }

    // --- internals ---

    fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
        let stored: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if stored != *caller {
            return Err(Error::Unauthorized);
        }
        Ok(())
    }

    fn check_not_paused(env: &Env) -> Result<(), Error> {
        let paused: bool = env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false);
        if paused {
            return Err(Error::Paused);
        }
        Ok(())
    }
}

mod test;
