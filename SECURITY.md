# Security Policy

Lernza handles token distribution on the Stellar network. Security is critical. We take all vulnerability reports seriously.

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Instead, report vulnerabilities privately:

1. Go to the [Security Advisories](https://github.com/lernza/lernza/security/advisories) page
2. Click "Report a vulnerability"
3. Provide as much detail as possible

This uses GitHub's private vulnerability reporting flow (when enabled in repo settings).

If the "Report a vulnerability" button is not available, email the maintainers directly with the subject line `[SECURITY] Lernza vulnerability report`.

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

## Recognition

We appreciate security researchers. Contributors who responsibly disclose vulnerabilities will be credited in the release notes (unless they prefer to remain anonymous).
