/**
 * Contract interaction test suite for the quest Soroban client (#1216).
 *
 * These tests verify the client's *interaction contract* with the chain:
 * every method must encode the correct Soroban call (method name + typed
 * arguments), route it through the shared transaction pipeline, and surface
 * success, on-chain failure, wallet rejection and network errors correctly.
 *
 * The RPC layer (`./client`) is mocked so no network is touched. We spy on the
 * real `Contract.prototype.call` to capture the exact ScVals the client emits
 * and decode them back to native values for assertions.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { MockInstance } from "vitest"
import {
  Account,
  Address,
  Contract,
  Keypair,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk"

const OWNER = "GD6ROJBYLKQMOW3E7N4M2YBPUHMZD7PL65VRHRMO24BOVSBV5H3BQRSL"
const ENROLLEE = "GAJZR5RMNUNEK7CRXJVEWXZ5XUXWT7FJGILCDDOITF7EC26RPWJ4UVOE"
const ADMIN = "GDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCZA57"
const TOKEN = "CACAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAINCW"

const mocks = vi.hoisted(() => ({
  getAccount: vi.fn(),
  prepareTransaction: vi.fn(),
  simulateTransaction: vi.fn(),
  signAndSubmit: vi.fn(),
}))

vi.mock("@/lib/env", () => ({
  env: {
    VITE_QUEST_CONTRACT_ID: "CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526",
    VITE_SENTRY_DSN: "",
  },
  isDev: false,
  isProd: false,
}))

vi.mock("./client", () => ({
  server: {
    getAccount: (...args: unknown[]) => mocks.getAccount(...args),
    prepareTransaction: (...args: unknown[]) => mocks.prepareTransaction(...args),
    simulateTransaction: (...args: unknown[]) => mocks.simulateTransaction(...args),
  },
  signAndSubmit: (...args: unknown[]) => mocks.signAndSubmit(...args),
  signAndSubmitTracked: (tx: unknown, _label: string, handlers?: unknown) =>
    mocks.signAndSubmit(tx, handlers),
  simulateContractRead: async (contract: Contract, call: { method: string; args: xdr.ScVal[] }) => {
    const account = new Account(OWNER, "0")
    const tx = new TransactionBuilder(account, {
      fee: "10000",
      networkPassphrase: "Standalone Network ; February 2017",
    })
      .addOperation(contract.call(call.method, ...call.args))
      .setTimeout(30)
      .build()
    const response = await mocks.simulateTransaction(tx)
    return response && "result" in response && response.result
      ? scValToNative(response.result.retval)
      : null
  },
  prepareContractTransaction: async (
    contract: Contract,
    source: string,
    call: { method: string; args: xdr.ScVal[] }
  ) => {
    const account = await mocks.getAccount(source)
    return mocks.prepareTransaction(
      new TransactionBuilder(account, {
        fee: "10000",
        networkPassphrase: "Standalone Network ; February 2017",
      })
        .addOperation(contract.call(call.method, ...call.args))
        .setTimeout(30)
        .build()
    )
  },
  NETWORK_PASSPHRASE: "Standalone Network ; February 2017",
  RPC_TIMEOUT_MS: 15000,
  withTimeout: <T>(promise: Promise<T>) => promise,
  withRpcReadThrottle: <T>(_label: string, fn: () => Promise<T>) => fn(),
}))

import { QuestClient, Visibility } from "./quest"

/** Decodes the ScVals passed to `Contract.prototype.call` back to native values. */
function decodeCall(spy: MockInstance, index = 0): { method: string; args: unknown[] } {
  const call = spy.mock.calls[index] as unknown as [string, ...xdr.ScVal[]]
  const [method, ...scVals] = call
  const args = scVals.map(scVal => {
    const native = scValToNative(scVal)
    return typeof native === "bigint" ? Number(native) : native
  })
  return { method, args }
}

