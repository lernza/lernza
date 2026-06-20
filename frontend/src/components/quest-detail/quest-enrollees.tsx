import { Users, Search, CheckCircle2, TrendingUp, Layout, UserPlus, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface QuestEnrolleesProps {
  enrollees: string[]
  isOwner: boolean
  onAddEnrollee: () => void
  totalMilestones: number
}

export function QuestEnrollees({
  enrollees,
  isOwner,
  onAddEnrollee,
  totalMilestones,
}: QuestEnrolleesProps) {
  return (
    <div className="space-y-4">
      {enrollees.length === 0 ? (
        <Card className="animate-fade-in-up border-border bg-secondary/5 border-2 border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="bg-accent border-border animate-bounce-custom mb-6 flex h-16 w-16 items-center justify-center border shadow-lg">
              <Users className="h-8 w-8 text-black" />
            </div>
            <h3 className="mb-2 text-xl font-semibold tracking-wide uppercase">
              Build your community
            </h3>
            <p className="text-muted-foreground mb-8 max-w-sm text-sm">
              No learners have enrolled in this quest yet. Start by inviting your first learners to
              this interactive curriculum.
            </p>
            {isOwner && (
              <Button
                onClick={onAddEnrollee}
                size="lg"
                className="shimmer-on-hover border-border px-10 shadow-md"
              >
                <UserPlus className="mr-3 h-5 w-5" />
                Add Your First Learner
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Search bar mock */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row">
            <div className="group relative flex-1">
              <div className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 transition-colors group-focus-within:text-black">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="Filter by enrollee address..."
                className="border-border placeholder:text-muted-foreground w-full border-[2.5px] bg-white py-3 pr-4 pl-11 text-sm font-semibold tracking-widest uppercase shadow-md transition-all outline-none placeholder:font-bold placeholder:tracking-normal placeholder:normal-case focus:translate-y-[-1px] focus:shadow-lg"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="shimmer-on-hover border-border px-6 text-[10px] font-semibold tracking-widest uppercase"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Sort by progress
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="shimmer-on-hover border-border px-6 text-[10px] font-semibold tracking-widest uppercase"
              >
                Export List
              </Button>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {enrollees.map((addr, i) => {
              // Deterministic mock completion count per address (pure function)
              const addressHash = addr.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
              const mockCompletions = totalMilestones > 0 ? addressHash % (totalMilestones + 1) : 0
              const progress = totalMilestones > 0 ? (mockCompletions / totalMilestones) * 100 : 0
              const isLead = i === 0

              return (
                <div
                  key={addr}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <Card className="neo-lift group border-border relative overflow-hidden border bg-white p-0 transition-all hover:shadow-xl active:shadow-sm">
                    <div className="absolute top-0 right-0 scale-150 rotate-12 p-2 opacity-5 transition-opacity group-hover:opacity-10">
                      <Layout className="h-16 w-16" />
                    </div>
                    <CardContent className="relative p-6">
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`border-border flex h-12 w-12 items-center justify-center border-[2.5px] text-sm font-semibold shadow-md transition-transform group-hover:scale-110 group-active:scale-95 ${isLead ? "bg-accent" : "bg-secondary"}`}
                          >
                            {addr.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-[140px] truncate font-mono text-xs font-semibold md:max-w-[200px]">
                              {addr}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <Badge
                                variant={isLead ? "default" : "secondary"}
                                className="border-border h-5 gap-1 border-2 p-1 px-2 text-[8px] font-semibold uppercase shadow-sm"
                              >
                                {isLead && <TrendingUp className="h-2 w-2" />}
                                {isLead ? "Top Contributor" : "Learner"}
                              </Badge>
                              {isLead && (
                                <Badge
                                  variant="success"
                                  className="border-border h-5 border-2 p-1 px-2 text-[8px] font-semibold uppercase"
                                >
                                  Lvl 4
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {mockCompletions === totalMilestones && totalMilestones > 0 && (
                          <div className="bg-success border-border animate-bounce-custom flex h-10 w-10 items-center justify-center border shadow-md">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      <div className="border-border/10 space-y-3 border-t-3 border-dashed pt-4">
                        <div className="mb-2 flex items-center justify-between gap-4">
                          <span className="text-muted-foreground text-[10px] leading-none font-semibold tracking-widest uppercase">
                            Curriculum Mastery
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="group-hover:text-accent text-xs font-semibold tabular-nums transition-colors">
                              {mockCompletions}/{totalMilestones} Steps
                            </span>
                            <ArrowRight className="h-3 w-3 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                          </div>
                        </div>
                        <Progress value={progress} className="border-border h-3 border" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
