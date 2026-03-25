#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String,
};

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
    ws_id: u32,
    title: &str,
    reward: i128,
) -> u32 {
    client.create_milestone(
        owner,
        &ws_id,
        &String::from_str(env, title),
        &String::from_str(env, "Description"),
        &reward,
        &0,
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
    assert_eq!(ms.workspace_id, 0);
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
fn test_milestones_per_workspace_are_independent() {
    let (env, client, owner) = setup();
    create_ms(&env, &client, &owner, 0, "WS0 Task", 50);
    create_ms(&env, &client, &owner, 0, "WS0 Task 2", 75);

    let owner2 = Address::generate(&env);
    create_ms(&env, &client, &owner2, 1, "WS1 Task", 100);

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
    // First owner sets the workspace
    create_ms(&env, &client, &owner, 0, "Task", 50);

    // Different owner tries to add to same workspace
    let imposter = Address::generate(&env);
    let result = client.try_create_milestone(
        &imposter,
        &0,
        &String::from_str(&env, "Evil task"),
        &String::from_str(&env, "Hack"),
        &999,
        &0,
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

#[test]
fn test_no_deadline_works_indefinitely() {
    let (env, client, owner) = setup();
    // deadline=0, ledger time is large — should still succeed
    env.ledger().with_mut(|li| li.timestamp = 999_999_999);
    create_ms(&env, &client, &owner, 0, "Task", 50);

    let enrollee = Address::generate(&env);
    let reward = client.verify_completion(&owner, &0, &0, &enrollee);
    assert_eq!(reward, 50);
}

#[test]
fn test_verify_before_deadline_succeeds() {
    let (env, client, owner) = setup();
    env.ledger().with_mut(|li| li.timestamp = 1_000);
    client.create_milestone(
        &owner,
        &0,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "desc"),
        &100,
        &2_000, // deadline in the future
    );

    let enrollee = Address::generate(&env);
    let reward = client.verify_completion(&owner, &0, &0, &enrollee);
    assert_eq!(reward, 100);
}

#[test]
fn test_verify_after_deadline_rejected() {
    let (env, client, owner) = setup();
    env.ledger().with_mut(|li| li.timestamp = 1_000);
    client.create_milestone(
        &owner,
        &0,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "desc"),
        &100,
        &500, // deadline already past
    );

    let enrollee = Address::generate(&env);
    let result = client.try_verify_completion(&owner, &0, &0, &enrollee);
    assert_eq!(result, Err(Ok(Error::DeadlineExpired)));
}

#[test]
fn test_set_deadline_updates_enforcement() {
    let (env, client, owner) = setup();
    env.ledger().with_mut(|li| li.timestamp = 1_000);
    // Create with no deadline
    create_ms(&env, &client, &owner, 0, "Task", 50);

    // Set a deadline that is already past
    client.set_deadline(&owner, &0, &500);

    let enrollee = Address::generate(&env);
    let result = client.try_verify_completion(&owner, &0, &0, &enrollee);
    assert_eq!(result, Err(Ok(Error::DeadlineExpired)));
}

#[test]
fn test_set_deadline_clear_allows_completion() {
    let (env, client, owner) = setup();
    env.ledger().with_mut(|li| li.timestamp = 1_000);
    client.create_milestone(
        &owner,
        &0,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "desc"),
        &50,
        &500, // expired deadline
    );

    // Clear the deadline
    client.set_deadline(&owner, &0, &0);

    let enrollee = Address::generate(&env);
    let reward = client.verify_completion(&owner, &0, &0, &enrollee);
    assert_eq!(reward, 50);
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
}
