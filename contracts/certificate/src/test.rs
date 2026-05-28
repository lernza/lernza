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
    // Issue #720 — revoke_certificate is now owner-only and emits certificate_revoked.
    // Use a fresh env for revocation so the owner auth frame is not already consumed.
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

    client.revoke_certificate(&owner, &token_id);

    // Metadata is gone
    let result = client.try_get_certificate_metadata(&token_id);
    assert_eq!(result, Err(Ok(Error::NotFound)));

    // User's certificate list is cleared
    let user_certs = client.get_user_certificates(&recipient);
    assert_eq!(user_certs.len(), 0);

    // Tombstone marks it as revoked
    assert!(client.is_revoked(&token_id));

    // Double-revoke returns AlreadyRevoked
    let double = client.try_revoke_certificate(&owner, &token_id);
    assert_eq!(double, Err(Ok(Error::AlreadyRevoked)));
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

#[test]
fn test_set_and_get_metadata_base() {
    // Issue #719 — set_metadata_base allows owner to update the metadata URI.
    let (env, client, _owner) = setup();
    let uri = String::from_str(&env, "ipfs://bafybei.../");
    client.set_metadata_base(&uri);
    let stored = client.get_metadata_base();
    assert_eq!(stored, uri);
}

#[test]
fn test_get_metadata_base_not_set_returns_error() {
    // Issue #719 — get_metadata_base returns MetadataBaseNotSet when unset.
    let (_env, client, _owner) = setup();
    let result = client.try_get_metadata_base();
    assert_eq!(result, Err(Ok(Error::MetadataBaseNotSet)));
}
