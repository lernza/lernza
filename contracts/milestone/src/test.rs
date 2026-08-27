use super::*;
use soroban_sdk::{
    testutils::Address as _, testutils::Events, testutils::Ledger as _, Address, Env, String, Vec,
};

// Import the quest contract for testing
extern crate certificate;
extern crate quest;
use certificate::CertificateContract;
use common::Visibility;
use quest::{QuestContract, QuestContractClient};
use testutils::setup_milestone;

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
        &None,
        &None,
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
        &false,
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
fn test_pause_blocks_milestone_writes_until_unpaused() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    assert!(!client.is_paused());
    client.pause(&owner);
    assert!(client.is_paused());

    let create_result = client.try_create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Paused"),
        &String::from_str(&env, "Should fail while paused"),
        &100,
        &false,
    );
    assert_eq!(create_result, Err(Ok(Error::Paused)));

    client.unpause(&owner);
    let milestone_id = create_ms(&env, &client, &owner, q_id, "Task 1", 50);
    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);

    client.pause(&owner);
    let verify_result = client.try_verify_completion(&owner, &q_id, &milestone_id, &enrollee);
    assert_eq!(verify_result, Err(Ok(Error::Paused)));

    client.unpause(&owner);
    assert_eq!(
        client.verify_completion(&owner, &q_id, &milestone_id, &enrollee),
        50
    );
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
fn test_get_milestones_empty() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    let milestones = client.get_milestones(&q_id);
    assert_eq!(milestones.len(), 0);
    assert_eq!(client.get_milestone_count(&q_id), 0);

    let _ = env;
}

#[test]
fn test_get_milestones_with_milestones() {
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
    assert_eq!(client.get_milestone_count(&q_id), 2);
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
fn test_verify_completion_requires_previous() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task 1", 50);
    let sequential_id = client.create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Task 2"),
        &String::from_str(&env, "Description"),
        &100,
        &true,
    );

    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);

    let blocked = client.try_verify_completion(&owner, &q_id, &sequential_id, &enrollee);
    assert_eq!(blocked, Err(Ok(Error::MilestoneNotUnlocked)));

    client.verify_completion(&owner, &q_id, &0, &enrollee);
    let reward = client.verify_completion(&owner, &q_id, &sequential_id, &enrollee);
    assert_eq!(reward, 100);
}

#[test]
fn test_branching_prerequisites_require_all_dependencies() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let first = create_ms(&env, &client, &owner, q_id, "First", 50);
    let second = create_ms(&env, &client, &owner, q_id, "Second", 50);
    let branch = client.create_milestone_with_prerequisites(
        &owner,
        &q_id,
        &String::from_str(&env, "Branch"),
        &String::from_str(&env, "Requires both branches"),
        &100,
        &soroban_sdk::vec![&env, first, second],
    );
    assert_eq!(
        client.get_milestone_prerequisites(&q_id, &branch),
        soroban_sdk::vec![&env, first, second]
    );

    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);
    assert_eq!(
        client.try_verify_completion(&owner, &q_id, &branch, &enrollee),
        Err(Ok(Error::MilestoneNotUnlocked))
    );
    client.verify_completion(&owner, &q_id, &first, &enrollee);
    assert_eq!(
        client.try_verify_completion(&owner, &q_id, &branch, &enrollee),
        Err(Ok(Error::MilestoneNotUnlocked))
    );
    client.verify_completion(&owner, &q_id, &second, &enrollee);
    assert_eq!(
        client.verify_completion(&owner, &q_id, &branch, &enrollee),
        100
    );
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
        &false,
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
    // reward_amount must be > 0; zero reward is now rejected at creation time
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let result = client.try_create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Free task"),
        &String::from_str(&env, "Description"),
        &0,
        &false,
    );
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

// --- distribution mode tests ---

#[test]
fn test_get_distribution_mode_defaults_to_custom() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    assert_eq!(
        client.get_distribution_mode(&q_id),
        DistributionMode::Custom
    );
    assert_eq!(client.get_flat_reward(&q_id), None);
}

#[test]
fn test_get_distribution_mode_and_flat_reward_after_set() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Flat, &50);
    assert_eq!(client.get_distribution_mode(&q_id), DistributionMode::Flat);
    assert_eq!(client.get_flat_reward(&q_id), Some(50));

    create_ms(&env, &client, &owner, q_id, "Task", 100);
}

#[test]
fn test_percentage_mode_rounding_to_nearest() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    // Set Percentage mode to 75%
    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Percentage(75), &0);

    // Milestone with reward_amount 101 to exercise rounding (75% -> 75.75)
    create_ms(&env, &client, &owner, q_id, "Task", 101);

    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);

    // 75% of 101 = 75.75 -> rounded to nearest = 76
    assert_eq!(client.verify_completion(&owner, &q_id, &0, &enrollee), 76);

    // Now test exact case: 100 * 75% = 75
    let q2 = create_quest(&env, &quest_client, &owner);
    client.set_distribution_mode(&owner, &q2, &DistributionMode::Percentage(75), &0);
    create_ms(&env, &client, &owner, q2, "Task2", 100);
    let e2 = Address::generate(&env);
    quest_client.add_enrollee(&q2, &e2);
    assert_eq!(client.verify_completion(&owner, &q2, &0, &e2), 75);
}

