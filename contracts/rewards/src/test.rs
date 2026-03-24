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

/// Helper: create a quest owned by `owner` and return its ID.
fn create_test_quest(
    env: &Env,
    quest_client: &QuestContractClient<'static>,
    owner: &Address,
    token_addr: &Address,
) -> u32 {
    quest_client.create_quest(
        owner,
        &String::from_str(env, "Test"),
        &String::from_str(env, "Desc"),
        token_addr,
        &Visibility::Public,
    )
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
    let q_id = create_test_quest(&env, &quest_client, &owner, &token_addr);

    client.fund_quest(&owner, &q_id, &5_000, &FundingModel::HostOnly);

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

    let q_id = create_test_quest(&env, &quest_client, &owner, &token_addr);

    client.fund_quest(&owner, &q_id, &3_000, &FundingModel::HostOnly);
    client.fund_quest(&owner, &q_id, &2_000, &FundingModel::HostOnly);

    assert_eq!(client.get_pool_balance(&q_id), 5_000);
}

#[test]
fn test_fund_invalid_amount() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let owner = Address::generate(&env);

    let q_id = create_test_quest(&env, &quest_client, &owner, &token_addr);

    let result = client.try_fund_quest(&owner, &q_id, &0, &FundingModel::HostOnly);
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

    let q_id = create_test_quest(&env, &quest_client, &owner, &token_addr);

    // Owner funds first
    client.fund_quest(&owner, &q_id, &1_000, &FundingModel::HostOnly);

    // Other person tries to add funds to same quest (fails because not owner + HostOnly)
    let result = client.try_fund_quest(&other, &q_id, &1_000, &FundingModel::HostOnly);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_distribute_reward() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    let q_id = create_test_quest(&env, &quest_client, &owner, &token_addr);

    client.fund_quest(&owner, &q_id, &5_000, &FundingModel::HostOnly);
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

    let q_id = create_test_quest(&env, &quest_client, &owner, &token_addr);

    client.fund_quest(&owner, &q_id, &5_000, &FundingModel::HostOnly);
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

    let q_id = create_test_quest(&env, &quest_client, &owner, &token_addr);

    client.fund_quest(&owner, &q_id, &100, &FundingModel::HostOnly);
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

    let q_id = create_test_quest(&env, &quest_client, &owner, &token_addr);

    client.fund_quest(&owner, &q_id, &5_000, &FundingModel::HostOnly);

    let result = client.try_distribute_reward(&imposter, &q_id, &enrollee, &100);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_distribute_quest_not_funded() {
    let (_env, client, _cid, _token_addr, _quest_client, _quest_id) = setup();
    let owner = Address::generate(&_env);
    let enrollee = Address::generate(&_env);
    // Even if quest exists, if not funded it has no authority
    let result = client.try_distribute_reward(&owner, &999, &enrollee, &100);
    assert_eq!(result, Err(Ok(Error::QuestNotFunded)));
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

    // Any random address can initialize -- no deployer auth required
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

    let q_id = create_test_quest(&env, &quest_client, &owner, &token_addr);

    client.fund_quest(&owner, &q_id, &5_000, &FundingModel::HostOnly);

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

    let q_id = create_test_quest(&env, &quest_client, &owner, &token_addr);

    client.fund_quest(&owner, &q_id, &5_000, &FundingModel::HostOnly);

    // No milestone created, no completion verified -- distribute succeeds anyway
    client.distribute_reward(&owner, &q_id, &arbitrary_recipient, &500);

    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&arbitrary_recipient), 500);
    assert_eq!(client.get_pool_balance(&q_id), 4_500);
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

    // Create a quest owned by legitimate_owner
    let q_id = create_test_quest(&env, &quest_client, &legitimate_owner, &token_addr);

    // Attacker tries to fund and become authority -- should FAIL with Unauthorized
    let result = client.try_fund_quest(&attacker, &q_id, &1, &FundingModel::HostOnly);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));

    // Pool remains empty
    assert_eq!(client.get_pool_balance(&q_id), 0);

    // Legitimate owner can still fund their own quest
    client.fund_quest(&legitimate_owner, &q_id, &5_000, &FundingModel::HostOnly);
    assert_eq!(client.get_pool_balance(&q_id), 5_000);
}