/** Builds a QuestInfo struct ScVal matching the contract's return shape. */
function questStruct(o: {
  id: number
  owner?: string
  name?: string
  description?: string
  category?: string
  tags?: string[]
  token?: string
  createdAt?: number
  visibility?: number
  status?: number
  deadline?: number
  maxEnrollees?: number | null
  verified?: boolean
}): xdr.ScVal {
  return nativeToScVal({
    id: nativeToScVal(o.id, { type: "u32" }),
    owner: new Address(o.owner ?? OWNER).toScVal(),
    name: nativeToScVal(o.name ?? `Quest ${o.id}`, { type: "string" }),
    description: nativeToScVal(o.description ?? "", { type: "string" }),
    category: nativeToScVal(o.category ?? "general", { type: "string" }),
    tags: nativeToScVal(o.tags ?? []),
    token_addr: new Address(o.token ?? TOKEN).toScVal(),
    created_at: nativeToScVal(o.createdAt ?? 0, { type: "u64" }),
    visibility: nativeToScVal(o.visibility ?? 0, { type: "u32" }),
    status: nativeToScVal(o.status ?? 0, { type: "u32" }),
    deadline: nativeToScVal(o.deadline ?? 0, { type: "u64" }),
    max_enrollees:
      o.maxEnrollees == null ? nativeToScVal(null) : nativeToScVal(o.maxEnrollees, { type: "u32" }),
    verified: nativeToScVal(o.verified ?? false),
  })
}

function readReturns(retval: xdr.ScVal): void {
  mocks.simulateTransaction.mockResolvedValue({ result: { retval } })
}

