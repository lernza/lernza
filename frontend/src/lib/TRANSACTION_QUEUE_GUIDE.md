# Transaction Queue Management Guide

This guide explains the transaction queue persistence and timebounds validation features.

## Overview

The transaction queue system provides:

1. **Persistent Queue Storage** - Transactions are automatically saved to localStorage
2. **Timebounds Validation** - Transactions are checked before submission to ensure they're still valid
3. **Automatic Expiration** - Old transactions are automatically cleaned up
4. **Recovery** - Pending transactions survive page refreshes

## Features

### 1. Persistent Transaction Queue

Transactions are automatically persisted to localStorage with the following benefits:

- **Survives page refreshes** - Users can refresh the page without losing pending transactions
- **Configurable TTL** - Set how long transactions remain in the queue (default: 24 hours)
- **Automatic cleanup** - Expired transactions are automatically removed
- **Version control** - Storage format includes version info for future migrations

#### Usage

```typescript
import { useTransactionQueue } from "@/hooks/use-transaction-queue"

function MyComponent() {
  // Enable persistence (default)
  const queue = useTransactionQueue({
    persistToStorage: true,
    defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  })

  // Enqueue a transaction
  const txId = queue.enqueue({
    type: "milestone_approval",
    label: "Approve Milestone",
    phase: "signing",
    meta: { milestoneId: "123" },
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
  })

  // Update transaction status
  queue.update(txId, { phase: "confirming", txHash: "abc123" })

  // Remove transaction
  queue.remove(txId)

  // Clear all transactions
  queue.clear()

  // Get valid (non-expired) transactions
  const validTxs = queue.getValidTransactions()

  // Remove expired transactions
  queue.removeExpiredTransactions()

  return (
    <div>
      {queue.transactions.map(tx => (
        <div key={tx.id}>
          {tx.label} - {tx.phase}
        </div>
      ))}
    </div>
  )
}
```

### 2. Transaction Timebounds Validation

Before submitting a transaction, the system validates that the transaction's timebounds are still valid.

#### What are Timebounds?

Timebounds define the valid time window for a transaction:
- **minTime** - Earliest time the transaction can be submitted (Unix timestamp in seconds)
- **maxTime** - Latest time the transaction can be submitted (0 means no upper limit)

#### Validation

The `signAndSubmit` function automatically checks timebounds:

```typescript
import { signAndSubmit } from "@/lib/contracts/client"

// Timebounds are checked automatically
const result = await signAndSubmit(transaction)

if (result.status === "FAILED") {
  // Could be due to expired timebounds
  console.error(result.error) // "Transaction has expired..."
}
```

#### Manual Timebounds Checking

```typescript
import {
  getTransactionTimebounds,
  isTransactionTimeboundsValid,
} from "@/lib/contracts/client"

const timebounds = getTransactionTimebounds(tx)
if (timebounds && !isTransactionTimeboundsValid(timebounds)) {
  console.error("Transaction timebounds are invalid")
}
```

### 3. Transaction Timebounds Hook

Monitor transaction validity in real-time:

```typescript
import { useTransactionTimebounds } from "@/hooks/use-transaction-timebounds"

function TransactionStatus({ tx }) {
  const status = useTransactionTimebounds(tx)

  if (!status.isValid) {
    return <div className="error">{status.reason}</div>
  }

  return (
    <div>
      <p>Transaction is valid</p>
      {status.expiresAt && (
        <p>Expires at: {status.expiresAt.toISOString()}</p>
      )}
      {status.timeRemaining && (
        <p>Time remaining: {Math.floor(status.timeRemaining / 1000)}s</p>
      )}
    </div>
  )
}
```

### 4. Transaction Queue Storage Utilities

Low-level utilities for direct storage access:

```typescript
import {
  getStoredTransactionQueue,
  storeTransactionQueue,
  clearStoredTransactionQueue,
  getStoredTransactionCount,
  hasPendingTransactions,
  getTransactionsByPhase,
  getOldestPendingTransaction,
  getExpiringTransactions,
  exportTransactionQueue,
  importTransactionQueue,
} from "@/lib/transaction-queue-storage"

// Get all stored transactions
const transactions = getStoredTransactionQueue()

// Check if there are pending transactions
if (hasPendingTransactions()) {
  console.log(`${getStoredTransactionCount()} pending transactions`)
}

// Get transactions in specific phase
const signingTxs = getTransactionsByPhase("signing")
const confirmingTxs = getTransactionsByPhase("confirming")

// Get oldest transaction
const oldest = getOldestPendingTransaction()

// Get transactions expiring soon (within 5 minutes)
const expiring = getExpiringTransactions(5 * 60 * 1000)

// Export for debugging
const backup = exportTransactionQueue()
console.log(backup)

// Import from backup
importTransactionQueue(backup)
```

