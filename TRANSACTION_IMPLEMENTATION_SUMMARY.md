# Transaction Queue Persistence & Timebounds Implementation

## Summary

Implemented comprehensive transaction queue persistence to localStorage and transaction timebounds validation before submission. This ensures transactions survive page refreshes and are validated before being sent to the blockchain.

## Changes Made

### 1. Enhanced `useTransactionQueue` Hook

**File**: `frontend/src/hooks/use-transaction-queue.ts`

**Changes**:

- Added `enqueuedAt` timestamp to track when transactions are added
- Added optional `expiresAt` field for transaction expiration
- Implemented localStorage persistence with automatic cleanup of expired transactions
- Added new methods:
  - `clear()` - Clear all transactions
  - `isExpired()` - Check if a transaction has expired
  - `getValidTransactions()` - Get non-expired transactions
  - `removeExpiredTransactions()` - Clean up expired transactions
- Added configuration options:
  - `persistToStorage` (default: true) - Enable/disable persistence
  - `defaultTTL` (default: 24 hours) - Default expiration time

**Key Features**:

- Automatic persistence to localStorage on state changes
- Automatic loading from localStorage on initialization
- Expired transactions filtered out automatically
- Graceful handling of storage unavailability

### 2. Transaction Timebounds Validation

**File**: `frontend/src/lib/contracts/client.ts`

**New Exports**:

- `TransactionTimebounds` interface - Defines min/max time bounds
- `isTransactionTimeboundsValid()` - Validates if transaction is within time bounds
- `getTransactionTimebounds()` - Extracts timebounds from a transaction

**Enhanced `signAndSubmit()` Function**:

- Now checks transaction timebounds before submission
- Returns descriptive error messages for expired/not-yet-valid transactions
- Prevents submission of invalid transactions

**Error Messages**:

- "Transaction is not yet valid. Valid from [ISO timestamp]"
- "Transaction has expired. Valid until [ISO timestamp]"

### 3. Transaction Queue Storage Utilities

**File**: `frontend/src/lib/transaction-queue-storage.ts` (NEW)

**Utilities Provided**:

- `getStoredTransactionQueue()` - Retrieve all stored transactions
- `storeTransactionQueue()` - Save transactions to storage
- `clearStoredTransactionQueue()` - Clear all stored transactions
- `getStoredTransactionCount()` - Get count of stored transactions
- `hasPendingTransactions()` - Check if any transactions are pending
- `getTransactionsByPhase()` - Filter by signing/confirming phase
- `getOldestPendingTransaction()` - Get oldest transaction
- `getExpiringTransactions()` - Get transactions expiring soon
- `exportTransactionQueue()` - Export for backup/debugging
- `importTransactionQueue()` - Import from backup

**Features**:

- Version control for storage format
- Automatic expiration filtering
- Comprehensive transaction queries
- Export/import for debugging

### 4. Transaction Timebounds Monitoring Hook

**File**: `frontend/src/hooks/use-transaction-timebounds.ts` (NEW)

**Hooks Provided**:

- `useTransactionTimebounds()` - Monitor transaction validity in real-time
- `useTransactionTimeRemaining()` - Get formatted time remaining
- `useTransactionExpiryWarning()` - Warn when transaction is about to expire

**Features**:

- Real-time validity checking
- Periodic polling (every 10 seconds)
- Formatted time remaining display
- Configurable expiry warning threshold

## Data Structures

### QueuedTransaction (Enhanced)

```typescript
interface QueuedTransaction<TType extends string = string, TMeta = unknown> {
  id: string; // Unique identifier
  type: TType; // Transaction type
  label: string; // Human-readable label
  phase: "signing" | "confirming"; // Current phase
  meta: TMeta; // Custom metadata
  txHash?: string; // Blockchain tx hash
  enqueuedAt: number; // When added (milliseconds)
  expiresAt?: number; // Expiration time (milliseconds)
}
```

### TransactionTimebounds (New)

```typescript
interface TransactionTimebounds {
  minTime: number; // Unix timestamp in seconds
  maxTime: number; // Unix timestamp in seconds (0 = no limit)
}
```

## Storage Format

Transactions are stored in localStorage under key `lernza_transaction_queue`:

```json
{
  "version": "1.0",
  "transactions": [
    {
      "id": "queued-tx-1",
      "type": "milestone_approval",
      "label": "Approve Milestone",
      "phase": "signing",
      "meta": { "milestoneId": "123" },
      "enqueuedAt": 1234567890000,
      "expiresAt": 1234571490000
    }
  ],
  "lastUpdated": 1234567890000
}
```

## Usage Examples

### Basic Queue with Persistence

