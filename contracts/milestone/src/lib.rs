#![no_std]
#![allow(clippy::too_many_arguments, dead_code)]
use common::{extend_instance_ttl, EnrolleeStatus, QuestInfo, BUMP, MAX_REWARD_AMOUNT, THRESHOLD};
use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, Address, BytesN, Env,
    String, Symbol, Vec,
};

const MAX_PEER_REVIEW_APPROVALS: u32 = 100;
const MAX_COMPETITIVE_WINNERS: u32 = 1_000;

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
    fn get_enrollee_status(
        env: Env,
        quest_id: u32,
        enrollee: Address,
    ) -> Result<EnrolleeStatus, soroban_sdk::Val>;
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
    // Explicit milestone count per quest (O(1) lookup, survives gaps from deletes)
    MilestoneCount(u32),
    // Milestone data
    Milestone(u32, u32), // (quest_id, milestone_id)
    // Prerequisite milestone IDs
    Prerequisites(u32, u32), // (quest_id, milestone_id)
    // Completion flag
    Completed(u32, u32, Address), // (quest_id, milestone_id, enrollee)
    // Count of completions per enrollee per quest
    EnrolleeCompletions(u32, Address),
    // Distribution mode per quest
    Mode(u32),
    // Flat reward per milestone (Flat mode only)
    FlatReward(u32),
    // Total completions ever verified for a milestone (includes users who may have unenrolled)
    MilestoneCompletionTotal(u32, u32), // (quest_id, milestone_id)
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
    // List of approvers for cleanup
    Approvers(u32, u32, Address), // (quest_id, milestone_id, enrollee)
    // Total rewards reserved (verified + pending review) for a quest
    TotalReservedReward(u32),
    // Milestone feedback history per learner submission
    MilestoneFeedbackHistory(u32, u32, Address), // (quest_id, milestone_id, enrollee)
    // Verification state: who verified a completion and when.
    // Key: (quest_id, milestone_id, enrollee). Value: VerificationRecord.
    VerifiedBy(u32, u32, Address),
}

#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum FeedbackAction {
    Approve = 0,
    Reject = 1,
    RequestChanges = 2,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct MilestoneFeedback {
    pub reviewer: Address,
    pub action: FeedbackAction,
    pub comment: String,
    pub created_at: u64,
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
    Percentage(u32),  // percent (1..=100) of milestone.reward_amount, rounded to nearest
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
    pub difficulty: Option<String>,
    pub estimated_duration: Option<u32>,
    pub prerequisites_knowledge: Option<String>,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CompletionInfo {
    pub quest_id: u32,
    pub milestone_id: u32,
    pub enrollee: Address,
    pub completed_at: u64,
}

/// Records who verified a completion and when. Stored under `VerifiedBy` keys
/// so audits can trace every reward-triggering verification back to its authorizer.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct VerificationRecord {
    pub verified_by: Address,
    pub verified_at: u64,
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
    pub difficulty: Option<String>,
    pub estimated_duration: Option<u32>,
    pub prerequisites_knowledge: Option<String>,
}

