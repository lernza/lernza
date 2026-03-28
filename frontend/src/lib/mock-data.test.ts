import { describe, it, expect } from "vitest"
import {
  MOCK_WORKSPACES,
  MOCK_WORKSPACE_STATS,
  MOCK_MILESTONES,
  MOCK_COMPLETIONS,
  MOCK_ENROLLEES,
  MOCK_USER_STATS,
  MOCK_PLATFORM_STATS,
  MOCK_TRENDING_QUESTS,
  MOCK_RECENT_ACTIVITY,
  MOCK_EARNINGS_HISTORY,
} from "./mock-data"

// ── MOCK_WORKSPACES ───────────────────────────────────────────────────────────

describe("MOCK_WORKSPACES", () => {
  it("contains at least one workspace", () => {
    expect(MOCK_WORKSPACES.length).toBeGreaterThan(0)
  })

  it("every workspace has a unique id", () => {
    const ids = MOCK_WORKSPACES.map(w => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("every workspace has a non-empty name and description", () => {
    for (const ws of MOCK_WORKSPACES) {
      expect(ws.name.trim().length).toBeGreaterThan(0)
      expect(ws.description.trim().length).toBeGreaterThan(0)
    }
  })

  it("every workspace has a non-empty owner address", () => {
    for (const ws of MOCK_WORKSPACES) {
      expect(ws.owner.trim().length).toBeGreaterThan(0)
    }
  })
})

// ── MOCK_WORKSPACE_STATS ──────────────────────────────────────────────────────

describe("MOCK_WORKSPACE_STATS", () => {
  it("has a stats entry for every workspace id", () => {
    for (const ws of MOCK_WORKSPACES) {
      expect(MOCK_WORKSPACE_STATS[ws.id]).toBeDefined()
    }
  })

  it("all stats have non-negative counts", () => {
    for (const stats of Object.values(MOCK_WORKSPACE_STATS)) {
      expect(stats.enrolleeCount).toBeGreaterThanOrEqual(0)
      expect(stats.milestoneCount).toBeGreaterThanOrEqual(0)
      expect(stats.poolBalance).toBeGreaterThanOrEqual(0)
    }
  })
})

// ── MOCK_MILESTONES ───────────────────────────────────────────────────────────

describe("MOCK_MILESTONES", () => {
  it("all milestone quest_ids reference an existing workspace", () => {
    const workspaceIds = new Set(MOCK_WORKSPACES.map(w => w.id))
    for (const [questId] of Object.entries(MOCK_MILESTONES)) {
      expect(workspaceIds.has(Number(questId))).toBe(true)
    }
  })

  it("every milestone has a non-empty title and description", () => {
    for (const milestones of Object.values(MOCK_MILESTONES)) {
      for (const m of milestones) {
        expect(m.title.trim().length).toBeGreaterThan(0)
        expect(m.description.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it("every milestone has a positive reward_amount", () => {
    for (const milestones of Object.values(MOCK_MILESTONES)) {
      for (const m of milestones) {
        expect(m.reward_amount).toBeGreaterThan(0)
      }
    }
  })

  it("milestone ids are unique within each quest", () => {
    for (const milestones of Object.values(MOCK_MILESTONES)) {
      const ids = milestones.map(m => m.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

// ── MOCK_COMPLETIONS ──────────────────────────────────────────────────────────

describe("MOCK_COMPLETIONS", () => {
  it("all completion quest_ids reference an existing workspace", () => {
    const workspaceIds = new Set(MOCK_WORKSPACES.map(w => w.id))
    for (const [questId] of Object.entries(MOCK_COMPLETIONS)) {
      expect(workspaceIds.has(Number(questId))).toBe(true)
    }
  })

  it("all completion milestoneIds reference an existing milestone in the same quest", () => {
    for (const [questId, completions] of Object.entries(MOCK_COMPLETIONS)) {
      const milestones = MOCK_MILESTONES[Number(questId)]
      if (!milestones) continue
      const milestoneIds = new Set(milestones.map(m => m.id))
      for (const c of completions) {
        expect(milestoneIds.has(c.milestoneId)).toBe(true)
      }
    }
  })
})

// ── MOCK_ENROLLEES ────────────────────────────────────────────────────────────

describe("MOCK_ENROLLEES", () => {
  it("all enrollee quest_ids reference an existing workspace", () => {
    const workspaceIds = new Set(MOCK_WORKSPACES.map(w => w.id))
    for (const [questId] of Object.entries(MOCK_ENROLLEES)) {
      expect(workspaceIds.has(Number(questId))).toBe(true)
    }
  })

  it("enrollee lists contain only non-empty address strings", () => {
    for (const enrollees of Object.values(MOCK_ENROLLEES)) {
      for (const addr of enrollees) {
        expect(typeof addr).toBe("string")
        expect(addr.trim().length).toBeGreaterThan(0)
      }
    }
  })
})

// ── MOCK_USER_STATS ───────────────────────────────────────────────────────────

describe("MOCK_USER_STATS", () => {
  it("has non-negative numeric values for all fields", () => {
    expect(MOCK_USER_STATS.totalEarned).toBeGreaterThanOrEqual(0)
    expect(MOCK_USER_STATS.questsOwned).toBeGreaterThanOrEqual(0)
    expect(MOCK_USER_STATS.questsEnrolled).toBeGreaterThanOrEqual(0)
    expect(MOCK_USER_STATS.milestonesCompleted).toBeGreaterThanOrEqual(0)
  })
})

// ── MOCK_PLATFORM_STATS ───────────────────────────────────────────────────────

describe("MOCK_PLATFORM_STATS", () => {
  it("has positive counts for all fields", () => {
    expect(MOCK_PLATFORM_STATS.totalQuests).toBeGreaterThan(0)
    expect(MOCK_PLATFORM_STATS.activeUsers).toBeGreaterThan(0)
    expect(MOCK_PLATFORM_STATS.tokensDistributed).toBeGreaterThan(0)
  })
})

// ── MOCK_TRENDING_QUESTS ──────────────────────────────────────────────────────

describe("MOCK_TRENDING_QUESTS", () => {
  it("contains only workspaces that exist in MOCK_WORKSPACES", () => {
    const workspaceIds = new Set(MOCK_WORKSPACES.map(w => w.id))
    for (const tq of MOCK_TRENDING_QUESTS) {
      expect(workspaceIds.has(tq.id)).toBe(true)
    }
  })
})

// ── MOCK_RECENT_ACTIVITY ──────────────────────────────────────────────────────

describe("MOCK_RECENT_ACTIVITY", () => {
  it("all events have a unique id", () => {
    const ids = MOCK_RECENT_ACTIVITY.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("all events have valid action types", () => {
    const validActions = new Set(["enrolled", "completed", "created"])
    for (const event of MOCK_RECENT_ACTIVITY) {
      expect(validActions.has(event.action)).toBe(true)
    }
  })

  it("all events have non-empty questName and user", () => {
    for (const event of MOCK_RECENT_ACTIVITY) {
      expect(event.questName.trim().length).toBeGreaterThan(0)
      expect(event.user.trim().length).toBeGreaterThan(0)
    }
  })

  it("all timestamps are positive numbers", () => {
    for (const event of MOCK_RECENT_ACTIVITY) {
      expect(event.timestamp).toBeGreaterThan(0)
    }
  })
})

// ── MOCK_EARNINGS_HISTORY ─────────────────────────────────────────────────────

describe("MOCK_EARNINGS_HISTORY", () => {
  it("all data points have a non-empty date label", () => {
    for (const point of MOCK_EARNINGS_HISTORY) {
      expect(point.date.trim().length).toBeGreaterThan(0)
    }
  })

  it("all amounts are non-negative", () => {
    for (const point of MOCK_EARNINGS_HISTORY) {
      expect(point.amount).toBeGreaterThanOrEqual(0)
    }
  })
})
