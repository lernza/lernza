<p align="center">
  <a href="https://lernza.com">
    <img src=".github/assets/banner.svg" alt="Lernza — Learn. Earn. On-chain." width="100%" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/lernza/lernza"><img src="https://img.shields.io/github/stars/lernza/lernza?style=flat-square&color=FACC15&labelColor=000&logo=github&logoColor=FACC15" alt="Stars"></a>&nbsp;
  <a href="https://stellar.org"><img src="https://img.shields.io/badge/Stellar-Soroban-FACC15?style=flat-square&logo=stellar&logoColor=FACC15&labelColor=000" alt="Stellar Soroban"></a>&nbsp;
  <a href="https://github.com/lernza/lernza/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22"><img src="https://img.shields.io/github/issues/lernza/lernza/good%20first%20issue?style=flat-square&color=FACC15&labelColor=000&label=good%20first%20issues&logo=git&logoColor=FACC15" alt="Good First Issues"></a>&nbsp;
  <a href="https://github.com/lernza/lernza/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-FACC15?style=flat-square&labelColor=000&logo=opensourceinitiative&logoColor=FACC15" alt="MIT License"></a>
</p>

> **The idea is simple:** I want to help my brother learn to code. I create a Quest, enroll him, set milestones like "Build your first API" and "Deploy a smart contract," and fund it with tokens. He completes them, gets verified, earns. That's Lernza. **Commitment through incentive.**

## Why Lernza?

Traditional learning platforms rely on willpower alone. Lernza adds **skin in the game** — real financial incentives locked in smart contracts. The creator puts up tokens, the learner earns them by proving they've done the work. No middleman, no trust required, just code.

<table width="100%">
  <tr>
    <td width="50%">
      <strong>For companies</strong>
      <br/>
      Onboard new devs with milestone-based token rewards
    </td>
    <td width="50%">
      <strong>For DAOs</strong>
      <br/>
      Fund community education with verifiable outcomes
    </td>
  </tr>
  <tr>
    <td width="50%">
      <strong>For teachers</strong>
      <br/>
      Incentivize students with micro-rewards per module
    </td>
    <td width="50%">
      <strong>For mentors</strong>
      <br/>
      Back a mentee's learning journey with real stakes
    </td>
  </tr>
</table>

<br />

## How It Works

<p align="center">
  <img src=".github/assets/how-it-works.svg" alt="How Lernza works: Create → Fund → Learn → Earn" width="100%" />
</p>

<br />

## Getting Started

```bash
git clone https://github.com/lernza/lernza.git
cd lernza

# Smart contracts
cargo test --workspace      # 33 tests
stellar contract build      # Optimized WASM

# Frontend
cd frontend
pnpm install
pnpm dev                    # → localhost:5173
```

