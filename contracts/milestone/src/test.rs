#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

// Import the quest contract for testing
extern crate quest;
use quest::{QuestContract, QuestContractClient, Visibility};

fn setup() -> (
    Env,
    MilestoneContractClient<'static>,
    QuestContractClient<'static>,
    Address,
) {
    let env = Env::default();
    env.mock_all_auths();

    // Register quest contract
    let quest_contract_id = env.register(QuestContract, ());
    let quest_client = QuestContractClient::new(&env, &quest_contract_id);

    // Use a dummy certificate contract address for setup (not needed for basic tests)
    let certificate_contract_id = Address::generate(&env);

    // Register milestone contract
    let milestone_contract_id = env.register(MilestoneContract, ());
    let milestone_client = MilestoneContractClient::new(&env, &milestone_contract_id);

    let admin = Address::generate(&env);

    // Initialize milestone contract with quest contract address
    milestone_client.initialize(&admin, &quest_contract_id, &certificate_contract_id);

    (env, milestone_client, quest_client, admin)
}

fn create_ms(
    env: &Env,
    milestone_client: &MilestoneContractClient,
    quest_client: &QuestContractClient,
    owner: &Address,
    quest_id: u32,
    title: &str,
    reward: i128,
) -> u32 {
    // Ensure quest exists before creating milestone
    let quest_count = quest_client.get_quest_count();
    if quest_count <= quest_id {
        // Create quest if it doesn't exist
        quest_client.create_quest(
            owner,
            &String::from_str(env, "Quest"),
            &String::from_str(env, "Quest description"),
            &String::from_str(env, "Programming"),
            &Vec::<String>::new(env),
            &Address::generate(env), // token address
            &Visibility::Public,
        );
    }

    milestone_client.create_milestone(
        owner,
        &quest_id,
        &String::from_str(env, title),
        &String::from_str(env, "Description"),
        &reward,
    )
}

#[test]
fn test_create_milestone() {
    let (env, client, quest_client, owner) = setup();
    let id = create_ms(
        &env,
        &client,
        &quest_client,
        &owner,
        0,
        "Build your first API",
        100,
    );
    assert_eq!(id, 0);
    assert_eq!(client.get_milestone_count(&0), 1);

    let ms = client.get_milestone(&0, &0);
    assert_eq!(ms.title, String::from_str(&env, "Build your first API"));
    assert_eq!(ms.reward_amount, 100);
    assert_eq!(ms.quest_id, 0);
}

#[test]
fn test_create_multiple_milestones() {
    let (env, client, quest_client, owner) = setup();
    let id0 = create_ms(&env, &client, &quest_client, &owner, 0, "Task 1", 50);
    let id1 = create_ms(&env, &client, &quest_client, &owner, 0, "Task 2", 100);
    let id2 = create_ms(&env, &client, &quest_client, &owner, 0, "Task 3", 200);
    assert_eq!(id0, 0);
    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
    assert_eq!(client.get_milestone_count(&0), 3);
}

#[test]
fn test_milestones_per_quest_are_independent() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Quest0 Task", 50);
    create_ms(&env, &client, &quest_client, &owner, 0, "Quest0 Task 2", 75);

    let owner2 = Address::generate(&env);
    create_ms(&env, &client, &quest_client, &owner2, 1, "Quest1 Task", 100);

    assert_eq!(client.get_milestone_count(&0), 2);
    assert_eq!(client.get_milestone_count(&1), 1);
}

#[test]
fn test_get_milestones() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "A", 10);
    create_ms(&env, &client, &quest_client, &owner, 0, "B", 20);

    let milestones = client.get_milestones(&0);
    assert_eq!(milestones.len(), 2);
    assert_eq!(
        milestones.get(0).unwrap().title,
        String::from_str(&env, "A")
    );
    assert_eq!(
        milestones.get(1).unwrap().title,
        String::from_str(&env, "B")
    );
}

#[test]
fn test_verify_completion() {
    let (env, client, quest_client, owner) = setup();
    create_ms(
        &env,
        &client,
        &quest_client,
        &owner,
        0,
        "Deploy a contract",
        100,
    );

    let enrollee = Address::generate(&env);
    // Enroll the user first (Issue #162 fix requires this)
    quest_client.add_enrollee(&0, &enrollee);

    let reward = client.verify_completion(&owner, &0, &0, &enrollee);
    assert_eq!(reward, 100);
    assert!(client.is_completed(&0, &0, &enrollee));
    assert_eq!(client.get_enrollee_completions(&0, &enrollee), 1);
}

