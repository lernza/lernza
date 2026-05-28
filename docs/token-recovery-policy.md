# Token Recovery Policy for Rewards Contract

## Overview

This document outlines the operational policy for handling tokens sent directly to the rewards contract address outside the standard `fund_quest` flow.

## Problem Statement

The rewards contract tracks internal pool balances for each quest. When tokens are sent directly to the contract address (outside of `fund_quest`), they become "unallocated" - the contract holds the tokens but they're not tracked in any quest pool. Without a recovery mechanism, these tokens would be permanently locked.

## Solution Architecture

### Recovery Flow

1. **Admin Authority**: A designated admin address is set during contract initialization
2. **Unallocated Balance Calculation**: The contract maintains a `TotalAllocated` counter to track tokens in quest pools
3. **Recovery Function**: Only the admin can call `recover_tokens()` to transfer unallocated tokens to any recipient
4. **Audit Trail**: All recovery operations emit events for transparency

### Key Constraints

- **Admin Only**: Only the designated admin address can execute recovery operations
- **Unallocated Only**: Recovery can only transfer tokens that aren't allocated to quest pools
- **Event Logging**: Every recovery operation emits `(reward, recovered)` events with admin, recipient, and amount
- **Amount Validation**: Zero or negative amounts are rejected

## Operational Procedures

### 1. Initial Setup

During contract deployment, the deployer must:
```rust
initialize(admin_address, token_address, quest_contract_address)
```

### 2. Handling Accidental Direct Transfers

When tokens are accidentally sent directly to the contract:

1. **Verify Unallocated Balance**: Call `get_unallocated_balance_public()` to confirm available tokens
2. **Execute Recovery**: Admin calls `recover_tokens(admin, recipient, amount)`
3. **Verify Transfer**: Check recipient's token balance
4. **Audit Trail**: Monitor `(reward, recovered)` events

### 3. Quest Pool Refund Window

After a quest is archived, the quest authority may request a refund of the unused pool balance.
The refund window opens **7 days (604,800 seconds) after the quest's `archived_at` timestamp** and remains open indefinitely.

#### API

```rust
get_refund_window(env: Env, quest_id: u32) -> (u64, u64)
```

Returns `(open_timestamp, close_timestamp)`:
- `(0, 0)` — Quest not found or not archived; window closed.
- `(archived_at + 604_800, u64::MAX)` — Window open; any time on or after `open_timestamp` is valid for `refund_pool` or `refund_unused_pool`.

Both values are **deterministic**, **monotonic**, and derived solely from the stored quest metadata.

#### UI Interpretation

Frontends should:
1. Call `get_refund_window(quest_id)` and compare `open_timestamp` against the current ledger time.
2. If `open_timestamp == 0` → Hide refund controls (quest active or invalid).
3. If `ledger_timestamp < open_timestamp` → Show countdown: `open_timestamp - ledger_timestamp`.
4. If `ledger_timestamp >= open_timestamp` → Enable `refund_pool`/`refund_unused_pool` actions.

#### Example

```text
archived_at = 1_700_000_000
open_timestamp = 1_700_000_000 + 604_800 = 1_700_604_800
close_timestamp = 18_446_744_073_709_551_615 (u64::MAX)
```

After 1_700_604_800, the authority may call `refund_pool` for any amount ≤ (pool_balance − reserved_obligations).


## Security Considerations

### Admin Key Management

- Admin private keys should be stored securely (hardware wallet, multi-sig)
- Consider using a multi-signature admin address for additional security
- Regular admin key rotation is recommended

### Access Control

- The admin address cannot be changed after initialization
- Admin recovery operations are logged on-chain via events
- No other functions can be called by admin (prevents privilege escalation)

### Risk Mitigation

- Recovery only affects unallocated tokens (quest pools are protected)
- Amount validation prevents negative or zero transfers
- All operations require admin authentication

## Monitoring and Alerting

### Event Monitoring

Monitor for `(reward, recovered)` events:
- Event topics: `["reward", "recovered"]`
- Event data: `(admin_address, recipient_address, amount)`

### Balance Monitoring

Regular checks of:
- Contract's actual token balance
- Total allocated to quest pools
- Calculated unallocated balance

### Alert Triggers

Set up alerts for:
- Large recovery operations (> threshold)
- Frequent recovery operations
- Unexpected unallocated balance increases

## API Reference

### Core Functions

#### `recover_tokens(admin, recipient, amount) -> Result<(), Error>`
- **Authority**: Admin only
- **Purpose**: Transfer unallocated tokens to recipient
- **Validation**: Checks admin auth, amount > 0, sufficient unallocated balance

#### `get_unallocated_balance_public() -> Result<i128, Error>`
- **Authority**: Public
- **Purpose**: Get available unallocated token balance
- **Returns**: Actual balance minus total allocated

### Events

#### `(reward, recovered)`
- **Data**: `(admin_address, recipient_address, amount)`
- **Purpose**: Audit trail for recovery operations

## Testing

The recovery mechanism includes comprehensive tests covering:
- Successful recovery scenarios
- Insufficient unallocated balance
- Unauthorized access attempts
- Invalid amount handling
- Quest pool preservation

## Limitations

1. **Single Admin**: Only one admin address can be set during initialization
2. **No Time Delays**: Recovery operations execute immediately (no timelock)
3. **Manual Process**: Requires admin intervention for each recovery

## Future Enhancements

Consider implementing:
- Multi-signature admin controls
- Time-locked recovery operations
- Automated recovery for small amounts
- Recovery fee mechanism

## Support

For recovery operations or questions about this policy:
- Contact the contract admin
- Review on-chain events for operation history
- Refer to the contract source code for implementation details
