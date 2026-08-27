//! Property tests for quest ownership and enrollment invariants (issue #1440).
//!
//! Ownership: only the address stored as `QuestInfo.owner` may mutate a
//! quest via `update_quest`; every other address must be rejected with
//! `Error::Unauthorized`, regardless of how it was generated.
//!
//! Enrollment: across any interleaving of owner-add, self-join, remove, and
//! leave operations, the enrollee list must stay duplicate-free, capacity
//! must never be exceeded, and `is_enrollee` / `get_enrollees` /
//! `get_active_participant_count` must always agree with each other.

use common::Visibility;
use proptest::prelude::*;
use quest::{Error, QuestContract, QuestContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

fn setup_quest_with_owner() -> (Env, QuestContractClient<'static>, Address, u32) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(QuestContract, ());
    let client = QuestContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let fake_token = env.register(QuestContract, ());

    let quest_id = client.create_quest(
        &owner,
        &String::from_str(&env, "Quest"),
        &String::from_str(&env, "Description"),
        &String::from_str(&env, "Programming"),
        &Vec::<String>::new(&env),
        &fake_token,
        &Visibility::Public,
        &None,
        &None,
    );

    (env, client, owner, quest_id)
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    /// INVARIANT: `update_quest` succeeds for the real owner and is
    /// rejected with `Error::Unauthorized` for every other address, no
    /// matter how many distinct impostor addresses are tried in sequence.
    #[test]
    fn only_owner_can_update_quest(num_impostors in 1usize..8) {
        let (env, client, owner, quest_id) = setup_quest_with_owner();

        for _ in 0..num_impostors {
            let impostor = Address::generate(&env);
            prop_assert_ne!(impostor.clone(), owner.clone());

            let result = client.try_update_quest(
                &quest_id,
                &impostor,
                &Some(String::from_str(&env, "Hijacked")),
                &None,
                &None,
                &None,
                &None,
                &None,
            );
            prop_assert_eq!(
                result,
                Err(Ok(Error::Unauthorized)),
                "non-owner must not be able to update the quest"
            );
        }

        // The real owner must still be able to update the quest afterwards —
        // rejected impostor calls must not have corrupted any state.
        let result = client.try_update_quest(
            &quest_id,
            &owner,
            &Some(String::from_str(&env, "Renamed")),
            &None,
            &None,
            &None,
            &None,
            &None,
        );
        prop_assert!(result.is_ok(), "the real owner must still be able to update the quest");

        let quest = client.get_quest(&quest_id);
        prop_assert_eq!(quest.name, String::from_str(&env, "Renamed"));
        prop_assert_eq!(quest.owner, owner, "ownership must never change as a side effect of rejected updates");
    }
}

/// Enrollment operations used to build randomized interleavings.
#[derive(Debug, Clone)]
enum EnrollAction {
    OwnerAdd,
    SelfJoin,
    Remove(usize),
    Leave(usize),
}

fn arb_enroll_action() -> impl Strategy<Value = EnrollAction> {
    prop_oneof![
        Just(EnrollAction::OwnerAdd),
        Just(EnrollAction::SelfJoin),
        (0usize..20).prop_map(EnrollAction::Remove),
        (0usize..20).prop_map(EnrollAction::Leave),
    ]
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    /// INVARIANT: after every enrollment operation, in any order:
    /// - the enrollee list contains no duplicates
    /// - `is_enrollee` agrees with membership in `get_enrollees`
    /// - `get_active_participant_count` equals the number of enrollees
    ///   `get_active_participants` returns
    /// - the enrollment cap, once set, is never exceeded
    #[test]
    fn enrollment_state_stays_consistent(
        actions in proptest::collection::vec(arb_enroll_action(), 1..25),
        cap in prop::option::of(1u32..5),
    ) {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(QuestContract, ());
        let client = QuestContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let fake_token = env.register(QuestContract, ());

        let quest_id = client.create_quest(
            &owner,
            &String::from_str(&env, "Quest"),
            &String::from_str(&env, "Description"),
            &String::from_str(&env, "Programming"),
            &Vec::<String>::new(&env),
            &fake_token,
            &Visibility::Public,
            &cap,
            &None,
        );

        let mut tracked: std::vec::Vec<Address> = std::vec::Vec::new();

        for action in &actions {
            match action {
                EnrollAction::OwnerAdd => {
                    let candidate = Address::generate(&env);
                    if client.try_add_enrollee(&quest_id, &candidate).is_ok() {
                        tracked.push(candidate);
                    }
                }
                EnrollAction::SelfJoin => {
                    let candidate = Address::generate(&env);
                    if client.try_join_quest(&candidate, &quest_id).is_ok() {
                        tracked.push(candidate);
                    }
                }
                EnrollAction::Remove(idx) => {
                    if tracked.is_empty() { continue; }
                    let target = tracked[*idx % tracked.len()].clone();
                    if client.try_remove_enrollee(&quest_id, &target).is_ok() {
                        tracked.retain(|a| a != &target);
                    }
                }
                EnrollAction::Leave(idx) => {
                    if tracked.is_empty() { continue; }
                    let target = tracked[*idx % tracked.len()].clone();
                    if client.try_leave_quest(&target, &quest_id).is_ok() {
                        tracked.retain(|a| a != &target);
                    }
                }
            }

            // --- Invariants checked after every single operation ---

            let enrollees = client.get_enrollees(&quest_id);

            // No duplicates.
            let mut seen: std::vec::Vec<Address> = std::vec::Vec::new();
            for e in enrollees.iter() {
                prop_assert!(
                    !seen.contains(&e),
                    "duplicate enrollee found in get_enrollees: {:?}",
                    e
                );
                seen.push(e);
            }

            // Cap respected.
            if let Some(max) = cap {
                prop_assert!(
                    enrollees.len() <= max,
                    "enrollee count {} exceeded cap {}",
                    enrollees.len(),
                    max
                );
            }

            // is_enrollee agrees with get_enrollees for every tracked address.
            for addr in &tracked {
                let is_member = enrollees.iter().any(|e| &e == addr);
                let reported = client.is_enrollee(&quest_id, addr);
                prop_assert_eq!(
                    is_member, reported,
                    "is_enrollee disagreed with get_enrollees for {:?}",
                    addr
                );
            }

            // Active participant count matches active participant list length.
            let active = client.get_active_participants(&quest_id);
            let active_count = client.get_active_participant_count(&quest_id);
            prop_assert_eq!(
                active.len(),
                active_count,
                "get_active_participant_count disagreed with get_active_participants().len()"
            );

            // Every active participant must still be a current enrollee.
            for a in active.iter() {
                prop_assert!(
                    enrollees.iter().any(|e| e == a),
                    "active participant {:?} is not in the enrollee list",
                    a
                );
            }
        }
    }
}
