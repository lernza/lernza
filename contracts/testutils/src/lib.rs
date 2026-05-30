#![no_std]

use certificate::{CertificateContract, CertificateContractClient};
use common::Visibility;
use milestone::{MilestoneContract, MilestoneContractClient};
use quest::{QuestContract, QuestContractClient};
use rewards::{RewardsContract, RewardsContractClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Env, String, Vec,
};

/// Shared test setup for quest contract
pub fn setup_quest() -> (Env, QuestContractClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(QuestContract, ());
    let client = QuestContractClient::new(&env, &contract_id);
    let owner = Address::generate(&env);
    let token = Address::generate(&env);
    (env, client, owner, token)
}

/// Shared test setup for milestone contract with quest dependency
pub fn setup_milestone() -> (
    Env,
    MilestoneContractClient<'static>,
    QuestContractClient<'static>,
    Address, // milestone admin / default quest owner
) {
    let env = Env::default();
    env.mock_all_auths();

    // Register quest contract
    let quest_contract_id = env.register(QuestContract, ());
    let quest_client = QuestContractClient::new(&env, &quest_contract_id);

    // Register milestone contract
    let milestone_contract_id = env.register(MilestoneContract, ());
    let milestone_client = MilestoneContractClient::new(&env, &milestone_contract_id);

    let admin = Address::generate(&env);

    // Register certificate contract with milestone contract as owner,
    // so cross-contract minting from milestone passes auth checks.
    let certificate_contract_id =
        env.register(CertificateContract, (milestone_contract_id.clone(),));

    // Initialize milestone contract with quest + certificate contract addresses
    milestone_client.initialize(&admin, &quest_contract_id, &certificate_contract_id);

    (env, milestone_client, quest_client, admin)
}

/// Shared test setup for rewards contract with all dependencies
pub fn setup_rewards() -> (
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
    client.initialize(&admin, &token_addr, &quest_id, &milestone_id);

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

/// Create a quest owned by `owner` and return its auto-incremented ID.
/// The token address is a random throwaway — milestone logic never reads it.
pub fn create_quest(env: &Env, quest_client: &QuestContractClient, owner: &Address) -> u32 {
    quest_client.create_quest(
        owner,
        &String::from_str(env, "Quest"),
        &String::from_str(env, "Quest description"),
        &String::from_str(env, "Programming"),
        &Vec::<String>::new(env),
        &Address::generate(env),
        &Visibility::Public,
        &None,
    )
}

/// Helper to create a quest with specific parameters
pub fn create_quest_helper(
    env: &Env,
    client: &QuestContractClient,
    owner: &Address,
    token: &Address,
) -> u32 {
    client.create_quest(
        owner,
        &String::from_str(env, "My Quest"),
        &String::from_str(env, "Teaching my brother to code"),
        &String::from_str(env, "Programming"),
        &Vec::<String>::new(env),
        token,
        &Visibility::Public,
        &None,
    )
}

/// Create a milestone inside an existing quest and return its auto-incremented ID.
pub fn create_milestone(
    env: &Env,
    milestone_client: &MilestoneContractClient,
    owner: &Address,
    quest_id: u32,
    title: &str,
    reward: i128,
) -> u32 {
    milestone_client.create_milestone(
        owner,
        &quest_id,
        &String::from_str(env, title),
        &String::from_str(env, "Description"),
        &reward,
        &false,
    )
}

/// Generate a test token address
pub fn make_token(env: &Env) -> Address {
    Address::generate(env)
}