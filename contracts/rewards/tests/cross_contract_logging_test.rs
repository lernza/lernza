use certificate::{CertificateContract, CertificateContractClient};
use common::Visibility;
use milestone::{MilestoneContract, MilestoneContractClient};
use quest::{QuestContract, QuestContractClient};
use rewards::{RewardsContract, RewardsContractClient};
use soroban_sdk::{testutils::Address as _, token::StellarAssetClient, Address, Env, String, Vec};

#[test]
fn test_fund_quest_emits_cross_contract_log() {
    let env = Env::default();
    env.mock_all_auths();

    // token
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin);
    let token_addr = token_contract.address();

    // register other contracts
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
    // create quest -> add enrollee
    QuestContractClient::new(&env, &quest_id).create_quest(
        &owner,
        &String::from_str(&env, "Cross-Contract Quest"),
        &String::from_str(&env, "Integration test quest"),
        &String::from_str(&env, "Programming"),
        &Vec::<String>::new(&env),
        &token_addr,
        &Visibility::Public,
        &None,
    );
    QuestContractClient::new(&env, &quest_id).add_enrollee(&0u32, &enrollee);

    // make sure owner has tokens
    StellarAssetClient::new(&env, &token_addr).mint(&owner, &10_000_i128);

    // call fund_quest — this does a cross-contract call into quest.get_quest
    RewardsContractClient::new(&env, &rewards_id).fund_quest(&owner, &0u32, &5_000_i128);

    // Collect events and assert cross_contract_call exists
    let events = env.events().all();
    let mut found = false;
    for e in events.iter() {
        if e.topics().len() > 0 {
            let sym = e.topics().get(0).unwrap();
            if sym.as_str() == "cross_contract_call" {
                found = true;
            }
        }
    }
    assert!(found, "expected cross_contract_call event to be emitted");
}
