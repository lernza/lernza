//! TTL boundary tests — issue #1645.
//!
//! `soroban-env-host-22.1.3` (pinned by `soroban-sdk 22.0.11`) exposes no
//! runtime TTL read, so `contracts/quest` already works around this by
//! recording `DataKey::CategoryExpiry`. These tests therefore assert
//! *behaviour* rather than ledger internals: advance the ledger and check
//! whether the entry is still reachable.
//!
//! Ground truth, established empirically against this SDK version:
//!
//! * `Env::default()` uses `min_persistent_entry_ttl = 4096`,
//!   `min_temp_entry_ttl = 16` and `max_entry_ttl = 6_312_000`.
//! * A quest created (and bumped) at ledger `S` reaches
//!   `live_until = S + BUMP`, with `BUMP = 518_400`.
//! * An entry is reachable while `seq <= live_until`, and is *archived* at
//!   `seq == live_until + 1`.
//! * `extend_ttl(THRESHOLD, BUMP)` fires only when the remaining TTL is
//!   `<= THRESHOLD` (`THRESHOLD = 120_960`). One ledger more and it is a
//!   no-op — this inclusive comparison is the off-by-one the issue asks
//!   about, and it is pinned from both sides below.
//! * `get_quest` bumps the quest; `is_expired` deliberately does not, so the
//!   latter probes raw entry liveness without refreshing anything. Every
//!   call needs live instance storage, so `reachable_at` measures the
//!   reachability a caller actually experiences across both tiers.
//! * Touching an *archived* entry raises a host storage error that `try_*`
//!   does not surface as a value: it panics. Expected archival is therefore
//!   caught with `catch_unwind` via [`catch_host_panic`].

use common::Visibility;
use quest::{Error, QuestContract, QuestContractClient};
use soroban_sdk::{
    testutils::Address as _, testutils::Ledger as _, Address, ConversionError, Env, InvokeError,
    String, Vec,
};
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::sync::{Mutex, MutexGuard, OnceLock};

const CATEGORY: &str = "Programming";

/// A public quest. `Visibility::Public` is what makes the contract touch the
/// category listing and `CategoryExpiry` on every bump, i.e. the code path
/// most exposed to TTL races.
fn fixture() -> (Env, QuestContractClient<'static>, Address, u32) {
    let env = Env::default();
    env.mock_all_auths();
    let contract = env.register(QuestContract, ());
    let client = QuestContractClient::new(&env, &contract);
    let owner = Address::generate(&env);
    let token = Address::generate(&env);
    let quest_id = client.create_quest(
        &owner,
        &String::from_str(&env, "Boundary Quest"),
        &String::from_str(&env, "Teaching my brother to code"),
        &String::from_str(&env, CATEGORY),
        &Vec::<String>::new(&env),
        &token,
        &Visibility::Public,
        &None,
        &None,
    );
    (env, client, owner, quest_id)
}

fn hook_lock() -> MutexGuard<'static, ()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

/// Runs `f`, swallowing the panic raised when an archived entry is touched.
///
/// The panic hook is process-global, so it is swapped under a lock to keep
/// concurrent tests from silencing each other's diagnostics.
fn catch_host_panic<T>(f: impl FnOnce() -> T) -> Result<T, ()> {
    let _guard = hook_lock();
    let previous = std::panic::take_hook();
    std::panic::set_hook(Box::new(|_| {}));
    let outcome = catch_unwind(AssertUnwindSafe(f));
    std::panic::set_hook(previous);
    outcome.map_err(|_| ())
}

/// Normalises the shape every generated `try_*` method returns:
/// `Result<Result<T, ConversionError>, Result<Error, InvokeError>>`.
///
/// The outer `Err` is an invoke failure (a contract `Error`, or for archived
/// entries the host storage error that panics), the inner `Err` is a
/// conversion failure. `None` therefore means "not a value".
fn value_of<T>(
    outcome: Result<Result<T, ConversionError>, Result<Error, InvokeError>>,
) -> Option<T> {
    match outcome {
        Ok(Ok(value)) => Some(value),
        _ => None,
    }
}

