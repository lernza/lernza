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
  onFund
}: QuestHeaderProps) {
  const isOwner = quest.owner === address

  return (
    <div className="relative bg-white border-[3px] border-black shadow-[6px_6px_0_#000] overflow-hidden mb-8 animate-fade-in-up">
      {/* Header top bar */}
      <div className="bg-primary border-b-[3px] border-black px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">
            Quest Details
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white border-black text-black gap-1 capitalize py-0.5">
              <Layout className="h-3 w-3" />
              Developer
            </Badge>
            <Badge variant="outline" className="bg-success/20 border-black text-black gap-1 py-0.5">
              <Shield className="h-3 w-3" />
              Public
            </Badge>
            {isComplete && (
              <Badge variant="success" className="gap-1 shadow-none border-black py-0.5">
                <Sparkles className="h-3 w-3" />
                Complete
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 bg-success border border-black rounded-full" />
          <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Live</span>
        </div>
      </div>

      <div className="p-6 sm:p-8 relative">
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-diagonal-lines pointer-events-none opacity-20" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <Tag className="h-3.5 w-3.5" />
                <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest">
                  <span>#Stellar</span>
                  <span>#Soroban</span>
                  <span>#Rust</span>
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-none mb-3 break-words">
                {quest.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm font-bold">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-secondary border-[1.5px] border-black flex items-center justify-center text-[10px]">
                    {quest.owner.slice(0, 2)}
                  </div>
                  <span className="opacity-70">Created by</span>
                  <span className="font-mono text-xs">{quest.owner.slice(0, 8)}...{quest.owner.slice(-4)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span>Interactive Course</span>
                </div>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base mt-4 max-w-2xl leading-relaxed">
                {quest.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 md:flex-col md:items-stretch sm:min-w-[180px]">
              {isOwner ? (
                <>
                  <Button size="sm" onClick={onEdit} variant="secondary" className="shimmer-on-hover border-black">
                    <Pencil className="h-4 w-4" />
                    Edit Quest
                  </Button>
                  <Button size="sm" onClick={onAddMilestone} className="shimmer-on-hover">
                    <Plus className="h-4 w-4" />
                    New Milestone
                  </Button>
                  <Button size="sm" onClick={onAddEnrollee} variant="outline" className="shimmer-on-hover border-black">
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
                className="bg-success/10 border-black hover:bg-success/20 group"
              >
                <Wallet className="h-4 w-4 text-success group-hover:scale-110 transition-transform" />
                Fund Pool
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
