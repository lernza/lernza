#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Address, Env,
};

fn setup() -> (
    Env,
    RewardsContractClient<'static>,
    Address,  // rewards contract address
    Address,  // token address
    Address,  // token admin (can mint)
) {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy test SAC token
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_addr = token_contract.address();

    // Deploy rewards contract
    let contract_id = env.register(RewardsContract, ());
    let client = RewardsContractClient::new(&env, &contract_id);
    client.initialize(&token_addr);

    (env, client, contract_id, token_addr, token_admin)
}

#[test]
fn test_initialize() {
    let (env, client, _cid, token_addr, _ta) = setup();
    assert_eq!(client.get_token(), token_addr);
    assert_eq!(client.get_total_distributed(), 0);
    let _ = env;
}

#[test]
fn test_initialize_twice_fails() {
    let (env, client, _cid, _token_addr, _ta) = setup();
    let fake_token = Address::generate(&env);
    let result = client.try_initialize(&fake_token);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn test_fund_workspace() {
    let (env, client, _cid, token_addr, token_admin) = setup();
    let owner = Address::generate(&env);

    // Mint tokens to owner
    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    client.fund_workspace(&owner, &0, &5_000);

    assert_eq!(client.get_pool_balance(&0), 5_000);

    // Owner's balance should decrease
    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&owner), 5_000);
    let _ = token_admin;
}

#[test]
fn test_fund_workspace_adds_to_existing() {
    let (env, client, _cid, token_addr, _ta) = setup();
    let owner = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    client.fund_workspace(&owner, &0, &3_000);
    client.fund_workspace(&owner, &0, &2_000);

    assert_eq!(client.get_pool_balance(&0), 5_000);
}

#[test]
fn test_fund_invalid_amount() {
    let (env, client, _cid, _token_addr, _ta) = setup();
    let owner = Address::generate(&env);
    let result = client.try_fund_workspace(&owner, &0, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_different_funder_unauthorized() {
    let (env, client, _cid, token_addr, _ta) = setup();
    let owner = Address::generate(&env);
    let other = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);
    sac.mint(&other, &10_000);

    // Owner funds first
    client.fund_workspace(&owner, &0, &1_000);

    // Other person tries to add funds to same workspace
    let result = client.try_fund_workspace(&other, &0, &1_000);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_distribute_reward() {
    let (env, client, _cid, token_addr, _ta) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    client.fund_workspace(&owner, &0, &5_000);
    client.distribute_reward(&owner, &0, &enrollee, &100);

    // Enrollee got tokens
    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&enrollee), 100);

    // Pool decreased
    assert_eq!(client.get_pool_balance(&0), 4_900);

    // Earnings tracked
    assert_eq!(client.get_user_earnings(&enrollee), 100);
    assert_eq!(client.get_total_distributed(), 100);
}

#[test]
fn test_distribute_multiple_rewards() {
    let (env, client, _cid, token_addr, _ta) = setup();
    let owner = Address::generate(&env);
    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    client.fund_workspace(&owner, &0, &5_000);
    client.distribute_reward(&owner, &0, &e1, &100);
    client.distribute_reward(&owner, &0, &e2, &200);
    client.distribute_reward(&owner, &0, &e1, &50); // e1 gets more

    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&e1), 150);
    assert_eq!(token_client.balance(&e2), 200);
    assert_eq!(client.get_user_earnings(&e1), 150);
    assert_eq!(client.get_pool_balance(&0), 4_650);
    assert_eq!(client.get_total_distributed(), 350);
}

#[test]
fn test_insufficient_pool() {
    let (env, client, _cid, token_addr, _ta) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &100);

    client.fund_workspace(&owner, &0, &100);
    let result = client.try_distribute_reward(&owner, &0, &enrollee, &500);
    assert_eq!(result, Err(Ok(Error::InsufficientPool)));
}

#[test]
fn test_distribute_unauthorized() {
    let (env, client, _cid, token_addr, _ta) = setup();
    let owner = Address::generate(&env);
    let imposter = Address::generate(&env);
    let enrollee = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    client.fund_workspace(&owner, &0, &5_000);

    let result = client.try_distribute_reward(&imposter, &0, &enrollee, &100);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_distribute_workspace_not_funded() {
    let (env, client, _cid, _token_addr, _ta) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);
    let result = client.try_distribute_reward(&owner, &999, &enrollee, &100);
    assert_eq!(result, Err(Ok(Error::WorkspaceNotFunded)));
}
