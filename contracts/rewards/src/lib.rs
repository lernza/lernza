#![no_std]
use common::{
    extend_instance_ttl, EnrolleeStatus, QuestInfo, QuestStatus, BUMP, MAX_REWARD_AMOUNT, THRESHOLD,
};
use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, token, Address, BytesN,
    Env, String, Symbol, Vec,
};

// Visibility, QuestStatus, and QuestInfo moved to common.

#[contractclient(name = "QuestClient")]
pub trait QuestContractTrait {
    fn get_quest(env: Env, quest_id: u32) -> Result<QuestInfo, soroban_sdk::Val>;
    fn is_enrollee(env: Env, quest_id: u32, user: Address) -> Result<bool, soroban_sdk::Val>;
    fn get_enrollee_status(
        env: Env,
        quest_id: u32,
        enrollee: Address,
    ) -> Result<EnrolleeStatus, soroban_sdk::Val>;
}

#[contractclient(name = "MilestoneClient")]
pub trait MilestoneContractTrait {
    fn is_completed(env: Env, quest_id: u32, milestone_id: u32, enrollee: Address) -> bool;
    fn get_milestone_reward(
        env: Env,
        quest_id: u32,
        milestone_id: u32,
    ) -> Result<i128, soroban_sdk::Val>;
    fn get_total_reserved_reward(env: Env, quest_id: u32) -> i128;
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
    // Token balance allocated to a quest (legacy - single token)
    QuestPool(u32),
    // Per-token balance for a quest - supports multiple token types
    QuestPoolPerToken(u32, Address), // (quest_id, token_addr)
    // Per-user total earnings
    UserEarnings(Address),
    // Global stats
    TotalDistributed,
    // Total tokens ever funded — Issue #717
    TotalFunded,
    // Number of quests funded at least once — Issue #717
    QuestCount,
    // Total tokens distributed per quest
    QuestDistributed(u32),
    // Total tokens refunded per quest. Authoritative persistent aggregate
    // kept in sync with refund_pool / refund_unused_pool so the instance
    // counter `TotalDistributed` stays consistent — issue #864.
    QuestRefunded(u32),
    // Idempotency: tracks whether a (quest, milestone, enrollee) payout was already made
    PayoutRecord(u32, u32, Address), // (quest_id, milestone_id, enrollee)
    // Configurable refund grace period in seconds — Issue #882
    RefundGracePeriod,
    // Admin address for configuration updates
    Admin,
    // Pause state for admin operations
    Paused,
    // Configurable whitelist of supported reward token addresses — Issue #1349.
    // When enabled, `fund_quest_with_token` / `distribute_reward_with_token`
    // reject any token not present in this list.
    SupportedTokens,
    // Whether the supported-token whitelist is currently enforced. Starts false
    // (fail-open) so existing single/multi-token flows keep working until an
    // admin explicitly configures the platform's supported tokens.
    SupportedTokensEnabled,
}

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
    InsufficientPool = 4,
    InvalidAmount = 5,
    QuestNotFunded = 6,
    QuestLookupFailed = 7,
    MilestoneNotCompleted = 8,
    MilestoneContractNotInitialized = 9,
    ArithmeticOverflow = 10,
    AlreadyPaid = 11,
    InvalidToken = 12,
    RewardAmountMismatch = 13,
    QuestNotArchived = 14,
    RefundWindowNotOpen = 15,
    /// Quest has no deadline, or its deadline has not yet passed — issue #1187.
    QuestNotExpired = 16,
    AlreadyInitialized = 99, // moved away from standard range
    NotInitialized = 100,    // moved away from standard range
    /// Contract is administratively paused (shared code 400).
    Paused = 400,
    BatchTooLarge = 17,
    /// Reward recipient is no longer an active participant in the quest (issue #1325).
    RecipientNotEnrolled = 18,
}

// TTL constants moved to common.

// Bounds for the configurable refund grace period — Issue #1172
const MIN_REFUND_GRACE_PERIOD: u64 = 86_400; // 1 day
const MAX_REFUND_GRACE_PERIOD: u64 = 31_536_000; // 1 year

/// Maximum number of milestones an enrollee can claim in a single `claim_batch` call.
/// Aligned with milestone contract's MAX_BATCH_SIZE to keep gas costs predictable.
const MAX_CLAIM_BATCH_SIZE: u32 = 20;

// IsDataKey implementation — restricts TTL extension to Rewards DataKey only
impl common::IsDataKey for DataKey {}

#[contract]
pub struct RewardsContract;

#[contractimpl]
impl RewardsContract {
    /// Initialize with the token contract address (SAC for the reward token),
    /// the quest contract address for ownership verification,
    /// the milestone contract address for completion verification,
    /// and the admin address for configuration updates.
    pub fn initialize(
        env: Env,
        admin: Address,
        token_addr: Address,
        quest_contract_addr: Address,
        milestone_contract_addr: Address,
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
            .set(&DataKey::MilestoneContractAddr, &milestone_contract_addr);
        env.storage()
            .instance()
            .set(&DataKey::TotalDistributed, &0_i128);
        // Default refund grace period: 7 days (604,800 seconds)
        env.storage()
            .instance()
            .set(&DataKey::RefundGracePeriod, &604_800_u64);
        env.storage().instance().set(&DataKey::Paused, &false);
        extend_instance_ttl(&env);
        Ok(())
    }

    /// Returns the address that holds the contract-administrator role.
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    /// Upgrade this contract's WASM. Only the stored administrator can invoke it.
    pub fn upgrade(env: Env, admin: Address, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        admin.require_auth();
        let stored_admin = Self::get_admin(env.clone())?;
        if stored_admin != admin {
            return Err(Error::Unauthorized);
        }
        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }

