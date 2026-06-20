# ADR-006: Storage Tier Optimization and Caching Strategy

- Status: Accepted
- Date: 2026-05-28

## Context

Soroban contracts incur costs for storage operations, and repeated cross-contract calls to fetch the same data (e.g., quest ownership) can become expensive and slow. The current implementation makes multiple calls to `get_quest()` within a single transaction to verify ownership, which is inefficient.

Additionally, as Lernza grows, the distinction between frequently-accessed data (hot) and infrequently-accessed data (cold) becomes important for optimizing storage costs and transaction latency.

The milestone contract, for example, calls `get_quest()` multiple times per transaction:
1. To verify the caller is the quest owner
2. To validate quest state
3. To check quest configuration

Each cross-contract call incurs overhead, and the quest data is immutable within a single transaction.

## Decision

Adopt a two-tier storage optimization strategy:

### Tier 1: Hot Data (Frequently Accessed)
Store in persistent storage with aggressive TTL management:
- Quest metadata (name, description, owner, status)
- Milestone definitions and completion records
- Enrollee lists and enrollment status
- Reward pool balances and distribution records

**Rationale**: These are accessed on every transaction and must be highly available.

### Tier 2: Cold Data (Infrequently Accessed)
Store in persistent storage with standard TTL management:
- Creator verification records
- Invite commitments and usage tracking
- Historical audit records
- Administrative configuration

**Rationale**: These are accessed rarely and can tolerate longer retrieval times.

### Caching Strategy for Cross-Contract Calls

Implement local caching of cross-contract call results within a single transaction:

1. **Cache `get_quest()` results** in ownership verification helpers
   - Store the result in a local variable
   - Reuse for all subsequent ownership checks in the same transaction
   - Eliminates redundant cross-contract calls

2. **Pattern for ownership helpers**:
   ```rust
   fn require_quest_owner(env: Env, quest_id: u32, claimed_owner: &Address) -> Result<QuestInfo, Error> {
       // Fetch quest once
       let quest = Self::get_quest_from_contract(env.clone(), quest_id)?;
       
       // Verify ownership
       if quest.owner != *claimed_owner {
           return Err(Error::OwnerMismatch);
       }
       
       // Return the cached result for reuse
       Ok(quest)
   }
   ```

3. **Caller responsibility**: Functions that need ownership verification should:
   - Call `require_quest_owner()` once at the start
   - Reuse the returned `QuestInfo` for all subsequent operations
   - Avoid calling `get_quest()` again in the same transaction

## Consequences

### Benefits
- **Reduced costs**: Fewer cross-contract calls per transaction
- **Faster execution**: Eliminated redundant network round-trips
- **Clearer code**: Ownership verification is explicit and centralized
- **Better scalability**: Caching pattern scales to more complex workflows

### Trade-offs
- **Caller complexity**: Functions must manage the cached result
- **Stale data risk**: Minimal, since cache is transaction-scoped
- **Code duplication**: Multiple functions may need similar caching patterns

### Implementation Notes
- Cache is transaction-scoped and automatically discarded after execution
- No persistent cache invalidation needed
- Pattern is safe for read-only operations (quest data is immutable)
- Future: Consider macro-based caching for common patterns

## Follow-up Work

1. **Implement caching helpers** in milestone and rewards contracts
2. **Audit all cross-contract calls** for redundancy
3. **Measure performance** improvements before/after caching
4. **Document caching patterns** in contract development guide
5. **Consider macro-based caching** for future optimization

## Related ADRs

- ADR-005: Storage Patterns and TTL Strategy
- ADR-003: Frontend Orchestration Pattern
