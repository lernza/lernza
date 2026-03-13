<p align="center">
  <img src="https://img.shields.io/badge/Stellar-Soroban-blue?style=flat-square" alt="Stellar Soroban">
  <img src="https://img.shields.io/badge/Rust-WASM-orange?style=flat-square" alt="Rust WASM">
  <img src="https://img.shields.io/badge/React_19-TypeScript-blue?style=flat-square" alt="React TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License">
  <a href="https://github.com/lernza/lernza/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22"><img src="https://img.shields.io/github/issues/lernza/lernza/good%20first%20issue?style=flat-square&color=7057ff&label=good%20first%20issues" alt="Good First Issues"></a>
</p>

# Lernza

**Learn-to-earn on Stellar.** Create quests, complete milestones, earn tokens.

Lernza is an open-source platform where anyone can create structured learning journeys (called **Quests**) and fund them with tokens. Learners enroll, hit milestones, get verified, and earn — all powered by smart contracts on the [Stellar](https://stellar.org) network.

> **The idea is simple:** I want to help my brother learn to code. I create a Quest, enroll him, set milestones like "Build your first API" and "Deploy a smart contract," and fund it with tokens. He completes them, gets verified, earns. That's Lernza. Commitment through incentive.

---

## Why Lernza?

Traditional learning platforms rely on willpower alone. Lernza adds **skin in the game** — real financial incentives locked in smart contracts. The creator puts up tokens, the learner earns them by proving they've done the work. No middleman, no trust required, just code.

**Use cases:**
- A company onboarding new devs with milestone-based token rewards
- A DAO funding community education with verifiable outcomes
- A teacher incentivizing students with micro-rewards for each module completed
- A mentor backing a mentee's learning journey with real stakes

---

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│  1. CREATE   │────►│  2. FUND     │────►│  3. LEARN     │────►│  4. EARN     │
│  Quest with  │     │  Deposit     │     │  Complete     │     │  Tokens      │
│  milestones  │     │  tokens into │     │  milestones & │     │  transfer    │
│              │     │  reward pool │     │  get verified │     │  automatically│
└─────────────┘     └──────────────┘     └───────────────┘     └──────────────┘
     Creator              Creator             Learner              Smart Contract
```

1. **Create** — A quest creator defines a learning journey with milestones (e.g., "Complete Rust basics", "Build a CLI tool", "Deploy to testnet")
2. **Fund** — The creator deposits tokens into the quest's reward pool via the rewards contract
3. **Learn** — Enrolled learners work through milestones and submit for verification
4. **Earn** — Once verified, the smart contract automatically distributes the reward to the learner

All state lives on-chain. No backend, no database, no middleman. The Stellar blockchain **is** the shared backend — every user reads and writes to the same on-chain state through their browser.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Smart Contracts** | [Rust](https://www.rust-lang.org/) / [Soroban SDK](https://soroban.stellar.org) | Three contracts compiled to WASM, deployed on Stellar |
| **Frontend** | [React 19](https://react.dev/) + [TypeScript 5.9](https://www.typescriptlang.org/) + [Vite 8](https://vite.dev/) | Single-page app with type-safe components |
| **UI** | [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS v4](https://tailwindcss.com/) | Component library with utility-first styling |
| **Wallet** | [Freighter](https://freighter.app/) (`@stellar/freighter-api`) | Browser extension for signing Stellar transactions |
| **Network** | [Stellar Testnet](https://developers.stellar.org/) | Soroban-enabled test network (mainnet later) |
| **CI** | [GitHub Actions](https://github.com/features/actions) | Automated testing, linting, building on every PR |

---

## Architecture

Lernza uses three independent smart contracts that the frontend orchestrates:

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (React)                    │
│  Builds transactions → Freighter signs → Stellar RPC    │
└──────────┬──────────────────┬──────────────────┬────────┘
           │                  │                  │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │    Quest     │   │  Milestone   │   │   Rewards   │
    │   Contract   │   │  Contract    │   │  Contract   │
    ├─────────────┤   ├─────────────┤   ├─────────────┤
    │ Create quest │   │ Define       │   │ Fund pool   │
    │ Enroll users │   │  milestones  │   │ Distribute  │
    │ Manage       │   │ Verify       │   │  rewards    │
    │  members     │   │  completion  │   │ Track       │
    │              │   │ Track        │   │  earnings   │
    │              │   │  progress    │   │             │
    └─────────────┘   └─────────────┘   └─────────────┘
           │                  │                  │
           └──────────────────┴──────────────────┘
                    Stellar Blockchain
                   (shared state layer)
```

**Why three contracts instead of one?**
- **Separation of concerns** — each contract has a single responsibility
- **Independent upgradability** — update rewards logic without touching quest management
- **Smaller WASM binaries** — each stays well under Soroban's 256KB limit
- **Clearer security boundaries** — auth and permissions are scoped per contract

**Why no backend?**
The blockchain is the backend. All state (quests, enrollments, milestones, rewards) lives on Stellar's ledger. Every user's browser reads from and writes to the same on-chain state via Stellar RPC nodes. This means zero infrastructure costs, zero database management, and full transparency.

---

## Smart Contracts

### Quest Contract (`contracts/workspace/`)

> *Being renamed to `contracts/quest/` — see [#1](https://github.com/lernza/lernza/issues/1)*

Manages the core Quest entity and enrollment.

| Function | Description |
|----------|-------------|
| `create_workspace(owner, name, description, token_addr)` | Create a new quest with a reward token |
| `add_enrollee(owner, id, enrollee)` | Enroll a learner (owner only) |
| `remove_enrollee(owner, id, enrollee)` | Remove a learner (owner only) |
| `get_workspace(id)` | Get quest details |
| `get_enrollees(id)` | List all enrolled learners |
| `is_enrollee(id, user)` | Check if a user is enrolled |
| `get_workspace_count()` | Total quests created |

**Storage:** `Instance` for counters, `Persistent` for quest data and enrollee lists.

### Milestone Contract (`contracts/milestone/`)

Defines milestones within a quest and tracks completions.

| Function | Description |
|----------|-------------|
| `create_milestone(owner, workspace_id, title, description, reward_amount)` | Add a milestone to a quest |
| `verify_completion(owner, workspace_id, milestone_id, enrollee)` | Verify a learner's milestone completion (returns reward amount) |
| `get_milestone(workspace_id, milestone_id)` | Get milestone details |
| `get_milestones(workspace_id)` | List all milestones in a quest |
| `is_completed(workspace_id, milestone_id, enrollee)` | Check completion status |
| `get_enrollee_completions(workspace_id, enrollee)` | Count completions for a learner |

**Auth model:** The first milestone created for a quest caches the owner. Only the quest owner can verify completions.

### Rewards Contract (`contracts/rewards/`)

Manages token pools and distributes rewards using the [Stellar Asset Contract (SAC)](https://soroban.stellar.org/docs/advanced-tutorials/stellar-asset-contract).

| Function | Description |
|----------|-------------|
| `initialize(token_addr)` | Set the reward token (one-time) |
| `fund_workspace(funder, workspace_id, amount)` | Deposit tokens into a quest's pool (funder becomes authority) |
| `distribute_reward(authority, workspace_id, enrollee, amount)` | Send reward to a learner (authority only) |
| `get_pool_balance(workspace_id)` | Check remaining pool balance |
| `get_user_earnings(user)` | Total tokens earned by a user |
| `get_total_distributed()` | Platform-wide total distributed |

**Authority model:** Whoever first funds a quest becomes its authority — only they can trigger reward distributions for that quest.

### Contract Patterns

- **Auth:** `address.require_auth()` + storage-based ownership checks
- **Storage:** Instance (counters), Persistent (entities/auth), Temporary (reserved for cooldowns)
- **TTL:** Bump 518,400 ledgers (~30 days), Threshold 120,960 (~7 days)
- **Errors:** `#[contracterror]` enums with descriptive variants
- **No cross-contract calls** in MVP — the frontend orchestrates the flow between contracts

---

## Project Structure

```
lernza/
├── contracts/
│   ├── workspace/          # Quest creation and enrollment (→ being renamed to quest/)
│   │   ├── src/lib.rs      # Contract implementation (10 tests)
│   │   └── Cargo.toml
│   ├── milestone/          # Milestone definition and completion tracking
│   │   ├── src/lib.rs      # Contract implementation (12 tests)
│   │   └── Cargo.toml
│   └── rewards/            # Token pool management and reward distribution
│       ├── src/lib.rs      # Contract implementation (11 tests)
│       └── Cargo.toml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/         # shadcn/ui components (Button, Card, Badge, Progress)
│   │   │   └── navbar.tsx  # Navigation with wallet connection
│   │   ├── pages/          # Landing, Dashboard, Workspace detail, Profile
│   │   ├── hooks/          # useWallet (Freighter integration)
│   │   └── lib/            # Utilities (cn, shortenAddress, formatTokens) + mock data
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.app.json
│   └── package.json
├── .github/
│   ├── workflows/
│   │   ├── ci.yml          # Lint, test, build on every PR
│   │   └── release.yml     # Build + publish WASM on tag
│   ├── ISSUE_TEMPLATE/     # Bug report, feature request templates
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml      # Automated dependency updates
├── Cargo.toml              # Rust workspace root
├── CONTRIBUTING.md          # How to contribute
├── CODE_OF_CONDUCT.md       # Community standards
├── SECURITY.md              # Vulnerability reporting
└── LICENSE                  # MIT
```

---

## Getting Started

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Rust | Latest stable | [rustup.rs](https://rustup.rs) |
| WASM target | — | `rustup target add wasm32-unknown-unknown` |
| Stellar CLI | 25.x | `brew install stellar-cli` or [see docs](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli) |
| Node.js | 22+ | [nodejs.org](https://nodejs.org) |
| Freighter | Latest | [freighter.app](https://freighter.app) (Chrome/Firefox extension) |

### 1. Clone and build contracts

```bash
git clone https://github.com/lernza/lernza.git
cd lernza

# Run all 33 contract tests
cargo test --workspace

# Build optimized WASM binaries
stellar contract build
```

### 2. Run the frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 3. Connect your wallet

1. Install the [Freighter](https://freighter.app) browser extension
2. Create or import a wallet
3. Switch to **Testnet** in Freighter settings (Settings → Network → Testnet)
4. Fund your testnet account at the [Stellar Friendbot](https://laboratory.stellar.org/#account-creator?network=test)
5. Click "Connect Wallet" in the Lernza app

### 4. Run individual contract tests

```bash
cargo test -p workspace    # 10 tests — quest CRUD, enrollment
cargo test -p milestone    # 12 tests — milestones, verification, completions
cargo test -p rewards      # 11 tests — funding, distribution, earnings
```

---

## Roadmap

We're actively building Lernza in the open. Here's what's in progress:

| Milestone | Status | Focus |
|-----------|--------|-------|
| [M1: Quest Foundation](https://github.com/lernza/lernza/milestone/1) | In Progress | Rename workspace → Quest, input validation, dev tooling |
| [M2: Quest Engine](https://github.com/lernza/lernza/milestone/2) | Upcoming | Visibility, deadlines, funding models, enrollment caps |
| [M3: Neo-Brutalism UI](https://github.com/lernza/lernza/milestone/3) | Upcoming | Design system overhaul, component redesign, routing |
| [M4: Full Stack Integration](https://github.com/lernza/lernza/milestone/4) | Upcoming | Wire frontend to contracts, build all core pages |
| [M5: Quality, Docs & Advanced Features](https://github.com/lernza/lernza/milestone/5) | Upcoming | Testing, security audit, documentation, advanced features |

See the full [project board](https://github.com/orgs/lernza/projects/1) for all 64 issues.

---

## Contributing

We'd love your help. Whether it's fixing a bug, building a feature, improving docs, or just asking a good question — all contributions are welcome.

**Quick start:**

1. Check out the [good first issues](https://github.com/lernza/lernza/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) — these are specifically tagged for new contributors
2. Read [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, commit conventions, and PR guidelines
3. Pick an issue, comment that you're working on it, and open a PR

**Areas where we especially need help:**
- **Smart contracts (Rust)** — new features, tests, security hardening
- **Frontend (React/TypeScript)** — UI redesign, new pages, wallet integration
- **Documentation** — guides, API reference, architecture docs
- **Design** — neo-brutalism design system, component design, UX flows

See [SECURITY.md](SECURITY.md) for responsible vulnerability disclosure.

---

## Community

- [GitHub Discussions](https://github.com/lernza/lernza/discussions) — questions, ideas, feedback
- [Issues](https://github.com/lernza/lernza/issues) — bug reports and feature requests

---

## License

[MIT](LICENSE) — use it, fork it, build on it.
