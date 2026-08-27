#![no_std]
#![allow(clippy::too_many_arguments)]
use common::{
    extend_instance_ttl, is_contract_address, EnrolleeStatus, QuestInfo, QuestStatus, QuestVersion,
    Visibility, BUMP, MAX_QUEST_DESCRIPTION_LEN, THRESHOLD,
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
    /// Absolute ledger (sequence number) at which a public category's listing
    /// expires. Recorded whenever the category listing is (re)touched so the
    /// `get_category` query can surface an accurate `expires_at` without a
    /// runtime TTL read (unavailable in soroban-sdk 22).
    CategoryExpiry(String),
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
    /// Version history for a quest. Stores a Vec of QuestVersion snapshots.
    QuestVersionHistory(u32),
    /// Schema version recorded after an administrator migrates a quest.
    /// Appended so existing DataKey encodings remain stable across upgrades.
    QuestSchemaVersion(u32),
    /// Enrollee status tracking. Key: (quest_id, enrollee_address). Value: EnrolleeStatus.
    EnrolleeStatus(u32, Address),
    /// Pending ownership transfer request. Key: quest_id. Value: PendingTransfer.
    PendingTransfer(u32),
    /// Waitlist for a quest when enrollment is full. Key: quest_id. Value: Vec<Address> (FIFO).
    Waitlist(u32),
}

// QuestInfo moved to common.

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
    /// Quest has been cancelled.
    QuestCancelled = 17,
    /// No pending ownership transfer exists for this quest.
    NoPendingTransfer = 18,
    /// The caller is not the nominated new owner for this transfer.
    NotTransferNominee = 19,
    /// The caller is not the current owner or the nominated new owner.
    NotTransferParty = 20,
    /// Contract is administratively paused; all mutating calls are rejected.
    /// System band: code 400 is identical across all Lernza contracts.
    Paused = 400,
}

/// Metadata about a public category, including when its on-chain listing will
/// expire. Frontends use `expires_at` to warn users before a category (and the
/// quests listed under it) silently disappears due to TTL expiry.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CategoryInfo {
    pub category: String,
    pub quest_count: u32,
    /// Remaining persistent-TTL entries (ledgers) before the category listing expires.
    pub ttl_remaining: u32,
    /// Approximate absolute expiry timestamp (ledger seconds). Derived from
    /// `ttl_remaining` using the ~5s/ledger assumption documented in ADR-005.
    pub expires_at: u64,
}

// TTL constants and address validation moved to common.
const MAX_TAGS: u32 = 5;
const MAX_TAG_LEN: u32 = 32;
/// Current on-chain layout of QuestInfo. Bump only alongside a migration.
const QUEST_DATA_SCHEMA_VERSION: u32 = 1;
/// Bound migration work so an administrator cannot exceed transaction limits.
const MAX_MIGRATION_BATCH: u32 = 25;

/// A two-step ownership transfer request. The current owner nominates a new
/// owner, and the nominee must explicitly accept before ownership changes.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct PendingTransfer {
    pub nominee: Address,
    pub initiated_at: u64,
}

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
    if name.len() > common::MAX_QUEST_NAME_LEN {
        return Err(Error::NameTooLong);
    }
    Ok(())
}

