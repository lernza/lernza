import type { Meta, StoryObj } from "@storybook/react-vite"
import { QuestStatusBadge } from "@/components/quest-status-badge"

const meta: Meta<typeof QuestStatusBadge> = {
  title: "Components/QuestStatusBadge",
  component: QuestStatusBadge,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof QuestStatusBadge>

export const Active: Story = {
  args: {
    quest: { status: 0, deadline: Math.floor(Date.now() / 1000) + 86400 * 3 },
  },
}

export const ActiveEndingSoon: Story = {
  args: {
    quest: { status: 0, deadline: Math.floor(Date.now() / 1000) + 3600 },
  },
}

export const ActiveNoDeadline: Story = {
  args: {
    quest: { status: 0, deadline: 0 },
  },
}

export const Ended: Story = {
  args: {
    quest: { status: 1, deadline: 0 },
  },
}

export const Archived: Story = {
  args: {
    quest: { status: 2, deadline: 0 },
  },
}
