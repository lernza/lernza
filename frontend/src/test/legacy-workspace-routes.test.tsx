import { describe, expect, it } from "vitest"
import { pathToPage } from "@/App"

/**
 * Issue #1647 — the legacy "Workspace" naming was removed in favour of
 * "Quest". These assertions fail if a `/workspace/...` route (or any other
 * stale alias) is ever reintroduced, which would silently 404 the old
 * links people still have bookmarked.
 */
describe("legacy workspace routes stay removed", () => {
  it.each([
    "/workspace",
    "/workspace/",
    "/workspace/1",
    "/workspace/1/milestones",
    "/Workspaces",
    "/workspaces/2",
  ])("%s does not resolve to a real page", (path) => {
    expect(pathToPage(path).page).toBe("404")
  })

  it("keeps serving the canonical quest routes", () => {
    expect(pathToPage("/quest/1")).toEqual({
      page: "quest",
      questId: 1,
      creatorAddress: null,
      certificateId: null,
    })
    expect(pathToPage("/create-quest").page).toBe("create-quest")
  })
})
