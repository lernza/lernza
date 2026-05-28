# Admin Rotation Runbook

This runbook is for emergency/admin key rotation across Lernza contracts on Stellar.

Goal: complete an actionable rotation in under 30 minutes.

## Scope

- `quest` contract (`transfer_admin` exists)
- `milestone` contract (no `transfer_admin` entrypoint in current code)
- `rewards` contract (no `transfer_admin` entrypoint in current code)
- `certificate` contract (`Ownable` owner model)

## Preconditions

- Stellar CLI is installed and configured for testnet/mainnet.
- You have:
  - current admin/owner secret loaded locally
  - new admin/owner address prepared
  - contract IDs for `quest`, `milestone`, `rewards`, `certificate`
- You have a secure channel to share new key custody confirmation.

## Environment

```bash
export NETWORK=<testnet|mainnet>
export SOURCE_OLD=<current-admin-identity>
export QUEST_ID=<quest-contract-id>
export MILESTONE_ID=<milestone-contract-id>
export REWARDS_ID=<rewards-contract-id>
export CERTIFICATE_ID=<certificate-contract-id>
export NEW_ADMIN=<G...new-admin-address>
```

## 0) Immediate Containment (2-5 min)

Pause mutating paths while rotating keys.

```bash
stellar contract invoke --network "$NETWORK" --source "$SOURCE_OLD" --id "$QUEST_ID" -- pause \
  --admin "$SOURCE_OLD"

stellar contract invoke --network "$NETWORK" --source "$SOURCE_OLD" --id "$MILESTONE_ID" -- pause \
  --admin "$SOURCE_OLD"
```

## 1) Quest Contract Admin Transfer (5 min)

`quest` supports direct admin transfer.

```bash
stellar contract invoke --network "$NETWORK" --source "$SOURCE_OLD" --id "$QUEST_ID" -- transfer_admin \
  --current-admin "$SOURCE_OLD" \
  --new-admin "$NEW_ADMIN"
```

Validation:

1. Confirm `admin_transferred` event in transaction logs.
2. Execute a quest admin-only call with new admin identity.

## 2) Milestone Contract Rotation (10 min)

Current `milestone` contract has admin pause/unpause controls but no `transfer_admin` method.
Use controlled redeploy + cutover:

1. Keep old milestone paused.
2. Deploy new milestone contract instance.
3. Initialize new milestone with `NEW_ADMIN`.
4. Point application/config to new milestone contract ID.
5. Resume operations on the new instance.

```bash
# example initialize call on newly deployed milestone contract
stellar contract invoke --network "$NETWORK" --source "$NEW_ADMIN" --id <new-milestone-id> -- initialize \
  --admin "$NEW_ADMIN" \
  --quest-contract "$QUEST_ID" \
  --certificate-contract "$CERTIFICATE_ID"
```

## 3) Rewards Contract Rotation (10 min)

Current `rewards` contract has no admin transfer entrypoint and stores contract wiring at initialization.
Use controlled redeploy + migration:

1. Keep quest/milestone paused during cutover.
2. Deploy new rewards contract instance.
3. Initialize with the existing token + quest + new milestone addresses.
4. Update frontend/env to new rewards contract ID.
5. For archived quests, recover refundable balances from old rewards via `refund_pool`.

```bash
stellar contract invoke --network "$NETWORK" --source "$NEW_ADMIN" --id <new-rewards-id> -- initialize \
  --token-addr <token-contract-address> \
  --quest-contract-addr "$QUEST_ID" \
  --milestone-contract-addr <new-milestone-id>
```

## 4) Certificate Contract Owner Rotation (5 min)

`certificate` uses `Ownable`. Rotate owner using the contract's owner-transfer method from the ownable interface.
If owner transfer is unavailable in deployed ABI, use controlled redeploy with `NEW_ADMIN` as constructor owner.

Validation:

1. New owner can run owner-only operation (`mint_certificate`/`revoke_certificate` path control).
2. Old owner can no longer execute owner-only operation.

## 5) Resume Operations + Verification (3 min)

```bash
stellar contract invoke --network "$NETWORK" --source "$NEW_ADMIN" --id "$QUEST_ID" -- unpause \
  --admin "$NEW_ADMIN"

stellar contract invoke --network "$NETWORK" --source "$NEW_ADMIN" --id <new-milestone-id> -- unpause \
  --admin "$NEW_ADMIN"
```

Post-rotation checklist:

1. All contract IDs in frontend/env/config are updated.
2. Old admin key is revoked from secrets manager/CI.
3. Admin-only smoke calls succeed with new admin.
4. Monitoring alerts show no failed auth spikes.

## Incident Notes Template

Record the following in the incident ticket:

1. Trigger reason and detection timestamp.
2. Old/new admin addresses.
3. Transaction hashes for each rotation step.
4. Service impact window start/end.
5. Follow-up tasks (e.g., add transfer endpoints for milestone/rewards if still missing).
