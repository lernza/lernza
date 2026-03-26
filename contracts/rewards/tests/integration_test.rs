//! Cross-contract integration tests for the Lernza reward system.
//!
//! These tests exercise the complete 4-contract stack (quest → milestone →
//! rewards → certificate) inside a single Soroban `Env`. Every test deploys
//! all four contracts, wires their addresses through the public `initialize`
//! functions, and drives the scenarios exclusively through the generated client
//! APIs — no internal contract state is accessed directly.
//!
//! # Test inventory
//!
//! | # | Name | Coverage |
//! |---|------|----------|
//! | 1 | `test_happy_path_full_lifecycle` | Create → Enroll → Fund → Complete → Claim |
//! | 2 | `test_completing_all_milestones_mints_certificate` | Certificate auto-mint via milestone→certificate cross-call |
//! | 3 | `test_multiple_enrollees_share_single_milestone` | Concurrency — independent rewards per enrollee |
//! | 4 | `test_insufficient_pool_rejects_distribution` | Escrow boundary — pool exhaustion |
//! | 5 | `test_unenrolled_address_cannot_complete_milestone` | Registry boundary — enrollment gate |
//! | 6a | `test_non_authority_distribute_unauthorized` | Logical auth check — imposter rejected |
//! | 6b | `test_fund_quest_require_auth_truly_enforced` | Host-level `require_auth()` enforcement (no mock) |
//! | 7 | `test_distribute_blocked_without_milestone_completion` | rewards→milestone cross-call gate |
//! | 8 | `test_distribute_reward_idempotent` | Double-payout prevention |
//! | 9 | `test_broken_quest_linkage_propagates_error` | Cross-contract error propagation |

use certificate::{CertificateContract, CertificateContractClient};
use common::Visibility;
use milestone::{Error as MilestoneError, MilestoneContract, MilestoneContractClient};
use quest::{QuestContract, QuestContractClient};
use rewards::{Error as RewardsError, RewardsContract, RewardsContractClient};
use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Address, Env, String, Vec,
};

// ─── Shared test context ─────────────────────────────────────────────────────

/// Holds the contract addresses for a single fully-wired test environment.
///
/// Clients are constructed on demand via the accessor methods below, which
/// avoids embedding lifetime-annotated client structs directly in the context.
struct QuestSystemTest {
    env: Env,
    token_addr: Address,
    quest_id: Address,
    milestone_id: Address,
    rewards_id: Address,
    certificate_id: Address,
}

impl QuestSystemTest {
    /// Deploy and wire all four contracts in a fresh `Env` with
    /// `mock_all_auths()` enabled. This mirrors the setup pattern used by the
    /// existing unit tests in `rewards/src/test.rs`.
    fn setup() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        // Stellar Asset Contract — used as the reward token
        let token_admin = Address::generate(&env);
        let token_contract = env.register_stellar_asset_contract_v2(token_admin);
        let token_addr = token_contract.address();

        // Register contracts.  Certificate must be registered after milestone
        // because its constructor takes the milestone contract address as the
        // owner (so cross-contract certificate minting passes auth checks).
        let quest_id = env.register(QuestContract, ());
        let milestone_id = env.register(MilestoneContract, ());
        let certificate_id = env.register(CertificateContract, (milestone_id.clone(),));
        let rewards_id = env.register(RewardsContract, ());

