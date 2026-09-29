#![allow(dead_code)]
//! Reusable fixtures and builders for realistic multi-user scenarios.
//! Provides deterministic isolation, avoids hiding critical authorization assumptions,
//! and supports multi-actor, multi-quest compositions.
//!
//! Recommended usage:
//! ```rust
//! use testutils::fixtures::*;
//! let f = Fixture::new();
//! let (env, quest_client, owner, learner) = f.funded_quest_with_milestone(1_000_000);
//! ```

use crate::{create_milestone, create_quest};
use common::Visibility;
use milestone::MilestoneContractClient;
use quest::QuestContractClient;
use rewards::RewardsContractClient;
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

pub struct Accounts {
    pub owner: Address,
    pub learner: Address,
    pub reviewer: Address,
    pub funder: Address,
}

impl Accounts {
    pub fn generate(env: &Env) -> Self {
        Self {
            owner: Address::generate(env),
            learner: Address::generate(env),
            reviewer: Address::generate(env),
            funder: Address::generate(env),
        }
    }
}

pub struct QuestBuilder<'a> {
    env: &'a Env,
    name: &'a str,
    description: &'a str,
    category: &'a str,
    visibility: Visibility,
}

impl<'a> QuestBuilder<'a> {
    pub fn new(env: &'a Env) -> Self {
        Self {
            env,
            name: "Quest",
            description: "Description",
            category: "Programming",
            visibility: Visibility::Public,
        }
    }
    pub fn name(mut self, n: &'a str) -> Self {
        self.name = n;
        self
    }
    pub fn category(mut self, c: &'a str) -> Self {
        self.category = c;
        self
    }
    pub fn visibility(mut self, v: Visibility) -> Self {
        self.visibility = v;
        self
    }
    pub fn create(self, client: &QuestContractClient, owner: &Address, token: &Address) -> u32 {
        client.create_quest(
            owner,
            &String::from_str(self.env, self.name),
            &String::from_str(self.env, self.description),
            &String::from_str(self.env, self.category),
            &Vec::<String>::new(self.env),
            token,
            &self.visibility,
            &None,
            &None,
        )
    }
}

pub struct Fixture {
    pub env: Env,
}

impl Default for Fixture {
    fn default() -> Self {
        Self::new()
    }
}

impl Fixture {
    pub fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();
        Self { env }
    }

    pub fn accounts(&self) -> Accounts {
        Accounts::generate(&self.env)
    }

    pub fn funded_quest(&self) -> (Env, QuestContractClient<'static>, Address, Address, u32) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(quest::QuestContract, ());
        let client = QuestContractClient::new(&env, &contract_id);
        let owner = Address::generate(&env);
        let token = Address::generate(&env);
        let quest_id = QuestBuilder::new(&env).create(&client, &owner, &token);
        (env, client, owner, token, quest_id)
    }

    pub fn quest_with_milestone(
        &self,
    ) -> (
        Env,
        QuestContractClient<'static>,
        MilestoneContractClient<'static>,
        Address,
        u32,
        u32,
    ) {
        let (env, milestone_client, quest_client, admin) = crate::setup_milestone();
        let quest_id = create_quest(&env, &quest_client, &admin);
        let milestone_id = create_milestone(
            &env,
            &milestone_client,
            &admin,
            quest_id,
            "Milestone 1",
            100,
        );
        (
            env,
            quest_client,
            milestone_client,
            admin,
            quest_id,
            milestone_id,
        )
    }

    pub fn funded_quest_with_milestone(
        &self,
        _fund_amount: i128,
    ) -> (Env, RewardsContractClient<'static>, Address, u32) {
        let (
            env,
            rewards_client,
            _rewards_addr,
            _token_addr,
            quest_client,
            _quest_id,
            milestone_client,
            _milestone_id,
            _cert_client,
            _cert_id,
        ) = crate::setup_rewards();
        let owner = Address::generate(&env);
        let token = Address::generate(&env);
        let quest_id = QuestBuilder::new(&env).create(&quest_client, &owner, &token);
        let _milestone_id =
            create_milestone(&env, &milestone_client, &owner, quest_id, "Milestone", 100);
        (env, rewards_client, owner, quest_id)
    }
}

pub fn isolated_env() -> Env {
    let env = Env::default();
    env.mock_all_auths();
    env
}