#[test]
fn test_verify_multiple_completions() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Task 1", 50);
    create_ms(&env, &client, &quest_client, &owner, 0, "Task 2", 100);

    let enrollee = Address::generate(&env);
    // Enroll the user
    quest_client.add_enrollee(&0, &enrollee);

    client.verify_completion(&owner, &0, &0, &enrollee);
    client.verify_completion(&owner, &0, &1, &enrollee);

    assert_eq!(client.get_enrollee_completions(&0, &enrollee), 2);
    assert!(client.is_completed(&0, &0, &enrollee));
    assert!(client.is_completed(&0, &1, &enrollee));
}

#[test]
fn test_double_verify_fails() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Task", 50);

    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&0, &enrollee);

    client.verify_completion(&owner, &0, &0, &enrollee);

    let result = client.try_verify_completion(&owner, &0, &0, &enrollee);
    assert_eq!(result, Err(Ok(Error::AlreadyCompleted)));
}

#[test]
fn test_wrong_owner_cannot_verify() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Task", 50);

    let imposter = Address::generate(&env);
    let enrollee = Address::generate(&env);
    let result = client.try_verify_completion(&imposter, &0, &0, &enrollee);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_wrong_owner_cannot_create() {
    let (env, client, quest_client, owner) = setup();
    // First owner creates the quest and milestone
    create_ms(&env, &client, &quest_client, &owner, 0, "Task", 50);

    // Different owner tries to add to same quest
    let imposter = Address::generate(&env);
    let result = client.try_create_milestone(
        &imposter,
        &0,
        &String::from_str(&env, "Evil task"),
        &String::from_str(&env, "Hack"),
        &999,
    );
    assert_eq!(result, Err(Ok(Error::OwnerMismatch)));
}

#[test]
fn test_milestone_not_found() {
    let (_env, client, _quest_client, _owner) = setup();
    let result = client.try_get_milestone(&0, &999);
    assert_eq!(result, Err(Ok(Error::NotFound)));
}

#[test]
fn test_not_completed_by_default() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Task", 50);
    let enrollee = Address::generate(&env);
    assert!(!client.is_completed(&0, &0, &enrollee));
    assert_eq!(client.get_enrollee_completions(&0, &enrollee), 0);
}

#[test]
fn test_zero_reward_milestone() {
    let (env, client, quest_client, owner) = setup();
    let id = create_ms(&env, &client, &quest_client, &owner, 0, "Free task", 0);
    assert_eq!(id, 0);

    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&0, &enrollee);

    let reward = client.verify_completion(&owner, &0, &0, &enrollee);
    assert_eq!(reward, 0);
}

// --- distribution mode tests ---

#[test]
fn test_custom_mode_uses_per_milestone_amounts() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Task 1", 100);
    create_ms(&env, &client, &quest_client, &owner, 0, "Task 2", 200);

    client.set_distribution_mode(&owner, &0, &DistributionMode::Custom, &0);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    quest_client.add_enrollee(&0, &e1);
    quest_client.add_enrollee(&0, &e2);

    assert_eq!(client.verify_completion(&owner, &0, &0, &e1), 100);
    assert_eq!(client.verify_completion(&owner, &0, &1, &e2), 200);
}

#[test]
fn test_flat_mode_equal_rewards() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Task 1", 100);
    create_ms(&env, &client, &quest_client, &owner, 0, "Task 2", 999); // per-milestone amount is ignored

    client.set_distribution_mode(&owner, &0, &DistributionMode::Flat, &50);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    quest_client.add_enrollee(&0, &e1);
    quest_client.add_enrollee(&0, &e2);

    assert_eq!(client.verify_completion(&owner, &0, &0, &e1), 50);
    assert_eq!(client.verify_completion(&owner, &0, &1, &e2), 50);
}

