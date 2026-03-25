#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup() -> (Env, MilestoneContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(MilestoneContract, ());
    let client = MilestoneContractClient::new(&env, &contract_id);
    let owner = Address::generate(&env);
    (env, client, owner)
}

fn create_ms(
    env: &Env,
    client: &MilestoneContractClient,
    owner: &Address,
    quest_id: u32,
    title: &str,
    reward: i128,
) -> u32 {
    client.create_milestone(
        owner,
        &quest_id,
        &String::from_str(env, title),
        &String::from_str(env, "Description"),
        &reward,
    )
}

#[test]
fn test_create_milestone() {
    let (env, client, owner) = setup();
    let id = create_ms(&env, &client, &owner, 0, "Build your first API", 100);
    assert_eq!(id, 0);
    assert_eq!(client.get_milestone_count(&0), 1);

    let ms = client.get_milestone(&0, &0);
    assert_eq!(ms.title, String::from_str(&env, "Build your first API"));
    assert_eq!(ms.reward_amount, 100);
    assert_eq!(ms.quest_id, 0);
}

#[test]
fn test_create_multiple_milestones() {
    let (env, client, owner) = setup();
    let id0 = create_ms(&env, &client, &owner, 0, "Task 1", 50);
    let id1 = create_ms(&env, &client, &owner, 0, "Task 2", 100);
    let id2 = create_ms(&env, &client, &owner, 0, "Task 3", 200);
    assert_eq!(id0, 0);
    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
    assert_eq!(client.get_milestone_count(&0), 3);
}

#[test]
fn test_milestones_per_quest_are_independent() {
    let (env, client, owner) = setup();
    create_ms(&env, &client, &owner, 0, "Quest0 Task", 50);
    create_ms(&env, &client, &owner, 0, "Quest0 Task 2", 75);

    let owner2 = Address::generate(&env);
    create_ms(&env, &client, &owner2, 1, "Quest1 Task", 100);

    assert_eq!(client.get_milestone_count(&0), 2);
    assert_eq!(client.get_milestone_count(&1), 1);
}

#[test]
fn test_get_milestones() {
    let (env, client, owner) = setup();
    create_ms(&env, &client, &owner, 0, "A", 10);
    create_ms(&env, &client, &owner, 0, "B", 20);

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
    let (env, client, owner) = setup();
    create_ms(&env, &client, &owner, 0, "Deploy a contract", 100);

    let enrollee = Address::generate(&env);
    let reward = client.verify_completion(&owner, &0, &0, &enrollee);
    assert_eq!(reward, 100);
    assert!(client.is_completed(&0, &0, &enrollee));
    assert_eq!(client.get_enrollee_completions(&0, &enrollee), 1);
}

#[test]
fn test_verify_multiple_completions() {
    let (env, client, owner) = setup();
    create_ms(&env, &client, &owner, 0, "Task 1", 50);
    create_ms(&env, &client, &owner, 0, "Task 2", 100);

    let enrollee = Address::generate(&env);
    client.verify_completion(&owner, &0, &0, &enrollee);
    client.verify_completion(&owner, &0, &1, &enrollee);

    assert_eq!(client.get_enrollee_completions(&0, &enrollee), 2);
    assert!(client.is_completed(&0, &0, &enrollee));
    assert!(client.is_completed(&0, &1, &enrollee));
}

#[test]
fn test_double_verify_fails() {
    let (env, client, owner) = setup();
    create_ms(&env, &client, &owner, 0, "Task", 50);

    let enrollee = Address::generate(&env);
    client.verify_completion(&owner, &0, &0, &enrollee);

    let result = client.try_verify_completion(&owner, &0, &0, &enrollee);
    assert_eq!(result, Err(Ok(Error::AlreadyCompleted)));
}

