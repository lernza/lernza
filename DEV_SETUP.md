# Development Environment Setup Guide

This guide covers everything you need to set up a complete Lernza development environment from scratch. Lernza consists of Soroban smart contracts (Rust) and a React frontend (TypeScript).

## Prerequisites Checklist

Before you begin, ensure you have:

- [ ] **macOS, Linux, or WSL2** (native Windows not recommended)
- [ ] **Git** installed (`git --version`)
- [ ] **Rust 1.80+** (stable toolchain)
- [ ] **Node.js 24.x** (LTS recommended)
- [ ] **pnpm 9.x** (frontend package manager)
- [ ] **Stellar CLI v25.2+**
- [ ] **WASM target for Rust** (`wasm32-unknown-unknown`)

---

## Full System Setup

### 1. Install Rust

Lernza contracts require Rust to compile to WASM. Install the stable toolchain:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Verify the installation:

```bash
rustc --version  # Should be 1.80 or higher
cargo --version
```

### 2. Add WASM Target

The contracts compile to WebAssembly. Add the target:

```bash
rustup target add wasm32-unknown-unknown
```

Verify:

```bash
rustup target list | grep wasm32-unknown-unknown
```

### 3. Install Node.js 24

Use **nvm** (Node Version Manager) to install Node.js 24:

#### On macOS (with Homebrew):

```bash
brew install node@24
brew link node@24 --force

# Verify
node --version  # Should be v24.x.x
```

#### On Linux / WSL2:

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version  # Should be v24.x.x
```

#### Using nvm (macOS/Linux/WSL2):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 24
nvm use 24

# Verify
node --version  # Should be v24.x.x
```

### 4. Install pnpm 9

pnpm is a fast, disk-space efficient package manager. Install it globally:

```bash
npm install -g pnpm@9

# Verify
pnpm --version  # Should be 9.x.x
```

### 5. Install Stellar CLI v25.2+

The Stellar CLI is required to build Soroban contracts. Install it:

#### On macOS (with Homebrew):

```bash
brew install stellar-cli
```

#### On Linux / WSL2:

```bash
# Download latest release
STELLAR_VERSION="25.2.0"
curl -fsSL https://github.com/stellar/stellar-cli/releases/download/v${STELLAR_VERSION}/stellar-cli-${STELLAR_VERSION}-x86_64-unknown-linux-gnu.tar.gz \
  | tar xz -C /usr/local/bin

# Verify
stellar version
```

#### On macOS (manual download):

```bash
# Visit https://github.com/stellar/stellar-cli/releases
# Download the x86_64-apple-darwin.tar.gz file
# Extract to /usr/local/bin
tar xz -C /usr/local/bin -f stellar-cli-25.2.0-x86_64-apple-darwin.tar.gz

# Verify
stellar version
```

### 6. Clone the Repository
# Development Environment Setup

## Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli) v25.1.0+
- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) v10+

## Clone & Install

```bash
git clone https://github.com/lernza/lernza.git
cd lernza
```

---

## Contract Development Setup

The Lernza contracts are in `contracts/` and use Soroban SDK v25.

### Install Dependencies

```bash
# Rust dependencies are managed by Cargo
# No additional installation needed
```

### Verify Installation

```bash
cargo test --workspace
```

This runs all 33 contract tests. You should see:

```
test result: ok. X passed; 0 failed; 0 ignored; 0 measured
```

### Build Contracts

Compile to optimized WASM:

```bash
stellar contract build --manifest-path contracts/workspace/Cargo.toml --release
stellar contract build --manifest-path contracts/milestone/Cargo.toml --release
stellar contract build --manifest-path contracts/rewards/Cargo.toml --release
```

Or use the provided Makefile:

```bash
cd contracts/workspace && make build
cd contracts/milestone && make build
cd contracts/rewards && make build
```

### Common Contract Commands

```bash
# Run all tests
cargo test --workspace

# Run tests for a single contract
cargo test -p workspace
cargo test -p milestone
cargo test -p rewards

# Run a specific test
cargo test -p milestone -- test_name

# Format code
cargo fmt --all

# Lint
cargo clippy --workspace --all-targets

# Build WASM
stellar contract build --manifest-path contracts/workspace/Cargo.toml --release
```

---

## Frontend Development Setup

The frontend is a React 19 + TypeScript app with Vite, Tailwind CSS, and shadcn/ui components.

### Install Dependencies

```bash
cd frontend
pnpm install --frozen-lockfile
```

`--frozen-lockfile` ensures reproducible installs (same as all CI environments).

