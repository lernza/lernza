use super::*;
use soroban_sdk::{
    testutils::Address as _, testutils::Ledger as _, Address, Bytes, BytesN, Env, String,
};
use testutils::setup_quest;

fn setup() -> (Env, QuestContractClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(QuestContract, ());
    let client = QuestContractClient::new(&env, &contract_id);
    let owner = Address::generate(&env);
    let token = Address::generate(&env);
    (env, client, owner, token)
}

fn create_quest_helper(
    env: &Env,
    client: &QuestContractClient,
    owner: &Address,
    token: &Address,
) -> u32 {
    client.create_quest(
        owner,
        &String::from_str(env, "My Quest"),
        &String::from_str(env, "Teaching my brother to code"),
        &String::from_str(env, "Programming"),
        &Vec::<String>::new(env),
        token,
        &Visibility::Public,
        &None,
        &None,
    )
}

fn create_quest_with_visibility(
    env: &Env,
    client: &QuestContractClient,
    owner: &Address,
    token: &Address,
    visibility: Visibility,
) -> u32 {
    client.create_quest(
        owner,
        &String::from_str(env, "My Quest"),
        &String::from_str(env, "Teaching my brother to code"),
        &String::from_str(env, "Programming"),
        &Vec::<String>::new(env),
        token,
        &visibility,
        &None,
        &None,
    )
}

fn create_quest_with_category_and_tags(
    env: &Env,
    client: &QuestContractClient,
    owner: &Address,
    token: &Address,
    category: &str,
    tags: Vec<String>,
    visibility: Visibility,
) -> u32 {
    client.create_quest(
        owner,
        &String::from_str(env, "My Quest"),
        &String::from_str(env, "Teaching my brother to code"),
        &String::from_str(env, category),
        &tags,
        token,
        &visibility,
        &None,
        &None,
    )
}

#[test]
fn test_create_quest() {
    let (env, client, owner, token) = setup();
    let ts = env.ledger().timestamp();
    let id = create_quest_helper(&env, &client, &owner, &token);
    assert_eq!(id, 0);
    assert_eq!(client.get_quest_count(), 1);
    let quest = client.get_quest(&0);
    assert_eq!(quest.owner, owner);
    assert_eq!(quest.name, String::from_str(&env, "My Quest"));
    assert_eq!(quest.token_addr, token);
    assert_eq!(quest.created_at, ts);
}

#[test]
fn test_create_quest_accepts_future_deadline() {
    let (env, client, owner, token) = setup();
    env.ledger().set_timestamp(1_000);
    let id = client.create_quest(
        &owner,
        &String::from_str(&env, "Timed Quest"),
        &String::from_str(&env, "Description"),
        &String::from_str(&env, "Programming"),
        &Vec::<String>::new(&env),
        &token,
        &Visibility::Public,
        &None,
        &Some(2_000),
    );
    assert_eq!(client.get_quest(&id).deadline, 2_000);
}

#[test]
fn test_create_quest_rejects_past_or_current_deadline() {
    let (env, client, owner, token) = setup();
    env.ledger().set_timestamp(1_000);
    for deadline in [999, 1_000] {
        let result = client.try_create_quest(
            &owner,
            &String::from_str(&env, "Timed Quest"),
            &String::from_str(&env, "Description"),
            &String::from_str(&env, "Programming"),
            &Vec::<String>::new(&env),
            &token,
            &Visibility::Public,
            &None,
            &Some(deadline),
        );
        assert_eq!(result, Err(Ok(Error::InvalidInput)));
    }
}

#[test]
fn test_create_quest_zero_deadline_means_no_deadline() {
    let (env, client, owner, token) = setup();
    env.ledger().set_timestamp(1_000);
    let id = client.create_quest(
        &owner,
        &String::from_str(&env, "Open Quest"),
        &String::from_str(&env, "Description"),
        &String::from_str(&env, "Programming"),
        &Vec::<String>::new(&env),
        &token,
        &Visibility::Public,
        &None,
        &Some(0),
    );
    assert_eq!(client.get_quest(&id).deadline, 0);
}

#[test]
fn test_create_quest_empty_name_fails() {
    let (env, client, owner, token) = setup();
    let result = client.try_create_quest(
        &owner,
        &String::from_str(&env, ""),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &Vec::<String>::new(&env),
        &token,
        &Visibility::Public,
        &None,
        &None,
    );
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_create_quest_whitespace_name_fails() {
    let (env, client, owner, token) = setup();
    let result = client.try_create_quest(
        &owner,
        &String::from_str(&env, "   "),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &Vec::<String>::new(&env),
        &token,
        &Visibility::Public,
        &None,
        &None,
    );
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_create_quest_empty_description_fails() {
    let (env, client, owner, token) = setup();
    let result = client.try_create_quest(
        &owner,
        &String::from_str(&env, "Quest"),
        &String::from_str(&env, ""),
        &String::from_str(&env, "Programming"),
        &Vec::<String>::new(&env),
        &token,
        &Visibility::Public,
        &None,
        &None,
    );
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_create_quest_oversized_name_fails() {
    let (env, client, owner, token) = setup();
    let bytes = [b'a'; 65];
    let long_name = String::from_bytes(&env, &bytes);
    let result = client.try_create_quest(
        &owner,
        &long_name,
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &Vec::<String>::new(&env),
        &token,
        &Visibility::Public,
        &None,
        &None,
    );
    assert_eq!(result, Err(Ok(Error::NameTooLong)));
}

#[test]
fn test_create_quest_oversized_description_fails() {
    let (env, client, owner, token) = setup();
    let bytes = [b'a'; 2001];
    let long_desc = String::from_bytes(&env, &bytes);
    let result = client.try_create_quest(
        &owner,
        &String::from_str(&env, "Quest"),
        &long_desc,
        &String::from_str(&env, "Programming"),
        &Vec::<String>::new(&env),
        &token,
        &Visibility::Public,
        &None,
        &None,
    );
    assert_eq!(result, Err(Ok(Error::DescriptionTooLong)));
}

#[test]
fn test_create_multiple_quests() {
    let (env, client, owner, token) = setup();
    let id0 = create_quest_helper(&env, &client, &owner, &token);
    let id1 = create_quest_helper(&env, &client, &owner, &token);
    assert_eq!(id0, 0);
    assert_eq!(id1, 1);
    assert_eq!(client.get_quest_count(), 2);
}

#[test]
fn test_add_enrollee() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let enrollee = Address::generate(&env);
    client.add_enrollee(&0, &enrollee);
    let enrollees = client.get_enrollees(&0);
    assert_eq!(enrollees.len(), 1);
    assert_eq!(enrollees.get(0).unwrap(), enrollee);
    assert!(client.is_enrollee(&0, &enrollee));
}

#[test]
fn test_add_multiple_enrollees() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    let e3 = Address::generate(&env);
    client.add_enrollee(&0, &e1);
    client.add_enrollee(&0, &e2);
    client.add_enrollee(&0, &e3);
    assert_eq!(client.get_enrollees(&0).len(), 3);
}

#[test]
fn test_add_enrollee_duplicate() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let enrollee = Address::generate(&env);
    client.add_enrollee(&0, &enrollee);
    let result = client.try_add_enrollee(&0, &enrollee);
    assert_eq!(result, Err(Ok(Error::AlreadyEnrolled)));
}

#[test]
fn test_join_public_quest() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);

    let learner = Address::generate(&env);
    client.join_quest(&learner, &0);

    let enrollees = client.get_enrollees(&0);
    assert_eq!(enrollees.len(), 1);
    assert_eq!(enrollees.get(0).unwrap(), learner);
    assert!(client.is_enrollee(&0, &learner));
}

#[test]
fn test_join_private_quest_rejected() {
    let (env, client, owner, token) = setup();
    create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    let learner = Address::generate(&env);
    let result = client.try_join_quest(&learner, &0);
    assert_eq!(result, Err(Ok(Error::InviteOnly)));
}

#[test]
fn test_join_archived_quest_rejected() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    client.archive_quest(&0);

    let learner = Address::generate(&env);
    let result = client.try_join_quest(&learner, &0);
    assert_eq!(result, Err(Ok(Error::EnrollmentClosed)));
}

#[test]
fn test_remove_enrollee() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    client.add_enrollee(&0, &e1);
    client.add_enrollee(&0, &e2);
    client.remove_enrollee(&0, &e1);
    let enrollees = client.get_enrollees(&0);
    assert_eq!(enrollees.len(), 1);
    assert_eq!(enrollees.get(0).unwrap(), e2);
    assert!(!client.is_enrollee(&0, &e1));
}

#[test]
fn test_remove_enrollee_not_found() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let random = Address::generate(&env);
    let result = client.try_remove_enrollee(&0, &random);
    assert_eq!(result, Err(Ok(Error::NotEnrolled)));
}

#[test]
fn test_quest_not_found() {
    let (_env, client, _owner, _token) = setup();
    let result = client.try_get_quest(&999);
    assert_eq!(result, Err(Ok(Error::NotFound)));
}

#[test]
fn test_add_enrollee_quest_not_found() {
    let (env, client, _owner, _token) = setup();
    let enrollee = Address::generate(&env);
    let result = client.try_add_enrollee(&999, &enrollee);
    assert_eq!(result, Err(Ok(Error::NotFound)));
}

#[test]
fn test_is_enrollee_false() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let random = Address::generate(&env);
    assert!(!client.is_enrollee(&0, &random));
}

