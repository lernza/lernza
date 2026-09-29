# Threat Model: Mainnet Operations

This document extends the assumptions in [SECURITY.md](../SECURITY.md) with an
OWASP-style threat model for Lernza's mainnet deployment. It identifies attacker
classes, the assets they target, plausible attack paths, and the mitigations
already in place or planned. It complements the contract-level findings in
[`docs/security-audit.md`](security-audit.md), which focuses on specific
vulnerabilities found during code review rather than the broader operating
environment.

Lernza has no backend: all state lives on the Stellar ledger, and the frontend
is a static site that talks directly to Soroban RPC and the user's wallet
extension. That shape determines the attacker classes below — there is no
server to breach, but there is a client, an RPC path, and a set of on-chain
actors to reason about.

## Assets

- **Reward pools** — SAC token balances held by the `rewards` contract on
  behalf of quest funders.
- **Quest and milestone state** — ownership, enrollment, and completion
  records in the `quest` and `milestone` contracts.
- **Certificates** — NFT completion records minted by the `certificate`
  contract.
- **Admin keys** — the keypair(s) with pause, fee, and rotation privileges
  (see the "Admin trust" assumption in `SECURITY.md`).
- **User wallets** — the Freighter (or compatible) wallet keys learners and
  creators use to sign transactions.

## Attacker Classes

### 1. Malicious quest creator

**Capability:** Can create quests, set milestone rewards, and (depending on
distribution mode) approve or reject submissions for their own quest.

