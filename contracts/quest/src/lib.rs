#![no_std]
#![allow(deprecated)]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec,
};

// Quest contract: the entry point for Lernza.
// An owner creates a quest, enrolls learners, configures a reward token.
// Other contracts (milestone, rewards) reference quest IDs and owners.

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
#[derive(Clone)]
pub enum DataKey {
    NextId,
    Quest(u32),
    Enrollees(u32),
    EnrollmentCap(u32),
    PublicQuests,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct QuestInfo {
    pub id: u32,
    pub owner: Address,
    pub name: String,
    pub description: String,
    pub category: String,
    pub tags: Vec<String>,
    pub token_addr: Address,
    pub created_at: u64,
    pub visibility: Visibility,
    pub status: QuestStatus,
    pub deadline: u64, // Unix timestamp; 0 = no deadline
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
    QuestFull = 6,
    QuestArchived = 7,
}

const BUMP: u32 = 518_400;
const THRESHOLD: u32 = 120_960;
const MAX_QUEST_NAME_LEN: u32 = 64;
const MAX_QUEST_DESCRIPTION_LEN: u32 = 2000;
const MAX_TAGS: u32 = 5;
const MAX_TAG_LEN: u32 = 32;

fn is_blank_ascii(s: &String) -> bool {
    let len = s.len() as usize;
    if len == 0 {
        return true;
    }
    if len > MAX_QUEST_DESCRIPTION_LEN as usize {
        return false;
    }
    let mut buf = [0u8; MAX_QUEST_DESCRIPTION_LEN as usize];
    s.copy_into_slice(&mut buf[..len]);
    for &b in buf[..len].iter() {
        if !matches!(b, b' ' | b'\n' | b'\r' | b'\t') {
            return false;
        }
    }
    true
}

fn is_contract_address(addr: &Address) -> bool {
    let s = addr.to_string();
    if s.len() != 56 {
        return false;
    }
    let mut buf = [0u8; 56];
    s.copy_into_slice(&mut buf);
    buf[0] == b'C'
}

#[contract]
pub struct QuestContract;

#[contractimpl]
impl QuestContract {
    /// Create a new quest. Returns the quest ID.
    #[allow(clippy::too_many_arguments)]
    pub fn create_quest(
        env: Env,
        owner: Address,
        name: String,
        description: String,
        category: String,
        tags: Vec<String>,
        token_addr: Address,
        visibility: Visibility,
    ) -> Result<u32, Error> {
        owner.require_auth();

        if is_blank_ascii(&name) || name.len() > MAX_QUEST_NAME_LEN {
            return Err(Error::InvalidInput);
        }

        if is_blank_ascii(&description) || description.len() > MAX_QUEST_DESCRIPTION_LEN {
            return Err(Error::InvalidInput);
        }

        if !is_contract_address(&token_addr) {
            return Err(Error::InvalidInput);
        }
        Self::validate_tags(&tags)?;

        let id: u32 = env.storage().instance().get(&DataKey::NextId).unwrap_or(0);

        let quest = QuestInfo {
            id,
            owner,
            name,
            description,
            category,
            tags,
            token_addr,
            created_at: env.ledger().timestamp(),
            visibility,
            status: QuestStatus::Active,
            deadline: 0,
        };

        env.storage().persistent().set(&DataKey::Quest(id), &quest);
        env.storage()
            .persistent()
            .set(&DataKey::Enrollees(id), &Vec::<Address>::new(&env));
        env.storage().instance().set(&DataKey::NextId, &(id + 1));

        if visibility == Visibility::Public {
            let mut public_ids: Vec<u32> = env
                .storage()
                .instance()
                .get(&DataKey::PublicQuests)
                .unwrap_or(Vec::new(&env));
            public_ids.push_back(id);
            env.storage()
                .instance()
                .set(&DataKey::PublicQuests, &public_ids);
        }
        // Emit quest creation event
        // Event topics: (quest, created)
        // Event data: (quest_id, owner, category)
        env.events().publish(
            (symbol_short!("quest"), symbol_short!("new")),
            (id, quest.owner, quest.category),
        );

        Self::bump(&env, id);
        Ok(id)
    }

