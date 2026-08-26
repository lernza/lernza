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

    client.revoke_certificate(&token_id);

    // Metadata is gone
    let result = client.try_get_certificate_metadata(&token_id);
    assert_eq!(result, Err(Ok(Error::NotFound)));

    // User's certificate list is cleared
    let user_certs = client.get_user_certificates(&recipient);
    assert_eq!(user_certs.len(), 0);

    // Tombstone marks it as revoked
    assert!(client.is_revoked(&token_id));

    // Double-revoke returns AlreadyRevoked
    let double = client.try_revoke_certificate(&token_id);
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

#[test]
fn test_set_metadata_base_rejects_empty_string() {
    // Issue #1273 — empty URI must be rejected.
    let (env, client, _owner) = setup();
    let uri = String::from_str(&env, "");
    let result = client.try_set_metadata_base(&uri);
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_set_metadata_base_rejects_malformed_uri() {
    // Issue #1273 — arbitrary non-URI strings must be rejected.
    let (env, client, _owner) = setup();
    let uri = String::from_str(&env, "not-a-valid-uri");
    let result = client.try_set_metadata_base(&uri);
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_set_metadata_base_rejects_whitespace() {
    // Issue #1273 — URIs containing whitespace must be rejected.
    let (env, client, _owner) = setup();
    let uri = String::from_str(&env, "https://lernza.io/ certs");
    let result = client.try_set_metadata_base(&uri);
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_set_metadata_base_accepts_ipfs_uri() {
    // Issue #1273 — ipfs:// URIs remain a valid metadata base scheme.
    let (env, client, _owner) = setup();
    let uri = String::from_str(
        &env,
        "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/",
    );
    client.set_metadata_base(&uri);
    assert_eq!(client.get_metadata_base(), uri);
}

#[test]
fn test_set_metadata_base_rejected_uri_does_not_overwrite_stored_value() {
    // Issue #1273 — a rejected update must leave the previously stored URI intact.
    let (env, client, _owner) = setup();
    let good_uri = String::from_str(&env, "https://lernza.io/certificates/");
    client.set_metadata_base(&good_uri);

    let bad_uri = String::from_str(&env, "garbage");
    let result = client.try_set_metadata_base(&bad_uri);
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
    assert_eq!(client.get_metadata_base(), good_uri);
}

// --- Additional edge-case coverage — issue #1184 ---

#[test]
fn test_mint_quest_certificate_uses_contract_owner_as_issuer() {
    // mint_quest_certificate is the owner-only convenience wrapper that
    // fills in `issuer` from the stored contract owner rather than taking
    // it as a caller-supplied argument.
    let (env, client, owner) = setup();
    let recipient = Address::generate(&env);
    let quest_id = 7u32;

    let token_id = client.mint_quest_certificate(
        &quest_id,
        &String::from_str(&env, "Quest Seven"),
        &String::from_str(&env, "Design"),
        &recipient,
    );

    let metadata = client.get_certificate_metadata(&token_id);
    assert_eq!(metadata.issuer, owner);
    assert_eq!(metadata.recipient, recipient);
    assert_eq!(metadata.quest_id, quest_id);
}

#[test]
fn test_mint_quest_certificate_duplicate_prevention() {
    let (env, client, _owner) = setup();
    let recipient = Address::generate(&env);
    let quest_id = 3u32;

    client.mint_quest_certificate(
        &quest_id,
        &String::from_str(&env, "Quest"),
        &String::from_str(&env, "Cat"),
        &recipient,
    );

    let result = client.try_mint_quest_certificate(
        &quest_id,
        &String::from_str(&env, "Quest"),
        &String::from_str(&env, "Cat"),
        &recipient,
    );
    assert_eq!(result, Err(Ok(Error::AlreadyIssued)));
}

#[test]
fn test_pause_blocks_minting() {
    let (env, client, owner) = setup();
    let recipient = Address::generate(&env);

    client.pause();

    let result = client.try_mint_certificate(
        &1u32,
        &String::from_str(&env, "Quest"),
        &String::from_str(&env, "Cat"),
        &recipient,
        &owner,
    );
    assert_eq!(result, Err(Ok(Error::Paused)));

    let result = client.try_mint_quest_certificate(
        &1u32,
        &String::from_str(&env, "Quest"),
        &String::from_str(&env, "Cat"),
        &recipient,
    );
    assert_eq!(result, Err(Ok(Error::Paused)));
}

#[test]
fn test_unpause_allows_minting_again() {
    let (env, client, owner) = setup();
    let recipient = Address::generate(&env);

    client.pause();
    client.unpause();

    let token_id = client.mint_certificate(
        &1u32,
        &String::from_str(&env, "Quest"),
        &String::from_str(&env, "Cat"),
        &recipient,
        &owner,
    );
    let metadata = client.get_certificate_metadata(&token_id);
    assert_eq!(metadata.quest_id, 1u32);
}

#[test]
fn test_get_certificate_metadata_not_found() {
    let (_env, client, _owner) = setup();
    let result = client.try_get_certificate_metadata(&999u32);
    assert_eq!(result, Err(Ok(Error::NotFound)));
}

#[test]
fn test_get_quest_certificate_not_found() {
    let (env, client, _owner) = setup();
    let stranger = Address::generate(&env);
    let result = client.try_get_quest_certificate(&999u32, &stranger);
    assert_eq!(result, Err(Ok(Error::NotFound)));
}

#[test]
fn test_has_quest_certificate() {
    let (env, client, owner) = setup();
    let recipient = Address::generate(&env);
    let quest_id = 42u32;

    assert!(!client.has_quest_certificate(&quest_id, &recipient));

    client.mint_certificate(
        &quest_id,
        &String::from_str(&env, "Quest"),
        &String::from_str(&env, "Cat"),
        &recipient,
        &owner,
    );

    assert!(client.has_quest_certificate(&quest_id, &recipient));
}

#[test]
fn test_get_certificate_details_returns_metadata_and_owner() {
    let (env, client, owner) = setup();
    let recipient = Address::generate(&env);
    let quest_id = 5u32;

    let token_id = client.mint_certificate(
        &quest_id,
        &String::from_str(&env, "Quest"),
        &String::from_str(&env, "Cat"),
        &recipient,
        &owner,
    );

    let (metadata, token_owner) = client.get_certificate_details(&token_id);
    assert_eq!(metadata.quest_id, quest_id);
    assert_eq!(token_owner, recipient);
}

#[test]
fn test_revoke_nonexistent_certificate_returns_not_found() {
    let (_env, client, _owner) = setup();
    let result = client.try_revoke_certificate(&999u32);
    assert_eq!(result, Err(Ok(Error::NotFound)));
}

#[test]
fn test_revoked_certificate_slot_can_be_reissued() {
    // After revocation the (quest_id, recipient) slot is cleared entirely,
    // so a fresh certificate can be minted for the same pair — e.g. if a
    // learner's original certificate was revoked for a data error and the
    // owner wants to reissue a corrected one.
    let (env, client, owner) = setup();
    let recipient = Address::generate(&env);
    let quest_id = 9u32;

    let first_id = client.mint_certificate(
        &quest_id,
        &String::from_str(&env, "Quest"),
        &String::from_str(&env, "Cat"),
        &recipient,
        &owner,
    );
    client.revoke_certificate(&first_id);

    let second_id = client.mint_certificate(
        &quest_id,
        &String::from_str(&env, "Quest v2"),
        &String::from_str(&env, "Cat"),
        &recipient,
        &owner,
    );

    assert_ne!(first_id, second_id);
    assert!(client.has_quest_certificate(&quest_id, &recipient));
    assert_eq!(
        client.get_quest_certificate(&quest_id, &recipient),
        second_id
    );

    let user_certs = client.get_user_certificates(&recipient);
    assert_eq!(user_certs.len(), 1);
    assert_eq!(user_certs.get(0).unwrap(), second_id);
}

#[test]
fn test_revoke_only_removes_target_certificate_from_user_list() {
    // A user with multiple certificates who has one revoked should keep the
    // others intact in their UserCertificates index.
    let (env, client, owner) = setup();
    let recipient = Address::generate(&env);

    let cert1 = client.mint_certificate(
        &1u32,
        &String::from_str(&env, "Quest 1"),
        &String::from_str(&env, "Cat"),
        &recipient,
        &owner,
    );
    let cert2 = client.mint_certificate(
        &2u32,
        &String::from_str(&env, "Quest 2"),
        &String::from_str(&env, "Cat"),
        &recipient,
        &owner,
    );

    client.revoke_certificate(&cert1);

    let user_certs = client.get_user_certificates(&recipient);
    assert_eq!(user_certs.len(), 1);
    assert_eq!(user_certs.get(0).unwrap(), cert2);
    assert!(client.is_revoked(&cert1));
    assert!(!client.is_revoked(&cert2));
}
