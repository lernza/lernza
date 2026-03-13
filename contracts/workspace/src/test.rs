#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup() -> (Env, WorkspaceContractClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(WorkspaceContract, ());
    let client = WorkspaceContractClient::new(&env, &contract_id);
    let owner = Address::generate(&env);
    let token = Address::generate(&env);
    (env, client, owner, token)
}

fn create_ws(env: &Env, client: &WorkspaceContractClient, owner: &Address, token: &Address) -> u32 {
    client.create_workspace(
        owner,
        &String::from_str(env, "My Workspace"),
        &String::from_str(env, "Teaching my brother to code"),
        token,
    )
}

#[test]
fn test_create_workspace() {
    let (env, client, owner, token) = setup();
    let id = create_ws(&env, &client, &owner, &token);
    assert_eq!(id, 0);
    assert_eq!(client.get_workspace_count(), 1);

    let ws = client.get_workspace(&0);
    assert_eq!(ws.owner, owner);
    assert_eq!(ws.name, String::from_str(&env, "My Workspace"));
    assert_eq!(ws.token_addr, token);
}

#[test]
fn test_create_multiple_workspaces() {
    let (env, client, owner, token) = setup();
    let id0 = create_ws(&env, &client, &owner, &token);
    let id1 = create_ws(&env, &client, &owner, &token);
    assert_eq!(id0, 0);
    assert_eq!(id1, 1);
    assert_eq!(client.get_workspace_count(), 2);
}

#[test]
fn test_add_enrollee() {
    let (env, client, owner, token) = setup();
    create_ws(&env, &client, &owner, &token);

    let enrollee = Address::generate(&env);
    client.add_enrollee(&0, &enrollee);

    let enrollees = client.get_enrollees(&0);
    assert_eq!(enrollees.len(), 1);
    assert_eq!(enrollees.get(0).unwrap(), enrollee);
    assert!(client.is_enrollee(&0, &enrollee));
}

#[test]
fn test_add_multiple_enrollees() {
    let (env, client, owner, token) = setup();
    create_ws(&env, &client, &owner, &token);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    let e3 = Address::generate(&env);
    client.add_enrollee(&0, &e1);
    client.add_enrollee(&0, &e2);
    client.add_enrollee(&0, &e3);

    assert_eq!(client.get_enrollees(&0).len(), 3);
}

#[test]
fn test_add_enrollee_duplicate() {
    let (env, client, owner, token) = setup();
    create_ws(&env, &client, &owner, &token);

    let enrollee = Address::generate(&env);
    client.add_enrollee(&0, &enrollee);
    let result = client.try_add_enrollee(&0, &enrollee);
    assert_eq!(result, Err(Ok(Error::AlreadyEnrolled)));
}

#[test]
fn test_remove_enrollee() {
    let (env, client, owner, token) = setup();
    create_ws(&env, &client, &owner, &token);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    client.add_enrollee(&0, &e1);
    client.add_enrollee(&0, &e2);

    client.remove_enrollee(&0, &e1);

    let enrollees = client.get_enrollees(&0);
    assert_eq!(enrollees.len(), 1);
    assert_eq!(enrollees.get(0).unwrap(), e2);
    assert!(!client.is_enrollee(&0, &e1));
}

#[test]
fn test_remove_enrollee_not_found() {
    let (env, client, owner, token) = setup();
    create_ws(&env, &client, &owner, &token);

    let random = Address::generate(&env);
    let result = client.try_remove_enrollee(&0, &random);
    assert_eq!(result, Err(Ok(Error::NotEnrolled)));
}

#[test]
fn test_workspace_not_found() {
    let (_env, client, _owner, _token) = setup();
    let result = client.try_get_workspace(&999);
    assert_eq!(result, Err(Ok(Error::NotFound)));
}

#[test]
fn test_add_enrollee_workspace_not_found() {
    let (env, client, _owner, _token) = setup();
    let enrollee = Address::generate(&env);
    let result = client.try_add_enrollee(&999, &enrollee);
    assert_eq!(result, Err(Ok(Error::NotFound)));
}

#[test]
fn test_is_enrollee_false() {
    let (env, client, owner, token) = setup();
    create_ws(&env, &client, &owner, &token);
    let random = Address::generate(&env);
    assert!(!client.is_enrollee(&0, &random));
}