### Start Development Server

```bash
pnpm dev
```

The app will start on `http://localhost:5173`

In your browser:
1. Install [Freighter wallet extension](https://freighter.app)
2. Switch to **Testnet** in Freighter settings
3. Return to localhost:5173 and connect your wallet

### Build for Production

```bash
pnpm build
```

This runs type-checking (`tsc -b`) and builds optimized bundles in `dist/`.

### Linting

Check for code style and potential issues:

```bash
pnpm lint
```

### Common Frontend Commands

```bash
# Development server
pnpm dev

# Production build
pnpm build

# Type-check only
pnpm tsc -b

# Lint
pnpm lint

# Preview production build locally
pnpm preview
```

---

## Deploying Contracts to Testnet

This section walks you through building the contracts from source and deploying them to Stellar Testnet so the frontend can connect to your own contract instances.

### 1. Get a Testnet Keypair via Friendbot

Generate a new keypair and fund it with testnet XLM using Friendbot:

```bash
# Generate a new keypair
stellar keys generate --global deployer --network testnet

# Fund it via Friendbot (gives 10,000 XLM on testnet)
stellar keys fund deployer --network testnet

# Confirm the balance
stellar keys address deployer
```

### 2. Build the Contracts to WASM

From the repo root, compile each contract to optimized WASM:

```bash
stellar contract build --manifest-path contracts/quest/Cargo.toml --release
stellar contract build --manifest-path contracts/milestone/Cargo.toml --release
stellar contract build --manifest-path contracts/rewards/Cargo.toml --release
```

The compiled `.wasm` files will be in `target/wasm32-unknown-unknown/release/`.

### 3. Upload and Deploy Each Contract

Deploy each contract to testnet and capture the contract IDs:

```bash
# Deploy quest contract
QUEST_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/quest.wasm \
  --source deployer \
  --network testnet)
echo "Quest contract: $QUEST_ID"

# Deploy milestone contract
MILESTONE_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/milestone.wasm \
  --source deployer \
  --network testnet)
echo "Milestone contract: $MILESTONE_ID"

# Deploy rewards contract
REWARDS_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/rewards.wasm \
  --source deployer \
  --network testnet)
echo "Rewards contract: $REWARDS_ID"
```

### 4. Initialize the Contracts

Each contract requires an `initialize` call with the admin address:

```bash
ADMIN=$(stellar keys address deployer)

stellar contract invoke --id $QUEST_ID --source deployer --network testnet \
  -- initialize --admin $ADMIN

stellar contract invoke --id $MILESTONE_ID --source deployer --network testnet \
  -- initialize --admin $ADMIN

stellar contract invoke --id $REWARDS_ID --source deployer --network testnet \
  -- initialize --admin $ADMIN
```

### 5. Create `frontend/.env.local` from the Example

```bash
cp frontend/.env.example frontend/.env.local
```

Then edit `frontend/.env.local` and fill in your deployed contract IDs:

```env
# Testnet RPC
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Your deployed contract addresses
VITE_QUEST_CONTRACT_ID=<your QUEST_ID>
VITE_MILESTONE_CONTRACT_ID=<your MILESTONE_ID>
VITE_REWARDS_CONTRACT_ID=<your REWARDS_ID>
```

> Never commit `.env.local` to Git — it is already in `.gitignore`.

### 6. Start the Frontend

```bash
cd frontend
pnpm dev
```

Open `http://localhost:5173`, connect Freighter (set to Testnet), and the app will use your deployed contracts.

---

## Environment Variables

The frontend supports optional environment variables for configuration. Create a `.env.local` file in the `frontend/` directory:

```bash
cd frontend
touch .env.local
```

### Supported Variables

```env
# Optional: Soroban RPC endpoint (defaults to testnet)
# VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# Optional: Network passphrase
# VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Optional: Contract addresses (if deploying custom contracts)
# VITE_WORKSPACE_CONTRACT_ID=CAxxxxxxxxxxxx
# VITE_MILESTONE_CONTRACT_ID=CAxxxxxxxxxxxx
# VITE_REWARDS_CONTRACT_ID=CAxxxxxxxxxxxx
```

### Example `.env.local`

```env
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

**Note:** Variables must be prefixed with `VITE_` to be accessible in the browser. See [Vite's environment variables guide](https://vitejs.dev/guide/env-and-modes.html).

**Note:** Never commit `.env.local` to Git. It's in `.gitignore` for security.

---

## VS Code Recommended Extensions

VS Code is recommended for development. Install these extensions for a better experience:

### Rust Development

- **rust-analyzer** (rust-lang.rust-analyzer) — LSP for Rust
  - Provides type hints, error checking, code completion
  - Settings: Enable "Inlay Hints" in extension settings

- **Even Better TOML** (tamasfe.even-better-toml) — Syntax highlighting for Cargo.toml

- **Crates** (serayuzgur.crates) — Dependency version management for Cargo.toml

### TypeScript / React Development

- **TypeScript Vue Plugin (Volar)** (Vue.volar) — TS language server support
  - Also provides JSX/TypeScript support in Vite projects

- **ESLint** (dbaeumer.vscode-eslint) — Linting integration
  - Integrates eslint into the editor for real-time error reporting

- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss) — Tailwind class completion
  - Shows preview on hover, suggests class names

### General Development

- **Prettier** (esbenp.prettier-vscode) — Code formatter
  - Format on save (optional, configure in settings)

- **Git Lens** (eamodio.gitlens) — Git history and blame info
  - Inline blame, file history, branch/commit navigation

- **Thunder Client** (rangav.vscode-thunder-client) — HTTP client (alternative to Postman)
  - Test API endpoints directly in VS Code

### Optional Stellar/Blockchain

- **Stellar Development** (stellar.vscode-stellar) — Stellar/Soroban support
  - Syntax highlighting for XDR and Stellar assets

### Installation Instructions

1. Open VS Code
2. Go to **Extensions** (Cmd+Shift+X on macOS, Ctrl+Shift+X on Linux/Windows)
3. Search for each extension name and click **Install**

Or install from command line:

```bash
code --install-extension rust-lang.rust-analyzer
code --install-extension tamasfe.even-better-toml
code --install-extension serayuzgur.crates
code --install-extension Vue.volar
code --install-extension dbaeumer.vscode-eslint
code --install-extension bradlc.vscode-tailwindcss
code --install-extension esbenp.prettier-vscode
code --install-extension eamodio.gitlens
code --install-extension rangav.vscode-thunder-client
```

---

## Common Issues and Troubleshooting

### Rust / WASM Issues

#### Error: `could not compile wasm32-unknown-unknown`

**Problem:** The WASM target is not installed.

**Solution:**

```bash
rustup target add wasm32-unknown-unknown
rustup update
```

#### Error: `stellar: command not found`

**Problem:** Stellar CLI is not in your PATH.

**Solution (macOS):**

```bash
brew reinstall stellar-cli
```

**Solution (Linux/WSL2):**

```bash
# Verify installation location
which stellar

# If not found, download and install manually
STELLAR_VERSION="25.2.0"
curl -fsSL https://github.com/stellar/stellar-cli/releases/download/v${STELLAR_VERSION}/stellar-cli-${STELLAR_VERSION}-x86_64-unknown-linux-gnu.tar.gz \
  | tar xz -C /usr/local/bin
```

#### Error: `cargo test` hangs or times out

**Problem:** Build cache is corrupted or disk is full.

**Solution:**

```bash
# Clean build artifacts
cargo clean

# Try running tests again
cargo test --workspace

# If still stuck, check disk space
df -h
```

---

### Node.js / Frontend Issues

#### Error: `pnpm: command not found`

**Problem:** pnpm is not installed globally.

**Solution:**

```bash
npm install -g pnpm@9
pnpm --version
```

#### Error: `node --version` shows wrong version

**Problem:** Node.js 24 is not the active version (using nvm).

**Solution:**

```bash
# Set default version
nvm alias default 24

# Use for this session
nvm use 24

# Verify
node --version
```

#### Error: `pnpm install` fails with permission errors

**Problem:** Global packages installed without proper permissions.

**Solution (Linux/macOS):**

```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Add to ~/.bashrc or ~/.zshrc for persistence
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Reinstall pnpm
npm install -g pnpm@9
```

#### Error: `pnpm install --frozen-lockfile` fails

**Problem:** pnpm lockfile is out of sync or incompatible.

**Solution:**

```bash
# Remove lock file and reinstall
cd frontend
rm pnpm-lock.yaml
pnpm install
```

#### Error: `pnpm dev` on wrong port

**Problem:** Port 5173 is already in use.

**Solution:**

```bash
# Use a different port
pnpm dev -- --port 5174

# Or kill the process using port 5173
# macOS/Linux
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

---

### Wallet / Testnet Issues

#### Error: Freighter wallet not detected

**Problem:** Freighter extension is not installed or not enabled.

**Solution:**

1. Visit [Freighter.app](https://freighter.app)
2. Install the extension for your browser
3. Reload the page (`Cmd+R` / `Ctrl+R`)
4. Check the extension icon in your browser toolbar

#### Error: Connected to mainnet instead of testnet

**Problem:** Freighter is set to mainnet, but the app expects testnet.

**Solution:**

1. Click the Freighter extension icon
2. Click the network dropdown (top right)
3. Select **Test Network**
4. Reload the page

#### Error: `No account is connected` when clicking connect

**Problem:** Freighter wallet is installed but no account is created.

**Solution:**

1. Click Freighter extension
2. Click **Create New Account** or **Import Existing Account**
3. Follow the setup wizard
4. Return to the app and reconnect

---

### Git / Repository Issues

#### Error: `git clone` fails with SSH key error

**Problem:** SSH keys are not configured.

**Solution (use HTTPS):**

```bash
git clone https://github.com/lernza/lernza.git
cd lernza
```

**Solution (SSH alternative):**

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your-email@example.com"

# Add to ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Add public key to GitHub:
# 1. Go to https://github.com/settings/keys
# 2. Click "New SSH key"
# 3. Paste output of: cat ~/.ssh/id_ed25519.pub

# Try cloning again
git clone git@github.com:lernza/lernza.git
```

#### Error: `main` branch vs `master` confusion

**Problem:** Repository uses `main` as default branch, but you're checking out `master`.

**Solution:**

```bash
git checkout main
```

---

## Verifying Your Setup

Once installation is complete, verify everything works:

### 1. Contracts

```bash
cd contracts
cargo test --workspace
```

Expected output: `test result: ok. 33 passed; 0 failed;`

### 2. Frontend
## Smart Contracts (Rust/Soroban)

### Setup

```bash
rustup target add wasm32-unknown-unknown
cargo install --locked stellar-cli
```

### Build

```bash
stellar contract build
```

### Test

```bash
cargo test --workspace
```

### Lint

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets
```

## Frontend (React/TypeScript)

### Setup

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm build
```

Expected output: `✓ built in XXs` (no errors)

### 3. Development Servers

Run both:

```bash
# Terminal 1: Contracts (optional - not needed for frontend dev)
cd contracts
cargo test --workspace

# Terminal 2: Frontend
cd frontend
pnpm dev
```

Open `http://localhost:5173` → wallet connects → app loads ✓

---

## Updating Dependencies

Periodically update tools to keep security patches and features:

### Rust

```bash
rustup update
```

### Node.js

```bash
nvm install 24  # Install latest 24.x
nvm use 24      # Switch to it
node --version  # Verify
```

### pnpm

```bash
npm install -g pnpm@9
pnpm --version
```

### Frontend Dependencies

```bash
cd frontend
pnpm update
pnpm install --frozen-lockfile
```

---

## Getting Help

- **Lernza docs:** [GitHub Issues](https://github.com/lernza/lernza/issues)
- **Stellar docs:** [docs.stellar.org](https://docs.stellar.org)
- **Soroban docs:** [soroban.stellar.org](https://soroban.stellar.org)
- **React docs:** [react.dev](https://react.dev)
- **Vite docs:** [vitejs.dev](https://vitejs.dev)

---

## Next Steps

1. **Read the architecture:** See [CLAUDE.md](./CLAUDE.md) for smart contract and frontend architecture
2. **Contribute:** See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines
3. **Start coding:** Pick a [good first issue](https://github.com/lernza/lernza/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
```

### Development

```bash
pnpm dev    # http://localhost:5173
```

### Build & Lint

```bash
pnpm build  # Type-check (tsc -b) + production build
pnpm lint   # ESLint
```

## Pre-commit Hooks

This project uses [husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to run checks before commits. Hooks are installed automatically after `pnpm install` in the frontend directory.

- **ESLint** on staged `.ts`/`.tsx` files
- **cargo fmt --check** on staged `.rs` files

## Project Structure

- `contracts/` — Three Soroban smart contracts (quest, milestone, rewards)
- `frontend/` — React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- `docs/` — Documentation

## VS Code Extensions (Recommended)

- rust-analyzer
- ESLint
- Tailwind CSS IntelliSense
- Prettier

## Troubleshooting

- **WASM target missing**: Run `rustup target add wasm32-unknown-unknown`
- **pnpm lockfile error**: Run `pnpm install --frozen-lockfile` (don't use `pnpm update`)
- **Stellar CLI not found**: Install via `cargo install --locked stellar-cli` or Homebrew