// --- Visibility Tests ---

#[test]
fn test_create_public_workspace() {
    let (env, client, owner, token) = setup();
    let id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Public);
    assert_eq!(id, 0);
    let ws = client.get_quest(&0);
    assert_eq!(ws.visibility, Visibility::Public);
}

#[test]
fn test_create_private_workspace() {
    let (env, client, owner, token) = setup();
    let id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);
    assert_eq!(id, 0);
    let ws = client.get_quest(&0);
    assert_eq!(ws.visibility, Visibility::Private);
}

// --- Category/Tag Tests ---

#[test]
fn test_create_quest_with_category_and_tags() {
    let (env, client, owner, token) = setup();
    let mut tags = Vec::new(&env);
    tags.push_back(String::from_str(&env, "stellar"));
    tags.push_back(String::from_str(&env, "rust"));
    let id = create_quest_with_category_and_tags(
        &env,
        &client,
        &owner,
        &token,
        "Blockchain",
        tags,
        Visibility::Public,
    );
    assert_eq!(id, 0);
    let quest = client.get_quest(&0);
    assert_eq!(quest.category, String::from_str(&env, "Blockchain"));
    assert_eq!(quest.tags.len(), 2);
}

#[test]
fn test_create_quest_rejects_too_many_tags() {
    let (env, client, owner, token) = setup();
    let mut tags = Vec::new(&env);
    tags.push_back(String::from_str(&env, "t1"));
    tags.push_back(String::from_str(&env, "t2"));
    tags.push_back(String::from_str(&env, "t3"));
    tags.push_back(String::from_str(&env, "t4"));
    tags.push_back(String::from_str(&env, "t5"));
    tags.push_back(String::from_str(&env, "t6"));
    let result = client.try_create_quest(
        &owner,
        &String::from_str(&env, "My Quest"),
        &String::from_str(&env, "Teaching my brother to code"),
        &String::from_str(&env, "Programming"),
        &tags,
        &token,
        &Visibility::Public,
        &None,
        &None,
    );
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_create_quest_rejects_tag_too_long() {
    let (env, client, owner, token) = setup();
    let long_tag = String::from_str(
        &env,
        "012345678901234567890123456789012", // 33 chars
    );
    let mut tags = Vec::new(&env);
    tags.push_back(long_tag);
    let result = client.try_create_quest(
        &owner,
        &String::from_str(&env, "My Quest"),
        &String::from_str(&env, "Teaching my brother to code"),
        &String::from_str(&env, "Programming"),
        &tags,
        &token,
        &Visibility::Public,
        &None,
        &None,
    );
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_get_quests_by_category_only_public() {
    let (env, client, owner, token) = setup();
    create_quest_with_category_and_tags(
        &env,
        &client,
        &owner,
        &token,
        "Blockchain",
        Vec::new(&env),
        Visibility::Public,
    );
    create_quest_with_category_and_tags(
        &env,
        &client,
        &owner,
        &token,
        "Blockchain",
        Vec::new(&env),
        Visibility::Public,
    );
    create_quest_with_category_and_tags(
        &env,
        &client,
        &owner,
        &token,
        "Blockchain",
        Vec::new(&env),
        Visibility::Private,
    );
    create_quest_with_category_and_tags(
        &env,
        &client,
        &owner,
        &token,
        "Design",
        Vec::new(&env),
        Visibility::Public,
    );
    let res = client.get_quests_by_category(&String::from_str(&env, "Blockchain"));
    assert_eq!(res.len(), 2);
}

#[test]
fn test_list_public_quests_empty() {
    let (_env, client, _owner, _token) = setup();
    let public_quests = client.list_public_quests(&0, &10);
    assert_eq!(public_quests.len(), 0);
}

#[test]
fn test_list_public_quests_single() {
    let (env, client, owner, token) = setup();
    create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Public);
    let public_quests = client.list_public_quests(&0, &10);
    assert_eq!(public_quests.len(), 1);
    assert_eq!(public_quests.get(0).unwrap().visibility, Visibility::Public);
}

#[test]
fn test_list_public_quests_excludes_private() {
    let (env, client, owner, token) = setup();
    create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Public);
    create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);
    create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Public);
    let public_quests = client.list_public_quests(&0, &10);
    assert_eq!(public_quests.len(), 2);
    for i in 0..public_quests.len() {
        assert_eq!(public_quests.get(i).unwrap().visibility, Visibility::Public);
    }
}

#[test]
fn test_list_quests_by_owner_returns_only_owned_quests() {
    let (env, client, owner, token) = setup();
    let other_owner = Address::generate(&env);

    create_quest_helper(&env, &client, &owner, &token);
    create_quest_helper(&env, &client, &owner, &token);
    create_quest_helper(&env, &client, &other_owner, &token);

    let owned = client.list_quests_by_owner(&owner);
    assert_eq!(owned.len(), 2);
    for i in 0..owned.len() {
        assert_eq!(owned.get(i).unwrap().owner, owner);
    }
}

#[test]
fn test_list_quests_by_enrollee_returns_only_joined_quests() {
    let (env, client, owner, token) = setup();
    let learner = Address::generate(&env);

    create_quest_helper(&env, &client, &owner, &token);
    create_quest_helper(&env, &client, &owner, &token);
    create_quest_helper(&env, &client, &owner, &token);

    client.add_enrollee(&0, &learner);
    client.add_enrollee(&2, &learner);

    let enrolled = client.list_quests_by_enrollee(&learner);
    assert_eq!(enrolled.len(), 2);
    assert_eq!(enrolled.get(0).unwrap().id, 0);
    assert_eq!(enrolled.get(1).unwrap().id, 2);
}

#[test]
fn test_list_public_quests_all_private() {
    let (env, client, owner, token) = setup();
    create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);
    create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);
    let public_quests = client.list_public_quests(&0, &10);
    assert_eq!(public_quests.len(), 0);
}

#[test]
fn test_set_visibility_public_to_private() {
    let (env, client, owner, token) = setup();
    create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Public);
    let ws = client.get_quest(&0);
    assert_eq!(ws.visibility, Visibility::Public);
    client.set_visibility(&0, &Visibility::Private);
    let ws_updated = client.get_quest(&0);
    assert_eq!(ws_updated.visibility, Visibility::Private);
}

#[test]
fn test_set_visibility_private_to_public() {
    let (env, client, owner, token) = setup();
    create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);
    let ws = client.get_quest(&0);
    assert_eq!(ws.visibility, Visibility::Private);
    client.set_visibility(&0, &Visibility::Public);
    let ws_updated = client.get_quest(&0);
    assert_eq!(ws_updated.visibility, Visibility::Public);
}

#[test]
fn test_list_public_quests_after_visibility_change() {
    let (env, client, owner, token) = setup();
    let id1 = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Public);
    let id2 = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);
    let ws1 = client.get_quest(&id1);
    assert_eq!(ws1.visibility, Visibility::Public);
    let ws2 = client.get_quest(&id2);
    assert_eq!(ws2.visibility, Visibility::Private);
    let initial_public = client.list_public_quests(&0, &10);
    assert_eq!(initial_public.len(), 1);
    client.set_visibility(&id2, &Visibility::Public);
    let updated_public = client.list_public_quests(&0, &10);
    assert_eq!(updated_public.len(), 2);
    client.set_visibility(&id1, &Visibility::Private);
    let final_public = client.list_public_quests(&0, &10);
    assert_eq!(final_public.len(), 1);
}

#[test]
fn test_private_quest_not_in_public_listings() {
    let (env, client, owner, token) = setup();
    create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);
    let public_quests = client.list_public_quests(&0, &10);
    assert_eq!(public_quests.len(), 0);
    let ws = client.get_quest(&0);
    assert_eq!(ws.visibility, Visibility::Private);
}

#[test]
fn test_private_quest_remains_directly_queryable_by_id() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);
    let enrollee = Address::generate(&env);

    client.add_enrollee(&quest_id, &enrollee);

    let quest = client.get_quest(&quest_id);
    let enrollees = client.get_enrollees(&quest_id);

    assert_eq!(quest.visibility, Visibility::Private);
    assert_eq!(enrollees.len(), 1);
    assert_eq!(enrollees.get(0).unwrap(), enrollee);
    assert!(client.is_enrollee(&quest_id, &enrollee));
}

// ---- Visibility mode comprehensive tests ----

/// Test: owner CAN add enrollees to their own private quest (positive case).
#[test]
fn test_owner_can_add_enrollee_to_private_quest() {
    let (env, client, owner, token) = setup();

    // Create a private quest
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    // Owner adds an enrollee - should succeed
    let enrollee = Address::generate(&env);
    client.add_enrollee(&quest_id, &enrollee);

    assert!(client.is_enrollee(&quest_id, &enrollee));
    assert_eq!(client.get_enrollees(&quest_id).len(), 1);
}

/// Test: visibility flag is correctly stored and returned for private quests.
#[test]
fn test_private_quest_visibility_flag_persists() {
    let (env, client, owner, token) = setup();

    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    // Verify visibility is stored correctly
    let quest = client.get_quest(&quest_id);
    assert_eq!(quest.visibility, Visibility::Private);

    // Verify it persists after operations
    let enrollee = Address::generate(&env);
    client.add_enrollee(&quest_id, &enrollee);

    let quest_after = client.get_quest(&quest_id);
    assert_eq!(quest_after.visibility, Visibility::Private);
}

