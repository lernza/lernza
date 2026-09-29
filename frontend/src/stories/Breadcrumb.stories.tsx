import type { Meta, StoryObj } from "@storybook/react-vite"
import { Breadcrumb } from "@/components/ui/breadcrumb"

const meta: Meta<typeof Breadcrumb> = {
  title: "UI/Breadcrumb",
  component: Breadcrumb,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Breadcrumb>

export const TwoLevels: Story = {
  args: {
    items: [
      { label: "Dashboard", onClick: () => alert("Navigate to Dashboard") },
      { label: "Stellar Basics" },
    ],
  },
}

export const MultiLevel: Story = {
  args: {
    items: [
      { label: "Home", onClick: () => alert("Navigate to Home") },
      { label: "Quests", onClick: () => alert("Navigate to Quests") },
      { label: "DeFi Track", onClick: () => alert("Navigate to DeFi Track") },
      { label: "Liquidity Pools" },
    ],
  },
}

export const SingleItem: Story = {
  args: {
    items: [{ label: "Quests" }],
  },
}