/// Runs a `try_*` call that is expected to produce a value, turning a host
/// storage error, a contract error or a conversion failure into a readable
/// failure via `context`.
fn expect_value<T>(
    call: impl FnOnce() -> Result<Result<T, ConversionError>, Result<Error, InvokeError>>,
    context: &str,
) -> T {
    match catch_host_panic(call) {
        Ok(outcome) => value_of(outcome).unwrap_or_else(|| panic!("{context}")),
        Err(()) => panic!("{context} (host storage error)"),
    }
}

/// Whether the quest is still readable at `seq` without refreshing anything.
fn reachable_at(env: &Env, client: &QuestContractClient, quest_id: u32, seq: u32) -> bool {
    env.ledger().set_sequence_number(seq);
    matches!(
        catch_host_panic(|| client.try_is_expired(&quest_id)),
        Ok(Ok(Ok(_)))
    )
}

/// Calls a bumping path at `seq`, so the contract re-anchors any TTL it
/// considers close enough to expiry.
fn touch_at(env: &Env, client: &QuestContractClient, quest_id: u32, seq: u32) {
    env.ledger().set_sequence_number(seq);
    let _ = catch_host_panic(|| client.try_get_quest(&quest_id));
}

/// The smallest ledger advance that still triggers a renewal: it leaves
/// exactly `THRESHOLD` ledgers, which the host's comparison accepts.
const FIRST_ELIGIBLE_LEDGER: u32 = common::BUMP - common::THRESHOLD;

// ---------------------------------------------------------------------------
// 1. Storage access exactly at the threshold boundary.
// ---------------------------------------------------------------------------

/// With exactly `THRESHOLD` ledgers left the remaining TTL is on the
/// boundary and the host comparison is inclusive, so the access must renew
/// the entry to `seq + BUMP` and carry it past its original expiry.
#[test]
fn access_with_exactly_threshold_remaining_extends() {
    let (env, client, _owner, quest_id) = fixture();
    let seq = FIRST_ELIGIBLE_LEDGER;
    let renewed_until = seq + common::BUMP;

    assert_eq!(
        common::BUMP - seq,
        common::THRESHOLD,
        "the boundary under test must leave exactly THRESHOLD ledgers",
    );

    touch_at(&env, &client, quest_id, seq);

    assert!(
        reachable_at(&env, &client, quest_id, common::BUMP + 1),
        "a touch leaving exactly THRESHOLD must renew the entry: it has to \
         outlive the live-until ({}) it started with",
        common::BUMP,
    );
    assert!(
        reachable_at(&env, &client, quest_id, renewed_until),
        "the renewed entry must be readable on its new live-until ledger",
    );
    assert!(
        !reachable_at(&env, &client, quest_id, renewed_until + 1),
        "the renewal must not grant more than BUMP ledgers",
    );
}

/// One ledger more remaining than the threshold: the renewal must be
/// skipped. Together with the test above this pins the inclusive comparison
/// from both sides, so flipping it to `<` fails one of the two.
#[test]
fn access_one_ledger_above_threshold_does_not_extend() {
    let (env, client, _owner, quest_id) = fixture();
    let seq = FIRST_ELIGIBLE_LEDGER - 1;

    assert_eq!(
        common::BUMP - seq,
        common::THRESHOLD + 1,
        "this boundary must leave one ledger more than THRESHOLD",
    );

    touch_at(&env, &client, quest_id, seq);

    assert!(
        reachable_at(&env, &client, quest_id, common::BUMP),
        "the entry must still be readable on its original live-until ledger",
    );
    assert!(
        !reachable_at(&env, &client, quest_id, common::BUMP + 1),
        "remaining TTL above THRESHOLD must not be renewed, so the entry must \
         archive at its original live-until + 1",
    );
}

// ---------------------------------------------------------------------------
// 2. Operations on entries that are about to expire.
// ---------------------------------------------------------------------------

/// A write on the last ledger the entry is alive must still succeed and must
/// renew the entry, so the enrollee it records outlives the boundary the
/// write happened at.
#[test]
fn write_one_ledger_before_expiry_succeeds_and_renews() {
    let (env, client, _owner, quest_id) = fixture();
    let enrollee = Address::generate(&env);
    let seq = common::BUMP - 1;

    env.ledger().set_sequence_number(seq);
    client.add_enrollee(&quest_id, &enrollee);

    assert_eq!(client.get_enrollees(&quest_id).len(), 1);
    assert!(
        reachable_at(&env, &client, quest_id, common::BUMP + 1),
        "the write must have renewed the entry past its original live-until",
    );

    let renewed_until = seq + common::BUMP;
    assert!(reachable_at(&env, &client, quest_id, renewed_until));
    assert!(!reachable_at(&env, &client, quest_id, renewed_until + 1));
}