#[test]
fn test_custom_mode_uses_per_milestone_amounts() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Custom, &0);
    create_ms(&env, &client, &owner, q_id, "Task 1", 100);
    create_ms(&env, &client, &owner, q_id, "Task 2", 200);

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

    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Flat, &50);
    create_ms(&env, &client, &owner, q_id, "Task 1", 100);
    create_ms(&env, &client, &owner, q_id, "Task 2", 999); // per-milestone amount is ignored

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
    assert_eq!(
        client.get_distribution_mode(&q_id),
        DistributionMode::Custom
    );
    assert_eq!(client.get_flat_reward(&q_id), None);
}

#[test]
fn test_competitive_mode_fails_with_zero_winners() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    let result =
        client.try_set_distribution_mode(&owner, &q_id, &DistributionMode::Competitive(0), &0);
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
    assert_eq!(
        client.get_distribution_mode(&q_id),
        DistributionMode::Custom
    );
    assert_eq!(client.get_flat_reward(&q_id), None);
}

#[test]
fn test_competitive_mode_rejects_excessive_winner_limit() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let result =
        client.try_set_distribution_mode(&owner, &q_id, &DistributionMode::Competitive(1_001), &0);
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_competitive_mode_first_winners_rewarded() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Competitive(2), &0);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

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
    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Competitive(1), &0);
    let id1 = create_ms(&env, &client, &owner, q_id, "Task 1", 100);
    let id2 = create_ms(&env, &client, &owner, q_id, "Task 2", 200);

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

// ---- Distribution mode comprehensive tests ----

#[test]
fn test_flat_mode_distributes_equal_rewards_to_all() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    // Set Flat mode with equal reward of 50 for all
    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Flat, &50);

    // Create multiple milestones with different reward amounts (ignored in Flat mode)
    create_ms(&env, &client, &owner, q_id, "Task 1", 100);
    create_ms(&env, &client, &owner, q_id, "Task 2", 200);
    create_ms(&env, &client, &owner, q_id, "Task 3", 300);

    // Add three enrollees
    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    let e3 = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &e1);
    quest_client.add_enrollee(&q_id, &e2);
    quest_client.add_enrollee(&q_id, &e3);

    // All enrollees get the same flat reward regardless of which milestone they complete
    assert_eq!(client.verify_completion(&owner, &q_id, &0, &e1), 50);
    assert_eq!(client.verify_completion(&owner, &q_id, &1, &e2), 50);
    assert_eq!(client.verify_completion(&owner, &q_id, &2, &e3), 50);

    // Same enrollee completing different milestones also gets flat reward
    let e4 = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &e4);
    assert_eq!(client.verify_completion(&owner, &q_id, &0, &e4), 50);
    assert_eq!(client.verify_completion(&owner, &q_id, &1, &e4), 50);
}

#[test]
fn test_competitive_mode_rewards_faster_completers() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    // Set Competitive mode: only first 2 completers get rewarded
    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Competitive(2), &0);

    // Create a milestone with 100 token reward
    let ms_id = create_ms(&env, &client, &owner, q_id, "Speed Task", 100);

    // Add five enrollees
    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    let e3 = Address::generate(&env);
    let e4 = Address::generate(&env);
    let e5 = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &e1);
    quest_client.add_enrollee(&q_id, &e2);
    quest_client.add_enrollee(&q_id, &e3);
    quest_client.add_enrollee(&q_id, &e4);
    quest_client.add_enrollee(&q_id, &e5);

    // First two completers get full reward (100 tokens each)
    assert_eq!(client.verify_completion(&owner, &q_id, &ms_id, &e1), 100);
    assert_eq!(client.verify_completion(&owner, &q_id, &ms_id, &e2), 100);

    // Third, fourth, and fifth get nothing (limit reached)
    assert_eq!(client.verify_completion(&owner, &q_id, &ms_id, &e3), 0);
    assert_eq!(client.verify_completion(&owner, &q_id, &ms_id, &e4), 0);
    assert_eq!(client.verify_completion(&owner, &q_id, &ms_id, &e5), 0);
}

#[test]
fn test_competitive_mode_per_milestone_limits() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    // Set Competitive mode: only 1 winner per milestone
    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Competitive(1), &0);

    // Create two milestones, each with limit of 1 winner
    let ms1 = create_ms(&env, &client, &owner, q_id, "Task A", 150);
    let ms2 = create_ms(&env, &client, &owner, q_id, "Task B", 200);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &e1);
    quest_client.add_enrollee(&q_id, &e2);

    // e1 completes milestone 1 first -> gets 150
    assert_eq!(client.verify_completion(&owner, &q_id, &ms1, &e1), 150);

    // e2 tries same milestone -> gets 0 (limit reached for ms1)
    assert_eq!(client.verify_completion(&owner, &q_id, &ms1, &e2), 0);

    // e2 completes milestone 2 first -> gets 200 (fresh limit for ms2)
    assert_eq!(client.verify_completion(&owner, &q_id, &ms2, &e2), 200);

    // e1 tries milestone 2 -> gets 0 (limit reached for ms2)
    assert_eq!(client.verify_completion(&owner, &q_id, &ms2, &e1), 0);
}