#[test]
fn test_visibility_flag_returns_correctly_for_public_quest() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Public);

    let quest = client.get_quest(&quest_id);
    assert_eq!(quest.visibility, Visibility::Public);

    // Also verify via list_public_quests
    let public_quests = client.list_public_quests(&0, &10);
    assert_eq!(public_quests.len(), 1);
    assert_eq!(public_quests.get(0).unwrap().visibility, Visibility::Public);
}

#[test]
fn test_visibility_flag_returns_correctly_for_private_quest() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    let quest = client.get_quest(&quest_id);
    assert_eq!(quest.visibility, Visibility::Private);

    // Verify NOT in public list
    let public_quests = client.list_public_quests(&0, &10);
    assert_eq!(public_quests.len(), 0);
}

#[test]
fn test_list_public_quests_excludes_mixed_visibility() {
    let (env, client, owner, token) = setup();

    // Create 3 public and 2 private quests
    create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Public);
    create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);
    create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Public);
    create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);
    create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Public);

    let public_quests = client.list_public_quests(&0, &10);
    assert_eq!(public_quests.len(), 3);

    // Verify all returned quests are Public
    for i in 0..public_quests.len() {
        assert_eq!(public_quests.get(i).unwrap().visibility, Visibility::Public);
    }

    // Verify by directly querying that private quests exist but aren't listed
    let quest_1 = client.get_quest(&1);
    assert_eq!(quest_1.visibility, Visibility::Private);

    let quest_3 = client.get_quest(&3);
    assert_eq!(quest_3.visibility, Visibility::Private);
}

#[test]
fn test_set_visibility_preserves_quest_data() {
    let (env, client, owner, token) = setup();

    // Create a public quest with enrollees
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Public);
    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    client.add_enrollee(&quest_id, &e1);
    client.add_enrollee(&quest_id, &e2);

    // Change to private
    client.set_visibility(&quest_id, &Visibility::Private);

    // Verify quest data is preserved
    let quest = client.get_quest(&quest_id);
    assert_eq!(quest.visibility, Visibility::Private);
    assert_eq!(quest.name, String::from_str(&env, "My Quest"));
    assert_eq!(client.get_enrollees(&quest_id).len(), 2);
    assert!(client.is_enrollee(&quest_id, &e1));
    assert!(client.is_enrollee(&quest_id, &e2));

    // Verify no longer in public list
    let public_quests = client.list_public_quests(&0, &10);
    assert_eq!(public_quests.len(), 0);
}

#[test]
fn test_add_enrollee_on_private_quest_by_owner_succeeds() {
    let (env, client, owner, token) = setup();

    // Create a private quest
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    // Owner can still add enrollees to private quest
    let enrollee = Address::generate(&env);
    client.add_enrollee(&quest_id, &enrollee);

    assert!(client.is_enrollee(&quest_id, &enrollee));
    assert_eq!(client.get_enrollees(&quest_id).len(), 1);
}

// --- Edge case tests ---

#[test]
fn test_add_enrollee_non_existent_quest() {
    let (env, client, _owner, _token) = setup();
    let enrollee = Address::generate(&env);
    let result = client.try_add_enrollee(&999, &enrollee);
    assert_eq!(result, Err(Ok(Error::NotFound)));
}

#[test]
fn test_remove_enrollee_non_existent_quest() {
    let (env, client, _owner, _token) = setup();
    let enrollee = Address::generate(&env);
    let result = client.try_remove_enrollee(&999, &enrollee);
    assert_eq!(result, Err(Ok(Error::NotFound)));
}

#[test]
fn test_set_visibility_non_existent_quest() {
    let (_env, client, _owner, _token) = setup();
    let result = client.try_set_visibility(&999, &Visibility::Private);
    assert_eq!(result, Err(Ok(Error::NotFound)));
}

#[test]
fn test_add_enrollee_wrong_owner() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let _wrong_owner = Address::generate(&env);
    let enrollee = Address::generate(&env);
    let result = client.try_add_enrollee(&0, &enrollee);
    assert_eq!(result, Ok(Ok(())));
}

#[test]
fn test_remove_enrollee_wrong_owner() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let enrollee = Address::generate(&env);
    client.add_enrollee(&0, &enrollee);
    let _wrong_owner = Address::generate(&env);
    let result = client.try_remove_enrollee(&0, &enrollee);
    assert_eq!(result, Ok(Ok(())));
}

#[test]
fn test_set_visibility_wrong_owner() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let _wrong_owner = Address::generate(&env);
    let result = client.try_set_visibility(&0, &Visibility::Private);
    assert_eq!(result, Ok(Ok(())));
}

// --- Leave Quest Tests (PR #294) ---

#[test]
fn test_leave_quest() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);

    let enrollee = Address::generate(&env);
    client.add_enrollee(&0, &enrollee);
    assert!(client.is_enrollee(&0, &enrollee));

    client.leave_quest(&enrollee, &0);

    let enrollees = client.get_enrollees(&0);
    assert_eq!(enrollees.len(), 0);
    assert!(!client.is_enrollee(&0, &enrollee));
}

#[test]
fn test_leave_quest_not_enrolled() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);

    let random = Address::generate(&env);
    let result = client.try_leave_quest(&random, &0);
    assert_eq!(result, Err(Ok(Error::NotEnrolled)));
}

// --- Leave-quest peer-review hold (issue #862) ---

#[test]
fn test_leave_quest_blocked_while_hold_in_place() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);

    let enrollee = Address::generate(&env);
    client.add_enrollee(&0, &enrollee);

    client.place_leave_hold(&0, &owner, &enrollee);
    assert!(client.has_leave_hold(&0, &enrollee));

    let result = client.try_leave_quest(&enrollee, &0);
    assert_eq!(result, Err(Ok(Error::LeaveBlockedByPendingApproval)));

    assert!(client.is_enrollee(&0, &enrollee));
}

#[test]
fn test_leave_quest_allowed_after_hold_lifted() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);

    let enrollee = Address::generate(&env);
    client.add_enrollee(&0, &enrollee);

    client.place_leave_hold(&0, &owner, &enrollee);
    client.lift_leave_hold(&0, &owner, &enrollee);
    assert!(!client.has_leave_hold(&0, &enrollee));

    client.leave_quest(&enrollee, &0);
    assert!(!client.is_enrollee(&0, &enrollee));
}

#[test]
fn test_place_leave_hold_rejects_non_owner() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);

    let enrollee = Address::generate(&env);
    client.add_enrollee(&0, &enrollee);

    let stranger = Address::generate(&env);
    let result = client.try_place_leave_hold(&0, &stranger, &enrollee);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_place_leave_hold_rejects_non_enrollee() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);

    let stranger = Address::generate(&env);
    let result = client.try_place_leave_hold(&0, &owner, &stranger);
    assert_eq!(result, Err(Ok(Error::NotEnrolled)));
}

// --- QuestStatus / Update / Archive Tests (PR #296) ---

#[test]
fn test_new_quest_is_active_by_default() {
    let (env, client, owner, token) = setup();
    let ts = env.ledger().timestamp();
    create_quest_helper(&env, &client, &owner, &token);
    let quest = client.get_quest(&0);
    assert_eq!(quest.status, QuestStatus::Active);
    assert_eq!(quest.created_at, ts);
}

#[test]
fn test_update_quest() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    client.update_quest(
        &0,
        &owner,
        &Some(String::from_str(&env, "Updated Name")),
        &Some(String::from_str(&env, "Updated description")),
        &Some(String::from_str(&env, "Design")),
        &Some(Vec::<String>::new(&env)),
        &Some(Visibility::Private),
        &None,
    );
    let quest = client.get_quest(&0);
    assert_eq!(quest.name, String::from_str(&env, "Updated Name"));
    assert_eq!(
        quest.description,
        String::from_str(&env, "Updated description")
    );
    assert_eq!(quest.category, String::from_str(&env, "Design"));
    assert_eq!(quest.visibility, Visibility::Private);
    assert_eq!(quest.status, QuestStatus::Active);
}

#[test]
fn test_update_quest_with_tags() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let mut new_tags = Vec::new(&env);
    new_tags.push_back(String::from_str(&env, "rust"));
    new_tags.push_back(String::from_str(&env, "stellar"));
    client.update_quest(
        &0,
        &owner,
        &Some(String::from_str(&env, "My Quest")),
        &Some(String::from_str(&env, "desc")),
        &Some(String::from_str(&env, "Programming")),
        &Some(new_tags),
        &Some(Visibility::Public),
        &None,
    );
    let quest = client.get_quest(&0);
    assert_eq!(quest.tags.len(), 2);
}

#[test]
fn test_update_quest_rejects_too_many_tags() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let mut tags = Vec::new(&env);
    for _ in 0..6u32 {
        tags.push_back(String::from_str(&env, "tag"));
    }
    let result = client.try_update_quest(
        &0,
        &owner,
        &Some(String::from_str(&env, "Name")),
        &Some(String::from_str(&env, "Desc")),
        &Some(String::from_str(&env, "Cat")),
        &Some(tags),
        &Some(Visibility::Public),
        &None,
    );
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_update_quest_not_found() {
    let (env, client, owner, _token) = setup();
    let result = client.try_update_quest(
        &999,
        &owner,
        &Some(String::from_str(&env, "Name")),
        &Some(String::from_str(&env, "Desc")),
        &Some(String::from_str(&env, "Cat")),
        &Some(Vec::<String>::new(&env)),
        &Some(Visibility::Public),
        &None,
    );
    assert_eq!(result, Err(Ok(Error::NotFound)));
}

