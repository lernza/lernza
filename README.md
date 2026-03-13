# Lernza

A learn-to-earn platform built on [Stellar](https://stellar.org). Create learning journeys, enroll learners, set milestones with token rewards. When learners complete milestones and get verified, they earn from the reward pool.

**The idea is simple:** someone creates a Quest (a structured learning journey), funds it with tokens, enrolls learners, and sets milestones. As learners hit their goals and get verified, tokens transfer automatically. Commitment through incentive.

**Real use case:** I want to help my brother learn to code. I create a Quest, enroll him, set milestones like "Build your first API" or "Deploy a smart contract," and fund it with tokens. He completes them, gets verified, earns. That's it.

## Tech Stack

| Layer | Tech |
|-------|------|
| Smart Contracts | Rust / [Soroban](https://soroban.stellar.org) (compiled to WASM) |
| Frontend | React + TypeScript + Vite |
| UI Components | [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS |
| Wallet | [Freighter](https://freighter.app) browser extension |
| Network | Stellar Testnet (mainnet later) |

## Project Structure

```
lernza/
├── contracts/
│   ├── workspace/        # Quest creation and enrollment management
│   ├── milestone/        # Milestone definition and completion tracking
│   └── rewards/          # Token pool management and distribution
├── frontend/
│   ├── src/
│   │   ├── components/   # UI components (shadcn/ui + custom)
│   │   ├── pages/        # Landing, Dashboard, Workspace, Profile
│   │   ├── hooks/        # React hooks (wallet, contracts)
│   │   └── lib/          # Utilities and mock data
│   └── ...
├── environments.toml     # Network configuration (dev/testnet/mainnet)
└── Cargo.toml            # Rust workspace root
```

## Prerequisites

- [Rust](https://rustup.rs) (latest stable)
- `wasm32-unknown-unknown` target: `rustup target add wasm32-unknown-unknown`
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli): `brew install stellar-cli`
- [Node.js](https://nodejs.org) 20+
- [Freighter wallet](https://freighter.app) browser extension (for testing)

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/lernza/lernza.git
cd lernza
```

### 2. Build and test contracts

```bash
# Run all contract tests
cargo test --workspace

# Build WASM artifacts
cargo build --target wasm32-unknown-unknown --release
```

### 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Connect wallet

Install the [Freighter](https://freighter.app) browser extension, create or import a wallet, and switch to **Testnet** in the Freighter settings.

## Smart Contracts

Three contracts handle the core logic:

**Workspace** -- Creates Quests (learning journeys), manages enrollment. The owner adds and removes learners.

**Milestone** -- Defines milestones within a Quest. Tracks completion per enrollee. Owner verifies completions and the contract returns the reward amount.

**Rewards** -- Holds token pools per Quest. When a milestone is verified, the frontend triggers token distribution from the pool to the learner.

### Contract Tests

```bash
# All tests
cargo test --workspace

# Individual contract
cargo test -p workspace
cargo test -p milestone
cargo test -p rewards
```

33 tests across all contracts covering auth, error handling, edge cases, and token flows.

## Contributing

We welcome contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

If you find a security vulnerability, please see [SECURITY.md](SECURITY.md) for responsible disclosure.

## License

[MIT](LICENSE)