        let admin = Address::generate(&env);
        MilestoneContractClient::new(&env, &milestone_id).initialize(
            &admin,
            &quest_id,
            &certificate_id,
        );
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
            certificate_id,
        }
    }

    // ── Client accessors ────────────────────────────────────────────────────

    fn quest(&self) -> QuestContractClient<'_> {
        QuestContractClient::new(&self.env, &self.quest_id)
    }

    fn milestone(&self) -> MilestoneContractClient<'_> {
        MilestoneContractClient::new(&self.env, &self.milestone_id)
    }

    fn rewards(&self) -> RewardsContractClient<'_> {
        RewardsContractClient::new(&self.env, &self.rewards_id)
    }

    fn certificate(&self) -> CertificateContractClient<'_> {
        CertificateContractClient::new(&self.env, &self.certificate_id)
    }

    // ── Token helpers ────────────────────────────────────────────────────────

    fn mint_tokens(&self, to: &Address, amount: &i128) {
        StellarAssetClient::new(&self.env, &self.token_addr).mint(to, amount);
    }

    fn token_balance(&self, of: &Address) -> i128 {
        TokenClient::new(&self.env, &self.token_addr).balance(of)
    }

    // ── Contract call helpers ────────────────────────────────────────────────

    fn create_quest(&self, owner: &Address) -> u32 {
        self.quest().create_quest(
            owner,
            &String::from_str(&self.env, "Cross-Contract Quest"),
            &String::from_str(&self.env, "Integration test quest"),
            &String::from_str(&self.env, "Programming"),
            &Vec::<String>::new(&self.env),
            &self.token_addr,
            &Visibility::Public,
            &None,
        )
    }

    fn create_milestone(&self, owner: &Address, quest_id: u32, title: &str, reward: i128) -> u32 {
        self.milestone().create_milestone(
            owner,
            &quest_id,
            &String::from_str(&self.env, title),
            &String::from_str(&self.env, "Description"),
            &reward,
            &false,
        )
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

/// 1. Happy Path — Create → Enroll → Fund → Complete → Claim
///
/// Validates the end-to-end flow across quest, milestone, and rewards contracts:
/// tokens flow from the quest pool to the enrollee only after a verified
/// milestone completion, and every counter is updated consistently.
#[test]
fn test_happy_path_full_lifecycle() {
    let ctx = QuestSystemTest::setup();
    let owner = Address::generate(&ctx.env);
    let enrollee = Address::generate(&ctx.env);

    ctx.mint_tokens(&owner, &10_000);

    let q_id = ctx.create_quest(&owner);
    ctx.quest().add_enrollee(&q_id, &enrollee);
    ctx.rewards().fund_quest(&owner, &q_id, &5_000);

    let ms_id = ctx.create_milestone(&owner, q_id, "First Milestone", 500);
    ctx.milestone()
        .verify_completion(&owner, &q_id, &ms_id, &enrollee);
    ctx.rewards()
        .distribute_reward(&owner, &q_id, &ms_id, &enrollee, &500);

    assert_eq!(ctx.token_balance(&enrollee), 500);
    assert_eq!(ctx.rewards().get_pool_balance(&q_id), 4_500);
    assert_eq!(ctx.rewards().get_user_earnings(&enrollee), 500);
    assert_eq!(ctx.rewards().get_total_distributed(), 500);
}

/// 2. Certificate auto-mint — completing all milestones triggers the
///    milestone→certificate cross-contract call.
///
/// The certificate must NOT exist after the first of two milestones, and MUST
/// exist after the second.  Progress tracking in the milestone contract is also
/// verified.
#[test]
fn test_completing_all_milestones_mints_certificate() {
    let ctx = QuestSystemTest::setup();
    let owner = Address::generate(&ctx.env);
    let enrollee = Address::generate(&ctx.env);

    ctx.mint_tokens(&owner, &10_000);

    let q_id = ctx.create_quest(&owner);
    ctx.quest().add_enrollee(&q_id, &enrollee);
    ctx.rewards().fund_quest(&owner, &q_id, &5_000);

    let ms1_id = ctx.create_milestone(&owner, q_id, "Milestone 1", 200);
    let ms2_id = ctx.create_milestone(&owner, q_id, "Milestone 2", 300);

    // First milestone complete — no certificate yet (1 of 2 done)
    ctx.milestone()
        .verify_completion(&owner, &q_id, &ms1_id, &enrollee);
    ctx.rewards()
        .distribute_reward(&owner, &q_id, &ms1_id, &enrollee, &200);
    assert!(!ctx.certificate().has_quest_certificate(&q_id, &enrollee));

    // Second (final) milestone complete — certificate is auto-minted by the
    // milestone contract via its cross-contract call into the certificate contract
    ctx.milestone()
        .verify_completion(&owner, &q_id, &ms2_id, &enrollee);
    ctx.rewards()
        .distribute_reward(&owner, &q_id, &ms2_id, &enrollee, &300);
    assert!(ctx.certificate().has_quest_certificate(&q_id, &enrollee));

    let progress = ctx.milestone().get_enrollee_progress(&q_id, &enrollee);
    assert_eq!(progress.completions, 2);
    assert_eq!(progress.total_milestones, 2);

    assert_eq!(ctx.token_balance(&enrollee), 500);
    assert_eq!(ctx.rewards().get_total_distributed(), 500);
}

/// 3. Concurrency — multiple enrollees complete the same milestone independently.
///
/// Each enrollee's payout is tracked separately (distinct PayoutRecord keys).
/// The shared pool decreases by the correct aggregate amount, and individual
/// earnings are isolated.
#[test]
fn test_multiple_enrollees_share_single_milestone() {
    let ctx = QuestSystemTest::setup();
    let owner = Address::generate(&ctx.env);
    let e1 = Address::generate(&ctx.env);
    let e2 = Address::generate(&ctx.env);
    let e3 = Address::generate(&ctx.env);

    ctx.mint_tokens(&owner, &10_000);

    let q_id = ctx.create_quest(&owner);
    ctx.quest().add_enrollee(&q_id, &e1);
    ctx.quest().add_enrollee(&q_id, &e2);
    ctx.quest().add_enrollee(&q_id, &e3);
    ctx.rewards().fund_quest(&owner, &q_id, &9_000);

    let ms_id = ctx.create_milestone(&owner, q_id, "Shared Milestone", 1_000);

    // All three verify and claim independently — order matches real-world concurrency
    ctx.milestone()
        .verify_completion(&owner, &q_id, &ms_id, &e1);
    ctx.milestone()
        .verify_completion(&owner, &q_id, &ms_id, &e2);
    ctx.milestone()
        .verify_completion(&owner, &q_id, &ms_id, &e3);

    ctx.rewards()
        .distribute_reward(&owner, &q_id, &ms_id, &e1, &1_000);
    ctx.rewards()
        .distribute_reward(&owner, &q_id, &ms_id, &e2, &1_000);
    ctx.rewards()
        .distribute_reward(&owner, &q_id, &ms_id, &e3, &1_000);

    assert_eq!(ctx.token_balance(&e1), 1_000);
    assert_eq!(ctx.token_balance(&e2), 1_000);
    assert_eq!(ctx.token_balance(&e3), 1_000);
    assert_eq!(ctx.rewards().get_pool_balance(&q_id), 6_000);
    assert_eq!(ctx.rewards().get_total_distributed(), 3_000);
    // Earnings are tracked per-enrollee — no cross-contamination
    assert_eq!(ctx.rewards().get_user_earnings(&e1), 1_000);
    assert_eq!(ctx.rewards().get_user_earnings(&e2), 1_000);
    assert_eq!(ctx.rewards().get_user_earnings(&e3), 1_000);
}

/// 4. Boundary error (Escrow) — pool exhaustion.
///
/// When the requested reward amount exceeds the quest's pool balance, rewards
/// returns `InsufficientPool`.  No tokens are transferred and the pool is
/// unchanged.
#[test]
fn test_insufficient_pool_rejects_distribution() {
    let ctx = QuestSystemTest::setup();
    let owner = Address::generate(&ctx.env);
    let enrollee = Address::generate(&ctx.env);

    ctx.mint_tokens(&owner, &1_000);

    let q_id = ctx.create_quest(&owner);
    ctx.quest().add_enrollee(&q_id, &enrollee);
    ctx.rewards().fund_quest(&owner, &q_id, &100); // pool = 100

    let ms_id = ctx.create_milestone(&owner, q_id, "Expensive Milestone", 500);
    ctx.milestone()
        .verify_completion(&owner, &q_id, &ms_id, &enrollee);

    // Requested 500 > pool 100
    let result = ctx
        .rewards()
        .try_distribute_reward(&owner, &q_id, &ms_id, &enrollee, &500);
    assert_eq!(result, Err(Ok(RewardsError::InsufficientPool)));

    assert_eq!(ctx.token_balance(&enrollee), 0);
    assert_eq!(ctx.rewards().get_pool_balance(&q_id), 100);
}

/// 5. Boundary error (Registry) — enrollment gate.
///
/// An address that was never enrolled cannot have its milestone verified:
/// the milestone contract returns `NotEnrolled`.  This error also propagates
/// through rewards, which sees `is_completed() == false` and returns
/// `MilestoneNotCompleted`.
#[test]
fn test_unenrolled_address_cannot_complete_milestone() {
    let ctx = QuestSystemTest::setup();
    let owner = Address::generate(&ctx.env);
    let stranger = Address::generate(&ctx.env); // never enrolled

    let q_id = ctx.create_quest(&owner);
    let ms_id = ctx.create_milestone(&owner, q_id, "Gated Milestone", 100);

    // Milestone contract rejects — stranger is not in the quest's enrollee list
    let result = ctx
        .milestone()
        .try_verify_completion(&owner, &q_id, &ms_id, &stranger);
    assert_eq!(result, Err(Ok(MilestoneError::NotEnrolled)));

    // Rewards also rejects — milestone.is_completed() returns false for stranger
    ctx.mint_tokens(&owner, &5_000);
    ctx.rewards().fund_quest(&owner, &q_id, &5_000);
    let result = ctx
        .rewards()
        .try_distribute_reward(&owner, &q_id, &ms_id, &stranger, &100);
    assert_eq!(result, Err(Ok(RewardsError::MilestoneNotCompleted)));
}

/// 6a. Boundary error — unauthorized distributor (logical check).
///
/// An imposter whose `require_auth()` passes via `mock_all_auths()` is still
/// rejected because the stored `QuestAuthority` does not match their address.
/// This tests the contract's business-logic auth layer independently of the
/// host-level `require_auth()` check exercised in test 6b.
#[test]
fn test_non_authority_distribute_unauthorized() {
    let ctx = QuestSystemTest::setup();
    let owner = Address::generate(&ctx.env);
    let imposter = Address::generate(&ctx.env);
    let enrollee = Address::generate(&ctx.env);

    ctx.mint_tokens(&owner, &5_000);

    let q_id = ctx.create_quest(&owner);
    ctx.quest().add_enrollee(&q_id, &enrollee);
    ctx.rewards().fund_quest(&owner, &q_id, &5_000);

    let ms_id = ctx.create_milestone(&owner, q_id, "Milestone", 100);
    ctx.milestone()
        .verify_completion(&owner, &q_id, &ms_id, &enrollee);

    // mock_all_auths() grants imposter's require_auth(), but the stored
    // QuestAuthority is owner, not imposter → Error::Unauthorized from
    // the ownership check on line 230 of rewards/src/lib.rs
    let result = ctx
        .rewards()
        .try_distribute_reward(&imposter, &q_id, &ms_id, &enrollee, &100);
    assert_eq!(result, Err(Ok(RewardsError::Unauthorized)));

    // Pool and enrollee balance are unchanged
    assert_eq!(ctx.token_balance(&enrollee), 0);
    assert_eq!(ctx.rewards().get_pool_balance(&q_id), 5_000);
}

/// 6b. `require_auth()` host-level enforcement.
///
/// This test deliberately does NOT call `env.mock_all_auths()`. Calling
/// `fund_quest` without providing an authorization entry causes the Soroban host
/// to panic before any business logic executes — proving that `require_auth()`
/// is a real gate, not a check that is always silently bypassed by mocking.
///
/// Compare with test 6a: that test proves the *business-logic* ownership check
/// works even when the auth token is granted. This test proves the *host-level*
/// signature check works when no auth token is granted at all.
#[test]
#[should_panic]
fn test_fund_quest_require_auth_truly_enforced() {
    let env = Env::default();
    // Intentionally NO env.mock_all_auths() — the auth stack is real

    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin);
    let token_addr = token_contract.address();

    // Minimal deploy: only the contracts that rewards.initialize needs
    let quest_contract_id = env.register(QuestContract, ());
    let milestone_contract_id = env.register(MilestoneContract, ());
    let rewards_id = env.register(RewardsContract, ());
    let rewards = RewardsContractClient::new(&env, &rewards_id);

    // rewards.initialize has no require_auth — works without mocking
    rewards.initialize(&token_addr, &quest_contract_id, &milestone_contract_id);

    // attacker.require_auth() is the very first statement in fund_quest.
    // With no auth entry set up, the Soroban host panics here — before the
    // quest ownership check, before the pool update, before any token transfer.
    let attacker = Address::generate(&env);
    rewards.fund_quest(&attacker, &0, &1_000);
}

