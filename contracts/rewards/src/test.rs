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
fn test_fund_quest() {
    let (env, client, _cid, token_addr, token_admin) = setup();
    let owner = Address::generate(&env);

    // Mint tokens to owner
    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    client.fund_quest(&owner, &0, &5_000);

    assert_eq!(client.get_pool_balance(&0), 5_000);

    // Owner's balance should decrease
    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&owner), 5_000);
    let _ = token_admin;
}

#[test]
fn test_fund_quest_adds_to_existing() {
    let (env, client, _cid, token_addr, _ta) = setup();
    let owner = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    client.fund_quest(&owner, &0, &3_000);
    client.fund_quest(&owner, &0, &2_000);

    assert_eq!(client.get_pool_balance(&0), 5_000);
}

#[test]
fn test_fund_invalid_amount() {
    let (env, client, _cid, _token_addr, _ta) = setup();
    let owner = Address::generate(&env);
    let result = client.try_fund_quest(&owner, &0, &0);
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
    client.fund_quest(&owner, &0, &1_000);

    // Other person tries to add funds to same quest
    let result = client.try_fund_quest(&other, &0, &1_000);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_distribute_reward() {
    let (env, client, _cid, token_addr, _ta) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    client.fund_quest(&owner, &0, &5_000);
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

    client.fund_quest(&owner, &0, &5_000);
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

    client.fund_quest(&owner, &0, &100);
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

    client.fund_quest(&owner, &0, &5_000);

    let result = client.try_distribute_reward(&imposter, &0, &enrollee, &100);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_distribute_quest_not_funded() {
    let (env, client, _cid, _token_addr, _ta) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);
    let result = client.try_distribute_reward(&owner, &999, &enrollee, &100);
    assert_eq!(result, Err(Ok(Error::QuestNotFunded)));
}

// ---- Security tests ----

/// HIGH-02: The initialize function has no require_auth() guard. Any address
/// can call initialize before the legitimate deployer, setting an arbitrary
/// (potentially malicious) token address. Once set it cannot be changed.
#[test]
fn test_initialize_no_auth_guard() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(RewardsContract, ());
    let client = RewardsContractClient::new(&env, &contract_id);

    // Any random address can initialize — no deployer auth required
    let attacker_token = Address::generate(&env);
    client.initialize(&attacker_token);

    assert_eq!(client.get_token(), attacker_token);

    // Legitimate deployer cannot override it
    let real_token = Address::generate(&env);
    let result = client.try_initialize(&real_token);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}

/// CRIT-02: Any caller who funds a quest first becomes its permanent
/// rewards authority. A malicious actor can front-run the legitimate quest owner
/// and lock them out of their own reward pool.
#[test]
fn test_fund_quest_frontrun_attack() {
    let (env, client, _cid, token_addr, _ta) = setup();
    let legitimate_owner = Address::generate(&env);
    let attacker = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&attacker, &10);
    sac.mint(&legitimate_owner, &10_000);

    // Attacker front-runs and funds quest 0 with a minimal amount
    client.fund_quest(&attacker, &0, &1);
    assert_eq!(client.get_pool_balance(&0), 1);

    // Legitimate owner is now permanently locked out of their own quest pool
    let result = client.try_fund_quest(&legitimate_owner, &0, &5_000);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

/// MED-02: The quest authority can call distribute_reward with enrollee set
/// to their own address, paying themselves from the pool intended for learners.
#[test]
fn test_authority_self_distribution() {
    let (env, client, _cid, token_addr, _ta) = setup();
    let owner = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    client.fund_quest(&owner, &0, &5_000);
    // Owner has 5_000 remaining after funding

    // Authority distributes reward pool tokens back to themselves
    client.distribute_reward(&owner, &0, &owner, &1_000);

    let token_client = TokenClient::new(&env, &token_addr);
    // Owner started with 10_000, funded 5_000, received 1_000 back = 6_000
    assert_eq!(token_client.balance(&owner), 6_000);
    assert_eq!(client.get_pool_balance(&0), 4_000);
    assert_eq!(client.get_user_earnings(&owner), 1_000);
}

/// MED-01: distribute_reward has no linkage to the milestone contract. The
/// quest authority can distribute tokens to any address at any time without
/// any milestone completion having been verified. The frontend ordering assumption
/// is not enforced on-chain.
#[test]
fn test_distribute_reward_no_milestone_check() {
    let (env, client, _cid, token_addr, _ta) = setup();
    let owner = Address::generate(&env);
    let arbitrary_recipient = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    client.fund_quest(&owner, &0, &5_000);

    // No milestone created, no completion verified — distribute succeeds anyway
    client.distribute_reward(&owner, &0, &arbitrary_recipient, &500);

    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&arbitrary_recipient), 500);
    assert_eq!(client.get_pool_balance(&0), 4_500);
}
