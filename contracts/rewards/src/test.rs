#![cfg(test)]

use super::*;
use quest::{QuestContract, QuestContractClient, Visibility};
use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Address, Env, String,
};

fn setup() -> (
    Env,
    RewardsContractClient<'static>,
    Address,                      // rewards contract address
    Address,                      // token address
    QuestContractClient<'static>, // quest client
    Address,                      // quest contract address
) {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy test SAC token
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_addr = token_contract.address();

    // Deploy quest contract directly from crate logic (no WASM needed in test)
    let quest_id = env.register(QuestContract, ());
    let quest_client = QuestContractClient::new(&env, &quest_id);

    // Deploy rewards contract
    let contract_id = env.register(RewardsContract, ());
    let client = RewardsContractClient::new(&env, &contract_id);
    client.initialize(&token_addr, &quest_id);

    (env, client, contract_id, token_addr, quest_client, quest_id)
}

#[test]
fn test_initialize() {
    let (_env, client, _cid, token_addr, _ws, _ws_id) = setup();
    assert_eq!(client.get_token(), token_addr);
    assert_eq!(client.get_total_distributed(), 0);
}

#[test]
fn test_initialize_twice_fails() {
    let (env, client, _cid, _token_addr, _ws, quest_id) = setup();
    let fake_token = Address::generate(&env);
    let result = client.try_initialize(&fake_token, &quest_id);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn test_fund_quest() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let owner = Address::generate(&env);

    // Mint tokens to owner
    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    // Create a quest first (so owner check passes)
    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
    );

    client.fund_quest(&owner, &q_id, &5_000);

    assert_eq!(client.get_pool_balance(&q_id), 5_000);

    // Owner's balance should decrease
    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&owner), 5_000);
}

#[test]
fn test_fund_quest_adds_to_existing() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let owner = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
    );

    client.fund_quest(&owner, &q_id, &3_000);
    client.fund_quest(&owner, &q_id, &2_000);

    assert_eq!(client.get_pool_balance(&q_id), 5_000);
}

#[test]
fn test_fund_invalid_amount() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let owner = Address::generate(&env);

    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
    );

    let result = client.try_fund_quest(&owner, &q_id, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_different_funder_unauthorized() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let owner = Address::generate(&env);
    let other = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);
    sac.mint(&other, &10_000);

    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
    );

    // Owner funds first
    client.fund_quest(&owner, &q_id, &1_000);

    // Other person tries to add funds to same quest (fails because not owner)
    let result = client.try_fund_quest(&other, &q_id, &1_000);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_distribute_reward() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
    );

    client.fund_quest(&owner, &q_id, &5_000);
    client.distribute_reward(&owner, &q_id, &enrollee, &100);

    // Enrollee got tokens
    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&enrollee), 100);

    // Pool decreased
    assert_eq!(client.get_pool_balance(&q_id), 4_900);

    // Earnings tracked
    assert_eq!(client.get_user_earnings(&enrollee), 100);
    assert_eq!(client.get_total_distributed(), 100);
}

#[test]
fn test_distribute_multiple_rewards() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let owner = Address::generate(&env);
    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
    );

    client.fund_quest(&owner, &q_id, &5_000);
    client.distribute_reward(&owner, &q_id, &e1, &100);
    client.distribute_reward(&owner, &q_id, &e2, &200);
    client.distribute_reward(&owner, &q_id, &e1, &50); // e1 gets more

    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&e1), 150);
    assert_eq!(token_client.balance(&e2), 200);
    assert_eq!(client.get_user_earnings(&e1), 150);
    assert_eq!(client.get_pool_balance(&q_id), 4_650);
    assert_eq!(client.get_total_distributed(), 350);
}

#[test]
fn test_insufficient_pool() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
    );

    client.fund_quest(&owner, &q_id, &100);
    let result = client.try_distribute_reward(&owner, &q_id, &enrollee, &500);
    assert_eq!(result, Err(Ok(Error::InsufficientPool)));
}

#[test]
fn test_distribute_unauthorized() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let owner = Address::generate(&env);
    let imposter = Address::generate(&env);
    let enrollee = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
    );

    client.fund_quest(&owner, &q_id, &5_000);

    let result = client.try_distribute_reward(&imposter, &q_id, &enrollee, &100);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_distribute_quest_not_funded() {
    let (env, client, _cid, _token_addr, _quest_client, quest_id) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);
    // Even if quest exists, if not funded it has no authority
    let result = client.try_distribute_reward(&owner, &999, &enrollee, &100);
    assert_eq!(result, Err(Ok(Error::QuestNotFunded)));
    let _ = quest_id;
}