/// Snapshot of the distribution parameters recorded at submission time.
/// Used at approval time so the enrollee is paid under the rules in effect
/// when they submitted, not whatever the owner has reconfigured since
/// (see issue #863).
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct PendingSubmissionSnapshot {
    pub distribution_mode: DistributionMode,
    /// Per-milestone reward at submission time. Used for the Custom and
    /// Competitive (winner) cases.
    pub reward_amount: i128,
    /// Flat reward at submission time. Only meaningful when
    /// `distribution_mode == Flat`; zero otherwise.
    pub flat_reward: i128,
    pub submitted_at: u64,
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
    AlreadyCompleted = 4,
    Reserved5 = 5, // reserved for stable ABI; do not reuse
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
    FlatRewardNotConfigured = 18,
    Overflow = 19,
    /// The cross-contract call to mint a quest-completion certificate
    /// failed. The whole transaction rolls back so milestone state stays
    /// consistent with the certificate state (see issues #860, #869).
    CertificateMintFailed = 20,
    /// Submission or verification is rejected because the quest deadline has passed.
    DeadlineExpired = 21,
    CircularDependency = 22,
    /// Contract is administratively paused (shared code 400).
    Paused = 400,
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
pub const MAX_FEEDBACK_LEN: u32 = 1000;
pub const MAX_BATCH_SIZE: u32 = 20;
pub const MAX_MILESTONES: u32 = 50;
/// Maximum window size accepted by `get_quest_completion_rate`. Callers must
/// supply an explicit `limit <= MAX_COMPLETION_RATE_PAGE` so a single call
/// can never iterate an unbounded enrollee set. See issue #865.
pub const MAX_COMPLETION_RATE_PAGE: u32 = 100;

// IsDataKey implementation — restricts TTL extension to Milestone DataKey only
impl common::IsDataKey for DataKey {}

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

    /// Returns the address that holds the contract-administrator role.
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    /// Upgrade this contract's WASM. Only the stored administrator can invoke it.
    pub fn upgrade(env: Env, admin: Address, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        Self::require_admin(&env, &admin)?;
        env.deployer().update_current_contract_wasm(new_wasm_hash);
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
    /// Also validates that the quest has not expired (deadline check).
    pub fn create_milestone(
        env: Env,
        owner: Address,
        quest_id: u32,
        title: String,
        description: String,
        reward_amount: i128,
        requires_previous: bool,
        difficulty: Option<String>,
        estimated_duration: Option<u32>,
        prerequisites_knowledge: Option<String>,
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
        if quest_info.status != common::QuestStatus::Active {
            return Err(Error::OwnerMismatch);
        }
        // Enforce quest deadline — milestone creation rejected if deadline has passed
        if quest_info.deadline > 0 && env.ledger().timestamp() > quest_info.deadline {
            return Err(Error::DeadlineExpired);
        }

        let next_key = DataKey::NextMilestoneId(quest_id);
        let id: u32 = env.storage().persistent().get(&next_key).unwrap_or(0);
        if id == 0 && requires_previous {
            return Err(Error::InvalidInput);
        }

        if id >= MAX_MILESTONES {
            return Err(Error::InvalidInput);
        }

        let next_id = id.checked_add(1).ok_or(Error::Overflow)?;

        let milestone = MilestoneInfo {
            id,
            quest_id,
            title,
            description,
            reward_amount,
            requires_previous,
            difficulty,
            estimated_duration,
            prerequisites_knowledge,
        };

        let mut prerequisites = Vec::new(&env);
        if requires_previous && id > 0 {
            prerequisites.push_back(id - 1);
        }

        let ms_key = DataKey::Milestone(quest_id, id);
        env.storage().persistent().set(&ms_key, &milestone);
        let prerequisite_key = DataKey::Prerequisites(quest_id, id);
        env.storage()
            .persistent()
            .set(&prerequisite_key, &prerequisites);
        env.storage().persistent().set(&next_key, &next_id);

        // Increment explicit milestone count
        let count_key = DataKey::MilestoneCount(quest_id);
        let current_count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        let next_count = current_count.checked_add(1).ok_or(Error::Overflow)?;
        env.storage()
            .persistent()
            .set(&count_key, &next_count);
        Self::bump_ms(&env, &count_key);

        // Emit milestone creation event
        // Event topics: (milestone_created,)
        // Event data: (milestone_id, quest_id, reward_amount)
        env.events().publish(
            (Symbol::new(&env, "milestone_created"),),
            (id, quest_id, milestone.reward_amount),
        );

        Self::bump_ms(&env, &ms_key);
        Self::bump_ms(&env, &prerequisite_key);
        Self::bump_ms(&env, &next_key);
        extend_instance_ttl(&env);
        Ok(id)
    }

    /// Create a milestone with zero or more prerequisite milestones.
    /// Prerequisites must already exist in this quest, preventing cycles.
    pub fn create_milestone_with_prereqs(
        env: Env,
        owner: Address,
        quest_id: u32,
        title: String,
        description: String,
        reward_amount: i128,
        prerequisites: Vec<u32>,
        difficulty: Option<String>,
        estimated_duration: Option<u32>,
        prerequisites_knowledge: Option<String>,
    ) -> Result<u32, Error> {
        owner.require_auth();
        Self::require_not_paused(&env)?;
        Self::validate_ms_input(&title, &description, reward_amount)?;

        let quest_contract_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::QuestContract)
            .ok_or(Error::NotInitialized)?;
        let quest_client = QuestClient::new(&env, &quest_contract_addr);
        let quest_info = quest_client.get_quest(&quest_id);
        if quest_info.owner != owner || quest_info.status != common::QuestStatus::Active {
            return Err(Error::OwnerMismatch);
        }
        if quest_info.deadline > 0 && env.ledger().timestamp() > quest_info.deadline {
            return Err(Error::DeadlineExpired);
        }

        let next_key = DataKey::NextMilestoneId(quest_id);
        let id: u32 = env.storage().persistent().get(&next_key).unwrap_or(0);
        if id >= MAX_MILESTONES || prerequisites.len() > id {
            return Err(Error::InvalidInput);
        }
        for prerequisite_id in prerequisites.iter() {
            if prerequisite_id >= id
                || prerequisites
                    .iter()
                    .filter(|candidate| *candidate == prerequisite_id)
                    .count()
                    > 1
            {
                return Err(Error::InvalidInput);
            }

            if env
                .storage()
                .persistent()
                .get::<_, MilestoneInfo>(&DataKey::Milestone(quest_id, prerequisite_id))
                .is_none()
            {
                return Err(Error::NotFound);
            }
        }

        let next_id = id.checked_add(1).ok_or(Error::Overflow)?;

        let milestone = MilestoneInfo {
            id,
            quest_id,
            title,
            description,
            reward_amount,
            requires_previous: !prerequisites.is_empty(),
            difficulty,
            estimated_duration,
            prerequisites_knowledge,
        };
        let ms_key = DataKey::Milestone(quest_id, id);
        let prerequisite_key = DataKey::Prerequisites(quest_id, id);
        env.storage().persistent().set(&ms_key, &milestone);
        env.storage()
            .persistent()
            .set(&prerequisite_key, &prerequisites);
        env.storage().persistent().set(&next_key, &next_id);
        let count_key = DataKey::MilestoneCount(quest_id);
        let current_count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        let next_count = current_count.checked_add(1).ok_or(Error::Overflow)?;
        env.storage()
            .persistent()
            .set(&count_key, &next_count);
        Self::bump_ms(&env, &count_key);
        Self::bump_ms(&env, &ms_key);
        Self::bump_ms(&env, &prerequisite_key);
        Self::bump_ms(&env, &next_key);
        env.events().publish(
            (Symbol::new(&env, "milestone_created"),),
            (id, quest_id, milestone.reward_amount),
        );
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
        if quest_info.status != common::QuestStatus::Active {
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

            if id == 0 && ms.requires_previous {
                return Err(Error::InvalidInput);
            }

            let ms_info = MilestoneInfo {
                id,
                quest_id,
                title: ms.title,
                description: ms.description,
                reward_amount: ms.reward_amount,
                requires_previous: ms.requires_previous,
                difficulty: ms.difficulty,
                estimated_duration: ms.estimated_duration,
                prerequisites_knowledge: ms.prerequisites_knowledge,
            };

            let ms_key = DataKey::Milestone(quest_id, id);
            env.storage().persistent().set(&ms_key, &ms_info);
            env.storage().persistent().set(&next_key, &(id.checked_add(1).ok_or(Error::Overflow)?));

            // Increment explicit milestone count
            let count_key = DataKey::MilestoneCount(quest_id);
            let current_count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
            env.storage()
                .persistent()
                .set(&count_key, &(current_count.checked_add(1).ok_or(Error::Overflow)?));
            Self::bump_ms(&env, &count_key);

            // Emit milestone creation event
            env.events().publish(
                (Symbol::new(&env, "milestone_created"),),
                (id, quest_id, ms_info.reward_amount),
            );

            Self::bump_ms(&env, &ms_key);
            Self::bump_ms(&env, &next_key);
            ids.push_back(id);
        }

        extend_instance_ttl(&env);
        Ok(ids)
    }

    /// Estimate the rent (in stroops) needed to store a batch of milestones.
    /// This is a planning aid — always confirm the exact fee with
    /// `simulateTransaction` before signing.
    pub fn estimate_batch_rent(
        _env: Env,
        milestone_count: u32,
        avg_title_len: u32,
        avg_description_len: u32,
    ) -> i128 {
        // Fixed overhead per MilestoneInfo entry (id, quest_id, reward_amount,
        // requires_previous, and struct/XDR framing).
        const FIXED_OVERHEAD_BYTES: u32 = 128;

        let per_milestone_size = FIXED_OVERHEAD_BYTES + avg_title_len + avg_description_len;
        let total_size = per_milestone_size * milestone_count.min(MAX_BATCH_SIZE);

        common::estimate_persistent_rent(total_size)
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

        if let VerificationMode::PeerReview(required_approvals) = &mode {
            if *required_approvals == 0 || *required_approvals > MAX_PEER_REVIEW_APPROVALS {
                return Err(Error::InvalidInput);
            }
        }

        let mode_key = DataKey::VerificationMode(quest_id);
        env.storage().persistent().set(&mode_key, &mode);
        env.storage()
            .persistent()
            .extend_ttl(&mode_key, THRESHOLD, BUMP);

        Ok(())
    }

    /// Set the reward distribution mode for a quest. Owner only.
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

        if let DistributionMode::Competitive(max_winners) = &mode {
            if *max_winners == 0 || *max_winners > MAX_COMPETITIVE_WINNERS {
                return Err(Error::InvalidInput);
            }
        }

        if matches!(mode, DistributionMode::Percentage(p) if p == 0 || p > 100) {
            return Err(Error::InvalidInput);
        }

        // Prevent reward-type changes once milestones exist. Reapplying the
        // same mode is treated as a no-op and remains allowed.
        let count_key = DataKey::MilestoneCount(quest_id);
        let current_mode: DistributionMode = env
            .storage()
            .persistent()
            .get(&DataKey::Mode(quest_id))
            .unwrap_or(DistributionMode::Custom);
        if env.storage().persistent().get(&count_key).unwrap_or(0u32) > 0 && current_mode != mode {
            return Err(Error::InvalidInput);
        }

        let mode_key = DataKey::Mode(quest_id);
        env.storage().persistent().set(&mode_key, &mode);
        env.storage()
            .persistent()
            .extend_ttl(&mode_key, THRESHOLD, BUMP);

        let flat_for_event = if matches!(mode, DistributionMode::Flat) {
            let flat_key = DataKey::FlatReward(quest_id);
            env.storage().persistent().set(&flat_key, &flat_reward);
            env.storage()
                .persistent()
                .extend_ttl(&flat_key, THRESHOLD, BUMP);
            flat_reward
        } else {
            0
        };

        // Emit a distribution-mode-set event so indexers and frontends can
        // detect mode changes and warn enrolled learners that the reward
        // rules have shifted. See issue #868.
        // Topic: ("distribution_mode_set",)
        // Data: (quest_id, mode, flat_reward_or_zero, actor, timestamp)
        env.events().publish(
            (Symbol::new(&env, "distribution_mode_set"),),
            (
                quest_id,
                mode,
                flat_for_event,
                owner,
                env.ledger().timestamp(),
            ),
        );

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
        // Prevent the owner from verifying their own completion (self-verification guard).
        if owner == enrollee {
            return Err(Error::InvalidApprover);
        }
        if quest_info.status != common::QuestStatus::Active {
            return Err(Error::Unauthorized);
        }
        if quest_info.deadline > 0 && env.ledger().timestamp() > quest_info.deadline {
            return Err(Error::DeadlineExpired);
        }

        // Verify enrollee is enrolled in the quest (Issue #162)
        if !Self::is_enrolled(&env, quest_id, &enrollee)? {
            return Err(Error::NotEnrolled);
        }
        let enrollee_status = quest_client
            .try_get_enrollee_status(&quest_id, &enrollee)
            .map_err(|_| Error::NotEnrolled)?
            .map_err(|_| Error::NotEnrolled)?;
        if enrollee_status != EnrolleeStatus::Active {
            return Err(Error::NotEnrolled);
        }

        let ms_key = DataKey::Milestone(quest_id, milestone_id);
        let milestone: MilestoneInfo = env
            .storage()
            .persistent()
            .get(&ms_key)
            .ok_or(Error::NotFound)?;

        // Re-validate the stored reward against current contract bounds — a
        // reduced MAX_REWARD_AMOUNT after a contract upgrade must not let an
        // old, now out-of-bounds milestone silently distribute (Issue #1174).
        if milestone.reward_amount <= 0 || milestone.reward_amount > MAX_REWARD_AMOUNT {
            return Err(Error::InvalidAmount);
        }

        Self::ensure_previous_completed(&env, quest_id, milestone_id, &enrollee, &milestone)?;

        let comp_key = DataKey::Completed(quest_id, milestone_id, enrollee.clone());
        if env.storage().persistent().has(&comp_key) {
            return Err(Error::AlreadyCompleted);
        }

        // Increment total reserved reward if this completion wasn't already pending review
        let submit_key = DataKey::PendingSubmission(quest_id, milestone_id, enrollee.clone());
        let had_pending = env.storage().persistent().has(&submit_key);
        let reserved_key = DataKey::TotalReservedReward(quest_id);
        if !had_pending {
            let current_reserved: i128 = env.storage().persistent().get(&reserved_key).unwrap_or(0);
            let new_reserved = current_reserved
                .checked_add(milestone.reward_amount)
                .ok_or(Error::Overflow)?;
            env.storage().persistent().set(&reserved_key, &new_reserved);
        }

        // Predict whether this completion finishes the quest. We need the
        // answer BEFORE writing the comp_key so we can attempt the
        // certificate mint first (#860): if the cross-contract mint fails,
        // the whole transaction reverts and the milestone state is never
        // observed in the "completed but no cert" intermediate. Combined
        // with the try_mint inside maybe_mint_certificate (#869), any mint
        // error is surfaced as `Error::CertificateMintFailed`.
        let current_completions: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::EnrolleeCompletions(quest_id, enrollee.clone()))
            .unwrap_or(0);
        let next_completion_count = current_completions.checked_add(1).ok_or(Error::Overflow)?;
        Self::maybe_mint_certificate(
            env.clone(),
            quest_id,
            enrollee.clone(),
            next_completion_count,
        )?;

        // Mark completed FIRST — this acts as the de-duplication tombstone
        // so any further code paths in this function (in particular the
        // Competitive cnt bump below) and any defensive re-check observe a
        // consistent "already completed" state for (quest, milestone,
        // enrollee). See issue #859.
        env.storage().persistent().set(&comp_key, &true);
        env.storage()
            .persistent()
            .extend_ttl(&comp_key, THRESHOLD, BUMP);
        env.storage()
            .persistent()
            .extend_ttl(&reserved_key, THRESHOLD, BUMP);

        // Determine reward based on distribution mode. The Competitive
        // counter bump happens AFTER the comp_key tombstone is in place.
        let mode: DistributionMode = env
            .storage()
            .persistent()
            .get(&DataKey::Mode(quest_id))
            .unwrap_or(DistributionMode::Custom);

        let reward = match mode.clone() {
            DistributionMode::Custom => milestone.reward_amount,
            DistributionMode::Flat => env
                .storage()
                .persistent()
                .get(&DataKey::FlatReward(quest_id))
                .ok_or(Error::FlatRewardNotConfigured)?,
            DistributionMode::Percentage(pct) => {
                // Compute reward = round(milestone.reward_amount * pct / 100)
                let pct_i: i128 = pct as i128;
                let prod = milestone
                    .reward_amount
                    .checked_mul(pct_i)
                    .ok_or(Error::Overflow)?;
                let with_round = prod.checked_add(50).ok_or(Error::Overflow)?; // round to nearest
                with_round / 100
            }
            DistributionMode::Competitive(max_winners) => {
                let cnt_key = DataKey::MilestoneCompletionTotal(quest_id, milestone_id);
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

        // Store completion timestamp
        let time_key = DataKey::CompletionTime(quest_id, milestone_id, enrollee.clone());
        env.storage()
            .persistent()
            .set(&time_key, &env.ledger().timestamp());
        env.storage()
            .persistent()
            .extend_ttl(&time_key, THRESHOLD, BUMP);

        // Record verification state for audit trail
        let verify_key = DataKey::VerifiedBy(quest_id, milestone_id, enrollee.clone());
        let verification = VerificationRecord {
            verified_by: owner.clone(),
            verified_at: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&verify_key, &verification);
        common::extend_persistent_ttl(&env, &verify_key);

        // Increment enrollee's completion count for this quest
        let count_key = DataKey::EnrolleeCompletions(quest_id, enrollee.clone());
        env.storage()
            .persistent()
            .set(&count_key, &next_completion_count);
        env.storage()
            .persistent()
            .extend_ttl(&count_key, THRESHOLD, BUMP);

        // Update total earnings for enrollee
        let earnings_key = DataKey::EnrolleeEarnings(quest_id, enrollee.clone());
        let total_earned: i128 = env.storage().persistent().get(&earnings_key).unwrap_or(0);
        let updated_earnings = total_earned.checked_add(reward).ok_or(Error::Overflow)?;
        env.storage()
            .persistent()
            .set(&earnings_key, &updated_earnings);
        env.storage()
            .persistent()
            .extend_ttl(&earnings_key, THRESHOLD, BUMP);

        // Emit milestone completion event
        // Event topics: (milestone_completed,)
        // Event data: (quest_id, milestone_id, enrollee, reward, distribution_mode)
        env.events().publish(
            (Symbol::new(&env, "milestone_completed"),),
            (quest_id, milestone_id, enrollee.clone(), reward, mode),
        );

        Ok(reward)
    }

    /// Get the verification record for a completed milestone.
    /// Returns None if the milestone has not been verified for this enrollee.
    pub fn get_verification_record(
        env: Env,
        quest_id: u32,
        milestone_id: u32,
        enrollee: Address,
    ) -> Option<VerificationRecord> {
        let key = DataKey::VerifiedBy(quest_id, milestone_id, enrollee);
        env.storage().persistent().get(&key)
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

        let quest_contract_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::QuestContract)
            .ok_or(Error::NotInitialized)?;
        let quest_client = QuestClient::new(&env, &quest_contract_addr);
        let quest_info = quest_client.get_quest(&quest_id);
        if quest_info.status != common::QuestStatus::Active {
            return Err(Error::Unauthorized);
        }
        if quest_info.deadline > 0 && env.ledger().timestamp() > quest_info.deadline {
            return Err(Error::DeadlineExpired);
        }

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
        let enrollee_status = quest_client
            .try_get_enrollee_status(&quest_id, &enrollee)
            .map_err(|_| Error::NotEnrolled)?
            .map_err(|_| Error::NotEnrolled)?;
        if enrollee_status != EnrolleeStatus::Active {
            return Err(Error::NotEnrolled);
        }

        // Verify prerequisite milestone is completed if required
        Self::ensure_previous_completed(&env, quest_id, milestone_id, &enrollee, &milestone)?;

        // Snapshot the distribution-mode parameters at submission time so
        // the approval flow is paid under the rules the enrollee signed up
        // for. See issue #863.
        let current_mode: DistributionMode = env
            .storage()
            .persistent()
            .get(&DataKey::Mode(quest_id))
            .unwrap_or(DistributionMode::Custom);
        let current_flat_reward: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::FlatReward(quest_id))
            .unwrap_or(0);
        let snapshot = PendingSubmissionSnapshot {
            distribution_mode: current_mode,
            reward_amount: milestone.reward_amount,
            flat_reward: current_flat_reward,
            submitted_at: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&submit_key, &snapshot);

        // Increment total reserved reward for pending review
        let reserved_key = DataKey::TotalReservedReward(quest_id);
        let current_reserved: i128 = env.storage().persistent().get(&reserved_key).unwrap_or(0);
        let new_reserved = current_reserved
            .checked_add(milestone.reward_amount)
            .ok_or(Error::Overflow)?;
        env.storage().persistent().set(&reserved_key, &new_reserved);
        env.storage()
            .persistent()
            .extend_ttl(&reserved_key, THRESHOLD, BUMP);
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

        let quest_contract_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::QuestContract)
            .ok_or(Error::NotInitialized)?;
        let quest_client = QuestClient::new(&env, &quest_contract_addr);
        let quest_info = quest_client.get_quest(&quest_id);
        if quest_info.status != common::QuestStatus::Active {
            return Err(Error::Unauthorized);
        }
        if quest_info.deadline > 0 && env.ledger().timestamp() > quest_info.deadline {
            return Err(Error::DeadlineExpired);
        }

        // Check if milestone exists
        let ms_key = DataKey::Milestone(quest_id, milestone_id);
        let milestone: MilestoneInfo = env
            .storage()
            .persistent()
            .get(&ms_key)
            .ok_or(Error::NotFound)?;

        // Re-validate the stored reward against current contract bounds — a
        // reduced MAX_REWARD_AMOUNT after a contract upgrade must not let an
        // old, now out-of-bounds milestone silently distribute (Issue #1174).
        if milestone.reward_amount <= 0 || milestone.reward_amount > MAX_REWARD_AMOUNT {
            return Err(Error::InvalidAmount);
        }

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
        let peer_status = quest_client
            .try_get_enrollee_status(&quest_id, &peer)
            .map_err(|_| Error::NotEnrolled)?
            .map_err(|_| Error::NotEnrolled)?;
        if peer_status != EnrolleeStatus::Active {
            return Err(Error::NotEnrolled);
        }
        let enrollee_status = quest_client
            .try_get_enrollee_status(&quest_id, &enrollee)
            .map_err(|_| Error::NotEnrolled)?
            .map_err(|_| Error::NotEnrolled)?;
        if enrollee_status != EnrolleeStatus::Active {
            return Err(Error::NotEnrolled);
        }

        // Get verification mode and required approvals
        let verification_mode: VerificationMode = env
            .storage()
            .persistent()
            .get(&DataKey::VerificationMode(quest_id))
            .unwrap_or(VerificationMode::OwnerOnly);

        let required_approvals = match verification_mode.clone() {
            VerificationMode::PeerReview(approvals) => approvals,
            VerificationMode::OwnerOnly => return Err(Error::Unauthorized),
        };

        // Record the peer approval
        env.storage().persistent().set(&approval_key, &true);
        env.storage()
            .persistent()
            .extend_ttl(&approval_key, THRESHOLD, BUMP);

        // Track approver for cleanup
        let approvers_key = DataKey::Approvers(quest_id, milestone_id, enrollee.clone());
        let mut approvers: Vec<Address> = env
            .storage()
            .persistent()
            .get(&approvers_key)
            .unwrap_or_else(|| Vec::new(&env));
        approvers.push_back(peer.clone());
        env.storage().persistent().set(&approvers_key, &approvers);
        env.storage()
            .persistent()
            .extend_ttl(&approvers_key, THRESHOLD, BUMP);

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

            // Load the snapshot taken at submission time. Reward computation
            // uses these snapshotted parameters rather than re-reading the
            // current Mode / FlatReward, so a distribution-mode change by
            // the owner between submission and approval cannot retroactively
            // alter what the enrollee earns. See issue #863.
            let snapshot: PendingSubmissionSnapshot = env
                .storage()
                .persistent()
                .get(&submit_key)
                .ok_or(Error::NotSubmitted)?;

            // Predict whether this approval closes out the quest and try the
            // certificate mint FIRST. With try_mint_quest_certificate, a
            // mint failure becomes `Error::CertificateMintFailed` and the
            // whole transaction reverts — leaving the milestone untouched
            // for a clean retry. See issues #860 and #869.
            let current_completions: u32 = env
                .storage()
                .persistent()
                .get(&DataKey::EnrolleeCompletions(quest_id, enrollee.clone()))
                .unwrap_or(0);
            let next_completion_count =
                current_completions.checked_add(1).ok_or(Error::Overflow)?;
            Self::maybe_mint_certificate(
                env.clone(),
                quest_id,
                enrollee.clone(),
                next_completion_count,
            )?;

            // Auto-complete the milestone — comp_key is written BEFORE the
            // Competitive cnt bump below to serve as the de-duplication
            // tombstone (#859).
            env.storage().persistent().set(&comp_key, &true);
            env.storage()
                .persistent()
                .extend_ttl(&comp_key, THRESHOLD, BUMP);

            // Remove pending submission
            env.storage().persistent().remove(&submit_key);

            // Clean up PeerApproval tombstones and tracking
            let approvers_key = DataKey::Approvers(quest_id, milestone_id, enrollee.clone());
            let approvers: Vec<Address> = env
                .storage()
                .persistent()
                .get(&approvers_key)
                .unwrap_or_else(|| Vec::new(&env));
            for approver in approvers.iter() {
                let p_key =
                    DataKey::PeerApproval(quest_id, milestone_id, enrollee.clone(), approver);
                env.storage().persistent().remove(&p_key);
            }
            env.storage().persistent().remove(&approvers_key);
            env.storage().persistent().remove(&count_key);

            // Increment enrollee's completion count for this quest
            let enrollee_count_key = DataKey::EnrolleeCompletions(quest_id, enrollee.clone());
            env.storage()
                .persistent()
                .set(&enrollee_count_key, &next_completion_count);
            env.storage()
                .persistent()
                .extend_ttl(&enrollee_count_key, THRESHOLD, BUMP);

            // Determine reward based on the SNAPSHOTTED distribution mode.
            let reward = match snapshot.distribution_mode {
                DistributionMode::Custom => snapshot.reward_amount,
                DistributionMode::Flat => {
                    if snapshot.flat_reward <= 0 {
                        return Err(Error::FlatRewardNotConfigured);
                    }
                    snapshot.flat_reward
                }
                DistributionMode::Percentage(pct) => {
                    let pct_i: i128 = pct as i128;
                    let prod = snapshot
                        .reward_amount
                        .checked_mul(pct_i)
                        .ok_or(Error::Overflow)?;
                    let with_round = prod.checked_add(50).ok_or(Error::Overflow)?;
                    with_round / 100
                }
                DistributionMode::Competitive(max_winners) => {
                    let cnt_key = DataKey::MilestoneCompletionTotal(quest_id, milestone_id);
                    let cnt: u32 = env.storage().persistent().get(&cnt_key).unwrap_or(0);
                    env.storage().persistent().set(&cnt_key, &(cnt + 1));
                    env.storage()
                        .persistent()
                        .extend_ttl(&cnt_key, THRESHOLD, BUMP);
                    if cnt < max_winners {
                        snapshot.reward_amount
                    } else {
                        0
                    }
                }
            };

            // Emit peer approval completion event
            // Event topics: (peer_approved,)
            // Event data: (milestone_id, quest_id, enrollee, peer, reward_amount, verification_mode, approval_count)
            env.events().publish(
                (Symbol::new(&env, "peer_approved"),),
                (milestone_id, quest_id, enrollee.clone(), peer, reward, verification_mode, new_approvals),
            );

            Ok(Some(reward))
        } else {
            Ok(None) // More approvals needed
        }
    }

    /// Release all pending-review reward reservations for a suspended enrollee.
    ///
    /// The reward tokens remain in the rewards contract's quest pool; this clears
    /// the milestone-side reservation so those funds are no longer treated as owed
    /// to a learner who can no longer complete the review flow.
    pub fn handle_suspended_enrollee(
        env: Env,
        owner: Address,
        quest_id: u32,
        enrollee: Address,
    ) -> Result<i128, Error> {
        owner.require_auth();
        Self::require_not_paused(&env)?;

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

        let status = quest_client
            .try_get_enrollee_status(&quest_id, &enrollee)
            .map_err(|_| Error::NotEnrolled)?
            .map_err(|_| Error::NotEnrolled)?;
        if status != EnrolleeStatus::Suspended && status != EnrolleeStatus::Banned {
            return Err(Error::InvalidInput);
        }

        let next_id: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::NextMilestoneId(quest_id))
            .unwrap_or(0);
        let mut released: i128 = 0;

        for milestone_id in 0..next_id {
            let submit_key = DataKey::PendingSubmission(quest_id, milestone_id, enrollee.clone());
            if !env.storage().persistent().has(&submit_key) {
                continue;
            }

            let milestone: MilestoneInfo = env
                .storage()
                .persistent()
                .get(&DataKey::Milestone(quest_id, milestone_id))
                .ok_or(Error::NotFound)?;
            released = released
                .checked_add(milestone.reward_amount)
                .ok_or(Error::Overflow)?;

            env.storage().persistent().remove(&submit_key);
            let count_key = DataKey::ApprovalCount(quest_id, milestone_id, enrollee.clone());
            env.storage().persistent().remove(&count_key);

            let approvers_key = DataKey::Approvers(quest_id, milestone_id, enrollee.clone());
            let approvers: Vec<Address> = env
                .storage()
                .persistent()
                .get(&approvers_key)
                .unwrap_or_else(|| Vec::new(&env));
            for approver in approvers.iter() {
                let approval_key =
                    DataKey::PeerApproval(quest_id, milestone_id, enrollee.clone(), approver);
                env.storage().persistent().remove(&approval_key);
            }
            env.storage().persistent().remove(&approvers_key);
        }

        if released > 0 {
            let reserved_key = DataKey::TotalReservedReward(quest_id);
            let current_reserved: i128 = env.storage().persistent().get(&reserved_key).unwrap_or(0);
            let updated_reserved = current_reserved
                .checked_sub(released)
                .ok_or(Error::Overflow)?;
            env.storage()
                .persistent()
                .set(&reserved_key, &updated_reserved);
            env.storage()
                .persistent()
                .extend_ttl(&reserved_key, THRESHOLD, BUMP);
        }

        env.events().publish(
            (Symbol::new(&env, "pending_reward_released"),),
            (quest_id, enrollee, released),
        );
        extend_instance_ttl(&env);
        Ok(released)
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

    /// Get the prerequisite milestone IDs for a milestone.
    /// Legacy milestones are represented as a single preceding prerequisite.
    pub fn get_milestone_prerequisites(env: Env, quest_id: u32, milestone_id: u32) -> Vec<u32> {
        if let Some(prerequisites) = env
            .storage()
            .persistent()
            .get(&DataKey::Prerequisites(quest_id, milestone_id))
        {
            return prerequisites;
        }

        let milestone: Option<MilestoneInfo> = env
            .storage()
            .persistent()
            .get(&DataKey::Milestone(quest_id, milestone_id));
        let mut prerequisites = Vec::new(&env);
        if let Some(milestone) = milestone {
            if milestone.requires_previous && milestone_id > 0 {
                prerequisites.push_back(milestone_id - 1);
            }
        }
        prerequisites
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

    /// Get milestone count for a quest.
    pub fn get_milestone_count(env: Env, quest_id: u32) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::MilestoneCount(quest_id))
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
    pub fn get_enrollee_progress(
        env: Env,
        quest_id: u32,
        enrollee: Address,
        offset: u32,
        limit: u32,
    ) -> Result<EnrolleeProgress, Error> {
        if limit == 0 || limit > 100 {
            return Err(Error::InvalidInput);
        }

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

        if offset >= total_milestones {
            return Ok(EnrolleeProgress {
                quest_id,
                enrollee,
                completions,
                total_milestones,
                total_earned,
                completion_details: Vec::new(&env),
            });
        }

        let mut completion_details = Vec::new(&env);
        let end = offset.saturating_add(limit).min(total_milestones);
        for i in offset..end {
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

        Ok(EnrolleeProgress {
            quest_id,
            enrollee,
            completions,
            total_milestones,
            total_earned,
            completion_details,
        })
    }

    /// Paginated quest completion rate (issue #865).
    ///
    /// Returns the percentage of enrollees in the window
    /// `enrollees[offset .. offset + limit]` that have completed every
    /// milestone for the quest. The previous unbounded version iterated
    /// every enrollee on every call, which became a DOS vector for quests
    /// with thousands of enrollees.
    ///
    /// Bounded by `MAX_COMPLETION_RATE_PAGE`: callers that pass `limit`
    /// above that cap are rejected with `Error::InvalidInput`. Pass
    /// `limit == 0` to also be rejected; callers must opt in to a window.
    pub fn get_quest_completion_rate(
        env: Env,
        quest_id: u32,
        offset: u32,
        limit: u32,
    ) -> Result<i128, Error> {
        if limit == 0 || limit > MAX_COMPLETION_RATE_PAGE {
            return Err(Error::InvalidInput);
        }

        let total_milestones = Self::get_quest_milestone_count(env.clone(), quest_id)?;
        if total_milestones == 0 {
            return Ok(0);
        }

        let quest_contract_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::QuestContract)
            .ok_or(Error::NotInitialized)?;
        let quest_client = QuestClient::new(&env, &quest_contract_addr);
        let enrollees = quest_client.get_enrollees(&quest_id);

        let total = enrollees.len();
        if offset >= total {
            return Ok(0);
        }
        let end = offset.saturating_add(limit).min(total);

        let mut window_size = 0u32;
        let mut fully_completed = 0u32;
        for i in offset..end {
            let enrollee = enrollees.get(i).expect("index in bounds by construction");
            let completions = Self::get_enrollee_completions(env.clone(), quest_id, enrollee);
            if completions >= total_milestones {
                fully_completed += 1;
            }
            window_size += 1;
        }

        if window_size == 0 {
            return Ok(0);
        }

        Ok((fully_completed as i128 * 100) / window_size as i128)
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
        if common::is_paused_by_key(env, &DataKey::Paused) {
            Err(Error::Paused)
        } else {
            Ok(())
        }
    }

    /// Get quest info and verify ownership in a single call.
    /// This caches the result to avoid redundant cross-contract calls within the same transaction.
    ///
    /// Returns the QuestInfo if the caller is the owner, or an error otherwise.
    ///
    /// # Usage
    /// When a function needs both ownership verification and quest data:
    /// ```ignore
    /// let quest = Self::get_quest_and_verify_owner(&env, quest_id, &owner)?;
    /// // Now reuse quest_info for all subsequent operations
    /// ```
    fn get_quest_and_verify_owner(
        env: &Env,
        quest_id: u32,
        claimed_owner: &Address,
    ) -> Result<QuestInfo, Error> {
        // Get quest contract address
        let quest_contract_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::QuestContract)
            .ok_or(Error::NotInitialized)?;

        // Cross-contract call to fetch quest info (single call, cached result)
        let quest_client = QuestClient::new(env, &quest_contract_addr);
        let quest_info = quest_client.get_quest(&quest_id);

        // Verify the caller is the owner
        if quest_info.owner != *claimed_owner {
            return Err(Error::OwnerMismatch);
        }

        // Return the cached result for reuse in the same transaction
        Ok(quest_info)
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
        let prerequisites = Self::get_milestone_prerequisites(env.clone(), quest_id, milestone_id);
        if prerequisites.is_empty() && (!milestone.requires_previous || milestone_id == 0) {
            return Ok(());
        }

        for prerequisite_id in prerequisites.iter() {
            let prerequisite_key = DataKey::Completed(quest_id, prerequisite_id, enrollee.clone());
            if !env.storage().persistent().has(&prerequisite_key) {
                return Err(Error::MilestoneNotUnlocked);
            }
        }

        Ok(())
    }

    /// Attempt the quest-completion certificate mint if the supplied
    /// `next_completion_count` would equal or exceed the milestone count
    /// for the quest. Designed to be called **before** the milestone is
    /// marked Completed so that:
    ///
    /// - If the certificate contract panics or returns Err, this function
    ///   emits a `certificate_mint_failed` event and returns
    ///   `Error::CertificateMintFailed`, causing the whole transaction
    ///   (including the would-be milestone completion) to revert. The
    ///   user can re-trigger the verification once the certificate
    ///   contract is recoverable. (issues #860, #869)
    /// - If the mint succeeds, a `certificate_minted` event is emitted
    ///   and the caller proceeds to commit the milestone.
    /// - If this completion doesn't yet finish the quest, no mint is
    ///   attempted and `Ok(())` is returned.
    fn maybe_mint_certificate(
        env: Env,
        quest_id: u32,
        enrollee: Address,
        next_completion_count: u32,
    ) -> Result<(), Error> {
        let total_milestones = Self::get_quest_milestone_count(env.clone(), quest_id)?;
        if total_milestones == 0 || next_completion_count < total_milestones {
            return Ok(());
        }

        let quest_contract_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::QuestContract)
            .ok_or(Error::NotInitialized)?;
        let quest_client = QuestClient::new(&env, &quest_contract_addr);
        let quest_info = quest_client.get_quest(&quest_id);

        let certificate_contract_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::CertificateContract)
            .ok_or(Error::NotInitialized)?;
        let certificate_client = CertificateClient::new(&env, &certificate_contract_addr);

        // `try_mint_quest_certificate` returns `Result<Result<u32, Val>,
        // InvokeError>` — both Err shapes are treated as mint failure.
        match certificate_client.try_mint_quest_certificate(
            &quest_id,
            &quest_info.name,
            &quest_info.category,
            &enrollee,
        ) {
            Ok(Ok(_)) => {
                env.events().publish(
                    (Symbol::new(&env, "certificate_minted"),),
                    (quest_id, enrollee),
                );
                Ok(())
            }
            _ => {
                // Surface the failure so any indexer / frontend can react.
                env.events().publish(
                    (Symbol::new(&env, "certificate_mint_failed"),),
                    (quest_id, enrollee),
                );
                Err(Error::CertificateMintFailed)
            }
        }
    }

    /// Get total reserved reward (verified + pending review) for a quest.
    pub fn get_total_reserved_reward(env: Env, quest_id: u32) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::TotalReservedReward(quest_id))
            .unwrap_or(0)
    }

    /// Record milestone feedback history and emit a structured event.
    fn record_feedback(
        env: &Env,
        quest_id: u32,
        milestone_id: u32,
        enrollee: &Address,
        reviewer: &Address,
        action: FeedbackAction,
        comment: String,
    ) -> Result<(), Error> {
        if comment.len() > MAX_FEEDBACK_LEN {
            return Err(Error::InvalidInput);
        }
        let key = DataKey::MilestoneFeedbackHistory(quest_id, milestone_id, enrollee.clone());
        let mut history: Vec<MilestoneFeedback> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| Vec::new(env));
        history.push_back(MilestoneFeedback {
            reviewer: reviewer.clone(),
            action,
            comment: comment.clone(),
            created_at: env.ledger().timestamp(),
        });
        env.storage().persistent().set(&key, &history);
        env.storage().persistent().extend_ttl(&key, THRESHOLD, BUMP);

        // Emit feedback event
        // Topics: (milestone_feedback,)
        // Data: (quest_id, milestone_id, enrollee, reviewer, action, comment)
        env.events().publish(
            (Symbol::new(env, "milestone_feedback"),),
            (
                quest_id,
                milestone_id,
                enrollee.clone(),
                reviewer.clone(),
                action as u32,
                comment,
            ),
        );
        Ok(())
    }

    /// Verify an enrollee's completion of a milestone with written feedback. Owner only.
    pub fn verify_completion_with_feedback(
        env: Env,
        owner: Address,
        quest_id: u32,
        milestone_id: u32,
        enrollee: Address,
        feedback: String,
    ) -> Result<i128, Error> {
        let reward = Self::verify_completion(
            env.clone(),
            owner.clone(),
            quest_id,
            milestone_id,
            enrollee.clone(),
        )?;
        Self::record_feedback(
            &env,
            quest_id,
            milestone_id,
            &enrollee,
            &owner,
            FeedbackAction::Approve,
            feedback,
        )?;
        Ok(reward)
    }

    /// Reject an enrollee's pending milestone submission with written feedback.
    /// Can be called by quest owner or enrolled peer reviewers.
    pub fn reject_completion_with_feedback(
        env: Env,
        reviewer: Address,
        quest_id: u32,
        milestone_id: u32,
        enrollee: Address,
        feedback: String,
    ) -> Result<(), Error> {
        reviewer.require_auth();
        Self::require_not_paused(&env)?;

        let quest_contract_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::QuestContract)
            .ok_or(Error::NotInitialized)?;
        let quest_client = QuestClient::new(&env, &quest_contract_addr);
        let quest_info = quest_client.get_quest(&quest_id);

        let is_owner = quest_info.owner == reviewer;
        if !is_owner {
            if !Self::is_enrolled(&env, quest_id, &reviewer)? {
                return Err(Error::Unauthorized);
            }
            if reviewer == enrollee {
                return Err(Error::InvalidApprover);
            }
        }

        // Must have a pending submission
        let submit_key = DataKey::PendingSubmission(quest_id, milestone_id, enrollee.clone());
        let snapshot: PendingSubmissionSnapshot = env
            .storage()
            .persistent()
            .get(&submit_key)
            .ok_or(Error::NotSubmitted)?;

        // Clean up pending submission and peer approvers
        env.storage().persistent().remove(&submit_key);
        let approvers_key = DataKey::Approvers(quest_id, milestone_id, enrollee.clone());
        let approvers: Vec<Address> = env
            .storage()
            .persistent()
            .get(&approvers_key)
            .unwrap_or_else(|| Vec::new(&env));
        for approver in approvers.iter() {
            let p_key = DataKey::PeerApproval(quest_id, milestone_id, enrollee.clone(), approver);
            env.storage().persistent().remove(&p_key);
        }
        env.storage().persistent().remove(&approvers_key);
        let count_key = DataKey::ApprovalCount(quest_id, milestone_id, enrollee.clone());
        env.storage().persistent().remove(&count_key);

        // Decrement reserved reward
        let reserved_key = DataKey::TotalReservedReward(quest_id);
        let current_reserved: i128 = env.storage().persistent().get(&reserved_key).unwrap_or(0);
        let new_reserved = current_reserved.saturating_sub(snapshot.reward_amount);
        env.storage().persistent().set(&reserved_key, &new_reserved);
        env.storage()
            .persistent()
            .extend_ttl(&reserved_key, THRESHOLD, BUMP);

        // Record feedback
        Self::record_feedback(
            &env,
            quest_id,
            milestone_id,
            &enrollee,
            &reviewer,
            FeedbackAction::Reject,
            feedback,
        )?;
        Ok(())
    }

    /// Request changes on a pending milestone submission with written feedback.
    /// Can be called by quest owner or enrolled peer reviewers.
    pub fn request_changes_with_feedback(
        env: Env,
        reviewer: Address,
        quest_id: u32,
        milestone_id: u32,
        enrollee: Address,
        feedback: String,
    ) -> Result<(), Error> {
        reviewer.require_auth();
        Self::require_not_paused(&env)?;

        let quest_contract_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::QuestContract)
            .ok_or(Error::NotInitialized)?;
        let quest_client = QuestClient::new(&env, &quest_contract_addr);
        let quest_info = quest_client.get_quest(&quest_id);

        let is_owner = quest_info.owner == reviewer;
        if !is_owner {
            if !Self::is_enrolled(&env, quest_id, &reviewer)? {
                return Err(Error::Unauthorized);
            }
            if reviewer == enrollee {
                return Err(Error::InvalidApprover);
            }
        }

        // Must have pending submission
        let submit_key = DataKey::PendingSubmission(quest_id, milestone_id, enrollee.clone());
        let snapshot: PendingSubmissionSnapshot = env
            .storage()
            .persistent()
            .get(&submit_key)
            .ok_or(Error::NotSubmitted)?;

        // Remove pending submission so enrollee can revise and resubmit
        env.storage().persistent().remove(&submit_key);
        let approvers_key = DataKey::Approvers(quest_id, milestone_id, enrollee.clone());
        let approvers: Vec<Address> = env
            .storage()
            .persistent()
            .get(&approvers_key)
            .unwrap_or_else(|| Vec::new(&env));
        for approver in approvers.iter() {
            let p_key = DataKey::PeerApproval(quest_id, milestone_id, enrollee.clone(), approver);
            env.storage().persistent().remove(&p_key);
        }
        env.storage().persistent().remove(&approvers_key);
        let count_key = DataKey::ApprovalCount(quest_id, milestone_id, enrollee.clone());
        env.storage().persistent().remove(&count_key);

        // Decrement reserved reward
        let reserved_key = DataKey::TotalReservedReward(quest_id);
        let current_reserved: i128 = env.storage().persistent().get(&reserved_key).unwrap_or(0);
        let new_reserved = current_reserved.saturating_sub(snapshot.reward_amount);
        env.storage().persistent().set(&reserved_key, &new_reserved);
        env.storage()
            .persistent()
            .extend_ttl(&reserved_key, THRESHOLD, BUMP);

        // Record feedback
        Self::record_feedback(
            &env,
            quest_id,
            milestone_id,
            &enrollee,
            &reviewer,
            FeedbackAction::RequestChanges,
            feedback,
        )?;
        Ok(())
    }

    /// Approve milestone completion with written feedback.
    pub fn approve_completion_with_feedback(
        env: Env,
        peer: Address,
        quest_id: u32,
        milestone_id: u32,
        enrollee: Address,
        feedback: String,
    ) -> Result<Option<i128>, Error> {
        let res = Self::approve_completion(
            env.clone(),
            peer.clone(),
            quest_id,
            milestone_id,
            enrollee.clone(),
        )?;
        Self::record_feedback(
            &env,
            quest_id,
            milestone_id,
            &enrollee,
            &peer,
            FeedbackAction::Approve,
            feedback,
        )?;
        Ok(res)
    }

    /// Query full feedback history for a learner's milestone submission.
    pub fn get_milestone_feedback_history(
        env: Env,
        quest_id: u32,
        milestone_id: u32,
        enrollee: Address,
    ) -> Vec<MilestoneFeedback> {
        let key = DataKey::MilestoneFeedbackHistory(quest_id, milestone_id, enrollee);
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Get total number of milestones for a quest
    fn get_quest_milestone_count(env: Env, quest_id: u32) -> Result<u32, Error> {
        let count = env
            .storage()
            .persistent()
            .get(&DataKey::MilestoneCount(quest_id))
            .unwrap_or(0);
        Ok(count)
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