#[test]
fn test_custom_mode_uses_configured_per_milestone_rewards() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    // Explicitly set Custom mode (this is the default, but being explicit)
    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Custom, &0);

    // Create milestones with different reward amounts
    create_ms(&env, &client, &owner, q_id, "Easy Task", 25);
    create_ms(&env, &client, &owner, q_id, "Medium Task", 75);
    create_ms(&env, &client, &owner, q_id, "Hard Task", 150);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    let e3 = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &e1);
    quest_client.add_enrollee(&q_id, &e2);
    quest_client.add_enrollee(&q_id, &e3);

    // Each milestone pays its configured reward amount
    assert_eq!(client.verify_completion(&owner, &q_id, &0, &e1), 25);
    assert_eq!(client.verify_completion(&owner, &q_id, &1, &e2), 75);
    assert_eq!(client.verify_completion(&owner, &q_id, &2, &e3), 150);
}

#[test]
fn test_mode_cannot_change_after_milestones_exist() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    // Attempt to switch to Flat mode after milestones exist
    let result = client.try_set_distribution_mode(&owner, &q_id, &DistributionMode::Flat, &50);
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_same_distribution_mode_can_be_reapplied_after_milestones_exist() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Custom, &0);
    assert_eq!(
        client.get_distribution_mode(&q_id),
        DistributionMode::Custom
    );
}

#[test]
fn test_flat_mode_with_zero_enrollees() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    // Set Flat mode
    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Flat, &75);

    create_ms(&env, &client, &owner, q_id, "Lonely Task", 100);

    // No enrollees added - quest has no participants
    // Attempting to verify completion for non-enrollee should fail
    let random_addr = Address::generate(&env);
    let result = client.try_verify_completion(&owner, &q_id, &0, &random_addr);
    assert_eq!(result, Err(Ok(Error::NotEnrolled)));
}

#[test]
fn test_competitive_mode_with_zero_enrollees() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    // Set Competitive mode with limit of 3 winners
    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Competitive(3), &0);

    create_ms(&env, &client, &owner, q_id, "Empty Competition", 100);

    // No enrollees - any completion attempt should fail
    let random_addr = Address::generate(&env);
    let result = client.try_verify_completion(&owner, &q_id, &0, &random_addr);
    assert_eq!(result, Err(Ok(Error::NotEnrolled)));
}

#[test]
fn test_custom_mode_with_zero_enrollees() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Unclaimed Task", 100);

    // Custom mode is default, no enrollees added
    let random_addr = Address::generate(&env);
    let result = client.try_verify_completion(&owner, &q_id, &0, &random_addr);
    assert_eq!(result, Err(Ok(Error::NotEnrolled)));
}

#[test]
fn test_flat_mode_rejects_zero_reward() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    // Flat mode requires positive reward because:
    // 1. A zero reward would make completion pointless for learners
    // 2. It could be used to grief quests by setting meaningless rewards
    // 3. The contract enforces reward > 0 to ensure meaningful incentives
    let result = client.try_set_distribution_mode(&owner, &q_id, &DistributionMode::Flat, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));

    // Negative reward also rejected
    let result = client.try_set_distribution_mode(&owner, &q_id, &DistributionMode::Flat, &-10);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_distribution_mode_persists_across_milestones() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    // Set Flat mode before creating milestones
    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Flat, &60);

    // Create milestones after mode is set
    // Note: Milestones are created with their own reward_amount (100, 200),
    // but Flat mode ignores these and uses the quest-level flat_reward (60)
    // This allows quest owners to set a single reward for all milestones,
    // simplifying reward management for uniform tasks
    create_ms(&env, &client, &owner, q_id, "Task 1", 100);
    create_ms(&env, &client, &owner, q_id, "Task 2", 200);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &e1);
    quest_client.add_enrollee(&q_id, &e2);

    // Both milestones use flat reward (60), ignoring their configured amounts (100, 200)
    assert_eq!(client.verify_completion(&owner, &q_id, &0, &e1), 60);
    assert_eq!(client.verify_completion(&owner, &q_id, &1, &e2), 60);
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
        &false,
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
        &false,
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
        &false,
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
fn test_peer_review_rejects_invalid_approval_bounds() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    let zero = client.try_set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(0));
    assert_eq!(zero, Err(Ok(Error::InvalidInput)));

    let excessive =
        client.try_set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(101));
    assert_eq!(excessive, Err(Ok(Error::InvalidInput)));
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
fn test_suspended_enrollee_pending_reviews_release_reserved_reward() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let ms1 = create_ms(&env, &client, &owner, q_id, "Task 1", 100);
    let ms2 = create_ms(&env, &client, &owner, q_id, "Task 2", 150);

    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(2));

    let enrollee = Address::generate(&env);
    let peer = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);
    quest_client.add_enrollee(&q_id, &peer);

    client.submit_for_review(&enrollee, &q_id, &ms1);
    client.submit_for_review(&enrollee, &q_id, &ms2);
    assert_eq!(client.get_total_reserved_reward(&q_id), 250);

    client.approve_completion(&peer, &q_id, &ms1, &enrollee);

    quest_client.set_enrollee_status(&q_id, &enrollee, &EnrolleeStatus::Suspended);
    let released = client.handle_suspended_enrollee(&owner, &q_id, &enrollee);

    assert_eq!(released, 250);
    assert_eq!(client.get_total_reserved_reward(&q_id), 0);
    assert_eq!(
        client.try_approve_completion(&peer, &q_id, &ms1, &enrollee),
        Err(Ok(Error::NotSubmitted))
    );
    assert_eq!(
        client.try_submit_for_review(&enrollee, &q_id, &ms1),
        Err(Ok(Error::NotEnrolled))
    );
}

