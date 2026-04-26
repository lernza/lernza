# Security Policy

Lernza handles token distribution on the Stellar network. Security is critical. We take all vulnerability reports seriously.

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Instead, report vulnerabilities privately:

1. Go to the [Security Advisories](https://github.com/lernza/lernza/security/advisories) page
2. Click "Report a vulnerability"
3. Provide as much detail as possible

If GitHub Security Advisories are unavailable, email the maintainers directly with the subject line `[SECURITY] Lernza vulnerability report`.

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact (especially regarding token handling)
- Suggested fix if you have one

## Response Timeline

- **Acknowledgment:** within 48 hours
- **Assessment:** within 1 week
- **Fix timeline:** depends on severity, but critical issues targeting < 7 days

## Scope

The following are in scope:

- Smart contract vulnerabilities (unauthorized token transfers, state manipulation, reentrancy)
- Authentication/authorization bypasses
- Token pool drainage or manipulation
- Frontend vulnerabilities that could lead to transaction signing abuse
- Private key or wallet exposure

## Out of Scope

- Issues in third-party dependencies (report to the upstream project)
- Denial of service without meaningful impact
- Social engineering

## Supported Versions

| Version | Supported |
|---------|-----------|
| main branch | Yes |
| Tagged releases | Yes |
| Older branches | No |

## Security Assumptions

These assumptions are load-bearing. A violation of any of them changes the
threat model materially.

**Admin trust**
The admin keypair has elevated privileges: it can pause the rewards contract,
set platform fees, rotate itself, and trigger contract upgrades. The system
assumes the admin is a trusted operator. There is currently no multi-sig or
timelock on admin actions. A compromised admin key can drain unallocated token
pools and halt distributions. Rotate the key immediately if compromise is
suspected (see `docs/operations/admin-rotation.md`).

**Sybil resistance is off-chain**
The contracts do not prevent a single actor from controlling multiple wallet
addresses. Quest owners are responsible for vetting enrollees. The `add_enrollee`
and `remove_enrollee` functions exist precisely to give owners that control.
Any sybil-resistance guarantee must be enforced at the application layer before
enrollment is recorded on-chain.

**Oracle-free pricing**
Reward amounts are denominated in raw token units set by the quest owner at
funding time. The contracts never consult a price oracle. There is no on-chain
mechanism to adjust reward values based on market rates. This eliminates oracle
manipulation risk but means reward real-world value can drift silently if the
underlying token price changes.

**Token contract integrity**
The rewards contract interacts with whichever token address is registered for a
quest. It assumes that token is a well-behaved SEP-41 / Stellar Asset Contract
implementation. A malicious or buggy token contract could cause unexpected
behaviour during `transfer` calls. Only tokens that have been reviewed should
be registered.

**Frontend orchestration correctness**
The three contracts coordinate through shared identifiers and frontend-driven
call ordering (see ADR-003). The contracts themselves do not enforce cross-contract
sequencing beyond the checks already coded. A buggy or malicious frontend could
call contract functions out of order. Users should only interact through the
official frontend or a reviewed integration.

## Recognition

We appreciate security researchers. Contributors who responsibly disclose vulnerabilities will be credited in the release notes (unless they prefer to remain anonymous).