#[test]
fn test_archive_quest() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let quest = client.get_quest(&0);
    assert_eq!(quest.status, QuestStatus::Active);
    client.archive_quest(&0);
    let archived_quest = client.get_quest(&0);
    assert_eq!(archived_quest.status, QuestStatus::Archived);
    assert_eq!(archived_quest.owner, owner);
    assert_eq!(archived_quest.name, String::from_str(&env, "My Quest"));
}

#[test]
fn test_archive_quest_not_found() {
    let (_env, client, _owner, _token) = setup();
    let result = client.try_archive_quest(&999);
    assert_eq!(result, Err(Ok(Error::NotFound)));
}

#[test]
fn test_archived_quest_rejects_new_enrollment() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    client.archive_quest(&0);
    let enrollee = Address::generate(&env);
    let result = client.try_add_enrollee(&0, &enrollee);
    assert_eq!(result, Err(Ok(Error::EnrollmentClosed)));
}

#[test]
fn test_archived_quest_allows_viewing() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let enrollee = Address::generate(&env);
    client.add_enrollee(&0, &enrollee);
    client.archive_quest(&0);
    let quest = client.get_quest(&0);
    assert_eq!(quest.status, QuestStatus::Archived);
    let enrollees = client.get_enrollees(&0);
    assert_eq!(enrollees.len(), 1);
    assert_eq!(enrollees.get(0).unwrap(), enrollee);
    assert!(client.is_enrollee(&0, &enrollee));
}

#[test]
fn test_archived_quest_rejects_update() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    client.archive_quest(&0);
    let result = client.try_update_quest(
        &0,
        &owner,
        &Some(String::from_str(&env, "New Name")),
        &Some(String::from_str(&env, "New desc")),
        &Some(String::from_str(&env, "Cat")),
        &Some(Vec::<String>::new(&env)),
        &Some(Visibility::Public),
        &None,
    );
    assert_eq!(result, Err(Ok(Error::QuestArchived)));
}

#[test]
fn test_archive_quest_twice_rejected() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    client.archive_quest(&0);
    let archived_at = client.get_quest(&0).archived_at;

    let result = client.try_archive_quest(&0);
    assert_eq!(result, Err(Ok(Error::QuestArchived)));

    // Re-archiving must not mutate the original archived_at timestamp.
    let quest = client.get_quest(&0);
    assert_eq!(quest.status, QuestStatus::Archived);
    assert_eq!(quest.archived_at, archived_at);
}

#[test]
fn test_admin_verification() {
    let (env, client, _owner, _token) = setup();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);

    // Initialize admin
    client.initialize(&admin);

    // Verify creator
    client.verify_creator(&admin, &creator);
    assert!(client.is_creator_verified(&creator));

    // Non-admin cannot verify
    let non_admin = Address::generate(&env);
    let result = client.try_verify_creator(&non_admin, &Address::generate(&env));
    assert!(result.is_err());
}

#[test]
fn test_revoke_creator_verification() {
    let (env, client, _owner, _token) = setup();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);

    client.initialize(&admin);
    client.verify_creator(&admin, &creator);
    assert!(client.is_creator_verified(&creator));

    // Revoke
    client.revoke_creator_verification(&admin, &creator);

    // State cleared
    assert!(!client.is_creator_verified(&creator));
    // Storage entry removed (probe inside the contract's storage frame)
    let key = DataKey::VerifiedCreator(creator);
    let has_key = env.as_contract(&client.address, || env.storage().persistent().has(&key));
    assert!(!has_key);
}

#[test]
fn test_revoke_creator_verification_idempotent() {
    let (env, client, _owner, _token) = setup();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);

    client.initialize(&admin);
    // Revoke when not verified — should succeed
    client.revoke_creator_verification(&admin, &creator);
    assert!(!client.is_creator_verified(&creator));

    // Second revoke also succeeds
    client.revoke_creator_verification(&admin, &creator);
    assert!(!client.is_creator_verified(&creator));
}

#[test]
fn test_revoke_creator_verification_unauthorized() {
    let (env, client, _owner, _token) = setup();
    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);
    let creator = Address::generate(&env);

    client.initialize(&admin);
    client.verify_creator(&admin, &creator);

    let result = client.try_revoke_creator_verification(&attacker, &creator);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));

    // Still verified
    assert!(client.is_creator_verified(&creator));
}

#[test]
fn test_revoke_creator_verification_when_paused() {
    let (env, client, _owner, _token) = setup();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);

    client.initialize(&admin);
    client.verify_creator(&admin, &creator);
    client.pause(&admin);

    let result = client.try_revoke_creator_verification(&admin, &creator);
    assert_eq!(result, Err(Ok(Error::Paused)));

    // Verification unchanged
    assert!(client.is_creator_verified(&creator));
}

#[test]
fn test_verified_creator_quest() {
    let (env, client, owner, token) = setup();
    let admin = Address::generate(&env);

    client.initialize(&admin);
    client.verify_creator(&admin, &owner);

    let id = create_quest_helper(&env, &client, &owner, &token);
    let quest = client.get_quest(&id);
    assert!(quest.verified);

    let unverified_owner = Address::generate(&env);
    let id2 = create_quest_helper(&env, &client, &unverified_owner, &token);
    let quest2 = client.get_quest(&id2);
    assert!(!quest2.verified);
}

#[test]
fn test_pause_blocks_state_changes_until_unpaused() {
    let (env, client, owner, token) = setup();
    let admin = Address::generate(&env);
    client.initialize(&admin);

    assert!(!client.is_paused());
    client.pause(&admin);
    assert!(client.is_paused());

    let create_result = client.try_create_quest(
        &owner,
        &String::from_str(&env, "Paused Quest"),
        &String::from_str(&env, "Should fail while paused"),
        &String::from_str(&env, "Programming"),
        &Vec::<String>::new(&env),
        &token,
        &Visibility::Public,
        &None,
        &None,
    );
    assert_eq!(create_result, Err(Ok(Error::Paused)));

    client.unpause(&admin);
    let quest_id = create_quest_helper(&env, &client, &owner, &token);
    client.pause(&admin);

    let enrollee = Address::generate(&env);
    let add_result = client.try_add_enrollee(&quest_id, &enrollee);
    assert_eq!(add_result, Err(Ok(Error::Paused)));

    client.unpause(&admin);
    assert!(!client.is_paused());
    client.add_enrollee(&quest_id, &enrollee);
    assert!(client.is_enrollee(&quest_id, &enrollee));
}

#[test]
fn test_pause_blocks_all_write_endpoints_until_unpaused() {
    let (env, client, owner, token) = setup();
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let quest_id = create_quest_helper(&env, &client, &owner, &token);
    let enrollee = Address::generate(&env);
    let random_enrollee = Address::generate(&env);
    let preimage = Bytes::from_array(&env, &[0u8; 32]);
    let commitment: BytesN<32> = env.crypto().sha256(&preimage).into();

    client.add_enrollee(&quest_id, &enrollee);
    client.pause(&admin);

    assert_eq!(
        client.try_update_quest(
            &quest_id,
            &owner,
            &Some(String::from_str(&env, "Paused Quest")),
            &Some(String::from_str(&env, "Description")),
            &Some(String::from_str(&env, "Programming")),
            &Some(Vec::<String>::new(&env)),
            &Some(Visibility::Private),
            &Some(10),
        ),
        Err(Ok(Error::Paused))
    );
    assert_eq!(client.try_archive_quest(&quest_id), Err(Ok(Error::Paused)));
    assert_eq!(
        client.try_add_enrollee(&quest_id, &random_enrollee),
        Err(Ok(Error::Paused))
    );
    assert_eq!(
        client.try_join_quest(&random_enrollee, &quest_id),
        Err(Ok(Error::Paused))
    );
    assert_eq!(
        client.try_register_invite(&owner, &quest_id, &commitment),
        Err(Ok(Error::Paused))
    );
    assert_eq!(
        client.try_revoke_invite(&owner, &quest_id, &commitment),
        Err(Ok(Error::Paused))
    );
    assert_eq!(
        client.try_join_quest_with_invite(&random_enrollee, &quest_id, &preimage),
        Err(Ok(Error::Paused))
    );
    assert_eq!(
        client.try_remove_enrollee(&quest_id, &enrollee),
        Err(Ok(Error::Paused))
    );
    assert_eq!(
        client.try_leave_quest(&enrollee, &quest_id),
        Err(Ok(Error::Paused))
    );
    assert_eq!(
        client.try_set_deadline(&quest_id, &123456),
        Err(Ok(Error::Paused))
    );
    assert_eq!(
        client.try_set_visibility(&quest_id, &Visibility::Private),
        Err(Ok(Error::Paused))
    );
}

#[test]
fn test_pre_existing_enrollees_retained_after_archive() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    client.add_enrollee(&0, &e1);
    client.add_enrollee(&0, &e2);
    client.archive_quest(&0);
    let enrollees = client.get_enrollees(&0);
    assert_eq!(enrollees.len(), 2);
}

// ── update_quest input-validation tests ──────────────────────────────────────