#[test]
fn test_suspension_cleanup_preserves_completed_reserved_rewards() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let ms1 = create_ms(&env, &client, &owner, q_id, "Completed", 100);
    let ms2 = create_ms(&env, &client, &owner, q_id, "Pending", 150);

    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(1));

    let enrollee = Address::generate(&env);
    let peer = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);
    quest_client.add_enrollee(&q_id, &peer);

    client.submit_for_review(&enrollee, &q_id, &ms1);
    assert_eq!(
        client.approve_completion(&peer, &q_id, &ms1, &enrollee),
        Some(100)
    );
    client.submit_for_review(&enrollee, &q_id, &ms2);
    assert_eq!(client.get_total_reserved_reward(&q_id), 250);

    quest_client.set_enrollee_status(&q_id, &enrollee, &EnrolleeStatus::Suspended);
    let released = client.handle_suspended_enrollee(&owner, &q_id, &enrollee);

    assert_eq!(released, 150);
    assert_eq!(client.get_total_reserved_reward(&q_id), 100);
    assert!(client.is_completed(&q_id, &ms1, &enrollee));
}

#[test]
fn test_peer_review_respects_sequential_unlocks() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task 1", 50);
    client.create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Task 2"),
        &String::from_str(&env, "Description"),
        &100,
        &true,
    );

    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(1));

    let enrollee = Address::generate(&env);
    let peer = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);
    quest_client.add_enrollee(&q_id, &peer);

    let blocked = client.try_submit_for_review(&enrollee, &q_id, &1);
    assert_eq!(blocked, Err(Ok(Error::MilestoneNotUnlocked)));

    client.verify_completion(&owner, &q_id, &0, &enrollee);
    client.submit_for_review(&enrollee, &q_id, &1);
    let approved = client.approve_completion(&peer, &q_id, &1, &enrollee);
    assert_eq!(approved, Some(100));
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

    // Test with Flat distribution mode
    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Flat, &200);

    // Set peer review mode
    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(1));

    create_ms(&env, &client, &owner, q_id, "Task", 100);

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

// ── create_milestone input-validation tests ───────────────────────────────────

#[test]
fn test_create_milestone_empty_title() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let result = client.try_create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, ""),
        &String::from_str(&env, "Valid description"),
        &100,
        &false,
    );
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_create_milestone_empty_description() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let result = client.try_create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Valid Title"),
        &String::from_str(&env, ""),
        &100,
        &false,
    );
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_create_milestone_very_long_title() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let bytes = [b'a'; 129]; // MAX_MILESTONE_TITLE_LEN is 128
    let long_title = String::from_bytes(&env, &bytes);
    let result = client.try_create_milestone(
        &owner,
        &q_id,
        &long_title,
        &String::from_str(&env, "Valid description"),
        &100,
        &false,
    );
    assert_eq!(result, Err(Ok(Error::TitleTooLong)));
}

#[test]
fn test_create_milestone_very_long_description() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let bytes = [b'a'; 1001]; // MAX_MILESTONE_DESCRIPTION_LEN is 1000
    let long_desc = String::from_bytes(&env, &bytes);
    let result = client.try_create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Valid Title"),
        &long_desc,
        &100,
        &false,
    );
    assert_eq!(result, Err(Ok(Error::DescriptionTooLong)));
}

#[test]
fn test_create_milestone_negative_reward() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let result = client.try_create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Valid Title"),
        &String::from_str(&env, "Valid description"),
        &-1,
        &false,
    );
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_create_milestone_zero_reward() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let result = client.try_create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Valid Title"),
        &String::from_str(&env, "Valid description"),
        &0,
        &false,
    );
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_create_milestone_reward_too_large() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let result = client.try_create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Valid Title"),
        &String::from_str(&env, "Valid description"),
        &(MAX_REWARD_AMOUNT + 1),
        &false,
    );
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_create_milestone_max_reward_amount_succeeds() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let id = client.create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Valid Title"),
        &String::from_str(&env, "Valid description"),
        &MAX_REWARD_AMOUNT,
        &false,
    );
    assert_eq!(id, 0);
}

#[test]
fn test_create_milestone_max_length_title_succeeds() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let bytes = [b'a'; 128]; // exactly MAX_MILESTONE_TITLE_LEN — should succeed
    let max_title = String::from_bytes(&env, &bytes);
    let id = client.create_milestone(
        &owner,
        &q_id,
        &max_title,
        &String::from_str(&env, "Valid description"),
        &100,
        &false,
    );
    assert_eq!(id, 0);
}

#[test]
fn test_create_milestone_max_length_description_succeeds() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let bytes = [b'a'; 1000]; // exactly MAX_MILESTONE_DESCRIPTION_LEN — should succeed
    let max_desc = String::from_bytes(&env, &bytes);
    let id = client.create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Valid Title"),
        &max_desc,
        &100,
        &false,
    );
    assert_eq!(id, 0);
}

#[test]
fn test_create_milestones_batch_success() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    let mut milestones = Vec::new(&env);
    milestones.push_back(MilestoneInput {
        title: String::from_str(&env, "M1"),
        description: String::from_str(&env, "D1"),
        reward_amount: 100,
        requires_previous: false,
    });
    milestones.push_back(MilestoneInput {
        title: String::from_str(&env, "M2"),
        description: String::from_str(&env, "D2"),
        reward_amount: 200,
        requires_previous: true,
    });

    let ids = client.create_milestones_batch(&owner, &q_id, &milestones);
    assert_eq!(ids.len(), 2);
    assert_eq!(ids.get(0).unwrap(), 0);
    assert_eq!(ids.get(1).unwrap(), 1);

    // Verify independent creation
    let m1 = client.get_milestone(&q_id, &0);
    assert_eq!(m1.title, String::from_str(&env, "M1"));
    let m2 = client.get_milestone(&q_id, &1);
    assert_eq!(m2.title, String::from_str(&env, "M2"));
}

