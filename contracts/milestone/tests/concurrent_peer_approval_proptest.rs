//! Concurrent peer-approval edge case tests — issue #1627.
//!
//! Property tests covered ownership/enrollment invariants but never exercised
//! the peer-review quorum path (`submit_for_review` / `approve_completion`).
//! This file covers the four concurrent-review edge cases:
//! 1. Simultaneous approvals from multiple peers reaching the threshold.
//! 2. Approval after the enrollee tries to leave mid-review (leave-hold).
//! 3. Approval after the quest deadline passes.
//! 4. Approval after a distribution-mode change (snapshot preservation).

use certificate::CertificateContract;
use common::Visibility;
use milestone::{
    DistributionMode, Error as MilestoneError, MilestoneContract, MilestoneContractClient,
    VerificationMode,
};
use proptest::prelude::*;
use quest::{Error as QuestError, QuestContract, QuestContractClient};
use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, Address, Env, String, Vec};

fn setup_contracts() -> (
    Env,
    MilestoneContractClient<'static>,
    QuestContractClient<'static>,
    Address,
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

    (env, milestone_client, quest_client, admin)
}

fn create_quest(
    env: &Env,
    quest_client: &QuestContractClient,
    owner: &Address,
) -> u32 {
    quest_client.create_quest(
        owner,
        &String::from_str(env, "Quest"),
        &String::from_str(env, "Description"),
        &String::from_str(env, "Programming"),
        &Vec::<String>::new(env),
        &Address::generate(env),
        &Visibility::Public,
        &None,
        &None,
    )
}

fn create_ms(
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
        &None,
        &None,
        &None,
    )
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(32))]

    /// Simultaneous approvals from distinct peers: the first `threshold - 1`
    /// approvals return `None` without completing, the threshold-reaching
    /// approval returns `Some(reward)` and marks the milestone completed, and
    /// any further approval is rejected with `AlreadyCompleted`.
    #[test]
    fn simultaneous_approvals_reach_threshold(
        threshold in 1u32..5,
    ) {
        let (env, milestone_client, quest_client, owner) = setup_contracts();
        let qid = create_quest(&env, &quest_client, &owner);
        let mid = create_ms(&env, &milestone_client, &owner, qid, "Task", 100);

        milestone_client.set_verification_mode(
            &owner,
            &qid,
            &VerificationMode::PeerReview(threshold),
        );

        let enrollee = Address::generate(&env);
        quest_client.add_enrollee(&qid, &enrollee);

        // One distinct peer per required approval, plus one extra peer that
        // attempts to approve after the quorum is already reached.
        let mut peers = Vec::<Address>::new(&env);
        for _ in 0..threshold + 1 {
            let peer = Address::generate(&env);
            quest_client.add_enrollee(&qid, &peer);
            peers.push_back(peer);
        }

        milestone_client.submit_for_review(&enrollee, &qid, &mid);

        for i in 0..threshold {
            let peer = peers.get(i).unwrap();
            let result = milestone_client.approve_completion(&peer, &qid, &mid, &enrollee);
            if i + 1 < threshold {
                prop_assert_eq!(
                    result, None,
                    "approval {}/{} must not complete the milestone yet",
                    i + 1, threshold
                );
                prop_assert!(
                    !milestone_client.is_completed(&qid, &mid, &enrollee),
                    "milestone must stay incomplete before the quorum is reached"
                );
            } else {
                prop_assert_eq!(
                    result,
                    Some(100),
                    "threshold-reaching approval must complete with the full reward"
                );
                prop_assert!(
                    milestone_client.is_completed(&qid, &mid, &enrollee),
                    "milestone must be completed once the quorum is reached"
                );
            }
        }

        // Duplicate approval from an existing approver and a fresh approval
        // from the extra peer must both be rejected as already completed.
        let first_peer = peers.get(0).unwrap();
        prop_assert_eq!(
            milestone_client.try_approve_completion(&first_peer, &qid, &mid, &enrollee),
            Err(Ok(MilestoneError::AlreadyCompleted)),
            "re-approval after quorum must be AlreadyCompleted, not AlreadyApproved"
        );
        let extra_peer = peers.get(threshold).unwrap();
        prop_assert_eq!(
            milestone_client.try_approve_completion(&extra_peer, &qid, &mid, &enrollee),
            Err(Ok(MilestoneError::AlreadyCompleted)),
            "late approval after quorum must be AlreadyCompleted"
        );
    }
}