describe("QuestClient contract interactions (#1216)", () => {
  let client: QuestClient
  let callSpy: MockInstance
  let randomSpy: MockInstance

  // `invokeRead` builds a throwaway source account from `Keypair.random()`,
  // whose ed25519 derivation cannot run under jsdom's cross-realm Uint8Array.
  // Reads only ever call `.publicKey()` (they simulate, never sign), so a stub
  // returning a valid account address keeps read simulations deterministic.
  const readSource = { publicKey: () => OWNER } as unknown as Keypair

  beforeEach(() => {
    mocks.getAccount.mockReset().mockResolvedValue(new Account(OWNER, "1"))
    mocks.prepareTransaction.mockReset().mockImplementation((tx: unknown) => Promise.resolve(tx))
    mocks.simulateTransaction.mockReset()
    mocks.signAndSubmit.mockReset().mockResolvedValue({ status: "SUCCESS", txHash: "hash-ok" })
    callSpy = vi.spyOn(Contract.prototype, "call")
    randomSpy = vi.spyOn(Keypair, "random").mockReturnValue(readSource)
    client = new QuestClient()
  })

  afterEach(() => {
    callSpy.mockRestore()
    randomSpy.mockRestore()
  })

  describe("write operations encode the correct call", () => {
    it("createQuest encodes create_quest with typed args and submits", async () => {
      const result = await client.createQuest(
        OWNER,
        "Learn Rust",
        "A hands-on Rust quest",
        "development",
        ["rust", "soroban"],
        TOKEN,
        Visibility.Public,
        25
      )

      expect(mocks.getAccount).toHaveBeenCalledWith(OWNER)
      expect(decodeCall(callSpy)).toEqual({
        method: "create_quest",
        args: [
          OWNER,
          "Learn Rust",
          "A hands-on Rust quest",
          "development",
          ["rust", "soroban"],
          TOKEN,
          0,
          25,
          null,
        ],
      })
      expect(mocks.prepareTransaction).toHaveBeenCalledTimes(1)
      expect(mocks.signAndSubmit).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ status: "SUCCESS", txHash: "hash-ok" })
    })

    it("createQuest passes a null max_enrollees when the cap is omitted", async () => {
      await client.createQuest(OWNER, "Uncapped", "d", "dev", [], TOKEN, Visibility.Private)

      const { method, args } = decodeCall(callSpy)
      expect(method).toBe("create_quest")
      expect(args[6]).toBe(1) // Visibility.Private
      expect(args[7]).toBeNull()
      expect(args[8]).toBeNull()
    })

    it("updateQuest sends null for every omitted optional field", async () => {
      await client.updateQuest(
        OWNER,
        3,
        "New name",
        undefined,
        undefined,
        undefined,
        Visibility.Private
      )

      expect(decodeCall(callSpy)).toEqual({
        method: "update_quest",
        args: [3, OWNER, "New name", null, null, null, 1, null],
      })
    })

    it("addEnrollee (owner overload) encodes add_enrollee and forwards handlers", async () => {
      const handlers = { onSubmitted: vi.fn(), onError: vi.fn() }
      await client.addEnrollee(OWNER, 4, ENROLLEE, handlers)

      expect(mocks.getAccount).toHaveBeenCalledWith(OWNER)
      expect(decodeCall(callSpy)).toEqual({ method: "add_enrollee", args: [4, ENROLLEE] })
      expect(mocks.signAndSubmit.mock.calls[0][1]).toBe(handlers)
    })

    it("addEnrollee (self-enroll overload) routes to join_quest signed by the enrollee", async () => {
      await client.addEnrollee(4, ENROLLEE)

      expect(mocks.getAccount).toHaveBeenCalledWith(ENROLLEE)
      expect(decodeCall(callSpy)).toEqual({ method: "join_quest", args: [ENROLLEE, 4] })
    })

    it("addEnrollee throws when the enrollee address is missing", async () => {
      await expect(client.addEnrollee(OWNER, 4)).rejects.toThrow(/missing enrollee/i)
      expect(mocks.signAndSubmit).not.toHaveBeenCalled()
    })

    const writeCases = [
      {
        name: "archiveQuest",
        run: (c: QuestClient) => c.archiveQuest(OWNER, 4),
        method: "archive_quest",
        args: [4],
        source: OWNER,
      },
      {
        name: "setVisibility",
        run: (c: QuestClient) => c.setVisibility(OWNER, 4, Visibility.Private),
        method: "set_visibility",
        args: [4, 1],
        source: OWNER,
      },
      {
        name: "setDeadline",
        run: (c: QuestClient) => c.setDeadline(OWNER, 4, 1_700_000_000),
        method: "set_deadline",
        args: [4, 1_700_000_000],
        source: OWNER,
      },
      {
        name: "removeEnrollee",
        run: (c: QuestClient) => c.removeEnrollee(OWNER, 4, ENROLLEE),
        method: "remove_enrollee",
        args: [4, ENROLLEE],
        source: OWNER,
      },
      {
        name: "leaveQuest",
        run: (c: QuestClient) => c.leaveQuest(ENROLLEE, 4),
        method: "leave_quest",
        args: [ENROLLEE, 4],
        source: ENROLLEE,
      },
      {
        name: "joinQuest",
        run: (c: QuestClient) => c.joinQuest(ENROLLEE, 4),
        method: "join_quest",
        args: [ENROLLEE, 4],
        source: ENROLLEE,
      },
      {
        name: "verifyCreator",
        run: (c: QuestClient) => c.verifyCreator(ADMIN, OWNER),
        method: "verify_creator",
        args: [ADMIN, OWNER],
        source: ADMIN,
      },
    ]

    it.each(writeCases)(
      "$name encodes $method with the owner-signed source",
      async ({ run, method, args, source }) => {
        await run(client)

        expect(mocks.getAccount).toHaveBeenCalledWith(source)
        expect(decodeCall(callSpy)).toEqual({ method, args })
        expect(mocks.signAndSubmit).toHaveBeenCalledTimes(1)
      }
    )
  })

  describe("read operations decode chain state", () => {
    it("getQuestCount decodes a u32 scalar", async () => {
      readReturns(nativeToScVal(7, { type: "u32" }))

      await expect(client.getQuestCount()).resolves.toBe(7)
      expect(decodeCall(callSpy)).toEqual({ method: "get_quest_count", args: [] })
    })

    it("getQuest decodes the full QuestInfo struct", async () => {
      readReturns(
        questStruct({
          id: 1,
          owner: OWNER,
          name: "Intro to Soroban",
          tags: ["rust", "wasm"],
          visibility: Visibility.Public,
          verified: true,
          maxEnrollees: 100,
        })
      )

      const quest = await client.getQuest(1)

      expect(decodeCall(callSpy)).toEqual({ method: "get_quest", args: [1] })
      expect(quest).toMatchObject({
        id: 1,
        owner: OWNER,
        name: "Intro to Soroban",
        tags: ["rust", "wasm"],
        visibility: 0,
        status: 0,
        verified: true,
        maxEnrollees: 100,
      })
    })

    it("getQuest returns null when the simulation has no result", async () => {
      mocks.simulateTransaction.mockResolvedValue({})
      await expect(client.getQuest(9)).resolves.toBeNull()
    })

    it("listPublicQuests maps a vec of structs and forwards pagination args", async () => {
      readReturns(
        xdr.ScVal.scvVec([questStruct({ id: 0 }), questStruct({ id: 1, name: "Second" })])
      )

      const quests = await client.listPublicQuests(0, 10)

      expect(decodeCall(callSpy)).toEqual({ method: "list_public_quests", args: [0, 10] })
      expect(quests.map(q => q.id)).toEqual([0, 1])
      expect(quests[1].name).toBe("Second")
    })

    it("listQuestsByOwner encodes the owner address argument", async () => {
      readReturns(xdr.ScVal.scvVec([questStruct({ id: 5, owner: OWNER })]))

      const quests = await client.listQuestsByOwner(OWNER)

      expect(decodeCall(callSpy)).toEqual({ method: "list_quests_by_owner", args: [OWNER] })
      expect(quests).toHaveLength(1)
    })

    it("isEnrollee encodes quest id + address and decodes a bool", async () => {
      readReturns(nativeToScVal(true))

      await expect(client.isEnrollee(4, ENROLLEE)).resolves.toBe(true)
      expect(decodeCall(callSpy)).toEqual({ method: "is_enrollee", args: [4, ENROLLEE] })
    })

    it("getEnrollmentCap decodes a capped value and a null (uncapped) value", async () => {
      readReturns(nativeToScVal(50, { type: "u32" }))
      await expect(client.getEnrollmentCap(4)).resolves.toBe(50)

      readReturns(nativeToScVal(null))
      await expect(client.getEnrollmentCap(4)).resolves.toBeNull()
    })

    it("getEnrollees decodes a vec of addresses", async () => {
      readReturns(xdr.ScVal.scvVec([new Address(ENROLLEE).toScVal(), new Address(OWNER).toScVal()]))

      await expect(client.getEnrollees(4)).resolves.toEqual([ENROLLEE, OWNER])
      expect(decodeCall(callSpy)).toEqual({ method: "get_enrollees", args: [4] })
    })

    it("isExpired and isCreatorVerified decode boolean reads", async () => {
      readReturns(nativeToScVal(true))
      await expect(client.isExpired(4)).resolves.toBe(true)

      readReturns(nativeToScVal(false))
      await expect(client.isCreatorVerified(OWNER)).resolves.toBe(false)
    })

    it("getQuests reads the count then loads each quest", async () => {
      mocks.simulateTransaction
        .mockResolvedValueOnce({ result: { retval: nativeToScVal(2, { type: "u32" }) } })
        .mockResolvedValueOnce({ result: { retval: questStruct({ id: 0 }) } })
        .mockResolvedValueOnce({ result: { retval: questStruct({ id: 1 }) } })

      const quests = await client.getQuests()

      expect(quests.map(q => q.id)).toEqual([0, 1])
    })
  })

  describe("failure and rejection paths", () => {
    it("returns a FAILED result when the wallet declines the signature", async () => {
      mocks.signAndSubmit.mockResolvedValue({
        status: "FAILED",
        txHash: "",
        error: "User declined access",
      })

      const result = await client.joinQuest(ENROLLEE, 4)

      expect(result.status).toBe("FAILED")
      expect(result.error).toMatch(/declined/i)
    })

    it("rewrites a dropped-network error while building the transaction", async () => {
      mocks.getAccount.mockRejectedValue(new Error("could not detect network"))

      await expect(
        client.createQuest(OWNER, "n", "d", "dev", [], TOKEN, Visibility.Public)
      ).rejects.toThrow(/Network error:/)
      expect(mocks.signAndSubmit).not.toHaveBeenCalled()
    })

    it("surfaces a decoded on-chain contract error code", async () => {
      mocks.signAndSubmit.mockRejectedValue(new Error("HostError: Error(Contract, #7)"))

      await expect(client.archiveQuest(OWNER, 4)).rejects.toThrow(/already full/i)
    })

    it("swallows read errors and resolves to null", async () => {
      mocks.simulateTransaction.mockRejectedValue(new Error("failed to fetch"))
      await expect(client.getQuest(1)).resolves.toBeNull()
    })

    it("rejects writes and returns empty reads when the contract id is not configured", async () => {
      const bare = new QuestClient()
      ;(bare as unknown as { contract: Contract | null }).contract = null

      await expect(
        bare.createQuest(OWNER, "n", "d", "dev", [], TOKEN, Visibility.Public)
      ).rejects.toThrow(/not configured/i)
      await expect(bare.getQuestCount()).resolves.toBe(0)
    })
  })
})
