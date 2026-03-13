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
    assert_eq!(milestones.get(0).unwrap().title, String::from_str(&env, "A"));
    assert_eq!(milestones.get(1).unwrap().title, String::from_str(&env, "B"));
}

#[test]
fn test_verify_completion() {
    let (env, client, owner) = setup();
    create_ms(&env, &client, &owner, 0, "Deploy a contract", 100);

    let enrollee = Address::generate(&env);
    let reward = client.verify_completion(&owner, &0, &0, &enrollee);
    assert_eq!(reward, 100);
    assert_eq!(client.is_completed(&0, &0, &enrollee), true);
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
    assert_eq!(client.is_completed(&0, &0, &enrollee), true);
    assert_eq!(client.is_completed(&0, &1, &enrollee), true);
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
    assert_eq!(client.is_completed(&0, &0, &enrollee), false);
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