#[test]
fn test_create_milestones_batch_oversized_rejection() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    let mut milestones = Vec::new(&env);
    for _ in 0..21 {
        // 21 is > limit of 20
        milestones.push_back(MilestoneInput {
            title: String::from_str(&env, "M"),
            description: String::from_str(&env, "D"),
            reward_amount: 100,
            requires_previous: false,
        });
    }

    let result = client.try_create_milestones_batch(&owner, &q_id, &milestones);
    assert_eq!(result, Err(Ok(Error::BatchTooLarge)));
}

#[test]
fn test_create_milestones_batch_atomic_validation() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    let mut milestones = Vec::new(&env);
    milestones.push_back(MilestoneInput {
        title: String::from_str(&env, "Valid"),
        description: String::from_str(&env, "Valid"),
        reward_amount: 100,
        requires_previous: false,
    });
    milestones.push_back(MilestoneInput {
        title: String::from_str(&env, ""), // INVALID
        description: String::from_str(&env, "Valid"),
        reward_amount: 100,
        requires_previous: false,
    });

    let result = client.try_create_milestones_batch(&owner, &q_id, &milestones);
    assert_eq!(result, Err(Ok(Error::InvalidInput)));

    // Verify NO milestones were created (atomic)
    let milestones_list = client.get_milestones(&q_id);
    assert_eq!(milestones_list.len(), 0);
}

// -- MAX_MILESTONES cap tests --

/// Prove the milestone cap works: 50 milestones succeed, the 51st is rejected.
#[test]
fn test_create_milestone_exceeds_max_milestones() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    // Create exactly MAX_MILESTONES (50) milestones, all must succeed
    for i in 0..MAX_MILESTONES {
        let title = String::from_str(&env, "MS");
        let id = client.create_milestone(
            &owner,
            &q_id,
            &title,
            &String::from_str(&env, "Desc"),
            &1,
            &false,
        );
        assert_eq!(id, i);
    }
    assert_eq!(client.get_milestone_count(&q_id), MAX_MILESTONES);

    // The 51st must be rejected with InvalidInput
    let result = client.try_create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Overflow"),
        &String::from_str(&env, "Desc"),
        &1,
        &false,
    );
    assert_eq!(result, Err(Ok(Error::InvalidInput)));

    // Count must remain unchanged
    assert_eq!(client.get_milestone_count(&q_id), MAX_MILESTONES);
}

/// Boundary: the 50th milestone (id=49) succeeds; the 51st (id=50) fails.
#[test]
fn test_create_milestone_at_boundary() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    // Fill up to MAX_MILESTONES - 1
    for _ in 0..(MAX_MILESTONES - 1) {
        client.create_milestone(
            &owner,
            &q_id,
            &String::from_str(&env, "MS"),
            &String::from_str(&env, "D"),
            &1,
            &false,
        );
    }
    assert_eq!(client.get_milestone_count(&q_id), MAX_MILESTONES - 1);

    // The last allowed milestone (id = 49) must succeed
    let last_id = client.create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Last"),
        &String::from_str(&env, "D"),
        &1,
        &false,
    );
    assert_eq!(last_id, MAX_MILESTONES - 1);
    assert_eq!(client.get_milestone_count(&q_id), MAX_MILESTONES);

    // One more must fail
    let result = client.try_create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Over"),
        &String::from_str(&env, "D"),
        &1,
        &false,
    );
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
}

/// Milestone cap is per-quest, filling one quest does not block another.
#[test]
fn test_milestone_cap_per_quest_independent() {
    let (env, client, quest_client, owner) = setup();
    let q1 = create_quest(&env, &quest_client, &owner);
    let q2 = create_quest(&env, &quest_client, &owner);

    // Fill q1 to the cap
    for _ in 0..MAX_MILESTONES {
        client.create_milestone(
            &owner,
            &q1,
            &String::from_str(&env, "MS"),
            &String::from_str(&env, "D"),
            &1,
            &false,
        );
    }

    // q1 is full
    let result = client.try_create_milestone(
        &owner,
        &q1,
        &String::from_str(&env, "Over"),
        &String::from_str(&env, "D"),
        &1,
        &false,
    );
    assert_eq!(result, Err(Ok(Error::InvalidInput)));

    // q2 must still accept milestones
    let id = client.create_milestone(
        &owner,
        &q2,
        &String::from_str(&env, "First"),
        &String::from_str(&env, "D"),
        &1,
        &false,
    );
    assert_eq!(id, 0);
    assert_eq!(client.get_milestone_count(&q2), 1);
}