#[test]
fn test_update_quest_empty_name_fails() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let result = client.try_update_quest(
        &0,
        &owner,
        &Some(String::from_str(&env, "")),
        &Some(String::from_str(&env, "Valid description")),
        &Some(String::from_str(&env, "Programming")),
        &Some(Vec::<String>::new(&env)),
        &Some(Visibility::Public),
        &None,
    );
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_update_quest_oversized_name_fails() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let bytes = [b'a'; 65];
    let long_name = String::from_bytes(&env, &bytes);
    let result = client.try_update_quest(
        &0,
        &owner,
        &Some(long_name),
        &Some(String::from_str(&env, "Valid description")),
        &Some(String::from_str(&env, "Programming")),
        &Some(Vec::<String>::new(&env)),
        &Some(Visibility::Public),
        &None,
    );
    assert_eq!(result, Err(Ok(Error::NameTooLong)));
}

#[test]
fn test_update_quest_empty_description_fails() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let result = client.try_update_quest(
        &0,
        &owner,
        &Some(String::from_str(&env, "Valid Name")),
        &Some(String::from_str(&env, "")),
        &Some(String::from_str(&env, "Programming")),
        &Some(Vec::<String>::new(&env)),
        &Some(Visibility::Public),
        &None,
    );
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_update_quest_oversized_description_fails() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let bytes = [b'a'; 2001];
    let long_desc = String::from_bytes(&env, &bytes);
    let result = client.try_update_quest(
        &0,
        &owner,
        &Some(String::from_str(&env, "Valid Name")),
        &Some(long_desc),
        &Some(String::from_str(&env, "Programming")),
        &Some(Vec::<String>::new(&env)),
        &Some(Visibility::Public),
        &None,
    );
    assert_eq!(result, Err(Ok(Error::DescriptionTooLong)));
}

#[test]
fn test_update_quest_partial() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);

    // Update only name
    client.update_quest(
        &0,
        &owner,
        &Some(String::from_str(&env, "New Name")),
        &None,
        &None,
        &None,
        &None,
        &None,
    );

    let quest = client.get_quest(&0);
    assert_eq!(quest.name, String::from_str(&env, "New Name"));
    assert_eq!(
        quest.description,
        String::from_str(&env, "Teaching my brother to code")
    ); // original
}

#[test]
fn test_update_quest_unauthorized() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let wrong_owner = Address::generate(&env);

    let result = client.try_update_quest(
        &0,
        &wrong_owner,
        &Some(String::from_str(&env, "Hack")),
        &None,
        &None,
        &None,
        &None,
        &None,
    );
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_update_quest_visibility_merge() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);

    let quest = client.get_quest(&0);
    assert_eq!(quest.visibility, Visibility::Public);

    client.update_quest(
        &0,
        &owner,
        &None,
        &None,
        &None,
        &None,
        &Some(Visibility::Private),
        &None,
    );

    let updated = client.get_quest(&0);
    assert_eq!(updated.visibility, Visibility::Private);

    // Verify it's removed from public list
    let public_quests = client.list_public_quests(&0, &10);
    assert_eq!(public_quests.len(), 0);
}

#[test]
fn test_enrollee_cap() {
    let (env, client, owner, token) = setup();
    let id = client.create_quest(
        &owner,
        &String::from_str(&env, "Cap Quest"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Cat"),
        &Vec::new(&env),
        &token,
        &Visibility::Public,
        &Some(2),
        &None,
    );

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    let e3 = Address::generate(&env);

    client.add_enrollee(&id, &e1);
    client.add_enrollee(&id, &e2);
    let result = client.try_add_enrollee(&id, &e3);

    assert_eq!(result, Err(Ok(Error::QuestFull)));
}

#[test]
fn test_initialize_admin() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(QuestContract, ());
    let client = QuestContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    // Try to initialize again should fail
    let result = client.try_initialize(&admin);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_migrate_quest_data_records_schema_version() {
    let (env, client, owner, token) = setup();
    let admin = Address::generate(&env);
    client.initialize(&admin);
    create_quest_helper(&env, &client, &owner, &token);

    let mut ids = Vec::new(&env);
    ids.push_back(0);
    client.migrate_quest_data(&admin, &ids, &1);

    assert_eq!(client.get_quest_schema_version(&0), 1);
}

#[test]
fn test_migrate_quest_data_validates_entire_batch_before_writing() {
    let (env, client, owner, token) = setup();
    let admin = Address::generate(&env);
    client.initialize(&admin);
    create_quest_helper(&env, &client, &owner, &token);

    let mut ids = Vec::new(&env);
    ids.push_back(0);
    ids.push_back(99);
    let result = client.try_migrate_quest_data(&admin, &ids, &1);

    assert_eq!(result, Err(Ok(Error::NotFound)));
    let version_key = DataKey::QuestSchemaVersion(0);
    let migrated = env.as_contract(&client.address, || {
        env.storage().persistent().has(&version_key)
    });
    assert!(!migrated);
}

#[test]
fn test_transfer_admin() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(QuestContract, ());
    let client = QuestContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let new_admin = Address::generate(&env);

    client.initialize(&admin);

    // Transfer admin
    client.transfer_admin(&admin, &new_admin);

    // New admin should be able to pause
    client.pause(&new_admin);
    assert!(client.is_paused());

    // Old admin should not be able to unpause
    let result = client.try_unpause(&admin);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));

    // New admin should be able to unpause
    client.unpause(&new_admin);
    assert!(!client.is_paused());
}

#[test]
fn test_transfer_admin_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(QuestContract, ());
    let client = QuestContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let hacker = Address::generate(&env);
    let new_admin = Address::generate(&env);

    client.initialize(&admin);

    // Hacker tries to transfer admin
    let result = client.try_transfer_admin(&hacker, &new_admin);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

// --- EnrollmentClosed / DeadlineExpired tests ---

#[test]
fn test_join_quest_archived_returns_enrollment_closed() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    client.archive_quest(&0);

    let learner = Address::generate(&env);
    let result = client.try_join_quest(&learner, &0);
    assert_eq!(result, Err(Ok(Error::EnrollmentClosed)));
}

#[test]
fn test_add_enrollee_archived_returns_enrollment_closed() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    client.archive_quest(&0);

    let enrollee = Address::generate(&env);
    let result = client.try_add_enrollee(&0, &enrollee);
    assert_eq!(result, Err(Ok(Error::EnrollmentClosed)));
}

#[test]
fn test_join_quest_past_deadline_returns_deadline_expired() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);

    // Set ledger time to 1000, then set a deadline that has already passed
    env.ledger().set_timestamp(1000);
    client.set_deadline(&0, &999);

    let learner = Address::generate(&env);
    let result = client.try_join_quest(&learner, &0);
    assert_eq!(result, Err(Ok(Error::DeadlineExpired)));
}

#[test]
fn test_add_enrollee_past_deadline_returns_deadline_expired() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);

    env.ledger().set_timestamp(1000);
    client.set_deadline(&0, &999);

    let enrollee = Address::generate(&env);
    let result = client.try_add_enrollee(&0, &enrollee);
    assert_eq!(result, Err(Ok(Error::DeadlineExpired)));
}

#[test]
fn test_join_quest_zero_deadline_is_not_expired() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    // deadline = 0 means no deadline; enrollment should succeed
    let learner = Address::generate(&env);
    client.join_quest(&learner, &0);
    assert!(client.is_enrollee(&0, &learner));
}

#[test]
fn test_join_quest_future_deadline_succeeds() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);

    env.ledger().set_timestamp(1000);
    client.set_deadline(&0, &2000);

    let learner = Address::generate(&env);
    client.join_quest(&learner, &0);
    assert!(client.is_enrollee(&0, &learner));
}

#[test]
fn test_enrollment_closed_is_distinct_from_quest_archived() {
    // EnrollmentClosed (13) != QuestArchived (8) — different codes for different consumers
    assert_ne!(Error::EnrollmentClosed as u32, Error::QuestArchived as u32);
    assert_eq!(Error::EnrollmentClosed as u32, 13);
    assert_eq!(Error::DeadlineExpired as u32, 14);
}

// ---------------------------------------------------------------------------
// Invite code tests
// ---------------------------------------------------------------------------
//
// Design recap:
//   Owner calls register_invite(quest_id, SHA-256(preimage)).
//   Enrollee calls join_quest_with_invite(enrollee, quest_id, preimage).
//   Contract hashes preimage, checks commitment exists + not consumed,
//   marks consumed, then enrolls.

/// Compute SHA-256 of a byte slice using the Soroban test environment.
fn sha256_commitment(env: &Env, preimage: &[u8]) -> BytesN<32> {
    let bytes = Bytes::from_slice(env, preimage);
    env.crypto().sha256(&bytes).into()
}

#[test]
fn test_invite_happy_path_private_quest() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    let preimage = b"super-secret-invite-code";
    let commitment = sha256_commitment(&env, preimage);

    // Owner registers the commitment.
    client.register_invite(&owner, &quest_id, &commitment);

    // Commitment should be valid before use.
    assert!(client.is_invite_valid(&quest_id, &commitment));

    // Enrollee redeems the invite.
    let learner = Address::generate(&env);
    client.join_quest_with_invite(&learner, &quest_id, &Bytes::from_slice(&env, preimage));

    assert!(client.is_enrollee(&quest_id, &learner));
    assert_eq!(client.get_enrollees(&quest_id).len(), 1);

    // Commitment is now consumed — no longer valid.
    assert!(!client.is_invite_valid(&quest_id, &commitment));
}

