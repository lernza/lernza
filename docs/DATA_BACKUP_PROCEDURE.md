# Off-Chain Data Backup Procedure

This document outlines the operational guidelines and procedures for backing up, exporting, and restoring off-chain application state and pending transaction queues in Lernza.

## Overview

Lernza utilizes Stellar/Soroban smart contracts for on-chain state. Off-chain data (pending transaction queues, local user preferences, and client query caches) is stored locally in browser storage and indexed in client-side memory.

## Backup Methods

### 1. Client-Side Export (BackupManager)

The `BackupManager` utility (`frontend/src/lib/backup.ts`) provides automated JSON state export capabilities:

- **State Included**:
  - `lernza_tx_queue`: Pending and queued Soroban transactions.
  - `lernza_user_prefs`: User settings and active wallet session metadata.
  - `lernza_cache_*`: Cached quest and milestone details.

#### Usage via Code:
```ts
import { BackupManager } from "@/lib/backup"

// Export JSON object
const backup = BackupManager.exportBackup()

// Trigger file download
BackupManager.downloadBackup()
```

### 2. Manual Inspection & Recovery

To inspect or extract local data manually:

1. Open DevTools (`F12` or `Cmd+Option+I`) -> **Application** / **Storage** tab.
2. Under **Local Storage**, locate keys prefixed with `lernza_`.
3. Export the key values to a local JSON file.

### 3. Restoration Procedure

To restore state from a backup JSON file:

```ts
import { BackupManager } from "@/lib/backup"

const success = BackupManager.restoreBackup(backupObject)
if (success) {
  window.location.reload()
}
```

## Scheduled Maintenance & Retention

- **Pending Queues**: Recommended backup interval: Daily or prior to ledger maintenance.
- **Cache Eviction**: Expired cache entries (TTL > 5 minutes) are automatically pruned by `CacheManager`.
