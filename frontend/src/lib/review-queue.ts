export type SubmissionStatus = "pending" | "approved" | "rejected"

export interface ReviewSubmission {
  id: string
  questId: string
  questName: string
  milestoneId: string
  milestoneName: string
  learner: string
  submittedAt: string
  deadline?: string
  status: SubmissionStatus
}

export interface ReviewQueueFilters {
  learner: string
  milestone: string
  status: "all" | SubmissionStatus
  submittedBefore?: string
}

export function filterAndSortReviewQueue(
  submissions: ReviewSubmission[],
  filters: ReviewQueueFilters,
  sort: "oldest" | "deadline"
): ReviewSubmission[] {
  const learner = filters.learner.trim().toLowerCase()
  const milestone = filters.milestone.trim().toLowerCase()
  const submittedBefore = filters.submittedBefore ? Date.parse(filters.submittedBefore) : undefined

  return submissions
    .filter((submission) => {
      if (learner && !submission.learner.toLowerCase().includes(learner)) return false
      if (milestone && !submission.milestoneName.toLowerCase().includes(milestone)) return false
      if (filters.status !== "all" && submission.status !== filters.status) return false
      if (submittedBefore !== undefined && Date.parse(submission.submittedAt) > submittedBefore) return false
      return true
    })
    .sort((left, right) => {
      const leftDate = Date.parse(sort === "oldest" ? left.submittedAt : left.deadline ?? "9999-12-31")
      const rightDate = Date.parse(sort === "oldest" ? right.submittedAt : right.deadline ?? "9999-12-31")
      return leftDate - rightDate
    })
}

export function groupReviewQueue(submissions: ReviewSubmission[]): Map<string, ReviewSubmission[]> {
  const groups = new Map<string, ReviewSubmission[]>()
  for (const submission of submissions) {
    const key = `${submission.questId}:${submission.milestoneId}`
    const group = groups.get(key) ?? []
    group.push(submission)
    groups.set(key, group)
  }
  return groups
}