    /// Update quest details. Owner only. Quest must be active.
    #[allow(clippy::too_many_arguments)]
    pub fn update_quest(
        env: Env,
        quest_id: u32,
        name: String,
        description: String,
        category: String,
        tags: Vec<String>,
        visibility: Visibility,
    ) -> Result<(), Error> {
        let mut quest = Self::load_quest(&env, quest_id)?;
        quest.owner.require_auth();

        if quest.status == QuestStatus::Archived {
            return Err(Error::QuestArchived);
        }

        Self::validate_tags(&tags)?;

        quest.name = name;
        quest.description = description;
        quest.category = category;
        quest.tags = tags;
        quest.visibility = visibility;

        env.storage()
            .persistent()
            .set(&DataKey::Quest(quest_id), &quest);

        // Emit quest updated event
        // Event topics: (quest, updated)
        // Event data: (quest_id)
        env.events()
            .publish((symbol_short!("quest"), symbol_short!("updated")), quest_id);

        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Archive a quest. Owner only. Archived quests do not accept new enrollments.
    pub fn archive_quest(env: Env, quest_id: u32) -> Result<(), Error> {
        let mut quest = Self::load_quest(&env, quest_id)?;
        quest.owner.require_auth();

        quest.status = QuestStatus::Archived;

        env.storage()
            .persistent()
            .set(&DataKey::Quest(quest_id), &quest);

        // Emit quest archived event
        // Event topics: (quest, archived)
        // Event data: (quest_id)
        env.events().publish(
            (symbol_short!("quest"), symbol_short!("archived")),
            quest_id,
        );

        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Add an enrollee to a quest. Owner only.
    pub fn add_enrollee(env: Env, quest_id: u32, enrollee: Address) -> Result<(), Error> {
        let quest = Self::load_quest(&env, quest_id)?;
        quest.owner.require_auth();

        if quest.status == QuestStatus::Archived {
            return Err(Error::QuestArchived);
        }

        let enrollees = Self::load_enrollees(&env, quest_id);

        // Check enrollment cap
        if let Some(cap) = env
            .storage()
            .persistent()
            .get::<_, u32>(&DataKey::EnrollmentCap(quest_id))
        {
            if enrollees.len() >= cap {
                return Err(Error::QuestFull);
            }
        }

        // Check not already enrolled
        if enrollees.contains(&enrollee) {
            return Err(Error::AlreadyEnrolled);
        }

        let mut new_enrollees = enrollees;
        new_enrollees.push_back(enrollee.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Enrollees(quest_id), &new_enrollees);

        // Emit enrollee added event
        // Event topics: (quest, enrollee_added)
        // Event data: (quest_id, enrollee_address)
        env.events().publish(
            (symbol_short!("quest"), symbol_short!("add_enr")),
            (quest_id, &enrollee),
        );

        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Remove an enrollee from a quest. Owner only.
    pub fn remove_enrollee(env: Env, quest_id: u32, enrollee: Address) -> Result<(), Error> {
        let quest = Self::load_quest(&env, quest_id)?;
        quest.owner.require_auth();

        Self::internal_remove_enrollee(&env, quest_id, enrollee.clone())?;

        // Emit enrollee removed event
        // Event topics: (quest, enrollee_removed)
        // Event data: (quest_id, enrollee_address)
        env.events().publish(
            (symbol_short!("quest"), symbol_short!("rem_enr")),
            (quest_id, &enrollee),
        );

        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Allow an enrollee to unenroll themselves from a quest. Enrollee only.
    pub fn leave_quest(env: Env, enrollee: Address, quest_id: u32) -> Result<(), Error> {
        enrollee.require_auth();
        Self::load_quest(&env, quest_id)?;
        Self::internal_remove_enrollee(&env, quest_id, enrollee)
    }

    /// Get quest info by ID.
    pub fn get_quest(env: Env, quest_id: u32) -> Result<QuestInfo, Error> {
        let quest = Self::load_quest(&env, quest_id)?;
        Self::bump(&env, quest_id);
        Ok(quest)
    }

    /// Get all enrollees for a quest.
    pub fn get_enrollees(env: Env, quest_id: u32) -> Result<Vec<Address>, Error> {
        Self::load_quest(&env, quest_id)?; // verify exists
        let enrollees = Self::load_enrollees(&env, quest_id);
        Self::bump(&env, quest_id);
        Ok(enrollees)
    }

    /// Check if a user is enrolled in a quest.
    pub fn is_enrollee(env: Env, quest_id: u32, user: Address) -> Result<bool, Error> {
        Self::load_quest(&env, quest_id)?;
        let enrollees = Self::load_enrollees(&env, quest_id);
        Ok(enrollees.contains(&user))
    }

    /// Update or clear the deadline for a quest. Owner only.
    /// Pass 0 to remove the deadline.
    pub fn set_deadline(env: Env, quest_id: u32, deadline: u64) -> Result<(), Error> {
        let mut quest = Self::load_quest(&env, quest_id)?;
        quest.owner.require_auth();
        quest.deadline = deadline;
        env.storage()
            .persistent()
            .set(&DataKey::Quest(quest_id), &quest);
        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Returns true if the quest has a non-zero deadline that has passed.
    pub fn is_expired(env: Env, quest_id: u32) -> Result<bool, Error> {
        let quest = Self::load_quest(&env, quest_id)?;
        if quest.deadline == 0 {
            return Ok(false);
        }
        Ok(env.ledger().timestamp() > quest.deadline)
    }

    /// Get total quest count.
    pub fn get_quest_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::NextId).unwrap_or(0)
    }

    /// Set visibility of a quest. Owner only.
    pub fn set_visibility(env: Env, quest_id: u32, visibility: Visibility) -> Result<(), Error> {
        let mut quest = Self::load_quest(&env, quest_id)?;
        quest.owner.require_auth();

        if quest.visibility != visibility {
            let mut public_ids: Vec<u32> = env
                .storage()
                .instance()
                .get(&DataKey::PublicQuests)
                .unwrap_or(Vec::new(&env));

            if visibility == Visibility::Public {
                public_ids.push_back(quest_id);
            } else {
                if let Some(index) = public_ids.first_index_of(quest_id) {
                    public_ids.remove(index);
                }
            }
            env.storage()
                .instance()
                .set(&DataKey::PublicQuests, &public_ids);
        }

        quest.visibility = visibility;
        env.storage()
            .persistent()
            .set(&DataKey::Quest(quest_id), &quest);
        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Get all public quests (paginated).
    pub fn list_public_quests(env: Env, start: u32, limit: u32) -> Vec<QuestInfo> {
        let public_ids: Vec<u32> = env
            .storage()
            .instance()
            .get(&DataKey::PublicQuests)
            .unwrap_or(Vec::new(&env));
        let mut public_quests = Vec::new(&env);
        let total = public_ids.len();

        if start < total {
            let end = core::cmp::min(start + limit, total);
            for i in start..end {
                if let Some(id) = public_ids.get(i) {
                    if let Ok(quest) = Self::load_quest(&env, id) {
                        public_quests.push_back(quest);
                    }
                }
            }
        }

        env.storage().instance().extend_ttl(THRESHOLD, BUMP);
        public_quests
    }

    /// Get all public quests within a category.
    pub fn get_quests_by_category(env: Env, category: String) -> Vec<QuestInfo> {
        let public_ids: Vec<u32> = env
            .storage()
            .instance()
            .get(&DataKey::PublicQuests)
            .unwrap_or(Vec::new(&env));
        let mut matches = Vec::new(&env);

        for i in 0..public_ids.len() {
            if let Some(id) = public_ids.get(i) {
                if let Ok(quest) = Self::load_quest(&env, id) {
                    if quest.category == category {
                        matches.push_back(quest);
                    }
                }
            }
        }

        env.storage().instance().extend_ttl(THRESHOLD, BUMP);
        matches
    }

    /// Get enrollment cap for a quest.
    pub fn get_enrollment_cap(env: Env, quest_id: u32) -> Option<u32> {
        Self::load_quest(&env, quest_id).ok()?;
        env.storage()
            .persistent()
            .get(&DataKey::EnrollmentCap(quest_id))
    }

    // --- internals ---

    fn load_quest(env: &Env, id: u32) -> Result<QuestInfo, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Quest(id))
            .ok_or(Error::NotFound)
    }

    fn load_enrollees(env: &Env, id: u32) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::Enrollees(id))
            .unwrap_or(Vec::new(env))
    }

