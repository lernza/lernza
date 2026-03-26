import {
  Users,
  Search,
  CheckCircle2,
  TrendingUp,
  Layout,
  UserPlus,
  ArrowRight
} from "lucide-react"
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
  totalMilestones
}: QuestEnrolleesProps) {
  return (
    <div className="space-y-4">
      {enrollees.length === 0 ? (
        <Card className="animate-fade-in-up border-black border-2 border-dashed bg-secondary/5">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 bg-primary border-[3px] border-black shadow-[6px_6px_0_#000] flex items-center justify-center mb-6 animate-bounce-custom">
              <Users className="h-8 w-8 text-black" />
            </div>
            <h3 className="text-xl font-black mb-2 uppercase tracking-wide">Build your community</h3>
            <p className="text-muted-foreground mb-8 max-w-sm text-sm">
              No learners have enrolled in this quest yet. Start by inviting your first learners to this interactive curriculum.
            </p>
            {isOwner && (
              <Button onClick={onAddEnrollee} size="lg" className="shimmer-on-hover px-10 border-black shadow-[4px_4px_0_#000]">
                <UserPlus className="h-5 w-5 mr-3" />
                Add Your First Learner
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Search bar mock */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1 group">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-black transition-colors">
                 <Search className="h-4 w-4" />
               </div>
               <input 
                  type="text" 
                  placeholder="Filter by enrollee address..." 
                  className="w-full pl-11 pr-4 py-3 bg-white border-[2.5px] border-black shadow-[4px_4px_0_#000] focus:shadow-[6px_6px_0_#000] focus:translate-y-[-1px] transition-all outline-none font-black text-sm uppercase tracking-widest placeholder:text-muted-foreground placeholder:normal-case placeholder:tracking-normal placeholder:font-bold"
               />
            </div>
            <div className="flex gap-2">
               <Button variant="secondary" size="sm" className="shimmer-on-hover px-6 border-black font-black uppercase tracking-widest text-[10px]">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Most Progress
               </Button>
               <Button variant="outline" size="sm" className="shimmer-on-hover px-6 border-black font-black uppercase tracking-widest text-[10px]">
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
                  <Card className="neo-lift bg-white hover:shadow-[8px_8px_0_#000] active:shadow-[2px_2px_0_#000] group border-black border-[3px] transition-all p-0 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 rotate-12 group-hover:opacity-10 transition-opacity">
                         <Layout className="w-16 h-16" />
                    </div>
                    <CardContent className="p-6 relative">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 border-[2.5px] border-black shadow-[3px_3px_0_#000] flex items-center justify-center text-sm font-black transition-transform group-hover:scale-110 group-active:scale-95 ${isLead ? 'bg-primary' : 'bg-secondary'}`}>
                            {addr.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-black truncate max-w-[140px] md:max-w-[200px]">
                              {addr}
                            </p>
                            <div className="flex gap-2 mt-2">
                                <Badge variant={isLead ? "default" : "secondary"} className="h-5 p-1 px-2 text-[8px] uppercase font-black border-black border-2 gap-1 shadow-[1px_1px_0_#000]">
                                   {isLead && <TrendingUp className="h-2 w-2" />}
                                   {isLead ? "Top Contributor" : "Learner"}
                                </Badge>
                                {isLead && <Badge variant="success" className="h-5 p-1 px-2 text-[8px] uppercase font-black border-black border-2">Lvl 4</Badge>}
                            </div>
                          </div>
                        </div>
                        {mockCompletions === totalMilestones && totalMilestones > 0 && (
                          <div className="w-10 h-10 bg-success border-[3px] border-black flex items-center justify-center animate-bounce-custom shadow-[3px_3px_0_#000]">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 pt-4 border-t-3 border-dashed border-black/10">
                         <div className="flex items-center justify-between gap-4 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">Curriculum Mastery</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black tabular-nums transition-colors group-hover:text-primary">{mockCompletions}/{totalMilestones} Steps</span>
                                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                            </div>
                         </div>
                         <Progress value={progress} className="h-3 border-[2px] border-black" />
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