**Attack paths:**
- Fund a quest with a worthless or malicious token contract to lure
  enrollees, then never distribute meaningful rewards (see "Token contract
  integrity" in `SECURITY.md`).
- Approve milestone completions for colluding addresses to drain a reward
  pool that other enrollees contributed effort toward, or reject legitimate
  submissions to withhold rewards.
- Set reward amounts at the edge of `MAX_REWARD_AMOUNT` repeatedly to
  exhaust a pool faster than intended.

**Impact:** Loss of learner trust, reward pool drained to insiders, real
funds risked chasing a fraudulent quest.

**Mitigations:**
- Quest ownership is verified on-chain for every milestone/reward action.
- Reward bounds (`MAX_REWARD_AMOUNT`) cap single-transaction blast radius.
- Peer-review verification mode exists as an alternative to sole
  owner-approval where creators want to reduce this risk themselves.
- Out of scope for contracts: token due-diligence and creator reputation are
  application-layer/off-chain concerns (see "Sybil resistance is off-chain").

### 2. Malicious enrollee

**Capability:** Can join open quests, submit milestone completions, and (in
peer-review mode) approve or reject peers' submissions.

**Attack paths:**
- Submit low-effort or plagiarized work to farm rewards in flat-distribution
  quests.
- Sybil the enrollee list with multiple wallets to capture a
  disproportionate share of a competitive-distribution reward pool.
- In peer-review mode, collude with other enrollees to approve each other's
  submissions regardless of quality.

**Impact:** Reward pool depleted without corresponding learning outcomes,
unfair distribution to legitimate enrollees, reputational damage to the
quest and platform.

**Mitigations:**
- `add_enrollee` / `remove_enrollee` give quest owners control over
  membership, letting them vet participants off-chain.
- Milestone verification (owner- or peer-reviewed) gates reward release
  behind an explicit approval step rather than auto-paying on submission.
- Sybil resistance is explicitly documented as an off-chain responsibility;
  contracts do not attempt to solve identity uniqueness.

### 3. Man-in-the-middle on RPC

**Capability:** Can intercept or tamper with traffic between the frontend and
the Soroban RPC endpoint (e.g. on a compromised network, malicious proxy, or
DNS hijack of the configured RPC host).

**Attack paths:**
- Return stale or fabricated ledger state to the frontend, causing a user to
  sign a transaction based on incorrect quest/milestone/reward data (e.g.
  showing a milestone as unclaimed when it has already been paid).
- Withhold or delay submission of a signed transaction to grief a user
  without the user's wallet ever being compromised.
- Serve a malicious frontend bundle if the MITM occurs at the hosting/CDN
  layer rather than the RPC layer (see phishing below for the client-facing
  version of this).

**Impact:** Users act on incorrect information, transactions are dropped or
delayed, funds are not directly stolen (Stellar transactions are signed
client-side and the RPC cannot forge a valid signature) but availability and
trust are degraded.

**Mitigations:**
- All RPC endpoints must be accessed over TLS; the frontend should pin to
  known-good RPC providers rather than accepting arbitrary user-supplied
  endpoints in production builds.
- Transaction signing happens entirely in the wallet extension — an RPC MITM
  cannot forge signatures or move funds without the user's private key.
- Users can independently verify quest/reward state via a block explorer or
  a second RPC provider if they suspect tampering.
- **Gap:** there is no automated cross-provider consistency check today. See
  "RPC provider compromise" below for the related, harder case.

### 4. Wallet phishing

**Capability:** Can trick a user into signing a malicious transaction or
revealing their wallet's recovery phrase, typically via a spoofed frontend,
fake support channel, or malicious dApp connection request.

**Attack paths:**
- Clone the Lernza frontend on a look-alike domain and request wallet
  connection + a transaction that transfers funds or grants token allowance
  to an attacker-controlled address.
- Social-engineer a user (via Discord/Telegram/email impersonating Lernza
  support) into pasting their secret key or approving a malicious
  `require_auth` request.
- Compromise a third-party integration or browser extension that has access
  to the same wallet.

**Impact:** Full loss of the affected wallet's funds and any quest/creator
privileges tied to that address; potential downstream impact if the
compromised address was a quest owner or admin.

**Mitigations:**
- Freighter (and comparable wallets) show the destination contract and
  requested authorization scope before signing, giving users a chokepoint to
  inspect the request.
- Users should only interact through the official frontend domain; the
  project should keep a canonical, documented list of official domains (see
  `docs/operations/domain-audit-checklist.md` and
  `docs/operations/domain-dns-hardening.md`).
- `SECURITY.md` documents that users should treat non-official domains and
  unsolicited support contact as untrusted.
- **Gap:** there is no in-app transaction simulation/preview beyond what the
  wallet itself shows. This is a candidate for future hardening but is
  currently a documented, accepted risk for MVP.

### 5. RPC provider compromise

**Capability:** Full control over a Soroban RPC endpoint the frontend is
configured to use (malicious operator, compromised infrastructure, or a
government/network-level actor compelling the provider).

**Attack paths:**
- Same read-path risks as the MITM case above (serve stale/false ledger
  state), but without needing to intercept traffic — the provider itself is
  the adversary.
- Selectively censor or reorder transaction submission for specific
  addresses.
- Combine false state with a phishing-style prompt (e.g. tell the frontend a
  milestone is "unpaid" to trick a creator into re-funding a pool that was
  already paid out).

**Impact:** Similar to MITM — availability and integrity of *displayed*
state, not direct fund theft, since the provider cannot forge signatures.
Repeated exposure to a compromised provider does increase the risk of users
making bad decisions based on falsified state (e.g. approving a
reward twice).

**Mitigations:**
- Client-side signing means a malicious RPC cannot move funds without a
  valid user signature.
- Prefer well-known, reputable RPC providers (e.g. official Stellar/Soroban
  infrastructure) and avoid letting arbitrary third-party RPC URLs be
  injected into a production build.
- Critical state (e.g. "has this milestone already been paid") should be
  re-verified against the source-of-truth contract read immediately before
  a state-changing transaction is constructed, minimizing the window for
  stale/falsified data to cause harm.
- **Gap:** no multi-provider quorum read is implemented. This is an
  acceptable MVP risk given Stellar's small set of reputable public RPC
  providers, but should be revisited if reliance on a single provider
  becomes a bottleneck.

## Residual Risks

The following risks are accepted for the current deployment and should be
revisited as the platform matures:

| Risk | Status | Notes |
|------|--------|-------|
| Single-admin key compromise | Accepted (MVP) | Multisig + timelock planned (see ADR-007) |
| RPC provider single point of failure | Accepted (MVP) | Multi-provider quorum read not yet implemented |
| Quest creator reputation | Accepted | No on-chain reputation system; relies on community trust |
| Token contract due diligence | Accepted | Only reviewed tokens recommended in SECURITY.md |
| Client-side storage of unsigned XDR | Accepted | Pruned after 30 minutes; no signed data stored |

## Out of Scope

- Physical security of user devices.
- Compromise of the Stellar network protocol itself.
- Third-party token contract bugs, beyond the "only register reviewed
  tokens" guidance already in `SECURITY.md`.

## Related Documents

- [SECURITY.md](../SECURITY.md) — load-bearing security assumptions and
  vulnerability reporting process.
- [docs/security-audit.md](security-audit.md) — contract-level findings and
  an OWASP-style triage matrix scoped to the three Soroban contracts.
- [docs/adr/007-admin-multisig-timelock.md](adr/007-admin-multisig-timelock.md) —
  planned mitigation for single-admin-key risk.
- [docs/operations/incident-response.md](operations/incident-response.md) —
  what happens if any of the above is exploited.

## Review

This document should be reviewed by the team before mainnet launch and
whenever a new attacker-facing surface (new contract, new frontend
integration, new RPC dependency) is introduced.
