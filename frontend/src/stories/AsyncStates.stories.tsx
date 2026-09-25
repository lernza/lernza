import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  LoadingState,
  ErrorState,
  EmptyState,
  ContractUnavailable,
} from "@/components/ui/async-states"
import { Target } from "lucide-react"

const meta: Meta = {
  title: "UI/AsyncStates",
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj

export const LoadingDefault: Story = {
  render: () => <LoadingState message="Loading quest information..." />,
}

export const LoadingCompact: Story = {
  render: () => <LoadingState message="Connecting to Stellar network..." variant="compact" />,
}

export const LoadingInline: Story = {
  render: () => <LoadingState message="Verifying transaction..." variant="inline" />,
}

export const ErrorDefault: Story = {
  render: () => (
    <ErrorState
      title="Failed to Load Milestones"
      message="The Stellar network returned an unexpected error. Please check your connection and try again."
      onRetry={() => alert("Retry clicked")}
    />
  ),
}

export const EmptyDefault: Story = {
  render: () => (
    <EmptyState
      title="No Quests Found"
      description="You haven't enrolled in or created any quests yet. Browse available quests to start learning."
      actionText="Explore Quests"
      onAction={() => alert("Explore Quests clicked")}
      icon={Target}
    />
  ),
}

export const ContractUnavailableState: Story = {
  render: () => (
    <ContractUnavailable
      contractName="Quest Contract"
      contractId="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
    />
  ),
}
