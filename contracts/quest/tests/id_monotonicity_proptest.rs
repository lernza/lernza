//! Property test: NextId is strictly monotonic across all quest flows.
//!
//! Randomly interleaves create_quest and archive_quest operations and asserts
//! that every returned quest ID is strictly greater than the previous one.

use proptest::prelude::*;
use quest::{QuestContract, QuestContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

use common::Visibility;

/// Actions that can be applied to the quest contract.
#[derive(Debug, Clone)]
enum Action {
    Create,
    Archive(usize), // archive the quest at position `index % created.len()`
    Enroll(usize),  // enroll a random address into quest at `index % created.len()`
}

fn arb_action() -> impl Strategy<Value = Action> {
    prop_oneof![
        Just(Action::Create),
        (0usize..100).prop_map(Action::Archive),
        (0usize..100).prop_map(Action::Enroll),
    ]
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(1000))]
    #[test]
    fn next_id_is_strictly_monotonic(actions in proptest::collection::vec(arb_action(), 1..50)) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(QuestContract, ());
        let client = QuestContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let _token = Address::generate(&env);

        // token must look like a contract address (starts with 'C', len 56)
        // Use a fixed valid-looking address via register
        let fake_token = env.register(QuestContract, ()); // any contract address works

        let mut created: Vec<u32> = Vec::new(&env);
        let mut prev_id: Option<u32> = None;

        for action in &actions {
            match action {
                Action::Create => {
                    let id = client.create_quest(
                        &owner,
                        &String::from_str(&env, "Quest"),
                        &String::from_str(&env, "Description"),
                        &String::from_str(&env, "Programming"),
                        &soroban_sdk::Vec::<String>::new(&env),
                        &fake_token,
                        &Visibility::Public,
                        &None,
                    );
                    // Each new ID must be strictly greater than the previous
                    if let Some(prev) = prev_id {
                        prop_assert!(id > prev, "id {} not > prev {}", id, prev);
                    }
                    prev_id = Some(id);
                    created.push_back(id);
                }
                Action::Archive(idx) => {
                    if created.is_empty() { continue; }
                    let quest_id = created.get(*idx as u32 % created.len()).unwrap();
                    // archive may fail if already archived — ignore errors
                    let _ = client.try_archive_quest(&quest_id);
                }
                Action::Enroll(idx) => {
                    if created.is_empty() { continue; }
                    let quest_id = created.get(*idx as u32 % created.len()).unwrap();
                    let enrollee = Address::generate(&env);
                    let _ = client.try_add_enrollee(&quest_id, &enrollee);
                }
            }
        }
    }
}
