#![cfg(test)]
extern crate std;

use common::Visibility;
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};
use crate::*;

use quest::QuestContract as QuestContractType;
use milestone::MilestoneContract as MilestoneContractType;
use certificate::CertificateContract as CertificateContractType;

use quest::QuestContractClient as QuestContractClient;
use milestone::MilestoneContractClient as MilestoneContractClient;
use certificate::CertificateContractClient as CertificateContractClient;

struct TestSetup {
    env: Env,
    admin: Address,
    recipient: Address,
    quest: Address,
    milestone: Address,
    certificate: Address,
    completion: Address,
}

fn setup() -> TestSetup {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);

    let quest = env.register(QuestContractType, ());
    let milestone = env.register(MilestoneContractType, ());
    let certificate = env.register(CertificateContractType, (admin.clone(),));
    let completion = env.register(CompletionContract, ());

    QuestContractClient::new(&env, &quest).initialize(&admin);
    MilestoneContractClient::new(&env, &milestone).initialize(&admin, &quest, &certificate);
    CompletionContractClient::new(&env, &completion).initialize(&admin, &quest, &milestone, &certificate);

    TestSetup {
        env,
        admin,
        recipient,
        quest,
        milestone,
        certificate,
        completion,
    }
}

fn create_quest(s: &TestSetup) -> u32 {
    let tags = Vec::new(&s.env);
    // Any contract address satisfies the token-address validation.
    let token = s.certificate.clone();
    QuestContractClient::new(&s.env, &s.quest).create_quest(
        &s.admin,
        &String::from_str(&s.env, "Learn Rust"),
        &String::from_str(&s.env, "A quest to learn Rust"),
        &String::from_str(&s.env, "Programming"),
        &tags,
        &token,
        &Visibility::Public,
        &None,
        &None,
    )
}

fn create_milestone(s: &TestSetup, quest_id: u32) -> u32 {
    MilestoneContractClient::new(&s.env, &s.milestone).create_milestone(
        &s.admin,
        &quest_id,
        &String::from_str(&s.env, "First steps"),
        &String::from_str(&s.env, "Install the toolchain"),
        &1000,
        &false,
        &None,
        &None,
        &None,
    )
}

#[test]
fn test_complete_quest_finalizes_certificate() {
    let s = setup();
    let quest_id = create_quest(&s);
    let milestone_id = create_milestone(&s, quest_id);

    // Enroll and mark the recipient as having completed the milestone.
    QuestContractClient::new(&s.env, &s.quest).join_quest(&s.recipient, &quest_id);
    MilestoneContractClient::new(&s.env, &s.milestone).verify_completion(
        &s.admin,
        &quest_id,
        &milestone_id,
        &s.recipient,
    );

    let token_id = CompletionContractClient::new(&s.env, &s.completion).complete_quest(
        &s.admin,
        &quest_id,
        &s.recipient,
    );

    // The certificate should exist and complete_quest returns its token id.
    assert!(CertificateContractClient::new(&s.env, &s.certificate)
        .has_quest_certificate(&quest_id, &s.recipient));
    assert_eq!(
        CertificateContractClient::new(&s.env, &s.certificate)
            .get_quest_certificate(&quest_id, &s.recipient),
        token_id
    );
}

#[test]
fn test_complete_quest_rejects_non_owner() {
    let s = setup();
    let quest_id = create_quest(&s);
    create_milestone(&s, quest_id);

    let outsider = Address::generate(&s.env);
    let result = CompletionContractClient::new(&s.env, &s.completion).try_complete_quest(
        &outsider,
        &quest_id,
        &s.recipient,
    );

    assert_eq!(result, Err(Ok(Error::NotOwner)));
}

#[test]
fn test_complete_quest_rejects_incomplete_milestones() {
    let s = setup();
    let quest_id = create_quest(&s);
    create_milestone(&s, quest_id);
    // Intentionally do NOT verify completion for this recipient.

    let result = CompletionContractClient::new(&s.env, &s.completion).try_complete_quest(
        &s.admin,
        &quest_id,
        &s.recipient,
    );

    assert_eq!(result, Err(Ok(Error::MilestonesIncomplete)));
}

#[test]
fn test_complete_quest_rejects_double_completion() {
    let s = setup();
    let quest_id = create_quest(&s);
    let milestone_id = create_milestone(&s, quest_id);
    QuestContractClient::new(&s.env, &s.quest).join_quest(&s.recipient, &quest_id);
    MilestoneContractClient::new(&s.env, &s.milestone).verify_completion(
        &s.admin,
        &quest_id,
        &milestone_id,
        &s.recipient,
    );

    let first = CompletionContractClient::new(&s.env, &s.completion).complete_quest(
        &s.admin,
        &quest_id,
        &s.recipient,
    );
    assert!(CertificateContractClient::new(&s.env, &s.certificate)
        .has_quest_certificate(&quest_id, &s.recipient));
    assert_eq!(
        CertificateContractClient::new(&s.env, &s.certificate)
            .get_quest_certificate(&quest_id, &s.recipient),
        first
    );

    let second = CompletionContractClient::new(&s.env, &s.completion).try_complete_quest(
        &s.admin,
        &quest_id,
        &s.recipient,
    );
    assert_eq!(second, Err(Ok(Error::AlreadyCompleted)));
}