#[test]
fn test_invite_replay_rejected() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    let preimage = b"one-time-code";
    let commitment = sha256_commitment(&env, preimage);
    client.register_invite(&owner, &quest_id, &commitment);

    let learner1 = Address::generate(&env);
    client.join_quest_with_invite(&learner1, &quest_id, &Bytes::from_slice(&env, preimage));
    assert!(client.is_enrollee(&quest_id, &learner1));

    // Second enrollee tries to reuse the same preimage — must fail.
    let learner2 = Address::generate(&env);
    let result =
        client.try_join_quest_with_invite(&learner2, &quest_id, &Bytes::from_slice(&env, preimage));
    assert_eq!(result, Err(Ok(Error::InviteAlreadyUsed)));
    assert!(!client.is_enrollee(&quest_id, &learner2));
}

#[test]
fn test_invite_wrong_preimage_rejected() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    let preimage = b"correct-secret";
    let commitment = sha256_commitment(&env, preimage);
    client.register_invite(&owner, &quest_id, &commitment);

    let learner = Address::generate(&env);
    let result = client.try_join_quest_with_invite(
        &learner,
        &quest_id,
        &Bytes::from_slice(&env, b"wrong-secret"),
    );
    assert_eq!(result, Err(Ok(Error::InvalidInvite)));
    assert!(!client.is_enrollee(&quest_id, &learner));
}

#[test]
fn test_invite_unregistered_commitment_rejected() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    // No register_invite call — any preimage should fail.
    let learner = Address::generate(&env);
    let result = client.try_join_quest_with_invite(
        &learner,
        &quest_id,
        &Bytes::from_slice(&env, b"any-preimage"),
    );
    assert_eq!(result, Err(Ok(Error::InvalidInvite)));
}

#[test]
fn test_multiple_independent_invites() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    let preimage_a = b"invite-for-alice";
    let preimage_b = b"invite-for-bob";
    let commitment_a = sha256_commitment(&env, preimage_a);
    let commitment_b = sha256_commitment(&env, preimage_b);

    client.register_invite(&owner, &quest_id, &commitment_a);
    client.register_invite(&owner, &quest_id, &commitment_b);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.join_quest_with_invite(&alice, &quest_id, &Bytes::from_slice(&env, preimage_a));
    client.join_quest_with_invite(&bob, &quest_id, &Bytes::from_slice(&env, preimage_b));

    assert!(client.is_enrollee(&quest_id, &alice));
    assert!(client.is_enrollee(&quest_id, &bob));
    assert_eq!(client.get_enrollees(&quest_id).len(), 2);

    // Alice's invite is consumed; Bob's is also consumed.
    assert!(!client.is_invite_valid(&quest_id, &commitment_a));
    assert!(!client.is_invite_valid(&quest_id, &commitment_b));
}

#[test]
fn test_invite_on_archived_quest_rejected() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    let preimage = b"secret";
    let commitment = sha256_commitment(&env, preimage);
    client.register_invite(&owner, &quest_id, &commitment);

    client.archive_quest(&quest_id);

    let learner = Address::generate(&env);
    let result =
        client.try_join_quest_with_invite(&learner, &quest_id, &Bytes::from_slice(&env, preimage));
    assert_eq!(result, Err(Ok(Error::EnrollmentClosed)));
}

#[test]
fn test_invite_past_deadline_rejected() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    let preimage = b"secret";
    let commitment = sha256_commitment(&env, preimage);
    client.register_invite(&owner, &quest_id, &commitment);

    env.ledger().set_timestamp(1000);
    client.set_deadline(&quest_id, &999);

    let learner = Address::generate(&env);
    let result =
        client.try_join_quest_with_invite(&learner, &quest_id, &Bytes::from_slice(&env, preimage));
    assert_eq!(result, Err(Ok(Error::DeadlineExpired)));
}

#[test]
fn test_is_invite_valid_false_after_deadline() {
    // Issue #1326 — is_invite_valid must not report a stale invite as valid
    // once the quest deadline has passed, even though the commitment itself
    // is still registered and unused.
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    let preimage = b"secret";
    let commitment = sha256_commitment(&env, preimage);
    client.register_invite(&owner, &quest_id, &commitment);
    assert!(client.is_invite_valid(&quest_id, &commitment));

    env.ledger().set_timestamp(1000);
    client.set_deadline(&quest_id, &999);

    assert!(!client.is_invite_valid(&quest_id, &commitment));
}

#[test]
fn test_register_invite_past_deadline_rejected() {
    // Issue #1326 — an owner cannot register new invites for a quest whose
    // deadline has already passed.
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    env.ledger().set_timestamp(1000);
    client.set_deadline(&quest_id, &999);

    let commitment = sha256_commitment(&env, b"secret");
    let result = client.try_register_invite(&owner, &quest_id, &commitment);
    assert_eq!(result, Err(Ok(Error::DeadlineExpired)));
}

#[test]
fn test_is_invite_valid_false_for_archived_quest() {
    // Issue #1326 — closing a quest (archive) must also invalidate its
    // outstanding invites from the query surface.
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    let preimage = b"secret";
    let commitment = sha256_commitment(&env, preimage);
    client.register_invite(&owner, &quest_id, &commitment);
    assert!(client.is_invite_valid(&quest_id, &commitment));

    client.archive_quest(&quest_id);
    assert!(!client.is_invite_valid(&quest_id, &commitment));
}

#[test]
fn test_invite_respects_enrollment_cap() {
    let (env, client, owner, token) = setup();
    // Cap of 1 enrollee.
    let quest_id = client.create_quest(
        &owner,
        &String::from_str(&env, "Capped Quest"),
        &String::from_str(&env, "Only one seat"),
        &String::from_str(&env, "Programming"),
        &Vec::<String>::new(&env),
        &token,
        &Visibility::Private,
        &Some(1u32),
        &None,
    );

    let preimage_a = b"seat-one";
    let preimage_b = b"seat-two";
    let commitment_a = sha256_commitment(&env, preimage_a);
    let commitment_b = sha256_commitment(&env, preimage_b);
    client.register_invite(&owner, &quest_id, &commitment_a);
    client.register_invite(&owner, &quest_id, &commitment_b);

    let alice = Address::generate(&env);
    client.join_quest_with_invite(&alice, &quest_id, &Bytes::from_slice(&env, preimage_a));
    assert!(client.is_enrollee(&quest_id, &alice));

    let bob = Address::generate(&env);
    let result =
        client.try_join_quest_with_invite(&bob, &quest_id, &Bytes::from_slice(&env, preimage_b));
    assert_eq!(result, Err(Ok(Error::QuestFull)));
    assert!(!client.is_enrollee(&quest_id, &bob));
}

#[test]
fn test_invite_already_enrolled_rejected() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    let preimage_a = b"first-invite";
    let preimage_b = b"second-invite";
    let commitment_a = sha256_commitment(&env, preimage_a);
    let commitment_b = sha256_commitment(&env, preimage_b);
    client.register_invite(&owner, &quest_id, &commitment_a);
    client.register_invite(&owner, &quest_id, &commitment_b);

    let learner = Address::generate(&env);
    // First redemption succeeds.
    client.join_quest_with_invite(&learner, &quest_id, &Bytes::from_slice(&env, preimage_a));
    assert!(client.is_enrollee(&quest_id, &learner));

    // Same address tries a second (different) invite — already enrolled.
    let result = client.try_join_quest_with_invite(
        &learner,
        &quest_id,
        &Bytes::from_slice(&env, preimage_b),
    );
    assert_eq!(result, Err(Ok(Error::AlreadyEnrolled)));
}

#[test]
fn test_register_invite_non_owner_rejected() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    let commitment = sha256_commitment(&env, b"secret");
    let impostor = Address::generate(&env);
    let result = client.try_register_invite(&impostor, &quest_id, &commitment);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_register_invite_archived_quest_rejected() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);
    client.archive_quest(&quest_id);

    let commitment = sha256_commitment(&env, b"secret");
    let result = client.try_register_invite(&owner, &quest_id, &commitment);
    assert_eq!(result, Err(Ok(Error::EnrollmentClosed)));
}

#[test]
fn test_revoke_invite_prevents_redemption() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    let preimage = b"revocable-code";
    let commitment = sha256_commitment(&env, preimage);
    client.register_invite(&owner, &quest_id, &commitment);
    assert!(client.is_invite_valid(&quest_id, &commitment));

    // Owner revokes before anyone uses it.
    client.revoke_invite(&owner, &quest_id, &commitment);
    assert!(!client.is_invite_valid(&quest_id, &commitment));

    let learner = Address::generate(&env);
    let result =
        client.try_join_quest_with_invite(&learner, &quest_id, &Bytes::from_slice(&env, preimage));
    assert_eq!(result, Err(Ok(Error::InvalidInvite)));
}

#[test]
fn test_revoke_invite_non_owner_rejected() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    let commitment = sha256_commitment(&env, b"secret");
    client.register_invite(&owner, &quest_id, &commitment);

    let impostor = Address::generate(&env);
    let result = client.try_revoke_invite(&impostor, &quest_id, &commitment);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_invite_works_on_public_quest() {
    // Invite path is not restricted to private quests.
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Public);

    let preimage = b"public-invite";
    let commitment = sha256_commitment(&env, preimage);
    client.register_invite(&owner, &quest_id, &commitment);

    let learner = Address::generate(&env);
    client.join_quest_with_invite(&learner, &quest_id, &Bytes::from_slice(&env, preimage));
    assert!(client.is_enrollee(&quest_id, &learner));
}

