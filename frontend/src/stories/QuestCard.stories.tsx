import type { Meta, StoryObj } from "@storybook/react-vite"
import { QuestCard } from "@/components/quest/QuestCard"

const meta: Meta<typeof QuestCard> = {
  title: "Sections/QuestCard",
  component: QuestCard,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof QuestCard>

export const InProgress: Story = {
  args: {
    quest: {
      id: 1,
      name: "Stellar Smart Contracts with Soroban",
      description: "Learn how to write, test, and deploy smart contracts on Soroban.",
      category: "Development",
      maxEnrollees: 100,
    },
    stats: {
      enrolleeCount: 42,
      milestoneCount: 5,
      poolBalance: 2500000000,
    },
    completedCount: 2,
    isOwned: false,
  },
}

export const Completed: Story = {
  args: {
    quest: {
      id: 2,
      name: "Soroban Token Development",
      description: "Build standard SEP-41 token contracts and manage liquidity.",
      category: "DeFi",
    },
    stats: {
      enrolleeCount: 15,
      milestoneCount: 3,
      poolBalance: 1500000000,
    },
    completedCount: 3,
    isOwned: false,
  },
}

export const NotStarted: Story = {
  args: {
    quest: {
      id: 3,
      name: "Cross-Contract Calls & Auth",
      description: "Master Soroban authorization, invoker credentials, and inter-contract calls.",
      category: "Advanced",
      maxEnrollees: 50,
    },
    stats: {
      enrolleeCount: 12,
      milestoneCount: 4,
      poolBalance: 4000000000,
    },
    completedCount: 0,
    isOwned: false,
  },
}

export const QuestOwner: Story = {
  args: {
    quest: {
      id: 4,
      name: "Decentralized Governance Masterclass",
      description: "Design on-chain voting and proposal management systems on Stellar.",
      category: "Governance",
    },
    stats: {
      enrolleeCount: 88,
      milestoneCount: 6,
      poolBalance: 10000000000,
    },
    completedCount: 0,
    isOwned: true,
  },
}
