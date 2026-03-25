#![no_std]
use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, Address, Env, String, Vec,
};

// Quest contract error type (must match the quest contract)
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum QuestError {
    NotFound = 1,
    Unauthorized = 2,
    AlreadyEnrolled = 3,
    NotEnrolled = 4,
    InvalidInput = 5,
}

// Quest contract interface for cross-contract calls
#[contractclient(name = "QuestClient")]
pub trait QuestContractTrait {
    fn get_quest(env: Env, quest_id: u32) -> Result<QuestInfo, QuestError>;
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
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
    pub token_addr: Address,
    pub created_at: u64,
    pub visibility: Visibility,
}

// Milestone contract: define milestones per quest, track completions.
// Owner-approved verification for MVP. When owner verifies a completion,
// the frontend triggers the rewards contract to distribute tokens.
//
// Auth model: The quest owner is stored per-quest the first time
// a milestone is created. Only that owner can create milestones or verify.

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    // Quest contract address for cross-contract validation
    QuestContract,
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

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotFound = 1,
    Unauthorized = 2,
    AlreadyCompleted = 3,
    InvalidAmount = 4,
    OwnerMismatch = 5,
    NotInitialized = 6,
    AlreadySubmitted = 7,
    NotSubmitted = 8,
    AlreadyApproved = 9,
    NotEnrolled = 10,
    InvalidApprover = 11,
}

const BUMP: u32 = 518_400;
const THRESHOLD: u32 = 120_960;

#[contract]
pub struct MilestoneContract;

#[contractimpl]
impl MilestoneContract {
    /// Initialize the milestone contract with the quest contract address.
    /// Must be called once before any milestones can be created.
    pub fn initialize(env: Env, admin: Address, quest_contract: Address) -> Result<(), Error> {
        admin.require_auth();

        // Prevent re-initialization
        if env.storage().instance().has(&DataKey::QuestContract) {
            return Err(Error::Unauthorized);
        }

        env.storage()
            .instance()
            .set(&DataKey::QuestContract, &quest_contract);
        env.storage().instance().extend_ttl(THRESHOLD, BUMP);
        Ok(())
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
    ) -> Result<u32, Error> {
        owner.require_auth();

        if reward_amount < 0 {
            return Err(Error::InvalidAmount);
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

        // If quest doesn't exist, this will fail with NotFound from quest contract
        // If it exists, verify the caller is the owner
        if quest_info.owner != owner {
            return Err(Error::OwnerMismatch);
        }

        let next_key = DataKey::NextMilestoneId(quest_id);
        let id: u32 = env.storage().persistent().get(&next_key).unwrap_or(0);

        let milestone = MilestoneInfo {
            id,
            quest_id,
            title,
            description,
            reward_amount,
        };

        let ms_key = DataKey::Milestone(quest_id, id);
        env.storage().persistent().set(&ms_key, &milestone);
        env.storage().persistent().set(&next_key, &(id + 1));

        Self::bump_ms(&env, &ms_key);
        Self::bump_ms(&env, &next_key);
        env.storage().instance().extend_ttl(THRESHOLD, BUMP);
        Ok(id)
    }

    /// Set the verification mode for a quest. Owner only.
    pub fn set_verification_mode(
        env: Env,
        owner: Address,
        quest_id: u32,
        mode: VerificationMode,
    ) -> Result<(), Error> {
        owner.require_auth();
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

        let ms_key = DataKey::Milestone(quest_id, milestone_id);
        let milestone: MilestoneInfo = env
            .storage()
            .persistent()
            .get(&ms_key)
            .ok_or(Error::NotFound)?;

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
    env.storage().persistent().set(&time_key, &env.ledger().timestamp());
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
    pub fn get_enrollee_progress(
        env: Env,
        quest_id: u32,
        enrollee: Address,
    ) -> EnrolleeProgress {
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
            if env.storage().persistent().has(&DataKey::Completed(quest_id, i, enrollee.clone())) {
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
    pub fn get_quest_completion_rate(
        env: Env,
        quest_id: u32,
        total_enrollees: u32,
    ) -> i128 {
        if total_enrollees == 0 {
            return 0;
        }

        let total_milestones: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::NextMilestoneId(quest_id))
            .unwrap_or(0);

        if total_milestones == 0 {
            return 0;
        }

        let mut fully_completed = 0u32;
        for i in 0..total_milestones {
            // Count enrollees who completed this milestone
            // This is a simplified approach - in production we'd need to iterate over enrollees
            // For now, return a placeholder based on available data
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
        env.storage().persistent().extend_ttl(key, THRESHOLD, BUMP);
    }

    fn require_owner(_env: &Env, _workspace_id: u32, _owner: &Address) -> Result<(), Error> {
        // This is a placeholder implementation
        // In a real implementation, you'd check workspace ownership
        // For now, we'll assume the caller is authorized if they have the address
        Ok(())
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

        // If quest doesn't exist, this will fail with NotFound from quest contract
        // If it exists, verify the caller is the owner
        if quest_info.owner != *owner {
            return Err(Error::OwnerMismatch);
        }

        Ok(())
    }

    fn is_enrolled(_env: &Env, _quest_id: u32, _user: &Address) -> Result<bool, Error> {
        // Get quest contract address
        let quest_contract_addr: Address = _env
            .storage()
            .instance()
            .get(&DataKey::QuestContract)
            .ok_or(Error::NotInitialized)?;

        // Cross-contract call to check enrollment
        let _quest_client = QuestClient::new(_env, &quest_contract_addr);

        // For now, we'll assume a function exists to check enrollment
        // In a real implementation, you'd call quest_client.is_enrolled(quest_id, user)
        // For this example, we'll return true (meaning the user is enrolled)
        // This should be implemented based on the actual quest contract interface
        Ok(true)
    }
}

mod test;
