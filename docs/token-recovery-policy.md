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

### 2. Handling Accidental Transfers

When tokens are accidentally sent directly to the contract:

1. **Verify Unallocated Balance**: Call `get_unallocated_balance_public()` to confirm available tokens
2. **Execute Recovery**: Admin calls `recover_tokens(admin, recipient, amount)`
3. **Verify Transfer**: Check recipient's token balance
4. **Audit Trail**: Monitor `(reward, recovered)` events

### 3. Emergency Procedures

For large accidental transfers or security incidents:

1. **Immediate Assessment**: Calculate total unallocated balance
2. **Staged Recovery**: Recover tokens in smaller amounts if needed
3. **Documentation**: Record all recovery operations with timestamps and reasons
4. **Stakeholder Communication**: Notify affected parties

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
