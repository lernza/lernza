# Data Retention and Browser-Storage Policy

Lernza is a fully on-chain application with no backend server. All persistent
state lives on the Stellar ledger. The frontend uses browser storage only for
UI preferences and ephemeral transaction context. This document inventories
every storage key, its purpose, retention period, and deletion behavior.

## Browser Storage Inventory

### LocalStorage

| Key | Purpose | Retention | Auto-Pruned | Sensitive |
|-----|---------|-----------|-------------|-----------|
| `lernza_wallet_address` | Connected wallet public key | Until disconnect | No | No (public key only) |
| `lernza_wallet_network` | Selected network (testnet/mainnet) | Until changed | No | No |
| `lernza_onboarding_complete` | Onboarding flow completed flag | Permanent | No | No |
| `lernza_theme` | UI theme preference (light/dark) | Permanent | No | No |
| `lernza_tx_queue` | Pending transaction queue (XDR + metadata) | 30 minutes | Yes (on page load) | Yes (contains unsigned XDR) |

### SessionStorage

| Key | Purpose | Retention | Auto-Pruned | Sensitive |
|-----|---------|-----------|-------------|-----------|
| `lernza_pending_quest` | Quest creation form draft | Tab session | Yes (on tab close) | No |

### IndexedDB

No IndexedDB usage at this time.

## Retention Rules

1. **Wallet keys** — Only the public address is stored. Private keys and
   signing secrets are never persisted in browser storage.
2. **Transaction queue** — Entries older than 30 minutes are pruned on page
   load. The queue is cleared entirely on wallet disconnect.
3. **Onboarding flag** — Retained permanently to avoid re-showing the
   onboarding flow. Cleared only by explicit user action ("Reset app data").
4. **Theme preference** — Retained permanently. Cleared on "Reset app data."

## Sensitive Data Prohibition

The following **must never** be stored in localStorage, sessionStorage, or
IndexedDB:

- Private keys or seed phrases
- Wallet signing passwords
- API tokens or session credentials
- Personally identifiable information (PII)
- Signed transaction XDR (only unsigned XDR is queued)

## User-Initiated Deletion

Users can clear non-essential data via the "Reset app data" button in
Settings. This clears:

- `lernza_onboarding_complete`
- `lernza_theme`
- `lernza_tx_queue`
- `lernza_pending_quest`

Wallet connection data (`lernza_wallet_address`, `lernza_wallet_network`)
is cleared by disconnecting the wallet.

## Automatic Pruning

The transaction queue is pruned automatically:

- On every page load, entries with `createdAt` older than 30 minutes are
  removed.
- On wallet disconnect, the entire queue is cleared.
- On network switch, stale entries from the previous network are removed.

## Related Documents

- [CONTRIBUTING.md](../CONTRIBUTING.md) — contributor guidelines
- [SECURITY.md](../SECURITY.md) — security assumptions
- [docs/THREAT_MODEL.md](THREAT_MODEL.md) — threat model including client-side risks
