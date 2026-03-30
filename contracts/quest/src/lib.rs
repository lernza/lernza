// Trigger CI check
#![no_std]
#![allow(deprecated)]
#![allow(clippy::too_many_arguments)]
use common::{
    extend_instance_ttl, is_contract_address, QuestInfo, QuestStatus, Visibility, BUMP, THRESHOLD,
};
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, Env, String, Symbol, Vec,
};

// Quest contract: the entry point for Lernza.
// An owner creates a quest, enrolls learners, configures a reward token.
// Other contracts (milestone, rewards) reference quest IDs and owners.

// Visibility moved to common.

// QuestStatus moved to common.

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    NextId,
    Quest(u32),
    Enrollees(u32),
    PublicQuests,
    PublicCategoryQuests(String),
    OwnerQuests(Address),
    EnrolleeQuests(Address),
    Admin,
    Paused,
    VerifiedCreator(Address),
}

// QuestInfo moved to common.

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotFound = 1,
    Unauthorized = 2,
    InvalidInput = 3,
    AlreadyEnrolled = 4,
    NotEnrolled = 6,
    QuestFull = 7,
    QuestArchived = 8,
    NameTooLong = 9,
    DescriptionTooLong = 10,
    InviteOnly = 11,
    Paused = 12,
}

// TTL constants and address validation moved to common.
pub const MAX_QUEST_NAME_LEN: u32 = 64;
pub const MAX_QUEST_DESCRIPTION_LEN: u32 = 2000;
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

// is_contract_address moved to common.

/// Validate name: not blank, not too long.
fn validate_name(name: &String) -> Result<(), Error> {
    if is_blank_ascii(name) {
        return Err(Error::InvalidInput);
    }
    if name.len() > MAX_QUEST_NAME_LEN {
        return Err(Error::NameTooLong);
    }
    Ok(())
}

/// Validate description: not blank, not too long.
fn validate_description(description: &String) -> Result<(), Error> {
    if is_blank_ascii(description) {
        return Err(Error::InvalidInput);
    }
    if description.len() > MAX_QUEST_DESCRIPTION_LEN {
        return Err(Error::DescriptionTooLong);
    }
    Ok(())
}

#[contract]
pub struct QuestContract;

