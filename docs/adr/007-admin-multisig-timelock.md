# ADR-007: Admin Multi-Sig and Timelock for Sensitive Operations

- Status: Proposed
- Date: 2026-06-30

## Context

`SECURITY.md` documents an explicit load-bearing assumption: the admin keypair is a single
key with elevated privileges. It can pause the rewards contract, set platform fees, rotate
itself, and trigger contract upgrades. A single compromised key is therefore sufficient to
drain unallocated token pools and halt all distributions.

This assumption is acceptable for testnet, but it is an unacceptable risk surface for a
mainnet deployment that holds user funds. Two mitigation strategies are under consideration:

**Option A — Stellar native multi-sig at the admin account level**

Stellar accounts natively support multi-signature thresholds (`low`, `med`, `high`). The
admin account can be configured to require M-of-N signer approval for medium- and
high-threshold operations (i.e. transactions that mutate contract state via `invoke_contract`
calls). This is enforced by the Stellar network itself, requires no contract changes, and
can be set up with the Stellar CLI or Horizon API.

Pros:
- No contract code changes required.
- Threshold enforcement is at the protocol layer — it cannot be bypassed by contract logic.
- Existing Stellar tooling (Stellar CLI, Freighter multi-sig) handles signing flows.

Cons:
- All signers must coordinate before any admin action, including time-sensitive ones such
  as emergency pausing after a detected exploit.
- Does not enforce a minimum delay between approval and execution.

**Option B — Contract-level multi-sig with timelock**

A dedicated admin contract (or guard logic added to existing contracts) collects approval
signatures from a signer set and enforces a mandatory delay before executing sensitive
operations. This pattern is common in EVM ecosystems (Gnosis Safe + TimelockController).

Pros:
- Enforces a time buffer between proposal and execution, giving the community time to
  detect and react to malicious admin actions.
- Signers do not need to be online simultaneously (async approval).

Cons:
- Requires authoring, auditing, and deploying new Soroban contract code.
- Increases operational complexity for routine admin operations.
- Emergency response is slowed by the mandatory delay, unless an emergency bypass path
  is added — which itself becomes a new attack surface.

## Decision

Adopt **Option A (Stellar native multi-sig)** as the initial mainnet admin protection, with
a mandatory delay added at the operational process level rather than enforced in contract
code.

Concretely:

1. The admin account will be configured with a `2-of-3` signing threshold on all
   medium-and-high operations before mainnet launch. The three signers will be held by
   distinct keyholders in separate geographic locations.
2. For non-emergency admin actions (fee changes, contract upgrades, authority rotations),
   the team will enforce a 48-hour public notice period in the project's GitHub Discussions
   before a signed transaction is broadcast. This is a process control, not an on-chain
   guarantee.
3. For emergency pausing only, a single designated signer may act alone at the `low`
   threshold to minimize response time. The pause function will be scoped to require only
   a low-threshold signature to enable this.
4. Option B (contract-level timelock) is deferred to a post-mainnet iteration. The
   contract audit required for Option B must complete before that work begins.

## Migration Plan

| Phase | Target date | Action |
|-------|-------------|--------|
| Pre-mainnet | Before launch | Configure admin account with `2-of-3` threshold; distribute keys to three keyholders |
| Pre-mainnet | Before launch | Document emergency pause procedure and confirm low-threshold signer is operational |
| Post-mainnet v1 | Within 60 days | Publish process controls for 48-hour notice period in `docs/operations/` |
| Future | After audit | Evaluate and implement contract-level timelock (Option B) as an upgrade |

## Consequences

Moving to `2-of-3` multi-sig immediately eliminates the single-key-compromise scenario
documented in `SECURITY.md`. Any attack that controls one key is no longer sufficient to
execute destructive admin operations.

The 48-hour public notice process provides transparency without requiring on-chain
enforcement, which avoids the contract complexity and audit scope of a timelock in the
first mainnet release.

The trade-off is that the process-level notice period is not cryptographically enforced.
A malicious insider who controls two of three keys can bypass it. This residual risk is
accepted until the contract-level timelock is implemented and audited.

Emergency response latency is reduced by allowing single-signer pausing at the low
threshold. The pause function's impact is limited — it stops new distributions but does
not move or drain funds — so this asymmetry is acceptable.