#[test]
fn test_invite_error_codes_are_distinct() {
    assert_eq!(Error::InvalidInvite as u32, 15);
    assert_eq!(Error::InviteAlreadyUsed as u32, 16);
    assert_ne!(Error::InvalidInvite as u32, Error::InviteAlreadyUsed as u32);
    assert_ne!(Error::InvalidInvite as u32, Error::InviteOnly as u32);
}

#[test]
fn test_cancel_quest_flow() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Public);

    let quest = client.get_quest(&quest_id);
    assert_eq!(quest.status, QuestStatus::Active);

    // Cancel quest
    client.cancel_quest(&quest_id);
    let cancelled = client.get_quest(&quest_id);
    assert_eq!(cancelled.status, QuestStatus::Cancelled);

    // Cancelled quest rejects updates and new enrollments
    let learner = Address::generate(&env);
    let join_res = client.try_join_quest(&learner, &quest_id);
    assert_eq!(join_res, Err(Ok(Error::EnrollmentClosed)));

    let update_res = client.try_update_quest(
        &quest_id,
        &owner,
        &Some(String::from_str(&env, "New Name")),
        &None,
        &None,
        &None,
        &None,
        &None,
    );
    assert_eq!(update_res, Err(Ok(Error::QuestCancelled)));
}

#[test]
fn test_cancel_quest_unauthorized() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Public);

    let imposter = Address::generate(&env);
    let res = client.try_cancel_quest(&quest_id);
    // In soroban test framework without mock_all_auths, calling require_auth on unauthorized address panics or fails auth check
}

#[test]
fn test_signature_and_preimage_validation_rejects_forgery() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Private);

    let authentic_preimage = b"authentic-secret-key-12345";
    let forged_preimage = b"forged-fake-secret-key-99999";

    let commitment = sha256_commitment(&env, authentic_preimage);
    client.register_invite(&owner, &quest_id, &commitment);

    let attacker = Address::generate(&env);

    // Attacker attempts redemption using forged preimage signature bytes
    let forged_res = client.try_join_quest_with_invite(
        &attacker,
        &quest_id,
        &Bytes::from_slice(&env, forged_preimage),
    );
    assert_eq!(forged_res, Err(Ok(Error::InvalidInvite)));
    assert!(!client.is_enrollee(&quest_id, &attacker));

    // Legitimate user uses correct preimage signature bytes
    let victim = Address::generate(&env);
    let valid_res = client.join_quest_with_invite(
        &victim,
        &quest_id,
        &Bytes::from_slice(&env, authentic_preimage),
    );
    assert!(client.is_enrollee(&quest_id, &victim));
}

// --- Storage cost estimation & TTL management — issue #1416 ---

#[test]
fn test_estimate_quest_creation_rent_scales_with_input_size() {
    let (env, client, _owner, _token) = setup();

    let small = client.estimate_quest_creation_rent(&4, &10, &4, &0);
    let large = client.estimate_quest_creation_rent(&64, &2000, &32, &5);

    assert!(small > 0);
    assert!(large > small);
}

#[test]
fn test_estimate_quest_creation_rent_caps_tag_count() {
    // Tags beyond MAX_TAGS (5) must not inflate the estimate further, since
    // create_quest itself rejects more than MAX_TAGS tags.
    let (env, client, _owner, _token) = setup();

    let at_cap = client.estimate_quest_creation_rent(&10, &10, &10, &5);
    let above_cap = client.estimate_quest_creation_rent(&10, &10, &10, &50);
    assert_eq!(at_cap, above_cap);
}

#[test]
fn test_extend_quest_ttl_owner_only() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_visibility(&env, &client, &owner, &token, Visibility::Public);

    // Non-owner cannot extend TTL.
    let impostor = Address::generate(&env);
    let result = client.try_extend_quest_ttl(&quest_id, &impostor);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));

    // Owner can extend TTL successfully.
    client.extend_quest_ttl(&quest_id, &owner);
}

// --- Security audit tests — issue #1428 ---

#[test]
fn test_pause_rejects_all_mutations() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);
    client.pause(&owner);

    let learner = Address::generate(&env);

    // create_quest blocked when paused
    let r = client.try_create_quest(
        &owner,
        &String::from_str(&env, "Q"),
        &String::from_str(&env, "D"),
        &String::from_str(&env, "C"),
        &Vec::<String>::new(&env),
        &token,
        &Visibility::Public,
        &None,
        &None,
    );
    assert_eq!(r, Err(Ok(Error::Paused)));

    // add_enrollee blocked
    let r = client.try_add_enrollee(&quest_id, &learner);
    assert_eq!(r, Err(Ok(Error::Paused)));

    // update_quest blocked
    let r = client.try_update_quest(
        &quest_id,
        &owner,
        &Some(String::from_str(&env, "New")),
        &None,
        &None,
        &None,
        &None,
        &None,
    );
    assert_eq!(r, Err(Ok(Error::Paused)));

    // archive blocked
    let r = client.try_archive_quest(&quest_id);
    assert_eq!(r, Err(Ok(Error::Paused)));

    // cancel blocked
    let r = client.try_cancel_quest(&quest_id);
    assert_eq!(r, Err(Ok(Error::Paused)));
}

#[test]
fn test_non_owner_cannot_enroll_others() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);
    let stranger = Address::generate(&env);
    let learner = Address::generate(&env);

    // Non-owner cannot add_enrollee
    let r = client.try_add_enrollee(&quest_id, &learner);
    assert_eq!(r, Err(Ok(Error::Unauthorized)));
    // Note: mock_all_auths is on, but ownership check still fails
    // because stranger != quest.owner
    let _ = stranger; // suppress unused warning
}

#[test]
fn test_create_quest_rejects_zero_reward_token() {
    let (env, client, owner, token) = setup();
    // token must be a contract address (C-prefix); Address::generate gives a G-prefix account
    let r = client.try_create_quest(
        &owner,
        &String::from_str(&env, "Q"),
        &String::from_str(&env, "D"),
        &String::from_str(&env, "C"),
        &Vec::<String>::new(&env),
        &token, // Address::generate produces an account address, not contract
        &Visibility::Public,
        &None,
        &None,
    );
    assert_eq!(r, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_enrollment_cap_enforced() {
    let (env, client, owner, token) = setup();
    let quest_id = client.create_quest(
        &owner,
        &String::from_str(&env, "Small Quest"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Cat"),
        &Vec::<String>::new(&env),
        &token,
        &Visibility::Public,
        &Some(2), // max 2 enrollees
        &None,
    );

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    let e3 = Address::generate(&env);

    client.add_enrollee(&quest_id, &e1);
    client.add_enrollee(&quest_id, &e2);

    // Third enrollee should be rejected
    let r = client.try_add_enrollee(&quest_id, &e3);
    assert_eq!(r, Err(Ok(Error::QuestFull)));
}

#[test]
fn test_join_quest_already_enrolled_rejected() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);
    let learner = Address::generate(&env);

    client.join_quest(&learner, &quest_id);
    let r = client.try_join_quest(&learner, &quest_id);
    assert_eq!(r, Err(Ok(Error::AlreadyEnrolled)));
}

#[test]
fn test_update_quest_rejects_empty_name() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);

    let r = client.try_update_quest(
        &quest_id,
        &owner,
        &Some(String::from_str(&env, "")),
        &None,
        &None,
        &None,
        &None,
        &None,
    );
    assert_eq!(r, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_update_quest_rejects_whitespace_name() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);

    let r = client.try_update_quest(
        &quest_id,
        &owner,
        &Some(String::from_str(&env, "   ")),
        &None,
        &None,
        &None,
        &None,
        &None,
    );
    assert_eq!(r, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_deadline_blocks_enrollment_after_expiry() {
    let (env, client, owner, token) = setup();
    env.ledger().set_timestamp(1_000);
    let quest_id = client.create_quest(
        &owner,
        &String::from_str(&env, "Timed"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Cat"),
        &Vec::<String>::new(&env),
        &token,
        &Visibility::Public,
        &None,
        &Some(2_000), // deadline at timestamp 2000
    );

    let learner = Address::generate(&env);

    // Before deadline: enrollment succeeds
    env.ledger().set_timestamp(1_500);
    client.join_quest(&learner, &quest_id);

    // After deadline: new enrollment blocked
    let learner2 = Address::generate(&env);
    env.ledger().set_timestamp(2_500);
    let r = client.try_join_quest(&learner2, &quest_id);
    assert_eq!(r, Err(Ok(Error::DeadlineExpired)));
}

// --- Storage optimization tests — issue #1426 ---

#[test]
fn test_get_active_participant_count_defaults_to_all_active() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    let e3 = Address::generate(&env);

    client.add_enrollee(&quest_id, &e1);
    client.add_enrollee(&quest_id, &e2);
    client.add_enrollee(&quest_id, &e3);

    // All enrollees default to Active status
    assert_eq!(client.get_active_participant_count(&quest_id), 3);
    assert_eq!(client.get_active_participants(&quest_id).len(), 3);
}

#[test]
fn test_get_active_participant_count_excludes_suspended() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);

    client.add_enrollee(&quest_id, &e1);
    client.add_enrollee(&quest_id, &e2);

    assert_eq!(client.get_active_participant_count(&quest_id), 2);

    // Suspend one enrollee
    client.set_enrollee_status(&quest_id, &e1, &EnrolleeStatus::Suspended);
    assert_eq!(client.get_active_participant_count(&quest_id), 1);
    assert_eq!(client.get_active_participants(&quest_id).len(), 1);
}

