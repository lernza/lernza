#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, String, Vec};

// Milestone contract: define milestones per workspace, track completions.
// Owner-approved verification for MVP. When owner verifies a completion,
// the frontend triggers the rewards contract to distribute tokens.
//
// Auth model: The workspace owner is stored per-workspace the first time
// a milestone is created. Only that owner can create milestones or verify.

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    // Owner of a workspace (cached for auth, set on first milestone creation)
    Owner(u32),
    // Auto-incrementing milestone ID per workspace
    NextMilestoneId(u32),
    // Milestone data
    Milestone(u32, u32), // (workspace_id, milestone_id)
    // Completion flag
    Completed(u32, u32, Address), // (workspace_id, milestone_id, enrollee)
    // Count of completions per enrollee per workspace
    EnrolleeCompletions(u32, Address),
    // Distribution mode per workspace
    Mode(u32),
    // Flat reward per milestone (Flat mode only)
    FlatReward(u32),
    // Total unique completions per milestone (Competitive mode)
    MilestoneCompletionCount(u32, u32), // (workspace_id, milestone_id)
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
    pub workspace_id: u32,
    pub title: String,
    pub description: String,
    pub reward_amount: i128,
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
}

const BUMP: u32 = 518_400;
const THRESHOLD: u32 = 120_960;

#[contract]
pub struct MilestoneContract;

#[contractimpl]
impl MilestoneContract {
    /// Create a milestone for a workspace. Owner auth required.
    /// On first call for a workspace, records the owner for future auth.
    pub fn create_milestone(
        env: Env,
        owner: Address,
        workspace_id: u32,
        title: String,
        description: String,
        reward_amount: i128,
    ) -> Result<u32, Error> {
        owner.require_auth();

        if reward_amount < 0 {
            return Err(Error::InvalidAmount);
        }

        // Set or verify workspace owner
        let owner_key = DataKey::Owner(workspace_id);
        if let Some(stored_owner) = env.storage().persistent().get::<_, Address>(&owner_key) {
            if stored_owner != owner {
                return Err(Error::OwnerMismatch);
            }
        } else {
            env.storage().persistent().set(&owner_key, &owner);
            env.storage()
                .persistent()
                .extend_ttl(&owner_key, THRESHOLD, BUMP);
        }

        let next_key = DataKey::NextMilestoneId(workspace_id);
        let id: u32 = env.storage().persistent().get(&next_key).unwrap_or(0);

        let milestone = MilestoneInfo {
            id,
            workspace_id,
            title,
            description,
            reward_amount,
        };

        let ms_key = DataKey::Milestone(workspace_id, id);
        env.storage().persistent().set(&ms_key, &milestone);
        env.storage().persistent().set(&next_key, &(id + 1));

        Self::bump_ms(&env, &ms_key);
        Self::bump_ms(&env, &next_key);
        env.storage().instance().extend_ttl(THRESHOLD, BUMP);
        Ok(id)
    }

    /// Set the reward distribution mode for a workspace. Owner only.
    /// For Flat mode, flat_reward is the equal reward paid per milestone (must be > 0).
    /// For Custom and Competitive modes, flat_reward is ignored (pass 0).
    pub fn set_distribution_mode(
        env: Env,
        owner: Address,
        workspace_id: u32,
        mode: DistributionMode,
        flat_reward: i128,
    ) -> Result<(), Error> {
        owner.require_auth();
        Self::require_owner(&env, workspace_id, &owner)?;

        if matches!(mode, DistributionMode::Flat) && flat_reward <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mode_key = DataKey::Mode(workspace_id);
        env.storage().persistent().set(&mode_key, &mode);
        env.storage()
            .persistent()
            .extend_ttl(&mode_key, THRESHOLD, BUMP);

        if matches!(mode, DistributionMode::Flat) {
            let flat_key = DataKey::FlatReward(workspace_id);
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
        workspace_id: u32,
        milestone_id: u32,
        enrollee: Address,
    ) -> Result<i128, Error> {
        owner.require_auth();
        Self::require_owner(&env, workspace_id, &owner)?;

        let ms_key = DataKey::Milestone(workspace_id, milestone_id);
        let milestone: MilestoneInfo = env
            .storage()
            .persistent()
            .get(&ms_key)
            .ok_or(Error::NotFound)?;

        let comp_key = DataKey::Completed(workspace_id, milestone_id, enrollee.clone());
        if env.storage().persistent().has(&comp_key) {
            return Err(Error::AlreadyCompleted);
        }

        // Determine reward based on distribution mode
        let mode: DistributionMode = env
            .storage()
            .persistent()
            .get(&DataKey::Mode(workspace_id))
            .unwrap_or(DistributionMode::Custom);

        let reward = match mode {
            DistributionMode::Custom => milestone.reward_amount,
            DistributionMode::Flat => env
                .storage()
                .persistent()
                .get(&DataKey::FlatReward(workspace_id))
                .unwrap_or(milestone.reward_amount),
            DistributionMode::Competitive(max_winners) => {
                let cnt_key = DataKey::MilestoneCompletionCount(workspace_id, milestone_id);
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

        // Increment enrollee's completion count for this workspace
        let count_key = DataKey::EnrolleeCompletions(workspace_id, enrollee);
        let count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        env.storage().persistent().set(&count_key, &(count + 1));
        env.storage()
            .persistent()
            .extend_ttl(&count_key, THRESHOLD, BUMP);

        Ok(reward)
    }

    /// Get a specific milestone.
    pub fn get_milestone(
        env: Env,
        workspace_id: u32,
        milestone_id: u32,
    ) -> Result<MilestoneInfo, Error> {
        let ms_key = DataKey::Milestone(workspace_id, milestone_id);
        env.storage()
            .persistent()
            .get(&ms_key)
            .ok_or(Error::NotFound)
    }

    /// Get all milestones for a workspace.
    pub fn get_milestones(env: Env, workspace_id: u32) -> Vec<MilestoneInfo> {
        let count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::NextMilestoneId(workspace_id))
            .unwrap_or(0);

        let mut result = Vec::new(&env);
        for i in 0..count {
            if let Some(ms) = env
                .storage()
                .persistent()
                .get::<_, MilestoneInfo>(&DataKey::Milestone(workspace_id, i))
            {
                result.push_back(ms);
            }
        }
        result
    }

    /// Get milestone count for a workspace.
    pub fn get_milestone_count(env: Env, workspace_id: u32) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::NextMilestoneId(workspace_id))
            .unwrap_or(0)
    }

    /// Check if an enrollee has completed a milestone.
    pub fn is_completed(env: Env, workspace_id: u32, milestone_id: u32, enrollee: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Completed(workspace_id, milestone_id, enrollee))
    }

    /// Get total completions for an enrollee in a workspace.
    pub fn get_enrollee_completions(env: Env, workspace_id: u32, enrollee: Address) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::EnrolleeCompletions(workspace_id, enrollee))
            .unwrap_or(0)
    }

    // --- internals ---

    fn require_owner(env: &Env, workspace_id: u32, caller: &Address) -> Result<(), Error> {
        let stored: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Owner(workspace_id))
            .ok_or(Error::NotFound)?;
        if stored != *caller {
            return Err(Error::Unauthorized);
        }
        Ok(())
    }

    fn bump_ms(env: &Env, key: &DataKey) {
        env.storage().persistent().extend_ttl(key, THRESHOLD, BUMP);
    }
}

mod test;
