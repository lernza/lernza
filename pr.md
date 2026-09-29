# fix: reward scaling, creator verification TTL side-effect, and archive index cleanup

## Summary

This PR addresses four core issues across the frontend and smart contracts:

1. **Milestone Reward Decimal Scaling (`fix(create-quest)`)**:
   - Replaced hardcoded `1_000_000` (6 decimals) scaling factor in `step3.tsx` with `10n ** BigInt(verifiedToken.decimals)`.
   - Ensures milestone rewards and pool funding share identical scaling across arbitrary tokens (including 7-decimal XLM).

2. **BigInt Precision Preservation (`fix(create-quest)`)**:
   - Replaced `BigInt(10 ** decimals)` with `10n ** BigInt(decimals)` in `step3.tsx` and `use-wallet-balance.ts`.
   - Avoids intermediate JavaScript float conversion exceeding `Number.MAX_SAFE_INTEGER` for tokens with $>15$ decimals.

3. **Creator Verification TTL Side-Effect (`fix(quest)`)**:
   - Removed `common::extend_persistent_ttl` from the read-only `is_creator_verified` query in `contracts/quest/src/lib.rs`.
   - Ensures verification TTL is only granted or extended during explicit admin actions (`verify_creator`), preventing quest creation from perpetually renewing verification. Documented verification lifecycle.

4. **Archive Quest Index Cleanup (`fix(quest)`)**:
   - Added `remove_id_from_index` calls for `DataKey::PublicCategoryQuests` and `DataKey::PublicQuests` in `archive_quest`.
   - Prevents archived quests from polluting public discovery listings and category search results.

5. **Contract Build Stabilization**:
   - Decoupled `internal_mint` in `contracts/certificate/src/lib.rs` to allow owner-independent issuance from `verify_and_issue`.
   - Addressed clippy warnings (`len_zero`, `match_like_matches_macro`, `implicit_saturating_sub`, unnecessary casts).

## Build Verification

- **Rust / Soroban**:
  - `cargo check --workspace --lib` passes with 0 errors.
  - `cargo build --target wasm32-unknown-unknown --release --package quest --package milestone --package rewards --package certificate --package completion` passes with 0 errors.
  - `cargo fmt --all -- --check` passes cleanly.
- **Frontend**:
  - `pnpm build` (`tsc -b && vite build`) passes with 0 errors.
