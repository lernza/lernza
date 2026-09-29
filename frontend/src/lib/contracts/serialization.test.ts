import { describe, expect, it } from "vitest"
import { Address, nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk"

const ADDRESS = "GD6ROJBYLKQMOW3E7N4M2YBPUHMZD7PL65VRHRMO24BOVSBV5H3BQRSL"

describe("Soroban client serialization", () => {
  it("round-trips typed scalar and address arguments", () => {
    const encoded = [
      nativeToScVal(42, { type: "u32" }),
      nativeToScVal("Learn Soroban", { type: "string" }),
      new Address(ADDRESS).toScVal(),
    ]

    expect(encoded.map(scValToNative)).toEqual([42, "Learn Soroban", ADDRESS])
  })

  it("decodes an i128 result without losing precision", () => {
    const value = 9_000_000_000_000_001n
    const encoded = nativeToScVal(value, { type: "i128" })
    const xdrValue = xdr.ScVal.fromXDR(encoded.toXDR("base64"), "base64")

    expect(scValToNative(xdrValue)).toBe(value)
  })
})
