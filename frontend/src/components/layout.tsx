import type { ReactNode } from "react"
import { Navbar } from "./navbar"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="bg-background text-foreground selection:bg-primary min-h-screen selection:text-black">
      <Navbar />
      <main className="relative">{children}</main>
      <Analytics />
      <SpeedInsights />

      {/* Global floating accents */}
      <div className="bg-primary animate-float pointer-events-none fixed right-10 bottom-10 z-0 hidden h-12 w-12 rotate-12 border-[3px] border-black opacity-20 shadow-[4px_4px_0_#000] lg:block" />
      <div
        className="bg-success animate-float pointer-events-none fixed top-20 left-10 z-0 hidden h-8 w-8 -rotate-6 border-[2px] border-black opacity-10 shadow-[3px_3px_0_#000] lg:block"
        style={{ animationDelay: "1s" }}
      />
    </div>
  )
}
