# Frontend Contract Client Guide

All Soroban reads and writes belong in `frontend/src/lib/contracts`. Pages and
hooks should depend on the exported clients, never construct `Contract`, call
RPC methods, or read contract IDs directly.

## Configuration

Contract addresses are defined once in `frontend/src/lib/contracts/config.ts`.
Environment files are generated from `config/<environment>.yaml`; add a new
contract there and expose its `VITE_*_CONTRACT_ID` in `src/lib/env.ts` and
`src/env.d.ts`.

## Adding a method

1. Add a typed public method to the owning client.
2. Encode every argument with `nativeToScVal` and `Address` using the contract's
   exact Soroban type.
3. Decode the return value into a TypeScript interface in the client. Preserve
   `bigint` for `i128` values.
4. Use `simulateContractRead` for reads and `prepareContractTransaction` plus
   `signAndSubmitTracked` for writes.
5. Add a serialization test and an interaction test that asserts the method and
   decoded arguments.
6. Add the method to the relevant React Query key or invalidation path when it
   changes chain state.

The shared client owns RPC timeouts, throttling, network configuration, wallet
signing, transaction tracking, and error handling. Contract adapters own only
method names, argument encoding, and result parsing.