#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Address, Env, String, Vec};

// Workspace contract: the entry point for Lernza.
// An owner creates a workspace, enrolls learners, configures a reward token.
// Other contracts (milestone, rewards) reference workspace IDs and owners.

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    NextId,
    Workspace(u32),
    Enrollees(u32),
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct WorkspaceInfo {
    pub id: u32,
    pub owner: Address,
    pub name: String,
    pub description: String,
    pub token_addr: Address,
    pub created_at: u64,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotFound = 1,
    Unauthorized = 2,
    AlreadyEnrolled = 3,
    NotEnrolled = 4,
    InvalidInput = 5,
}

const BUMP: u32 = 518_400;
const THRESHOLD: u32 = 120_960;

#[contract]
pub struct WorkspaceContract;

#[contractimpl]
impl WorkspaceContract {
    /// Create a new workspace. Returns the workspace ID.
    pub fn create_workspace(
        env: Env,
        owner: Address,
        name: String,
        description: String,
        token_addr: Address,
    ) -> Result<u32, Error> {
        owner.require_auth();

        let id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(0);

        let ws = WorkspaceInfo {
            id,
            owner: owner.clone(),
            name,
            description,
            token_addr,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&DataKey::Workspace(id), &ws);
        env.storage()
            .persistent()
            .set(&DataKey::Enrollees(id), &Vec::<Address>::new(&env));
        env.storage().instance().set(&DataKey::NextId, &(id + 1));

        Self::bump(&env, id);
        Ok(id)
    }

    /// Add an enrollee to a workspace. Owner only.
    pub fn add_enrollee(
        env: Env,
        workspace_id: u32,
        enrollee: Address,
    ) -> Result<(), Error> {
        let ws = Self::load_workspace(&env, workspace_id)?;
        ws.owner.require_auth();

        let mut enrollees = Self::load_enrollees(&env, workspace_id);

        // Check not already enrolled
        for i in 0..enrollees.len() {
            if enrollees.get(i).unwrap() == enrollee {
                return Err(Error::AlreadyEnrolled);
            }
        }

        enrollees.push_back(enrollee);
        env.storage()
            .persistent()
            .set(&DataKey::Enrollees(workspace_id), &enrollees);
        Self::bump(&env, workspace_id);
        Ok(())
    }

    /// Remove an enrollee from a workspace. Owner only.
    pub fn remove_enrollee(
        env: Env,
        workspace_id: u32,
        enrollee: Address,
    ) -> Result<(), Error> {
        let ws = Self::load_workspace(&env, workspace_id)?;
        ws.owner.require_auth();

        let enrollees = Self::load_enrollees(&env, workspace_id);
        let mut found = false;
        let mut new_list = Vec::new(&env);

        for i in 0..enrollees.len() {
            let addr = enrollees.get(i).unwrap();
            if addr == enrollee {
                found = true;
            } else {
                new_list.push_back(addr);
            }
        }

        if !found {
            return Err(Error::NotEnrolled);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Enrollees(workspace_id), &new_list);
        Self::bump(&env, workspace_id);
        Ok(())
    }

    /// Get workspace info by ID.
    pub fn get_workspace(env: Env, workspace_id: u32) -> Result<WorkspaceInfo, Error> {
        let ws = Self::load_workspace(&env, workspace_id)?;
        Self::bump(&env, workspace_id);
        Ok(ws)
    }

    /// Get all enrollees for a workspace.
    pub fn get_enrollees(env: Env, workspace_id: u32) -> Result<Vec<Address>, Error> {
        Self::load_workspace(&env, workspace_id)?; // verify exists
        let enrollees = Self::load_enrollees(&env, workspace_id);
        Self::bump(&env, workspace_id);
        Ok(enrollees)
    }

    /// Check if a user is enrolled in a workspace.
    pub fn is_enrollee(env: Env, workspace_id: u32, user: Address) -> Result<bool, Error> {
        Self::load_workspace(&env, workspace_id)?;
        let enrollees = Self::load_enrollees(&env, workspace_id);
        for i in 0..enrollees.len() {
            if enrollees.get(i).unwrap() == user {
                return Ok(true);
            }
        }
        Ok(false)
    }

    /// Get total workspace count.
    pub fn get_workspace_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(0)
    }

    // --- internals ---

    fn load_workspace(env: &Env, id: u32) -> Result<WorkspaceInfo, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Workspace(id))
            .ok_or(Error::NotFound)
    }

    fn load_enrollees(env: &Env, id: u32) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::Enrollees(id))
            .unwrap_or(Vec::new(env))
    }

    fn bump(env: &Env, workspace_id: u32) {
        env.storage()
            .instance()
            .extend_ttl(THRESHOLD, BUMP);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Workspace(workspace_id), THRESHOLD, BUMP);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Enrollees(workspace_id), THRESHOLD, BUMP);
    }
}

mod test;