## Data Structure

### QueuedTransaction

```typescript
interface QueuedTransaction<TType extends string = string, TMeta = unknown> {
  id: string // Unique identifier (e.g., "queued-tx-1")
  type: TType // Transaction type (e.g., "milestone_approval")
  label: string // Human-readable label
  phase: "signing" | "confirming" // Current phase
  meta: TMeta // Custom metadata
  txHash?: string // Blockchain transaction hash (after submission)
  enqueuedAt: number // Timestamp when added to queue (milliseconds)
  expiresAt?: number // Expiration timestamp (milliseconds)
}
```

### TransactionTimebounds

```typescript
interface TransactionTimebounds {
  minTime: number // Unix timestamp in seconds
  maxTime: number // Unix timestamp in seconds (0 = no limit)
}
```

## Best Practices

### 1. Set Appropriate Expiration Times

```typescript
// For short-lived transactions (e.g., immediate submission)
queue.enqueue({
  type: "quick_action",
  label: "Quick Action",
  phase: "signing",
  meta: {},
  expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
})

// For longer-lived transactions (e.g., user review)
queue.enqueue({
  type: "review_action",
  label: "Review Action",
  phase: "signing",
  meta: {},
  expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
})
```

### 2. Handle Expired Transactions

```typescript
const queue = useTransactionQueue()

// Periodically clean up expired transactions
useEffect(() => {
  const interval = setInterval(() => {
    queue.removeExpiredTransactions()
  }, 60000) // Every minute

  return () => clearInterval(interval)
}, [queue])
```

### 3. Warn Users About Expiring Transactions

```typescript
import { useTransactionExpiryWarning } from "@/hooks/use-transaction-timebounds"

function TransactionWarning({ tx }) {
  const isExpiring = useTransactionExpiryWarning(tx, 5 * 60 * 1000) // 5 min warning

  if (isExpiring) {
    return (
      <div className="warning">
        ⚠️ This transaction will expire soon. Please submit it now.
      </div>
    )
  }

  return null
}
```

### 4. Disable Persistence When Not Needed

```typescript
// For temporary, non-critical transactions
const queue = useTransactionQueue({
  persistToStorage: false,
})
```

## Storage Format

Transactions are stored in localStorage under the key `lernza_transaction_queue`:

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

## Error Handling

### Transaction Expired Before Submission

```typescript
const result = await signAndSubmit(transaction)

if (result.status === "FAILED" && result.error?.includes("expired")) {
  // Handle expired transaction
  queue.remove(transactionId)
  showNotification("Transaction expired. Please try again.")
}
```

### Storage Unavailable

The system gracefully handles localStorage unavailability:

```typescript
// If localStorage is not available, transactions won't persist
// but the queue will still work in-memory
const queue = useTransactionQueue()
// Works fine, just won't survive page refresh
```

## Debugging

### View Stored Transactions

```typescript
// In browser console
const stored = localStorage.getItem("lernza_transaction_queue")
console.log(JSON.parse(stored))
```

### Export Transactions

```typescript
import { exportTransactionQueue } from "@/lib/transaction-queue-storage"

const backup = exportTransactionQueue()
console.log(backup)
// Copy and save for debugging
```

### Clear All Transactions

```typescript
import { clearStoredTransactionQueue } from "@/lib/transaction-queue-storage"

clearStoredTransactionQueue()
```

## Migration Guide

If you need to migrate from the old transaction queue system:

1. The new system is backward compatible with in-memory queues
2. Existing transactions in memory will be preserved
3. New transactions will automatically persist to localStorage
4. No manual migration needed

## Performance Considerations

- **Storage Size**: Each transaction is ~200-500 bytes. 100 transactions ≈ 50KB
- **Cleanup**: Expired transactions are automatically removed
- **Polling**: Timebounds are checked every 10 seconds (configurable)
- **localStorage Limit**: Typically 5-10MB per domain (plenty of room)

## Troubleshooting

### Transactions Not Persisting

1. Check if localStorage is available: `typeof localStorage !== "undefined"`
2. Check browser console for errors
3. Verify `persistToStorage` option is `true` (default)
4. Check localStorage quota: `navigator.storage.estimate()`

### Transactions Expiring Too Quickly

1. Increase `defaultTTL` in `useTransactionQueue` options
2. Set explicit `expiresAt` when enqueueing
3. Check system clock is correct

### Timebounds Validation Failing

1. Verify transaction has valid timebounds
2. Check system time matches blockchain time
3. Ensure transaction was created recently (not stale)
