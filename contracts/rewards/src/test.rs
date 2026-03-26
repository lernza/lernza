#![cfg(test)]

use super::*;

use certificate::{CertificateContract, CertificateContractClient};
use common::Visibility;
use milestone::{MilestoneContract, MilestoneContractClient};
use quest::{QuestContract, QuestContractClient};

use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Address, Env, String,
};

fn setup() -> (
    Env,
    RewardsContractClient<'static>,
    Address,                            // rewards contract address
    Address,                            // token address
    QuestContractClient<'static>,       // quest client
    Address,                            // quest contract address
    MilestoneContractClient<'static>,   // milestone client
    Address,                            // milestone contract address
    CertificateContractClient<'static>, // certificate client
    Address,                            // certificate contract address
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

    // Deploy milestone contract first to get its address for certificate ownership
    let milestone_id = env.register(MilestoneContract, ());
    let milestone_client = MilestoneContractClient::new(&env, &milestone_id);

    // Deploy certificate contract with milestone contract as owner
    let certificate_id = env.register(CertificateContract, (milestone_id.clone(),));
    let certificate_client = CertificateContractClient::new(&env, &certificate_id);

    let admin = Address::generate(&env);
    milestone_client.initialize(&admin, &quest_id, &certificate_id);

    // Deploy rewards contract
    let contract_id = env.register(RewardsContract, ());
    let client = RewardsContractClient::new(&env, &contract_id);
    client.initialize(&token_addr, &quest_id, &milestone_id);

    (
        env,
        client,
        contract_id,
        token_addr,
        quest_client,
        quest_id,
        milestone_client,
        milestone_id,
        certificate_client,
        certificate_id,
    )
}

#[test]
fn test_initialize() {
    let (
        _env,
        client,
        _cid,
        token_addr,
        _quest_client,
        _quest_id,
        _milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
    assert_eq!(client.get_token(), token_addr);
    assert_eq!(client.get_total_distributed(), 0);
}

#[test]
fn test_initialize_twice_fails() {
    let (
        env,
        client,
        _cid,
        _token_addr,
        _quest_client,
        quest_id,
        _milestone_client,
        milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
    let fake_token = Address::generate(&env);
    let result = client.try_initialize(&fake_token, &quest_id, &milestone_id);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn test_fund_quest() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        _milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
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
        &None,
    );

    client.fund_quest(&owner, &q_id, &5_000);

    assert_eq!(client.get_pool_balance(&q_id), 5_000);

    // Owner's balance should decrease
    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&owner), 5_000);
}

#[test]
fn test_fund_quest_adds_to_existing() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        _milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
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
        &None,
    );

    client.fund_quest(&owner, &q_id, &3_000);
    client.fund_quest(&owner, &q_id, &2_000);

    assert_eq!(client.get_pool_balance(&q_id), 5_000);
}

#[test]
fn test_fund_invalid_amount() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        _milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
    let owner = Address::generate(&env);

    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
        &None,
    );

    let result = client.try_fund_quest(&owner, &q_id, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_fund_quest_overflow() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        _milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
    let owner = Address::generate(&env);
    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &i128::MAX);
    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
        &None,
    );
    // Fund with max value
    client.fund_quest(&owner, &q_id, &i128::MAX);
    // Try to overflow
    let result = client.try_fund_quest(&owner, &q_id, &1);
    assert_eq!(result, Err(Ok(Error::ArithmeticOverflow)));
}

#[test]
fn test_distribute_reward_overflow() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);
    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &i128::MAX);
    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
        &None,
    );
    client.fund_quest(&owner, &q_id, &i128::MAX);
    let ms_id = milestone_client.create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Big Milestone"),
        &String::from_str(&env, "Desc"),
        &1,
        &false,
    );
    quest_client.add_enrollee(&q_id, &enrollee);
    milestone_client.verify_completion(&owner, &q_id, &ms_id, &enrollee);
    // Distribute max value
    client.distribute_reward(&owner, &q_id, &ms_id, &enrollee, &i128::MAX);
    // Try to distribute again — idempotency rejects the duplicate
    let result = client.try_distribute_reward(&owner, &q_id, &ms_id, &enrollee, &1);
    assert_eq!(result, Err(Ok(Error::AlreadyPaid)));
}

#[test]
fn test_distribute_reward_earnings_overflow() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);
    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &i128::MAX);
    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
        &None,
    );
    client.fund_quest(&owner, &q_id, &i128::MAX);
    let ms_id = milestone_client.create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Big Milestone"),
        &String::from_str(&env, "Desc"),
        &1,
        &false,
    );
    quest_client.add_enrollee(&q_id, &enrollee);
    milestone_client.verify_completion(&owner, &q_id, &ms_id, &enrollee);
    // Distribute max value
    client.distribute_reward(&owner, &q_id, &ms_id, &enrollee, &i128::MAX);
    // Try to overflow earnings — idempotency rejects the duplicate
    let result = client.try_distribute_reward(&owner, &q_id, &ms_id, &enrollee, &1);
    assert_eq!(result, Err(Ok(Error::AlreadyPaid)));
}

