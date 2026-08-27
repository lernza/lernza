use certificate::CertificateContract;
use common::Visibility;
use milestone::{MilestoneContract, MilestoneContractClient};
use quest::{QuestContract, QuestContractClient};
use rewards::{Error as RewardsError, RewardsContract, RewardsContractClient};
use soroban_sdk::{testutils::Address as _, token::StellarAssetClient, Address, Env, String, Vec};

#[test]
fn test_insufficient_pool_rejects_large_distribution() {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy token + contracts
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin);
    let token_addr = token_contract.address();

    let quest_id = env.register(QuestContract, ());
    let milestone_id = env.register(MilestoneContract, ());
    let certificate_id = env.register(CertificateContract, (milestone_id.clone(),));
    let rewards_id = env.register(RewardsContract, ());

    let admin = Address::generate(&env);
    MilestoneContractClient::new(&env, &milestone_id).initialize(
        &admin,
        &quest_id,
        &certificate_id,
    );
    RewardsContractClient::new(&env, &rewards_id).initialize(
        &admin,
        &token_addr,
        &quest_id,
        &milestone_id,
    );

    let owner = Address::generate(&env);
    let enrollee = Address::generate(&env);

    // create quest and enrollee
    QuestContractClient::new(&env, &quest_id).create_quest(
        &owner,
        &String::from_str(&env, "Overflow Quest"),
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Cat"),
        &Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
        &None,
    );
    QuestContractClient::new(&env, &quest_id).add_enrollee(&0u32, &enrollee);

    // owner has limited tokens
    StellarAssetClient::new(&env, &token_addr).mint(&owner, &1000_i128);

    // fund pool with 500
    RewardsContractClient::new(&env, &rewards_id).fund_quest(&owner, &0u32, &500_i128);

    // create milestone and verify
    let ms_id = MilestoneContractClient::new(&env, &milestone_id).create_milestone(
        &owner,
        &0u32,
        &String::from_str(&env, "M"),
        &String::from_str(&env, "D"),
        &1000_i128,
        &false,
    );
    MilestoneContractClient::new(&env, &milestone_id)
        .verify_completion(&owner, &0u32, &ms_id, &enrollee);

    // attempt distribution larger than pool -> should fail with InsufficientPool
    let res = RewardsContractClient::new(&env, &rewards_id)
        .try_distribute_reward(&owner, &0u32, &ms_id, &enrollee, &1000_i128);
    assert_eq!(res, Err(Ok(RewardsError::InsufficientPool)));
}