#[test]
fn test_get_quest_completion_rate() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    // Create 2 milestones
    create_ms(&env, &client, &owner, q_id, "M1", 100);
    create_ms(&env, &client, &owner, q_id, "M2", 100);

    // Enroll 4 users
    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    let e3 = Address::generate(&env);
    let e4 = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &e1);
    quest_client.add_enrollee(&q_id, &e2);
    quest_client.add_enrollee(&q_id, &e3);
    quest_client.add_enrollee(&q_id, &e4);

    // Initial rate should be 0
    assert_eq!(client.get_quest_completion_rate(&q_id, &0, &4), 0);

    // e1 completes both (100%)
    client.verify_completion(&owner, &q_id, &0, &e1);
    client.verify_completion(&owner, &q_id, &1, &e1);

    // e2 completes only one (50% progress, but quest completion is 0 since only e1 finished all)
    client.verify_completion(&owner, &q_id, &0, &e2);

    // Current rate: 1/4 = 25%
    assert_eq!(client.get_quest_completion_rate(&q_id, &0, &4), 25);

    // e3 completes both
    client.verify_completion(&owner, &q_id, &0, &e3);
    client.verify_completion(&owner, &q_id, &1, &e3);

    // Current rate: 2/4 = 50%
    assert_eq!(client.get_quest_completion_rate(&q_id, &0, &4), 50);

    // e4 completes both
    client.verify_completion(&owner, &q_id, &0, &e4);
    client.verify_completion(&owner, &q_id, &1, &e4);

    // Current rate: 3/4 = 75%
    assert_eq!(client.get_quest_completion_rate(&q_id, &0, &4), 75);

    // e2 completes the second one
    client.verify_completion(&owner, &q_id, &1, &e2);

    // Current rate: 4/4 = 100%
    assert_eq!(client.get_quest_completion_rate(&q_id, &0, &4), 100);
}

#[test]
fn test_create_milestone_0_cannot_require_previous() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    // Attempting to create milestone 0 with requires_previous=true
    let result = client.try_create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "MS0"),
        &String::from_str(&env, "Desc"),
        &100,
        &true,
    );

    // Should fail with InvalidInput
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_create_milestones_batch_0_cannot_require_previous() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    let mut batch = Vec::new(&env);
    batch.push_back(MilestoneInput {
        title: String::from_str(&env, "MS0"),
        description: String::from_str(&env, "Desc"),
        reward_amount: 100,
        requires_previous: true,
    });

    let result = client.try_create_milestones_batch(&owner, &q_id, &batch);
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_verify_completion_fails_if_flat_reward_missing() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    // Set mode to Flat manually in storage without setting FlatReward
    env.as_contract(&client.address, || {
        env.storage()
            .persistent()
            .set(&DataKey::Mode(q_id), &DistributionMode::Flat);
    });

    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);

    let result = client.try_verify_completion(&owner, &q_id, &0, &enrollee);
    assert_eq!(result, Err(Ok(Error::FlatRewardNotConfigured)));
}

// --- Snapshot distribution mode at submission (issue #863) ---

#[test]
fn test_approval_uses_snapshot_when_mode_changed_mid_flow() {
    // Submission happens under Flat=50. The snapshot taken at submission
    // time is used at approval, so even though mode changes are now blocked
    // after milestone creation, the snapshot mechanism protects against
    // theoretical mid-flow changes.
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Flat, &50);
    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(1));
    create_ms(&env, &client, &owner, q_id, "Task", 200);

    let enrollee = Address::generate(&env);
    let peer = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);
    quest_client.add_enrollee(&q_id, &peer);

    client.submit_for_review(&enrollee, &q_id, &0);

    let result = client.approve_completion(&peer, &q_id, &0, &enrollee);
    // Snapshot reward (Flat=50), NOT the milestone reward (200).
    assert_eq!(result, Some(50));
}

#[test]
fn test_approval_under_competitive_uses_snapshot_reward_amount() {
    // Snapshot also captures the milestone reward_amount at submission
    // time. Even if the milestone is later considered under a different
    // mode (Competitive here), the snapshot value is paid.
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Competitive(1), &0);
    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(1));
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    let enrollee = Address::generate(&env);
    let peer = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);
    quest_client.add_enrollee(&q_id, &peer);

    client.submit_for_review(&enrollee, &q_id, &0);

    // First (only) winner gets the milestone reward.
    let result = client.approve_completion(&peer, &q_id, &0, &enrollee);
    assert_eq!(result, Some(100));
}

// --- Competitive distribution invariant (issue #859) ---

#[test]
fn test_competitive_max_winners_one_does_not_double_pay() {
    // In Competitive(max_winners=1) the FIRST enrollee gets the reward and
    // any subsequent enrollee gets 0 — the comp_key tombstone must be in
    // place before the cnt bump so a same-enrollee retry returns
    // AlreadyCompleted rather than double-paying.
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Competitive(1), &0);
    create_ms(&env, &client, &owner, q_id, "Task", 100);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    let e3 = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &e1);
    quest_client.add_enrollee(&q_id, &e2);
    quest_client.add_enrollee(&q_id, &e3);

    assert_eq!(client.verify_completion(&owner, &q_id, &0, &e1), 100);
    assert_eq!(client.verify_completion(&owner, &q_id, &0, &e2), 0);
    assert_eq!(client.verify_completion(&owner, &q_id, &0, &e3), 0);

    // A retry for the same enrollee + milestone must NOT bump the cnt or
    // pay again.
    let retry = client.try_verify_completion(&owner, &q_id, &0, &e1);
    assert_eq!(retry, Err(Ok(Error::AlreadyCompleted)));
}

// --- Paginated quest completion rate (issue #865) ---