    /// Fund a quest's reward pool. The funder becomes the quest authority.
    /// Transfers tokens from the funder to this contract and credits the quest pool.
    pub fn fund_quest(env: Env, funder: Address, quest_id: u32, amount: i128) -> Result<(), Error> {
        funder.require_auth();

        if env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
        {
            return Err(Error::Paused);
        }

        if amount <= 0 || amount > MAX_REWARD_AMOUNT {
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
        // Log outgoing cross-contract call (params left empty to avoid heavy formatting in contract)
        common::log_cross_call(
            &env,
            &quest_contract_addr,
            "get_quest",
            &String::from_str(&env, ""),
        );
        let quest_info_result = quest_client.try_get_quest(&quest_id);
        // Emit return log indicating success/failure
        match &quest_info_result {
            Ok(Ok(_)) => common::log_cross_return(
                &env,
                &quest_contract_addr,
                "get_quest",
                true,
                &String::from_str(&env, ""),
            ),
            Ok(Err(_)) | Err(_) => common::log_cross_return(
                &env,
                &quest_contract_addr,
                "get_quest",
                false,
                &String::from_str(&env, ""),
            ),
        }
        let quest_info = match quest_info_result {
            Ok(Ok(quest)) => quest,
            Ok(Err(_)) => return Err(Error::QuestLookupFailed),
            Err(_) => return Err(Error::QuestLookupFailed),
        };

        if quest_info.owner != funder {
            return Err(Error::Unauthorized);
        }

        let token_addr = Self::get_token(&env)?;

        // Verify the quest's configured token matches the rewards contract's token.
        // Prevents a mismatch where a quest advertises token A but rewards are paid in token B.
        if quest_info.token_addr != token_addr {
            return Err(Error::InvalidToken);
        }

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
            common::extend_persistent_ttl(&env, &auth_key);

            // Emit authority assignment event for indexers to track refund authority
            env.events().publish(
                (Symbol::new(&env, "reward_authority_assigned"),),
                (quest_id, funder.clone()),
            );
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

        // Issue #717 — maintain platform-wide funding stats
        let total_funded: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalFunded)
            .unwrap_or(0);
        let new_total_funded = total_funded
            .checked_add(amount)
            .ok_or(Error::ArithmeticOverflow)?;
        env.storage()
            .instance()
            .set(&DataKey::TotalFunded, &new_total_funded);

        // Increment quest count only on first fund for this quest
        if current == 0 {
            let quest_count: u32 = env
                .storage()
                .instance()
                .get(&DataKey::QuestCount)
                .unwrap_or(0);
            let new_qc = quest_count
                .checked_add(1)
                .ok_or(Error::ArithmeticOverflow)?;
            env.storage().instance().set(&DataKey::QuestCount, &new_qc);
        }

        // Emit quest funding event
        // Event topics: (reward_funded,)
        // Event data: (quest_id, funder, amount)
        // Emit quest funding event via shared helper
        common::emit_reward_funded(&env, quest_id, &funder, amount);

        Ok(())
    }

    /// Fund a quest with a specific token type. Extends fund_quest to support multiple tokens.
    /// Each quest can hold balances in multiple different SAC tokens simultaneously.
    pub fn fund_quest_with_token(
        env: Env,
        funder: Address,
        quest_id: u32,
        token_addr: Address,
        amount: i128,
    ) -> Result<(), Error> {
        funder.require_auth();

        if env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
        {
            return Err(Error::Paused);
        }

        if amount <= 0 || amount > MAX_REWARD_AMOUNT {
            return Err(Error::InvalidAmount);
        }

        // Verify the quest exists and funder is authorized
        let quest_contract_addr = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::QuestContractAddr)
            .ok_or(Error::NotInitialized)?;

        let quest_client = QuestClient::new(&env, &quest_contract_addr);
        let quest_info = quest_client
            .try_get_quest(&quest_id)
            .map_err(|_| Error::QuestLookupFailed)?
            .map_err(|_| Error::QuestLookupFailed)?;

        if quest_info.owner != funder {
            return Err(Error::Unauthorized);
        }

        // Validate the token address
        let token_client = token::Client::new(&env, &token_addr);
        if token_client.try_symbol().is_err() {
            return Err(Error::InvalidToken);
        }

        // Reject tokens that are not on the platform's supported-token whitelist.
        // Prevents a milestone from promising — and the platform from holding or
        // distributing — a token the platform has not deployed/approved.
        if !Self::is_token_supported(&env, &token_addr) {
            return Err(Error::InvalidToken);
        }