/// 7. Boundary error — reward distribution gated by milestone completion.
///
/// The rewards contract calls `milestone.is_completed()` before transferring
/// tokens. Skipping `verify_completion` means the cross-contract check returns
/// false, and rewards propagates `MilestoneNotCompleted`.
#[test]
fn test_distribute_blocked_without_milestone_completion() {
    let ctx = QuestSystemTest::setup();
    let owner = Address::generate(&ctx.env);
    let enrollee = Address::generate(&ctx.env);

    ctx.mint_tokens(&owner, &5_000);

    let q_id = ctx.create_quest(&owner);
    ctx.quest().add_enrollee(&q_id, &enrollee);
    ctx.rewards().fund_quest(&owner, &q_id, &5_000);

    let ms_id = ctx.create_milestone(&owner, q_id, "Incomplete Milestone", 100);
    // Deliberately skip: ctx.milestone().verify_completion(...)

    let result = ctx
        .rewards()
        .try_distribute_reward(&owner, &q_id, &ms_id, &enrollee, &100);
    assert_eq!(result, Err(Ok(RewardsError::MilestoneNotCompleted)));

    assert_eq!(ctx.token_balance(&enrollee), 0);
    assert_eq!(ctx.rewards().get_pool_balance(&q_id), 5_000);
}