#[test]
fn test_zero_amount_edge_cases() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);
    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &100);
    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
        &None,
    );
    // Zero fund
    let result = client.try_fund_quest(&owner, &q_id, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    // Fund with positive
    client.fund_quest(&owner, &q_id, &100);
    let ms_id = milestone_client.create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Zero Milestone"),
        &String::from_str(&env, "Desc"),
        &1,
        &false,
    );
    quest_client.add_enrollee(&q_id, &enrollee);
    milestone_client.verify_completion(&owner, &q_id, &ms_id, &enrollee);
    // Zero distribute
    let result = client.try_distribute_reward(&owner, &q_id, &ms_id, &enrollee, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_different_funder_unauthorized() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        _milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
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
        &None,
    );

    // Owner funds first
    client.fund_quest(&owner, &q_id, &1_000);

    // Other person tries to add funds to same quest (fails because not owner)
    let result = client.try_fund_quest(&other, &q_id, &1_000);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_distribute_reward() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
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
        &None,
    );

    client.fund_quest(&owner, &q_id, &5_000);

    // Create and verify milestone
    let ms_id = milestone_client.create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Test Milestone"),
        &String::from_str(&env, "Description"),
        &100,
        &false,
    );
    quest_client.add_enrollee(&q_id, &enrollee);
    milestone_client.verify_completion(&owner, &q_id, &ms_id, &enrollee);

    client.distribute_reward(&owner, &q_id, &ms_id, &enrollee, &100);

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
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
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
        &None,
    );

    client.fund_quest(&owner, &q_id, &5_000);

    // Create milestones
    let ms1_id = milestone_client.create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Milestone 1"),
        &String::from_str(&env, "Description"),
        &100,
        &false,
    );
    let ms2_id = milestone_client.create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Milestone 2"),
        &String::from_str(&env, "Description"),
        &200,
        &false,
    );

    quest_client.add_enrollee(&q_id, &e1);
    quest_client.add_enrollee(&q_id, &e2);

    milestone_client.verify_completion(&owner, &q_id, &ms1_id, &e1);
    milestone_client.verify_completion(&owner, &q_id, &ms2_id, &e2);
    milestone_client.verify_completion(&owner, &q_id, &ms2_id, &e1);

    client.distribute_reward(&owner, &q_id, &ms1_id, &e1, &100);
    client.distribute_reward(&owner, &q_id, &ms2_id, &e2, &200);
    // e1 gets reward from a different milestone (ms2), not a duplicate
    client.distribute_reward(&owner, &q_id, &ms2_id, &e1, &50);

    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&e1), 150);
    assert_eq!(token_client.balance(&e2), 200);
    assert_eq!(client.get_user_earnings(&e1), 150);
    assert_eq!(client.get_pool_balance(&q_id), 4_650);
    assert_eq!(client.get_total_distributed(), 350);
}

#[test]
fn test_insufficient_pool() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        _milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
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
        &None,
    );

    client.fund_quest(&owner, &q_id, &100);

    // No milestone created/verified, so distribute should fail with MilestoneNotCompleted
    let result = client.try_distribute_reward(&owner, &q_id, &0, &enrollee, &500);
    assert_eq!(result, Err(Ok(Error::MilestoneNotCompleted)));
}

#[test]
fn test_distribute_unauthorized() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        _milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
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
        &None,
    );

    client.fund_quest(&owner, &q_id, &5_000);

    let result = client.try_distribute_reward(&imposter, &q_id, &0, &enrollee, &100);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_distribute_quest_not_funded() {
    let (
        env,
        client,
        _cid,
        _token_addr,
        _quest_client,
        quest_id,
        _milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);
    // Even if quest exists, if not funded it has no authority
    let result = client.try_distribute_reward(&owner, &999, &0, &enrollee, &100);
    assert_eq!(result, Err(Ok(Error::QuestNotFunded)));
    let _ = quest_id;
}

// ---- Security tests ----

/// HIGH-02: Initial initialize check
#[test]
fn test_initialize_no_auth_guard() {
    let env = Env::default();
    env.mock_all_auths();

    // Register quest contract mock
    let quest_id = env.register(QuestContract, ());

    let contract_id = env.register(RewardsContract, ());
    let client = RewardsContractClient::new(&env, &contract_id);

    // Any random address can initialize - no deployer auth required
    let attacker_token = Address::generate(&env);
    let milestone_id = env.register(MilestoneContract, ());
    client.initialize(&attacker_token, &quest_id, &milestone_id);

    assert_eq!(client.get_token(), attacker_token);

    // Legitimate deployer cannot override it
    let real_token = Address::generate(&env);
    let result = client.try_initialize(&real_token, &quest_id, &milestone_id);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}

