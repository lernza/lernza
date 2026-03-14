import { ArrowLeft, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NotFoundProps {
  onNavigate: (page: string) => void
}

export function NotFound({ onNavigate }: NotFoundProps) {
  return (
    <div className="min-h-[calc(100vh-67px)] flex items-center justify-center relative overflow-hidden">
      {/* Floating background shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[8%] left-[5%] w-28 h-28 bg-primary border-[3px] border-black shadow-[5px_5px_0_#000] rotate-12 opacity-[0.08] animate-float"
          style={{ animationDuration: "7s" }}
        />
        <div
          className="absolute top-[15%] right-[8%] w-20 h-20 bg-destructive border-[3px] border-black shadow-[4px_4px_0_#000] -rotate-6 opacity-[0.07] animate-float"
          style={{ animationDuration: "9s", animationDelay: "1s" }}
        />
        <div
          className="absolute bottom-[12%] left-[10%] w-16 h-16 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] rotate-45 opacity-[0.06] animate-float"
          style={{ animationDuration: "8s", animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-[20%] right-[6%] w-24 h-24 bg-blue-200 border-[3px] border-black shadow-[4px_4px_0_#000] -rotate-12 opacity-[0.07] animate-float"
          style={{ animationDuration: "6s", animationDelay: "0.5s" }}
        />
        <div
          className="absolute top-[50%] left-[50%] w-10 h-10 bg-pink-200 border-[2px] border-black shadow-[3px_3px_0_#000] rotate-6 opacity-[0.08] animate-float"
          style={{ animationDuration: "10s", animationDelay: "3s" }}
        />
        <div
          className="absolute top-[30%] left-[25%] w-8 h-8 bg-success border-[2px] border-black shadow-[2px_2px_0_#000] -rotate-45 opacity-[0.06] animate-float"
          style={{ animationDuration: "11s", animationDelay: "1.5s" }}
        />
        <div
          className="absolute bottom-[35%] right-[30%] w-14 h-14 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] rotate-12 opacity-[0.05] animate-float"
          style={{ animationDuration: "7s", animationDelay: "4s" }}
        />
      </div>

      <div className="relative flex flex-col items-center text-center px-4">
        {/* Giant 404 with stacked neo-brutalist layers */}
        <div className="relative mb-6 animate-scale-in select-none">
          {/* Shadow layers */}
          <div className="absolute inset-0 text-[180px] sm:text-[240px] lg:text-[300px] font-black leading-none text-black translate-x-3 translate-y-3 opacity-100">
            404
          </div>
          <div className="absolute inset-0 text-[180px] sm:text-[240px] lg:text-[300px] font-black leading-none text-primary translate-x-1.5 translate-y-1.5">
            404
          </div>
          <div className="relative text-[180px] sm:text-[240px] lg:text-[300px] font-black leading-none text-white" style={{ WebkitTextStroke: "4px black" }}>
            404
          </div>
        </div>

        {/* Message card */}
        <div className="bg-white border-[3px] border-black shadow-[6px_6px_0_#000] px-8 py-6 max-w-md animate-fade-in-up stagger-1">
          <h2 className="text-2xl sm:text-3xl font-black mb-3">
            Oops! Lost in the chain
          </h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            This page doesn't exist on any ledger. It might have been moved, deleted, or never deployed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => onNavigate("landing")}>
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
            <Button variant="secondary" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
          </div>
        </div>

        {/* Decorative accent blocks flanking the card */}
        <div className="absolute -left-6 sm:-left-12 top-1/2 w-8 h-8 sm:w-12 sm:h-12 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] rotate-12 animate-fade-in-up stagger-2 hidden sm:block" />
        <div className="absolute -right-6 sm:-right-12 top-1/2 -translate-y-8 w-6 h-6 sm:w-10 sm:h-10 bg-destructive border-[2px] border-black shadow-[3px_3px_0_#000] -rotate-6 animate-fade-in-up stagger-3 hidden sm:block" />
      </div>
    </div>
  )
}