/// 8. Idempotency — duplicate payouts for the same (quest, milestone, enrollee)
///    triple are rejected with `AlreadyPaid`.
///
/// The second call must not transfer tokens, reduce the pool, or increment the
/// earnings or total-distributed counters.
#[test]
fn test_distribute_reward_idempotent() {
    let ctx = QuestSystemTest::setup();
    let owner = Address::generate(&ctx.env);
    let enrollee = Address::generate(&ctx.env);

    ctx.mint_tokens(&owner, &5_000);

    let q_id = ctx.create_quest(&owner);
    ctx.quest().add_enrollee(&q_id, &enrollee);
    ctx.rewards().fund_quest(&owner, &q_id, &5_000);

    let ms_id = ctx.create_milestone(&owner, q_id, "Idempotent Milestone", 200);
    ctx.milestone()
        .verify_completion(&owner, &q_id, &ms_id, &enrollee);

    // First payout succeeds
    ctx.rewards()
        .distribute_reward(&owner, &q_id, &ms_id, &enrollee, &200);
    assert_eq!(ctx.token_balance(&enrollee), 200);

    // Exact same call rejected — PayoutRecord already set for this triple
    let result = ctx
        .rewards()
        .try_distribute_reward(&owner, &q_id, &ms_id, &enrollee, &200);
    assert_eq!(result, Err(Ok(RewardsError::AlreadyPaid)));

    // All counters unchanged after the rejected retry
    assert_eq!(ctx.token_balance(&enrollee), 200);
    assert_eq!(ctx.rewards().get_pool_balance(&q_id), 4_800);
    assert_eq!(ctx.rewards().get_total_distributed(), 200);
    assert_eq!(ctx.rewards().get_user_earnings(&enrollee), 200);
}

/// 9. Error propagation — broken quest contract linkage.
///
/// When rewards is wired to a non-existent quest contract address, the
/// `try_get_quest` cross-contract call fails and rewards surfaces
/// `QuestLookupFailed` to the caller — the error is not swallowed or
/// replaced by a generic panic.
#[test]
fn test_broken_quest_linkage_propagates_error() {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin);
    let token_addr = token_contract.address();

    // Rewards is wired to ghost addresses — nothing is deployed at those addresses
    let ghost_quest = Address::generate(&env);
    let ghost_milestone = Address::generate(&env);
    let rewards_id = env.register(RewardsContract, ());
    let rewards = RewardsContractClient::new(&env, &rewards_id);
    rewards.initialize(&token_addr, &ghost_quest, &ghost_milestone);

    let funder = Address::generate(&env);
    StellarAssetClient::new(&env, &token_addr).mint(&funder, &1_000);

    // try_get_quest on a ghost address fails → rewards wraps it as QuestLookupFailed
    let result = rewards.try_fund_quest(&funder, &1, &500);
    assert_eq!(result, Err(Ok(RewardsError::QuestLookupFailed)));
}
