#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

// Import the quest contract for testing
extern crate certificate;
extern crate quest;
use certificate::CertificateContract;
use quest::{QuestContract, QuestContractClient, Visibility};

fn setup() -> (
    Env,
    MilestoneContractClient<'static>,
    QuestContractClient<'static>,
    Address, // milestone admin / default quest owner
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

    // Register certificate contract with milestone contract as owner,
    // so cross-contract minting from milestone passes auth checks.
    let certificate_contract_id =
        env.register(CertificateContract, (milestone_contract_id.clone(),));

    // Initialize milestone contract with quest + certificate contract addresses
    milestone_client.initialize(&admin, &quest_contract_id, &certificate_contract_id);

    (env, milestone_client, quest_client, admin)
}

/// Create a quest owned by `owner` and return its auto-incremented ID.
/// The token address is a random throwaway — milestone logic never reads it.
fn create_quest(env: &Env, quest_client: &QuestContractClient, owner: &Address) -> u32 {
    quest_client.create_quest(
        owner,
        &String::from_str(env, "Quest"),
        &String::from_str(env, "Quest description"),
        &String::from_str(env, "Programming"),
        &Vec::<String>::new(env),
        &Address::generate(env),
        &Visibility::Public,
    )
}

/// Create a milestone inside an existing quest and return its auto-incremented ID.
fn create_ms(
    env: &Env,
    milestone_client: &MilestoneContractClient,
    owner: &Address,
    quest_id: u32,
    title: &str,
    reward: i128,
) -> u32 {
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
    let q_id = create_quest(&env, &quest_client, &owner);
    let id = create_ms(&env, &client, &owner, q_id, "Build your first API", 100);
    assert_eq!(id, 0);
    assert_eq!(client.get_milestone_count(&q_id), 1);

    let ms = client.get_milestone(&q_id, &0);
    assert_eq!(ms.title, String::from_str(&env, "Build your first API"));
    assert_eq!(ms.reward_amount, 100);
    assert_eq!(ms.quest_id, q_id);
}

#[test]
fn test_create_multiple_milestones() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let id0 = create_ms(&env, &client, &owner, q_id, "Task 1", 50);
    let id1 = create_ms(&env, &client, &owner, q_id, "Task 2", 100);
    let id2 = create_ms(&env, &client, &owner, q_id, "Task 3", 200);
    assert_eq!(id0, 0);
    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
    assert_eq!(client.get_milestone_count(&q_id), 3);
}

#[test]
fn test_milestones_per_quest_are_independent() {
    let (env, client, quest_client, owner) = setup();
    let q0 = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q0, "Quest0 Task", 50);
    create_ms(&env, &client, &owner, q0, "Quest0 Task 2", 75);

    let owner2 = Address::generate(&env);
    let q1 = create_quest(&env, &quest_client, &owner2);
    create_ms(&env, &client, &owner2, q1, "Quest1 Task", 100);

    assert_eq!(client.get_milestone_count(&q0), 2);
    assert_eq!(client.get_milestone_count(&q1), 1);
}

#[test]
fn test_get_milestones() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "A", 10);
    create_ms(&env, &client, &owner, q_id, "B", 20);

    let milestones = client.get_milestones(&q_id);
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
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Deploy a contract", 100);

    let enrollee = Address::generate(&env);
    // Enroll the user first (Issue #162 fix requires this)
    quest_client.add_enrollee(&q_id, &enrollee);

    let reward = client.verify_completion(&owner, &q_id, &0, &enrollee);
    assert_eq!(reward, 100);
    assert!(client.is_completed(&q_id, &0, &enrollee));
    assert_eq!(client.get_enrollee_completions(&q_id, &enrollee), 1);
}

