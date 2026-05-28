import {
  Sparkles,
  UserPlus,
  Plus,
  Shield,
  Tag,
  BookOpen,
  Layout,
  Pencil,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QuestStatusBadge } from "@/components/quest-status-badge"
import type { QuestInfo } from "@/lib/contracts/quest"

interface QuestHeaderProps {
  quest: QuestInfo
  address: string | null | undefined
  isComplete: boolean
  onAddEnrollee: () => void
  onAddMilestone: () => void
  onEdit: () => void
  onFund: () => void
}

export function QuestHeader({
  quest,
  address,
  isComplete,
  onAddEnrollee,
  onAddMilestone,
  onEdit,
  onFund,
}: QuestHeaderProps) {
  const isOwner = quest.owner === address

  return (
    <div className="animate-fade-in-up relative mb-8 overflow-hidden border-[3px] border-black bg-white shadow-[6px_6px_0_#000]">
      {/* Header top bar */}
      <div className="bg-primary flex items-center justify-between border-b-[3px] border-black px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="hidden text-xs font-black tracking-wider uppercase sm:inline">
            Quest Details
          </span>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="gap-1 border-black bg-white py-0.5 text-black capitalize"
            >
              <Layout className="h-3 w-3" />
              Developer
            </Badge>
            <Badge variant="outline" className="bg-success/20 gap-1 border-black py-0.5 text-black">
              <Shield className="h-3 w-3" />
              Public
            </Badge>
            {isComplete && (
              <Badge variant="success" className="gap-1 border-black py-0.5 shadow-none">
                <Sparkles className="h-3 w-3" />
                Complete
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <QuestStatusBadge quest={{ status: quest.status, deadline: quest.deadline }} />
        </div>
      </div>

      <div className="relative p-6 sm:p-8">
        <div className="from-primary/10 pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t to-transparent" />
        <div className="bg-diagonal-lines pointer-events-none absolute inset-0 opacity-20" />

        <div className="relative z-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-muted-foreground mb-2 flex items-center gap-2">
                <Tag className="h-3.5 w-3.5" />
                <div className="flex gap-2 text-[10px] font-black tracking-widest uppercase">
                  <span>#Stellar</span>
                  <span>#Soroban</span>
                  <span>#Rust</span>
                </div>
              </div>
              <h1 className="mb-3 text-3xl leading-none font-black break-words sm:text-4xl lg:text-5xl">
                {quest.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm font-bold">
                <div className="flex items-center gap-2">
                  <div className="bg-secondary flex h-6 w-6 items-center justify-center border-[1.5px] border-black text-[10px]">
                    {quest.owner.slice(0, 2)}
                  </div>
                  <span className="opacity-70">Created by</span>
                  <span className="font-mono text-xs">
                    {quest.owner.slice(0, 8)}...{quest.owner.slice(-4)}
                  </span>
                </div>
                <div className="text-muted-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>Interactive Course</span>
                </div>
              </div>
              <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
                {quest.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 sm:min-w-[180px] md:flex-col md:items-stretch">
              {isOwner ? (
                <>
                  <Button
                    size="sm"
                    onClick={onEdit}
                    variant="secondary"
                    className="shimmer-on-hover border-black"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Quest
                  </Button>
                  <Button size="sm" onClick={onAddMilestone} className="shimmer-on-hover">
                    <Plus className="h-4 w-4" />
                    New Milestone
                  </Button>
                  <Button
                    size="sm"
                    onClick={onAddEnrollee}
                    variant="outline"
                    className="shimmer-on-hover border-black"
                  >
                    <UserPlus className="h-4 w-4" />
                    Enroll Learner
                  </Button>
                </>
              ) : (
                <Button size="lg" className="shimmer-on-hover shadow-[6px_6px_0_#000]">
                  <Sparkles className="h-5 w-5" />
                  Enroll Now
                </Button>
              )}
              <Button
                onClick={onFund}
                variant="outline"
                size="sm"
                className="bg-success/10 hover:bg-success/20 group border-black"
              >
                <Wallet className="text-success h-4 w-4 transition-transform group-hover:scale-110" />
                Fund Pool
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
