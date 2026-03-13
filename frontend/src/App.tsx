import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Landing } from "@/pages/landing"
import { Dashboard } from "@/pages/dashboard"
import { WorkspaceView } from "@/pages/workspace"
import { Profile } from "@/pages/profile"

function App() {
  const [page, setPage] = useState("landing")
  const [selectedWorkspace, setSelectedWorkspace] = useState<number | null>(null)

  const handleNavigate = (p: string) => {
    setPage(p)
    setSelectedWorkspace(null)
  }

  const handleSelectWorkspace = (id: number) => {
    setSelectedWorkspace(id)
    setPage("workspace")
  }

  const renderPage = () => {
    if (page === "workspace" && selectedWorkspace !== null) {
      return (
        <WorkspaceView
          workspaceId={selectedWorkspace}
          onBack={() => handleNavigate("dashboard")}
        />
      )
    }
    switch (page) {
      case "landing":
        return <Landing onNavigate={handleNavigate} />
      case "dashboard":
        return (
          <Dashboard
            onSelectWorkspace={handleSelectWorkspace}
          />
        )
      case "profile":
        return <Profile />
      default:
        return <Landing onNavigate={handleNavigate} />
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar activePage={page} onNavigate={handleNavigate} />
      <main>{renderPage()}</main>
    </div>
  )
}

export default App
