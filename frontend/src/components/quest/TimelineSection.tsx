import { useEffect, useState } from "react"
import { Loader2, Activity, UserPlus, Trophy, Coins, Award } from "lucide-react"
import { fetchQuestHistory, shortenAddress, type ParsedEvent } from "@/hooks/use-quest-events"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

function formatAmount(amount: bigint): string {
  const whole = Number(amount / 10_000_000n)
  return `${whole.toLocaleString()} USDC`
}

export function TimelineSection({ questId }: { questId: number }) {
  const [events, setEvents] = useState<ParsedEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true)
      const data = await fetchQuestHistory(questId)
      setEvents(data)
      setLoading(false)
    }
    void loadEvents()
  }, [questId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="text-accent h-8 w-8 animate-spin" />
        <p className="text-muted-foreground mt-4 text-sm font-bold">Loading on-chain events...</p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <Card className="animate-fade-in-up border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <Activity className="text-muted-foreground mb-4 h-10 w-10 opacity-50" />
          <h3 className="text-lg font-semibold">No Activity Yet</h3>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">
            This quest hasn't had any on-chain activity yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Group events by ledger (very basic grouping)
  return (
    <div className="animate-fade-in-up before:via-border relative mx-auto max-w-3xl space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:to-transparent md:before:mx-auto md:before:translate-x-0">
      {events.map((event, index) => {
        let Icon = Activity
        let title = "Event"
        let description = ""
        let badge = null

        switch (event.type) {
          case "enrollee_added":
            Icon = UserPlus
            title = "Enrollee Joined"
            description = `${shortenAddress(event.enrollee!)} joined the quest.`
            break
          case "milestone_completed":
          case "peer_approved":
            Icon = Trophy
            title = "Milestone Verified"
            description = `Milestone #${event.milestoneId} was verified for ${shortenAddress(event.enrollee!)}.`
            break
          case "reward_funded":
            Icon = Coins
            title = "Pool Funded"
            description = `Reward pool received funding.`
            if (event.amount) badge = <Badge variant="success">+{formatAmount(event.amount)}</Badge>
            break
          case "reward_distributed":
            Icon = Coins
            title = "Reward Distributed"
            description = `Reward claimed by ${shortenAddress(event.enrollee!)}.`
            if (event.amount) badge = <Badge variant="success">+{formatAmount(event.amount)}</Badge>
            break
          case "certificate_minted":
            Icon = Award
            title = "Certificate Minted"
            description = `Completion certificate minted for ${shortenAddress(event.enrollee!)}.`
            break
          case "quest_archived":
          case "quest_cancelled":
            Icon = Activity
            title = `Quest ${event.type === "quest_archived" ? "Archived" : "Cancelled"}`
            description = `The quest status was updated.`
            break
        }

        return (
          <div
            key={`${event.txHash}-${index}`}
            className="group is-active relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse"
          >
            {/* Icon */}
            <div className="border-border bg-background flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              <Icon className="text-foreground h-4 w-4" />
            </div>

            {/* Card */}
            <Card className="w-[calc(100%-4rem)] transition-shadow hover:shadow-md md:w-[calc(50%-2.5rem)]">
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold">{title}</h4>
                  <span className="text-muted-foreground font-mono text-xs">
                    Ledger {event.ledger}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">{description}</p>
                {badge && <div className="mt-2">{badge}</div>}
              </CardContent>
            </Card>
          </div>
        )
      })}
    </div>
  )
}