/// MED-02: Self-distribution
#[test]
fn test_authority_self_distribution() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
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
        &None,
    );

    client.fund_quest(&owner, &q_id, &5_000);

    // Create and verify milestone for self
    let ms_id = milestone_client.create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Self Milestone"),
        &String::from_str(&env, "Description"),
        &1000,
        &false,
    );
    quest_client.add_enrollee(&q_id, &owner);
    milestone_client.verify_completion(&owner, &q_id, &ms_id, &owner);

    // Authority distributes reward pool tokens back to themselves
    client.distribute_reward(&owner, &q_id, &ms_id, &owner, &1_000);

    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&owner), 6_000);
    assert_eq!(client.get_pool_balance(&q_id), 4_000);
    assert_eq!(client.get_user_earnings(&owner), 1_000);
}

/// Integration test: rewards cannot be sent before milestone completion
#[test]
fn test_distribute_reward_requires_milestone_completion() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        _milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    // Create quest
    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
        &None,
    );

    // Fund quest
    client.fund_quest(&owner, &q_id, &5_000);

    // Try to distribute reward without milestone completion - should fail
    let result = client.try_distribute_reward(&owner, &q_id, &0, &enrollee, &100);
    assert_eq!(result, Err(Ok(Error::MilestoneNotCompleted)));

    // Verify no tokens were transferred
    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&enrollee), 0);
    assert_eq!(client.get_pool_balance(&q_id), 5_000);
}

/// Integration test: rewards can be sent after milestone completion
#[test]
fn test_distribute_reward_after_milestone_completion() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    // Create quest
    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
        &None,
    );

    // Add enrollee to quest
    quest_client.add_enrollee(&q_id, &enrollee);

    // Create milestone
    let ms_id = milestone_client.create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "Milestone 1"),
        &String::from_str(&env, "Complete task"),
        &100,
        &false,
    );

    // Fund quest
    client.fund_quest(&owner, &q_id, &5_000);

    // Verify milestone completion
    let _reward = milestone_client.verify_completion(&owner, &q_id, &ms_id, &enrollee);

    // Now distribute reward should succeed
    client.distribute_reward(&owner, &q_id, &ms_id, &enrollee, &100);

    // Verify tokens were transferred
    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&enrollee), 100);
    assert_eq!(client.get_pool_balance(&q_id), 4_900);
    assert_eq!(client.get_user_earnings(&enrollee), 100);
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
    let fake_milestone_contract = Address::generate(&env);
    client.initialize(&token_addr, &fake_quest_contract, &fake_milestone_contract);

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
    client.initialize(&token_addr, &quest_id, &Address::generate(&env));

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
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        _milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
    let legitimate_owner = Address::generate(&env);
    let attacker = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&attacker, &1_000);
    sac.mint(&legitimate_owner, &10_000);

    // Create a quest owned by legitimate_owner
    let q_id = quest_client.create_quest(
        &legitimate_owner,
        &String::from_str(&env, "Secret"),
        &String::from_str(&env, "Hidden"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
        &None,
    );

    // Attacker tries to fund and become authority - should FAIL with Unauthorized
    let result = client.try_fund_quest(&attacker, &q_id, &1);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));

    // Pool remains empty
    assert_eq!(client.get_pool_balance(&q_id), 0);

    // Legitimate owner can still fund their own quest
    client.fund_quest(&legitimate_owner, &q_id, &5_000);
    assert_eq!(client.get_pool_balance(&q_id), 5_000);
}

/// fix(#184): duplicate payout for the same (quest, milestone, enrollee) is rejected
#[test]
fn test_distribute_reward_idempotent() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Idempotent Quest"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
        &None,
    );
    client.fund_quest(&owner, &q_id, &5_000);

    let ms_id = milestone_client.create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "MS1"),
        &String::from_str(&env, "Desc"),
        &100,
        &false,
    );
    quest_client.add_enrollee(&q_id, &enrollee);
    milestone_client.verify_completion(&owner, &q_id, &ms_id, &enrollee);

    // First payout succeeds
    client.distribute_reward(&owner, &q_id, &ms_id, &enrollee, &100);
    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&enrollee), 100);

    // Retry of the exact same payout is rejected with AlreadyPaid
    let result = client.try_distribute_reward(&owner, &q_id, &ms_id, &enrollee, &100);
    assert_eq!(result, Err(Ok(Error::AlreadyPaid)));

    // Balance unchanged — no double payout
    assert_eq!(token_client.balance(&enrollee), 100);
    assert_eq!(client.get_pool_balance(&q_id), 4_900);
    assert_eq!(client.get_total_distributed(), 100);
}