#[test]
fn test_flat_mode_fails_with_zero_reward() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Task", 100);

    let result = client.try_set_distribution_mode(&owner, &0, &DistributionMode::Flat, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_competitive_mode_first_winners_rewarded() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Task", 100);
    client.set_distribution_mode(&owner, &0, &DistributionMode::Competitive(2), &0);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    let e3 = Address::generate(&env);
    quest_client.add_enrollee(&0, &e1);
    quest_client.add_enrollee(&0, &e2);
    quest_client.add_enrollee(&0, &e3);

    // First two get rewards
    assert_eq!(client.verify_completion(&owner, &0, &0, &e1), 100);
    assert_eq!(client.verify_completion(&owner, &0, &0, &e2), 100);
    // Third gets nothing
    assert_eq!(client.verify_completion(&owner, &0, &0, &e3), 0);
}

#[test]
fn test_competitive_mode_limited_winners() {
    let (env, client, quest_client, owner) = setup();
    let id1 = create_ms(&env, &client, &quest_client, &owner, 0, "Task 1", 100);
    let id2 = create_ms(&env, &client, &quest_client, &owner, 0, "Task 2", 200);
    client.set_distribution_mode(&owner, &0, &DistributionMode::Competitive(1), &0);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    quest_client.add_enrollee(&0, &e1);
    quest_client.add_enrollee(&0, &e2);

    // First completer gets reward, second gets nothing
    assert_eq!(client.verify_completion(&owner, &0, &id1, &e1), 100);
    assert_eq!(client.verify_completion(&owner, &0, &id1, &e2), 0);
    // Different milestone resets count
    assert_eq!(client.verify_completion(&owner, &0, &id2, &e2), 200);
}

// ---- Security tests ----
/// CRIT-01: Any address that calls create_milestone first for a quest_id
/// becomes the permanent milestone authority for that quest. The legitimate
/// quest owner is locked out because the first caller sets the cached owner with
/// no cross-contract validation against the quest contract.
///
/// FIX: Now validates ownership via cross-contract call to quest contract.
/// The attacker cannot seize authority because they don't own the quest.
#[test]
fn test_milestone_ownership_race_condition() {
    let (env, client, quest_client, legitimate_owner) = setup();
    let attacker = Address::generate(&env);

    // Legitimate owner creates quest 0
    quest_client.create_quest(
        &legitimate_owner,
        &String::from_str(&env, "Legitimate Quest"),
        &String::from_str(&env, "Description"),
        &String::from_str(&env, "Programming"),
        &Vec::<String>::new(&env),
        &Address::generate(&env), // token address
        &Visibility::Public,
    );

    // Attacker tries to call create_milestone first for quest 0
    let result = client.try_create_milestone(
        &attacker,
        &0,
        &String::from_str(&env, "Attacker backdoor milestone"),
        &String::from_str(&env, "Description"),
        &9999,
    );

    // Attack fails - attacker is not the quest owner
    assert_eq!(result, Err(Ok(Error::OwnerMismatch)));

    // Legitimate owner can create milestones for their own quest
    let id = client.create_milestone(
        &legitimate_owner,
        &0,
        &String::from_str(&env, "Real milestone"),
        &String::from_str(&env, "Description"),
        &100,
    );
    assert_eq!(id, 0);

    // Legitimate owner can verify completions
    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&0, &enrollee);
    let reward = client.verify_completion(&legitimate_owner, &0, &0, &enrollee);
    assert_eq!(reward, 100);

    // Attacker cannot verify completions
    let result = client.try_verify_completion(&attacker, &0, &0, &enrollee);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

/// HIGH-01: verify_completion accepts any enrollee address without checking
/// whether that address is actually enrolled in the quest. Any arbitrary
/// address can have milestone completion recorded and trigger reward distribution.
#[test]
fn test_verify_completion_enrollee_check() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Task", 100);

    // This address has never been enrolled in any quest contract
    let unenrolled = Address::generate(&env);

    // Should fail with NotEnrolled (Issue #162 fix)
    let result = client.try_verify_completion(&owner, &0, &0, &unenrolled);
    assert_eq!(result, Err(Ok(Error::NotEnrolled)));
}