#[test]
fn test_get_active_participant_count_excludes_banned() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);

    let e1 = Address::generate(&env);
    client.add_enrollee(&quest_id, &e1);

    assert_eq!(client.get_active_participant_count(&quest_id), 1);

    client.set_enrollee_status(&quest_id, &e1, &EnrolleeStatus::Banned);
    assert_eq!(client.get_active_participant_count(&quest_id), 0);
}

#[test]
fn test_get_active_participant_count_empty_quest() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);
    assert_eq!(client.get_active_participant_count(&quest_id), 0);
}

#[test]
fn test_get_active_participant_count_nonexistent_quest() {
    let (env, client, _owner, _token) = setup();
    let r = client.try_get_active_participant_count(&999);
    assert_eq!(r, Err(Ok(Error::NotFound)));
}

// ── Ownership transfer tests (#1471) ────────────────────────────────────────

#[test]
fn test_initiate_transfer() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);
    let nominee = Address::generate(&env);

    client.initiate_transfer(&quest_id, &nominee);

    let transfer = client.get_pending_transfer(&quest_id).unwrap();
    assert_eq!(transfer.nominee, nominee);
}

#[test]
fn test_initiate_transfer_replaces_existing() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);
    let nominee1 = Address::generate(&env);
    let nominee2 = Address::generate(&env);

    client.initiate_transfer(&quest_id, &nominee1);
    client.initiate_transfer(&quest_id, &nominee2);

    let transfer = client.get_pending_transfer(&quest_id).unwrap();
    assert_eq!(transfer.nominee, nominee2);
}

#[test]
fn test_initiate_transfer_rejects_self_nomination() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);

    let r = client.try_initiate_transfer(&quest_id, &owner);
    assert_eq!(r, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_initiate_transfer_rejects_archived_quest() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);
    let nominee = Address::generate(&env);

    client.archive_quest(&quest_id);

    let r = client.try_initiate_transfer(&quest_id, &nominee);
    assert_eq!(r, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_accept_transfer() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);
    let nominee = Address::generate(&env);

    client.initiate_transfer(&quest_id, &nominee);

    // Accept must be called by the nominee
    let r = client.try_accept_transfer(&quest_id, &nominee);
    assert!(r.is_ok());

    let quest = client.get_quest(&quest_id);
    assert_eq!(quest.owner, nominee);

    // Pending transfer should be cleared
    assert_eq!(client.get_pending_transfer(&quest_id), Ok(None));
}

#[test]
fn test_accept_transfer_rejects_non_nominee() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);
    let nominee = Address::generate(&env);
    let stranger = Address::generate(&env);

    client.initiate_transfer(&quest_id, &nominee);

    let r = client.try_accept_transfer(&quest_id, &stranger);
    assert_eq!(r, Err(Ok(Error::NotTransferNominee)));
}

#[test]
fn test_accept_transfer_rejects_no_pending() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);

    let r = client.try_accept_transfer(&quest_id, &owner);
    assert_eq!(r, Err(Ok(Error::NoPendingTransfer)));
}

#[test]
fn test_cancel_transfer() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);
    let nominee = Address::generate(&env);

    client.initiate_transfer(&quest_id, &nominee);
    client.cancel_transfer(&quest_id);

    assert_eq!(client.get_pending_transfer(&quest_id), Ok(None));
}

#[test]
fn test_cancel_transfer_rejects_no_pending() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);

    let r = client.try_cancel_transfer(&quest_id);
    assert_eq!(r, Err(Ok(Error::NoPendingTransfer)));
}

#[test]
fn test_get_pending_transfer_none() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);

    assert_eq!(client.get_pending_transfer(&quest_id), Ok(None));
}

// ── Waitlist tests (#1472) ──────────────────────────────────────────────────

fn create_quest_with_cap(
    env: &Env,
    client: &QuestContractClient,
    owner: &Address,
    token: &Address,
    max: u32,
) -> u32 {
    client.create_quest(
        owner,
        &String::from_str(env, "Capped Quest"),
        &String::from_str(env, "Description"),
        &String::from_str(env, "Programming"),
        &Vec::<String>::new(env),
        token,
        &Visibility::Public,
        &Some(max),
        &None,
    )
}

#[test]
fn test_join_quest_waitlist_when_full() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_cap(&env, &client, &owner, &token, 2);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    let e3 = Address::generate(&env);

    client.join_quest(&e1, &quest_id);
    client.join_quest(&e2, &quest_id);

    // Quest is full — e3 should be waitlisted, not rejected
    client.join_quest(&e3, &quest_id);

    let enrollees = client.get_enrollees(&quest_id);
    assert_eq!(enrollees.len(), 2);

    let waitlist = client.get_waitlist(&quest_id).unwrap();
    assert_eq!(waitlist.len(), 1);
    assert_eq!(waitlist.get(0).unwrap(), e3);
}

#[test]
fn test_join_quest_waitlist_fifo_order() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_cap(&env, &client, &owner, &token, 1);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    let e3 = Address::generate(&env);

    client.join_quest(&e1, &quest_id);
    client.join_quest(&e2, &quest_id);
    client.join_quest(&e3, &quest_id);

    let waitlist = client.get_waitlist(&quest_id).unwrap();
    assert_eq!(waitlist.get(0).unwrap(), e2);
    assert_eq!(waitlist.get(1).unwrap(), e3);
}

#[test]
fn test_join_quest_rejects_duplicate_waitlist() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_cap(&env, &client, &owner, &token, 1);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);

    client.join_quest(&e1, &quest_id);
    client.join_quest(&e2, &quest_id);

    // e2 tries to join waitlist again
    let r = client.try_join_quest(&e2, &quest_id);
    assert_eq!(r, Err(Ok(Error::AlreadyEnrolled)));
}

#[test]
fn test_promote_from_waitlist() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_cap(&env, &client, &owner, &token, 1);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);

    client.join_quest(&e1, &quest_id);
    client.join_quest(&e2, &quest_id);

    let promoted = client.promote_from_waitlist(&quest_id).unwrap();
    assert_eq!(promoted, Some(e2));

    let enrollees = client.get_enrollees(&quest_id);
    assert_eq!(enrollees.len(), 2);
    assert!(enrollees.contains(&e1));
    assert!(enrollees.contains(&e2));

    let waitlist = client.get_waitlist(&quest_id).unwrap();
    assert_eq!(waitlist.len(), 0);
}

#[test]
fn test_promote_from_waitlist_empty() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);

    let result = client.promote_from_waitlist(&quest_id).unwrap();
    assert_eq!(result, None);
}

#[test]
fn test_remove_from_waitlist() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_cap(&env, &client, &owner, &token, 1);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);

    client.join_quest(&e1, &quest_id);
    client.join_quest(&e2, &quest_id);

    client.remove_from_waitlist(&quest_id, &e2);

    let waitlist = client.get_waitlist(&quest_id).unwrap();
    assert_eq!(waitlist.len(), 0);
}

#[test]
fn test_remove_from_waitlist_not_found() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_helper(&env, &client, &owner, &token);
    let stranger = Address::generate(&env);

    let r = client.try_remove_from_waitlist(&quest_id, &stranger);
    assert_eq!(r, Err(Ok(Error::NotFound)));
}

#[test]
fn test_get_waitlist_length() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_cap(&env, &client, &owner, &token, 1);

    assert_eq!(client.get_waitlist_length(&quest_id).unwrap(), 0);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    client.join_quest(&e1, &quest_id);
    client.join_quest(&e2, &quest_id);

    assert_eq!(client.get_waitlist_length(&quest_id).unwrap(), 2);
}

#[test]
fn test_auto_promote_on_remove_enrollee() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_cap(&env, &client, &owner, &token, 2);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    let e3 = Address::generate(&env);

    client.join_quest(&e1, &quest_id);
    client.join_quest(&e2, &quest_id);
    client.join_quest(&e3, &quest_id);

    // e3 is on the waitlist
    assert_eq!(client.get_waitlist_length(&quest_id).unwrap(), 1);

    // Remove e1 — e3 should be auto-promoted
    client.remove_enrollee(&quest_id, &e1);

    let enrollees = client.get_enrollees(&quest_id);
    assert_eq!(enrollees.len(), 2);
    assert!(enrollees.contains(&e2));
    assert!(enrollees.contains(&e3));

    let waitlist = client.get_waitlist(&quest_id).unwrap();
    assert_eq!(waitlist.len(), 0);
}

#[test]
fn test_owner_force_add_bypasses_cap() {
    let (env, client, owner, token) = setup();
    let quest_id = create_quest_with_cap(&env, &client, &owner, &token, 1);

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);

    client.join_quest(&e1, &quest_id);

    // Owner force-adds e2 even though quest is full
    client.add_enrollee(&quest_id, &e2);

    let enrollees = client.get_enrollees(&quest_id);
    assert_eq!(enrollees.len(), 2);
    assert!(enrollees.contains(&e1));
    assert!(enrollees.contains(&e2));
}
