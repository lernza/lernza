# Contract Initialisation Order

## Why order matters

`milestone::initialize` and `rewards::initialize` each store the address of
another contract at init time. If you pass a wrong or not-yet-deployed address
the stored pointer is permanently wrong and every cross-contract call will
fail. There is no re-initialise function.

## Exact deploy + init sequence

```
Step 1  Deploy  quest
Step 2  Deploy  certificate  (constructor arg: milestone address — see note)
Step 3  Deploy  milestone
Step 4  Deploy  rewards
Step 5  Init    milestone    milestone::initialize(admin, quest_addr, certificate_addr)
Step 6  Init    rewards      rewards::initialize(token_addr, quest_addr, milestone_addr)
```

> **Note on step 2 vs 3:** The `certificate` contract constructor takes the
> address of the contract that is allowed to mint certificates (i.e. the
> milestone contract). Because Soroban contract addresses are deterministic
> from the deployer account + salt, you can pre-compute the milestone address
> before deploying it and pass that pre-computed address to the certificate
> constructor. Alternatively, deploy certificate *after* milestone and pass the
> real address. Either approach is valid; the important constraint is that the
> address stored in certificate must equal the address of the deployed
> milestone contract.

## Failure modes if order is violated

| Mistake | Symptom |
|---------|---------|
| `milestone::initialize` called before quest is deployed | Stored quest address is invalid; `create_milestone` cross-contract call panics on first use |
| `rewards::initialize` called before milestone is deployed | Stored milestone address is invalid; `distribute_reward` panics when checking completion |
| `milestone::initialize` called twice | Returns `Error::AlreadyInitialized`; second call is a no-op (state unchanged) |
| `rewards::initialize` called twice | Returns `Error::AlreadyInitialized`; second call is a no-op (state unchanged) |
| Certificate constructor given wrong milestone address | `mint_quest_certificate` cross-contract call fails auth check at runtime |

## Testnet deploy example

```bash
# 1. Deploy quest
QUEST_ADDR=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/quest.wasm \
  --source <DEPLOYER_KEY> --network testnet)

# 2. Deploy milestone (address needed for certificate constructor)
MILESTONE_ADDR=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/milestone.wasm \
  --source <DEPLOYER_KEY> --network testnet)

# 3. Deploy certificate with milestone address as owner
CERT_ADDR=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/certificate.wasm \
  --source <DEPLOYER_KEY> --network testnet \
  -- --owner $MILESTONE_ADDR)

# 4. Deploy rewards
REWARDS_ADDR=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/rewards.wasm \
  --source <DEPLOYER_KEY> --network testnet)

# 5. Init milestone
stellar contract invoke --id $MILESTONE_ADDR \
  --source <DEPLOYER_KEY> --network testnet \
  -- initialize \
  --admin <ADMIN_ADDR> \
  --quest_contract $QUEST_ADDR \
  --certificate_contract $CERT_ADDR

# 6. Init rewards
stellar contract invoke --id $REWARDS_ADDR \
  --source <DEPLOYER_KEY> --network testnet \
  -- initialize \
  --token_addr <TOKEN_ADDR> \
  --quest_contract $QUEST_ADDR \
  --milestone_contract $MILESTONE_ADDR
```

## Verification

After deploying, confirm the stored addresses are correct:

```bash
stellar contract invoke --id $MILESTONE_ADDR --network testnet \
  -- get_quest_contract

stellar contract invoke --id $REWARDS_ADDR --network testnet \
  -- get_milestone_contract
```

Both should return the addresses you passed during initialisation.