Install [Freighter](https://freighter.app), switch to **Testnet**, and connect.

<br />

## Roadmap

| Milestone | Status | Focus |
|:----------|:-------|:------|
| **M1** Quest Foundation | In Progress | Rename workspace → quest, validation, tooling |
| **M2** Quest Engine | Upcoming | Visibility, deadlines, funding models |
| **M3** Neo-Brutalism UI | Upcoming | Design system, component redesign, routing |
| **M4** Full Stack Integration | Upcoming | Wire frontend to contracts |
| **M5** Quality & Advanced | Upcoming | Security audit, docs, advanced features |

See the full [project board](https://github.com/orgs/lernza/projects/1) for all 64 issues.

<br />

## Dive Deeper

<details>
<summary><strong>Architecture</strong></summary>
<br/>

Three independent Soroban smart contracts orchestrated by the frontend:

<p align="center">
  <img src=".github/assets/architecture.svg" alt="Lernza architecture" width="100%" />
</p>

**Why three contracts?**
- **Separation of concerns** — each contract has a single responsibility
- **Independent upgradability** — update rewards logic without touching quest management
- **Smaller WASM binaries** — each stays well under Soroban's 256KB limit
- **Clearer security boundaries** — auth and permissions are scoped per contract

**Why no backend?**
The blockchain IS the backend. All state lives on Stellar's ledger. Zero infrastructure costs, zero database management, full transparency.

</details>

<details>
<summary><strong>Tech Stack</strong></summary>
<br/>

| Layer | Technology |
|:------|:-----------|
| **Smart Contracts** | Rust + Soroban SDK — 3 contracts compiled to WASM |
| **Frontend** | React 19 + TypeScript 5.9 + Vite 8 |
| **UI** | shadcn/ui + Tailwind CSS v4 — neo-brutalist design system |
| **Wallet** | Freighter — Stellar browser wallet |
| **Network** | Stellar Testnet (Soroban-enabled) |
| **CI** | GitHub Actions — lint, test, build on every PR |

</details>

<details>
<summary><strong>Smart Contracts</strong></summary>
<br/>

**Quest Contract** — `contracts/workspace/`

> *Being renamed to `contracts/quest/` — see [#1](https://github.com/lernza/lernza/issues/1)*

| Function | Description |
|:---------|:------------|
| `create_workspace(owner, name, description, token_addr)` | Create a new quest with a reward token |
| `add_enrollee(owner, id, enrollee)` | Enroll a learner (owner only) |
| `remove_enrollee(owner, id, enrollee)` | Remove a learner (owner only) |
| `get_workspace(id)` / `get_enrollees(id)` | Query quest data |
| `is_enrollee(id, user)` | Check enrollment status |

**Milestone Contract** — `contracts/milestone/`

| Function | Description |
|:---------|:------------|
| `create_milestone(owner, ws_id, title, desc, reward_amount)` | Add a milestone to a quest |
| `verify_completion(owner, ws_id, ms_id, enrollee)` | Verify a learner completed a milestone |
| `get_milestones(ws_id)` | List all milestones in a quest |
| `is_completed(ws_id, ms_id, enrollee)` | Check completion status |

**Rewards Contract** — `contracts/rewards/`

| Function | Description |
|:---------|:------------|
| `initialize(token_addr)` | Set the reward token (one-time) |
| `fund_workspace(funder, ws_id, amount)` | Deposit tokens into a quest's pool |
| `distribute_reward(authority, ws_id, enrollee, amount)` | Send reward to a learner |
| `get_pool_balance(ws_id)` / `get_user_earnings(user)` | Query balances |

**Patterns:**
- **Auth:** `address.require_auth()` + storage-based ownership checks
- **Storage:** Instance (counters), Persistent (entities/auth), Temporary (cooldowns)
- **TTL:** Bump 518,400 ledgers (~30 days), Threshold 120,960 (~7 days)
- **No cross-contract calls** — frontend orchestrates the flow

</details>

<details>
<summary><strong>Project Structure</strong></summary>
<br/>

```
lernza/
├── contracts/
│   ├── workspace/          # Quest creation + enrollment (10 tests)
│   ├── milestone/          # Milestone definition + completion (12 tests)
│   └── rewards/            # Token pools + reward distribution (11 tests)
├── frontend/
│   ├── src/
│   │   ├── components/     # shadcn/ui + Navbar
│   │   ├── pages/          # Landing, Dashboard, Workspace, Profile
│   │   ├── hooks/          # useWallet (Freighter)
│   │   └── lib/            # Utilities + mock data
│   └── public/             # Logo, favicon, OG image
├── .github/
│   ├── workflows/          # CI + Release
│   ├── assets/             # README SVGs
│   └── ISSUE_TEMPLATE/
├── CONTRIBUTING.md
├── SECURITY.md
└── LICENSE                 # MIT
```

</details>

<details>
<summary><strong>Prerequisites</strong></summary>
<br/>

| Tool | Install |
|:-----|:--------|
| **Rust** + WASM target | [rustup.rs](https://rustup.rs) → `rustup target add wasm32-unknown-unknown` |
| **Stellar CLI** 25.x | `brew install stellar-cli` or [docs](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli) |
| **Node.js** 22+ | [nodejs.org](https://nodejs.org) |
| **Freighter** wallet | [freighter.app](https://freighter.app) (browser extension) |

</details>

<br />

## Contributing

We'd love your help. Here's how to jump in:

1. Browse the [good first issues](https://github.com/lernza/lernza/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) — they're scoped and ready to pick up
2. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup and conventions
3. Comment on an issue to claim it, then open a PR

See [SECURITY.md](SECURITY.md) for vulnerability disclosure.

<br />

<p align="center">
  <a href="https://github.com/lernza/lernza">
    <img src=".github/assets/star-repo.svg" alt="Star this repo" width="100%" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/lernza/lernza/stargazers">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=lernza/lernza&type=Date&theme=dark&lernza" />
      <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=lernza/lernza&type=Date&lernza" />
      <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=lernza/lernza&type=Date&lernza" width="100%" />
    </picture>
  </a>
</p>

<br />

<h3 align="center">Contributors</h3>

<p align="center">
  <a href="https://github.com/lernza/lernza/graphs/contributors">
    <img src="https://stg.contrib.rocks/image?repo=lernza/lernza" alt="Contributors" />
  </a>
</p>

<br />

---

<p align="center">
  <sub><strong>Commitment through incentive.</strong> Licensed under <a href="LICENSE">MIT</a>.</sub>
</p>