/// A bumping read right on the live-until ledger must return the whole record
/// — a caller must never observe a half-expired quest.
#[test]
fn read_on_the_live_until_ledger_returns_the_whole_quest() {
    let (env, client, _owner, quest_id) = fixture();
    let before = client.get_quest(&quest_id);

    env.ledger().set_sequence_number(common::BUMP);
    let quest = expect_value(
        || client.try_get_quest(&quest_id),
        "a bumping read on the live-until ledger must succeed",
    );

    assert_eq!(quest.id, before.id);
    assert_eq!(quest.category, before.category);
    assert_eq!(quest.owner, before.owner);
    assert_eq!(quest.name, before.name);
}

// ---------------------------------------------------------------------------
// 3. TTL extension racing with ledger advancement.
// ---------------------------------------------------------------------------

/// The renewal must be anchored to the ledger the contract observed, not to
/// the ledger the entry was created at. A touch inside the eligible window
/// has to push the deadline a full `BUMP` out from that moment.
#[test]
fn extension_anchors_to_the_current_ledger() {
    let (env, client, _owner, quest_id) = fixture();
    let touch_seq = FIRST_ELIGIBLE_LEDGER + 1;

    touch_at(&env, &client, quest_id, touch_seq);
    let renewed_until = touch_seq + common::BUMP;

    assert!(
        reachable_at(&env, &client, quest_id, renewed_until),
        "the renewal must last BUMP ledgers after the ledger that performed it \
         ({touch_seq}), not after the ledger that created the entry",
    );
    assert!(
        !reachable_at(&env, &client, quest_id, renewed_until + 1),
        "the renewal must not be granted extra ledgers beyond BUMP",
    );
    assert_ne!(
        renewed_until,
        common::BUMP,
        "sanity: this touch must anchor to a different ledger than creation",
    );
}

/// Walks the boundary the way a contract sees it under load: several readers
/// interleaved with ledger advancement, each one close enough to the deadline
/// to renew it. The entry must never drop out in between.
#[test]
fn interleaved_reads_and_advancement_never_lose_the_entry() {
    let (env, client, _owner, quest_id) = fixture();
    // Large enough that each round lands inside the next entry's eligible
    // window, so every read really does renew rather than no-op.
    let step = FIRST_ELIGIBLE_LEDGER + 1;

    let mut last_touch = 0;
    for round in 0..3u32 {
        let seq = FIRST_ELIGIBLE_LEDGER + round * step;
        touch_at(&env, &client, quest_id, seq);
        assert!(
            reachable_at(&env, &client, quest_id, seq),
            "entry vanished at ledger {seq} during round {round}",
        );
        last_touch = seq;
    }

    assert!(
        reachable_at(&env, &client, quest_id, last_touch + common::BUMP),
        "the entry must be anchored to the final read's ledger ({last_touch})",
    );
}

/// A reader arriving after the entry has already archived must not be able to
/// resurrect it, so a stale client can never observe a half-restored quest.
#[test]
fn reads_after_archival_do_not_resurrect_the_entry() {
    let (env, client, _owner, quest_id) = fixture();

    env.ledger().set_sequence_number(common::BUMP + 1);
    let archived = catch_host_panic(|| client.try_is_expired(&quest_id));

    assert!(
        !matches!(archived, Ok(Ok(Ok(_)))),
        "past live-until the entry must not read back as a value, got {archived:?}",
    );
}

// ---------------------------------------------------------------------------
// 4. Instance TTL expiring in the middle of a multi-step operation.
// ---------------------------------------------------------------------------

/// Instance storage has its own lifetime, and every contract call needs it.
/// `get_quest_count` defaults to `0` when the key is merely *absent*, so a
/// quiet `0` after the instance lapses would mean lost state went unnoticed.
#[test]
fn instance_expiry_fails_loudly_instead_of_resetting_counters() {
    let (env, client, _owner, _quest_id) = fixture();
    assert_eq!(client.get_quest_count(), 1);

    // Let every TTL the create/bump sequence established lapse.
    env.ledger().set_sequence_number(common::BUMP + 1);
    let after_expiry = catch_host_panic(|| client.try_get_quest_count());

    assert!(
        !matches!(after_expiry, Ok(Ok(Ok(_)))),
        "instance storage lapsing must be reported, never silently read as 0, \
         got {after_expiry:?}",
    );
}

