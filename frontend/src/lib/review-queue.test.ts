import { describe, expect, it } from "vitest"
import { filterAndSortReviewQueue, groupReviewQueue, type ReviewSubmission } from "./review-queue"

const submissions: ReviewSubmission[] = [
  { id: "a", questId: "q1", questName: "Quest", milestoneId: "m1", milestoneName: "Build", learner: "Ada", submittedAt: "2026-01-01", deadline: "2026-01-10", status: "pending" },
  { id: "b", questId: "q1", questName: "Quest", milestoneId: "m1", milestoneName: "Build", learner: "Lin", submittedAt: "2026-01-03", deadline: "2026-01-05", status: "pending" },
  { id: "c", questId: "q1", questName: "Quest", milestoneId: "m2", milestoneName: "Ship", learner: "Ada", submittedAt: "2026-01-02", status: "approved" },
]

describe("review queue", () => {
  it("filters by learner/status and sorts oldest first", () => {
    expect(filterAndSortReviewQueue(submissions, { learner: "ada", milestone: "", status: "pending" }, "oldest").map((item) => item.id)).toEqual(["a"])
  })

  it("sorts by approaching deadline and groups by quest/milestone", () => {
    const filtered = filterAndSortReviewQueue(submissions, { learner: "", milestone: "", status: "all" }, "deadline")
    expect(filtered.map((item) => item.id)).toEqual(["b", "a", "c"])
    expect(groupReviewQueue(filtered).get("q1:m1")?.map((item) => item.id)).toEqual(["b", "a"])
  })
})