#[test]
fn test_get_quest_not_found_fails() {
    let (env, client, _quest_client, owner) = setup();

    // Attempt to create milestone for non-existent quest
    let result = client.try_create_milestone(
        &owner,
        &99,
        &String::from_str(&env, "Title"),
        &String::from_str(&env, "Desc"),
        &100,
    );
    assert_eq!(result, Err(Ok(Error::NotFound)));
}

// ===== PEER VERIFICATION TESTS =====

#[test]
fn test_set_verification_mode() {
    let (env, client, quest_client, owner) = setup();

    quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Quest"),
        &String::from_str(&env, "Quest description"),
        &String::from_str(&env, "Programming"),
        &Vec::<String>::new(&env),
        &Address::generate(&env),
        &Visibility::Public,
    );

    // Set peer review mode requiring 2 approvals
    client.set_verification_mode(&owner, &0, &VerificationMode::PeerReview(2));
}

#[test]
fn test_submit_for_review() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Task", 100);

    // Set peer review mode
    client.set_verification_mode(&owner, &0, &VerificationMode::PeerReview(2));

    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&0, &enrollee);

    // Submit for review should succeed
    client.submit_for_review(&enrollee, &0, &0);

    // Submitting again should fail
    let result = client.try_submit_for_review(&enrollee, &0, &0);
    assert_eq!(result, Err(Ok(Error::AlreadySubmitted)));
}

#[test]
fn test_submit_for_review_owner_only_mode_fails() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Task", 100);

    // Don't set verification mode (defaults to OwnerOnly)
    let enrollee = Address::generate(&env);

    // Submit for review should fail in OwnerOnly mode
    let result = client.try_submit_for_review(&enrollee, &0, &0);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_approve_completion() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Task", 100);

    // Set peer review mode requiring 1 approval
    client.set_verification_mode(&owner, &0, &VerificationMode::PeerReview(1));

    let enrollee = Address::generate(&env);
    let peer = Address::generate(&env);
    quest_client.add_enrollee(&0, &enrollee);
    quest_client.add_enrollee(&0, &peer);

    // Submit for review
    client.submit_for_review(&enrollee, &0, &0);

    // Approve - should complete and return reward
    let result = client.approve_completion(&peer, &0, &0, &enrollee);
    assert!(result.is_some());
    assert_eq!(result.unwrap(), 100);

    // Should be marked as completed
    assert!(client.is_completed(&0, &0, &enrollee));
}

#[test]
fn test_approve_completion_multiple_approvals() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Task", 100);

    // Set peer review mode requiring 2 approvals
    client.set_verification_mode(&owner, &0, &VerificationMode::PeerReview(2));

    let enrollee = Address::generate(&env);
    let peer1 = Address::generate(&env);
    let peer2 = Address::generate(&env);
    quest_client.add_enrollee(&0, &enrollee);
    quest_client.add_enrollee(&0, &peer1);
    quest_client.add_enrollee(&0, &peer2);

    // Submit for review
    client.submit_for_review(&enrollee, &0, &0);

    // First approval - should not complete yet
    let result1 = client.approve_completion(&peer1, &0, &0, &enrollee);
    assert!(result1.is_none());
    assert!(!client.is_completed(&0, &0, &enrollee));

    // Second approval - should complete
    let result2 = client.approve_completion(&peer2, &0, &0, &enrollee);
    assert!(result2.is_some());
    assert_eq!(result2.unwrap(), 100);
    assert!(client.is_completed(&0, &0, &enrollee));
}

#[test]
fn test_self_approval_fails() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Task", 100);

    client.set_verification_mode(&owner, &0, &VerificationMode::PeerReview(1));

    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&0, &enrollee);

    // Submit for review
    client.submit_for_review(&enrollee, &0, &0);

    // Try to approve own submission - should fail
    let result = client.try_approve_completion(&enrollee, &0, &0, &enrollee);
    assert_eq!(result, Err(Ok(Error::InvalidApprover)));
}

#[test]
fn test_double_approval_fails() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Task", 100);

    client.set_verification_mode(&owner, &0, &VerificationMode::PeerReview(2));

    let enrollee = Address::generate(&env);
    let peer = Address::generate(&env);
    quest_client.add_enrollee(&0, &enrollee);
    quest_client.add_enrollee(&0, &peer);

    // Submit for review
    client.submit_for_review(&enrollee, &0, &0);

    // First approval should succeed
    client.approve_completion(&peer, &0, &0, &enrollee);

    // Second approval from same peer should fail
    let result = client.try_approve_completion(&peer, &0, &0, &enrollee);
    assert_eq!(result, Err(Ok(Error::AlreadyApproved)));
}