/// The multi-step case from the issue: step one commits, the ledger then runs
/// past the instance's lifetime, and step two must refuse rather than commit
/// into a freshly created instance that no longer holds step one's state.
#[test]
fn multi_step_flow_refuses_to_commit_after_the_instance_lapses() {
    let (env, client, _owner, quest_id) = fixture();
    let first = Address::generate(&env);

    client.add_enrollee(&quest_id, &first);
    assert_eq!(client.get_enrollees(&quest_id).len(), 1);

    // The chain goes quiet for longer than any TTL granted so far.
    env.ledger().set_sequence_number(common::BUMP + 1);

    let second = Address::generate(&env);
    let step_two = catch_host_panic(|| client.try_add_enrollee(&quest_id, &second));
    assert!(
        !matches!(step_two, Ok(Ok(Ok(_)))),
        "step two must not commit after the instance tier lapsed, got {step_two:?}",
    );

    // Step one's work must not reappear as a silently zeroed quest either.
    let count = catch_host_panic(|| client.try_get_quest_count());
    assert!(
        !matches!(count, Ok(Ok(Ok(_)))),
        "a lapsed instance must not read back as an empty contract, got {count:?}",
    );
}

// ---------------------------------------------------------------------------
// Regression: recorded category expiry must be TTL-extended.
// ---------------------------------------------------------------------------

/// `DataKey::CategoryExpiry` is read on every bump of a public quest, but a
/// bare `set` does not move an entry's TTL. Written without an extension it
/// keeps the network minimum (`min_persistent_entry_ttl = 4096` here — far
/// below `BUMP` even on mainnet) and is archived long before the listing it
/// describes, which turns a healthy `get_quest` into a storage error and
/// makes `get_category` fall back to a fabricated "now + BUMP".
#[test]
fn recorded_category_expiry_outlives_the_network_minimum() {
    let (env, client, _owner, _quest_id) = fixture();
    let category = String::from_str(&env, CATEGORY);
    let beyond_minimum = env.ledger().get().min_persistent_entry_ttl + 1;

    // Well past the network minimum, still far inside BUMP.
    assert!(beyond_minimum < common::BUMP);

    env.ledger().set_sequence_number(beyond_minimum);
    let info = client.get_category(&category);

    // The recorded expiry is the one written when the listing was last
    // touched (ledger 0), not the "now + BUMP" fallback: had it been
    // archived, `ttl_remaining` would be the full BUMP.
    assert_eq!(
        info.ttl_remaining,
        common::BUMP - beyond_minimum,
        "get_category must report the recorded expiry, not a fallback",
    );
    assert_eq!(info.quest_count, 1);
}

/// The same archival also broke the bumping read path, because `Self::bump`
/// re-reads the category listing. A public quest read long after the network
/// minimum must keep working.
#[test]
fn bumping_read_survives_past_the_network_minimum() {
    let (env, client, _owner, quest_id) = fixture();
    let beyond_minimum = env.ledger().get().min_persistent_entry_ttl + 1;

    env.ledger().set_sequence_number(beyond_minimum);
    let found = expect_value(
        || client.try_get_quest(&quest_id),
        "a bumping read past the network minimum TTL must still succeed",
    );
    assert_eq!(found.id, quest_id);
}

/// A recorded expiry must follow the latest touch, not the first one: a
/// public quest kept alive over several windows has to report a deadline
/// that is actually still ahead of the reader.
#[test]
fn recorded_category_expiry_follows_the_latest_touch() {
    let (env, client, _owner, quest_id) = fixture();
    let category = String::from_str(&env, CATEGORY);

    touch_at(&env, &client, quest_id, FIRST_ELIGIBLE_LEDGER);

    env.ledger().set_sequence_number(FIRST_ELIGIBLE_LEDGER);
    let info = client.get_category(&category);

    assert_eq!(
        info.ttl_remaining,
        common::BUMP,
        "a touch must re-record the expiry to touch + BUMP",
    );
    assert_eq!(info.quest_count, 1);
}