    fn internal_remove_enrollee(env: &Env, quest_id: u32, enrollee: Address) -> Result<(), Error> {
        let enrollees = Self::load_enrollees(env, quest_id);
        let mut found = false;
        let mut new_list = Vec::new(env);

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
            .set(&DataKey::Enrollees(quest_id), &new_list);
        Ok(())
    }

    fn validate_tags(tags: &Vec<String>) -> Result<(), Error> {
        if tags.len() > MAX_TAGS {
            return Err(Error::InvalidInput);
        }

        for i in 0..tags.len() {
            let tag = tags.get(i).ok_or(Error::InvalidInput)?;
            if tag.is_empty() || tag.len() > MAX_TAG_LEN {
                return Err(Error::InvalidInput);
            }
        }

        Ok(())
    }

    fn bump(env: &Env, quest_id: u32) {
        env.storage().instance().extend_ttl(THRESHOLD, BUMP);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Quest(quest_id), THRESHOLD, BUMP);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Enrollees(quest_id), THRESHOLD, BUMP);
        if env
            .storage()
            .persistent()
            .has(&DataKey::EnrollmentCap(quest_id))
        {
            env.storage().persistent().extend_ttl(
                &DataKey::EnrollmentCap(quest_id),
                THRESHOLD,
                BUMP,
            );
        }
    }
}

mod test;