#[test]
fn test_verify_multiple_completions() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task 1", 50);
    create_ms(&env, &client, &owner, q_id, "Task 2", 100);

    let enrollee = Address::generate(&env);
    // Enroll the user
    quest_client.add_enrollee(&q_id, &enrollee);

    client.verify_completion(&owner, &q_id, &0, &enrollee);
    client.verify_completion(&owner, &q_id, &1, &enrollee);

    assert_eq!(client.get_enrollee_completions(&q_id, &enrollee), 2);
    assert!(client.is_completed(&q_id, &0, &enrollee));
    assert!(client.is_completed(&q_id, &1, &enrollee));
}

#[test]
fn test_double_verify_fails() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 50);

    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);

    client.verify_completion(&owner, &q_id, &0, &enrollee);

    let result = client.try_verify_completion(&owner, &q_id, &0, &enrollee);
    assert_eq!(result, Err(Ok(Error::AlreadyCompleted)));
}

#[test]
fn test_wrong_owner_cannot_verify() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 50);

    let imposter = Address::generate(&env);
    let enrollee = Address::generate(&env);
    let result = client.try_verify_completion(&imposter, &q_id, &0, &enrollee);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_wrong_owner_cannot_create() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    // First owner creates the quest and a milestone
    create_ms(&env, &client, &owner, q_id, "Task", 50);

    // Different owner tries to add a milestone to the same quest
    let imposter = Address::generate(&env);
    let result = client.try_create_milestone(
        &imposter,
        &q_id,
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
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 50);
    let enrollee = Address::generate(&env);
    assert!(!client.is_completed(&q_id, &0, &enrollee));
    assert_eq!(client.get_enrollee_completions(&q_id, &enrollee), 0);
}

#[test]
fn test_zero_reward_milestone() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let id = create_ms(&env, &client, &owner, q_id, "Free task", 0);
    assert_eq!(id, 0);

    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);

    let reward = client.verify_completion(&owner, &q_id, &0, &enrollee);
    assert_eq!(reward, 0);
}

// --- distribution mode tests ---

#[test]
fn test_get_distribution_mode_defaults_to_custom() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    assert_eq!(client.get_distribution_mode(&q_id), DistributionMode::Custom);
    assert_eq!(client.get_flat_reward(&q_id), None);
}

#[test]
fn test_get_distribution_mode_and_flat_reward_after_set() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Flat, &50);
    assert_eq!(client.get_distribution_mode(&q_id), DistributionMode::Flat);
    assert_eq!(client.get_flat_reward(&q_id), Some(50));
}

#[test]
fn test_custom_mode_uses_per_milestone_amounts() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task 1", 100);
    create_ms(&env, &client, &owner, q_id, "Task 2", 200);

    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Custom, &0);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &e1);
    quest_client.add_enrollee(&q_id, &e2);

    assert_eq!(client.verify_completion(&owner, &q_id, &0, &e1), 100);
    assert_eq!(client.verify_completion(&owner, &q_id, &1, &e2), 200);
}

#[test]
fn test_flat_mode_equal_rewards() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task 1", 100);
    create_ms(&env, &client, &owner, q_id, "Task 2", 999); // per-milestone amount is ignored

    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Flat, &50);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &e1);
    quest_client.add_enrollee(&q_id, &e2);

    assert_eq!(client.verify_completion(&owner, &q_id, &0, &e1), 50);
    assert_eq!(client.verify_completion(&owner, &q_id, &1, &e2), 50);
}

#[test]
fn test_flat_mode_fails_with_zero_reward() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    let result = client.try_set_distribution_mode(&owner, &q_id, &DistributionMode::Flat, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_competitive_mode_first_winners_rewarded() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 100);
    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Competitive(2), &0);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    let e3 = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &e1);
    quest_client.add_enrollee(&q_id, &e2);
    quest_client.add_enrollee(&q_id, &e3);

    // First two get rewards
    assert_eq!(client.verify_completion(&owner, &q_id, &0, &e1), 100);
    assert_eq!(client.verify_completion(&owner, &q_id, &0, &e2), 100);
    // Third gets nothing
    assert_eq!(client.verify_completion(&owner, &q_id, &0, &e3), 0);
}

