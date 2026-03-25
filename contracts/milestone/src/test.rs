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

    // Register milestone contract
    let milestone_contract_id = env.register(MilestoneContract, ());
    let milestone_client = MilestoneContractClient::new(&env, &milestone_contract_id);

    let admin = Address::generate(&env);

    // Initialize milestone contract with quest contract address
    milestone_client.initialize(&admin, &quest_contract_id);

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
    let (env, client, quest_client, owner) = setup();
    
    // Attempt to create milestone for non-existent quest
    let result = client.try_create_milestone(
        &owner,
        &99,
        &String::from_str(&env, "Title"),
        &String::from_str(&env, "Desc"),
        &100
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
