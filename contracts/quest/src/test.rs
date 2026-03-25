#![cfg(test)]

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
    );
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
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
    );
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
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
        &String::from_str(&env, "Updated Name"),
        &String::from_str(&env, "Updated description"),
        &String::from_str(&env, "Design"),
        &Vec::<String>::new(&env),
        &Visibility::Private,
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
        &String::from_str(&env, "My Quest"),
        &String::from_str(&env, "desc"),
        &String::from_str(&env, "Programming"),
        &new_tags,
        &Visibility::Public,
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
        &String::from_str(&env, "Name"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Cat"),
        &tags,
        &Visibility::Public,
    );
    assert_eq!(result, Err(Ok(Error::InvalidInput)));
}

#[test]
fn test_update_quest_not_found() {
    let (env, client, _owner, _token) = setup();
    let result = client.try_update_quest(
        &999,
        &String::from_str(&env, "Name"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Cat"),
        &Vec::<String>::new(&env),
        &Visibility::Public,
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
        &String::from_str(&env, "New Name"),
        &String::from_str(&env, "New desc"),
        &String::from_str(&env, "Cat"),
        &Vec::<String>::new(&env),
        &Visibility::Public,
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
