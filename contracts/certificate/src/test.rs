#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

use crate::{CertificateContract, CertificateContractClient, Error};

fn setup() -> (Env, CertificateContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let owner = Address::generate(&env);
    let contract_id = env.register(CertificateContract, (owner.clone(),));
    let client = CertificateContractClient::new(&env, &contract_id);
    (env, client, owner)
}

#[test]
fn test_certificate_minting() {
    let (env, client, owner) = setup();
    let recipient = Address::generate(&env);

    let quest_name = String::from_str(&env, "Introduction to Rust");
    let quest_category = String::from_str(&env, "Programming");
    let quest_id = 1u32;

    let token_id =
        client.mint_certificate(&quest_id, &quest_name, &quest_category, &recipient, &owner);

    let metadata = client.get_certificate_metadata(&token_id);
    assert_eq!(metadata.quest_id, quest_id);
    assert_eq!(metadata.quest_name, quest_name);
    assert_eq!(metadata.quest_category, quest_category);
    assert_eq!(metadata.recipient, recipient);
    assert_eq!(metadata.issuer, owner);

    let user_certs = client.get_user_certificates(&recipient);
    assert_eq!(user_certs.len(), 1);
    assert_eq!(user_certs.get(0).unwrap(), token_id);

    let quest_cert = client.get_quest_certificate(&quest_id, &recipient);
    assert_eq!(quest_cert, token_id);
}

#[test]
fn test_duplicate_certificate_prevention() {
    let (env, client, owner) = setup();
    let recipient = Address::generate(&env);
    let quest_id = 1u32;

    client.mint_certificate(
        &quest_id,
        &String::from_str(&env, "Test Quest"),
        &String::from_str(&env, "Test"),
        &recipient,
        &owner,
    );

    let result = client.try_mint_certificate(
        &quest_id,
        &String::from_str(&env, "Test Quest"),
        &String::from_str(&env, "Test"),
        &recipient,
        &owner,
    );
    assert_eq!(result, Err(Ok(Error::AlreadyIssued)));
}

#[test]
fn test_certificate_revocation() {
    let (env, client, owner) = setup();
    let recipient = Address::generate(&env);
    let quest_id = 1u32;

    let token_id = client.mint_certificate(
        &quest_id,
        &String::from_str(&env, "Test Quest"),
        &String::from_str(&env, "Test"),
        &recipient,
        &owner,
    );

    client.revoke_certificate(&token_id);

    let result = client.try_get_certificate_metadata(&token_id);
    assert_eq!(result, Err(Ok(Error::NotFound)));

    let user_certs = client.get_user_certificates(&recipient);
    assert_eq!(user_certs.len(), 0);
}

#[test]
fn test_user_certificate_details() {
    let (env, client, owner) = setup();
    let recipient = Address::generate(&env);

    let cert1_id = client.mint_certificate(
        &1u32,
        &String::from_str(&env, "Quest 1"),
        &String::from_str(&env, "Category 1"),
        &recipient,
        &owner,
    );

    let cert2_id = client.mint_certificate(
        &2u32,
        &String::from_str(&env, "Quest 2"),
        &String::from_str(&env, "Category 2"),
        &recipient,
        &owner,
    );

    let details = client.get_user_certificate_details(&recipient);
    assert_eq!(details.len(), 2);

    let mut cert_ids = Vec::new(&env);
    for i in 0..details.len() {
        if let Some((id, _)) = details.get(i) {
            cert_ids.push_back(id);
        }
    }
    assert!(cert_ids.contains(cert1_id));
    assert!(cert_ids.contains(cert2_id));
}
