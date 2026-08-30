# Storage and TTL Strategy

All Soroban storage keys have documented TTL behavior. Persistent and temporary entries expire if not bumped.

| Key | Type | Bump (ledgers) | Threshold | Notes |
|-----|------|----------------|-----------|-------|
| Quest | persistent | 518400 (~30d) | 120960 (~7d) | Bumped on every quest interaction (enroll, fund, milestone update) |
| Enrollees | persistent | 518400 | 120960 | Bumped when enrollee set changes |
| PublicQuests | persistent | 518400 | 120960 | Bumped on public quest creation |
| NextId | instance | 518400 | 120960 | Instance TTL — bumped via `extend_instance_ttl` |
| InviteCommitment | temporary | 518400 | 120960 | Temporary — expires if not redeemed |
| PendingTransfer | temporary | 8640 (~6h) | 2160 | Short-lived ownership transfer |

## Health Checks

Run the diagnostic without private keys:

```bash
npx tsx scripts/check-storage-health.ts --contract <CONTRACT_ID> --rpc https://soroban-testnet.stellar.org
```

The script reports `ok`, `warning` (approaching threshold), or `critical` (at risk of expiry). CI runs this nightly.

## Deployment Notes

Expiry risks are surfaced in deployment and operations docs. Ensure every active quest flow bumps TTL; tests in `contracts/quest/tests` verify bumping for enroll, fund, and verify flows.

## Growth Expectations

See `estimateStorageGrowth()` in the health script: ~512 bytes per quest, 128 per milestone, 64 per enrollee. At 10k quests with 5 milestones and 100 enrollees average, estimate ~6 MB. Monitor ledger entries to avoid footprint limits.