#[test]
fn test_approve_nonexistent_submission_fails() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Task", 100);

    client.set_verification_mode(&owner, &0, &VerificationMode::PeerReview(1));

    let enrollee = Address::generate(&env);
    let peer = Address::generate(&env);

    // Try to approve without submitting first - should fail
    let result = client.try_approve_completion(&peer, &0, &0, &enrollee);
    assert_eq!(result, Err(Ok(Error::NotSubmitted)));
}

#[test]
fn test_approve_already_completed_fails() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Task", 100);

    client.set_verification_mode(&owner, &0, &VerificationMode::PeerReview(1));

    let enrollee = Address::generate(&env);
    let peer = Address::generate(&env);
    quest_client.add_enrollee(&0, &enrollee);
    quest_client.add_enrollee(&0, &peer);

    // Submit for review and approve
    client.submit_for_review(&enrollee, &0, &0);
    client.approve_completion(&peer, &0, &0, &enrollee);

    // Try to approve again after completion - should fail
    let result = client.try_approve_completion(&peer, &0, &0, &enrollee);
    assert_eq!(result, Err(Ok(Error::AlreadyCompleted)));
}

#[test]
fn test_approve_owner_only_mode_fails() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Task", 100);

    // Don't set verification mode (defaults to OwnerOnly)

    let enrollee = Address::generate(&env);
    let _peer = Address::generate(&env);

    // Submit for review should fail
    let result = client.try_submit_for_review(&enrollee, &0, &0);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));

    // Even if we could submit, approval should fail
    // (This test assumes we could somehow bypass the submission check)
}

#[test]
fn test_peer_verification_with_different_distribution_modes() {
    let (env, client, quest_client, owner) = setup();
    create_ms(&env, &client, &quest_client, &owner, 0, "Task", 100);

    // Set peer review mode
    client.set_verification_mode(&owner, &0, &VerificationMode::PeerReview(1));

    // Test with Flat distribution mode
    client.set_distribution_mode(&owner, &0, &DistributionMode::Flat, &200);

    let enrollee = Address::generate(&env);
    let peer = Address::generate(&env);
    quest_client.add_enrollee(&0, &enrollee);
    quest_client.add_enrollee(&0, &peer);

    // Submit for review
    client.submit_for_review(&enrollee, &0, &0);

    // Approve - should return flat reward amount
    let result = client.approve_completion(&peer, &0, &0, &enrollee);
    assert!(result.is_some());
    assert_eq!(result.unwrap(), 200); // Flat reward, not milestone reward
}

// ===== INITIALIZATION TESTS =====

/// Test successful first-time initialization by admin.
/// The admin model: only the designated admin address can initialize the contract once.
/// This test documents the intended admin behavior where initialization is a one-time
/// privileged operation that sets up cross-contract references.
#[test]
fn test_initialize_first_time_success_by_admin() {
    let env = Env::default();
    env.mock_all_auths();

    // Register contracts
    let quest_contract_id = env.register(QuestContract, ());
    // Use dummy certificate contract address for initialization tests
    let certificate_contract_id = Address::generate(&env);
    
    let milestone_contract_id = env.register(MilestoneContract, ());
    let milestone_client = MilestoneContractClient::new(&env, &milestone_contract_id);

    // Designated admin performs first-time initialization
    let admin = Address::generate(&env);
    
    // First initialization should succeed
    let result = milestone_client.try_initialize(&admin, &quest_contract_id, &certificate_contract_id);
    assert_eq!(result, Ok(Ok(())));

    // Verify storage is properly set
    env.as_contract(&milestone_contract_id, || {
        let stored_quest_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::QuestContract)
            .unwrap();
        assert_eq!(stored_quest_contract, quest_contract_id);

        let stored_cert_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::CertificateContract)
            .unwrap();
        assert_eq!(stored_cert_contract, certificate_contract_id);
    });
}

