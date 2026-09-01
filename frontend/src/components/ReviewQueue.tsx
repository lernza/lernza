import { RefreshCw } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { filterAndSortReviewQueue, groupReviewQueue, type ReviewSubmission, type SubmissionStatus } from "@/lib/review-queue"

interface ReviewQueueProps {
  submissions: ReviewSubmission[]
  isLoading?: boolean
  error?: string | null
  onRefresh: () => void
  onReview: (submission: ReviewSubmission) => void
}

export function ReviewQueue({ submissions, isLoading = false, error, onRefresh, onReview }: ReviewQueueProps) {
  const [learner, setLearner] = useState("")
  const [milestone, setMilestone] = useState("")
  const [status, setStatus] = useState<"all" | SubmissionStatus>("pending")
  const [submittedBefore, setSubmittedBefore] = useState("")
  const [sort, setSort] = useState<"oldest" | "deadline">("oldest")
  const visible = useMemo(() => filterAndSortReviewQueue(submissions, { learner, milestone, status, submittedBefore }, sort), [submissions, learner, milestone, status, submittedBefore, sort])
  const groups = useMemo(() => groupReviewQueue(visible), [visible])

  return (
    <section aria-label="Owner review queue" className="space-y-4">
      <div className="border-border bg-card grid gap-3 border p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input aria-label="Filter by learner" className="border-border bg-background border p-2 text-sm" placeholder="Learner" value={learner} onChange={(event) => setLearner(event.target.value)} />
        <input aria-label="Filter by milestone" className="border-border bg-background border p-2 text-sm" placeholder="Milestone" value={milestone} onChange={(event) => setMilestone(event.target.value)} />
        <select aria-label="Filter by status" className="border-border bg-background border p-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value as "all" | SubmissionStatus)}>
          <option value="pending">Pending</option><option value="all">All statuses</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
        </select>
        <input aria-label="Submitted before" type="date" className="border-border bg-background border p-2 text-sm" value={submittedBefore} onChange={(event) => setSubmittedBefore(event.target.value)} />
        <select aria-label="Sort queue" className="border-border bg-background border p-2 text-sm" value={sort} onChange={(event) => setSort(event.target.value as "oldest" | "deadline")}>
          <option value="oldest">Oldest submission</option><option value="deadline">Approaching deadline</option>
        </select>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}><RefreshCw className="h-4 w-4" /> Refresh queue</Button>
      {error ? <div role="alert" className="border-destructive/40 bg-destructive/10 text-destructive border p-4">Unable to load submissions. {error}</div> : null}
      {!isLoading && !error && visible.length === 0 ? <div className="border-border text-muted-foreground border p-8 text-center">No submissions match these filters.</div> : null}
      <div className="space-y-4">
        {[...groups.entries()].map(([key, items]) => <div key={key} className="border-border bg-card border p-4"><h3 className="mb-3 font-semibold">{items[0].questName} · {items[0].milestoneName}</h3><div className="space-y-2">{items.map((item) => <div key={item.id} className="flex flex-col gap-3 border-b pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{item.learner}</p><p className="text-muted-foreground text-xs">Submitted {new Date(item.submittedAt).toLocaleDateString()}</p></div><div className="flex items-center gap-3"><Badge variant={item.status === "pending" ? "default" : "secondary"}>{item.status}</Badge><Button size="sm" onClick={() => onReview(item)}>Review</Button></div></div>)}</div></div>)}
      </div>
    </section>
  )
}