#[test]
fn test_completion_rate_rejects_unbounded_limits() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "M1", 100);

    // limit == 0 is rejected — callers must opt in to a window.
    let err = client.try_get_quest_completion_rate(&q_id, &0, &0);
    assert_eq!(err, Err(Ok(Error::InvalidInput)));

    // limit > MAX_COMPLETION_RATE_PAGE (100) is rejected.
    let err = client.try_get_quest_completion_rate(&q_id, &0, &101);
    assert_eq!(err, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_completion_rate_offset_beyond_total_returns_zero() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "M1", 100);

    let e1 = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &e1);

    // 1 enrollee total; offset=10 is past the end → 0.
    assert_eq!(client.get_quest_completion_rate(&q_id, &10, &5), 0);
}

#[test]
fn test_enrollee_progress_offset_beyond_milestones_returns_empty_page() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "M1", 100);
    let enrollee = Address::generate(&env);

    let progress = client.get_enrollee_progress(&q_id, &enrollee, &u32::MAX, &100);
    assert_eq!(progress.total_milestones, 1);
    assert_eq!(progress.completions, 0);
    assert_eq!(progress.total_earned, 0);
    assert!(progress.completion_details.is_empty());
}

#[test]
fn test_completion_rate_windowed() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    create_ms(&env, &client, &owner, q_id, "M1", 100);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    let e3 = Address::generate(&env);
    let e4 = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &e1);
    quest_client.add_enrollee(&q_id, &e2);
    quest_client.add_enrollee(&q_id, &e3);
    quest_client.add_enrollee(&q_id, &e4);

    // e1 and e3 finish the quest.
    client.verify_completion(&owner, &q_id, &0, &e1);
    client.verify_completion(&owner, &q_id, &0, &e3);

    // Window over the first two enrollees → 1 of 2 done → 50%.
    assert_eq!(client.get_quest_completion_rate(&q_id, &0, &2), 50);
    // Window over the last two enrollees → 1 of 2 done → 50%.
    assert_eq!(client.get_quest_completion_rate(&q_id, &2, &2), 50);
    // Full window of 4 → 2 of 4 done → 50%.
    assert_eq!(client.get_quest_completion_rate(&q_id, &0, &4), 50);
}

// --- set_distribution_mode emits event (issue #868) ---

#[test]
fn test_set_distribution_mode_emits_event() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    client.set_distribution_mode(&owner, &q_id, &DistributionMode::Flat, &50);
    create_ms(&env, &client, &owner, q_id, "M1", 100);
    let after = env.events().all();
    assert!(
        after.len() > 0,
        "set_distribution_mode should publish a distribution_mode_set event"
    );
}

#[test]
fn test_verify_completion_past_deadline_rejected() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let ms_id = create_ms(&env, &client, &owner, q_id, "M1", 100);

    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);

    // Set deadline in past
    env.ledger().set_timestamp(1_000);
    quest_client.set_deadline(&q_id, &500);

    let res = client.try_verify_completion(&owner, &q_id, &ms_id, &enrollee);
    assert_eq!(res, Err(Ok(Error::DeadlineExpired)));
}

#[test]
fn test_verify_completion_cancelled_quest_rejected() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let ms_id = create_ms(&env, &client, &owner, q_id, "M1", 100);

    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);

    // Cancel quest
    quest_client.cancel_quest(&q_id);

    let res = client.try_verify_completion(&owner, &q_id, &ms_id, &enrollee);
    assert_eq!(res, Err(Ok(Error::Unauthorized)));
}

// --- Security audit tests — issue #1428 ---

#[test]
fn test_pause_rejects_milestone_creation() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    client.pause(&owner);

    let r = client.try_create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "M1"),
        &String::from_str(&env, "Desc"),
        &100,
        &false,
    );
    assert_eq!(r, Err(Ok(Error::Paused)));
}

#[test]
fn test_pause_rejects_verification() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let ms_id = create_ms(&env, &client, &owner, q_id, "M1", 100);
    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);

    client.pause(&owner);

    let r = client.try_verify_completion(&owner, &q_id, &ms_id, &enrollee);
    assert_eq!(r, Err(Ok(Error::Paused)));
}

#[test]
fn test_pause_rejects_review_submission() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let ms_id = create_ms(&env, &client, &owner, q_id, "M1", 100);
    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);

    // Set peer review mode
    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(1));

    client.pause(&owner);

    let r = client.try_submit_for_review(&enrollee, &q_id, &ms_id);
    assert_eq!(r, Err(Ok(Error::Paused)));
}

#[test]
fn test_non_owner_cannot_create_milestone() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let stranger = Address::generate(&env);

    // mock_all_auths is on, but ownership check fails
    let r = client.try_create_milestone(
        &stranger,
        &q_id,
        &String::from_str(&env, "M1"),
        &String::from_str(&env, "Desc"),
        &100,
        &false,
    );
    assert_eq!(r, Err(Ok(Error::OwnerMismatch)));
}

#[test]
fn test_milestone_reward_bounds() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    // Zero reward rejected
    let r = client.try_create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "M1"),
        &String::from_str(&env, "Desc"),
        &0,
        &false,
    );
    assert_eq!(r, Err(Ok(Error::InvalidAmount)));

    // Negative reward rejected
    let r = client.try_create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "M1"),
        &String::from_str(&env, "Desc"),
        &(-100),
        &false,
    );
    assert_eq!(r, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_batch_size_limit() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    let mut milestones = Vec::new(&env);
    for i in 0..21 {
        milestones.push_back(MilestoneInput {
            title: String::from_str(&env, "M"),
            description: String::from_str(&env, "D"),
            reward_amount: 100,
            requires_previous: false,
        });
    }

    let r = client.try_create_milestones_batch(&owner, &q_id, &milestones);
    assert_eq!(r, Err(Ok(Error::BatchTooLarge)));
}