#[test]
fn test_wrong_owner_cannot_verify() {
    let (env, client, owner) = setup();
    create_ms(&env, &client, &owner, 0, "Task", 50);

    let imposter = Address::generate(&env);
    let enrollee = Address::generate(&env);
    let result = client.try_verify_completion(&imposter, &0, &0, &enrollee);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_wrong_owner_cannot_create() {
    let (env, client, owner) = setup();
    // First owner sets the quest
    create_ms(&env, &client, &owner, 0, "Task", 50);

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
    let (_env, client, _owner) = setup();
    let result = client.try_get_milestone(&0, &999);
    assert_eq!(result, Err(Ok(Error::NotFound)));
}

#[test]
fn test_not_completed_by_default() {
    let (env, client, owner) = setup();
    create_ms(&env, &client, &owner, 0, "Task", 50);
    let enrollee = Address::generate(&env);
    assert!(!client.is_completed(&0, &0, &enrollee));
    assert_eq!(client.get_enrollee_completions(&0, &enrollee), 0);
}

#[test]
fn test_zero_reward_milestone() {
    let (env, client, owner) = setup();
    let id = create_ms(&env, &client, &owner, 0, "Free task", 0);
    assert_eq!(id, 0);

    let enrollee = Address::generate(&env);
    let reward = client.verify_completion(&owner, &0, &0, &enrollee);
    assert_eq!(reward, 0);
}

// --- distribution mode tests ---

#[test]
fn test_custom_mode_uses_per_milestone_amounts() {
    let (env, client, owner) = setup();
    create_ms(&env, &client, &owner, 0, "Task 1", 100);
    create_ms(&env, &client, &owner, 0, "Task 2", 200);

    client.set_distribution_mode(&owner, &0, &DistributionMode::Custom, &0);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    assert_eq!(client.verify_completion(&owner, &0, &0, &e1), 100);
    assert_eq!(client.verify_completion(&owner, &0, &1, &e2), 200);
}

#[test]
fn test_flat_mode_equal_rewards() {
    let (env, client, owner) = setup();
    create_ms(&env, &client, &owner, 0, "Task 1", 100);
    create_ms(&env, &client, &owner, 0, "Task 2", 999); // per-milestone amount is ignored

    client.set_distribution_mode(&owner, &0, &DistributionMode::Flat, &50);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    assert_eq!(client.verify_completion(&owner, &0, &0, &e1), 50);
    assert_eq!(client.verify_completion(&owner, &0, &1, &e2), 50);
}

#[test]
fn test_flat_mode_invalid_amount() {
    let (env, client, owner) = setup();
    create_ms(&env, &client, &owner, 0, "Task", 100);

    let result = client.try_set_distribution_mode(&owner, &0, &DistributionMode::Flat, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_competitive_mode_first_winners_rewarded() {
    let (env, client, owner) = setup();
    create_ms(&env, &client, &owner, 0, "Task", 100);
    client.set_distribution_mode(&owner, &0, &DistributionMode::Competitive(2), &0);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    assert_eq!(client.verify_completion(&owner, &0, &0, &e1), 100);
    assert_eq!(client.verify_completion(&owner, &0, &0, &e2), 100);
}

#[test]
fn test_competitive_mode_exhausted_gets_nothing() {
    let (env, client, owner) = setup();
    create_ms(&env, &client, &owner, 0, "Task", 100);
    client.set_distribution_mode(&owner, &0, &DistributionMode::Competitive(2), &0);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    let e3 = Address::generate(&env);
    client.verify_completion(&owner, &0, &0, &e1);
    client.verify_completion(&owner, &0, &0, &e2);
    // N+1th completer: still marked complete but gets 0 reward
    assert_eq!(client.verify_completion(&owner, &0, &0, &e3), 0);
    assert!(client.is_completed(&0, &0, &e3));
}

#[test]
fn test_competitive_mode_counts_per_milestone() {
    let (env, client, owner) = setup();
    create_ms(&env, &client, &owner, 0, "Task 1", 100);
    create_ms(&env, &client, &owner, 0, "Task 2", 200);
    client.set_distribution_mode(&owner, &0, &DistributionMode::Competitive(1), &0);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    // Milestone 0: e1 is the single winner; e2 gets nothing
    assert_eq!(client.verify_completion(&owner, &0, &0, &e1), 100);
    assert_eq!(client.verify_completion(&owner, &0, &0, &e2), 0);
    // Milestone 1: e2 is the winner (fresh count)
    assert_eq!(client.verify_completion(&owner, &0, &1, &e2), 200);
// ---- Security tests ----

/// CRIT-01: Any address that calls create_milestone first for a quest_id
/// becomes the permanent milestone authority for that quest. The legitimate
/// quest owner is locked out because the first caller sets the cached owner with
/// no cross-contract validation against the quest contract.
#[test]
fn test_milestone_ownership_race_condition() {
    let (env, client, legitimate_owner) = setup();
    let attacker = Address::generate(&env);

    // Attacker calls create_milestone first for quest 0
    create_ms(
        &env,
        &client,
        &attacker,
        0,
        "Attacker backdoor milestone",
        9999,
    );

    // Legitimate owner now cannot create milestones for their own quest
    let result = client.try_create_milestone(
        &legitimate_owner,
        &0,
        &String::from_str(&env, "Real milestone"),
        &String::from_str(&env, "Description"),
        &100,
    );
    assert_eq!(result, Err(Ok(Error::OwnerMismatch)));

    // Attacker is now the milestone owner and can verify completions
    let victim = Address::generate(&env);
    let reward = client.verify_completion(&attacker, &0, &0, &victim);
    assert_eq!(reward, 9999);
}

/// HIGH-01: verify_completion accepts any enrollee address without checking
/// whether that address is actually enrolled in the quest. Any arbitrary
/// address can have milestone completion recorded and trigger reward distribution.
#[test]
fn test_verify_completion_no_enrollment_check() {
    let (env, client, owner) = setup();
    create_ms(&env, &client, &owner, 0, "Task", 100);

    // This address has never been enrolled in any quest contract
    let unenrolled = Address::generate(&env);

    // Succeeds despite unenrolled address — no cross-contract enrollment check
    let reward = client.verify_completion(&owner, &0, &0, &unenrolled);
    assert_eq!(reward, 100);
    assert!(client.is_completed(&0, &0, &unenrolled));
    assert_eq!(client.get_enrollee_completions(&0, &unenrolled), 1);
}