#[test]
fn test_competitive_mode_limited_winners() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let id1 = create_ms(&env, &client, &owner, q_id, "Task 1", 100);
    let id2 = create_ms(&env, &client, &owner, q_id, "Task 2", 200);
    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Competitive(1), &0);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &e1);
    quest_client.add_enrollee(&q_id, &e2);

    // First completer gets reward, second gets nothing
    assert_eq!(client.verify_completion(&owner, &q_id, &id1, &e1), 100);
    assert_eq!(client.verify_completion(&owner, &q_id, &id1, &e2), 0);
    // Different milestone resets count
    assert_eq!(client.verify_completion(&owner, &q_id, &id2, &e2), 200);
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
    let (env, client, quest_client, _admin) = setup();
    let legitimate_owner = Address::generate(&env);
    let attacker = Address::generate(&env);

    // Legitimate owner creates a quest
    let q_id = create_quest(&env, &quest_client, &legitimate_owner);

    // Attacker tries to create a milestone for it first
    let result = client.try_create_milestone(
        &attacker,
        &q_id,
        &String::from_str(&env, "Attacker backdoor milestone"),
        &String::from_str(&env, "Description"),
        &9999,
    );

    // Attack fails — attacker is not the quest owner
    assert_eq!(result, Err(Ok(Error::OwnerMismatch)));

    // Legitimate owner can create milestones for their own quest
    let id = client.create_milestone(
        &legitimate_owner,
        &q_id,
        &String::from_str(&env, "Real milestone"),
        &String::from_str(&env, "Description"),
        &100,
    );
    assert_eq!(id, 0);

    // Legitimate owner can verify completions
    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);
    let reward = client.verify_completion(&legitimate_owner, &q_id, &0, &enrollee);
    assert_eq!(reward, 100);

    // Attacker cannot verify completions
    let result = client.try_verify_completion(&attacker, &q_id, &0, &enrollee);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

/// HIGH-01: verify_completion accepts any enrollee address without checking
/// whether that address is actually enrolled in the quest. Any arbitrary
/// address can have milestone completion recorded and trigger reward distribution.
#[test]
fn test_verify_completion_enrollee_check() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    // This address has never been enrolled in any quest contract
    let unenrolled = Address::generate(&env);

    // Should fail with NotEnrolled (Issue #162 fix)
    let result = client.try_verify_completion(&owner, &q_id, &0, &unenrolled);
    assert_eq!(result, Err(Ok(Error::NotEnrolled)));
}

#[test]
fn test_get_quest_not_found_fails() {
    let (env, client, _quest_client, owner) = setup();

    // Attempt to create a milestone for a quest that does not exist
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
    let q_id = create_quest(&env, &quest_client, &owner);

    // Set peer review mode requiring 2 approvals
    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(2));
}

#[test]
fn test_submit_for_review() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    // Set peer review mode
    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(2));

    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);

    // Submit for review should succeed
    client.submit_for_review(&enrollee, &q_id, &0);

    // Submitting again should fail
    let result = client.try_submit_for_review(&enrollee, &q_id, &0);
    assert_eq!(result, Err(Ok(Error::AlreadySubmitted)));
}

#[test]
fn test_submit_for_review_owner_only_mode_fails() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    // Don't set verification mode (defaults to OwnerOnly)
    let enrollee = Address::generate(&env);

    // Submit for review should fail in OwnerOnly mode
    let result = client.try_submit_for_review(&enrollee, &q_id, &0);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_approve_completion() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    // Set peer review mode requiring 1 approval
    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(1));

    let enrollee = Address::generate(&env);
    let peer = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);
    quest_client.add_enrollee(&q_id, &peer);

    // Submit for review
    client.submit_for_review(&enrollee, &q_id, &0);

    // Approve - should complete and return reward
    let result = client.approve_completion(&peer, &q_id, &0, &enrollee);
    assert!(result.is_some());
    assert_eq!(result.unwrap(), 100);

    // Should be marked as completed
    assert!(client.is_completed(&q_id, &0, &enrollee));
}