#[test]
fn test_self_approval_rejected() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let ms_id = create_ms(&env, &client, &owner, q_id, "M1", 100);
    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);

    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(1));
    client.submit_for_review(&enrollee, &q_id, &ms_id);

    // Enrollee tries to approve their own submission
    let r = client.try_approve_completion(&enrollee, &q_id, &ms_id, &enrollee);
    assert_eq!(r, Err(Ok(Error::InvalidApprover)));
}

#[test]
fn test_duplicate_approval_rejected() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let ms_id = create_ms(&env, &client, &owner, q_id, "M1", 100);
    let enrollee = Address::generate(&env);
    let peer = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);
    quest_client.add_enrollee(&q_id, &peer);

    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(2));
    client.submit_for_review(&enrollee, &q_id, &ms_id);

    client.approve_completion(&peer, &q_id, &ms_id, &enrollee);

    // Peer tries to approve again
    let r = client.try_approve_completion(&peer, &q_id, &ms_id, &enrollee);
    assert_eq!(r, Err(Ok(Error::AlreadyApproved)));
}

#[test]
fn test_title_too_long_rejected() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);

    let long_title = String::from_bytes(&env, &[b'a'; 129]);
    let r = client.try_create_milestone(
        &owner,
        &q_id,
        &long_title,
        &String::from_str(&env, "Desc"),
        &100,
        &false,
    );
    assert_eq!(r, Err(Ok(Error::TitleTooLong)));
}

#[test]
fn test_verify_completion_with_feedback() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);

    let ms_id = client.create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Milestone 1"),
        &String::from_str(&env, "Description 1"),
        &150,
        &false,
    );

    let feedback_comment = String::from_str(&env, "Outstanding solution! Clean architecture.");
    let reward =
        client.verify_completion_with_feedback(&owner, &q_id, &ms_id, &enrollee, &feedback_comment);
    assert_eq!(reward, 150);

    let history = client.get_milestone_feedback_history(&q_id, &ms_id, &enrollee);
    assert_eq!(history.len(), 1);
    let item = history.get(0).unwrap();
    assert_eq!(item.reviewer, owner);
    assert_eq!(item.action, FeedbackAction::Approve);
    assert_eq!(item.comment, feedback_comment);
}

#[test]
fn test_reject_completion_with_feedback() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let enrollee = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);

    let ms_id = client.create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Peer Review Milestone"),
        &String::from_str(&env, "Description"),
        &200,
        &false,
    );
    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(1));
    client.submit_for_review(&enrollee, &q_id, &ms_id);

    let reject_feedback =
        String::from_str(&env, "Proof link is broken. Please submit working code.");
    client.reject_completion_with_feedback(&owner, &q_id, &ms_id, &enrollee, &reject_feedback);

    // Reserved reward should be restored / decreased
    assert_eq!(client.get_total_reserved_reward(&q_id), 0);

    let history = client.get_milestone_feedback_history(&q_id, &ms_id, &enrollee);
    assert_eq!(history.len(), 1);
    let item = history.get(0).unwrap();
    assert_eq!(item.reviewer, owner);
    assert_eq!(item.action, FeedbackAction::Reject);
    assert_eq!(item.comment, reject_feedback);
}

#[test]
fn test_request_changes_and_resubmit_flow() {
    let (env, client, quest_client, owner) = setup();
    let q_id = create_quest(&env, &quest_client, &owner);
    let enrollee = Address::generate(&env);
    let peer = Address::generate(&env);
    quest_client.add_enrollee(&q_id, &enrollee);
    quest_client.add_enrollee(&q_id, &peer);

    let ms_id = client.create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Interactive Milestone"),
        &String::from_str(&env, "Description"),
        &300,
        &false,
    );
    client.set_verification_mode(&owner, &q_id, &VerificationMode::PeerReview(1));
    client.submit_for_review(&enrollee, &q_id, &ms_id);

    // Peer requests changes
    let change_feedback = String::from_str(&env, "Please add tests for edge cases.");
    client.request_changes_with_feedback(&peer, &q_id, &ms_id, &enrollee, &change_feedback);

    // Enrollee addresses changes and resubmits
    client.submit_for_review(&enrollee, &q_id, &ms_id);

    // Peer approves completion with feedback
    let approve_feedback = String::from_str(&env, "Tests look comprehensive now! Approved.");
    let reward =
        client.approve_completion_with_feedback(&peer, &q_id, &ms_id, &enrollee, &approve_feedback);
    assert_eq!(reward, Some(300));
    assert!(client.is_completed(&q_id, &ms_id, &enrollee));

    // Full history preserved across cycle
    let history = client.get_milestone_feedback_history(&q_id, &ms_id, &enrollee);
    assert_eq!(history.len(), 2);
    assert_eq!(
        history.get(0).unwrap().action,
        FeedbackAction::RequestChanges
    );
    assert_eq!(history.get(0).unwrap().comment, change_feedback);
    assert_eq!(history.get(1).unwrap().action, FeedbackAction::Approve);
    assert_eq!(history.get(1).unwrap().comment, approve_feedback);
}
