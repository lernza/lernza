#!/usr/bin/env bash
# bootstrap.sh — one-command dev environment setup for Lernza
# Supports: macOS (Homebrew), Ubuntu/Debian, and other Linux distros.
# Run from the repo root: ./scripts/bootstrap.sh

set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

info()    { echo -e "${BOLD}${GREEN}[bootstrap]${RESET} $*"; }
warn()    { echo -e "${BOLD}${YELLOW}[bootstrap]${RESET} $*"; }
error()   { echo -e "${BOLD}${RED}[bootstrap]${RESET} $*" >&2; }
require() { command -v "$1" &>/dev/null || { error "$1 is required but not found in PATH"; exit 1; }; }

OS=""
case "$(uname -s)" in
  Darwin) OS="macos" ;;
  Linux)  OS="linux" ;;
  *)      error "Unsupported OS: $(uname -s). Use macOS, Ubuntu/Debian, or Arch Linux."; exit 1 ;;
esac

info "Detected OS: $OS"

# ---------------------------------------------------------------------------
# 1. Rust
# ---------------------------------------------------------------------------

if ! command -v rustc &>/dev/null; then
  info "Installing Rust via rustup..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
  # shellcheck source=/dev/null
  source "$HOME/.cargo/env"
else
  info "Rust already installed ($(rustc --version))"
fi

# Ensure cargo is on PATH for the rest of this session
export PATH="$HOME/.cargo/bin:$PATH"

require cargo
require rustup

info "Ensuring stable Rust toolchain..."
rustup toolchain install stable --no-self-update 2>/dev/null || true
rustup default stable

# ---------------------------------------------------------------------------
# 2. wasm32 target
# ---------------------------------------------------------------------------

if ! rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
  info "Adding wasm32-unknown-unknown target..."
  rustup target add wasm32-unknown-unknown
else
  info "wasm32-unknown-unknown already installed"
fi

# ---------------------------------------------------------------------------
# 3. Stellar CLI
# ---------------------------------------------------------------------------

STELLAR_VERSION="25.2.0"

if command -v stellar &>/dev/null; then
  info "Stellar CLI already installed ($(stellar version 2>/dev/null || echo 'unknown version'))"
else
  info "Installing Stellar CLI v${STELLAR_VERSION}..."
  if [[ "$OS" == "macos" ]]; then
    if command -v brew &>/dev/null; then
      brew install stellar-cli
    else
      warn "Homebrew not found. Installing Stellar CLI from GitHub releases..."
      ARCH="$(uname -m)"
      TARBALL="stellar-cli-${STELLAR_VERSION}-${ARCH}-apple-darwin.tar.gz"
      curl -fsSL "https://github.com/stellar/stellar-cli/releases/download/v${STELLAR_VERSION}/${TARBALL}" \
        | tar xz -C /usr/local/bin stellar
    fi
  else
    # Linux
    ARCH="$(uname -m)"
    TARBALL="stellar-cli-${STELLAR_VERSION}-${ARCH}-unknown-linux-gnu.tar.gz"
    curl -fsSL "https://github.com/stellar/stellar-cli/releases/download/v${STELLAR_VERSION}/${TARBALL}" \
      | sudo tar xz -C /usr/local/bin stellar
  fi
fi

require stellar

# ---------------------------------------------------------------------------
# 4. Node.js (via nvm if available, else system package manager)
# ---------------------------------------------------------------------------

NODE_VERSION="24"

# Source nvm if present
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck source=/dev/null
  source "$NVM_DIR/nvm.sh"
fi

if command -v nvm &>/dev/null; then
  info "Installing Node.js $NODE_VERSION via nvm..."
  nvm install "$NODE_VERSION"
  nvm use "$NODE_VERSION"
elif command -v node &>/dev/null && node --version | grep -q "^v${NODE_VERSION}"; then
  info "Node.js $NODE_VERSION already active ($(node --version))"
else
  info "Installing Node.js $NODE_VERSION..."
  if [[ "$OS" == "macos" ]] && command -v brew &>/dev/null; then
    brew install "node@${NODE_VERSION}"
    brew link "node@${NODE_VERSION}" --force --overwrite 2>/dev/null || true
  elif [[ "$OS" == "linux" ]]; then
    if command -v apt-get &>/dev/null; then
      curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | sudo -E bash -
      sudo apt-get install -y nodejs
    elif command -v dnf &>/dev/null; then
      sudo dnf install -y nodejs
    elif command -v pacman &>/dev/null; then
      sudo pacman -Sy --noconfirm nodejs npm
    else
      warn "Unknown Linux distro — please install Node.js $NODE_VERSION manually."
    fi
  fi
fi

require node
info "Node.js: $(node --version)"

# ---------------------------------------------------------------------------
# 5. pnpm
# ---------------------------------------------------------------------------

PNPM_VERSION="10.33.0"

if command -v pnpm &>/dev/null && pnpm --version | grep -qF "$PNPM_VERSION"; then
  info "pnpm $PNPM_VERSION already installed"
else
  info "Installing pnpm $PNPM_VERSION..."
  npm install -g "pnpm@${PNPM_VERSION}"
fi

require pnpm
info "pnpm: $(pnpm --version)"

# ---------------------------------------------------------------------------
# 6. Frontend dependencies
# ---------------------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"

if [[ ! -f "$FRONTEND_DIR/.env.local" ]]; then
  info "Copying .env.example → .env.local (fill in contract IDs before running the app)"
  cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env.local"
fi

info "Installing frontend dependencies..."
(cd "$FRONTEND_DIR" && pnpm install --frozen-lockfile)

# ---------------------------------------------------------------------------
# 7. Smoke-test: contract tests
# ---------------------------------------------------------------------------

info "Running contract tests to verify Rust setup..."
(cd "$REPO_ROOT" && cargo test --workspace --quiet)

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------

echo ""
info "Bootstrap complete. Next steps:"
echo "  1. Edit frontend/.env.local with your contract IDs and RPC URL"
echo "  2. cd frontend && pnpm dev    # start the dev server at http://localhost:5173"
echo "  3. Install Freighter wallet extension and switch it to Testnet"
echo ""