// ---- Funding Model Tests ----

/// Test that HostOnly funding model only allows the original funder to add more funds
#[test]
fn test_funding_model_host_only() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let owner = Address::generate(&env);
    let other = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);
    sac.mint(&other, &10_000);

    let q_id = create_test_quest(&env, &quest_client, &owner, &token_addr);

    // Owner funds quest with HostOnly model
    client.fund_quest(&owner, &q_id, &1_000, &FundingModel::HostOnly);
    assert_eq!(client.get_pool_balance(&q_id), 1_000);
    assert_eq!(client.get_funding_model(&q_id), Some(FundingModel::HostOnly));

    // Owner can add more funds
    client.fund_quest(&owner, &q_id, &500, &FundingModel::HostOnly);
    assert_eq!(client.get_pool_balance(&q_id), 1_500);

    // Other person cannot fund HostOnly quest
    let result = client.try_fund_quest(&other, &q_id, &1_000, &FundingModel::HostOnly);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));

    // Pool balance unchanged
    assert_eq!(client.get_pool_balance(&q_id), 1_500);
}

/// Test that Anyone funding model allows anyone to contribute after owner initializes
#[test]
fn test_funding_model_anyone() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let owner = Address::generate(&env);
    let contributor1 = Address::generate(&env);
    let contributor2 = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);
    sac.mint(&contributor1, &10_000);
    sac.mint(&contributor2, &10_000);

    let q_id = create_test_quest(&env, &quest_client, &owner, &token_addr);

    // Owner funds quest with Anyone model (must be owner for first funding)
    client.fund_quest(&owner, &q_id, &1_000, &FundingModel::Anyone);
    assert_eq!(client.get_pool_balance(&q_id), 1_000);
    assert_eq!(client.get_funding_model(&q_id), Some(FundingModel::Anyone));

    // Contributor1 can add funds
    client.fund_quest(&contributor1, &q_id, &500, &FundingModel::Anyone);
    assert_eq!(client.get_pool_balance(&q_id), 1_500);

    // Contributor2 can also add funds
    client.fund_quest(&contributor2, &q_id, &750, &FundingModel::Anyone);
    assert_eq!(client.get_pool_balance(&q_id), 2_250);

    // Owner can still add more funds
    client.fund_quest(&owner, &q_id, &250, &FundingModel::Anyone);
    assert_eq!(client.get_pool_balance(&q_id), 2_500);

    // Verify token balances
    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&owner), 8_750);
    assert_eq!(token_client.balance(&contributor1), 9_500);
    assert_eq!(token_client.balance(&contributor2), 9_250);
}

/// Test that non-owner funding fails for HostOnly quests
#[test]
fn test_host_only_rejects_non_owner() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let owner = Address::generate(&env);
    let non_owner = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);
    sac.mint(&non_owner, &10_000);

    let q_id = create_test_quest(&env, &quest_client, &owner, &token_addr);

    // Owner creates HostOnly quest
    client.fund_quest(&owner, &q_id, &5_000, &FundingModel::HostOnly);

    // Non-owner attempts to fund
    let result = client.try_fund_quest(&non_owner, &q_id, &1_000, &FundingModel::HostOnly);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));

    // Pool should only have owner's contribution
    assert_eq!(client.get_pool_balance(&q_id), 5_000);
}

