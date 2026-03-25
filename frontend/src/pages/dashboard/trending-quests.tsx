import { Sparkles, Users, Coins } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatTokens } from "@/lib/utils"
import type { Workspace } from "@/lib/mock-data"

interface TrendingQuestsProps {
  quests: Workspace[]
  onSelectQuest: (id: number) => void
}

export function TrendingQuests({ quests, onSelectQuest }: TrendingQuestsProps) {
  return (
    <div>
      <h2 className="text-xl font-black mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5" /> Trending Quests
      </h2>
      <div className="space-y-4">
        {quests.map((quest) => (
          <Card 
            key={quest.id} 
            className="card-tilt cursor-pointer border-[2px] border-black shadow-[4px_4px_0_#000]"
            onClick={() => onSelectQuest(quest.id)}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start">
                 <CardTitle className="text-sm font-bold line-clamp-1">{quest.name}</CardTitle>
                 <Badge variant="default" className="text-[10px] bg-primary text-black border-[1px] border-black ml-2 px-1">
                   Trending
                 </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center gap-3 text-xs mt-2 text-muted-foreground">
                <span className="flex items-center gap-1 font-bold">
                  <Users className="w-3 h-3" /> {quest.enrolleeCount}
                </span>
                <span className="flex items-center gap-1 font-bold">
                  <Coins className="w-3 h-3" /> {formatTokens(quest.poolBalance)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