```typescript
import { useTransactionQueue } from "@/hooks/use-transaction-queue"

function MyComponent() {
  const queue = useTransactionQueue()

  const handleTransaction = () => {
    const txId = queue.enqueue({
      type: "milestone_approval",
      label: "Approve Milestone",
      phase: "signing",
      meta: { milestoneId: "123" },
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    })

    // Transaction is automatically persisted to localStorage
  }

  return (
    <div>
      {queue.transactions.map(tx => (
        <div key={tx.id}>{tx.label}</div>
      ))}
    </div>
  )
}
```

### Timebounds Validation

```typescript
import { signAndSubmit } from "@/lib/contracts/client";

const result = await signAndSubmit(transaction);

if (result.status === "FAILED") {
  // Could be due to expired timebounds
  console.error(result.error);
}
```

### Monitor Transaction Validity

```typescript
import { useTransactionTimebounds } from "@/hooks/use-transaction-timebounds"

function TransactionStatus({ tx }) {
  const status = useTransactionTimebounds(tx)

  if (!status.isValid) {
    return <div className="error">{status.reason}</div>
  }

  return <div>Transaction is valid</div>
}
```

## Benefits

1. **Resilience**: Transactions survive page refreshes and browser crashes
2. **User Experience**: Users don't lose pending transactions
3. **Safety**: Expired transactions are prevented from being submitted
4. **Debugging**: Easy export/import for troubleshooting
5. **Performance**: Automatic cleanup of old transactions
6. **Flexibility**: Configurable TTL and persistence options

## Backward Compatibility

- Existing code using `useTransactionQueue` continues to work
- New fields (`enqueuedAt`, `expiresAt`) are optional
- Storage is automatically handled, no migration needed
- Can disable persistence with `persistToStorage: false`

## Testing Recommendations

1. **Persistence**: Refresh page and verify transactions remain
2. **Expiration**: Set short TTL and verify cleanup
3. **Timebounds**: Create transaction with past maxTime and verify rejection
4. **Storage Unavailable**: Test in private/incognito mode
5. **Export/Import**: Test backup and restore functionality

## Files Modified/Created

### Modified

- `frontend/src/hooks/use-transaction-queue.ts` - Enhanced with persistence
- `frontend/src/lib/contracts/client.ts` - Added timebounds validation

### Created

- `frontend/src/lib/transaction-queue-storage.ts` - Storage utilities
- `frontend/src/hooks/use-transaction-timebounds.ts` - Timebounds monitoring
- `frontend/src/lib/TRANSACTION_QUEUE_GUIDE.md` - Comprehensive guide
- `TRANSACTION_IMPLEMENTATION_SUMMARY.md` - This file

## Next Steps

1. **Integration**: Update existing transaction handling code to use new features
2. **UI Updates**: Add expiry warnings to transaction dialogs
3. **Testing**: Add unit tests for persistence and timebounds
4. **Monitoring**: Add analytics for transaction expiration rates
5. **Documentation**: Update API documentation with new features

## Configuration

### Default Settings

- **Persistence**: Enabled
- **Default TTL**: 24 hours
- **Timebounds Check**: Every 10 seconds
- **Expiry Warning**: 5 minutes before expiration

### Customization

```typescript
// Custom configuration
const queue = useTransactionQueue({
  persistToStorage: true,
  defaultTTL: 12 * 60 * 60 * 1000, // 12 hours
});

// Custom expiry warning
const isExpiring = useTransactionExpiryWarning(tx, 10 * 60 * 1000); // 10 min
```

## Troubleshooting

### Transactions Not Persisting

- Check if localStorage is available
- Verify `persistToStorage` is `true`
- Check browser console for errors

### Timebounds Validation Failing

- Verify transaction has valid timebounds
- Check system time matches blockchain
- Ensure transaction is recent

### Storage Quota Issues

- Monitor localStorage usage
- Implement cleanup policies
- Consider archiving old transactions

## Performance Impact

- **Storage Size**: ~200-500 bytes per transaction
- **Memory**: Minimal overhead for hooks
- **Polling**: 10-second interval for timebounds checks
- **localStorage Limit**: Typically 5-10MB (plenty of room)

## Security Considerations

- Transactions stored in localStorage are not encrypted
- Use HTTPS to prevent interception
- Don't store sensitive data in transaction metadata
- Clear transactions after successful submission
- Implement rate limiting for transaction submission

## Support

For issues or questions:

1. Check `TRANSACTION_QUEUE_GUIDE.md` for detailed documentation
2. Review example usage in this summary
3. Check browser console for error messages
4. Export transactions for debugging: `exportTransactionQueue()`