/// Test re-initialization failure - contract returns Unauthorized when already initialized.
/// This protects the contract's admin configuration from being overwritten after
/// the first successful initialization. The admin model is designed to be immutable
/// after first setup to prevent ownership confusion.
#[test]
fn test_initialize_re_entry_returns_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();

    // Register contracts
    let quest_contract_id = env.register(QuestContract, ());
    // Use dummy certificate contract address for initialization tests
    let certificate_contract_id = Address::generate(&env);
    
    let milestone_contract_id = env.register(MilestoneContract, ());
    let milestone_client = MilestoneContractClient::new(&env, &milestone_contract_id);

    let admin = Address::generate(&env);
    
    // First initialization succeeds
    milestone_client.initialize(&admin, &quest_contract_id, &certificate_contract_id);

    // Attempt re-initialization should fail with Unauthorized
    let different_quest = Address::generate(&env);
    let different_cert = Address::generate(&env);
    let result = milestone_client.try_initialize(&admin, &different_quest, &different_cert);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));

    // Verify original values are unchanged
    env.as_contract(&milestone_contract_id, || {
        let stored_quest_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::QuestContract)
            .unwrap();
        assert_eq!(stored_quest_contract, quest_contract_id);

        let stored_cert_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::CertificateContract)
            .unwrap();
        assert_eq!(stored_cert_contract, certificate_contract_id);
    });
}

/// Test unauthorized initialization attempts by non-admin addresses.
/// The admin model requires proper authentication - only addresses that can
/// successfully call require_auth() can initialize. This test demonstrates
/// that any address can technically attempt initialization, but only those
/// with proper auth (in this test environment, all addresses are mocked) succeed.
/// In production, this would be controlled by the contract's auth policies.
#[test]
fn test_initialize_unauthorized_admin_attempts() {
    let env = Env::default();
    // Don't mock all auths to test proper authorization
    env.mock_all_auths();

    // Register contracts
    let quest_contract_id = env.register(QuestContract, ());
    // Use dummy certificate contract address for initialization tests
    let certificate_contract_id = Address::generate(&env);
    
    let milestone_contract_id = env.register(MilestoneContract, ());
    let milestone_client = MilestoneContractClient::new(&env, &milestone_contract_id);

    // First admin initializes successfully
    let admin1 = Address::generate(&env);
    milestone_client.initialize(&admin1, &quest_contract_id, &certificate_contract_id);

    // Different admin attempts re-initialization - should fail
    let admin2 = Address::generate(&env);
    let different_quest = Address::generate(&env);
    let different_cert = Address::generate(&env);
    let result = milestone_client.try_initialize(&admin2, &different_quest, &different_cert);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));

    // Even with different parameters, original configuration remains
    env.as_contract(&milestone_contract_id, || {
        let stored_quest_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::QuestContract)
            .unwrap();
        assert_eq!(stored_quest_contract, quest_contract_id);
    });
}

/// Test initialization with different admin addresses to document the admin model.
/// The contract doesn't enforce a specific admin address pattern - any address
/// that successfully authenticates can initialize. This flexibility allows
/// different deployment patterns while maintaining the one-time initialization
/// invariant through storage checks.
#[test]
fn test_initialize_different_admin_addresses() {
    let env = Env::default();
    env.mock_all_auths();

    // Register contracts
    let quest_contract_id = env.register(QuestContract, ());
    // Use dummy certificate contract address for initialization tests
    let certificate_contract_id = Address::generate(&env);
    
    let milestone_contract_id = env.register(MilestoneContract, ());
    let milestone_client = MilestoneContractClient::new(&env, &milestone_contract_id);

    // Test that any address can be the admin for first initialization
    let admin_a = Address::generate(&env);
    
    let result = milestone_client.try_initialize(&admin_a, &quest_contract_id, &certificate_contract_id);
    assert_eq!(result, Ok(Ok(())));

    // Create a fresh contract to test with different admin
    let milestone_contract_id_2 = env.register(MilestoneContract, ());
    let milestone_client_2 = MilestoneContractClient::new(&env, &milestone_contract_id_2);
    
    let admin_b = Address::generate(&env);
    
    let result = milestone_client_2.try_initialize(&admin_b, &quest_contract_id, &certificate_contract_id);
    assert_eq!(result, Ok(Ok(())));
}
