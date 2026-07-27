import type { Meta, StoryObj } from "@storybook/react"
import { ShareButton } from "@/components/share-button"
import { fn } from "@storybook/test"

const meta: Meta<typeof ShareButton> = {
  title: "Components/ShareButton",
  component: ShareButton,
  tags: ["autodocs"],
  args: {
    onToast: fn(),
  },
}

export default meta
type Story = StoryObj<typeof ShareButton>

export const Default: Story = {
  args: {
    questId: 42,
    questName: "Build a Stellar dApp",
  },
}

export const Compact: Story = {
  args: {
    questId: 99,
    questName: "Introduction to Soroban",
    compact: true,
  },
}

export const LongQuestName: Story = {
  args: {
    questId: 7,
    questName: "This is an exceptionally long quest name that might truncate in the share panel display area",
  },
}
