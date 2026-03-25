#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, MuxedAddress as _},
    Address, Env, MuxedAddress, String,
};

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
fn test_create_quest_non_contract_token_fails() {
    let (env, client, owner, _token) = setup();
    let account_addr = MuxedAddress::generate(&env).address();
    let result = client.try_create_quest(
        &owner,
        &String::from_str(&env, "Quest"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Programming"),
        &Vec::<String>::new(&env),
        &account_addr,
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

    // Public quests
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

    // Private quest in same category should not appear
    create_quest_with_category_and_tags(
        &env,
        &client,
        &owner,
        &token,
        "Blockchain",
        Vec::new(&env),
        Visibility::Private,
    );

    // Public quest in different category should not appear
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

    // Verify all are public
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

    // Verify workspaces were created
    let ws1 = client.get_quest(&id1);
    assert_eq!(ws1.visibility, Visibility::Public);
    let ws2 = client.get_quest(&id2);
    assert_eq!(ws2.visibility, Visibility::Private);

    let initial_public = client.list_public_quests(&0, &10);
    assert_eq!(initial_public.len(), 1);

    // Change the private quest to public
    client.set_visibility(&id2, &Visibility::Public);

    let updated_public = client.list_public_quests(&0, &10);
    assert_eq!(updated_public.len(), 2);

    // Change a public quest to private
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

    // But the quest should still be retrievable by ID if you know it
    let ws = client.get_quest(&0);
    assert_eq!(ws.visibility, Visibility::Private);
}
