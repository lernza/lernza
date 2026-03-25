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
    Address, // rewards contract address
    Address, // token address
    Address, // token admin (can mint)
    Address, // platform admin
) {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy test SAC token
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_addr = token_contract.address();

    // Deploy rewards contract
    let platform_admin = Address::generate(&env);
    let contract_id = env.register(RewardsContract, ());
    let client = RewardsContractClient::new(&env, &contract_id);
    client.initialize(&token_addr, &platform_admin);

    (
        env,
        client,
        contract_id,
        token_addr,
        token_admin,
        platform_admin,
    )
}

#[test]
fn test_initialize() {
    let (env, client, _cid, token_addr, _ta, admin) = setup();
    assert_eq!(client.get_token(), token_addr);
    assert_eq!(client.get_total_distributed(), 0);
    assert_eq!(client.get_admin(), admin);
    assert!(!client.is_paused());
    assert_eq!(client.get_platform_fee_bps(), 0);
    assert_eq!(client.get_platform_fee_balance(), 0);
    let _ = env;
}

#[test]
fn test_initialize_twice_fails() {
    let (env, client, _cid, _token_addr, _ta, _admin) = setup();
    let fake_token = Address::generate(&env);
    let fake_admin = Address::generate(&env);
    let result = client.try_initialize(&fake_token, &fake_admin);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn test_fund_workspace() {
    let (env, client, _cid, token_addr, token_admin, _admin) = setup();
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
    let (env, client, _cid, token_addr, _ta, _admin) = setup();
    let owner = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    client.fund_workspace(&owner, &0, &3_000);
    client.fund_workspace(&owner, &0, &2_000);

    assert_eq!(client.get_pool_balance(&0), 5_000);
}

#[test]
fn test_fund_invalid_amount() {
    let (env, client, _cid, _token_addr, _ta, _admin) = setup();
    let owner = Address::generate(&env);
    let result = client.try_fund_workspace(&owner, &0, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_different_funder_unauthorized() {
    let (env, client, _cid, token_addr, _ta, _admin) = setup();
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
    let (env, client, _cid, token_addr, _ta, _admin) = setup();
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
    let (env, client, _cid, token_addr, _ta, _admin) = setup();
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
    let (env, client, _cid, token_addr, _ta, _admin) = setup();
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
    let (env, client, _cid, token_addr, _ta, _admin) = setup();
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
    let (env, client, _cid, _token_addr, _ta, _admin) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);
    let result = client.try_distribute_reward(&owner, &999, &enrollee, &100);
    assert_eq!(result, Err(Ok(Error::WorkspaceNotFunded)));
}

// --- admin / governance tests ---

#[test]
fn test_pause_unpause() {
    let (_env, client, _cid, _token_addr, _ta, admin) = setup();
    assert!(!client.is_paused());

    client.pause(&admin);
    assert!(client.is_paused());

    client.unpause(&admin);
    assert!(!client.is_paused());
}

#[test]
fn test_paused_rejects_fund_workspace() {
    let (env, client, _cid, _token_addr, _ta, admin) = setup();
    let owner = Address::generate(&env);

    client.pause(&admin);
    let result = client.try_fund_workspace(&owner, &0, &1_000);
    assert_eq!(result, Err(Ok(Error::Paused)));
}

#[test]
fn test_paused_rejects_distribute_reward() {
    let (env, client, _cid, token_addr, _ta, admin) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);
    client.fund_workspace(&owner, &0, &5_000);

    client.pause(&admin);
    let result = client.try_distribute_reward(&owner, &0, &enrollee, &100);
    assert_eq!(result, Err(Ok(Error::Paused)));
}

#[test]
fn test_unpause_resumes_operations() {
    let (env, client, _cid, token_addr, _ta, admin) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    client.pause(&admin);
    client.unpause(&admin);

    // Operations succeed after unpause
    client.fund_workspace(&owner, &0, &1_000);
    client.distribute_reward(&owner, &0, &enrollee, &100);
    assert_eq!(client.get_user_earnings(&enrollee), 100);
}

#[test]
fn test_non_admin_cannot_pause() {
    let (env, client, _cid, _token_addr, _ta, _admin) = setup();
    let imposter = Address::generate(&env);
    let result = client.try_pause(&imposter);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_set_platform_fee() {
    let (_env, client, _cid, _token_addr, _ta, admin) = setup();
    client.set_platform_fee(&admin, &500); // 5%
    assert_eq!(client.get_platform_fee_bps(), 500);
}

#[test]
fn test_set_platform_fee_invalid_exceeds_max() {
    let (_env, client, _cid, _token_addr, _ta, admin) = setup();
    let result = client.try_set_platform_fee(&admin, &10_001);
    assert_eq!(result, Err(Ok(Error::InvalidFee)));
}

#[test]
fn test_non_admin_cannot_set_fee() {
    let (env, client, _cid, _token_addr, _ta, _admin) = setup();
    let imposter = Address::generate(&env);
    let result = client.try_set_platform_fee(&imposter, &100);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_platform_fee_deducted_from_distribution() {
    let (env, client, _cid, token_addr, _ta, admin) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);
    client.fund_workspace(&owner, &0, &5_000);

    // 10% fee
    client.set_platform_fee(&admin, &1_000);
    client.distribute_reward(&owner, &0, &enrollee, &1_000);

    let token_client = TokenClient::new(&env, &token_addr);
    // Enrollee receives 900 (1000 - 10%)
    assert_eq!(token_client.balance(&enrollee), 900);
    // Pool decreases by full 1000
    assert_eq!(client.get_pool_balance(&0), 4_000);
    // Earnings and total track net amount
    assert_eq!(client.get_user_earnings(&enrollee), 900);
    assert_eq!(client.get_total_distributed(), 900);
    // Fee accumulated in contract
    assert_eq!(client.get_platform_fee_balance(), 100);
}

#[test]
fn test_zero_fee_no_deduction() {
    let (env, client, _cid, token_addr, _ta, _admin) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);
    client.fund_workspace(&owner, &0, &5_000);
    client.distribute_reward(&owner, &0, &enrollee, &500);

    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&enrollee), 500);
    assert_eq!(client.get_platform_fee_balance(), 0);
}

#[test]
fn test_transfer_admin() {
    let (env, client, _cid, _token_addr, _ta, admin) = setup();
    let new_admin = Address::generate(&env);

    client.transfer_admin(&admin, &new_admin);
    assert_eq!(client.get_admin(), new_admin);

    // Old admin can no longer act
    let result = client.try_pause(&admin);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));

    // New admin can act
    client.pause(&new_admin);
    assert!(client.is_paused());
}

#[test]
fn test_non_admin_cannot_transfer_admin() {
    let (env, client, _cid, _token_addr, _ta, _admin) = setup();
    let imposter = Address::generate(&env);
    let new_admin = Address::generate(&env);
    let result = client.try_transfer_admin(&imposter, &new_admin);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}
