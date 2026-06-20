# ADR-006: Contract Address Validation Strategy

## Status
Accepted

## Context
The `is_contract_address` function in `contracts/common/src/lib.rs` was originally designed to validate Stellar contract addresses using CRC-16 checksums. However, the CRC-16 implementation was removed due to a bug where overlapping decoded[] writes rejected valid SAC addresses.

The current implementation only checks:
1. Length (56 characters)
2. 'C' prefix 
3. Base32 charset (A-Z, 2-7)

This is weaker validation than originally intended, but the question is whether stronger validation is necessary.

## Decision
We will **not** reimplement CRC-16 validation for the following reasons:

1. **Soroban SDK Boundary Protection**: The soroban-sdk already validates that any `Address` it provides to a contract is structurally well-formed. It was deserialized from XDR and round-trips to a valid StrKey.

2. **Sufficient Differentiation**: Length + prefix + base32 charset together are sufficient to distinguish contract addresses (C-prefixed) from account addresses (G-prefixed) and reject obvious garbage input.

3. **Failure Mode**: Invalid contract addresses will fail at the XDR boundary or during token contract calls, providing clear error feedback without requiring complex validation logic in our contracts.

4. **Complexity vs. Benefit**: Implementing correct CRC-16-XMODEM validation with comprehensive test coverage adds significant complexity for minimal security benefit given the SDK's existing protections.

## Consequences
- Contract address validation remains lightweight and focused on prefix/format checking
- Invalid addresses will be caught by the Soroban runtime during actual contract calls
- We explicitly document that we delegate detailed validity checking to the soroban-sdk XDR boundary
- The validation function serves primarily to distinguish contract vs. account addresses, not to verify cryptographic integrity

## Implementation
The current `is_contract_address` function will be updated with improved documentation explaining the validation strategy and its limitations.