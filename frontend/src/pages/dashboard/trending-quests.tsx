import { Sparkles, Users, Coins } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatTokens } from "@/lib/utils"
import type { WorkspaceInfo } from "@/lib/contract-types"

interface QuestStats {
  enrolleeCount: number
  poolBalance: number
}

interface TrendingQuestsProps {
  quests: WorkspaceInfo[]
  statsByQuest: Record<number, QuestStats>
  onSelectQuest: (id: number) => void
}

export function TrendingQuests({ quests, statsByQuest, onSelectQuest }: TrendingQuestsProps) {
  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
        <Sparkles className="h-5 w-5" /> Trending Quests
      </h2>
      <div className="space-y-4">
        {quests.map(quest => {
          const stats = statsByQuest[quest.id] || { enrolleeCount: 0, poolBalance: 0 }
          return (
            <button
              key={quest.id}
              type="button"
              onClick={() => onSelectQuest(quest.id)}
              aria-label={`Open quest ${quest.name}`}
              className="card-tilt border-border focus-visible:ring-ring cursor-pointer border-[2px] text-left shadow-[4px_4px_0_var(--color-border)] focus-visible:ring-2 focus-visible:outline-none"
            >
              <Card className="border-0 shadow-none">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-1 text-sm font-bold">{quest.name}</CardTitle>
                    <Badge
                      variant="default"
                      className="bg-primary text-foreground border-border ml-2 border-[1px] px-1 text-[10px]"
                    >
                      Trending
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 font-bold">
                      <Users className="h-3 w-3" /> {stats.enrolleeCount}
                    </span>
                    <span className="flex items-center gap-1 font-bold">
                      <Coins className="h-3 w-3" /> {formatTokens(stats.poolBalance)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>
    </div>
  )
}
