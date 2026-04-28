//! Panic-resilience tests: a contract panic must not corrupt sibling contract state.
//!
//! Soroban rolls back all storage mutations when a contract invocation returns
//! an error or panics. These tests verify that a failing call to contract B
//! leaves contract A's pre-call state intact across the full 4-contract stack.

use certificate::CertificateContract;
use common::Visibility;
use milestone::{MilestoneContract, MilestoneContractClient};
use quest::{QuestContract, QuestContractClient};
use rewards::{RewardsContract, RewardsContractClient};
use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Address, Env, String, Vec,
};

// ── Shared setup ─────────────────────────────────────────────────────────────

struct Ctx {
    env: Env,
    token_addr: Address,
    quest_id: Address,
    milestone_id: Address,
    rewards_id: Address,
}

impl Ctx {
    fn setup() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        let token_admin = Address::generate(&env);
        let token_contract = env.register_stellar_asset_contract_v2(token_admin);
        let token_addr = token_contract.address();

        let quest_id = env.register(QuestContract, ());
        let milestone_id = env.register(MilestoneContract, ());
        let cert_id = env.register(CertificateContract, (milestone_id.clone(),));
        let rewards_id = env.register(RewardsContract, ());

        let admin = Address::generate(&env);
        MilestoneContractClient::new(&env, &milestone_id).initialize(&admin, &quest_id, &cert_id);
        RewardsContractClient::new(&env, &rewards_id).initialize(
            &token_addr,
            &quest_id,
            &milestone_id,
        );

        Self {
            env,
            token_addr,
            quest_id,
            milestone_id,
            rewards_id,
        }
    }

    fn quest(&self) -> QuestContractClient<'_> {
        QuestContractClient::new(&self.env, &self.quest_id)
    }

    fn milestone(&self) -> MilestoneContractClient<'_> {
        MilestoneContractClient::new(&self.env, &self.milestone_id)
    }

    fn rewards(&self) -> RewardsContractClient<'_> {
        RewardsContractClient::new(&self.env, &self.rewards_id)
    }

    fn mint(&self, to: &Address, amount: i128) {
        StellarAssetClient::new(&self.env, &self.token_addr).mint(to, &amount);
    }

    fn balance(&self, of: &Address) -> i128 {
        TokenClient::new(&self.env, &self.token_addr).balance(of)
    }

    fn create_quest(&self, owner: &Address) -> u32 {
        self.quest().create_quest(
            owner,
            &String::from_str(&self.env, "Quest"),
            &String::from_str(&self.env, "Description"),
            &String::from_str(&self.env, "Programming"),
            &Vec::<String>::new(&self.env),
            &self.token_addr,
            &Visibility::Public,
            &None,
        )
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

/// Quest state (A) is unchanged when a milestone call (B) fails.
///
/// Flow: create quest → fund pool → attempt verify_completion for a
/// non-enrolled address (B panics) → assert quest enrollee list and pool
/// balance are unchanged.
#[test]
fn quest_state_intact_after_milestone_panic() {
    let ctx = Ctx::setup();
    let owner = Address::generate(&ctx.env);
    let enrollee = Address::generate(&ctx.env);
    let stranger = Address::generate(&ctx.env);

    ctx.mint(&owner, 5_000);

    let q_id = ctx.create_quest(&owner);
    ctx.quest().add_enrollee(&q_id, &enrollee);
    ctx.rewards().fund_quest(&owner, &q_id, &5_000);

    let ms_id = ctx.milestone().create_milestone(
        &owner,
        &q_id,
        &String::from_str(&ctx.env, "MS"),
        &String::from_str(&ctx.env, "Desc"),
        &500,
        &false,
    );

    // Snapshot A state before the failing call
    let enrollees_before = ctx.quest().get_enrollees(&q_id);
    let pool_before = ctx.rewards().get_pool_balance(&q_id);

    // B: verify_completion for a stranger (not enrolled) — must fail
    let result = ctx
        .milestone()
        .try_verify_completion(&owner, &q_id, &ms_id, &stranger);
    assert!(result.is_err(), "expected error for non-enrolled stranger");

    // A state must be identical to the snapshot
    assert_eq!(ctx.quest().get_enrollees(&q_id), enrollees_before);
    assert_eq!(ctx.rewards().get_pool_balance(&q_id), pool_before);
    assert!(!ctx.milestone().is_completed(&q_id, &ms_id, &stranger));
}

/// Rewards pool (A) is unchanged when distribute_reward (C) fails because
/// the milestone (B) was never completed.
///
/// Flow: create quest → fund pool → create milestone → attempt distribute
/// without verify_completion → assert pool balance unchanged.
#[test]
fn rewards_pool_intact_after_distribute_without_completion() {
    let ctx = Ctx::setup();
    let owner = Address::generate(&ctx.env);
    let enrollee = Address::generate(&ctx.env);

    ctx.mint(&owner, 5_000);

    let q_id = ctx.create_quest(&owner);
    ctx.quest().add_enrollee(&q_id, &enrollee);
    ctx.rewards().fund_quest(&owner, &q_id, &5_000);

    let ms_id = ctx.milestone().create_milestone(
        &owner,
        &q_id,
        &String::from_str(&ctx.env, "MS"),
        &String::from_str(&ctx.env, "Desc"),
        &500,
        &false,
    );

    let pool_before = ctx.rewards().get_pool_balance(&q_id);
    let earnings_before = ctx.rewards().get_user_earnings(&enrollee);
    let enrollee_balance_before = ctx.balance(&enrollee);

    // C: distribute without prior verify_completion — must fail
    let result = ctx
        .rewards()
        .try_distribute_reward(&owner, &q_id, &ms_id, &enrollee, &500);
    assert!(result.is_err(), "expected error: milestone not completed");

    // A (rewards pool) must be unchanged
    assert_eq!(ctx.rewards().get_pool_balance(&q_id), pool_before);
    assert_eq!(ctx.rewards().get_user_earnings(&enrollee), earnings_before);
    assert_eq!(ctx.balance(&enrollee), enrollee_balance_before);
}

/// Quest enrollment list (A) is unchanged when a rewards fund_quest call (C)
/// fails due to insufficient token balance.
///
/// This exercises the A → C path (skipping B) to confirm cross-contract
/// rollback isolation is not limited to adjacent contracts.
#[test]
fn quest_enrollment_intact_after_failed_fund() {
    let ctx = Ctx::setup();
    let owner = Address::generate(&ctx.env);
    let enrollee = Address::generate(&ctx.env);

    // owner has no tokens — fund_quest will fail
    let q_id = ctx.create_quest(&owner);
    ctx.quest().add_enrollee(&q_id, &enrollee);

    let enrollees_before = ctx.quest().get_enrollees(&q_id);

    // C: fund_quest with no token balance — must fail
    let result = ctx.rewards().try_fund_quest(&owner, &q_id, &1_000);
    assert!(result.is_err(), "expected error: no token balance");

    // A state unchanged
    assert_eq!(ctx.quest().get_enrollees(&q_id), enrollees_before);
    assert_eq!(ctx.rewards().get_pool_balance(&q_id), 0);
}
