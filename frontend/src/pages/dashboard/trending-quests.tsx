import { Sparkles, Users, Coins } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatTokens } from "@/lib/utils"
import type { WorkspaceInfo } from "@/lib/contract-types"
import { MOCK_WORKSPACE_STATS } from "@/lib/mock-data"

interface TrendingQuestsProps {
  quests: WorkspaceInfo[]
  onSelectQuest: (id: number) => void
}

export function TrendingQuests({ quests, onSelectQuest }: TrendingQuestsProps) {
  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
        <Sparkles className="h-5 w-5" /> Trending Quests
      </h2>
      <div className="space-y-4">
        {quests.map(quest => {
          const stats = MOCK_WORKSPACE_STATS[quest.id] || { enrolleeCount: 0, poolBalance: 0 }
          return (
            <Card
              key={quest.id}
              className="card-tilt border-border cursor-pointer border-[2px] shadow-[4px_4px_0_var(--color-border)]"
              onClick={() => onSelectQuest(quest.id)}
            >
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
          )
        })}
      </div>
    </div>
  )
}
