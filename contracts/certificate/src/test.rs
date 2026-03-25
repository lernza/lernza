use soroban_sdk::{Address, Env, String, Vec};

use crate::{CertificateContract, CertificateMetadata, DataKey, Error, BUMP, THRESHOLD};

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as TestAddress;
    use stellar_access::ownable::Ownable;

    #[test]
    fn test_certificate_minting() {
        let env = Env::default();
        let contract_id = env.register(CertificateContract, ());
        let owner = Address::generate(&env);
        let recipient = Address::generate(&env);

        env.as_contract(&contract_id, || {
            // Initialize contract
            CertificateContract::__constructor(env.clone(), owner.clone());

            // Mint certificate
            let quest_name = String::from_str(&env, "Introduction to Rust");
            let quest_category = String::from_str(&env, "Programming");
            let quest_id = 1u32;

            let token_id = CertificateContract::mint_certificate(
                env.clone(),
                quest_id,
                quest_name.clone(),
                quest_category.clone(),
                recipient.clone(),
                owner.clone(),
            )
            .unwrap();

            // Verify certificate exists
            let metadata =
                CertificateContract::get_certificate_metadata(env.clone(), token_id).unwrap();
            assert_eq!(metadata.quest_id, quest_id);
            assert_eq!(metadata.quest_name, quest_name);
            assert_eq!(metadata.quest_category, quest_category);
            assert_eq!(metadata.recipient, recipient);
            assert_eq!(metadata.issuer, owner);

            // Verify user has certificate
            let user_certs =
                CertificateContract::get_user_certificates(env.clone(), recipient.clone());
            assert_eq!(user_certs.len(), 1);
            assert_eq!(user_certs.get(0).unwrap(), token_id);

            // Verify quest mapping exists
            let quest_cert =
                CertificateContract::get_quest_certificate(env.clone(), quest_id, recipient)
                    .unwrap();
            assert_eq!(quest_cert, token_id);
        });
    }

    #[test]
    fn test_duplicate_certificate_prevention() {
        let env = Env::default();
        let contract_id = env.register(CertificateContract, ());
        let owner = Address::generate(&env);
        let recipient = Address::generate(&env);

        env.as_contract(&contract_id, || {
            // Initialize contract
            CertificateContract::__constructor(env.clone(), owner.clone());

            // Mint first certificate
            let quest_id = 1u32;
            let _token_id = CertificateContract::mint_certificate(
                env.clone(),
                quest_id,
                String::from_str(&env, "Test Quest"),
                String::from_str(&env, "Test"),
                recipient.clone(),
                owner.clone(),
            )
            .unwrap();

            // Try to mint duplicate certificate
            let result = CertificateContract::mint_certificate(
                env.clone(),
                quest_id,
                String::from_str(&env, "Test Quest"),
                String::from_str(&env, "Test"),
                recipient.clone(),
                owner.clone(),
            );

            assert_eq!(result, Err(Error::AlreadyIssued));
        });
    }

    #[test]
    fn test_certificate_revocation() {
        let env = Env::default();
        let contract_id = env.register(CertificateContract, ());
        let owner = Address::generate(&env);
        let recipient = Address::generate(&env);

        env.as_contract(&contract_id, || {
            // Initialize contract
            CertificateContract::__constructor(env.clone(), owner.clone());

            // Mint certificate
            let quest_id = 1u32;
            let token_id = CertificateContract::mint_certificate(
                env.clone(),
                quest_id,
                String::from_str(&env, "Test Quest"),
                String::from_str(&env, "Test"),
                recipient.clone(),
                owner.clone(),
            )
            .unwrap();

            // Revoke certificate
            CertificateContract::revoke_certificate(env.clone(), token_id).unwrap();

            // Verify certificate no longer exists
            let result = CertificateContract::get_certificate_metadata(env.clone(), token_id);
            assert_eq!(result, Err(Error::NotFound));

            // Verify user no longer has certificate
            let user_certs =
                CertificateContract::get_user_certificates(env.clone(), recipient.clone());
            assert_eq!(user_certs.len(), 0);
        });
    }

    #[test]
    fn test_user_certificate_details() {
        let env = Env::default();
        let contract_id = env.register(CertificateContract, ());
        let owner = Address::generate(&env);
        let recipient = Address::generate(&env);

        env.as_contract(&contract_id, || {
            // Initialize contract
            CertificateContract::__constructor(env.clone(), owner.clone());

            // Mint multiple certificates
            let cert1_id = CertificateContract::mint_certificate(
                env.clone(),
                1u32,
                String::from_str(&env, "Quest 1"),
                String::from_str(&env, "Category 1"),
                recipient.clone(),
                owner.clone(),
            )
            .unwrap();

            let cert2_id = CertificateContract::mint_certificate(
                env.clone(),
                2u32,
                String::from_str(&env, "Quest 2"),
                String::from_str(&env, "Category 2"),
                recipient.clone(),
                owner.clone(),
            )
            .unwrap();

            // Get user certificate details
            let details =
                CertificateContract::get_user_certificate_details(env.clone(), recipient.clone());
            assert_eq!(details.len(), 2);

            // Verify details contain both certificates
            let mut cert_ids = Vec::new(&env);
            for i in 0..details.len() {
                if let Some((id, _)) = details.get(i) {
                    cert_ids.push_back(id);
                }
            }
            assert!(cert_ids.contains(&cert1_id));
            assert!(cert_ids.contains(&cert2_id));
        });
    }
}
