#![no_std]
#![allow(deprecated)]
use common::{extend_instance_ttl, QuestInfo, BUMP, MAX_REWARD_AMOUNT, THRESHOLD};
use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, symbol_short, Address,
    Env, String, Symbol, Vec,
};

// Quest contract error type (must match the quest contract)
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum QuestError {
    NotFound = 1,
    Unauthorized = 2,
    AlreadyEnrolled = 4,
    NotEnrolled = 6,
    InvalidInput = 3,
}

// Quest contract interface for cross-contract calls
#[contractclient(name = "QuestClient")]
pub trait QuestContractTrait {
    fn get_quest(env: Env, quest_id: u32) -> QuestInfo;
    fn is_enrollee(env: Env, quest_id: u32, user: Address) -> bool;
    fn get_enrollees(env: Env, quest_id: u32) -> Vec<Address>;
}

// Visibility, QuestStatus, and QuestInfo moved to common.

// Milestone contract: define milestones per quest, track completions.
// Owner-approved verification for MVP. When owner verifies a completion,
// the frontend triggers the rewards contract to distribute tokens.
//
// Auth model: The quest owner is stored per-quest the first time
// a milestone is created. Only that owner can create milestones or verify.

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Paused,
    // Quest contract address for cross-contract validation
    QuestContract,
    // Certificate contract address for minting completion certificates
    CertificateContract,
    // Auto-incrementing milestone ID per quest
    NextMilestoneId(u32),
    // Milestone data
    Milestone(u32, u32), // (quest_id, milestone_id)
    // Completion flag
    Completed(u32, u32, Address), // (quest_id, milestone_id, enrollee)
    // Count of completions per enrollee per quest
    EnrolleeCompletions(u32, Address),
    // Distribution mode per workspace
    Mode(u32),
    // Flat reward per milestone (Flat mode only)
    FlatReward(u32),
    // Total unique completions per milestone (Competitive mode)
    MilestoneCompletionCount(u32, u32), // (workspace_id, milestone_id)
    // Completion timestamp
    CompletionTime(u32, u32, Address), // (quest_id, milestone_id, enrollee)
    // Total earnings per enrollee per quest
    EnrolleeEarnings(u32, Address), // (quest_id, enrollee)
    // Verification mode per quest
    VerificationMode(u32), // (quest_id)
    // Pending submissions for peer review
    PendingSubmission(u32, u32, Address), // (quest_id, milestone_id, enrollee)
    // Approval count for pending submissions
    ApprovalCount(u32, u32, Address), // (quest_id, milestone_id, enrollee)
    // Peer approvals tracking
    PeerApproval(u32, u32, Address, Address), // (quest_id, milestone_id, enrollee, peer)
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum VerificationMode {
    OwnerOnly,
    PeerReview(u32), // required_approvals
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum DistributionMode {
    Custom,           // per-milestone reward_amount (default)
    Flat,             // equal reward for all milestones
    Competitive(u32), // max_winners: first N completers rewarded; rest get 0
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct MilestoneInfo {
    pub id: u32,
    pub quest_id: u32,
    pub title: String,
    pub description: String,
    pub reward_amount: i128,
    pub requires_previous: bool,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CompletionInfo {
    pub quest_id: u32,
    pub milestone_id: u32,
    pub enrollee: Address,
    pub completed_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct EnrolleeProgress {
    pub quest_id: u32,
    pub enrollee: Address,
    pub completions: u32,
    pub total_milestones: u32,
    pub total_earned: i128,
    pub completion_details: Vec<CompletionInfo>,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct MilestoneInput {
    pub title: String,
    pub description: String,
    pub reward_amount: i128,
    pub requires_previous: bool,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotFound = 1,
    Unauthorized = 2,
    AlreadyCompleted = 4,
    InvalidAmount = 6,
    OwnerMismatch = 7,
    NotInitialized = 8,
    AlreadySubmitted = 9,
    NotSubmitted = 10,
    AlreadyApproved = 11,
    NotEnrolled = 12,
    InvalidApprover = 13,
    MilestoneNotUnlocked = 14,
    TitleTooLong = 15,
    DescriptionTooLong = 16,
    BatchTooLarge = 17,
    Paused = 18,
    InvalidInput = 3,
}

// Certificate client interface for cross-contract calls
#[contractclient(name = "CertificateClient")]
pub trait Certificate {
    fn mint_quest_certificate(
        env: Env,
        quest_id: u32,
        quest_name: String,
        quest_category: String,
        recipient: Address,
    ) -> u32;
}

// TTL constants moved to common.
pub const MAX_MILESTONE_TITLE_LEN: u32 = 128;
pub const MAX_MILESTONE_DESCRIPTION_LEN: u32 = 1000;
pub const MAX_BATCH_SIZE: u32 = 20;
pub const MAX_MILESTONES: u32 = 50;

#[contract]
pub struct MilestoneContract;

#[contractimpl]
impl MilestoneContract {
    /// Initialize the milestone contract with the quest contract address.
    /// Must be called once before any milestones can be created.
    pub fn initialize(
        env: Env,
        admin: Address,
        quest_contract: Address,
        certificate_contract: Address,
    ) -> Result<(), Error> {
        admin.require_auth();

        // Prevent re-initialization
        if env.storage().instance().has(&DataKey::QuestContract) {
            return Err(Error::Unauthorized);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage()
            .instance()
            .set(&DataKey::QuestContract, &quest_contract);
        env.storage()
            .instance()
            .set(&DataKey::CertificateContract, &certificate_contract);
        extend_instance_ttl(&env);
        Ok(())
    }

    /// Pause state-mutating operations. Admin only.
    pub fn pause(env: Env, admin: Address) -> Result<(), Error> {
        Self::require_admin(&env, &admin)?;
        env.storage().instance().set(&DataKey::Paused, &true);
        extend_instance_ttl(&env);
        Ok(())
    }

    /// Resume state-mutating operations. Admin only.
    pub fn unpause(env: Env, admin: Address) -> Result<(), Error> {
        Self::require_admin(&env, &admin)?;
        env.storage().instance().set(&DataKey::Paused, &false);
        extend_instance_ttl(&env);
        Ok(())
    }

    /// Returns true when the contract is paused.
    pub fn is_paused(env: Env) -> bool {
        let paused = env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false);
        extend_instance_ttl(&env);
        paused
    }

    /// Create a milestone for a quest. Owner auth required.
    /// Validates ownership via cross-contract call to quest contract.
    pub fn create_milestone(
        env: Env,
        owner: Address,
        quest_id: u32,
        title: String,
        description: String,
        reward_amount: i128,
        requires_previous: bool,
    ) -> Result<u32, Error> {
        owner.require_auth();
        Self::require_not_paused(&env)?;

        Self::validate_ms_input(&title, &description, reward_amount)?;

        // Get quest contract address
        let quest_contract_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::QuestContract)
            .ok_or(Error::NotInitialized)?;

        // Cross-contract validation: verify caller is the actual quest owner
        let quest_client = QuestClient::new(&env, &quest_contract_addr);
        let quest_info = quest_client.get_quest(&quest_id);

        // If it exists, verify the caller is the owner
        if quest_info.owner != owner {
            return Err(Error::OwnerMismatch);
        }

        let next_key = DataKey::NextMilestoneId(quest_id);
        let id: u32 = env.storage().persistent().get(&next_key).unwrap_or(0);

        if id >= MAX_MILESTONES {
            return Err(Error::InvalidInput);
        }

        let milestone = MilestoneInfo {
            id,
            quest_id,
            title,
            description,
            reward_amount,
            requires_previous: requires_previous && id > 0,
        };

        let ms_key = DataKey::Milestone(quest_id, id);
        env.storage().persistent().set(&ms_key, &milestone);
        env.storage().persistent().set(&next_key, &(id + 1));

        // Emit milestone creation event
        // Event topics: (milestone, created)
        // Event data: (milestone_id, quest_id, reward_amount)
        env.events().publish(
            (symbol_short!("milestone"), symbol_short!("new")),
            (id, quest_id, milestone.reward_amount),
        );

        Self::bump_ms(&env, &ms_key);
        Self::bump_ms(&env, &next_key);
        extend_instance_ttl(&env);
        Ok(id)
    }

    /// Batch create multiple milestones for a quest. Owner auth required.
    /// Ensures atomicity: all milestones are created or none are.
    pub fn create_milestones_batch(
        env: Env,
        owner: Address,
        quest_id: u32,
        milestones: Vec<MilestoneInput>,
    ) -> Result<Vec<u32>, Error> {
        owner.require_auth();
        Self::require_not_paused(&env)?;

        if milestones.len() > MAX_BATCH_SIZE {
            return Err(Error::BatchTooLarge);
        }

        // Get quest contract address
        let quest_contract_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::QuestContract)
            .ok_or(Error::NotInitialized)?;

        // Cross-contract validation: verify caller is the actual quest owner
        let quest_client = QuestClient::new(&env, &quest_contract_addr);
        let quest_info = quest_client.get_quest(&quest_id);

        if quest_info.owner != owner {
            return Err(Error::OwnerMismatch);
        }

        // Step 1: Validate all inputs before any state changes to ensure atomicity
        for ms in milestones.iter() {
            Self::validate_ms_input(&ms.title, &ms.description, ms.reward_amount)?;
        }

        // Step 2: Create milestones
        let mut ids = Vec::new(&env);
        for ms in milestones {
            let next_key = DataKey::NextMilestoneId(quest_id);
            let id: u32 = env.storage().persistent().get(&next_key).unwrap_or(0);

            let ms_info = MilestoneInfo {
                id,
                quest_id,
                title: ms.title,
                description: ms.description,
                reward_amount: ms.reward_amount,
                requires_previous: ms.requires_previous && id > 0,
            };

            let ms_key = DataKey::Milestone(quest_id, id);
            env.storage().persistent().set(&ms_key, &ms_info);
            env.storage().persistent().set(&next_key, &(id + 1));

            // Emit milestone creation event
            env.events().publish(
                (symbol_short!("milestone"), symbol_short!("new")),
                (id, quest_id, ms_info.reward_amount),
            );

            Self::bump_ms(&env, &ms_key);
            Self::bump_ms(&env, &next_key);
            ids.push_back(id);
        }

        extend_instance_ttl(&env);
        Ok(ids)
    }

    fn validate_ms_input(
        title: &String,
        description: &String,
        reward_amount: i128,
    ) -> Result<(), Error> {
        if title.is_empty() {
            return Err(Error::InvalidInput);
        }
        if title.len() > MAX_MILESTONE_TITLE_LEN {
            return Err(Error::TitleTooLong);
        }
        if description.is_empty() {
            return Err(Error::InvalidInput);
        }
        if description.len() > MAX_MILESTONE_DESCRIPTION_LEN {
            return Err(Error::DescriptionTooLong);
        }
        if reward_amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if reward_amount > MAX_REWARD_AMOUNT {
            return Err(Error::InvalidAmount);
        }
        Ok(())
    }

    /// Set the verification mode for a quest. Owner only.
    pub fn set_verification_mode(
        env: Env,
        owner: Address,
        quest_id: u32,
        mode: VerificationMode,
    ) -> Result<(), Error> {
        owner.require_auth();
        Self::require_not_paused(&env)?;
        Self::require_quest_owner(&env, quest_id, &owner)?;

        let mode_key = DataKey::VerificationMode(quest_id);
        env.storage().persistent().set(&mode_key, &mode);
        env.storage()
            .persistent()
            .extend_ttl(&mode_key, THRESHOLD, BUMP);

        Ok(())
    }

    /// Set the reward distribution mode for a workspace. Owner only.
    /// For Flat mode, flat_reward is the equal reward paid per milestone (must be > 0).
    /// For Custom and Competitive modes, flat_reward is ignored (pass 0).
    pub fn set_distribution_mode(
        env: Env,
        owner: Address,
        quest_id: u32,
        mode: DistributionMode,
        flat_reward: i128,
    ) -> Result<(), Error> {
        owner.require_auth();
        Self::require_not_paused(&env)?;

        // Cross-contract validation: verify caller is the actual quest owner
        let quest_contract_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::QuestContract)
            .ok_or(Error::NotInitialized)?;
        let quest_client = QuestClient::new(&env, &quest_contract_addr);
        let quest_info = quest_client.get_quest(&quest_id);
        if quest_info.owner != owner {
            return Err(Error::OwnerMismatch);
        }

        if matches!(mode, DistributionMode::Flat) && flat_reward <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mode_key = DataKey::Mode(quest_id);
        env.storage().persistent().set(&mode_key, &mode);
        env.storage()
            .persistent()
            .extend_ttl(&mode_key, THRESHOLD, BUMP);

        if matches!(mode, DistributionMode::Flat) {
            let flat_key = DataKey::FlatReward(quest_id);
            env.storage().persistent().set(&flat_key, &flat_reward);
            env.storage()
                .persistent()
                .extend_ttl(&flat_key, THRESHOLD, BUMP);
        }

        Ok(())
    }

    /// Get the reward distribution mode for a quest.
    /// Defaults to Custom if unset.
    pub fn get_distribution_mode(env: Env, quest_id: u32) -> DistributionMode {
        env.storage()
            .persistent()
            .get(&DataKey::Mode(quest_id))
            .unwrap_or(DistributionMode::Custom)
    }

    /// Get the configured flat reward for a quest (if set).
    pub fn get_flat_reward(env: Env, quest_id: u32) -> Option<i128> {
        env.storage()
            .persistent()
            .get(&DataKey::FlatReward(quest_id))
    }

    /// Verify an enrollee's completion of a milestone. Owner only.
    /// Returns the reward_amount so the frontend can trigger token distribution.
    pub fn verify_completion(
        env: Env,
        owner: Address,
        quest_id: u32,
        milestone_id: u32,
        enrollee: Address,
    ) -> Result<i128, Error> {
        owner.require_auth();
        Self::require_not_paused(&env)?;

        // Validate owner via cross-contract call
        let quest_contract_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::QuestContract)
            .ok_or(Error::NotInitialized)?;

        let quest_client = QuestClient::new(&env, &quest_contract_addr);
        let quest_info = quest_client.get_quest(&quest_id);
        if quest_info.owner != owner {
            return Err(Error::Unauthorized);
        }

        // Verify enrollee is enrolled in the quest (Issue #162)
        if !Self::is_enrolled(&env, quest_id, &enrollee)? {
            return Err(Error::NotEnrolled);
        }

        let ms_key = DataKey::Milestone(quest_id, milestone_id);
        let milestone: MilestoneInfo = env
            .storage()
            .persistent()
            .get(&ms_key)
            .ok_or(Error::NotFound)?;

        Self::ensure_previous_completed(&env, quest_id, milestone_id, &enrollee, &milestone)?;

        let comp_key = DataKey::Completed(quest_id, milestone_id, enrollee.clone());
        if env.storage().persistent().has(&comp_key) {
            return Err(Error::AlreadyCompleted);
        }

        // Determine reward based on distribution mode
        let mode: DistributionMode = env
            .storage()
            .persistent()
            .get(&DataKey::Mode(quest_id))
            .unwrap_or(DistributionMode::Custom);

        let reward = match mode {
            DistributionMode::Custom => milestone.reward_amount,
            DistributionMode::Flat => env
                .storage()
                .persistent()
                .get(&DataKey::FlatReward(quest_id))
                .unwrap_or(milestone.reward_amount),
            DistributionMode::Competitive(max_winners) => {
                let cnt_key = DataKey::MilestoneCompletionCount(quest_id, milestone_id);
                let cnt: u32 = env.storage().persistent().get(&cnt_key).unwrap_or(0);
                env.storage().persistent().set(&cnt_key, &(cnt + 1));
                env.storage()
                    .persistent()
                    .extend_ttl(&cnt_key, THRESHOLD, BUMP);
                if cnt < max_winners {
                    milestone.reward_amount
                } else {
                    0
                }
            }
        };

        // Mark completed
        env.storage().persistent().set(&comp_key, &true);
        env.storage()
            .persistent()
            .extend_ttl(&comp_key, THRESHOLD, BUMP);

        // Store completion timestamp
        let time_key = DataKey::CompletionTime(quest_id, milestone_id, enrollee.clone());
        env.storage()
            .persistent()
            .set(&time_key, &env.ledger().timestamp());
        env.storage()
            .persistent()
            .extend_ttl(&time_key, THRESHOLD, BUMP);

        // Increment enrollee's completion count for this quest
        let count_key = DataKey::EnrolleeCompletions(quest_id, enrollee.clone());
        let count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        env.storage().persistent().set(&count_key, &(count + 1));
        env.storage()
            .persistent()
            .extend_ttl(&count_key, THRESHOLD, BUMP);

        // Update total earnings for enrollee
        let earnings_key = DataKey::EnrolleeEarnings(quest_id, enrollee.clone());
        let total_earned: i128 = env.storage().persistent().get(&earnings_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&earnings_key, &(total_earned + reward));
        env.storage()
            .persistent()
            .extend_ttl(&earnings_key, THRESHOLD, BUMP);

        // Emit milestone completion event
        // Event topics: (milestone, completed)
        // Event data: (milestone_id, quest_id, enrollee, reward_amount)
        env.events().publish(
            (symbol_short!("milestone"), symbol_short!("done")),
            (milestone_id, quest_id, enrollee.clone(), reward),
        );
        // Canonical completion event name for indexers/streaming clients.
        env.events().publish(
            (Symbol::new(&env, "milestone_completed"),),
            (quest_id, milestone_id, enrollee.clone()),
        );

        // Check if this completes the quest and mint certificate if so
        Self::check_and_mint_certificate(env.clone(), quest_id, enrollee)?;

        Ok(reward)
    }

    /// Submit a milestone completion for peer review.
    /// Enrollee submits their completion for peer approval.
    pub fn submit_for_review(
        env: Env,
        enrollee: Address,
        quest_id: u32,
        milestone_id: u32,
    ) -> Result<(), Error> {
        enrollee.require_auth();
        Self::require_not_paused(&env)?;

        // Check if milestone exists
        let ms_key = DataKey::Milestone(quest_id, milestone_id);
        let _: MilestoneInfo = env
            .storage()
            .persistent()
            .get(&ms_key)
            .ok_or(Error::NotFound)?;

        // Check if already completed
        let comp_key = DataKey::Completed(quest_id, milestone_id, enrollee.clone());
        if env.storage().persistent().has(&comp_key) {
            return Err(Error::AlreadyCompleted);
        }

        // Check if already submitted for review
        let submit_key = DataKey::PendingSubmission(quest_id, milestone_id, enrollee.clone());
        if env.storage().persistent().has(&submit_key) {
            return Err(Error::AlreadySubmitted);
        }

        // Get verification mode for this quest
        let verification_mode: VerificationMode = env
            .storage()
            .persistent()
            .get(&DataKey::VerificationMode(quest_id))
            .unwrap_or(VerificationMode::OwnerOnly);

        // Only allow submission if quest uses peer review
        if !matches!(verification_mode, VerificationMode::PeerReview(_)) {
            return Err(Error::Unauthorized);
        }

        // Verify enrollee is enrolled in the quest
        if !Self::is_enrolled(&env, quest_id, &enrollee)? {
            return Err(Error::NotEnrolled);
        }

        // Mark as submitted for review
        env.storage().persistent().set(&submit_key, &true);
        env.storage()
            .persistent()
            .extend_ttl(&submit_key, THRESHOLD, BUMP);

        // Initialize approval count to 0
        let approval_key = DataKey::ApprovalCount(quest_id, milestone_id, enrollee.clone());
        env.storage().persistent().set(&approval_key, &0u32);
        env.storage()
            .persistent()
            .extend_ttl(&approval_key, THRESHOLD, BUMP);

        Ok(())
    }

    /// Approve a milestone completion submitted for peer review.
    /// Only enrolled users (not the submitter) can approve.
    /// Returns reward amount if approval completes the milestone, None if more approvals needed.
    pub fn approve_completion(
        env: Env,
        peer: Address,
        quest_id: u32,
        milestone_id: u32,
        enrollee: Address,
    ) -> Result<Option<i128>, Error> {
        peer.require_auth();
        Self::require_not_paused(&env)?;

        // Check if milestone exists
        let ms_key = DataKey::Milestone(quest_id, milestone_id);
        let milestone: MilestoneInfo = env
            .storage()
            .persistent()
            .get(&ms_key)
            .ok_or(Error::NotFound)?;

        // Check if already completed
        let comp_key = DataKey::Completed(quest_id, milestone_id, enrollee.clone());
        if env.storage().persistent().has(&comp_key) {
            return Err(Error::AlreadyCompleted);
        }

        // Verify the submission exists and is pending
        let submit_key = DataKey::PendingSubmission(quest_id, milestone_id, enrollee.clone());
        if !env.storage().persistent().has(&submit_key) {
            return Err(Error::NotSubmitted);
        }

        // Prevent self-approval
        if peer == enrollee {
            return Err(Error::InvalidApprover);
        }

        // Check if peer has already approved this submission
        let approval_key =
            DataKey::PeerApproval(quest_id, milestone_id, enrollee.clone(), peer.clone());
        if env.storage().persistent().has(&approval_key) {
            return Err(Error::AlreadyApproved);
        }

        // Verify peer is enrolled in the quest
        if !Self::is_enrolled(&env, quest_id, &peer)? {
            return Err(Error::NotEnrolled);
        }

        // Get verification mode and required approvals
        let verification_mode: VerificationMode = env
            .storage()
            .persistent()
            .get(&DataKey::VerificationMode(quest_id))
            .unwrap_or(VerificationMode::OwnerOnly);

        let required_approvals = match verification_mode {
            VerificationMode::PeerReview(approvals) => approvals,
            VerificationMode::OwnerOnly => return Err(Error::Unauthorized),
        };

        // Record the peer approval
        env.storage().persistent().set(&approval_key, &true);
        env.storage()
            .persistent()
            .extend_ttl(&approval_key, THRESHOLD, BUMP);

        // Increment approval count
        let count_key = DataKey::ApprovalCount(quest_id, milestone_id, enrollee.clone());
        let current_approvals: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        let new_approvals = current_approvals + 1;
        env.storage().persistent().set(&count_key, &new_approvals);
        env.storage()
            .persistent()
            .extend_ttl(&count_key, THRESHOLD, BUMP);

        // Check if required approvals reached
        if new_approvals >= required_approvals {
            Self::ensure_previous_completed(&env, quest_id, milestone_id, &enrollee, &milestone)?;

            // Auto-complete the milestone
            env.storage().persistent().set(&comp_key, &true);
            env.storage()
                .persistent()
                .extend_ttl(&comp_key, THRESHOLD, BUMP);

            // Remove pending submission
            env.storage().persistent().remove(&submit_key);

            // Increment enrollee's completion count for this quest
            let enrollee_count_key = DataKey::EnrolleeCompletions(quest_id, enrollee.clone());
            let count: u32 = env
                .storage()
                .persistent()
                .get(&enrollee_count_key)
                .unwrap_or(0);
            env.storage()
                .persistent()
                .set(&enrollee_count_key, &(count + 1));
            env.storage()
                .persistent()
                .extend_ttl(&enrollee_count_key, THRESHOLD, BUMP);

            // Determine reward based on distribution mode
            let mode: DistributionMode = env
                .storage()
                .persistent()
                .get(&DataKey::Mode(quest_id))
                .unwrap_or(DistributionMode::Custom);

            let reward = match mode {
                DistributionMode::Custom => milestone.reward_amount,
                DistributionMode::Flat => env
                    .storage()
                    .persistent()
                    .get(&DataKey::FlatReward(quest_id))
                    .unwrap_or(milestone.reward_amount),
                DistributionMode::Competitive(max_winners) => {
                    let cnt_key = DataKey::MilestoneCompletionCount(quest_id, milestone_id);
                    let cnt: u32 = env.storage().persistent().get(&cnt_key).unwrap_or(0);
                    env.storage().persistent().set(&cnt_key, &(cnt + 1));
                    env.storage()
                        .persistent()
                        .extend_ttl(&cnt_key, THRESHOLD, BUMP);
                    if cnt < max_winners {
                        milestone.reward_amount
                    } else {
                        0
                    }
                }
            };

            // Emit peer approval completion event
            // Event topics: (milestone, peer_approved)
            // Event data: (milestone_id, quest_id, enrollee, peer, reward_amount)
            env.events().publish(
                (symbol_short!("milestone"), symbol_short!("peer_ok")),
                (milestone_id, quest_id, enrollee.clone(), peer, reward),
            );

            // Check if this completes the quest and mint certificate if so
            Self::check_and_mint_certificate(env.clone(), quest_id, enrollee)?;

            Ok(Some(reward))
        } else {
            Ok(None) // More approvals needed
        }
    }

    /// Get a specific milestone.
    pub fn get_milestone(
        env: Env,
        quest_id: u32,
        milestone_id: u32,
    ) -> Result<MilestoneInfo, Error> {
        let ms_key = DataKey::Milestone(quest_id, milestone_id);
        env.storage()
            .persistent()
            .get(&ms_key)
            .ok_or(Error::NotFound)
    }

    /// Get the configured reward amount for a milestone.
    /// Returns the reward_amount stored at milestone creation.
    /// Used by the rewards contract to validate distribute_reward amounts.
    pub fn get_milestone_reward(env: Env, quest_id: u32, milestone_id: u32) -> Result<i128, Error> {
        let ms_key = DataKey::Milestone(quest_id, milestone_id);
        env.storage()
            .persistent()
            .get::<DataKey, MilestoneInfo>(&ms_key)
            .map(|m| m.reward_amount)
            .ok_or(Error::NotFound)
    }

    /// Get all milestones for a quest.
    pub fn get_milestones(env: Env, quest_id: u32) -> Vec<MilestoneInfo> {
        let count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::NextMilestoneId(quest_id))
            .unwrap_or(0);

        let mut result = Vec::new(&env);
        for i in 0..count {
            if let Some(ms) = env
                .storage()
                .persistent()
                .get::<_, MilestoneInfo>(&DataKey::Milestone(quest_id, i))
            {
                result.push_back(ms);
            }
        }
        result
    }

    /// List all milestones for a quest.
    pub fn list_milestones(env: Env, quest_id: u32) -> Vec<MilestoneInfo> {
        Self::get_milestones(env, quest_id)
    }

    /// Get milestone count for a quest.
    pub fn get_milestone_count(env: Env, quest_id: u32) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::NextMilestoneId(quest_id))
            .unwrap_or(0)
    }

    /// Check if an enrollee has completed a milestone.
    pub fn is_completed(env: Env, quest_id: u32, milestone_id: u32, enrollee: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Completed(quest_id, milestone_id, enrollee))
    }

    /// Get total completions for an enrollee in a quest.
    pub fn get_enrollee_completions(env: Env, quest_id: u32, enrollee: Address) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::EnrolleeCompletions(quest_id, enrollee))
            .unwrap_or(0)
    }

    /// Get full progress details for an enrollee in a quest.
    pub fn get_enrollee_progress(env: Env, quest_id: u32, enrollee: Address) -> EnrolleeProgress {
        let completions: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::EnrolleeCompletions(quest_id, enrollee.clone()))
            .unwrap_or(0);
        let total_milestones: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::NextMilestoneId(quest_id))
            .unwrap_or(0);
        let total_earned: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::EnrolleeEarnings(quest_id, enrollee.clone()))
            .unwrap_or(0);

        let mut completion_details = Vec::new(&env);
        for i in 0..total_milestones {
            if env
                .storage()
                .persistent()
                .has(&DataKey::Completed(quest_id, i, enrollee.clone()))
            {
                if let Some(ts) = env
                    .storage()
                    .persistent()
                    .get::<_, u64>(&DataKey::CompletionTime(quest_id, i, enrollee.clone()))
                {
                    completion_details.push_back(CompletionInfo {
                        quest_id,
                        milestone_id: i,
                        enrollee: enrollee.clone(),
                        completed_at: ts,
                    });
                }
            }
        }

        EnrolleeProgress {
            quest_id,
            enrollee,
            completions,
            total_milestones,
            total_earned,
            completion_details,
        }
    }

    /// Get quest completion rate (% of enrollees who completed all milestones).
    pub fn get_quest_completion_rate(env: Env, quest_id: u32, total_enrollees: u32) -> i128 {
        if total_enrollees == 0 {
            return 0;
        }

        let total_milestones = match Self::get_quest_milestone_count(env.clone(), quest_id) {
            Ok(count) => count,
            Err(_) => return 0,
        };

        if total_milestones == 0 {
            return 0;
        }

        // Get quest contract address
        let quest_contract_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::QuestContract)
            .expect("Quest contract NOT INITIALIZED");

        // Cross-contract call to get enrollees
        let quest_client = QuestClient::new(&env, &quest_contract_addr);
        let enrollees = quest_client.get_enrollees(&quest_id);

        let mut fully_completed = 0u32;
        for enrollee in enrollees.iter() {
            let completions = Self::get_enrollee_completions(env.clone(), quest_id, enrollee);
            if completions >= total_milestones {
                fully_completed += 1;
            }
        }

        // Return percentage (0-100)
        (fully_completed as i128 * 100) / total_enrollees as i128
    }

    /// Get total earned for an enrollee in a quest.
    pub fn get_enrollee_earnings(env: Env, quest_id: u32, enrollee: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::EnrolleeEarnings(quest_id, enrollee))
            .unwrap_or(0)
    }

    // --- internals ---

    fn bump_ms(env: &Env, key: &DataKey) {
        common::extend_persistent_ttl(env, key);
    }

    fn require_admin(env: &Env, admin: &Address) -> Result<(), Error> {
        admin.require_auth();
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::Unauthorized)?;

        if *admin != stored_admin {
            return Err(Error::Unauthorized);
        }

        Ok(())
    }

    fn require_not_paused(env: &Env) -> Result<(), Error> {
        if env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
        {
            Err(Error::Paused)
        } else {
            Ok(())
        }
    }

    fn require_quest_owner(env: &Env, quest_id: u32, owner: &Address) -> Result<(), Error> {
        // Get quest contract address
        let quest_contract_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::QuestContract)
            .ok_or(Error::NotInitialized)?;

        // Cross-contract validation: verify caller is the actual quest owner
        let quest_client = QuestClient::new(env, &quest_contract_addr);
        let quest_info = quest_client.get_quest(&quest_id);

        // If it exists, verify the caller is the owner
        if quest_info.owner != *owner {
            return Err(Error::OwnerMismatch);
        }

        Ok(())
    }

    fn is_enrolled(env: &Env, quest_id: u32, user: &Address) -> Result<bool, Error> {
        // Get quest contract address
        let quest_contract_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::QuestContract)
            .ok_or(Error::NotInitialized)?;

        // Cross-contract call to check enrollment
        let quest_client = QuestClient::new(env, &quest_contract_addr);

        let enrolled = quest_client.is_enrollee(&quest_id, user);

        Ok(enrolled)
    }

    fn ensure_previous_completed(
        env: &Env,
        quest_id: u32,
        milestone_id: u32,
        enrollee: &Address,
        milestone: &MilestoneInfo,
    ) -> Result<(), Error> {
        if !milestone.requires_previous || milestone_id == 0 {
            return Ok(());
        }

        let previous_key = DataKey::Completed(quest_id, milestone_id - 1, enrollee.clone());
        if env.storage().persistent().has(&previous_key) {
            Ok(())
        } else {
            Err(Error::MilestoneNotUnlocked)
        }
    }

    /// Check if user has completed all milestones for a quest and mint certificate if so
    fn check_and_mint_certificate(env: Env, quest_id: u32, enrollee: Address) -> Result<(), Error> {
        // Get total number of milestones for this quest
        let total_milestones = Self::get_quest_milestone_count(env.clone(), quest_id)?;

        // Get number of completed milestones for this user
        let completed_count =
            Self::get_enrollee_completions(env.clone(), quest_id, enrollee.clone());

        // If user has completed all milestones, mint certificate
        if completed_count >= total_milestones {
            // Get quest info
            let quest_contract_addr: Address = env
                .storage()
                .instance()
                .get(&DataKey::QuestContract)
                .ok_or(Error::NotInitialized)?;

            let quest_client = QuestClient::new(&env, &quest_contract_addr);
            let quest_info = quest_client.get_quest(&quest_id);

            // Get certificate contract address
            let certificate_contract_addr: Address = env
                .storage()
                .instance()
                .get(&DataKey::CertificateContract)
                .ok_or(Error::NotInitialized)?;

            // Create certificate client
            let certificate_client = CertificateClient::new(&env, &certificate_contract_addr);

            // Mint certificate
            certificate_client.mint_quest_certificate(
                &quest_id,
                &quest_info.name,
                &quest_info.category,
                &enrollee,
            );

            // Emit certificate minted event
            env.events().publish(
                (symbol_short!("milestone"), symbol_short!("cert")),
                (quest_id, enrollee),
            );
        }

        Ok(())
    }

    /// Get total number of milestones for a quest
    fn get_quest_milestone_count(env: Env, quest_id: u32) -> Result<u32, Error> {
        let mut count = 0;
        let mut current_id = 0;

        loop {
            let key = DataKey::Milestone(quest_id, current_id);
            if !env.storage().persistent().has(&key) {
                break;
            }
            count += 1;
            current_id += 1;
        }

        Ok(count)
    }
}

#[cfg(test)]
mod test;
