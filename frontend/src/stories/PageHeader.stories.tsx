import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"

const meta: Meta<typeof PageHeader> = {
  title: "Components/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof PageHeader>

export const Default: Story = {
  args: {
    title: "My Quests",
    subtitle: "Browse and manage your active quests.",
  },
}

export const WithEyebrow: Story = {
  args: {
    eyebrow: "Dashboard",
    title: "Quests Overview",
    subtitle: "Track your progress across all quests.",
  },
}

export const WithAction: Story = {
  args: {
    title: "Settings",
    action: <Button size="sm">Save Changes</Button>,
  },
}

export const Full: Story = {
  args: {
    eyebrow: "Admin",
    title: "User Management",
    subtitle: "View and manage all registered users.",
    action: (
      <Button size="sm" variant="secondary">
        <Settings className="h-4 w-4" />
        Options
      </Button>
    ),
  },
}