/// Approval after the enrollee tries to leave mid-review: the owner places a
/// leave-hold, `leave_quest` is blocked with `LeaveBlockedByPendingApproval`,
/// the pending peer approvals still complete normally, and the enrollee can
/// leave again once the hold is lifted.
#[test]
fn approval_after_leave_hold_blocks_leave_but_completes() {
    let (env, milestone_client, quest_client, owner) = setup_contracts();
    let qid = create_quest(&env, &quest_client, &owner);
    let mid = create_ms(&env, &milestone_client, &owner, qid, "Task", 100);

    milestone_client.set_verification_mode(&owner, &qid, &VerificationMode::PeerReview(2));

    let enrollee = Address::generate(&env);
    let peer1 = Address::generate(&env);
    let peer2 = Address::generate(&env);
    quest_client.add_enrollee(&qid, &enrollee);
    quest_client.add_enrollee(&qid, &peer1);
    quest_client.add_enrollee(&qid, &peer2);

    milestone_client.submit_for_review(&enrollee, &qid, &mid);

    // Owner freezes departure while the submission is in flight.
    quest_client.place_leave_hold(&qid, &owner, &enrollee);
    assert!(quest_client.has_leave_hold(&qid, &enrollee));

    let leave_attempt = quest_client.try_leave_quest(&enrollee, &qid);
    assert_eq!(
        leave_attempt,
        Err(Ok(QuestError::LeaveBlockedByPendingApproval)),
        "enrollee must not be able to leave while a peer-review hold is in place"
    );

    // Approvals still progress to completion despite the hold.
    assert_eq!(
        milestone_client.approve_completion(&peer1, &qid, &mid, &enrollee),
        None
    );
    assert_eq!(
        milestone_client.approve_completion(&peer2, &qid, &mid, &enrollee),
        Some(100)
    );
    assert!(milestone_client.is_completed(&qid, &mid, &enrollee));

    // After the review settles the owner lifts the hold and departure works.
    quest_client.lift_leave_hold(&qid, &owner, &enrollee);
    assert!(!quest_client.has_leave_hold(&qid, &enrollee));
    quest_client.leave_quest(&enrollee, &qid);
    assert!(!quest_client.is_enrollee(&qid, &enrollee));
}

/// Approval after the enrollee actually leaves (no hold): the submission
/// references a non-enrollee, so further approvals are rejected with
/// `NotEnrolled` instead of completing.
#[test]
fn approval_after_enrollee_leaves_without_hold_is_rejected() {
    let (env, milestone_client, quest_client, owner) = setup_contracts();
    let qid = create_quest(&env, &quest_client, &owner);
    let mid = create_ms(&env, &milestone_client, &owner, qid, "Task", 100);

    milestone_client.set_verification_mode(&owner, &qid, &VerificationMode::PeerReview(2));

    let enrollee = Address::generate(&env);
    let peer1 = Address::generate(&env);
    let peer2 = Address::generate(&env);
    quest_client.add_enrollee(&qid, &enrollee);
    quest_client.add_enrollee(&qid, &peer1);
    quest_client.add_enrollee(&qid, &peer2);

    milestone_client.submit_for_review(&enrollee, &qid, &mid);
    assert_eq!(
        milestone_client.approve_completion(&peer1, &qid, &mid, &enrollee),
        None
    );

    // No hold was placed, so the enrollee can walk away mid-review.
    quest_client.leave_quest(&enrollee, &qid);

    let late = milestone_client.try_approve_completion(&peer2, &qid, &mid, &enrollee);
    assert_eq!(
        late,
        Err(Ok(MilestoneError::NotEnrolled)),
        "approval for a departed enrollee must be rejected, never complete"
    );
    assert!(!milestone_client.is_completed(&qid, &mid, &enrollee));
}

