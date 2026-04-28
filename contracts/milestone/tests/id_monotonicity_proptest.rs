//! Property test: NextMilestoneId is strictly monotonic across all milestone flows.
//!
//! Randomly interleaves create_milestone and verify_completion operations and
//! asserts that every returned milestone ID is strictly greater than the previous
//! one within a given quest.

use certificate::CertificateContract;
use common::Visibility;
use milestone::{MilestoneContract, MilestoneContractClient};
use proptest::prelude::*;
use quest::{QuestContract, QuestContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

#[derive(Debug, Clone)]
enum Action {
    CreateMilestone,
    Verify(usize), // verify milestone at `index % created.len()`
}

fn arb_action() -> impl Strategy<Value = Action> {
    prop_oneof![
        Just(Action::CreateMilestone),
        (0usize..100).prop_map(Action::Verify),
    ]
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(1000))]
    #[test]
    fn next_milestone_id_is_strictly_monotonic(
        actions in proptest::collection::vec(arb_action(), 1..50)
    ) {
        let env = Env::default();
        env.mock_all_auths();

        let quest_id = env.register(QuestContract, ());
        let quest_client = QuestContractClient::new(&env, &quest_id);

        let milestone_id = env.register(MilestoneContract, ());
        let milestone_client = MilestoneContractClient::new(&env, &milestone_id);

        let cert_id = env.register(CertificateContract, (milestone_id.clone(),));

        let admin = Address::generate(&env);
        milestone_client.initialize(&admin, &quest_id, &cert_id);

        let owner = Address::generate(&env);
        let fake_token = env.register(QuestContract, ());

        let qid = quest_client.create_quest(
            &owner,
            &String::from_str(&env, "Quest"),
            &String::from_str(&env, "Description"),
            &String::from_str(&env, "Programming"),
            &Vec::<String>::new(&env),
            &fake_token,
            &Visibility::Public,
            &None,
        );

        // Enroll a learner so verify_completion can succeed
        let learner = Address::generate(&env);
        quest_client.add_enrollee(&qid, &learner);

        let mut created: std::vec::Vec<u32> = std::vec::Vec::new();
        let mut prev_id: Option<u32> = None;

        for action in &actions {
            match action {
                Action::CreateMilestone => {
                    let mid = milestone_client.create_milestone(
                        &owner,
                        &qid,
                        &String::from_str(&env, "Milestone"),
                        &String::from_str(&env, "Description"),
                        &100,
                        &false,
                    );
                    if let Some(prev) = prev_id {
                        prop_assert!(mid > prev, "milestone id {} not > prev {}", mid, prev);
                    }
                    prev_id = Some(mid);
                    created.push(mid);
                }
                Action::Verify(idx) => {
                    if created.is_empty() { continue; }
                    let mid = created[*idx % created.len()];
                    // ignore errors (already completed, etc.)
                    let _ = milestone_client.try_verify_completion(&owner, &qid, &mid, &learner);
                }
            }
        }
    }
}