#[contractimpl]
impl QuestContract {
    /// Initialize the quest contract with an admin.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::Unauthorized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Paused, &false);
        extend_instance_ttl(&env);
        Ok(())
    }

    /// Verify a creator address. Admin only.
    pub fn verify_creator(env: Env, admin: Address, creator: Address) -> Result<(), Error> {
        Self::require_admin(&env, &admin)?;
        Self::require_not_paused(&env)?;

        env.storage()
            .persistent()
            .set(&DataKey::VerifiedCreator(creator.clone()), &true);
        common::extend_persistent_ttl(&env, &DataKey::VerifiedCreator(creator));
        Ok(())
    }

    /// Check if a creator is verified.
    pub fn is_creator_verified(env: Env, creator: Address) -> bool {
        let key = DataKey::VerifiedCreator(creator);
        let is_verified = env.storage().persistent().get(&key).unwrap_or(false);
        if is_verified {
            common::extend_persistent_ttl(&env, &key);
        }
        is_verified
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

    /// Transfer administrative control to a new address. Admin only.
    pub fn transfer_admin(
        env: Env,
        current_admin: Address,
        new_admin: Address,
    ) -> Result<(), Error> {
        Self::require_admin(&env, &current_admin)?;

        env.storage().instance().set(&DataKey::Admin, &new_admin);
        extend_instance_ttl(&env);

        // Emit transfer event
        env.events().publish(
            (Symbol::new(&env, "admin_transferred"),),
            (current_admin, new_admin),
        );

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
        max_enrollees: Option<u32>,
    ) -> Result<u32, Error> {
        owner.require_auth();
        Self::require_not_paused(&env)?;

        // Input validation — happens before any storage reads
        validate_name(&name)?;
        validate_description(&description)?;

        if !is_contract_address(&token_addr) {
            return Err(Error::InvalidInput);
        }
        Self::validate_tags(&tags)?;

        let id: u32 = env.storage().instance().get(&DataKey::NextId).unwrap_or(0);
        let verified = Self::is_creator_verified(env.clone(), owner.clone());

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
            archived_at: 0,
            max_enrollees,
            verified,
        };

        env.storage().persistent().set(&DataKey::Quest(id), &quest);
        env.storage()
            .persistent()
            .set(&DataKey::Enrollees(id), &Vec::<Address>::new(&env));
        env.storage().instance().set(&DataKey::NextId, &(id + 1));
        extend_instance_ttl(&env);

        Self::add_id_to_index(&env, DataKey::OwnerQuests(quest.owner.clone()), id);

        if visibility == Visibility::Public {
            let mut public_ids: Vec<u32> = env
                .storage()
                .persistent()
                .get(&DataKey::PublicQuests)
                .unwrap_or(Vec::new(&env));
            public_ids.push_back(id);
            env.storage()
                .persistent()
                .set(&DataKey::PublicQuests, &public_ids);
            Self::add_id_to_index(
                &env,
                DataKey::PublicCategoryQuests(quest.category.clone()),
                id,
            );
        }
        // Emit quest creation event
        // Event topics: (quest_created,)
        // Event data: (quest_id, owner, name)
        env.events().publish(
            (Symbol::new(&env, "quest_created"),),
            (id, quest.owner.clone(), quest.name.clone()),
        );

        Self::bump(&env, id);
        Ok(id)
    }

    /// Update quest details. Owner only. Quest must be active.
    #[allow(clippy::too_many_arguments)]
    pub fn update_quest(
        env: Env,
        quest_id: u32,
        owner: Address,
        name: Option<String>,
        description: Option<String>,
        category: Option<String>,
        tags: Option<Vec<String>>,
        visibility: Option<Visibility>,
        max_enrollees: Option<u32>,
    ) -> Result<(), Error> {
        owner.require_auth();
        Self::require_not_paused(&env)?;
        let mut quest = Self::load_quest(&env, quest_id)?;

        if quest.owner != owner {
            return Err(Error::Unauthorized);
        }

        if quest.status == QuestStatus::Archived {
            return Err(Error::QuestArchived);
        }

        // Input validation & update
        if let Some(n) = name {
            validate_name(&n)?;
            quest.name = n;
        }

        if let Some(d) = description {
            validate_description(&d)?;
            quest.description = d;
        }

        if let Some(c) = category {
            if is_blank_ascii(&c) {
                return Err(Error::InvalidInput);
            }
            let old_category = quest.category.clone();
            quest.category = c;

            if quest.visibility == Visibility::Public {
                Self::remove_id_from_index(
                    &env,
                    DataKey::PublicCategoryQuests(old_category),
                    quest_id,
                );
                Self::add_id_to_index(
                    &env,
                    DataKey::PublicCategoryQuests(quest.category.clone()),
                    quest_id,
                );
            }
        }

        if let Some(t) = tags {
            Self::validate_tags(&t)?;
            quest.tags = t;
        }

        if let Some(v) = visibility {
            Self::internal_set_visibility(&env, quest_id, &mut quest, v);
        }

        if let Some(m) = max_enrollees {
            quest.max_enrollees = Some(m);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Quest(quest_id), &quest);

        // Emit quest updated event
        // Event topics: (quest_updated,)
        // Event data: (quest_id)
        env.events()
            .publish((Symbol::new(&env, "quest_updated"),), quest_id);

        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Archive a quest. Owner only. Archived quests do not accept new enrollments.
    pub fn archive_quest(env: Env, quest_id: u32) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        let mut quest = Self::load_quest(&env, quest_id)?;
        quest.owner.require_auth();

        quest.status = QuestStatus::Archived;
        quest.archived_at = env.ledger().timestamp();

        env.storage()
            .persistent()
            .set(&DataKey::Quest(quest_id), &quest);

        // Emit quest archived event
        // Event topics: (quest_archived,)
        // Event data: (quest_id)
        env.events()
            .publish((Symbol::new(&env, "quest_archived"),), quest_id);

        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Add an enrollee to a quest. Owner only.
    pub fn add_enrollee(env: Env, quest_id: u32, enrollee: Address) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        let quest = Self::load_quest(&env, quest_id)?;
        quest.owner.require_auth();

        if quest.status == QuestStatus::Archived {
            return Err(Error::QuestArchived);
        }

        let enrollees = Self::load_enrollees(&env, quest_id);

        // Check enrollment cap from quest record
        if let Some(max) = quest.max_enrollees {
            if enrollees.len() >= max {
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
        Self::add_id_to_index(&env, DataKey::EnrolleeQuests(enrollee.clone()), quest_id);

        // Emit enrollee added event
        // Event topics: (enrollee_added,)
        // Event data: (quest_id, enrollee_address)
        env.events().publish(
            (Symbol::new(&env, "enrollee_added"),),
            (quest_id, enrollee.clone()),
        );

        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Allow a learner to enroll themselves in a public quest.
    pub fn join_quest(env: Env, enrollee: Address, quest_id: u32) -> Result<(), Error> {
        enrollee.require_auth();
        Self::require_not_paused(&env)?;

        let quest = Self::load_quest(&env, quest_id)?;
        if quest.status == QuestStatus::Archived {
            return Err(Error::QuestArchived);
        }
        if quest.visibility == Visibility::Private {
            return Err(Error::InviteOnly);
        }

        let enrollees = Self::load_enrollees(&env, quest_id);

        if let Some(max) = quest.max_enrollees {
            if enrollees.len() >= max {
                return Err(Error::QuestFull);
            }
        }

        if enrollees.contains(&enrollee) {
            return Err(Error::AlreadyEnrolled);
        }

        let mut new_enrollees = enrollees;
        new_enrollees.push_back(enrollee.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Enrollees(quest_id), &new_enrollees);
        Self::add_id_to_index(&env, DataKey::EnrolleeQuests(enrollee.clone()), quest_id);

        // Emit enrollment event
        // Event topics: (enrollee_added,)
        // Event data: (quest_id, enrollee_address)
        env.events().publish(
            (Symbol::new(&env, "enrollee_added"),),
            (quest_id, enrollee.clone()),
        );

        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Remove an enrollee from a quest. Owner only.
    pub fn remove_enrollee(env: Env, quest_id: u32, enrollee: Address) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        let quest = Self::load_quest(&env, quest_id)?;
        quest.owner.require_auth();

        Self::internal_remove_enrollee(&env, quest_id, enrollee.clone())?;

        // Emit enrollee removed event
        // Event topics: (enrollee_removed,)
        // Event data: (quest_id, enrollee_address)
        env.events().publish(
            (Symbol::new(&env, "enrollee_removed"),),
            (quest_id, &enrollee),
        );

        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Allow an enrollee to unenroll themselves from a quest. Enrollee only.
    pub fn leave_quest(env: Env, enrollee: Address, quest_id: u32) -> Result<(), Error> {
        enrollee.require_auth();
        Self::require_not_paused(&env)?;
        Self::load_quest(&env, quest_id)?;
        Self::internal_remove_enrollee(&env, quest_id, enrollee)
    }

    /// Get quest info by ID.
    ///
    /// Visibility does not gate direct reads. Even quests marked `Private`
    /// remain queryable by id; the flag only affects discovery helpers such as
    /// `list_public_quests` and `get_quests_by_category`.
    pub fn get_quest(env: Env, quest_id: u32) -> Result<QuestInfo, Error> {
        let quest = Self::load_quest(&env, quest_id)?;
        Self::bump(&env, quest_id);
        Ok(quest)
    }

    /// Get all enrollees for a quest.
    ///
    /// Like `get_quest`, this is readable for any existing quest id regardless
    /// of visibility. `Private` means unlisted, not confidential.
    pub fn get_enrollees(env: Env, quest_id: u32) -> Result<Vec<Address>, Error> {
        Self::load_quest(&env, quest_id)?; // verify exists
        let enrollees = Self::load_enrollees(&env, quest_id);
        Self::bump(&env, quest_id);
        Ok(enrollees)
    }

    /// Check if a user is enrolled in a quest.
    ///
    /// Visibility does not restrict this check; callers that know the quest id
    /// can query enrollment state directly.
    pub fn is_enrollee(env: Env, quest_id: u32, user: Address) -> Result<bool, Error> {
        Self::load_quest(&env, quest_id)?;
        let enrollees = Self::load_enrollees(&env, quest_id);
        Ok(enrollees.contains(&user))
    }

    /// Update or clear the deadline for a quest. Owner only.
    /// Pass 0 to remove the deadline.
    pub fn set_deadline(env: Env, quest_id: u32, deadline: u64) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
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
    ///
    /// This only controls whether the quest appears in public discovery lists.
    /// It does not provide on-chain confidentiality.
    pub fn set_visibility(env: Env, quest_id: u32, visibility: Visibility) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        let mut quest = Self::load_quest(&env, quest_id)?;
        quest.owner.require_auth();

        Self::internal_set_visibility(&env, quest_id, &mut quest, visibility);

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
            .persistent()
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

        if env.storage().persistent().has(&DataKey::PublicQuests) {
            common::extend_persistent_ttl(&env, &DataKey::PublicQuests);
        }
        public_quests
    }

    /// Get all public quests within a category.
    pub fn get_quests_by_category(env: Env, category: String) -> Vec<QuestInfo> {
        let category_ids: Vec<u32> = env
            .storage()
            .persistent()
            .get(&DataKey::PublicCategoryQuests(category.clone()))
            .unwrap_or(Vec::new(&env));
        let mut matches = Vec::new(&env);

        for i in 0..category_ids.len() {
            if let Some(id) = category_ids.get(i) {
                if let Ok(quest) = Self::load_quest(&env, id) {
                    matches.push_back(quest);
                }
            }
        }

        let category_key = DataKey::PublicCategoryQuests(category);
        if env.storage().persistent().has(&category_key) {
            common::extend_persistent_ttl(&env, &category_key);
        }
        matches
    }

    /// Get all quests owned by an address.
    pub fn list_quests_by_owner(env: Env, owner: Address) -> Vec<QuestInfo> {
        let owner_key = DataKey::OwnerQuests(owner);
        let owner_ids: Vec<u32> = env
            .storage()
            .persistent()
            .get(&owner_key)
            .unwrap_or(Vec::new(&env));
        let mut matches = Vec::new(&env);

        for i in 0..owner_ids.len() {
            if let Some(id) = owner_ids.get(i) {
                if let Ok(quest) = Self::load_quest(&env, id) {
                    matches.push_back(quest);
                }
            }
        }

        if env.storage().persistent().has(&owner_key) {
            common::extend_persistent_ttl(&env, &owner_key);
        }
        env.storage().instance().extend_ttl(THRESHOLD, BUMP);
        matches
    }

    /// Get all quests an address is enrolled in.
    pub fn list_quests_by_enrollee(env: Env, enrollee: Address) -> Vec<QuestInfo> {
        let enrollee_key = DataKey::EnrolleeQuests(enrollee);
        let enrollee_ids: Vec<u32> = env
            .storage()
            .persistent()
            .get(&enrollee_key)
            .unwrap_or(Vec::new(&env));
        let mut matches = Vec::new(&env);

        for i in 0..enrollee_ids.len() {
            if let Some(id) = enrollee_ids.get(i) {
                if let Ok(quest) = Self::load_quest(&env, id) {
                    matches.push_back(quest);
                }
            }
        }

        if env.storage().persistent().has(&enrollee_key) {
            common::extend_persistent_ttl(&env, &enrollee_key);
        }
        env.storage().instance().extend_ttl(THRESHOLD, BUMP);
        matches
    }

    /// Get enrollment cap for a quest.
    pub fn get_enrollment_cap(env: Env, quest_id: u32) -> Option<u32> {
        let quest = Self::load_quest(&env, quest_id).ok()?;
        quest.max_enrollees
    }

    // --- internals ---

    fn load_quest(env: &Env, id: u32) -> Result<QuestInfo, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Quest(id))
            .ok_or(Error::NotFound)
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

    fn load_enrollees(env: &Env, id: u32) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::Enrollees(id))
            .unwrap_or(Vec::new(env))
    }

    fn internal_set_visibility(
        env: &Env,
        quest_id: u32,
        quest: &mut QuestInfo,
        visibility: Visibility,
    ) {
        if quest.visibility != visibility {
            if quest.visibility == Visibility::Public {
                Self::remove_id_from_index(
                    env,
                    DataKey::PublicCategoryQuests(quest.category.clone()),
                    quest_id,
                );
            }

            let mut public_ids: Vec<u32> = env
                .storage()
                .persistent()
                .get(&DataKey::PublicQuests)
                .unwrap_or(Vec::new(env));

            if visibility == Visibility::Public {
                public_ids.push_back(quest_id);
            } else if let Some(index) = public_ids.first_index_of(quest_id) {
                public_ids.remove(index);
            }
            env.storage()
                .persistent()
                .set(&DataKey::PublicQuests, &public_ids);

            if visibility == Visibility::Public {
                Self::add_id_to_index(
                    env,
                    DataKey::PublicCategoryQuests(quest.category.clone()),
                    quest_id,
                );
            }
        }
        quest.visibility = visibility;
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
        if found {
            Self::remove_id_from_index(env, DataKey::EnrolleeQuests(enrollee), quest_id);
        }
        Ok(())
    }

    fn add_id_to_index(env: &Env, key: DataKey, id: u32) {
        let mut ids: Vec<u32> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(env));
        if !ids.contains(id) {
            ids.push_back(id);
            env.storage().persistent().set(&key, &ids);
        }
        common::extend_persistent_ttl(env, &key);
    }

    fn remove_id_from_index(env: &Env, key: DataKey, id: u32) {
        let ids: Vec<u32> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(env));
        let mut updated = Vec::new(env);

        for i in 0..ids.len() {
            if let Some(existing_id) = ids.get(i) {
                if existing_id != id {
                    updated.push_back(existing_id);
                }
            }
        }

        env.storage().persistent().set(&key, &updated);
        common::extend_persistent_ttl(env, &key);
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
        extend_instance_ttl(env);
        common::extend_persistent_ttl(env, &DataKey::Quest(quest_id));
        common::extend_persistent_ttl(env, &DataKey::Enrollees(quest_id));
    }
}

#[cfg(test)]
mod test;
