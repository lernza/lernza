.PHONY: setup test test-quest test-milestone test-rewards fmt lint build deploy clean

setup:
	./scripts/bootstrap.sh

test:
	cargo test --workspace

test-quest:
	cargo test -p quest

test-milestone:
	cargo test -p milestone

test-rewards:
	cargo test -p rewards

fmt:
	cargo fmt --all -- --check

lint:
	cargo clippy --workspace --all-targets

build:
	stellar contract build --manifest-path contracts/quest/Cargo.toml --release
	stellar contract build --manifest-path contracts/milestone/Cargo.toml --release
	stellar contract build --manifest-path contracts/rewards/Cargo.toml --release

deploy:
	./scripts/deploy-contracts.sh --network testnet --build

clean:
	cargo clean