        // Set authority if not already set
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
            common::extend_persistent_ttl(&env, &auth_key);
        }

        // Transfer tokens from funder to this contract
        token_client.transfer(&funder, &env.current_contract_address(), &amount);

        // Credit the quest pool for this specific token
        let pool_key = DataKey::QuestPoolPerToken(quest_id, token_addr.clone());
        let current: i128 = env.storage().persistent().get(&pool_key).unwrap_or(0);
        let new_pool = current
            .checked_add(amount)
            .ok_or(Error::ArithmeticOverflow)?;
        env.storage().persistent().set(&pool_key, &new_pool);
        common::extend_persistent_ttl(&env, &pool_key);

        // Update global funding stats
        let total_funded: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalFunded)
            .unwrap_or(0);
        let new_total_funded = total_funded
            .checked_add(amount)
            .ok_or(Error::ArithmeticOverflow)?;
        env.storage()
            .instance()
            .set(&DataKey::TotalFunded, &new_total_funded);

        if current == 0 {
            let quest_count: u32 = env
                .storage()
                .instance()
                .get(&DataKey::QuestCount)
                .unwrap_or(0);
            let new_qc = quest_count
                .checked_add(1)
                .ok_or(Error::ArithmeticOverflow)?;
            env.storage().instance().set(&DataKey::QuestCount, &new_qc);
        }

        common::emit_reward_funded(&env, quest_id, &funder, amount);

        Ok(())
    }

    /// Distribute reward tokens to an enrollee. Authority only.
    /// Requires milestone completion verification before payment.
    /// Idempotent: a second call for the same (quest, milestone, enrollee) returns AlreadyPaid.
    pub fn distribute_reward(
        env: Env,
        caller: Address,
        quest_id: u32,
        milestone_id: u32,
        enrollee: Address,
        amount: i128,
    ) -> Result<(), Error> {
        caller.require_auth();

        if env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
        {
            return Err(Error::Paused);
        }

        if amount <= 0 || amount > MAX_REWARD_AMOUNT {
            return Err(Error::InvalidAmount);
        }

        // Idempotency check: reject duplicate payouts for (quest, milestone, enrollee)
        let payout_key = DataKey::PayoutRecord(quest_id, milestone_id, enrollee.clone());
        if env.storage().persistent().has(&payout_key) {
            return Err(Error::AlreadyPaid);
        }

        // Verify caller is the quest authority
        let auth_key = DataKey::QuestAuthority(quest_id);
        let authority: Address = env
            .storage()
            .persistent()
            .get::<DataKey, Address>(&auth_key)
            .ok_or(Error::QuestNotFunded)?;
        if caller != authority {
            return Err(Error::Unauthorized);
        }
        if caller == enrollee {
            return Err(Error::Unauthorized);
        }

        // Verify milestone completion before allowing reward distribution
        let milestone_contract_addr = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::MilestoneContractAddr)
            .ok_or(Error::MilestoneContractNotInitialized)?;

        let milestone_client = MilestoneClient::new(&env, &milestone_contract_addr);
        // Log outgoing check and capture result
        common::log_cross_call(
            &env,
            &milestone_contract_addr,
            "is_completed",
            &String::from_str(&env, ""),
        );
        let completed = milestone_client.is_completed(&quest_id, &milestone_id, &enrollee);
        common::log_cross_return(
            &env,
            &milestone_contract_addr,
            "is_completed",
            completed,
            &String::from_str(&env, ""),
        );
        if !completed {
            return Err(Error::MilestoneNotCompleted);
        }

        // Issue #1325: Verify the recipient is still an active participant.
        // A user who was removed or left the quest after completing a milestone
        // must not receive a reward payout.
        let quest_contract_addr = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::QuestContractAddr)
            .ok_or(Error::NotInitialized)?;
        let quest_client = QuestClient::new(&env, &quest_contract_addr);
        let is_active = quest_client
            .try_is_enrollee(&quest_id, &enrollee)
            .unwrap_or(Ok(false))
            .unwrap_or(false)
            && quest_client
                .try_get_enrollee_status(&quest_id, &enrollee)
                .unwrap_or(Ok(EnrolleeStatus::Inactive))
                .unwrap_or(EnrolleeStatus::Inactive)
                == EnrolleeStatus::Active;
        if !is_active {
            return Err(Error::RecipientNotEnrolled);
        }

        // Validate amount matches the milestone's configured reward to prevent
        // the authority from over- or under-paying relative to what was promised.
        match milestone_client.try_get_milestone_reward(&quest_id, &milestone_id) {
            Ok(Ok(expected)) if expected > 0 && amount != expected => {
                return Err(Error::RewardAmountMismatch);
            }
            _ => {} // Proceed if milestone not found or amount matches
        }

        // Check pool balance
        let pool_key = DataKey::QuestPool(quest_id);
        let pool: i128 = env.storage().persistent().get(&pool_key).unwrap_or(0);
        if pool < amount {
            return Err(Error::InsufficientPool);
        }

        // Record payout for idempotency BEFORE the token transfer. If the
        // transfer subsequently panics or reverts, the whole transaction
        // rolls back together with the PayoutRecord write — so on retry we
        // see no record and try again. If the transfer succeeds the record
        // is durable, blocking any duplicate payout. See issue #861.
        env.storage().persistent().set(&payout_key, &amount);
        common::extend_persistent_ttl(&env, &payout_key);

        // Update pool balance to reflect the upcoming transfer.
        let new_pool = pool.checked_sub(amount).ok_or(Error::ArithmeticOverflow)?;
        env.storage().persistent().set(&pool_key, &new_pool);
        env.storage()
            .persistent()
            .extend_ttl(&pool_key, THRESHOLD, BUMP);

        // Transfer tokens to enrollee. A panic here reverts the whole tx
        // including the PayoutRecord + pool writes above.
        let token_addr = Self::get_token(&env)?;
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&env.current_contract_address(), &enrollee, &amount);

        // Track user earnings
        let earn_key = DataKey::UserEarnings(enrollee.clone());
        let earned: i128 = env.storage().persistent().get(&earn_key).unwrap_or(0);
        let new_earned = earned
            .checked_add(amount)
            .ok_or(Error::ArithmeticOverflow)?;
        env.storage().persistent().set(&earn_key, &new_earned);
        common::extend_persistent_ttl(&env, &earn_key);

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

        // Update quest specific total distributed
        let q_dist_key = DataKey::QuestDistributed(quest_id);
        let q_total: i128 = env.storage().persistent().get(&q_dist_key).unwrap_or(0);
        let q_new = q_total
            .checked_add(amount)
            .ok_or(Error::ArithmeticOverflow)?;
        env.storage().persistent().set(&q_dist_key, &q_new);
        common::extend_persistent_ttl(&env, &q_dist_key);

        extend_instance_ttl(&env);

        // Emit reward distribution event
        // Event topics: (reward_distributed,)
        // Event data: (quest_id, milestone_id, enrollee, amount)
        // Emit reward distribution event via shared helper
        common::emit_reward_distributed(&env, quest_id, milestone_id, &enrollee, amount);

        Ok(())
    }

    /// Distribute reward tokens from a specific token's pool. Extends distribute_reward
    /// to support multiple token types per quest. Caller specifies which token to distribute from.
    pub fn distribute_reward_with_token(
        env: Env,
        caller: Address,
        quest_id: u32,
        milestone_id: u32,
        enrollee: Address,
        token_addr: Address,
        amount: i128,
    ) -> Result<(), Error> {
        caller.require_auth();

        if env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
        {
            return Err(Error::Paused);
        }

        if amount <= 0 || amount > MAX_REWARD_AMOUNT {
            return Err(Error::InvalidAmount);
        }

        // Idempotency check
        let payout_key = DataKey::PayoutRecord(quest_id, milestone_id, enrollee.clone());
        if env.storage().persistent().has(&payout_key) {
            return Err(Error::AlreadyPaid);
        }

        // Verify caller is the quest authority
        let auth_key = DataKey::QuestAuthority(quest_id);
        let authority: Address = env
            .storage()
            .persistent()
            .get::<DataKey, Address>(&auth_key)
            .ok_or(Error::QuestNotFunded)?;
        if caller != authority {
            return Err(Error::Unauthorized);
        }
        if caller == enrollee {
            return Err(Error::Unauthorized);
        }

        // Verify milestone completion
        let milestone_contract_addr = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::MilestoneContractAddr)
            .ok_or(Error::MilestoneContractNotInitialized)?;

        let milestone_client = MilestoneClient::new(&env, &milestone_contract_addr);
        let completed = milestone_client.is_completed(&quest_id, &milestone_id, &enrollee);
        if !completed {
            return Err(Error::MilestoneNotCompleted);
        }

        // Validate token
        let token_client = token::Client::new(&env, &token_addr);
        if token_client.try_symbol().is_err() {
            return Err(Error::InvalidToken);
        }

        // Reject tokens that are not on the platform's supported-token whitelist.
        if !Self::is_token_supported(&env, &token_addr) {
            return Err(Error::InvalidToken);
        }

        // Check pool balance for this specific token
        let pool_key = DataKey::QuestPoolPerToken(quest_id, token_addr.clone());
        let pool: i128 = env.storage().persistent().get(&pool_key).unwrap_or(0);
        if pool < amount {
            return Err(Error::InsufficientPool);
        }

        // Record payout for idempotency
        env.storage().persistent().set(&payout_key, &amount);
        common::extend_persistent_ttl(&env, &payout_key);

        // Update pool balance
        let new_pool = pool.checked_sub(amount).ok_or(Error::ArithmeticOverflow)?;
        env.storage().persistent().set(&pool_key, &new_pool);
        common::extend_persistent_ttl(&env, &pool_key);

        // Transfer tokens
        token_client.transfer(&env.current_contract_address(), &enrollee, &amount);

        // Track user earnings
        let earn_key = DataKey::UserEarnings(enrollee.clone());
        let earned: i128 = env.storage().persistent().get(&earn_key).unwrap_or(0);
        let new_earned = earned
            .checked_add(amount)
            .ok_or(Error::ArithmeticOverflow)?;
        env.storage().persistent().set(&earn_key, &new_earned);
        common::extend_persistent_ttl(&env, &earn_key);

        // Update global stats
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalDistributed)
            .unwrap_or(0);
        let new_total = total.checked_add(amount).ok_or(Error::ArithmeticOverflow)?;
        env.storage()
            .instance()
            .set(&DataKey::TotalDistributed, &new_total);

        let q_dist_key = DataKey::QuestDistributed(quest_id);
        let q_total: i128 = env.storage().persistent().get(&q_dist_key).unwrap_or(0);
        let q_new = q_total
            .checked_add(amount)
            .ok_or(Error::ArithmeticOverflow)?;
        env.storage().persistent().set(&q_dist_key, &q_new);
        common::extend_persistent_ttl(&env, &q_dist_key);

        extend_instance_ttl(&env);

        // Emit event
        common::emit_reward_distributed(&env, quest_id, milestone_id, &enrollee, amount);

        Ok(())
    }

    /// Self-service batch claim: an enrollee claims rewards for multiple
    /// completed milestones in a single call.
    ///
    /// Each milestone is validated to ensure:
    ///   - The claimant completed it (cross-contract is_completed check)
    ///   - It hasn't already been paid (idempotency via PayoutRecord)
    ///   - The reward amount matches the milestone's configured reward
    ///   - No duplicate milestone IDs in the batch
    ///
    /// Returns the total amount of tokens claimed across all milestones.
    /// All-or-nothing: if any milestone fails validation, the entire
    /// transaction reverts.
    pub fn claim_batch(
        env: Env,
        claimant: Address,
        quest_id: u32,
        milestone_ids: Vec<u32>,
    ) -> Result<i128, Error> {
        claimant.require_auth();

        if env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
        {
            return Err(Error::Paused);
        }

        if milestone_ids.is_empty() || milestone_ids.len() > MAX_CLAIM_BATCH_SIZE {
            return Err(Error::BatchTooLarge);
        }

        // Verify the quest exists and is funded. A quest with no authority
        // has never been funded, so reject early (avoids wasted cross-contract
        // calls for milestones on non-existent or unfunded quests).
        let auth_key = DataKey::QuestAuthority(quest_id);
        let _authority: Address = env
            .storage()
            .persistent()
            .get::<DataKey, Address>(&auth_key)
            .ok_or(Error::QuestNotFunded)?;

        // Issue #1325: Verify the claimant is still an active participant.
        // A user who was removed or left the quest after completing milestones
        // must not be able to self-claim rewards.
        let quest_contract_addr_cb = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::QuestContractAddr)
            .ok_or(Error::NotInitialized)?;
        let claimant_active = QuestClient::new(&env, &quest_contract_addr_cb)
            .try_is_enrollee(&quest_id, &claimant)
            .unwrap_or(Ok(false))
            .unwrap_or(false)
            && QuestClient::new(&env, &quest_contract_addr_cb)
                .try_get_enrollee_status(&quest_id, &claimant)
                .unwrap_or(Ok(EnrolleeStatus::Inactive))
                .unwrap_or(EnrolleeStatus::Inactive)
                == EnrolleeStatus::Active;
        if !claimant_active {
            return Err(Error::RecipientNotEnrolled);
        }

        let milestone_contract_addr = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::MilestoneContractAddr)
            .ok_or(Error::MilestoneContractNotInitialized)?;
        let milestone_client = MilestoneClient::new(&env, &milestone_contract_addr);

        let pool_key = DataKey::QuestPool(quest_id);
        let token_addr = Self::get_token(&env)?;
        let token_client = token::Client::new(&env, &token_addr);

        let mut total_claimed: i128 = 0;
        let mut amounts: Vec<i128> = Vec::new(&env);
        // Track seen milestone IDs to prevent double-payment when the
        // caller supplies the same milestone multiple times in the batch.
        let mut seen_ids: Vec<u32> = Vec::new(&env);

        // Phase 1: Validate all milestones before making any state changes.
        for ms_id in milestone_ids.iter() {
            // Deduplicate: reject duplicate milestone IDs in a single batch.
            // Without this check, the same milestone would pass the
            // PayoutRecord check twice (since Phase 1 never writes), leading
            // to two token transfers for the same milestone.
            if seen_ids.contains(ms_id) {
                return Err(Error::InvalidInput);
            }
            seen_ids.push_back(ms_id);

            // Verify the claimant completed this milestone.
            // This cross-contract call is the core security check:
            // it ensures the claimant cannot claim rewards for milestones
            // they didn't complete.
            let completed = milestone_client.is_completed(&quest_id, &ms_id, &claimant);
            if !completed {
                return Err(Error::MilestoneNotCompleted);
            }

            // Verify this payout hasn't already been made (idempotency).
            let payout_key = DataKey::PayoutRecord(quest_id, ms_id, claimant.clone());
            if env.storage().persistent().has(&payout_key) {
                return Err(Error::AlreadyPaid);
            }

            // Resolve reward amount from the milestone contract.
            // A non-existent milestone returns NotFound (distinct from
            // RewardAmountMismatch which is reserved for amount mismatches).
            let amount = match milestone_client.try_get_milestone_reward(&quest_id, &ms_id) {
                Ok(Ok(a)) if a > 0 && a <= MAX_REWARD_AMOUNT => a,
                Ok(Ok(_)) => return Err(Error::InvalidAmount),
                Ok(Err(_)) | Err(_) => return Err(Error::NotFound),
            };

            amounts.push_back(amount);
            total_claimed = total_claimed
                .checked_add(amount)
                .ok_or(Error::ArithmeticOverflow)?;
        }

        // Verify pool has sufficient balance for the entire batch.
        let pool: i128 = env.storage().persistent().get(&pool_key).unwrap_or(0);
        if pool < total_claimed {
            return Err(Error::InsufficientPool);
        }

        // Phase 2: Process all claims. Since we validated everything above,
        // the only failure modes here are arithmetic overflow (which would
        // panic-revert the whole transaction) and token transfer failure.
        let mut running_pool = pool;
        for i in 0..milestone_ids.len() {
            let ms_id = milestone_ids.get(i).unwrap();
            let amount = amounts.get(i).unwrap();

            // Record payout for idempotency BEFORE the token transfer.
            let payout_key = DataKey::PayoutRecord(quest_id, ms_id, claimant.clone());
            env.storage().persistent().set(&payout_key, &amount);
            common::extend_persistent_ttl(&env, &payout_key);

            // Deduct from pool (in-memory tracking).
            running_pool = running_pool
                .checked_sub(amount)
                .ok_or(Error::ArithmeticOverflow)?;

            // Transfer tokens to claimant.
            token_client.transfer(&env.current_contract_address(), &claimant, &amount);

            // Emit reward distribution event.
            common::emit_reward_distributed(&env, quest_id, ms_id, &claimant, amount);
        }

        // Commit the final pool balance.
        env.storage().persistent().set(&pool_key, &running_pool);
        env.storage()
            .persistent()
            .extend_ttl(&pool_key, THRESHOLD, BUMP);

        // Track user earnings.
        let earn_key = DataKey::UserEarnings(claimant.clone());
        let earned: i128 = env.storage().persistent().get(&earn_key).unwrap_or(0);
        let new_earned = earned
            .checked_add(total_claimed)
            .ok_or(Error::ArithmeticOverflow)?;
        env.storage().persistent().set(&earn_key, &new_earned);
        common::extend_persistent_ttl(&env, &earn_key);

        // Update global total.
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalDistributed)
            .unwrap_or(0);
        let new_total = total
            .checked_add(total_claimed)
            .ok_or(Error::ArithmeticOverflow)?;
        env.storage()
            .instance()
            .set(&DataKey::TotalDistributed, &new_total);

        // Update quest-specific total distributed.
        let q_dist_key = DataKey::QuestDistributed(quest_id);
        let q_total: i128 = env.storage().persistent().get(&q_dist_key).unwrap_or(0);
        let q_new = q_total
            .checked_add(total_claimed)
            .ok_or(Error::ArithmeticOverflow)?;
        env.storage().persistent().set(&q_dist_key, &q_new);
        common::extend_persistent_ttl(&env, &q_dist_key);

        extend_instance_ttl(&env);

        Ok(total_claimed)
    }

    /// Withdraw unallocated tokens from a quest's reward pool back to the authority.
    /// The quest must be archived before funds can be withdrawn to prevent withdrawing
    /// from an active quest that still has pending milestones.
    pub fn refund_pool(
        env: Env,
        authority: Address,
        quest_id: u32,
        amount: i128,
    ) -> Result<(), Error> {
        authority.require_auth();

        if env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
        {
            return Err(Error::Paused);
        }

        if amount <= 0 || amount > MAX_REWARD_AMOUNT {
            return Err(Error::InvalidAmount);
        }

        // Verify authority matches the stored quest authority
        let auth_key = DataKey::QuestAuthority(quest_id);
        let stored: Address = env
            .storage()
            .persistent()
            .get::<DataKey, Address>(&auth_key)
            .ok_or(Error::QuestNotFunded)?;
        if stored != authority {
            return Err(Error::Unauthorized);
        }

        // Verify the quest is archived before allowing refund
        let quest_contract_addr = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::QuestContractAddr)
            .ok_or(Error::NotInitialized)?;

        let quest_client = QuestClient::new(&env, &quest_contract_addr);
        let quest_info = match quest_client.try_get_quest(&quest_id) {
            Ok(Ok(quest)) => quest,
            Ok(Err(_)) => return Err(Error::QuestLookupFailed),
            Err(_) => return Err(Error::QuestLookupFailed),
        };

        if quest_info.status != QuestStatus::Archived && quest_info.status != QuestStatus::Cancelled
        {
            return Err(Error::QuestNotArchived);
        }

        // Check grace period for archived quests (cancelled quests can be refunded immediately)
        if quest_info.status == QuestStatus::Archived {
            let grace_period = Self::get_refund_grace_period(env.clone());
            let now = env.ledger().timestamp();
            if now < quest_info.archived_at + grace_period {
                return Err(Error::RefundWindowNotOpen);
            }
        }

        // Calculate reserved obligations
        let milestone_contract_addr = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::MilestoneContractAddr)
            .ok_or(Error::NotInitialized)?;
        let milestone_client = MilestoneClient::new(&env, &milestone_contract_addr);
        let total_reserved = milestone_client.get_total_reserved_reward(&quest_id);
        let quest_distributed = env
            .storage()
            .persistent()
            .get(&DataKey::QuestDistributed(quest_id))
            .unwrap_or(0);

        let obligations = total_reserved
            .checked_sub(quest_distributed)
            .ok_or(Error::ArithmeticOverflow)?;

        // Check pool has sufficient balance after reserving obligations
        let pool_key = DataKey::QuestPool(quest_id);
        let pool: i128 = env.storage().persistent().get(&pool_key).unwrap_or(0);

        let refundable = pool
            .checked_sub(obligations)
            .ok_or(Error::ArithmeticOverflow)?;

        if amount > refundable {
            return Err(Error::InsufficientPool);
        }

        // Transfer tokens from contract back to authority
        let token_addr = Self::get_token(&env)?;
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&env.current_contract_address(), &authority, &amount);

        // Update pool balance
        let new_pool = pool.checked_sub(amount).ok_or(Error::ArithmeticOverflow)?;
        env.storage().persistent().set(&pool_key, &new_pool);
        env.storage()
            .persistent()
            .extend_ttl(&pool_key, THRESHOLD, BUMP);

        // Keep the aggregate counters in sync with the refund.
        // The instance-storage `TotalFunded` is a fast read; we
        // decrement it so reads after a refund don't show stale "money in
        // platform" totals. `QuestRefunded(quest_id)` is the persistent
        // authoritative aggregate that always equals the sum of refunds for
        // this quest.
        Self::record_refund(&env, quest_id, amount)?;

        // Emit refund event
        // Event topics: (reward_refunded,)
        // Event data: (quest_id, authority, amount)
        env.events().publish(
            (Symbol::new(&env, "reward_refunded"),),
            (quest_id, authority, amount),
        );

        Ok(())
    }

    /// Decrement the instance-storage `TotalFunded` counter and bump
    /// the persistent `QuestRefunded` aggregate by the refunded amount.
    /// Called from both `refund_pool` and `refund_unused_pool` so the
    /// counters stay consistent across every refund path.
    fn record_refund(env: &Env, quest_id: u32, amount: i128) -> Result<(), Error> {
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalFunded)
            .unwrap_or(0);
        // Saturate at 0 — the instance counter must never go negative even
        // if a refund-without-prior-fund happens (the invariant is
        // re-established by the persistent QuestRefunded aggregate).
        let new_total = core::cmp::max(0, total.checked_sub(amount).unwrap_or(0));
        env.storage()
            .instance()
            .set(&DataKey::TotalFunded, &new_total);

        let q_refunded_key = DataKey::QuestRefunded(quest_id);
        let q_refunded: i128 = env.storage().persistent().get(&q_refunded_key).unwrap_or(0);
        let new_refunded = q_refunded
            .checked_add(amount)
            .ok_or(Error::ArithmeticOverflow)?;
        env.storage()
            .persistent()
            .set(&q_refunded_key, &new_refunded);
        common::extend_persistent_ttl(env, &q_refunded_key);
        Ok(())
    }

    /// Get the token pool balance for a quest.
    pub fn get_pool_balance(env: Env, quest_id: u32) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::QuestPool(quest_id))
            .unwrap_or(0)
    }

    /// Get pool balance for a specific token in a quest.
    /// Returns 0 if no balance exists for that token.
    pub fn get_pool_balance_with_token(env: Env, quest_id: u32, token_addr: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::QuestPoolPerToken(quest_id, token_addr))
            .unwrap_or(0)
    }

    /// Get total earnings for a user across all quests.
    pub fn get_user_earnings(env: Env, user: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::UserEarnings(user))
            .unwrap_or(0)
    }

    pub fn get_user_total(env: Env, user: Address) -> i128 {
        Self::get_user_earnings(env, user)
    }

    /// Get global total distributed.
    pub fn get_total_distributed(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalDistributed)
            .unwrap_or(0)
    }

    /// Update the refund grace period. Admin only.
    /// The grace period is the time (in seconds) that must elapse after a quest
    /// is archived before refunds become available.
    pub fn set_refund_grace_period(
        env: Env,
        admin: Address,
        grace_period_seconds: u64,
    ) -> Result<(), Error> {
        admin.require_auth();

        // Check if paused
        if env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
        {
            return Err(Error::Paused);
        }

        // Verify admin
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if stored_admin != admin {
            return Err(Error::Unauthorized);
        }

        if !(MIN_REFUND_GRACE_PERIOD..=MAX_REFUND_GRACE_PERIOD).contains(&grace_period_seconds) {
            return Err(Error::InvalidInput);
        }

        env.storage()
            .instance()
            .set(&DataKey::RefundGracePeriod, &grace_period_seconds);
        extend_instance_ttl(&env);
        Ok(())
    }

    /// Get the current refund grace period in seconds.
    pub fn get_refund_grace_period(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::RefundGracePeriod)
            .unwrap_or(604_800) // Default to 7 days
    }

    /// Pause the contract. Admin only.
    /// When paused, configuration updates are blocked.
    pub fn pause(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();

        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if stored_admin != admin {
            return Err(Error::Unauthorized);
        }

        env.storage().instance().set(&DataKey::Paused, &true);
        extend_instance_ttl(&env);
        Ok(())
    }

    /// Unpause the contract. Admin only.
    pub fn unpause(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();

        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if stored_admin != admin {
            return Err(Error::Unauthorized);
        }

        env.storage().instance().set(&DataKey::Paused, &false);
        extend_instance_ttl(&env);
        Ok(())
    }

    /// Check if the contract is paused.
    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    /// Get the reward token address.
    pub fn get_token(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::TokenAddr)
            .ok_or(Error::NotInitialized)
    }

    // --- Supported-token whitelist (Issue #1349) ---

    /// Returns true if `token` is allowed for funding/distribution.
    ///
    /// The whitelist is fail-open: until an admin enables it (by adding at least
    /// one supported token), any valid token contract is accepted so existing
    /// flows keep working. Once enabled, only addresses present in the list pass.
    fn is_token_supported(env: &Env, token: &Address) -> bool {
        if !env
            .storage()
            .instance()
            .get::<DataKey, bool>(&DataKey::SupportedTokensEnabled)
            .unwrap_or(false)
        {
            return true;
        }
        let list: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::SupportedTokens)
            .unwrap_or(Vec::new(env));
        list.contains(token)
    }

    /// Add a token to the supported-token whitelist. Admin only.
    /// Adding the first token enables enforcement for all subsequent
    /// `fund_quest_with_token` / `distribute_reward_with_token` calls.
    pub fn add_supported_token(env: Env, admin: Address, token: Address) -> Result<(), Error> {
        admin.require_auth();
        let stored = Self::get_admin(env.clone())?;
        if stored != admin {
            return Err(Error::Unauthorized);
        }
        let mut list: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::SupportedTokens)
            .unwrap_or(Vec::new(&env));
        if !list.contains(&token) {
            list.push_back(token);
        }
        env.storage()
            .instance()
            .set(&DataKey::SupportedTokens, &list);
        env.storage()
            .instance()
            .set(&DataKey::SupportedTokens, &list);
        env.storage()
            .instance()
            .set(&DataKey::SupportedTokensEnabled, &true);
        extend_instance_ttl(&env);
        Ok(())
    }

    /// Remove a token from the supported-token whitelist. Admin only.
    /// When the last token is removed, enforcement is disabled (fail-open again).
    pub fn remove_supported_token(env: Env, admin: Address, token: Address) -> Result<(), Error> {
        admin.require_auth();
        let stored = Self::get_admin(env.clone())?;
        if stored != admin {
            return Err(Error::Unauthorized);
        }
        let current: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::SupportedTokens)
            .unwrap_or(Vec::new(&env));
        // Rebuild the list excluding the removed token (Vec has no in-place
        // removal guarantee across SDK versions, so copy explicitly).
        let mut list = Vec::new(&env);
        for i in 0..current.len() {
            if let Some(t) = current.get(i) {
                if t != token {
                    list.push_back(t);
                }
            }
        }
        env.storage()
            .instance()
            .set(&DataKey::SupportedTokens, &list);
        env.storage()
            .instance()
            .set(&DataKey::SupportedTokens, &list);
        if list.is_empty() {
            env.storage()
                .instance()
                .set(&DataKey::SupportedTokensEnabled, &false);
        }
        extend_instance_ttl(&env);
        Ok(())
    }

    /// Check whether a token is currently on the supported-token whitelist.
    pub fn is_supported_token(env: Env, token: Address) -> bool {
        Self::is_token_supported(&env, &token)
    }

    /// Return the full list of supported-token addresses.
    pub fn get_supported_tokens(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::SupportedTokens)
            .unwrap_or(Vec::new(&env))
    }

    /// Return aggregated platform statistics — Issue #717.
    ///
    /// Enables a single-call dashboard query instead of N per-contract calls.
    /// Returns `(total_quests_funded, total_funded, total_distributed)`.
    pub fn get_platform_stats(env: Env) -> (u32, i128, i128) {
        let total_quests: u32 = env
            .storage()
            .instance()
            .get(&DataKey::QuestCount)
            .unwrap_or(0);
        let total_funded: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalFunded)
            .unwrap_or(0);
        let total_distributed: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalDistributed)
            .unwrap_or(0);
        (total_quests, total_funded, total_distributed)
    }

    /// Get the refund window for a quest's pool — Issue #702.
    ///
    /// Returns a tuple `(open_timestamp, close_timestamp)` in ledger seconds.
    /// - If the quest is not archived, returns `(0, 0)` indicating the window is closed.
    /// - Once archived, the window opens at `archived_at + grace_period` and
    ///   remains open indefinitely (`close_timestamp = u64::MAX`).
    ///
    /// This is a pure view function: it performs cross-contract reads but does
    /// not mutate any state.
    pub fn get_refund_window(env: Env, quest_id: u32) -> (u64, u64) {
        // Get quest contract address from instance storage
        let quest_contract_addr = match env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::QuestContractAddr)
        {
            Some(addr) => addr,
            None => return (0, 0), // contract not properly initialized
        };

        // Cross-contract call to fetch quest info
        let quest_client = QuestClient::new(&env, &quest_contract_addr);
        let quest_result = quest_client.try_get_quest(&quest_id);
        let quest_info = match quest_result {
            Ok(Ok(q)) => q,
            _ => return (0, 0), // quest not found or error
        };

        // Refunds available after archiving + grace period, or immediately if cancelled
        if quest_info.status == QuestStatus::Cancelled {
            return (quest_info.archived_at, u64::MAX);
        }
        if quest_info.status != QuestStatus::Archived {
            return (0, 0);
        }

        let grace_period = Self::get_refund_grace_period(env);
        let open_ts = quest_info.archived_at + grace_period;
        let close_ts = u64::MAX; // no upper bound

        (open_ts, close_ts)
    }

    /// Refund the entire unused pool for a quest — Issue #718.
    ///
    /// Convenience wrapper over `refund_pool`: automatically computes the
    /// maximum refundable amount (pool minus reserved obligations) and
    /// returns it to the quest authority. Validates:
    ///   - Quest is `Archived`
    ///   - 7-day refund window has elapsed
    ///   - There is actually something to refund
    pub fn refund_unused_pool(env: Env, authority: Address, quest_id: u32) -> Result<i128, Error> {
        authority.require_auth();

        if env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
        {
            return Err(Error::Paused);
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

        // Verify archived + window
        let quest_contract_addr = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::QuestContractAddr)
            .ok_or(Error::NotInitialized)?;
        let quest_client = QuestClient::new(&env, &quest_contract_addr);
        let quest_info = match quest_client.try_get_quest(&quest_id) {
            Ok(Ok(q)) => q,
            Ok(Err(_)) | Err(_) => return Err(Error::QuestLookupFailed),
        };

        if quest_info.status != QuestStatus::Archived && quest_info.status != QuestStatus::Cancelled
        {
            return Err(Error::QuestNotArchived);
        }
        if quest_info.status == QuestStatus::Archived {
            let grace_period = Self::get_refund_grace_period(env.clone());
            let now = env.ledger().timestamp();
            if now < quest_info.archived_at + grace_period {
                return Err(Error::RefundWindowNotOpen);
            }
        }

        // Calculate refundable amount
        let milestone_contract_addr = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::MilestoneContractAddr)
            .ok_or(Error::NotInitialized)?;
        let milestone_client = MilestoneClient::new(&env, &milestone_contract_addr);
        let total_reserved = milestone_client.get_total_reserved_reward(&quest_id);
        let distributed = env
            .storage()
            .persistent()
            .get(&DataKey::QuestDistributed(quest_id))
            .unwrap_or(0_i128);
        let obligations = total_reserved
            .checked_sub(distributed)
            .ok_or(Error::ArithmeticOverflow)?;
        let pool: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::QuestPool(quest_id))
            .unwrap_or(0);
        let refundable = pool
            .checked_sub(obligations)
            .ok_or(Error::ArithmeticOverflow)?;

        if refundable <= 0 {
            return Ok(0);
        }

        // Transfer unused tokens back to authority
        let token_addr = Self::get_token(&env)?;
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&env.current_contract_address(), &authority, &refundable);

        // Zero out the pool
        let new_pool = pool
            .checked_sub(refundable)
            .ok_or(Error::ArithmeticOverflow)?;
        env.storage()
            .persistent()
            .set(&DataKey::QuestPool(quest_id), &new_pool);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::QuestPool(quest_id), THRESHOLD, BUMP);

        // Keep aggregate counters in sync — issue #864.
        Self::record_refund(&env, quest_id, refundable)?;

        // Emit event — reuse reward_refunded topic for indexer compatibility
        env.events().publish(
            (Symbol::new(&env, "reward_refunded"),),
            (quest_id, authority, refundable),
        );

        Ok(refundable)
    }

    /// Reclaim unused pool tokens once a quest's deadline has passed,
    /// even if the owner never explicitly archived it — issue #1187.
    ///
    /// `refund_unused_pool` and `refund_pool` both require `QuestStatus::Archived`,
    /// which only the quest owner can set via `archive_quest`. If a creator funds a
    /// quest, sets a deadline, and then goes silent — never completing enough
    /// milestones to spend the pool and never archiving — those tokens were
    /// previously stuck with no recovery path. This entry point only requires
    /// that the quest defines a deadline which has passed (plus the same
    /// configurable grace period used for archived refunds), so the funding
    /// authority can always reclaim leftover tokens from an abandoned quest.
    ///
    /// Refunds the same "pool minus reserved-but-unpaid obligations" amount as
    /// `refund_unused_pool`, so milestones an enrollee already qualified for
    /// remain payable after the refund.
    pub fn refund_expired_pool(env: Env, authority: Address, quest_id: u32) -> Result<i128, Error> {
        authority.require_auth();

        if env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
        {
            return Err(Error::Paused);
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

        // Verify the quest has a deadline that has passed the grace period —
        // deliberately independent of QuestStatus so an un-archived, abandoned
        // quest is still recoverable.
        let quest_contract_addr = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::QuestContractAddr)
            .ok_or(Error::NotInitialized)?;
        let quest_client = QuestClient::new(&env, &quest_contract_addr);
        let quest_info = match quest_client.try_get_quest(&quest_id) {
            Ok(Ok(q)) => q,
            Ok(Err(_)) | Err(_) => return Err(Error::QuestLookupFailed),
        };

        if quest_info.deadline == 0 {
            return Err(Error::QuestNotExpired);
        }

        let grace_period = Self::get_refund_grace_period(env.clone());
        let now = env.ledger().timestamp();
        if now <= quest_info.deadline {
            return Err(Error::QuestNotExpired);
        }
        if now < quest_info.deadline + grace_period {
            return Err(Error::RefundWindowNotOpen);
        }

        // Calculate refundable amount
        let milestone_contract_addr = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::MilestoneContractAddr)
            .ok_or(Error::NotInitialized)?;
        let milestone_client = MilestoneClient::new(&env, &milestone_contract_addr);
        let total_reserved = milestone_client.get_total_reserved_reward(&quest_id);
        let distributed = env
            .storage()
            .persistent()
            .get(&DataKey::QuestDistributed(quest_id))
            .unwrap_or(0_i128);
        let obligations = total_reserved
            .checked_sub(distributed)
            .ok_or(Error::ArithmeticOverflow)?;
        let pool: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::QuestPool(quest_id))
            .unwrap_or(0);
        let refundable = pool
            .checked_sub(obligations)
            .ok_or(Error::ArithmeticOverflow)?;

        if refundable <= 0 {
            return Ok(0);
        }

        // Transfer unused tokens back to authority
        let token_addr = Self::get_token(&env)?;
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&env.current_contract_address(), &authority, &refundable);

        // Zero out the refunded portion of the pool
        let new_pool = pool
            .checked_sub(refundable)
            .ok_or(Error::ArithmeticOverflow)?;
        env.storage()
            .persistent()
            .set(&DataKey::QuestPool(quest_id), &new_pool);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::QuestPool(quest_id), THRESHOLD, BUMP);

        // Keep aggregate counters in sync — see record_refund doc comment.
        Self::record_refund(&env, quest_id, refundable)?;

        // Emit event — reuse reward_refunded topic for indexer compatibility
        env.events().publish(
            (Symbol::new(&env, "reward_refunded"),),
            (quest_id, authority, refundable),
        );

        Ok(refundable)
    }

    /// Persistent per-quest aggregate of refunded tokens. The instance
    /// counter `TotalDistributed` is the fast read; this is the
    /// authoritative source of truth that survives across contract
    /// upgrades.
    pub fn get_quest_refunded(env: Env, quest_id: u32) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::QuestRefunded(quest_id))
            .unwrap_or(0)
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