#[test]
fn test_approve_completion_multiple_approvals() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    // Set peer review mode requiring 2 approvals
    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(2));

    let enrollee = Address::generate(&env);
    let peer1 = Address::generate(&env);
    let peer2 = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);
    quest_client.add_enrollee(&q_id, &peer1);
    quest_client.add_enrollee(&q_id, &peer2);

    // Submit for review
    client.submit_for_review(&enrollee, &q_id, &0);

    // First approval - should not complete yet
    let result1 = client.approve_completion(&peer1, &q_id, &0, &enrollee);
    assert!(result1.is_none());
    assert!(!client.is_completed(&q_id, &0, &enrollee));

    // Second approval - should complete
    let result2 = client.approve_completion(&peer2, &q_id, &0, &enrollee);
    assert!(result2.is_some());
    assert_eq!(result2.unwrap(), 100);
    assert!(client.is_completed(&q_id, &0, &enrollee));
}

#[test]
fn test_self_approval_fails() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(1));

    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);

    // Submit for review
    client.submit_for_review(&enrollee, &q_id, &0);

    // Try to approve own submission - should fail
    let result = client.try_approve_completion(&enrollee, &q_id, &0, &enrollee);
    assert_eq!(result, Err(Ok(Error::InvalidApprover)));
}

#[test]
fn test_double_approval_fails() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(2));

    let enrollee = Address::generate(&env);
    let peer = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);
    quest_client.add_enrollee(&q_id, &peer);

    // Submit for review
    client.submit_for_review(&enrollee, &q_id, &0);

    // First approval should succeed
    client.approve_completion(&peer, &q_id, &0, &enrollee);

    // Second approval from same peer should fail
    let result = client.try_approve_completion(&peer, &q_id, &0, &enrollee);
    assert_eq!(result, Err(Ok(Error::AlreadyApproved)));
}

#[test]
fn test_approve_nonexistent_submission_fails() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(1));

    let enrollee = Address::generate(&env);
    let peer = Address::generate(&env);

    // Try to approve without submitting first - should fail
    let result = client.try_approve_completion(&peer, &q_id, &0, &enrollee);
    assert_eq!(result, Err(Ok(Error::NotSubmitted)));
}

#[test]
fn test_approve_already_completed_fails() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(1));

    let enrollee = Address::generate(&env);
    let peer = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);
    quest_client.add_enrollee(&q_id, &peer);

    // Submit for review and approve
    client.submit_for_review(&enrollee, &q_id, &0);
    client.approve_completion(&peer, &q_id, &0, &enrollee);

    // Try to approve again after completion - should fail
    let result = client.try_approve_completion(&peer, &q_id, &0, &enrollee);
    assert_eq!(result, Err(Ok(Error::AlreadyCompleted)));
}

#[test]
fn test_approve_owner_only_mode_fails() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    // Don't set verification mode (defaults to OwnerOnly)
    let enrollee = Address::generate(&env);

    // Submission is the gatekeeper in OwnerOnly mode; approval is unreachable
    let result = client.try_submit_for_review(&enrollee, &q_id, &0);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_peer_verification_with_different_distribution_modes() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    // Set peer review mode
    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(1));

    // Test with Flat distribution mode
    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Flat, &200);

    let enrollee = Address::generate(&env);
    let peer = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);
    quest_client.add_enrollee(&q_id, &peer);

    // Submit for review
    client.submit_for_review(&enrollee, &q_id, &0);

    // Approve - should return flat reward amount
    let result = client.approve_completion(&peer, &q_id, &0, &enrollee);
    assert!(result.is_some());
    assert_eq!(result.unwrap(), 200); // Flat reward, not milestone reward
}
