use proptest::prelude::*;
use rewards::{RewardsContract, RewardsContractClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env,
};
use testutils::setup_rewards;

/// Operation types for the reward system
#[derive(Debug, Clone)]
enum RewardOperation {
    Fund { amount: i128 },
    Distribute { milestone_id: u32, enrollee_idx: u8, amount: i128 },
    Refund { amount: i128 },
}

/// Generate a sequence of reward operations
fn reward_operations() -> impl Strategy<Value = Vec<RewardOperation>> {
    prop::collection::vec(
        prop_oneof![
            // Fund operations: 1-10000 tokens
            (1_i128..=10_000).prop_map(|amount| RewardOperation::Fund { amount }),
            // Distribute operations: milestone 0-2, enrollee 0-4, amount 1-1000
            (0_u32..=2, 0_u8..=4, 1_i128..=1_000).prop_map(|(milestone_id, enrollee_idx, amount)| {
                RewardOperation::Distribute { milestone_id, enrollee_idx, amount }
            }),
            // Refund operations: 1-5000 tokens
            (1_i128..=5_000).prop_map(|amount| RewardOperation::Refund { amount }),
        ],
        1..=20 // 1 to 20 operations per test
    )
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(10000))]
    
    #[test]
    fn test_reward_system_invariants(operations in reward_operations()) {
        let (
            env,
            client,
            _cid,
            token_addr,
            quest_client,
            _quest_id,
            milestone_client,
            _milestone_id,
            _certificate_client,
            _certificate_id,
        ) = setup_rewards();
        
        let owner = Address::generate(&env);
        
        // Create a quest
        let q_id = quest_client.create_quest(
            &owner,
            &soroban_sdk::String::from_str(&env, "Test Quest"),
            &soroban_sdk::String::from_str(&env, "Description"),
            &soroban_sdk::String::from_str(&env, "Programming"),
            &soroban_sdk::Vec::<soroban_sdk::String>::new(&env),
            &token_addr,
            &common::Visibility::Public,
            &None,
        );
        
        // Create some milestones
        for i in 0..3 {
            milestone_client.create_milestone(
                &owner,
                &q_id,
                &soroban_sdk::String::from_str(&env, &format!("Milestone {}", i)),
                &soroban_sdk::String::from_str(&env, "Description"),
                &100, // Fixed reward amount for simplicity
                &false,
            );
        }
        
        // Create some enrollees
        let mut enrollees = Vec::new();
        for _ in 0..5 {
            let enrollee = Address::generate(&env);
            quest_client.add_enrollee(&q_id, &enrollee);
            enrollees.push(enrollee);
        }
        
        let mut total_funded = 0_i128;
        let mut total_distributed = 0_i128;
        let mut total_refunded = 0_i128;
        
        // Execute operations
        for operation in operations {
            match operation {
                RewardOperation::Fund { amount } => {
                    // Only fund if amount is reasonable and we haven't exceeded limits
                    if amount > 0 && amount <= 10_000 && total_funded + amount <= 100_000 {
                        if client.try_fund_quest(&owner, &q_id, &amount).is_ok() {
                            total_funded += amount;
                        }
                    }
                }
                RewardOperation::Distribute { milestone_id, enrollee_idx, amount } => {
                    // Only distribute if we have enough pool balance and valid parameters
                    if milestone_id < 3 && (enrollee_idx as usize) < enrollees.len() {
                        let enrollee = &enrollees[enrollee_idx as usize];
                        let pool_balance = client.get_pool_balance(&q_id);
                        
                        if amount > 0 && amount <= pool_balance && amount <= 1_000 {
                            // Mark milestone as completed first
                            if milestone_client.try_verify_completion(&owner, &q_id, &milestone_id, enrollee).is_ok() {
                                // Try to distribute reward
                                if client.try_distribute_reward(&owner, &q_id, &milestone_id, enrollee, &amount).is_ok() {
                                    total_distributed += amount;
                                }
                            }
                        }
                    }
                }
                RewardOperation::Refund { amount } => {
                    // Only refund if quest is archived and grace period has passed
                    quest_client.archive_quest(&q_id);
                    
                    // Fast-forward time past grace period
                    let grace_period = client.get_refund_grace_period();
                    env.ledger().set_timestamp(env.ledger().timestamp() + grace_period + 1);
                    
                    let pool_balance = client.get_pool_balance(&q_id);
                    if amount > 0 && amount <= pool_balance && amount <= 5_000 {
                        if client.try_refund_pool(&owner, &q_id, &amount).is_ok() {
                            total_refunded += amount;
                        }
                    }
                }
            }
        }
        
        // INVARIANT: total_distributed + pool_remaining + total_refunded == total_funded
        let pool_remaining = client.get_pool_balance(&q_id);
        let actual_total = total_distributed + pool_remaining + total_refunded;
        
        prop_assert_eq!(
            actual_total, 
            total_funded,
            "Invariant violated: distributed({}) + remaining({}) + refunded({}) = {} != funded({})",
            total_distributed,
            pool_remaining, 
            total_refunded,
            actual_total,
            total_funded
        );
        
        // ADDITIONAL INVARIANTS:
        
        // Pool balance should never be negative
        prop_assert!(pool_remaining >= 0, "Pool balance cannot be negative: {}", pool_remaining);
        
        // Total distributed should never exceed total funded
        prop_assert!(
            total_distributed <= total_funded,
            "Cannot distribute more than funded: {} > {}",
            total_distributed,
            total_funded
        );
        
        // Total refunded should never exceed total funded
        prop_assert!(
            total_refunded <= total_funded,
            "Cannot refund more than funded: {} > {}",
            total_refunded,
            total_funded
        );
        
        // Global total distributed should match our tracking
        let global_distributed = client.get_total_distributed();
        prop_assert!(
            global_distributed >= total_distributed,
            "Global distributed should be at least our quest's distributed amount"
        );
    }
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(1000))]
    
    #[test]
    fn test_idempotency_invariant(
        milestone_id in 0_u32..=2,
        enrollee_idx in 0_u8..=4,
        amount in 1_i128..=1_000
    ) {
        let (
            env,
            client,
            _cid,
            token_addr,
            quest_client,
            _quest_id,
            milestone_client,
            _milestone_id,
            _certificate_client,
            _certificate_id,
        ) = setup_rewards();
        
        let owner = Address::generate(&env);
        
        // Create a quest
        let q_id = quest_client.create_quest(
            &owner,
            &soroban_sdk::String::from_str(&env, "Test Quest"),
            &soroban_sdk::String::from_str(&env, "Description"),
            &soroban_sdk::String::from_str(&env, "Programming"),
            &soroban_sdk::Vec::<soroban_sdk::String>::new(&env),
            &token_addr,
            &common::Visibility::Public,
            &None,
        );
        
        // Create milestones
        for i in 0..3 {
            milestone_client.create_milestone(
                &owner,
                &q_id,
                &soroban_sdk::String::from_str(&env, &format!("Milestone {}", i)),
                &soroban_sdk::String::from_str(&env, "Description"),
                &amount, // Use the test amount
                &false,
            );
        }
        
        // Create enrollees
        let mut enrollees = Vec::new();
        for _ in 0..5 {
            let enrollee = Address::generate(&env);
            quest_client.add_enrollee(&q_id, &enrollee);
            enrollees.push(enrollee);
        }
        
        // Fund the quest with enough tokens
        client.fund_quest(&owner, &q_id, &(amount * 10));
        
        if milestone_id < 3 && (enrollee_idx as usize) < enrollees.len() {
            let enrollee = &enrollees[enrollee_idx as usize];
            
            // Mark milestone as completed
            milestone_client.verify_completion(&owner, &q_id, &milestone_id, enrollee);
            
            // First distribution should succeed
            let result1 = client.try_distribute_reward(&owner, &q_id, &milestone_id, enrollee, &amount);
            prop_assert!(result1.is_ok(), "First distribution should succeed");
            
            let pool_after_first = client.get_pool_balance(&q_id);
            let user_earnings_after_first = client.get_user_earnings(enrollee);
            
            // Second distribution should fail with AlreadyPaid (idempotency)
            let result2 = client.try_distribute_reward(&owner, &q_id, &milestone_id, enrollee, &amount);
            prop_assert_eq!(result2, Err(Ok(rewards::Error::AlreadyPaid)), "Second distribution should fail with AlreadyPaid");
            
            // Pool and user earnings should be unchanged after failed second attempt
            let pool_after_second = client.get_pool_balance(&q_id);
            let user_earnings_after_second = client.get_user_earnings(enrollee);
            
            prop_assert_eq!(pool_after_first, pool_after_second, "Pool balance should be unchanged after failed retry");
            prop_assert_eq!(user_earnings_after_first, user_earnings_after_second, "User earnings should be unchanged after failed retry");
        }
    }
}