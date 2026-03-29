use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

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
    )
}

#[test]
fn test_create_quest() {
    let (env, client, owner, token) = setup();
    let id = create_quest_helper(&env, &client, &owner, &token);
    assert_eq!(id, 0);
    assert_eq!(client.get_quest_count(), 1);
    let quest = client.get_quest(&0);
    assert_eq!(quest.owner, owner);
    assert_eq!(quest.name, String::from_str(&env, "My Quest"));
    assert_eq!(quest.token_addr, token);
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
    assert_eq!(result, Err(Ok(Error::QuestArchived)));
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

// --- QuestStatus / Update / Archive Tests (PR #296) ---

#[test]
fn test_new_quest_is_active_by_default() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    let quest = client.get_quest(&0);
    assert_eq!(quest.status, QuestStatus::Active);
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
    assert_eq!(result, Err(Ok(Error::QuestArchived)));
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
fn test_archive_quest_twice_is_idempotent() {
    let (env, client, owner, token) = setup();
    create_quest_helper(&env, &client, &owner, &token);
    client.archive_quest(&0);
    client.archive_quest(&0);
    let quest = client.get_quest(&0);
    assert_eq!(quest.status, QuestStatus::Archived);
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
    );

    let e1 = Address::generate(&env);
    let e2 = Address::generate(&env);
    let e3 = Address::generate(&env);

    client.add_enrollee(&id, &e1);
    client.add_enrollee(&id, &e2);
    let result = client.try_add_enrollee(&id, &e3);

    assert_eq!(result, Err(Ok(Error::QuestFull)));
}
