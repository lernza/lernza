# PR #1366 — Fix formatTokens Negative Amount Handling

## Issue

**Issue #1281** — bug(frontend): formatTokens utility doesn't handle negative amounts — could display negative tokens

## Summary

The `formatTokens` utility function in `frontend/src/lib/utils.ts` did not validate that the input amount is non-negative. If a negative value was passed (due to a bug or data corruption), it would silently format it as a negative number, potentially displaying incorrect balance or reward information to users without any indication of data corruption.

## Root Cause

The `formatTokens` function accepted `number | bigint` input and directly divided by `10^decimals` without any validation. This meant:

1. **Silent corruption display**: Negative values like `-100` were formatted as `"-100 TOKEN"` with no warning.
2. **No validation**: There was no check that `amount >= 0` before formatting.
3. **Precision risk**: `Number(bigint)` can lose precision for large values, and negative values were never caught.

## Changes Made

### `frontend/src/lib/utils.ts`

Added a validation check at the start of `formatTokens`:

- Convert the input to `Number` first and store it in `numAmount`.
- If `numAmount < 0`, log an error to the console and return `"ERROR: Negative <symbol>"` instead of formatting the negative value.
- The rest of the formatting logic (thousands, millions, localized strings) remains unchanged.

### `frontend/src/lib/utils.test.ts`

Added a test case verifying that negative amounts (both `number` and `bigint` inputs) return the error string `"ERROR: Negative TOKEN"` (or the appropriate symbol).

## Example

Before the fix:
```
formatTokens(-1000000, 7, "USDC")  // Returns "-0.1 USDC" (confusing)
formatTokens(BigInt(-1000000), 7, "USDC")  // Same issue
```

After the fix:
```
formatTokens(-1000000, 7, "USDC")  // Returns "ERROR: Negative USDC"
formatTokens(BigInt(-1000000), 7, "USDC")  // Returns "ERROR: Negative USDC"
```

## Verification

- The existing `formatTokens` tests continue to pass (zero, thousands, millions formatting).
- The new test case confirms negative amounts are caught and return the error string.

## Closes #1281