/// Test that anyone can fund Anyone quests (after owner initializes)
#[test]
fn test_anyone_allows_all_funders() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let owner = Address::generate(&env);
    let funder1 = Address::generate(&env);
    let funder2 = Address::generate(&env);
    let funder3 = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);
    sac.mint(&funder1, &10_000);
    sac.mint(&funder2, &10_000);
    sac.mint(&funder3, &10_000);

    let q_id = create_test_quest(&env, &quest_client, &owner, &token_addr);

    // Owner creates Anyone quest (first funding must be owner)
    client.fund_quest(&owner, &q_id, &1_000, &FundingModel::Anyone);

    // Multiple funders can contribute
    client.fund_quest(&funder1, &q_id, &2_000, &FundingModel::Anyone);
    client.fund_quest(&funder2, &q_id, &1_500, &FundingModel::Anyone);
    client.fund_quest(&funder3, &q_id, &500, &FundingModel::Anyone);

    // Total pool should be sum of all contributions
    assert_eq!(client.get_pool_balance(&q_id), 5_000);

    // Verify all funders' balances decreased
    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&owner), 9_000);
    assert_eq!(token_client.balance(&funder1), 8_000);
    assert_eq!(token_client.balance(&funder2), 8_500);
    assert_eq!(token_client.balance(&funder3), 9_500);
}

/// Test that funding model is set on first funding and persists
#[test]
fn test_funding_model_set_on_first_funding() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let owner = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    let q_id = create_test_quest(&env, &quest_client, &owner, &token_addr);

    // Before funding, no funding model exists
    assert_eq!(client.get_funding_model(&q_id), None);

    // Fund with HostOnly model
    client.fund_quest(&owner, &q_id, &1_000, &FundingModel::HostOnly);

    // Funding model should now be set
    assert_eq!(client.get_funding_model(&q_id), Some(FundingModel::HostOnly));

    // Add more funds with same model - should succeed
    client.fund_quest(&owner, &q_id, &500, &FundingModel::HostOnly);
    assert_eq!(client.get_funding_model(&q_id), Some(FundingModel::HostOnly));

    // Try to fund with different model - should fail
    let result = client.try_fund_quest(&owner, &q_id, &500, &FundingModel::Anyone);
    assert_eq!(result, Err(Ok(Error::FundingModelMismatch)));
}

/// Test different quests can have different funding models
#[test]
fn test_different_quests_different_models() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let contributor = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner1, &10_000);
    sac.mint(&owner2, &10_000);
    sac.mint(&contributor, &10_000);

    // Quest 0: HostOnly (owned by owner1)
    let q0 = create_test_quest(&env, &quest_client, &owner1, &token_addr);
    client.fund_quest(&owner1, &q0, &1_000, &FundingModel::HostOnly);
    assert_eq!(client.get_funding_model(&q0), Some(FundingModel::HostOnly));

    // Quest 1: Anyone (owned by owner2)
    let q1 = create_test_quest(&env, &quest_client, &owner2, &token_addr);
    client.fund_quest(&owner2, &q1, &1_000, &FundingModel::Anyone);
    assert_eq!(client.get_funding_model(&q1), Some(FundingModel::Anyone));

    // Contributor cannot fund quest 0 (HostOnly)
    let result = client.try_fund_quest(&contributor, &q0, &500, &FundingModel::HostOnly);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));

    // But can fund quest 1 (Anyone)
    client.fund_quest(&contributor, &q1, &500, &FundingModel::Anyone);

    assert_eq!(client.get_pool_balance(&q0), 1_000);
    assert_eq!(client.get_pool_balance(&q1), 1_500);
}

/// Test that non-owner cannot do initial funding even with Anyone model
#[test]
fn test_initial_funding_requires_owner() {
    let (env, client, _cid, token_addr, quest_client, _quest_id) = setup();
    let owner = Address::generate(&env);
    let non_owner = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&non_owner, &10_000);

    let q_id = create_test_quest(&env, &quest_client, &owner, &token_addr);

    // Non-owner tries to be the first funder with Anyone model -- should fail
    let result = client.try_fund_quest(&non_owner, &q_id, &1_000, &FundingModel::Anyone);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));

    // Pool remains empty
    assert_eq!(client.get_pool_balance(&q_id), 0);
}
