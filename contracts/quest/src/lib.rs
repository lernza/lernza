#![no_std]
use common::{
    extend_instance_ttl, is_contract_address, QuestInfo, QuestStatus, Visibility, BUMP, THRESHOLD,
};
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, Bytes, BytesN, Env, String,
    Symbol, Vec,
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
    /// Registered invite commitment: SHA-256 hash stored by the quest owner.
    /// Key: (quest_id, commitment_hash). Value: true.
    InviteCommitment(u32, BytesN<32>),
    /// Consumed invite: set after a preimage is successfully redeemed.
    /// Key: (quest_id, commitment_hash). Value: true.
    InviteUsed(u32, BytesN<32>),
    /// Peer-review hold placed by the quest owner while an enrollee has an
    /// in-flight peer-review submission or recently verified completion.
    /// While set, `leave_quest` is rejected so the submission record never
    /// ends up pointing at a non-enrollee. Key: (quest_id, enrollee).
    LeaveHold(u32, Address),
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
    Reserved5 = 5, // reserved for stable ABI; do not reuse
    NotEnrolled = 6,
    QuestFull = 7,
    QuestArchived = 8,
    NameTooLong = 9,
    DescriptionTooLong = 10,
    InviteOnly = 11,
    /// `leave_quest` was rejected because the enrollee has a peer-review
    /// hold in place. The hold must be lifted by the quest owner once the
    /// outstanding submission(s) settle.
    LeaveBlockedByPendingApproval = 12,
    /// Enrollment is closed because the quest has been archived.
    EnrollmentClosed = 13,
    /// Enrollment is rejected because the quest deadline has passed.
    DeadlineExpired = 14,
    /// The invite preimage does not match any registered commitment.
    InvalidInvite = 15,
    /// The invite code has already been redeemed.
    InviteAlreadyUsed = 16,
    /// Contract is administratively paused; all mutating calls are rejected.
    /// System band: code 400 is identical across all Lernza contracts.
    Paused = 400,
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

// IsDataKey implementation — restricts TTL extension to Quest DataKey only
impl common::IsDataKey for DataKey {}

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
        common::extend_persistent_ttl(&env, &DataKey::VerifiedCreator(creator.clone()));
        extend_instance_ttl(&env);

        // Emit creator verification event for auditability
        let ts = env.ledger().timestamp();
        env.events().publish(
            (Symbol::new(&env, "creator_verified"),),
            (creator, admin, ts),
        );

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

    /// Revoke a creator's verification. Admin only.
    ///
    /// Removes the verification entry from storage entirely. This operation
    /// is idempotent: calling it on a non-verified address still succeeds.
    /// Emits an event for auditability.
    pub fn revoke_creator_verification(
        env: Env,
        admin: Address,
        addr: Address,
    ) -> Result<(), Error> {
        Self::require_admin(&env, &admin)?;
        Self::require_not_paused(&env)?;

        let key = DataKey::VerifiedCreator(addr.clone());
        // Remove entry if present; idempotent.
        if env.storage().persistent().has(&key) {
            env.storage().persistent().remove(&key);
        }

        extend_instance_ttl(&env);

        // Emit revocation event: (addr, revoked_by, timestamp)
        let ts = env.ledger().timestamp();
        env.events().publish(
            (Symbol::new(&env, "creator_verification_revoked"),),
            (addr, admin, ts),
        );

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
            return Err(Error::EnrollmentClosed);
        }
        if quest.deadline > 0 && env.ledger().timestamp() > quest.deadline {
            return Err(Error::DeadlineExpired);
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
        // Event data: (quest_id, enrollee, actor, timestamp, join_mode)
        let timestamp = env.ledger().timestamp();
        let join_mode = Symbol::new(&env, "owner");
        env.events().publish(
            (Symbol::new(&env, "enrollee_added"),),
            (quest_id, enrollee.clone(), quest.owner.clone(), timestamp, join_mode),
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
            return Err(Error::EnrollmentClosed);
        }
        if quest.deadline > 0 && env.ledger().timestamp() > quest.deadline {
            return Err(Error::DeadlineExpired);
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

        // Emit enrollment event with distinct join_mode for self-enrollment
        let timestamp = env.ledger().timestamp();
        let join_mode = Symbol::new(&env, "self");  // FIXED: use "self" instead of "owner"
        env.events().publish(
            (Symbol::new(&env, "enrollee_added"),),
            (quest_id, enrollee.clone(), quest.owner.clone(), timestamp, join_mode),
        );

        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Register an invite commitment for a private quest. Owner only.
    ///
    /// The owner generates a random secret off-chain, computes
    /// `commitment = SHA-256(preimage)`, and stores the commitment here.
    /// The raw preimage is shared with the intended enrollee (e.g. via a
    /// signed link). The contract never sees the preimage until redemption,
    /// so the invite cannot be front-run by observers of the ledger.
    ///
    /// Multiple commitments can be registered for the same quest; each is
    /// single-use. Registering the same commitment twice is a no-op (idempotent).
    pub fn register_invite(
        env: Env,
        owner: Address,
        quest_id: u32,
        commitment: BytesN<32>,
    ) -> Result<(), Error> {
        owner.require_auth();
        Self::require_not_paused(&env)?;
        let quest = Self::load_quest(&env, quest_id)?;
        if quest.owner != owner {
            return Err(Error::Unauthorized);
        }
        if quest.status == QuestStatus::Archived {
            return Err(Error::EnrollmentClosed);
        }
        let key = DataKey::InviteCommitment(quest_id, commitment.clone());
        env.storage().persistent().set(&key, &true);
        common::extend_persistent_ttl(&env, &key);
        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Revoke a previously registered invite commitment. Owner only.
    ///
    /// Removes the commitment so the corresponding preimage can no longer be
    /// used to enroll. Has no effect if the commitment was never registered or
    /// has already been consumed.
    pub fn revoke_invite(
        env: Env,
        owner: Address,
        quest_id: u32,
        commitment: BytesN<32>,
    ) -> Result<(), Error> {
        owner.require_auth();
        Self::require_not_paused(&env)?;
        let quest = Self::load_quest(&env, quest_id)?;
        if quest.owner != owner {
            return Err(Error::Unauthorized);
        }
        let key = DataKey::InviteCommitment(quest_id, commitment);
        env.storage().persistent().remove(&key);
        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Check whether an invite commitment is registered and not yet consumed.
    pub fn is_invite_valid(env: Env, quest_id: u32, commitment: BytesN<32>) -> bool {
        let registered = env
            .storage()
            .persistent()
            .get::<_, bool>(&DataKey::InviteCommitment(quest_id, commitment.clone()))
            .unwrap_or(false);
        let used = env
            .storage()
            .persistent()
            .get::<_, bool>(&DataKey::InviteUsed(quest_id, commitment))
            .unwrap_or(false);
        registered && !used
    }

    /// Allow a learner to self-enroll in a private quest using an invite code.
    // (The rest of the contract including invite redemption and other helpers
    //  would follow here, but they are not shown in the provided snippet.)
}
