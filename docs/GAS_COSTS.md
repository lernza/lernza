# Smart Contract Gas & Resource Costs Documentation

This document provides resource utilization estimates and gas cost guidance for executing transactions on Lernza's Soroban smart contracts (`quest`, `milestone`, `rewards`, `certificate`).

---

## 1. Overview of Soroban Resource Metering

Soroban transaction fees are determined by resource metering rather than gas units alone. Each contract invocation consumes resources across six primary dimensions:

| Resource Metric | Description | Fee Impact |
|---|---|---|
| **CPU Instructions** | Number of CPU cycles executed by the Soroban VM. | Low to Moderate |
| **Memory (Bytes)** | RAM allocated during WASM execution. | Low |
| **Ledger Reads (Entries)** | Number of storage keys read from ledger state. | Moderate |
| **Ledger Writes (Entries)** | Number of new or updated keys written to ledger state. | High |
| **Read Bytes** | Total size of data payload read from ledger. | Moderate |
| **Write Bytes** | Total size of data payload written to ledger. | High |

Additionally, Soroban transactions require a **Base Fee** (minimum 100 stroops = 0.00001 XLM per transaction) plus a **Rent Fee** for persistent storage entries that require TTL extensions (`BUMP = 518,400` ledgers ~30 days).

---

## 2. Estimated Costs by Contract

*Note: All values below are estimated averages on Stellar Testnet/Mainnet under standard payload sizes. Exact execution costs vary with vector sizes and state payload lengths.*

### 2.1 Quest Contract (`contracts/quest`)

| Function | CPU Instructions | Memory (KB) | Ledger Reads | Ledger Writes | Est. Fee Range (XLM) |
|---|---|---|---|---|---|
| `create_quest` | ~650,000 | ~140 | 3 | 3 | 0.005 - 0.012 XLM |
| `update_quest` | ~450,000 | ~110 | 2 | 1 | 0.003 - 0.008 XLM |
| `add_enrollee` | ~520,000 | ~125 | 3 | 2 | 0.004 - 0.010 XLM |
| `leave_quest` | ~480,000 | ~115 | 3 | 2 | 0.004 - 0.009 XLM |
| `remove_enrollee` | ~490,000 | ~118 | 3 | 2 | 0.004 - 0.009 XLM |
| `archive_quest` | ~380,000 | ~95 | 2 | 1 | 0.003 - 0.006 XLM |
| `set_visibility` | ~360,000 | ~90 | 2 | 1 | 0.003 - 0.005 XLM |
| `get_quest` *(read-only)* | ~180,000 | ~45 | 1 | 0 | 0.000 XLM (Simulation) |
| `get_enrollees` *(read-only)* | ~220,000 | ~60 | 1 | 0 | 0.000 XLM (Simulation) |

---

### 2.2 Milestone Contract (`contracts/milestone`)

| Function | CPU Instructions | Memory (KB) | Ledger Reads | Ledger Writes | Est. Fee Range (XLM) |
|---|---|---|---|---|---|
| `create_milestone` | ~580,000 | ~130 | 3 | 2 | 0.004 - 0.010 XLM |
| `submit_for_review` | ~420,000 | ~105 | 2 | 1 | 0.003 - 0.007 XLM |
| `verify_completion` | ~610,000 | ~145 | 4 | 2 | 0.005 - 0.011 XLM |
| `approve_completion` (peer) | ~590,000 | ~140 | 4 | 2 | 0.005 - 0.010 XLM |
| `set_verification_mode` | ~340,000 | ~85 | 2 | 1 | 0.002 - 0.005 XLM |
| `set_distribution_mode` | ~340,000 | ~85 | 2 | 1 | 0.002 - 0.005 XLM |
| `get_milestone` *(read-only)* | ~160,000 | ~40 | 1 | 0 | 0.000 XLM (Simulation) |

---

### 2.3 Rewards Contract (`contracts/rewards`)

| Function | CPU Instructions | Memory (KB) | Ledger Reads | Ledger Writes | Est. Fee Range (XLM) |
|---|---|---|---|---|---|
| `initialize` | ~400,000 | ~100 | 1 | 3 | 0.004 - 0.008 XLM |
| `fund_quest` | ~780,000 | ~180 | 4 | 3 | 0.008 - 0.018 XLM |
| `distribute_reward` | ~850,000 | ~195 | 5 | 3 | 0.009 - 0.020 XLM |
| `get_pool_balance` *(read-only)*| ~150,000 | ~35 | 1 | 0 | 0.000 XLM (Simulation) |
| `get_user_earnings` *(read-only)*| ~150,000 | ~35 | 1 | 0 | 0.000 XLM (Simulation) |

---

### 2.4 Certificate Contract (`contracts/certificate`)

| Function | CPU Instructions | Memory (KB) | Ledger Reads | Ledger Writes | Est. Fee Range (XLM) |
|---|---|---|---|---|---|
| `mint_certificate` | ~720,000 | ~165 | 4 | 3 | 0.007 - 0.015 XLM |
| `revoke_certificate` | ~460,000 | ~110 | 3 | 2 | 0.004 - 0.008 XLM |
| `get_certificate_metadata` | ~170,000 | ~40 | 1 | 0 | 0.000 XLM (Simulation) |

---

## 3. Factors Influencing Gas Costs

1. **Vector & Payload Sizes**: Operations involving large vectors (e.g. adding enrollees or milestone lists) scale lineary in memory and read/write byte costs.
2. **Storage Tiering**:
   - **Instance Storage**: Fast, low-cost access for quest configuration counters.
   - **Persistent Storage**: Holds entity keys (quests, milestones, pools) which require TTL extensions and carry higher write costs.
3. **Stellar Asset Contract (SAC) Transfers**: `distribute_reward` and `fund_quest` invoke cross-contract calls to SAC tokens, incurring additional transfer authorization checks and CPU footprint.

---

## 4. Optimization Recommendations

- **Use Pagination**: For enrollee progress or completion queries, use bounded limits (`offset`, `limit`) to minimize RPC simulation memory.
- **Batch Milestone Operations**: Batch milestone creation or approvals where supported to reduce transaction base fee overhead.
- **Pre-simulate Transactions**: Use frontend RPC pre-simulation (`simulateTransaction`) to fetch precise resource footrpints before asking users to sign in Freighter.