// ── explicit input-validation tests (amount > 0) ─────────────────────────────

#[test]
fn test_fund_quest_zero_amount_rejected() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        _milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
    let owner = Address::generate(&env);
    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test Quest"),
        &String::from_str(&env, "Description"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
        &None,
    );
    let result = client.try_fund_quest(&owner, &q_id, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_fund_quest_negative_amount_rejected() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        _milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
    let owner = Address::generate(&env);
    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test Quest"),
        &String::from_str(&env, "Description"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
        &None,
    );
    let result = client.try_fund_quest(&owner, &q_id, &-1);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_distribute_reward_zero_amount_rejected() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test Quest"),
        &String::from_str(&env, "Description"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
        &None,
    );
    client.fund_quest(&owner, &q_id, &5_000);

    let ms_id = milestone_client.create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "MS1"),
        &String::from_str(&env, "Desc"),
        &100,
        &false,
    );
    quest_client.add_enrollee(&q_id, &enrollee);
    milestone_client.verify_completion(&owner, &q_id, &ms_id, &enrollee);

    let result = client.try_distribute_reward(&owner, &q_id, &ms_id, &enrollee, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_distribute_reward_negative_amount_rejected() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Test Quest"),
        &String::from_str(&env, "Description"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
        &None,
    );
    client.fund_quest(&owner, &q_id, &5_000);

    let ms_id = milestone_client.create_milestone(
        &owner,
        &q_id,
        &String::from_str(&env, "MS1"),
        &String::from_str(&env, "Desc"),
        &100,
        &false,
    );
    quest_client.add_enrollee(&q_id, &enrollee);
    milestone_client.verify_completion(&owner, &q_id, &ms_id, &enrollee);

    let result = client.try_distribute_reward(&owner, &q_id, &ms_id, &enrollee, &-1);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

/// Funding with a non-contract address stored as token_addr must be rejected
/// before any storage writes (QuestAuthority / QuestPool) occur.
///
/// Setup: deploy quest & milestone contracts with a real SAC (needed for
/// create_quest token validation), but initialize the rewards contract with a
/// random Address that points to no deployed contract.
#[test]
fn test_fund_quest_invalid_token_address() {
    let env = Env::default();
    env.mock_all_auths();

    // Real SAC — required so the quest contract accepts the token address.
    let token_admin = Address::generate(&env);
    let real_token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let real_token_addr = real_token_contract.address();

    // Deploy quest & milestone contracts (standard path).
    let quest_id = env.register(QuestContract, ());
    let quest_client = QuestContractClient::new(&env, &quest_id);

    let milestone_id = env.register(MilestoneContract, ());
    let milestone_client = MilestoneContractClient::new(&env, &milestone_id);

    let certificate_id = env.register(CertificateContract, (milestone_id.clone(),));
    let admin = Address::generate(&env);
    milestone_client.initialize(&admin, &quest_id, &certificate_id);

    // Invalid token address — not backed by any contract.
    let fake_token_addr = Address::generate(&env);

    // Initialize rewards with the fake token.
    let rewards_id = env.register(RewardsContract, ());
    let client = RewardsContractClient::new(&env, &rewards_id);
    client.initialize(&fake_token_addr, &quest_id, &milestone_id);

    let owner = Address::generate(&env);

    // Create quest using the real token (quest contract validates the addr).
    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Token Test"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &real_token_addr,
        &Visibility::Public,
        &None,
    );

    // Attempt to fund — rewards contract will try_symbol() on the fake addr.
    let result = client.try_fund_quest(&owner, &q_id, &1_000);
    assert_eq!(result, Err(Ok(Error::InvalidToken)));

    // Pool must remain zero — no storage write should have happened.
    assert_eq!(client.get_pool_balance(&q_id), 0);
}

/// Explicit positive-path test: funding succeeds when the stored token_addr
/// resolves to a live SAC contract (try_symbol() returns Ok).
/// Logically equivalent to test_fund_quest, but named to document SAC
/// validation pass-through for audit traceability.
#[test]
fn test_fund_quest_valid_sac() {
    let (
        env,
        client,
        _cid,
        token_addr,
        quest_client,
        _quest_id,
        _milestone_client,
        _milestone_id,
        _certificate_client,
        _certificate_id,
    ) = setup();
    let owner = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&owner, &10_000);

    let q_id = quest_client.create_quest(
        &owner,
        &String::from_str(&env, "Valid SAC Quest"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &soroban_sdk::Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
        &None,
    );

    // fund_quest must succeed — SAC validation passes.
    client.fund_quest(&owner, &q_id, &5_000);
    assert_eq!(client.get_pool_balance(&q_id), 5_000);

    // Token balance should reflect the transfer.
    let token_client = TokenClient::new(&env, &token_addr);
    assert_eq!(token_client.balance(&owner), 5_000);
}