// ---- Security tests (Audit Restored) ----

/// HIGH-02: Initial initialize check
#[test]
fn test_initialize_no_auth_guard() {
    let env = Env::default();
    env.mock_all_auths();

    // Register quest contract mock
    let quest_id = env.register(QuestContract, ());

    let contract_id = env.register(RewardsContract, ());
    let client = RewardsContractClient::new(&env, &contract_id);

    // Any random address can initialize — no deployer auth required
    let attacker_token = Address::generate(&env);
    client.initialize(&attacker_token, &quest_id);

    assert_eq!(client.get_token(), attacker_token);

    // Legitimate deployer cannot override it
    let real_token = Address::generate(&env);
    let result = client.try_initialize(&real_token, &quest_id);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}

/// MED-02: Self-distribution
#[test]
fn test_authority_self_distribution() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let owner = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
    );

    client.fund_quest(&owner, &q_id, &5_000);

    // Authority distributes reward pool tokens back to themselves
    client.distribute_reward(&owner, &q_id, &owner, &1_000);

    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&owner), 6_000);
    assert_eq!(client.get_pool_balance(&q_id), 4_000);
    assert_eq!(client.get_user_earnings(&owner), 1_000);
}

/// MED-01: No milestone linkage
#[test]
fn test_distribute_reward_no_milestone_check() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let owner = Address::generate(&env);
    let arbitrary_recipient = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
    );

    client.fund_quest(&owner, &q_id, &5_000);

    // No milestone created, no completion verified — distribute succeeds anyway
    client.distribute_reward(&owner, &q_id, &arbitrary_recipient, &500);

    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&arbitrary_recipient), 500);
    assert_eq!(client.get_pool_balance(&q_id), 4_500);
}

/// fix(#160) regression test: broken quest contract linkage should fail with QuestLookupFailed
#[test]
fn test_fund_quest_broken_contract_linkage() {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy token contract
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_addr = token_contract.address();

    // Deploy rewards contract
    let contract_id = env.register(RewardsContract, ());
    let client = RewardsContractClient::new(&env, &contract_id);

    // Initialize rewards contract with a fake quest contract address (not deployed)
    let fake_quest_contract = Address::generate(&env);
    client.initialize(&token_addr, &fake_quest_contract);

    let funder = Address::generate(&env);
    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&funder, &1_000);

    // Try to fund a quest - should fail because quest contract doesn't exist
    let result = client.try_fund_quest(&funder, &1, &500);
    assert_eq!(result, Err(Ok(Error::QuestLookupFailed)));
}

/// fix(#160) regression test: nonexistent quest should fail with QuestLookupFailed
#[test]
fn test_fund_quest_nonexistent_fails() {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy test SAC token
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_addr = token_contract.address();

    // Deploy quest contract directly from crate logic (no WASM needed in test)
    let quest_id = env.register(QuestContract, ());
    let _quest_client = QuestContractClient::new(&env, &quest_id);

    // Deploy rewards contract
    let contract_id = env.register(RewardsContract, ());
    let client = RewardsContractClient::new(&env, &contract_id);
    client.initialize(&token_addr, &quest_id);

    let funder = Address::generate(&env);
    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&funder, &1_000);

    // Try to fund a quest that doesn't exist
    let result = client.try_fund_quest(&funder, &999, &500);
    assert_eq!(result, Err(Ok(Error::QuestLookupFailed)));
}

/// fix(#85) verification: only quest owner can fund
#[test]
fn test_fund_quest_not_owner_fails() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let legitimate_owner = Address::generate(&env);
    let attacker = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&attacker, &1_000);
    sac.mint(&legitimate_owner, &10_000);

    // Create a quest owned by Alice
    let q_id = quest_client.create_quest(
        &legitimate_owner,
        &String::from_str(&env, "Secret"),
        &String::from_str(&env, "Hidden"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
    );

    // Attacker tries to fund and become authority ΓÇö should FAIL with Unauthorized
    let result = client.try_fund_quest(&attacker, &q_id, &1);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));

    // Pool remains empty
    assert_eq!(client.get_pool_balance(&q_id), 0);

    // Legitimate owner can still fund their own quest
    client.fund_quest(&legitimate_owner, &q_id, &5_000);
    assert_eq!(client.get_pool_balance(&q_id), 5_000);
}
