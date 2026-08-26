//! Property tests for milestone-completion invariants (issue #1440).
//!
//! Covers, across randomized interleavings of `verify_completion` calls:
//! - Ownership: only the real quest owner may verify a completion; every
//!   other caller is rejected with `Error::Unauthorized` and never mutates
//!   completion state.
//! - Enrollment: an address that was never enrolled is always rejected with
//!   `Error::NotEnrolled`.
//! - Idempotency: a given (milestone, enrollee) pair can be completed at
//!   most once; every subsequent attempt returns `Error::AlreadyCompleted`.
//! - Prerequisite ordering: a milestone created with `requires_previous`
//!   cannot be completed for an enrollee until the immediately preceding
//!   milestone has been completed for that same enrollee.
//!
//! `is_completed` and `get_enrollee_completions` are cross-checked against
//! a ground-truth model tracked alongside the contract calls after every
//! single operation, not just at the end of the sequence.

use certificate::CertificateContract;
use common::Visibility;
use milestone::{Error, MilestoneContract, MilestoneContractClient};
use proptest::prelude::*;
use quest::{QuestContract, QuestContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};
use std::collections::HashSet;

#[derive(Debug, Clone)]
struct VerifyAction {
    milestone_idx: usize,
    enrollee_idx: usize,
    impostor: bool,
}

fn arb_action() -> impl Strategy<Value = VerifyAction> {
    (0usize..3, 0usize..3, any::<bool>()).prop_map(|(milestone_idx, enrollee_idx, impostor)| {
        VerifyAction {
            milestone_idx,
            enrollee_idx,
            impostor,
        }
    })
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    #[test]
    fn milestone_completion_invariants_hold(
        actions in proptest::collection::vec(arb_action(), 1..30)
    ) {
        let env = Env::default();
        env.mock_all_auths();

        let quest_contract_id = env.register(QuestContract, ());
        let quest_client = QuestContractClient::new(&env, &quest_contract_id);

        let milestone_contract_id = env.register(MilestoneContract, ());
        let milestone_client = MilestoneContractClient::new(&env, &milestone_contract_id);

        let cert_id = env.register(CertificateContract, (milestone_contract_id.clone(),));
        let admin = Address::generate(&env);
        milestone_client.initialize(&admin, &quest_contract_id, &cert_id);

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
            &None,
        );

        // Three milestones: 0 (no prerequisite), 1 (requires milestone 0),
        // 2 (no prerequisite despite following 1).
        let m0 = milestone_client.create_milestone(
            &owner, &qid,
            &String::from_str(&env, "M0"), &String::from_str(&env, "desc"),
            &100, &false,
        );
        let m1 = milestone_client.create_milestone(
            &owner, &qid,
            &String::from_str(&env, "M1"), &String::from_str(&env, "desc"),
            &100, &true,
        );
        let m2 = milestone_client.create_milestone(
            &owner, &qid,
            &String::from_str(&env, "M2"), &String::from_str(&env, "desc"),
            &100, &false,
        );
        let milestone_ids = [m0, m1, m2];
        let requires_previous = [false, true, false];

        // enrollees[0] and enrollees[1] are enrolled; enrollees[2] never is.
        let enrollees = [
            Address::generate(&env),
            Address::generate(&env),
            Address::generate(&env),
        ];
        quest_client.add_enrollee(&qid, &enrollees[0]);
        quest_client.add_enrollee(&qid, &enrollees[1]);
        let enrolled_set: HashSet<usize> = [0usize, 1usize].into_iter().collect();

        // Ground-truth model of completed (milestone_idx, enrollee_idx) pairs.
        let mut completed: HashSet<(usize, usize)> = HashSet::new();

        for action in &actions {
            let mi = action.milestone_idx % milestone_ids.len();
            let ei = action.enrollee_idx % enrollees.len();
            let mid = milestone_ids[mi];
            let enrollee = enrollees[ei].clone();

            let caller = if action.impostor {
                Address::generate(&env)
            } else {
                owner.clone()
            };

            let result = milestone_client.try_verify_completion(&caller, &qid, &mid, &enrollee);

            if action.impostor {
                prop_assert_eq!(
                    result, Err(Ok(Error::Unauthorized)),
                    "non-owner caller must never be able to verify a completion"
                );
            } else if !enrolled_set.contains(&ei) {
                prop_assert_eq!(
                    result, Err(Ok(Error::NotEnrolled)),
                    "unenrolled address must never have a completion verified"
                );
            } else if completed.contains(&(mi, ei)) {
                prop_assert_eq!(
                    result, Err(Ok(Error::AlreadyCompleted)),
                    "a (milestone, enrollee) pair must not be completable twice"
                );
            } else if requires_previous[mi] && mi > 0 && !completed.contains(&(mi - 1, ei)) {
                prop_assert_eq!(
                    result, Err(Ok(Error::MilestoneNotUnlocked)),
                    "milestone with an incomplete prerequisite must be rejected"
                );
            } else {
                prop_assert!(
                    result.is_ok(),
                    "expected verification to succeed for milestone {} enrollee {}: {:?}",
                    mi, ei, result
                );
                completed.insert((mi, ei));
            }

            // Cross-check contract state against the ground-truth model after
            // every single operation.
            for (check_mi, check_mid) in milestone_ids.iter().enumerate() {
                for (check_ei, check_enrollee) in enrollees.iter().enumerate() {
                    let expected = completed.contains(&(check_mi, check_ei));
                    let actual = milestone_client.is_completed(&qid, check_mid, check_enrollee);
                    prop_assert_eq!(
                        actual, expected,
                        "is_completed disagreed with model for milestone {} enrollee {}",
                        check_mi, check_ei
                    );
                }
            }

            for (check_ei, check_enrollee) in enrollees.iter().enumerate() {
                let expected_count = completed.iter().filter(|(_, e)| *e == check_ei).count() as u32;
                let actual_count = milestone_client.get_enrollee_completions(&qid, check_enrollee);
                prop_assert_eq!(
                    actual_count, expected_count,
                    "get_enrollee_completions disagreed with model for enrollee {}",
                    check_ei
                );
            }
        }
    }
}