/// Approval after the quest deadline passes is rejected with
/// `DeadlineExpired`, both for the in-flight approval and for fresh
/// submissions.
#[test]
fn approval_after_deadline_is_rejected() {
    let (env, milestone_client, quest_client, owner) = setup_contracts();
    let qid = create_quest(&env, &quest_client, &owner);
    let mid = create_ms(&env, &milestone_client, &owner, qid, "Task", 100);

    milestone_client.set_verification_mode(&owner, &qid, &VerificationMode::PeerReview(1));

    let enrollee = Address::generate(&env);
    let peer = Address::generate(&env);
    quest_client.add_enrollee(&qid, &enrollee);
    quest_client.add_enrollee(&qid, &peer);

    milestone_client.submit_for_review(&enrollee, &qid, &mid);

    // Move the ledger past the deadline after the submission is in flight.
    env.ledger().set_timestamp(1_000);
    quest_client.set_deadline(&qid, &500);

    let late_approval = milestone_client.try_approve_completion(&peer, &qid, &mid, &enrollee);
    assert_eq!(
        late_approval,
        Err(Ok(MilestoneError::DeadlineExpired)),
        "in-flight peer approval after the deadline must expire"
    );
    assert!(!milestone_client.is_completed(&qid, &mid, &enrollee));

    // Fresh submissions after the deadline are rejected too.
    let mid2 = create_ms(&env, &milestone_client, &owner, qid, "Task 2", 50);
    let enrollee2 = Address::generate(&env);
    quest_client.add_enrollee(&qid, &enrollee2);
    let late_submit = milestone_client.try_submit_for_review(&enrollee2, &qid, &mid2);
    assert_eq!(
        late_submit,
        Err(Ok(MilestoneError::DeadlineExpired)),
        "submissions after the deadline must expire"
    );
}

/// Approval after a distribution-mode change still pays the submission-time
/// snapshot (issue #863): mode switches are frozen once milestones exist, and
/// even an allowed same-mode `flat_reward` update must not retroactively
/// change the pending submission's payout.
#[test]
fn approval_after_distribution_mode_change_uses_snapshot() {
    let (env, milestone_client, quest_client, owner) = setup_contracts();
    let qid = create_quest(&env, &quest_client, &owner);

    // Flat mode must be configured before any milestone exists.
    milestone_client.set_distribution_mode(&owner, &qid, &DistributionMode::Flat, &100);
    let mid = create_ms(&env, &milestone_client, &owner, qid, "Task", 999);

    milestone_client.set_verification_mode(&owner, &qid, &VerificationMode::PeerReview(1));

    let enrollee = Address::generate(&env);
    let peer = Address::generate(&env);
    quest_client.add_enrollee(&qid, &enrollee);
    quest_client.add_enrollee(&qid, &peer);

    milestone_client.submit_for_review(&enrollee, &qid, &mid);

    // Switching reward types after milestones exist is frozen.
    let switch = milestone_client.try_set_distribution_mode(
        &owner,
        &qid,
        &DistributionMode::Custom,
        &0,
    );
    assert_eq!(
        switch,
        Err(Ok(MilestoneError::InvalidInput)),
        "reward-type changes after milestone creation must stay frozen"
    );

    // Reapplying the same Flat mode with a new amount is allowed but must
    // not affect the already-snapshotted submission.
    milestone_client.set_distribution_mode(&owner, &qid, &DistributionMode::Flat, &500);

    let reward = milestone_client.approve_completion(&peer, &qid, &mid, &enrollee);
    assert_eq!(
        reward,
        Some(100),
        "approval must pay the submission-time snapshot (100), not the updated flat reward (500)"
    );
    assert!(milestone_client.is_completed(&qid, &mid, &enrollee));
}