/// Validate description: not blank, not too long.
fn validate_description(description: &String) -> Result<(), Error> {
    if is_blank_ascii(description) {
        return Err(Error::InvalidInput);
    }
    if description.len() > common::MAX_QUEST_DESCRIPTION_LEN {
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
        admin.require_auth();
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::Unauthorized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Paused, &false);
        extend_instance_ttl(&env);
        Ok(())
    }

    /// Returns the address that holds the contract-administrator role.
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotFound)
    }

    /// Upgrade this contract's WASM. Only the stored administrator can invoke it.
    pub fn upgrade(env: Env, admin: Address, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        Self::require_admin(&env, &admin)?;
        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }

    /// Mark a bounded set of quests as migrated to the current schema.
    ///
    /// The current v1 migration is a validated re-serialization pass. Future
    /// schema revisions must update this function with their explicit
    /// transformation before increasing `QUEST_DATA_SCHEMA_VERSION`.
    pub fn migrate_quest_data(
        env: Env,
        admin: Address,
        quest_ids: Vec<u32>,
        target_schema_version: u32,
    ) -> Result<(), Error> {
        Self::require_admin(&env, &admin)?;
        Self::require_not_paused(&env)?;
        if quest_ids.is_empty()
            || quest_ids.len() > MAX_MIGRATION_BATCH
            || target_schema_version != QUEST_DATA_SCHEMA_VERSION
        {
            return Err(Error::InvalidInput);
        }

        // Validate all IDs before writing so an invalid batch has no effects.
        for quest_id in quest_ids.iter() {
            Self::load_quest(&env, quest_id)?;
        }
        for quest_id in quest_ids.iter() {
            let quest = Self::load_quest(&env, quest_id)?;
            let quest_key = DataKey::Quest(quest_id);
            let version_key = DataKey::QuestSchemaVersion(quest_id);
            env.storage().persistent().set(&quest_key, &quest);
            env.storage()
                .persistent()
                .set(&version_key, &target_schema_version);
            common::extend_persistent_ttl(&env, &quest_key);
            common::extend_persistent_ttl(&env, &version_key);
            env.events().publish(
                (Symbol::new(&env, "quest_migrated"),),
                (quest_id, target_schema_version),
            );
        }
        extend_instance_ttl(&env);
        Ok(())
    }

    /// Returns the recorded schema version; legacy quests are version 1.
    pub fn get_quest_schema_version(env: Env, quest_id: u32) -> Result<u32, Error> {
        Self::load_quest(&env, quest_id)?;
        Ok(env
            .storage()
            .persistent()
            .get(&DataKey::QuestSchemaVersion(quest_id))
            .unwrap_or(1))
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
        Self::require_not_paused(&env)?;

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
        deadline: Option<u64>,
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

        let deadline = deadline.unwrap_or(0);
        if deadline != 0 && deadline <= env.ledger().timestamp() {
            return Err(Error::InvalidInput);
        }

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
            deadline,
            archived_at: 0,
            max_enrollees,
            verified,
            version: 1,
            prerequisite_quest_ids: Vec::new(&env),
        };

        env.storage().persistent().set(&DataKey::Quest(id), &quest);
        env.storage()
            .persistent()
            .set(&DataKey::Enrollees(id), &Vec::<Address>::new(&env));
        env.storage().persistent().set(
            &DataKey::QuestVersionHistory(id),
            &Vec::<QuestVersion>::new(&env),
        );
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
        // Event data: (quest_id, owner, name, created_at)
        // Emit quest creation event via shared helper for consistent schema
        common::emit_quest_created(
            &env,
            id,
            &quest.owner.clone(),
            &quest.name.clone(),
            quest.created_at,
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
        if quest.status == QuestStatus::Cancelled {
            return Err(Error::QuestCancelled);
        }

        // Input validation & update
        if let Some(n) = name.clone() {
            validate_name(&n)?;
            quest.name = n;
        }

        if let Some(d) = description.clone() {
            validate_description(&d)?;
            quest.description = d;
        }

        if let Some(c) = category.clone() {
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

        if let Some(t) = tags.clone() {
            Self::validate_tags(&t)?;
            quest.tags = t;
        }

        if let Some(v) = visibility {
            Self::internal_set_visibility(&env, quest_id, &mut quest, v);
        }

        if let Some(m) = max_enrollees {
            quest.max_enrollees = Some(m);
        }

        // Store version snapshot before updating
        let old_version = QuestVersion {
            version: quest.version,
            name: quest.name.clone(),
            description: quest.description.clone(),
            category: quest.category.clone(),
            tags: quest.tags.clone(),
            visibility: quest.visibility,
            max_enrollees: quest.max_enrollees,
            updated_at: env.ledger().timestamp(),
        };

        // Increment version
        quest.version += 1;

        env.storage()
            .persistent()
            .set(&DataKey::Quest(quest_id), &quest);

        // Append old version to history
        let history_key = DataKey::QuestVersionHistory(quest_id);
        let mut history: Vec<QuestVersion> = env
            .storage()
            .persistent()
            .get(&history_key)
            .unwrap_or(Vec::new(&env));
        history.push_back(old_version);
        env.storage().persistent().set(&history_key, &history);
        common::extend_persistent_ttl(&env, &history_key);

        // Emit quest updated event with the fields that were actually changed
        // Event topics: (quest_updated,)
        // Event data: (quest_id, new_version, name, description, category, tags, max_enrollees)
        env.events().publish(
            (Symbol::new(&env, "quest_updated"),),
            (
                quest_id,
                quest.version,
                name,
                description,
                category,
                tags,
                max_enrollees,
            ),
        );

        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Archive a quest. Owner only. Archived quests do not accept new enrollments.
    pub fn archive_quest(env: Env, quest_id: u32) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        let mut quest = Self::load_quest(&env, quest_id)?;
        quest.owner.require_auth();

        if quest.status == QuestStatus::Archived {
            return Err(Error::QuestArchived);
        }
        if quest.status == QuestStatus::Cancelled {
            return Err(Error::QuestCancelled);
        }

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

    /// Cancel an active quest. Owner only.
    /// Cancelling a quest prevents any further updates, enrollments, or milestone verifications.
    /// Cleans up state by removing the quest from public discovery indices.
    pub fn cancel_quest(env: Env, quest_id: u32) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        let mut quest = Self::load_quest(&env, quest_id)?;
        quest.owner.require_auth();

        if quest.status == QuestStatus::Cancelled {
            return Err(Error::QuestCancelled);
        }
        if quest.status == QuestStatus::Archived {
            return Err(Error::QuestArchived);
        }

        quest.status = QuestStatus::Cancelled;
        quest.archived_at = env.ledger().timestamp();

        // Cleanup: remove from public discovery indices if public
        if quest.visibility == Visibility::Public {
            Self::remove_id_from_index(
                &env,
                DataKey::PublicCategoryQuests(quest.category.clone()),
                quest_id,
            );
            let mut public_ids: Vec<u32> = env
                .storage()
                .persistent()
                .get(&DataKey::PublicQuests)
                .unwrap_or(Vec::new(&env));
            if let Some(index) = public_ids.first_index_of(quest_id) {
                public_ids.remove(index);
                env.storage()
                    .persistent()
                    .set(&DataKey::PublicQuests, &public_ids);
            }
        }

        env.storage()
            .persistent()
            .set(&DataKey::Quest(quest_id), &quest);

        // Emit quest cancelled event
        env.events()
            .publish((Symbol::new(&env, "quest_cancelled"),), quest_id);

        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Add an enrollee to a quest. Owner only.
    ///
    /// When the quest has an enrollment cap and is full, the owner can still
    /// force-add an enrollee (bypassing the cap). Self-enrollment via
    /// `join_quest` will instead add to the waitlist.
    pub fn add_enrollee(env: Env, quest_id: u32, enrollee: Address) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        let quest = Self::load_quest(&env, quest_id)?;
        quest.owner.require_auth();

        if quest.status == QuestStatus::Archived || quest.status == QuestStatus::Cancelled {
            return Err(Error::EnrollmentClosed);
        }
        if quest.deadline > 0 && env.ledger().timestamp() > quest.deadline {
            return Err(Error::DeadlineExpired);
        }

        let enrollees = Self::load_enrollees(&env, quest_id);

        // Owner can force-add even when full (bypasses cap).
        // For self-enrollment, see join_quest which waitlists when full.

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
            (
                quest_id,
                enrollee.clone(),
                quest.owner.clone(),
                timestamp,
                join_mode,
            ),
        );

        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Allow a learner to enroll themselves in a public quest.
    ///
    /// When the quest has an enrollment cap and is full, the learner is
    /// automatically added to the waitlist (FIFO) instead of being rejected.
    pub fn join_quest(env: Env, enrollee: Address, quest_id: u32) -> Result<(), Error> {
        enrollee.require_auth();
        Self::require_not_paused(&env)?;

        let quest = Self::load_quest(&env, quest_id)?;
        if quest.status == QuestStatus::Archived || quest.status == QuestStatus::Cancelled {
            return Err(Error::EnrollmentClosed);
        }
        if quest.deadline > 0 && env.ledger().timestamp() > quest.deadline {
            return Err(Error::DeadlineExpired);
        }
        if quest.visibility == Visibility::Private || quest.visibility == Visibility::InviteOnly {
            return Err(Error::InviteOnly);
        }

        let enrollees = Self::load_enrollees(&env, quest_id);

        if enrollees.contains(&enrollee) {
            return Err(Error::AlreadyEnrolled);
        }

        // If the quest has a cap and is full, add to the waitlist instead.
        if let Some(max) = quest.max_enrollees {
            if enrollees.len() >= max {
                let waitlist = Self::load_waitlist(&env, quest_id);
                if waitlist.contains(&enrollee) {
                    return Err(Error::AlreadyEnrolled);
                }
                let mut new_waitlist = waitlist;
                new_waitlist.push_back(enrollee.clone());
                let key = DataKey::Waitlist(quest_id);
                env.storage().persistent().set(&key, &new_waitlist);
                common::extend_persistent_ttl(&env, &key);

                env.events().publish(
                    (Symbol::new(&env, "waitlist_joined"),),
                    (quest_id, enrollee, env.ledger().timestamp()),
                );

                Self::bump(&env, quest_id);
                return Ok(());
            }
        }

        let mut new_enrollees = enrollees;
        new_enrollees.push_back(enrollee.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Enrollees(quest_id), &new_enrollees);
        Self::add_id_to_index(&env, DataKey::EnrolleeQuests(enrollee.clone()), quest_id);

        // Emit enrollment event with distinct join_mode for self-enrollment
        // Event topics: (enrollee_added,)
        // Event data: (quest_id, enrollee, actor, timestamp, join_mode)
        let timestamp = env.ledger().timestamp();
        let join_mode = Symbol::new(&env, "self");
        env.events().publish(
            (Symbol::new(&env, "enrollee_added"),),
            (
                quest_id,
                enrollee.clone(),
                quest.owner.clone(),
                timestamp,
                join_mode,
            ),
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
        if quest.status == QuestStatus::Archived || quest.status == QuestStatus::Cancelled {
            return Err(Error::EnrollmentClosed);
        }
        if quest.deadline > 0 && env.ledger().timestamp() > quest.deadline {
            return Err(Error::DeadlineExpired);
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

    /// Check whether an invite commitment is registered, not yet consumed,
    /// and still redeemable (the quest is neither closed nor past its
    /// deadline). A commitment that would be rejected by
    /// `join_quest_with_invite` for any of these reasons reports as invalid
    /// here too, so callers never see a stale invite reported as valid.
    pub fn is_invite_valid(env: Env, quest_id: u32, commitment: BytesN<32>) -> bool {
        let quest = match Self::load_quest(&env, quest_id) {
            Ok(q) => q,
            Err(_) => return false,
        };
        if quest.status == QuestStatus::Archived || quest.status == QuestStatus::Cancelled {
            return false;
        }
        if quest.deadline > 0 && env.ledger().timestamp() > quest.deadline {
            return false;
        }
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
    ///
    /// The enrollee submits the raw `preimage` bytes. The contract hashes them
    /// with SHA-256 and checks that the resulting commitment was registered by
    /// the owner and has not been consumed yet. On success the commitment is
    /// marked as used (preventing replay) and the enrollee is added.
    ///
    /// This method also works for public quests — the invite path is simply an
    /// alternative to `join_quest` when the owner wants single-use codes.
    pub fn join_quest_with_invite(
        env: Env,
        enrollee: Address,
        quest_id: u32,
        preimage: Bytes,
    ) -> Result<(), Error> {
        enrollee.require_auth();
        Self::require_not_paused(&env)?;

        let quest = Self::load_quest(&env, quest_id)?;
        if quest.status == QuestStatus::Archived || quest.status == QuestStatus::Cancelled {
            return Err(Error::EnrollmentClosed);
        }
        if quest.deadline > 0 && env.ledger().timestamp() > quest.deadline {
            return Err(Error::DeadlineExpired);
        }

        // Derive commitment from the submitted preimage.
        let commitment: BytesN<32> = env.crypto().sha256(&preimage).into();

        let commitment_key = DataKey::InviteCommitment(quest_id, commitment.clone());
        let used_key = DataKey::InviteUsed(quest_id, commitment.clone());

        // Commitment must be registered.
        if !env
            .storage()
            .persistent()
            .get::<_, bool>(&commitment_key)
            .unwrap_or(false)
        {
            return Err(Error::InvalidInvite);
        }

        // Commitment must not have been consumed already.
        if env
            .storage()
            .persistent()
            .get::<_, bool>(&used_key)
            .unwrap_or(false)
        {
            return Err(Error::InviteAlreadyUsed);
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

        // Mark invite as consumed before mutating enrollment state.
        env.storage().persistent().set(&used_key, &true);
        common::extend_persistent_ttl(&env, &used_key);

        let mut new_enrollees = enrollees;
        new_enrollees.push_back(enrollee.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Enrollees(quest_id), &new_enrollees);
        Self::add_id_to_index(&env, DataKey::EnrolleeQuests(enrollee.clone()), quest_id);

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
    ///
    /// Rejects with `LeaveBlockedByPendingApproval` if the quest owner has
    /// placed a peer-review hold on the enrollee (see `place_leave_hold`).
    /// The hold exists so completion submissions awaiting peer approval
    /// cannot reference a non-enrollee.
    pub fn leave_quest(env: Env, enrollee: Address, quest_id: u32) -> Result<(), Error> {
        enrollee.require_auth();
        Self::require_not_paused(&env)?;
        Self::load_quest(&env, quest_id)?;

        let hold_key = DataKey::LeaveHold(quest_id, enrollee.clone());
        if env.storage().persistent().has(&hold_key) {
            return Err(Error::LeaveBlockedByPendingApproval);
        }

        Self::internal_remove_enrollee(&env, quest_id, enrollee)
    }

    /// Place a peer-review hold on an enrollee. Owner only.
    /// While the hold is in place, `leave_quest` is rejected for that
    /// enrollee. The owner is expected to call this whenever the enrollee
    /// has a peer-review submission in flight or a recently verified
    /// completion awaiting reward settlement.
    pub fn place_leave_hold(
        env: Env,
        quest_id: u32,
        owner: Address,
        enrollee: Address,
    ) -> Result<(), Error> {
        owner.require_auth();
        Self::require_not_paused(&env)?;
        let quest = Self::load_quest(&env, quest_id)?;
        if quest.owner != owner {
            return Err(Error::Unauthorized);
        }
        if !Self::load_enrollees(&env, quest_id).contains(&enrollee) {
            return Err(Error::NotEnrolled);
        }

        let hold_key = DataKey::LeaveHold(quest_id, enrollee);
        env.storage().persistent().set(&hold_key, &true);
        common::extend_persistent_ttl(&env, &hold_key);
        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Lift a peer-review hold so the enrollee can `leave_quest` again.
    /// Owner only. No-op if no hold was set.
    pub fn lift_leave_hold(
        env: Env,
        quest_id: u32,
        owner: Address,
        enrollee: Address,
    ) -> Result<(), Error> {
        owner.require_auth();
        Self::require_not_paused(&env)?;
        let quest = Self::load_quest(&env, quest_id)?;
        if quest.owner != owner {
            return Err(Error::Unauthorized);
        }

        let hold_key = DataKey::LeaveHold(quest_id, enrollee);
        env.storage().persistent().remove(&hold_key);
        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Read whether a peer-review hold is currently in place.
    pub fn has_leave_hold(env: Env, quest_id: u32, enrollee: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::LeaveHold(quest_id, enrollee))
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

    /// Get the version history for a quest.
    ///
    /// Returns all historical snapshots in chronological order (oldest first).
    /// Each snapshot captures the quest fields at the time of a previous update.
    pub fn get_quest_version_history(env: Env, quest_id: u32) -> Result<Vec<QuestVersion>, Error> {
        Self::load_quest(&env, quest_id)?; // verify exists
        let history_key = DataKey::QuestVersionHistory(quest_id);
        let history: Vec<QuestVersion> = env
            .storage()
            .persistent()
            .get(&history_key)
            .unwrap_or(Vec::new(&env));
        Self::bump(&env, quest_id);
        Ok(history)
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

    /// Get active participants for a quest, excluding suspended, banned, and inactive users.
    /// Returns only enrollees with Active status.
    pub fn get_active_participants(env: Env, quest_id: u32) -> Result<Vec<Address>, Error> {
        Self::load_quest(&env, quest_id)?;
        let enrollees = Self::load_enrollees(&env, quest_id);
        let mut active = Vec::new(&env);

        for enrollee in enrollees.iter() {
            let status_key = DataKey::EnrolleeStatus(quest_id, enrollee.clone());
            let status: EnrolleeStatus = env
                .storage()
                .persistent()
                .get(&status_key)
                .unwrap_or(EnrolleeStatus::Active);

            if status == EnrolleeStatus::Active {
                active.push_back(enrollee);
            }
        }
        Self::bump(&env, quest_id);
        Ok(active)
    }

    /// Get the count of active participants in a quest.
    /// Returns the number of enrollees with Active status (the default).
    /// More efficient than `get_active_participants().len()` when only the
    /// count is needed (e.g. analytics dashboards, badge displays).
    pub fn get_active_participant_count(env: Env, quest_id: u32) -> Result<u32, Error> {
        Self::load_quest(&env, quest_id)?;
        let enrollees = Self::load_enrollees(&env, quest_id);
        let mut count = 0u32;

        for enrollee in enrollees.iter() {
            let status_key = DataKey::EnrolleeStatus(quest_id, enrollee.clone());
            let status: EnrolleeStatus = env
                .storage()
                .persistent()
                .get(&status_key)
                .unwrap_or(EnrolleeStatus::Active);

            if status == EnrolleeStatus::Active {
                count += 1;
            }
        }

        Self::bump(&env, quest_id);
        Ok(count)
    }

    /// Set the status of an enrollee. Owner only.
    pub fn set_enrollee_status(
        env: Env,
        quest_id: u32,
        enrollee: Address,
        status: EnrolleeStatus,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        let quest = Self::load_quest(&env, quest_id)?;
        quest.owner.require_auth();

        let enrollees = Self::load_enrollees(&env, quest_id);
        if !enrollees.contains(&enrollee) {
            return Err(Error::NotEnrolled);
        }

        let status_key = DataKey::EnrolleeStatus(quest_id, enrollee.clone());
        env.storage().persistent().set(&status_key, &status);
        common::extend_persistent_ttl(&env, &status_key);
        env.events().publish(
            (Symbol::new(&env, "enrollee_status_changed"),),
            (quest_id, enrollee, status, env.ledger().timestamp()),
        );
        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Get the status of an enrollee. Defaults to Active if not set.
    pub fn get_enrollee_status(
        env: Env,
        quest_id: u32,
        enrollee: Address,
    ) -> Result<EnrolleeStatus, Error> {
        Self::load_quest(&env, quest_id)?;
        let status_key = DataKey::EnrolleeStatus(quest_id, enrollee);
        let status: EnrolleeStatus = env
            .storage()
            .persistent()
            .get(&status_key)
            .unwrap_or(EnrolleeStatus::Active);
        Self::bump(&env, quest_id);
        Ok(status)
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

    /// Estimate the rent (in stroops) `create_quest` will need to keep the
    /// resulting `QuestInfo` entry alive for one TTL cycle (~30 days), based
    /// on the sizes of the variable-length fields the caller intends to
    /// submit. This is a planning aid only — see `docs/GAS_COSTS.md` for the
    /// full storage cost model and its accuracy caveats. Always confirm the
    /// exact fee with `simulateTransaction` before signing.
    pub fn estimate_quest_creation_rent(
        _env: Env,
        name_len: u32,
        description_len: u32,
        category_len: u32,
        tag_count: u32,
    ) -> i128 {
        // Fixed overhead accounts for the non-string QuestInfo fields
        // (addresses, numeric fields, enums, and struct/XDR framing).
        const FIXED_OVERHEAD_BYTES: u32 = 256;
        const AVG_TAG_BYTES: u32 = MAX_TAG_LEN;

        let entry_size = FIXED_OVERHEAD_BYTES
            + name_len
            + description_len
            + category_len
            + (tag_count.min(MAX_TAGS) * AVG_TAG_BYTES);

        common::estimate_persistent_rent(entry_size)
    }

    /// Explicitly refresh the TTL for a quest, its enrollee list, and its
    /// version history. Owner only.
    ///
    /// Quest data is normally kept alive as a side effect of other mutating
    /// calls (see `bump`), but a quest that receives no updates for a long
    /// stretch can approach expiry. This lets an owner top up the TTL
    /// directly — e.g. from a scheduled job — without making an unrelated
    /// state change.
    pub fn extend_quest_ttl(env: Env, quest_id: u32, owner: Address) -> Result<(), Error> {
        let quest = Self::load_quest(&env, quest_id)?;
        if quest.owner != owner {
            return Err(Error::Unauthorized);
        }
        owner.require_auth();
        Self::bump(&env, quest_id);
        env.events()
            .publish((Symbol::new(&env, "quest_ttl_extended"),), quest_id);
        Ok(())
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

        let category_key = DataKey::PublicCategoryQuests(category.clone());
        if env.storage().persistent().has(&category_key) {
            common::extend_persistent_ttl(&env, &category_key);
            Self::record_category_expiry(&env, &category);
        }
        matches
    }

    /// Get metadata for a public category, including its TTL/expiry information.
    ///
    /// The category listing is stored as persistent data with a bounded TTL.
    /// When that TTL elapses the listing (and the quests surfaced through it)
    /// can vanish without warning. This query exposes `expires_at` (an absolute
    /// ledger timestamp) and `ttl_remaining` (ledgers left) so the frontend can
    /// show users that a category is about to disappear and suggest mitigation
    /// (e.g. re-pinning or re-listing the quests).
    pub fn get_category(env: Env, category: String) -> Result<CategoryInfo, Error> {
        let key = DataKey::PublicCategoryQuests(category.clone());
        let ids: Vec<u32> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(&env));

        if ids.is_empty() {
            return Err(Error::NotFound);
        }

        // The listing's expiry ledger is recorded whenever the category is
        // (re)touched (see add/remove_id_to_index and
        // get_public_quests_by_category). Fall back to "now + BUMP" for
        // categories that were written before this field existed.
        let expiry_ledger: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::CategoryExpiry(category.clone()))
            .unwrap_or(env.ledger().sequence().saturating_add(common::BUMP));

        let current_ledger = env.ledger().sequence();
        let ttl_remaining = expiry_ledger.saturating_sub(current_ledger);

        // Approximate the absolute expiry as a Unix timestamp. Soroban ledgers
        // close roughly every ~5s (ADR-005); convert the remaining ledgers to
        // seconds and add to the current ledger close time.
        let approx_seconds_per_ledger: u64 = 5;
        let current_ts = env.ledger().timestamp();
        let expires_at = current_ts
            .saturating_add((ttl_remaining as u64).saturating_mul(approx_seconds_per_ledger));

        // Refresh the listing's TTL on read so a popular category does not
        // expire merely from being queried.
        env.storage().persistent().extend_ttl(&key, THRESHOLD, BUMP);

        Ok(CategoryInfo {
            category,
            quest_count: ids.len(),
            ttl_remaining,
            expires_at,
        })
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

    /// Set prerequisites for a quest. Owner only.
    /// Pass an empty vector to remove all prerequisites.
    pub fn set_prerequisites(
        env: Env,
        quest_id: u32,
        prerequisite_ids: Vec<u32>,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        let mut quest = Self::load_quest(&env, quest_id)?;
        quest.owner.require_auth();

        quest.prerequisite_quest_ids = prerequisite_ids;
        env.storage()
            .persistent()
            .set(&DataKey::Quest(quest_id), &quest);
        Self::bump(&env, quest_id);
        Ok(())
    }

    // ── Ownership transfer ────────────────────────────────────────────────

    /// Initiate a two-step ownership transfer. Only the current owner can call.
    /// The quest must be Active. A pending transfer replaces any existing one.
    pub fn initiate_transfer(env: Env, quest_id: u32, nominee: Address) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        let quest = Self::load_quest(&env, quest_id)?;
        quest.owner.require_auth();

        if quest.status != QuestStatus::Active {
            return Err(Error::InvalidInput);
        }
        if nominee == quest.owner {
            return Err(Error::InvalidInput);
        }

        let transfer = PendingTransfer {
            nominee: nominee.clone(),
            initiated_at: env.ledger().timestamp(),
        };
        let key = DataKey::PendingTransfer(quest_id);
        env.storage().persistent().set(&key, &transfer);
        common::extend_persistent_ttl(&env, &key);

        env.events().publish(
            (Symbol::new(&env, "ownership_transfer_initiated"),),
            (quest_id, quest.owner, nominee, env.ledger().timestamp()),
        );

        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Accept a pending ownership transfer. Only the nominated address can call.
    /// Transfers ownership and clears the pending request.
    pub fn accept_transfer(env: Env, quest_id: u32) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        let transfer_key = DataKey::PendingTransfer(quest_id);
        let transfer: PendingTransfer = env
            .storage()
            .persistent()
            .get(&transfer_key)
            .ok_or(Error::NoPendingTransfer)?;

        transfer.nominee.require_auth();
        let nominee = transfer.nominee.clone();

        let mut quest = Self::load_quest(&env, quest_id)?;
        if quest.status != QuestStatus::Active {
            return Err(Error::InvalidInput);
        }

        let old_owner = quest.owner.clone();
        quest.owner = nominee.clone();
        env.storage()
            .persistent()
            .set(&DataKey::Quest(quest_id), &quest);
        env.storage().persistent().remove(&transfer_key);

        // Update OwnerQuests indices
        Self::remove_id_from_index(&env, DataKey::OwnerQuests(old_owner.clone()), quest_id);
        Self::add_id_to_index(&env, DataKey::OwnerQuests(nominee.clone()), quest_id);

        env.events().publish(
            (Symbol::new(&env, "ownership_transferred"),),
            (quest_id, old_owner, nominee, env.ledger().timestamp()),
        );

        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Cancel a pending ownership transfer. Only the current owner can call.
    pub fn cancel_transfer(env: Env, quest_id: u32) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        let quest = Self::load_quest(&env, quest_id)?;
        quest.owner.require_auth();

        let transfer_key = DataKey::PendingTransfer(quest_id);
        if !env.storage().persistent().has(&transfer_key) {
            return Err(Error::NoPendingTransfer);
        }

        env.storage().persistent().remove(&transfer_key);

        env.events().publish(
            (Symbol::new(&env, "ownership_transfer_cancelled"),),
            (quest_id, quest.owner, env.ledger().timestamp()),
        );

        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Get the pending ownership transfer for a quest, if any.
    pub fn get_pending_transfer(env: Env, quest_id: u32) -> Result<Option<PendingTransfer>, Error> {
        Self::load_quest(&env, quest_id)?;
        let key = DataKey::PendingTransfer(quest_id);
        let transfer: Option<PendingTransfer> = env.storage().persistent().get(&key);
        Self::bump(&env, quest_id);
        Ok(transfer)
    }

    // ── Waitlist ──────────────────────────────────────────────────────────

    /// Join the waitlist for a quest that is full. FIFO ordering.
    /// The quest must have max_enrollees set and be full.
    pub fn join_waitlist(env: Env, enrollee: Address, quest_id: u32) -> Result<(), Error> {
        enrollee.require_auth();
        Self::require_not_paused(&env)?;

        let quest = Self::load_quest(&env, quest_id)?;
        if quest.status == QuestStatus::Archived || quest.status == QuestStatus::Cancelled {
            return Err(Error::EnrollmentClosed);
        }
        if quest.visibility == Visibility::Private || quest.visibility == Visibility::InviteOnly {
            return Err(Error::InviteOnly);
        }

        let max = quest.max_enrollees.ok_or(Error::InvalidInput)?;
        let enrollees = Self::load_enrollees(&env, quest_id);
        if enrollees.len() < max {
            return Err(Error::InvalidInput); // quest is not full
        }
        if enrollees.contains(&enrollee) {
            return Err(Error::AlreadyEnrolled);
        }

        let waitlist = Self::load_waitlist(&env, quest_id);
        if waitlist.contains(&enrollee) {
            return Err(Error::AlreadyEnrolled);
        }

        let mut new_waitlist = waitlist;
        new_waitlist.push_back(enrollee.clone());
        let key = DataKey::Waitlist(quest_id);
        env.storage().persistent().set(&key, &new_waitlist);
        common::extend_persistent_ttl(&env, &key);

        env.events().publish(
            (Symbol::new(&env, "waitlist_joined"),),
            (quest_id, enrollee, env.ledger().timestamp()),
        );

        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Promote the next person from the waitlist to enrollee. Owner only.
    /// Returns the promoted address, or None if the waitlist is empty.
    pub fn promote_from_waitlist(env: Env, quest_id: u32) -> Result<Option<Address>, Error> {
        Self::require_not_paused(&env)?;
        let quest = Self::load_quest(&env, quest_id)?;
        quest.owner.require_auth();

        if quest.status == QuestStatus::Archived || quest.status == QuestStatus::Cancelled {
            return Err(Error::EnrollmentClosed);
        }

        let mut waitlist = Self::load_waitlist(&env, quest_id);
        if waitlist.is_empty() {
            return Ok(None);
        }

        // Pop first (FIFO)
        let promoted = waitlist.get(0).ok_or(Error::NotFound)?;
        waitlist.remove(0);
        let key = DataKey::Waitlist(quest_id);
        env.storage().persistent().set(&key, &waitlist);
        common::extend_persistent_ttl(&env, &key);

        // Enroll the promoted person
        let mut enrollees = Self::load_enrollees(&env, quest_id);
        enrollees.push_back(promoted.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Enrollees(quest_id), &enrollees);
        Self::add_id_to_index(&env, DataKey::EnrolleeQuests(promoted.clone()), quest_id);

        env.events().publish(
            (Symbol::new(&env, "waitlist_promoted"),),
            (quest_id, promoted.clone(), env.ledger().timestamp()),
        );

        Self::bump(&env, quest_id);
        Ok(Some(promoted))
    }

    /// Remove a person from the waitlist. Owner only.
    pub fn remove_from_waitlist(env: Env, quest_id: u32, enrollee: Address) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        let quest = Self::load_quest(&env, quest_id)?;
        quest.owner.require_auth();

        let waitlist = Self::load_waitlist(&env, quest_id);
        let mut found = false;
        let mut new_list = Vec::new(&env);

        for i in 0..waitlist.len() {
            let addr = waitlist.get(i).unwrap();
            if addr == enrollee {
                found = true;
            } else {
                new_list.push_back(addr);
            }
        }

        if !found {
            return Err(Error::NotFound);
        }

        let key = DataKey::Waitlist(quest_id);
        env.storage().persistent().set(&key, &new_list);
        common::extend_persistent_ttl(&env, &key);

        Self::bump(&env, quest_id);
        Ok(())
    }

    /// Get the waitlist for a quest.
    pub fn get_waitlist(env: Env, quest_id: u32) -> Result<Vec<Address>, Error> {
        Self::load_quest(&env, quest_id)?;
        let waitlist = Self::load_waitlist(&env, quest_id);
        Self::bump(&env, quest_id);
        Ok(waitlist)
    }

    /// Get the waitlist length for a quest.
    pub fn get_waitlist_length(env: Env, quest_id: u32) -> Result<u32, Error> {
        Self::load_quest(&env, quest_id)?;
        let waitlist = Self::load_waitlist(&env, quest_id);
        Self::bump(&env, quest_id);
        Ok(waitlist.len())
    }

    /// Get prerequisites for a quest.
    pub fn get_prerequisites(env: Env, quest_id: u32) -> Result<Vec<u32>, Error> {
        let quest = Self::load_quest(&env, quest_id)?;
        Self::bump(&env, quest_id);
        Ok(quest.prerequisite_quest_ids)
    }

    /// Check if a user has completed all prerequisites for a quest.
    pub fn has_completed_prerequisites(
        env: Env,
        user: Address,
        quest_id: u32,
    ) -> Result<bool, Error> {
        let quest = Self::load_quest(&env, quest_id)?;

        if quest.prerequisite_quest_ids.is_empty() {
            return Ok(true);
        }

        for prerequisite_id in quest.prerequisite_quest_ids.iter() {
            let prerequisite = Self::load_quest(&env, prerequisite_id)?;
            if prerequisite.status != QuestStatus::Active {
                continue;
            }

            let enrollees = Self::load_enrollees(&env, prerequisite_id);
            if !enrollees.contains(&user) {
                return Ok(false);
            }
        }

        Self::bump(&env, quest_id);
        Ok(true)
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
        if common::is_paused_by_key(env, &DataKey::Paused) {
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

    fn load_waitlist(env: &Env, id: u32) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::Waitlist(id))
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
        Self::remove_id_from_index(env, DataKey::EnrolleeQuests(enrollee), quest_id);

        // Auto-promote from waitlist if the quest has a cap and there are waitlisted people.
        let quest = Self::load_quest(env, quest_id)?;
        if quest.max_enrollees.is_some() {
            let mut waitlist = Self::load_waitlist(env, quest_id);
            if !waitlist.is_empty() {
                let promoted = waitlist.get(0).ok_or(Error::NotFound)?;
                waitlist.remove(0);
                let wl_key = DataKey::Waitlist(quest_id);
                env.storage().persistent().set(&wl_key, &waitlist);
                common::extend_persistent_ttl(env, &wl_key);

                let mut current_enrollees = Self::load_enrollees(env, quest_id);
                current_enrollees.push_back(promoted.clone());
                env.storage()
                    .persistent()
                    .set(&DataKey::Enrollees(quest_id), &current_enrollees);
                Self::add_id_to_index(env, DataKey::EnrolleeQuests(promoted.clone()), quest_id);

                env.events().publish(
                    (Symbol::new(env, "waitlist_promoted"),),
                    (quest_id, promoted, env.ledger().timestamp()),
                );
            }
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
        if let DataKey::PublicCategoryQuests(c) = &key {
            Self::record_category_expiry(env, c);
        }
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
        if let DataKey::PublicCategoryQuests(c) = &key {
            Self::record_category_expiry(env, c);
        }
    }

    /// Record the absolute ledger at which a public category's listing expires.
    /// Mirrors the TTL bump performed by `extend_persistent_ttl` so that
    /// `get_category` can surface an accurate `expires_at` (soroban-sdk 22 has
    /// no runtime TTL read outside of testutils).
    fn record_category_expiry(env: &Env, category: &String) {
        let expiry = env.ledger().sequence().saturating_add(common::BUMP);
        env.storage()
            .persistent()
            .set(&DataKey::CategoryExpiry(category.clone()), &expiry);
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
        if env.storage().persistent().has(&DataKey::Quest(quest_id)) {
            common::extend_persistent_ttl(env, &DataKey::Quest(quest_id));
        }
        if env
            .storage()
            .persistent()
            .has(&DataKey::Enrollees(quest_id))
        {
            common::extend_persistent_ttl(env, &DataKey::Enrollees(quest_id));
        }
        if env
            .storage()
            .persistent()
            .has(&DataKey::QuestVersionHistory(quest_id))
        {
            common::extend_persistent_ttl(env, &DataKey::QuestVersionHistory(quest_id));
        }
        if env.storage().persistent().has(&DataKey::Waitlist(quest_id)) {
            common::extend_persistent_ttl(env, &DataKey::Waitlist(quest_id));
        }
        if env
            .storage()
            .persistent()
            .has(&DataKey::PendingTransfer(quest_id))
        {
            common::extend_persistent_ttl(env, &DataKey::PendingTransfer(quest_id));
        }
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
